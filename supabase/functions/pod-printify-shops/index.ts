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

    // Admin check
    const { data: roleData } = await supabase
      .from("az_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return json({ error: "Admin access required" }, 403);

    // Get Printify API key
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("printify_api_key")
      .eq("user_id", user.id)
      .single();

    if (!settings?.printify_api_key) {
      return json({ error: "Printify API key not configured. Please save your API key first." }, 400);
    }

    // Fetch shops from Printify
    const response = await fetch("https://api.printify.com/v1/shops.json", {
      headers: { Authorization: `Bearer ${settings.printify_api_key}` },
    });

    if (!response.ok) {
      const text = await response.text();
      console.error("Printify shops API error:", response.status, text);
      if (response.status === 401) {
        return json({ error: "Invalid Printify API key. Please check your credentials." }, 401);
      }
      return json({ error: `Printify API error: ${response.status}` }, response.status);
    }

    const shops = await response.json();

    // Printify returns an array of shops with id, title, sales_channel
    const simplified = shops.map((s: any) => ({
      id: String(s.id),
      title: s.title || "Untitled Shop",
      sales_channel: s.sales_channel || "unknown",
    }));

    return json({ shops: simplified });
  } catch (error: unknown) {
    console.error("pod-printify-shops error:", error);
    return json({ error: (error as Error).message }, 500);
  }
});
