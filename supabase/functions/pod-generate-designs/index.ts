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

        // Check images array first
        const images = data.choices?.[0]?.message?.images;
        if (images?.[0]?.image_url?.url) return images[0].image_url.url;

        // Check content array
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

    async function uploadDesignImage(base64Url: string, filename: string): Promise<string | null> {
      try {
        if (base64Url.startsWith("data:")) {
          const [header, b64data] = base64Url.split(",");
          const mimeType = header.split(":")[1]?.split(";")[0] || "image/png";
          const ext = mimeType.split("/")[1] || "png";
          const bytes = Uint8Array.from(atob(b64data), c => c.charCodeAt(0));

          const filePath = `pod-designs/${filename}.${ext}`;
          const { error: uploadError } = await supabase.storage
            .from("pod-assets")
            .upload(filePath, bytes, { contentType: mimeType, upsert: true });

          if (uploadError) {
            console.error("Upload error:", uploadError);
            return null;
          }

          const { data: publicUrl } = supabase.storage.from("pod-assets").getPublicUrl(filePath);
          return publicUrl.publicUrl;
        }
        return base64Url;
      } catch (err) {
        console.error("Upload failed:", err);
        return null;
      }
    }

    const updateData: Record<string, any> = {
      product_type,
      status: "designs_generated",
      updated_at: new Date().toISOString()
    };

    if ((product_type === "sticker" || product_type === "both") && sticker_prompt) {
      updateData.sticker_design_prompt = sticker_prompt;
      const stickerImageUrl = await generateDesignImage(
        `Create a sticker design with a transparent/white background. The design should be clean, bold, and print-ready for die-cut stickers. ${sticker_prompt}`
      );
      if (stickerImageUrl) {
        const storedUrl = await uploadDesignImage(stickerImageUrl, `sticker-${idea_id}`);
        updateData.sticker_design_url = storedUrl;
      }
    }

    if ((product_type === "tshirt" || product_type === "both") && tshirt_prompt) {
      updateData.tshirt_design_prompt = tshirt_prompt;
      const tshirtImageUrl = await generateDesignImage(
        `Create a t-shirt graphic design with a transparent background. The design should be bold, eye-catching, and suitable for screen printing or DTG. ${tshirt_prompt}`
      );
      if (tshirtImageUrl) {
        const storedUrl = await uploadDesignImage(tshirtImageUrl, `tshirt-${idea_id}`);
        updateData.tshirt_design_url = storedUrl;
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
