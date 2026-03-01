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

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

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
    const { data: mConfig } = await supabase
      .from("sa_app_config")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (mConfig?.value === true) {
      return new Response(
        JSON.stringify({ error: "SERVICE_UNAVAILABLE", message: "Scam Alert is temporarily under maintenance." }),
        { status: 503, headers: { ...cors, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { detection_id, url_hash, feedback, user_comment } = body;

    if (!detection_id || !url_hash || !feedback) {
      return new Response(JSON.stringify({ error: "INVALID_BODY", message: "detection_id, url_hash, and feedback are required." }), {
        status: 400,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Insert the correction
    const { error: insertErr } = await supabase
      .from("sa_corrections")
      .insert({
        detection_id,
        url_hash,
        feedback,
        user_comment: user_comment ?? null,
        review_status: "pending",
      });

    if (insertErr) {
      console.error("sa-submit-correction insert error:", insertErr);
      return new Response(JSON.stringify({ error: "INSERT_ERROR" }), {
        status: 500,
        headers: { ...cors, "Content-Type": "application/json" },
      });
    }

    // Check if AI review should trigger
    let reviewTriggered = false;

    const { data: aiConfig } = await supabase
      .from("sa_app_config")
      .select("key, value")
      .in("key", ["ai_review_enabled", "min_corrections_before_review"]);

    const configMap: Record<string, any> = {};
    for (const row of aiConfig ?? []) {
      configMap[row.key] = row.value;
    }

    const aiEnabled = configMap["ai_review_enabled"] === true;
    const minCorrections = typeof configMap["min_corrections_before_review"] === "number"
      ? configMap["min_corrections_before_review"]
      : 3;

    if (aiEnabled) {
      // Count pending corrections for this url_hash
      const { count } = await supabase
        .from("sa_corrections")
        .select("id", { count: "exact", head: true })
        .eq("url_hash", url_hash)
        .eq("review_status", "pending");

      if ((count ?? 0) >= minCorrections) {
        reviewTriggered = true;

        // Fetch the original detection for context
        const { data: detection } = await supabase
          .from("sa_detections")
          .select("severity, signals")
          .eq("id", detection_id)
          .single();

        const severity = detection?.severity ?? "UNKNOWN";
        const signals = detection?.signals ?? {};

        const geminiKey = Deno.env.get("SA_GEMINI_KEY");
        if (geminiKey) {
          try {
            const prompt = `A browser security extension flagged this URL hash as ${severity}. ${count} users have reported this as a ${feedback} error. Based on the signals ${JSON.stringify(signals)}, should this detection be accepted as correct, downgraded, or escalated? Respond only with JSON: { "verdict": "ACCEPTED" | "DOWNGRADED" | "ESCALATED", "reason": "string", "promote_to_patterns": boolean, "suggested_patterns": ["string"] }`;

            const geminiResp = await fetch(
              `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
              {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  contents: [{ parts: [{ text: prompt }] }],
                }),
              }
            );

            const geminiData = await geminiResp.json();
            const rawText =
              geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

            // Extract JSON from response (may be wrapped in markdown code block)
            const jsonMatch = rawText.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const aiResult = JSON.parse(jsonMatch[0]);

              const newStatus =
                aiResult.verdict === "ACCEPTED" ? "accepted" :
                aiResult.verdict === "DOWNGRADED" ? "accepted" :
                aiResult.verdict === "ESCALATED" ? "rejected" : "pending";

              // Update all pending corrections for this url_hash
              await supabase
                .from("sa_corrections")
                .update({
                  ai_review_result: aiResult,
                  review_status: newStatus,
                  reviewed_at: new Date().toISOString(),
                })
                .eq("url_hash", url_hash)
                .eq("review_status", "pending");

              // If AI suggests promoting patterns, insert them
              if (aiResult.promote_to_patterns && Array.isArray(aiResult.suggested_patterns)) {
                for (const phrase of aiResult.suggested_patterns) {
                  if (typeof phrase === "string" && phrase.trim()) {
                    await supabase
                      .from("sa_patterns")
                      .upsert(
                        {
                          phrase: phrase.trim(),
                          category: "phrase",
                          severity_weight: 2,
                          source: "ai_promoted",
                          active: true,
                        },
                        { onConflict: "phrase" }
                      );
                  }
                }
              }
            }
          } catch (aiErr) {
            console.error("AI review error (non-fatal):", aiErr);
            // AI review failure is non-fatal; correction is still saved
          }
        }
      }
    }

    return new Response(
      JSON.stringify({ ok: true, review_triggered: reviewTriggered }),
      { headers: { ...cors, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("sa-submit-correction error:", err);
    return new Response(JSON.stringify({ error: "SERVER_ERROR" }), {
      status: 500,
      headers: { ...getCorsHeaders(req), "Content-Type": "application/json" },
    });
  }
});
