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

    const { idea_id } = await req.json();
    if (!idea_id) return json({ error: "idea_id is required" }, 400);

    // Fetch idea
    const { data: idea, error: ideaError } = await supabase
      .from("az_pod_ideas")
      .select("*")
      .eq("id", idea_id)
      .single();
    if (ideaError || !idea) return json({ error: "Idea not found" }, 404);

    // ---------- Remove.bg ----------
    async function removeBackground(imageUrl: string): Promise<Uint8Array> {
      // Download the image first
      const imgResponse = await fetch(imageUrl);
      if (!imgResponse.ok) throw new Error(`Failed to download image: ${imgResponse.status}`);
      const imageBytes = new Uint8Array(await imgResponse.arrayBuffer());

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

    async function uploadTransparent(imageBytes: Uint8Array, filename: string): Promise<string> {
      const filePath = `pod-designs/${filename}.png`;
      const { error: uploadError } = await supabase.storage
        .from("pod-assets")
        .upload(filePath, imageBytes, { contentType: "image/png", upsert: true });
      if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`);
      const { data: publicUrl } = supabase.storage.from("pod-assets").getPublicUrl(filePath);
      return publicUrl.publicUrl;
    }

    // Process each design type in parallel
    const updateData: Record<string, any> = {
      status: "bg_removed",
      updated_at: new Date().toISOString(),
    };

    const tasks: Promise<void>[] = [];

    if (idea.sticker_design_url) {
      tasks.push(
        removeBackground(idea.sticker_design_url)
          .then(bytes => uploadTransparent(bytes, `sticker-${idea_id}`))
          .then(url => { updateData.sticker_design_url = url; })
      );
    }

    if (idea.tshirt_design_url) {
      tasks.push(
        removeBackground(idea.tshirt_design_url)
          .then(bytes => uploadTransparent(bytes, `tshirt-${idea_id}`))
          .then(url => { updateData.tshirt_design_url = url; })
      );
    }

    if (tasks.length === 0) {
      return json({ error: "No design URLs found on this idea" }, 400);
    }

    await Promise.all(tasks);

    const { data: updated, error: updateError } = await supabase
      .from("az_pod_ideas")
      .update(updateData)
      .eq("id", idea_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return json({ idea: updated });
  } catch (error) {
    console.error("pod-remove-bg error:", error);
    return json({ error: error.message }, 500);
  }
});
