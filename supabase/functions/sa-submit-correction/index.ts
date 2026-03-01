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

const FALLBACK_AI_RESULT = {
  verdict: "ACCEPTED",
  reason: "AI review inconclusive",
  confidence: 50,
  promote_to_patterns: false,
  suggested_patterns: [],
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

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

    // Maintenance mode
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
    const { detection_id, url_hash, feedback, user_comment } = body;

    // Validate required fields
    if (!url_hash || typeof url_hash !== "string") {
      return json({ error: "INVALID_BODY", message: "url_hash is required and must be a string." }, 400);
    }
    if (!feedback || !["false_positive", "false_negative", "wrong_severity"].includes(feedback)) {
      return json({ error: "INVALID_BODY", message: "feedback is required and must be one of: false_positive, false_negative, wrong_severity." }, 400);
    }

    // Insert the correction
    const { data: correctionData, error: insertErr } = await supabase
      .from("sa_corrections")
      .insert({
        detection_id: detection_id ?? null,
        url_hash,
        feedback,
        user_comment: user_comment ?? null,
        review_status: "pending",
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("sa-submit-correction insert error:", insertErr);
      return json({ error: "INSERT_ERROR", message: insertErr.message }, 500);
    }

    const correctionId = correctionData.id;

    // Check if AI review is enabled
    const { data: configRows } = await supabase
      .from("sa_app_config")
      .select("key, value")
      .in("key", ["ai_review_enabled", "min_corrections_before_review"]);

    const configMap: Record<string, any> = {};
    for (const row of configRows ?? []) {
      configMap[row.key] = row.value;
    }

    const aiEnabled = configMap["ai_review_enabled"] === true;
    const minCorrections =
      typeof configMap["min_corrections_before_review"] === "number"
        ? configMap["min_corrections_before_review"]
        : 3;

    if (!aiEnabled) {
      return json({ ok: true, review_triggered: false, verdict: null });
    }

    // Count pending corrections for this url_hash
    const { count } = await supabase
      .from("sa_corrections")
      .select("id", { count: "exact", head: true })
      .eq("url_hash", url_hash)
      .eq("review_status", "pending");

    if ((count ?? 0) < minCorrections) {
      return json({ ok: true, review_triggered: false, verdict: null });
    }

    // --- AI Review ---
    let aiResult = { ...FALLBACK_AI_RESULT };
    const geminiKey = Deno.env.get("SA_GEMINI_KEY");

    if (!geminiKey) {
      console.error("SA_GEMINI_KEY not configured, using fallback");
    } else {
      // Fetch original detection for context
      let severity = "UNKNOWN";
      let signals: any = {};
      if (detection_id) {
        const { data: detection } = await supabase
          .from("sa_detections")
          .select("severity, signals")
          .eq("id", detection_id)
          .single();
        if (detection) {
          severity = detection.severity;
          signals = detection.signals;
        }
      }

      const systemPrompt =
        "You are a scam detection quality reviewer. Analyze whether a browser extension made a correct or incorrect detection.";

      const userPrompt = `A browser security extension flagged a URL as ${severity}.
${count} users reported this as a ${feedback} error.
Signals that fired: ${JSON.stringify(signals)}

Respond ONLY with valid JSON, no markdown:
{
  "verdict": "ACCEPTED" | "DOWNGRADED" | "ESCALATED",
  "reason": "<max 20 words>",
  "confidence": <0-100>,
  "promote_to_patterns": true | false,
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
        const rawText =
          geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

        const jsonMatch = rawText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Validate shape
          if (
            parsed.verdict &&
            ["ACCEPTED", "DOWNGRADED", "ESCALATED"].includes(parsed.verdict)
          ) {
            aiResult = {
              verdict: parsed.verdict,
              reason: typeof parsed.reason === "string" ? parsed.reason : "No reason given",
              confidence:
                typeof parsed.confidence === "number" ? parsed.confidence : 50,
              promote_to_patterns: !!parsed.promote_to_patterns,
              suggested_patterns: Array.isArray(parsed.suggested_patterns)
                ? parsed.suggested_patterns
                : [],
            };
          }
        }
      } catch (aiErr) {
        console.error("AI review error (using fallback):", aiErr);
      }
    }

    // Update THIS correction row with AI result
    const reviewStatus = aiResult.verdict === "DOWNGRADED" ? "accepted" : "pending";

    await supabase
      .from("sa_corrections")
      .update({
        ai_review_result: aiResult,
        review_status: reviewStatus,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", correctionId);

    // If AI suggests promoting patterns, upsert them
    if (
      aiResult.promote_to_patterns &&
      Array.isArray(aiResult.suggested_patterns) &&
      aiResult.suggested_patterns.length > 0
    ) {
      for (const phrase of aiResult.suggested_patterns) {
        if (typeof phrase === "string" && phrase.trim()) {
          await supabase.from("sa_patterns").upsert(
            {
              phrase: phrase.trim(),
              category: "phrase",
              severity_weight: 1,
              source: "ai_promoted",
              active: true,
            },
            { onConflict: "phrase" }
          );
        }
      }
    }

    return json({
      ok: true,
      review_triggered: true,
      verdict: aiResult.verdict,
    });
  } catch (err) {
    console.error("sa-submit-correction error:", err);
    return json({ error: "SERVER_ERROR", message: String(err) }, 500);
  }
});
