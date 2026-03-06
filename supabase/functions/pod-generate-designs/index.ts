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

    const { idea_id, product_type, sticker_prompt, tshirt_prompt } = await req.json();

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not found");

    const REMOVE_BG_API_KEY = Deno.env.get("REMOVE_BG_API_KEY");

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

    // ---------- Remove.bg background removal ----------
    async function removeBackground(imageBytes: Uint8Array): Promise<Uint8Array | null> {
      if (!REMOVE_BG_API_KEY) {
        console.warn("REMOVE_BG_API_KEY not set – skipping background removal");
        return null;
      }

      try {
        const formData = new FormData();
        formData.append("image_file", new Blob([imageBytes], { type: "image/png" }), "design.png");
        formData.append("size", "auto");

        const response = await fetch("https://api.remove.bg/v1.0/removebg", {
          method: "POST",
          headers: { "X-Api-Key": REMOVE_BG_API_KEY },
          body: formData,
        });

        if (!response.ok) {
          const errorText = await response.text();
          console.warn(`Remove.bg failed (${response.status}): ${errorText}`);
          return null;
        }

        const arrayBuffer = await response.arrayBuffer();
        console.log("Remove.bg success – transparent PNG received");
        return new Uint8Array(arrayBuffer);
      } catch (err) {
        console.warn("Remove.bg call failed:", err);
        return null;
      }
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

      // Attempt background removal
      const transparentBytes = await removeBackground(decoded.bytes);
      const finalBytes = transparentBytes ?? decoded.bytes;

      return await uploadDesignImage(finalBytes, filename);
    }

    // ---------- Build update payload ----------
    const updateData: Record<string, any> = {
      product_type,
      status: "designs_generated",
      updated_at: new Date().toISOString()
    };

    if ((product_type === "sticker" || product_type === "both") && sticker_prompt) {
      updateData.sticker_design_prompt = sticker_prompt;
      const storedUrl = await processDesign(
        `Create a sticker design. Output ONLY the graphic artwork centered on a solid pure white (#FFFFFF) background. The design should be clean, bold, and print-ready for die-cut stickers. Do NOT include any product mockup, shadow, border, or frame. No checkered pattern. Just the artwork on white. ${sticker_prompt}`,
        `sticker-${idea_id}`
      );
      if (storedUrl) updateData.sticker_design_url = storedUrl;
    }

    if ((product_type === "tshirt" || product_type === "both") && tshirt_prompt) {
      updateData.tshirt_design_prompt = tshirt_prompt;
      const storedUrl = await processDesign(
        `Create a t-shirt graphic design. Output ONLY the graphic artwork centered on a solid pure white (#FFFFFF) background. The design should be bold, eye-catching, and suitable for screen printing or DTG. Do NOT include any t-shirt mockup, fabric texture, clothing outline, shadow, border, or frame. No checkered pattern. Just the isolated artwork on pure white. ${tshirt_prompt}`,
        `tshirt-${idea_id}`
      );
      if (storedUrl) updateData.tshirt_design_url = storedUrl;
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
