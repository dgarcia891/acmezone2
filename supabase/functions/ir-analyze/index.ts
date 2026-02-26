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
      "authorization, x-client-info, apikey, content-type",
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

    // Verify user via their JWT
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: auth } },
    });
    const { data: { user }, error: authErr } = await userClient.auth.getUser();
    if (authErr || !user) return json({ error: "UNAUTHORIZED" }, 401, cors);

    /* ── Pro check ────────────────────────────────── */
    const adminClient = createClient(supabaseUrl, serviceKey);
    const { data: profile } = await adminClient
      .from("az_profiles")
      .select("is_pro")
      .eq("user_id", user.id)
      .single();

    if (!profile?.is_pro) {
      return json({ error: "PAYMENT_REQUIRED", message: "Pro subscription required" }, 402, cors);
    }

    /* ── Parse body ───────────────────────────────── */
    const { transcript, context } = await req.json();
    if (!transcript) return json({ error: "BAD_REQUEST", message: "transcript is required" }, 400, cors);

    /* ── Call Gemini via Lovable AI gateway ────────── */
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) return json({ error: "SERVER_CONFIG", message: "AI key not configured" }, 500, cors);

    const systemPrompt = `You are InsightReel, an AI that analyzes video transcripts and provides concise, actionable insights. Focus on key takeaways, sentiment, and notable patterns.`;
    const userPrompt = context
      ? `Context: ${context}\n\nTranscript:\n${transcript}`
      : `Transcript:\n${transcript}`;

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
    const analysis = aiData.choices?.[0]?.message?.content ?? "";

    /* ── Log usage ────────────────────────────────── */
    await adminClient.from("az_usage_logs").insert({
      user_id: user.id,
      action: "analyze",
      metadata: { transcript_length: transcript.length },
    });

    return json({ ok: true, analysis }, 200, cors);
  } catch (err) {
    console.error("ir-analyze error:", err);
    return json({ error: "SERVER_ERROR" }, 500, getCorsHeaders(req));
  }
});
