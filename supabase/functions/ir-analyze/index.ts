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

/* ── Burst protection: in-memory per-user concurrency limiter ── */
const activeRequests = new Map<string, number>();
const MAX_CONCURRENT = 2;

const PRO_DAILY_LIMIT = 100;

serve(async (req) => {
  const cors = getCorsHeaders(req);
  if (req.method === "OPTIONS") return new Response(null, { headers: cors });

  /* ── Maintenance mode kill switch ─────────────── */
  try {
    const adminClientEarly = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const { data: config } = await adminClientEarly
      .from("az_app_config")
      .select("value")
      .eq("key", "maintenance_mode")
      .single();

    if (config?.value === true) {
      return json({ error: "SERVICE_UNAVAILABLE", message: "InsightReel is temporarily under maintenance. Please try again later." }, 503, cors);
    }
  } catch (e) {
    console.error("Maintenance check failed, proceeding:", e);
  }

  let userId: string | null = null;

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

    userId = user.id;

    /* ── Burst protection ─────────────────────────── */
    const current = activeRequests.get(userId) ?? 0;
    if (current >= MAX_CONCURRENT) {
      return json({ error: "TOO_MANY_REQUESTS", message: "Too many concurrent requests. Please wait for your current analysis to complete." }, 429, cors);
    }
    activeRequests.set(userId, current + 1);

    /* ── Fetch profile ────────────────────────────── */
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from("az_profiles")
      .select("is_pro, has_byok_license, trial_credits, daily_usage_count, last_usage_reset")
      .eq("user_id", user.id)
      .single();

    if (!profile) {
      return json({ error: "UNAUTHORIZED", message: "Profile not found" }, 401, cors);
    }

    /* ── Daily quota reset check ──────────────────── */
    const now = new Date();
    const lastReset = new Date(profile.last_usage_reset);
    const hoursSinceReset = (now.getTime() - lastReset.getTime()) / (1000 * 60 * 60);
    let dailyCount = profile.daily_usage_count;

    if (hoursSinceReset >= 24) {
      // Reset daily counter
      dailyCount = 0;
      await adminClient
        .from("az_profiles")
        .update({ daily_usage_count: 0, last_usage_reset: now.toISOString() })
        .eq("user_id", user.id);
    }

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

    /* ── Daily quota enforcement (Pro & Trial) ────── */
    if (mode === "pro" && dailyCount >= PRO_DAILY_LIMIT) {
      return json({
        error: "TOO_MANY_REQUESTS",
        message: "Fair Use Policy: You have exceeded your daily limit of 100 analyses. Your quota resets every 24 hours.",
        daily_usage_count: dailyCount,
        limit: PRO_DAILY_LIMIT,
      }, 429, cors);
    }

    /* ── Build AI request ─────────────────────────── */
    const systemPrompt = `You are InsightReel, an AI that analyzes video transcripts and provides concise, actionable insights. Focus on key takeaways, sentiment, and notable patterns.`;
    const userPrompt = context
      ? `Context: ${context}\n\nTranscript:\n${transcript}`
      : `Transcript:\n${transcript}`;

    let analysis: string;

    if (mode === "byok") {
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

    /* ── Post-success updates ─────────────────────── */
    const updates: Record<string, unknown> = {
      daily_usage_count: dailyCount + 1,
    };

    if (mode === "trial") {
      updates.trial_credits = profile.trial_credits - 1;
    }

    await adminClient
      .from("az_profiles")
      .update(updates)
      .eq("user_id", user.id);

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
  } finally {
    /* ── Release burst limiter ────────────────────── */
    if (userId) {
      const c = activeRequests.get(userId) ?? 1;
      if (c <= 1) activeRequests.delete(userId);
      else activeRequests.set(userId, c - 1);
    }
  }
});
