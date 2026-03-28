import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-sa-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Global burst protection: max 10 concurrent requests
let activeRequests = 0;
const MAX_CONCURRENT = 10;

// Cache for maintenance mode to reduce DB queries on warm starts
let maintenanceCache = { value: false, expires: 0 };
const CACHE_TTL_MS = 60_000;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  // Burst protection
  if (activeRequests >= MAX_CONCURRENT) {
    return json(
      { error: "TOO_MANY_REQUESTS", message: "Server is busy, please retry shortly." },
      429
    );
  }
  activeRequests++;

  try {
    // API key auth
    const apiKey = req.headers.get("x-sa-api-key");
    const expectedKey = Deno.env.get("SA_API_KEY");
    if (!apiKey || apiKey !== expectedKey) {
      return json({ error: "UNAUTHORIZED", message: "Invalid or missing x-sa-api-key header." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Maintenance mode (Cached)
    let isMaintenance = maintenanceCache.value;
    if (Date.now() > maintenanceCache.expires) {
      const { data: mConfig } = await supabase
        .from("sa_app_config")
        .select("value")
        .eq("key", "maintenance_mode")
        .single();
      
      isMaintenance = mConfig?.value === true;
      maintenanceCache = { value: isMaintenance, expires: Date.now() + CACHE_TTL_MS };
    }

    if (isMaintenance) {
      return json(
        { error: "MAINTENANCE", message: "Scam Alert is temporarily under maintenance." },
        503
      );
    }

    const body = await req.json();
    const { url_hash, signals, severity, extension_version, ai_verdict, ai_confidence } = body;

    // Validate required fields
    if (!url_hash || typeof url_hash !== "string") {
      return json({ error: "INVALID_BODY", message: "url_hash is required and must be a string." }, 400);
    }
    if (!signals || typeof signals !== "object") {
      return json({ error: "INVALID_BODY", message: "signals is required and must be an object with hard/soft arrays." }, 400);
    }
    if (!severity || typeof severity !== "string") {
      return json({ error: "INVALID_BODY", message: "severity is required and must be a string (SAFE|LOW|MEDIUM|HIGH|CRITICAL)." }, 400);
    }

    // Early exit for SAFE severity to prevent DB connection exhaustion
    if (severity === "SAFE") {
      return json({ ok: true, ignored: true });
    }

    const { data, error } = await supabase
      .from("sa_detections")
      .insert({
        url_hash,
        signals,
        severity,
        extension_version: extension_version ?? null,
        ai_verdict: ai_verdict ?? null,
        ai_confidence: ai_confidence != null ? ai_confidence : null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("sa-report-detection insert error:", error);
      return json({ error: "INSERT_ERROR", message: error.message }, 500);
    }

    return json({ ok: true, id: data.id });
  } catch (err) {
    console.error("sa-report-detection error:", err);
    return json({ error: "SERVER_ERROR", message: String(err) }, 500);
  } finally {
    activeRequests--;
  }
});
