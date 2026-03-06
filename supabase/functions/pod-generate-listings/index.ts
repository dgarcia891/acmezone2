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

async function generateListing(
  productType: string,
  idea: any,
  designPrompt: string,
  lovableApiKey: string
) {
  const analysis = idea.analysis || {};

  const listingPrompt = `You are an expert e-commerce copywriter for print-on-demand products sold on Etsy and eBay.

Based on this product information, generate optimized listing content:

Product type: ${productType}
Original idea: ${idea.idea_text}
Design prompt used: ${designPrompt}
AI Analysis: ${JSON.stringify(analysis)}

Generate a JSON response with:
{
  "title": "A compelling product title, max 140 chars, keyword-rich for search",
  "description": "A detailed product description, 200-400 words, includes materials, sizing, use cases, and emotional appeal. Use line breaks for readability.",
  "tags": ["array", "of", "13", "relevant", "etsy", "tags", "max", "20", "chars", "each"],
  "seo_keywords": ["primary keyword", "secondary keyword", "long tail keyword"],
  "etsy_title": "Etsy-optimized title with relevant keywords, max 140 chars",
  "ebay_title": "eBay-optimized title with relevant keywords, max 80 chars"
}

Only output valid JSON, no markdown.`;

  const response = await fetch(
    "https://ai.gateway.lovable.dev/v1/chat/completions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: "You are a JSON-only response bot. Output only valid JSON." },
          { role: "user", content: listingPrompt },
        ],
      }),
    }
  );

  if (!response.ok) {
    const t = await response.text();
    console.error("AI gateway error:", response.status, t);
    if (response.status === 429) throw new Error("Rate limit exceeded, please try again later.");
    if (response.status === 402) throw new Error("AI credits exhausted, please add funds.");
    throw new Error("AI gateway error");
  }

  const result = await response.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("No content from AI");

  // Strip markdown fences if present
  const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
  return JSON.parse(cleaned);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    const { data: roleData } = await supabase
      .from("az_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return json({ error: "Admin access required" }, 403);

    const { idea_id } = await req.json();
    if (!idea_id) return json({ error: "idea_id is required" }, 400);

    // Fetch the idea
    const { data: idea, error: ideaError } = await supabase
      .from("az_pod_ideas")
      .select("*")
      .eq("id", idea_id)
      .single();
    if (ideaError || !idea) return json({ error: "Idea not found" }, 404);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    // Fetch Printify credentials to auto-populate blueprint/provider IDs
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("printify_api_key, printify_shop_id")
      .eq("user_id", user.id)
      .single();

    // Try to discover valid blueprint/provider combos from Printify catalog
    let printifyDefaults: Record<string, { blueprint_id: string; print_provider_id: string }> = {};
    if (settings?.printify_api_key) {
      try {
        printifyDefaults = await discoverPrintifyDefaults(settings.printify_api_key);
        console.log("Discovered Printify defaults:", JSON.stringify(printifyDefaults));
      } catch (e) {
        console.warn("Could not auto-discover Printify catalog:", e.message);
      }
    }

    // Delete existing listings for this idea (regenerate scenario)
    await supabase.from("az_pod_listings").delete().eq("idea_id", idea_id);

    const listings: any[] = [];

    // Generate for each product type that has a design
    const types: { type: string; url: string | null; prompt: string | null }[] = [
      { type: "sticker", url: idea.sticker_design_url, prompt: idea.sticker_design_prompt },
      { type: "tshirt", url: idea.tshirt_design_url, prompt: idea.tshirt_design_prompt },
    ];

    for (const t of types) {
      if (!t.url) continue;

      const content = await generateListing(t.type, idea, t.prompt || "", LOVABLE_API_KEY);
      const defaults = printifyDefaults[t.type] || {};

      const { data: listing, error: insertError } = await supabase
        .from("az_pod_listings")
        .insert({
          idea_id,
          product_type: t.type,
          title: content.title || "Untitled",
          description: content.description || "",
          tags: content.tags || [],
          seo_keywords: content.seo_keywords || [],
          etsy_title: content.etsy_title || null,
          ebay_title: content.ebay_title || null,
          printify_blueprint_id: defaults.blueprint_id || null,
          printify_print_provider_id: defaults.print_provider_id || null,
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert listing error:", insertError);
        throw insertError;
      }
      listings.push(listing);
    }

    // Update idea status to listings
    await supabase
      .from("az_pod_ideas")
      .update({ status: "listings", updated_at: new Date().toISOString() })
      .eq("id", idea_id);

    return json({ listings });
  } catch (error) {
    console.error("pod-generate-listings error:", error);
    return json({ error: error.message }, 500);
  }
});
