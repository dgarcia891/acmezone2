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

    const { idea_text, images, image_base64, image_media_type } = await req.json();
    if (!idea_text?.trim()) return json({ error: "idea_text is required" }, 400);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY not found");

    const systemPrompt = `You are a viral content analyst and merchandise expert. Analyze content ideas for Print-on-Demand merchandise potential. Return ONLY a raw JSON object (no markdown, no code fences) with exactly these fields:
{
  "content_text": "The core text/phrase from the content",
  "platform": "Likely source platform (e.g., Twitter, TikTok, Reddit, Instagram, Original)",
  "engagement_score": "Estimated engagement level (e.g., High, Medium, Low)",
  "viral_indicators": "What makes this viral or shareable",
  "commercial_viability_score": 7,
  "score_explanation": "Why this score",
  "target_audience": "Who would buy merchandise with this",
  "merchandise_applications": "Specific product ideas and how the content would work on them",
  "copyright_status": "Assessment of copyright concerns",
  "usage_rights": "Can this be used commercially?",
  "legal_notes": "Any legal considerations",
  "longevity_prediction": "How long will this trend last?",
  "market_positioning": "Where this fits in the market",
  "font_suggestions": "Recommended fonts for merchandise",
  "design_considerations": "Design tips for merchandise",
  "product_recommendations": "Best product types for this content",
  "additional_notes": "Any other relevant notes",
  "sticker_design_prompt": "A detailed image generation prompt for creating a sticker design. Include style, colors, composition, and specific visual elements.",
  "tshirt_design_prompt": "A detailed image generation prompt for creating a t-shirt design. Include style, colors, composition, and specific visual elements."
}
The commercial_viability_score MUST be an integer from 1-10.`;

    const userContent: any[] = [{ type: "text", text: `Analyze this content idea for POD merchandise:\n\n${idea_text}` }];

    // Support new multi-image array format
    if (Array.isArray(images) && images.length > 0) {
      for (const img of images) {
        if (img.base64 && img.media_type) {
          userContent.push({
            type: "image_url",
            image_url: { url: `data:${img.media_type};base64,${img.base64}` }
          });
        }
      }
    }
    // Backward compatibility: single image fields
    else if (image_base64 && image_media_type) {
      userContent.push({
        type: "image_url",
        image_url: { url: `data:${image_media_type};base64,${image_base64}` }
      });
    }

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${LOVABLE_API_KEY}`,
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent }
        ],
        temperature: 0.7,
      })
    });

    if (aiResponse.status === 429) return json({ error: "Rate limit exceeded, please try again later." }, 429);
    if (aiResponse.status === 402) return json({ error: "AI credits exhausted. Please add funds in Lovable settings." }, 402);

    const aiData = await aiResponse.json();
    if (!aiResponse.ok) throw new Error(`AI error: ${JSON.stringify(aiData)}`);

    const responseText = aiData.choices?.[0]?.message?.content;
    if (!responseText) throw new Error("No response from AI");

    const cleanedText = responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
    const analysis = JSON.parse(cleanedText);

    const hasImages = (Array.isArray(images) && images.length > 0) || !!image_base64;

    // Upload the first reference image to storage so it can be re-used (e.g. variant flow)
    let storedImageUrl: string | null = null;
    if (hasImages) {
      try {
        const firstImg = Array.isArray(images) && images.length > 0
          ? images[0]
          : { base64: image_base64, media_type: image_media_type };

        const ext = (firstImg.media_type || "image/png").split("/")[1] || "png";
        const filePath = `references/${crypto.randomUUID()}.${ext}`;

        // Decode base64 to Uint8Array
        const binaryStr = atob(firstImg.base64);
        const bytes = new Uint8Array(binaryStr.length);
        for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);

        const { error: uploadErr } = await supabase.storage
          .from("pod-assets")
          .upload(filePath, bytes, { contentType: firstImg.media_type || "image/png", upsert: true });

        if (!uploadErr) {
          const { data: urlData } = supabase.storage.from("pod-assets").getPublicUrl(filePath);
          storedImageUrl = urlData.publicUrl;
        } else {
          console.error("Image upload failed:", uploadErr);
        }
      } catch (imgErr) {
        console.error("Image upload error:", imgErr);
      }
    }

    const { data: idea, error: insertError } = await supabase
      .from("az_pod_ideas")
      .insert({
        user_id: user.id,
        idea_text,
        image_url: storedImageUrl,
        product_type: "both",
        analysis,
        sticker_design_prompt: analysis.sticker_design_prompt,
        tshirt_design_prompt: analysis.tshirt_design_prompt,
        status: "analyzed"
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return json({ idea });
  } catch (error) {
    console.error("pod-analyze error:", error);
    return json({ error: error.message }, 500);
  }
});
