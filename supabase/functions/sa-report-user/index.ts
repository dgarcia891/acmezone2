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

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // Maintenance mode check
    const { data: mConfig } = await supabase
      .from("sa_app_config")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (mConfig?.value === true) {
      return json(
        { error: "MAINTENANCE", message: "Scam Alert is temporarily under maintenance." },
        503
      );
    }

    const body = await req.json();
    const {
      url,
      report_type,
      description,
      sender_email,
      subject,
      body_preview,
      user_notes,
      severity,
      indicators,
      scan_result,
      extension_version,
    } = body;

    // Validate required fields
    if (!url || typeof url !== "string" || url.trim().length === 0) {
      return json({ error: "INVALID_BODY", message: "url is required and must be a non-empty string." }, 400);
    }
    if (url.length > 2048) {
      return json({ error: "INVALID_BODY", message: "url must be less than 2048 characters." }, 400);
    }
    if (description && typeof description !== "string") {
      return json({ error: "INVALID_BODY", message: "description must be a string." }, 400);
    }
    if (sender_email && typeof sender_email !== "string") {
      return json({ error: "INVALID_BODY", message: "sender_email must be a string." }, 400);
    }
    if (indicators && !Array.isArray(indicators)) {
      return json({ error: "INVALID_BODY", message: "indicators must be an array." }, 400);
    }

    let aiAnalysis = null;
    const geminiKey = Deno.env.get("SA_GEMINI_KEY");

    if (geminiKey) {
      const { data: configRow } = await supabase
        .from("sa_app_config")
        .select("value")
        .eq("key", "ai_review_enabled")
        .single();
        
      if (configRow?.value === true) {
         const systemPrompt = "You are a scam detection quality reviewer. Analyze a user-submitted scam report.";
         const userPrompt = `A user submitted a potential scam report.
URL: ${url}
Description: ${description || "N/A"}
Sender Email: ${sender_email || "N/A"}
Body Preview: ${body_preview || "N/A"}
Indicators: ${JSON.stringify(indicators || [])}

Respond ONLY with valid JSON, no markdown:
{
  "verdict": "SCAM" | "SAFE" | "SUSPICIOUS",
  "reason": "<max 20 words>",
  "confidence": <0-100>,
  "suggested_patterns": ["pattern1", "pattern2"]
}`;

         try {
           const geminiResp = await fetch(
             `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
             {
               method: "POST",
               headers: { "Content-Type": "application/json" },
               body: JSON.stringify({
                 system_instruction: { parts: [{ text: systemPrompt }] },
                 contents: [{ parts: [{ text: userPrompt }] }],
               }),
             }
           );
           const geminiData = await geminiResp.json();
           const rawText = geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
           const jsonMatch = rawText.match(/\{[\s\S]*\}/);
           if (jsonMatch) {
             aiAnalysis = JSON.parse(jsonMatch[0]);
           }
         } catch (e) {
           console.error("AI review error:", e);
         }
      }
    }

    const { data, error } = await supabase
      .from("sa_user_reports")
      .insert({
        url: url.trim(),
        report_type: report_type ?? "scam",
        description: description ?? null,
        sender_email: sender_email ?? null,
        subject: subject ?? null,
        body_preview: body_preview ?? null,
        user_notes: user_notes ?? null,
        severity: severity ?? "UNKNOWN",
        indicators: indicators ?? [],
        scan_result: scan_result ?? {},
        extension_version: extension_version ?? null,
        ai_analysis: aiAnalysis,
      })
      .select("id")
      .single();

    if (error) {
      console.error("sa-report-user insert error:", error);
      return json({ error: "INSERT_ERROR", message: error.message }, 500);
    }

    return json({ ok: true, id: data.id });
  } catch (err) {
    console.error("sa-report-user error:", err);
    return json({ error: "SERVER_ERROR", message: String(err) }, 500);
  } finally {
    activeRequests--;
  }
});
