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

    if (req.method === "GET") {
      const { data: settings } = await supabase
        .from("az_pod_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      const masked = settings ? {
        trello_api_key: settings.trello_api_key ? "••••••••" : "",
        trello_token: settings.trello_token ? "••••••••" : "",
        printify_api_key: settings.printify_api_key ? "••••••••" : "",
        printify_shop_id: settings.printify_shop_id || "",
        removebg_api_key: settings.removebg_api_key ? "••••••••" : "",
        has_trello_api_key: !!settings.trello_api_key,
        has_trello_token: !!settings.trello_token,
        has_printify_api_key: !!settings.printify_api_key,
        has_printify_shop_id: !!settings.printify_shop_id,
        has_removebg_api_key: !!settings.removebg_api_key,
      } : {
        trello_api_key: "", trello_token: "", printify_api_key: "",
        printify_shop_id: "", removebg_api_key: "",
        has_trello_api_key: false, has_trello_token: false,
        has_printify_api_key: false, has_printify_shop_id: false,
        has_removebg_api_key: false,
      };

      return json({ settings: masked });

    } else if (req.method === "POST") {
      const body = await req.json();

      const updateData: Record<string, any> = { updated_at: new Date().toISOString() };
      if (body.trello_api_key) updateData.trello_api_key = body.trello_api_key;
      if (body.trello_token) updateData.trello_token = body.trello_token;
      if (body.printify_api_key) updateData.printify_api_key = body.printify_api_key;
      if (body.printify_shop_id !== undefined) updateData.printify_shop_id = body.printify_shop_id;
      if (body.removebg_api_key) updateData.removebg_api_key = body.removebg_api_key;

      const { error } = await supabase
        .from("az_pod_settings")
        .upsert({ user_id: user.id, ...updateData }, { onConflict: "user_id" })
        .select()
        .single();

      if (error) throw error;

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (error) {
    console.error("pod-settings error:", error);
    return json({ error: error.message }, 500);
  }
});
