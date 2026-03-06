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

    // ---------- Load Remove.bg key from user settings ----------
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("removebg_api_key")
      .eq("user_id", user.id)
      .single();

    const REMOVE_BG_API_KEY = settings?.removebg_api_key;
    if (!REMOVE_BG_API_KEY) {
      return json({ error: "Remove.bg API key is not configured. Please add it in POD Settings before generating designs." }, 400);
    }

    const { idea_id, product_type, sticker_prompt, tshirt_prompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not found");

    // ---------- AI image generation ----------
    async function generateDesignImage(prompt: string): Promise<string | null> {
      try {
        const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${LOVABLE_API_KEY}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3-pro-image-preview",
            messages: [{ role: "user", content: prompt }],
            modalities: ["image", "text"],
          })
        });

        if (response.status === 429 || response.status === 402) {
          console.error(`AI rate/credit limit: ${response.status}`);
          return null;
        }

        const data = await response.json();
        if (!response.ok) {
          console.error("Image gen error:", JSON.stringify(data));
          return null;
        }

        const images = data.choices?.[0]?.message?.images;
        if (images?.[0]?.image_url?.url) return images[0].image_url.url;

        const content = data.choices?.[0]?.message?.content;
        if (Array.isArray(content)) {
          for (const part of content) {
            if (part.type === "image_url" && part.image_url?.url) return part.image_url.url;
          }
        }

        return null;
      } catch (err) {
        console.error("Design generation failed:", err);
        return null;
      }
    }

    // ---------- Remove.bg background removal (strict – errors block pipeline) ----------
    async function removeBackground(imageBytes: Uint8Array): Promise<Uint8Array> {
      const formData = new FormData();
      formData.append("image_file", new Blob([imageBytes], { type: "image/png" }), "design.png");
      formData.append("size", "auto");

      console.log(`Remove.bg: sending ${imageBytes.length} bytes for background removal`);

      const response = await fetch("https://api.remove.bg/v1.0/removebg", {
        method: "POST",
        headers: { "X-Api-Key": REMOVE_BG_API_KEY },
        body: formData,
      });

      if (response.status === 403) {
        const errorText = await response.text();
        console.error(`Remove.bg auth failed: ${errorText}`);
        throw new Error("Remove.bg API key is invalid. Please update it in POD Settings.");
      }

      if (!response.ok) {
        const errorText = await response.text();
        console.error(`Remove.bg failed (${response.status}): ${errorText}`);
        throw new Error(`Remove.bg failed with status ${response.status}. Please check your API key and account.`);
      }

      const arrayBuffer = await response.arrayBuffer();
      const result = new Uint8Array(arrayBuffer);
      console.log(`Remove.bg success: input ${imageBytes.length} bytes → output ${result.length} bytes (transparent PNG)`);
      return result;
    }

    // ---------- Decode base64 URL to bytes ----------
    function decodeBase64Image(base64Url: string): { bytes: Uint8Array; mimeType: string } | null {
      if (!base64Url.startsWith("data:")) return null;
      const [header, b64data] = base64Url.split(",");
      const mimeType = header.split(":")[1]?.split(";")[0] || "image/png";
      const bytes = Uint8Array.from(atob(b64data), c => c.charCodeAt(0));
      return { bytes, mimeType };
    }

    // ---------- Upload to storage (always PNG) ----------
    async function uploadDesignImage(imageBytes: Uint8Array, filename: string): Promise<string | null> {
      try {
        const filePath = `pod-designs/${filename}.png`;
        const { error: uploadError } = await supabase.storage
          .from("pod-assets")
          .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });

        if (uploadError) {
          console.error("Upload error:", uploadError);
          return null;
        }

        const { data: publicUrl } = supabase.storage.from("pod-assets").getPublicUrl(filePath);
        console.log(`Uploaded transparent PNG: ${publicUrl.publicUrl}`);
        return publicUrl.publicUrl;
      } catch (err) {
        console.error("Upload failed:", err);
        return null;
      }
    }

    // ---------- Full pipeline: generate → remove bg → upload ----------
    async function processDesign(prompt: string, filename: string): Promise<string | null> {
      const base64Url = await generateDesignImage(prompt);
      if (!base64Url) return null;

      const decoded = decodeBase64Image(base64Url);
      if (!decoded) {
        // Not a base64 URL (external URL) – return as-is
        return base64Url;
      }

      // Background removal is REQUIRED – errors will propagate up
      const transparentBytes = await removeBackground(decoded.bytes);
      return await uploadDesignImage(transparentBytes, filename);
    }

    // ---------- Build update payload ----------
    const updateData: Record<string, any> = {
      product_type,
      status: "designs_generated",
      updated_at: new Date().toISOString()
    };

    // Process designs in PARALLEL to avoid edge function timeout
    const designTasks: Promise<{ key: string; promptKey: string; prompt: string; url: string | null }>[] = [];

    if ((product_type === "sticker" || product_type === "both") && sticker_prompt) {
      designTasks.push(
        processDesign(
          `Create a die-cut sticker design. The artwork MUST fill the ENTIRE canvas from edge to edge with absolutely NO margin, NO padding, and NO white border around it. The design should be a single cohesive graphic that bleeds to all four edges of the image. Make it bold, colorful, and print-ready for die-cut sticker production at 300 DPI. Use a solid pure white (#FFFFFF) background ONLY behind the artwork where needed for internal contrast. Do NOT leave any empty white space around the design. The graphic MUST occupy 95-100% of the total image area. Do NOT include any product mockup, shadow, border, frame, or checkered pattern. ${sticker_prompt}`,
          `sticker-${idea_id}`
        ).then(url => ({ key: "sticker_design_url", promptKey: "sticker_design_prompt", prompt: sticker_prompt, url }))
      );
    }

    if ((product_type === "tshirt" || product_type === "both") && tshirt_prompt) {
      designTasks.push(
        processDesign(
          `Create a t-shirt graphic design. Output ONLY the graphic artwork centered on a solid pure white (#FFFFFF) background. The design should be bold, eye-catching, and suitable for screen printing or DTG. Do NOT include any t-shirt mockup, fabric texture, clothing outline, shadow, border, or frame. No checkered pattern. Just the isolated artwork on pure white. ${tshirt_prompt}`,
          `tshirt-${idea_id}`
        ).then(url => ({ key: "tshirt_design_url", promptKey: "tshirt_design_prompt", prompt: tshirt_prompt, url }))
      );
    }

    const results = await Promise.allSettled(designTasks);
    for (const result of results) {
      if (result.status === "fulfilled") {
        updateData[result.value.promptKey] = result.value.prompt;
        if (result.value.url) updateData[result.value.key] = result.value.url;
      } else {
        console.error("Design task failed:", result.reason);
      }
    }

    const { data: idea, error: updateError } = await supabase
      .from("az_pod_ideas")
      .update(updateData)
      .eq("id", idea_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return json({ idea });
  } catch (error) {
    console.error("pod-generate-designs error:", error);
    return json({ error: error.message }, 500);
  }
});
