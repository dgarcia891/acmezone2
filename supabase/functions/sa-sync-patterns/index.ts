import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sa-api-key",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Maintenance mode check
    const { data: mConfig } = await supabase
      .from("sa_app_config")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (mConfig?.value === true) {
      return json(
        { error: "MAINTENANCE", message: "Scam Alert sync is temporarily unavailable." },
        503
      );
    }

    // Parse optional `since` query param (unix timestamp in milliseconds)
    const url = new URL(req.url);
    const sinceParam = url.searchParams.get("since");

    let query = supabase
      .from("sa_patterns")
      .select("id, phrase, category, severity_weight, source, created_at, updated_at")
      .eq("active", true);

    if (sinceParam) {
      const sinceMs = parseInt(sinceParam, 10);
      if (!isNaN(sinceMs)) {
        const sinceDate = new Date(sinceMs).toISOString();
        query = query.gt("updated_at", sinceDate);
      }
    }

    const { data, error } = await query;

    if (error) {
      console.error("sa-sync-patterns query error:", error);
      return json({ error: "QUERY_ERROR", message: error.message }, 500);
    }

    const rows = data ?? [];

    // Return all active patterns — the extension handles categorization
    return json({
      ok: true,
      patterns: rows,
      keywords: [],
      timestamp: Date.now(),
      count: rows.length,
    });
  } catch (err) {
    console.error("sa-sync-patterns error:", err);
    return json({ error: "SERVER_ERROR", message: String(err) }, 500);
  }
});
