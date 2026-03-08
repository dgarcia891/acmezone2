import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "No authorization header" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ error: "Invalid token" }, 401);

    // Admin check
    const { data: roleData } = await supabase
      .from("az_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return json({ error: "Admin access required" }, 403);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY is not configured" }, 500);

    const body = await req.json().catch(() => ({}));
    const category = body.category || "any";
    const count = Math.min(Math.max(body.count || 5, 1), 10);

    const systemPrompt = `You are a Print-on-Demand product trend expert. Your job is to suggest ${count} highly specific, commercially viable product ideas that would sell well on Etsy, eBay, or Amazon.

Focus on what's currently trending, viral, or seasonally relevant. Think about:
- Current viral memes, pop culture moments, and internet trends
- Seasonal events, holidays, and upcoming occasions
- Niche communities with passionate buyers (gamers, pet owners, teachers, nurses, etc.)
- Trending aesthetic styles (cottagecore, dark academia, retro, Y2K, etc.)
- Funny/relatable phrases and quotes that resonate with specific audiences

Return ONLY a JSON object with a "suggestions" array containing exactly ${count} ideas, ranked from most viable to least. Each idea object must have:
- "idea_text": A clear, specific product idea description (2-3 sentences max)
- "product_type": Either "sticker", "tshirt", or "both"
- "reasoning": Why this would sell well right now (1-2 sentences)
- "target_audience": Who would buy this (brief)
- "estimated_viability": A score from 1-10
- "trend_momentum": Either "rising", "peaking", or "steady"
- "category": A short category tag (e.g. "memes", "seasonal", "niche community", "pop culture", "aesthetic", "humor")

Do NOT wrap in markdown code blocks. Return raw JSON only.`;

    const userPrompt = category !== "any"
      ? `Suggest ${count} trending POD ideas in the "${category}" category. Rank them by viability. Make each specific and actionable.`
      : `Suggest ${count} trending POD ideas based on what's popular right now in ${new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}. Rank them by viability. Make each specific and actionable.`;

    const aiResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!aiResponse.ok) {
      if (aiResponse.status === 429) {
        return json({ error: "Rate limit exceeded. Please try again in a moment." }, 429);
      }
      if (aiResponse.status === 402) {
        return json({ error: "AI credits exhausted. Please add funds." }, 402);
      }
      const text = await aiResponse.text();
      console.error("AI gateway error:", aiResponse.status, text);
      return json({ error: "AI service error" }, 500);
    }

    const aiData = await aiResponse.json();
    const content = aiData.choices?.[0]?.message?.content;

    if (!content) return json({ error: "Empty AI response" }, 500);

    let parsed;
    try {
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      console.error("Failed to parse AI response:", content);
      return json({ error: "Failed to parse AI suggestion" }, 500);
    }

    // Normalize: support both { suggestions: [...] } and raw array
    const suggestions = Array.isArray(parsed) ? parsed : (parsed.suggestions || [parsed]);

    return json({ suggestions });
  } catch (error) {
    console.error("pod-suggest-idea error:", error);
    return json({ error: error.message }, 500);
  }
});
