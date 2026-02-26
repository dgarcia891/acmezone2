import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const ALLOWED_ORIGINS = [
  "chrome-extension://plohgpfkkhnennkgoneolbpomnhoclmk",
];

function getCorsHeaders(req: Request) {
  const origin = req.headers.get("Origin") ?? "";
  const allowedOrigin = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-user-gemini-key",
  };
}

function json(body: Record<string, unknown>, status = 200, cors: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  try {
    /* ── Auth ─────────────────────────────────────── */
    const auth = req.headers.get("Authorization") ?? "";
    if (!auth.startsWith("Bearer ")) return json({ error: "UNAUTHORIZED" }, 401, cors);

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "UNAUTHORIZED" }, 401, cors);

    /* ── Fetch profile ────────────────────────────── */
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from("az_profiles")
      .select("is_pro, has_byok_license, trial_credits")
      .eq("user_id", user.id)
      .single();

    if (!profile) return json({ error: "UNAUTHORIZED", message: "Profile not found" }, 401, cors);

    /* ── Parse body ───────────────────────────────── */
    const { transcript, context } = await req.json();
    if (!transcript) return json({ error: "BAD_REQUEST", message: "transcript is required" }, 400, cors);

    /* ── Determine access mode ────────────────────── */
    const userGeminiKey = req.headers.get("X-User-Gemini-Key");
    let mode: "byok" | "pro" | "trial";

    if (userGeminiKey && profile.has_byok_license) {
      mode = "byok";
    } else if (profile.is_pro) {
      mode = "pro";
    } else if (profile.trial_credits > 0) {
      mode = "trial";
    } else {
      return json({
        error: "PAYMENT_REQUIRED",
        message: "No active subscription, BYOK license, or trial credits remaining",
        trial_credits: 0,
      }, 402, cors);
    }

    /* ── Build AI request ─────────────────────────── */
    const systemPrompt = `You are InsightReel, an AI that analyzes video transcripts and provides concise, actionable insights. Focus on key takeaways, sentiment, and notable patterns.`;
    const userPrompt = context
      ? `Context: ${context}\n\nTranscript:\n${transcript}`
      : `Transcript:\n${transcript}`;

    let analysis: string;

    if (mode === "byok") {
      // Call Gemini directly with the user's own API key
      const geminiResp = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${userGeminiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ parts: [{ text: userPrompt }] }],
          }),
        }
      );

      if (!geminiResp.ok) {
        console.error("Gemini BYOK error:", geminiResp.status, await geminiResp.text());
        return json({ error: "PROVIDER_ERROR", message: "Gemini API call failed. Check your API key." }, 502, cors);
      }

      const geminiData = await geminiResp.json();
      analysis = geminiData.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    } else {
      // Pro or Trial: use Lovable AI gateway
      const apiKey = Deno.env.get("LOVABLE_API_KEY");
      if (!apiKey) return json({ error: "SERVER_CONFIG", message: "AI key not configured" }, 500, cors);

      const aiResp = await fetch("https://ai-gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          max_tokens: 2048,
        }),
      });

      if (!aiResp.ok) {
        console.error("AI provider error:", aiResp.status, await aiResp.text());
        return json({ error: "PROVIDER_ERROR" }, 502, cors);
      }

      const aiData = await aiResp.json();
      analysis = aiData.choices?.[0]?.message?.content ?? "";
    }

    /* ── Decrement trial credits on success ────────── */
    if (mode === "trial") {
      await adminClient
        .from("az_profiles")
        .update({ trial_credits: profile.trial_credits - 1 })
        .eq("user_id", user.id);
    }

    /* ── Log usage ────────────────────────────────── */
    await adminClient.from("az_usage_logs").insert({
      user_id: user.id,
      action: "analyze",
      metadata: { transcript_length: transcript.length, mode },
    });

    return json({ ok: true, analysis, mode }, 200, cors);
  } catch (err) {
    console.error("ir-analyze error:", err);
    return json({ error: "SERVER_ERROR" }, 500, getCorsHeaders(req));
  }
});
