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

    // Get Printify API key from user's settings
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("printify_api_key")
      .eq("user_id", user.id)
      .single();

    if (!settings?.printify_api_key) {
      return json({ error: "Printify API key not configured. Please add it in POD Settings." }, 400);
    }

    const { blueprint_id } = await req.json();
    if (!blueprint_id) {
      return json({ error: "blueprint_id is required" }, 400);
    }

    const response = await fetch(
      `https://api.printify.com/v1/catalog/blueprints/${blueprint_id}/print_providers.json`,
      {
        headers: { Authorization: `Bearer ${settings.printify_api_key}` },
      }
    );

    if (!response.ok) {
      const text = await response.text();
      console.error("Printify API error:", response.status, text);
      return json({ error: `Printify API error: ${response.status}` }, response.status);
    }

    const providers = await response.json();
    // Return simplified provider list
    const simplified = providers.map((p: any) => ({
      id: p.id,
      title: p.title,
      location: p.location?.country || "",
    }));

    return json({ providers: simplified });
  } catch (error) {
    console.error("pod-printify-providers error:", error);
    return json({ error: error.message }, 500);
  }
});
