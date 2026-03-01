import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "chrome-extension://plohgpfkkhnennkgoneolbpomnhoclmk",
  "*",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : "*";
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-sa-api-key",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
  };
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Maintenance mode check
    const { data: config } = await supabase
      .from("sa_app_config")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (config?.value === true) {
      return new Response(
        JSON.stringify({ error: "SERVICE_UNAVAILABLE", message: "Scam Alert is temporarily under maintenance." }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    // Parse optional `since` query param
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");

    let query = supabase
      .from("sa_patterns")
      .select("id, phrase, category, severity_weight, source, created_at, updated_at")
      .eq("active", true);

    if (sinceParam) {
      const sinceDate = new Date(parseInt(sinceParam, 10) * 1000).toISOString();
      query = query.gt("updated_at", sinceDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error("sa-sync-patterns query error:", error);
      return new Response(JSON.stringify({ error: "QUERY_ERROR" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const patterns = (data ?? []).filter((r) => r.category === "phrase" || r.category === "tld" || r.category === "domain");
    const keywords = (data ?? []).filter((r) => r.category === "keyword");

    return new Response(
      JSON.stringify({
        ok: true,
        patterns,
        keywords,
        timestamp: Math.floor(Date.now() / 1000),
      }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sa-sync-patterns error:", err);
    return new Response(JSON.stringify({ error: "SERVER_ERROR" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
