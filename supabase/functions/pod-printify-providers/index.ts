import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ---------- AI color analysis + filtering (shared with send-to-printify) ----------

const DARK_COLORS = new Set([
  "black",
  "dark heather",
  "navy",
  "dark grey",
  "dark gray",
  "forest green",
  "maroon",
  "dark chocolate",
  "charcoal",
  "dark heather grey",
  "dark heather gray",
]);

const LIGHT_COLORS = new Set([
  "white",
  "natural",
  "sport grey",
  "sport gray",
  "light blue",
  "light pink",
  "sand",
  "ash",
  "ice grey",
  "ice gray",
  "cream",
  "soft cream",
  "heather prism ice blue",
]);

type ColorDominance = "dark" | "light" | "medium";

interface ColorAnalysis {
  dominance: ColorDominance;
  dominant_colors: string[];
}

async function analyzeDesignColors(imageUrl: string): Promise<ColorAnalysis | null> {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) return null;

  try {
    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-lite",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text:
                  'Analyze this design image for t-shirt printing. What are the dominant colors? Is the design predominantly dark, light, or medium brightness? Respond ONLY with valid JSON: {"dominance": "dark" | "light" | "medium", "dominant_colors": ["color1", "color2"]}',
              },
              { type: "image_url", image_url: { url: imageUrl } },
            ],
          },
        ],
      }),
    });

    if (!response.ok) return null;

    const data = await response.json();
    const text = data.choices?.[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*?\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed || !["dark", "light", "medium"].includes(parsed.dominance)) return null;

    return {
      dominance: parsed.dominance as ColorDominance,
      dominant_colors: Array.isArray(parsed.dominant_colors) ? parsed.dominant_colors : [],
    };
  } catch (err) {
    console.error("color analysis error", err);
    return null;
  }
}

function extractColorName(raw: string): string {
  return raw.split(" / ")[0].toLowerCase().trim();
}

function classifyVariantColor(rawName: string): "dark" | "light" | "neutral" {
  const colorPart = extractColorName(rawName);

  if (DARK_COLORS.has(colorPart)) return "dark";
  if (LIGHT_COLORS.has(colorPart)) return "light";

  for (const dc of DARK_COLORS) {
    if (colorPart.includes(dc) || dc.includes(colorPart)) return "dark";
  }
  for (const lc of LIGHT_COLORS) {
    if (colorPart.includes(lc) || lc.includes(colorPart)) return "light";
  }

  return "neutral";
}

function recommendVariantsByColor(variants: { id: number; options?: Record<string, string>; title?: string }[], analysis: ColorAnalysis) {
  if (analysis.dominance === "medium") {
    return {
      enabledIds: variants.map((v) => v.id),
      excludedCount: 0,
      analysis,
    };
  }

  const clashCategory = analysis.dominance; // "dark" | "light"
  const enabled: number[] = [];
  let excludedCount = 0;

  for (const v of variants) {
    const colorName = v.options?.color || v.options?.Color || v.title || "";
    const category = classifyVariantColor(colorName);

    if (category === clashCategory) {
      excludedCount++;
      continue;
    }

    enabled.push(v.id);
  }

  // Safety: ensure at least 3 remain
  if (enabled.length < 3) {
    return {
      enabledIds: variants.map((v) => v.id),
      excludedCount: 0,
      analysis,
    };
  }

  return { enabledIds: enabled, excludedCount, analysis };
}

// ---------- Printify ----------

async function printifyFetch(path: string, apiKey: string, options: RequestInit = {}) {
  const res = await fetch(`https://api.printify.com/v1${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const data = await res.json();
  if (!res.ok) {
    console.error("Printify API error:", res.status, JSON.stringify(data));
    throw new Error(data?.message || data?.error || `Printify API error ${res.status}`);
  }
  return data;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    // Get Printify API key from user's settings
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("printify_api_key")
      .eq("user_id", user.id)
      .single();

    if (!settings?.printify_api_key) {
      return json({ error: "Printify API key not configured. Please add it in POD Settings." }, 400);
    }

    const body = await req.json().catch(() => ({}));
    const action = body?.action;

    if (action === "get_variants") {
      const blueprint_id = body?.blueprint_id;
      const print_provider_id = body?.print_provider_id;
      const image_url = body?.image_url;

      if (!blueprint_id || !print_provider_id) {
        return json({ error: "blueprint_id and print_provider_id are required" }, 400);
      }

      const variantsResp = await printifyFetch(
        `/catalog/blueprints/${blueprint_id}/print_providers/${print_provider_id}/variants.json`,
        settings.printify_api_key,
      );

      const variantList = variantsResp?.variants || [];

      // Optional recommendation layer
      let recommended_variant_ids: number[] = [];
      let analysisMeta: { dominance: ColorDominance; dominant_colors: string[]; excluded_count: number } | undefined;

      if (image_url) {
        const analysis = await analyzeDesignColors(String(image_url));
        if (analysis) {
          const rec = recommendVariantsByColor(variantList, analysis);
          recommended_variant_ids = rec.enabledIds;
          analysisMeta = {
            dominance: rec.analysis.dominance,
            dominant_colors: rec.analysis.dominant_colors,
            excluded_count: rec.excludedCount,
          };
        }
      }

      const simplified = variantList.map((v: any) => ({
        id: v.id,
        title: v.title,
        cost: v.cost ?? null,
        options: v.options || {},
      }));

      return json({ variants: simplified, recommended_variant_ids, analysis: analysisMeta });
    }

    // Default action: get providers for blueprint
    const { blueprint_id } = body || {};
    if (!blueprint_id) {
      return json({ error: "blueprint_id is required" }, 400);
    }

    const providers = await printifyFetch(
      `/catalog/blueprints/${blueprint_id}/print_providers.json`,
      settings.printify_api_key,
    );

    const simplified = (providers || []).map((p: any) => ({
      id: p.id,
      title: p.title,
      location: p.location?.country || "",
    }));

    return json({ providers: simplified });
  } catch (error) {
    console.error("pod-printify-providers error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
