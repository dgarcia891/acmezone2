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

    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("trello_api_key, trello_token")
      .eq("user_id", user.id)
      .single();

    if (!settings?.trello_api_key || !settings?.trello_token) {
      return json({ error: "Trello credentials not saved yet" }, 400);
    }

    const listUrl = `https://api.trello.com/1/lists/687449ac29797fd36252a8aa/board?key=${settings.trello_api_key}&token=${settings.trello_token}&fields=name`;
    const response = await fetch(listUrl);
    const data = await response.json();

    if (!response.ok) {
      return json({ error: "Trello connection failed", details: data }, 400);
    }

    return json({ success: true, board_name: data.name });
  } catch (error: unknown) {
    console.error("pod-test-trello error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
