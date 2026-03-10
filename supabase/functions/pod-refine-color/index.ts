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

    const { idea_id, color_name, bg_hex, guidance } = await req.json();
    if (!idea_id) return json({ error: "idea_id is required" }, 400);
    if (!color_name) return json({ error: "color_name is required" }, 400);

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from("az_pod_ideas")
      .select("*")
      .eq("id", idea_id)
      .single();
    if (ideaError || !idea) return json({ error: "Idea not found" }, 404);

    const designUrl = idea.tshirt_design_url || idea.tshirt_raw_url;
    if (!designUrl) return json({ error: "No t-shirt design URL found" }, 400);

    // Load Remove.bg key
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("removebg_api_key")
      .eq("user_id", user.id)
      .single();

    const REMOVE_BG_API_KEY = settings?.removebg_api_key;
    if (!REMOVE_BG_API_KEY) {
      return json({ error: "Remove.bg API key is not configured. Please add it in POD Settings." }, 400);
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return json({ error: "LOVABLE_API_KEY is not configured" }, 500);
    }

    // Step 1: Download the current design image
    console.log(`Downloading design from: ${designUrl}`);
    const imgResponse = await fetch(designUrl);
    if (!imgResponse.ok) throw new Error(`Failed to download design: ${imgResponse.status}`);
    const imgBytes = new Uint8Array(await imgResponse.arrayBuffer());
    // Chunked base64 to avoid stack overflow on large images
    let imgBase64 = "";
    for (let i = 0; i < imgBytes.length; i += 8192) {
      imgBase64 += String.fromCharCode(...imgBytes.subarray(i, i + 8192));
    }
    imgBase64 = btoa(imgBase64);

    // Step 2: Send to AI to refine for the target color
    const defaultGuidance = `Adjust this design so all text, details, and elements are clearly visible and look great on a ${color_name} background.`;
    const userGuidance = guidance?.trim() || defaultGuidance;
    
    const aiPrompt = `You are a graphic designer. I have a t-shirt design that needs to be optimized for a ${color_name} (${bg_hex || 'unknown hex'}) background. 

${userGuidance}

IMPORTANT: 
- Output ONLY the refined design image on a clean white background
- Keep the same design concept but adjust colors/contrast so it's clearly visible on ${color_name}
- Maintain the same composition and style
- Do NOT add any text or explanations`;

    console.log(`Sending to AI for refinement. Color: ${color_name}, Hex: ${bg_hex}`);

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash-image",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: aiPrompt },
              {
                type: "image_url",
                image_url: { url: `data:image/png;base64,${imgBase64}` },
              },
            ],
          },
        ],
        modalities: ["image", "text"],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return json({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      }
      if (aiResponse.status === 402) {
        return json({ error: "AI credits exhausted. Please add credits to continue." }, 402);
      }
      const errText = await aiResponse.text();
      console.error(`AI gateway error (${aiResponse.status}): ${errText}`);
      return json({ error: "AI refinement failed. Please try again." }, 500);
    }

    const aiData = await aiResponse.json();
    const generatedImage = aiData.choices?.[0]?.message?.images?.[0]?.image_url?.url;
    if (!generatedImage) {
      console.error("No image in AI response:", JSON.stringify(aiData).substring(0, 500));
      return json({ error: "AI did not return an image. Try different guidance." }, 500);
    }

    // Extract base64 from data URL
    const base64Match = generatedImage.match(/^data:image\/\w+;base64,(.+)$/);
    if (!base64Match) return json({ error: "Invalid image format from AI" }, 500);
    const refinedBase64 = base64Match[1];
    const refinedBytes = Uint8Array.from(atob(refinedBase64), (c) => c.charCodeAt(0));

    // Step 3: Upload raw refined image
    const rawFilename = `pod-designs/tshirt-refined-raw-${idea_id}-${Date.now()}.png`;
    const { error: rawUploadError } = await supabase.storage
      .from("pod-assets")
      .upload(rawFilename, refinedBytes, { contentType: "image/png", upsert: true });
    if (rawUploadError) throw new Error(`Raw upload failed: ${rawUploadError.message}`);

    // Step 4: Remove background
    console.log(`Removing background from refined image (${refinedBytes.length} bytes)`);
    const formData = new FormData();
    formData.append("image_file", new Blob([refinedBytes], { type: "image/png" }), "refined.png");
    formData.append("size", "auto");

    const bgResponse = await fetch("https://api.remove.bg/v1.0/removebg", {
      method: "POST",
      headers: { "X-Api-Key": REMOVE_BG_API_KEY },
      body: formData,
    });

    if (!bgResponse.ok) {
      const errText = await bgResponse.text();
      console.error(`Remove.bg failed (${bgResponse.status}): ${errText}`);
      return json({ error: `Background removal failed (${bgResponse.status})` }, 500);
    }

    const transparentBytes = new Uint8Array(await bgResponse.arrayBuffer());
    console.log(`Background removed: ${refinedBytes.length} → ${transparentBytes.length} bytes`);

    // Step 5: Upload transparent version
    const transparentFilename = `pod-designs/tshirt-refined-${idea_id}-${Date.now()}.png`;
    const { error: transUploadError } = await supabase.storage
      .from("pod-assets")
      .upload(transparentFilename, transparentBytes, { contentType: "image/png", upsert: true });
    if (transUploadError) throw new Error(`Transparent upload failed: ${transUploadError.message}`);

    const { data: publicUrlData } = supabase.storage.from("pod-assets").getPublicUrl(transparentFilename);
    const transparentUrl = publicUrlData.publicUrl;

    // Step 6: Save as a new design version
    const { data: maxVersion } = await supabase
      .from("az_pod_design_versions")
      .select("version_number")
      .eq("idea_id", idea_id)
      .eq("product_type", "tshirt")
      .order("version_number", { ascending: false })
      .limit(1)
      .single();

    const nextVersion = (maxVersion?.version_number ?? 0) + 1;

    const { data: newVersion, error: versionError } = await supabase
      .from("az_pod_design_versions")
      .insert({
        idea_id,
        product_type: "tshirt",
        image_url: transparentUrl,
        prompt: `Refined for ${color_name}: ${userGuidance}`,
        version_number: nextVersion,
        is_selected: false,
      })
      .select()
      .single();

    if (versionError) {
      console.error("Failed to save design version:", versionError);
    }

    return json({
      refined_url: transparentUrl,
      version: newVersion,
      color_name,
      bg_hex,
    });
  } catch (error) {
    console.error("pod-refine-color error:", error);
    return json({ error: error.message }, 500);
  }
});
