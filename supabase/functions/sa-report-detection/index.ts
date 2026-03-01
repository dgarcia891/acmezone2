import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "chrome-extension://plohgpfkkhnennkgoneolbpomnhoclmk",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-sa-api-key",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };
}

// Global burst protection: max 5 concurrent requests
let activeRequests = 0;
const MAX_CONCURRENT = 5;

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  // Burst protection
  if (activeRequests >= MAX_CONCURRENT) {
    return new Response(
      JSON.stringify({ error: "TOO_MANY_REQUESTS", message: "Server is busy, please retry shortly." }),
      { status: 429, headers: { ...cors, "Content-Type": "application/json" } }
    );
  }
  activeRequests++;

  try {
    // API key auth
    const apiKey = req.headers.get("x-sa-api-key");
    const expectedKey = Deno.env.get("SA_API_KEY");
    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), {
        status: 401,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Maintenance mode
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

    const body = await req.json();
    const { url_hash, signals, severity, extension_version, ai_verdict, ai_confidence } = body;

    if (!url_hash || !signals || !severity) {
      return new Response(JSON.stringify({ error: "INVALID_BODY", message: "url_hash, signals, and severity are required." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    const { data, error } = await supabase
      .from("sa_detections")
      .insert({
        url_hash,
        signals,
        severity,
        extension_version: extension_version ?? null,
        ai_verdict: ai_verdict ?? null,
        ai_confidence: ai_confidence ?? null,
      })
      .select("id")
      .single();

    if (error) {
      console.error("sa-report-detection insert error:", error);
      return new Response(JSON.stringify({ error: "INSERT_ERROR" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ ok: true, id: data.id }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sa-report-detection error:", err);
    return new Response(JSON.stringify({ error: "SERVER_ERROR" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  } finally {
    activeRequests--;
  }
});
