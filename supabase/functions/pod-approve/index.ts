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

    const { data: roleData } = await supabase
      .from("az_user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin")
      .single();
    if (!roleData) return json({ error: "Admin access required" }, 403);

    const { idea_id } = await req.json();

    const { data: idea, error: fetchError } = await supabase
      .from("az_pod_ideas")
      .select("*")
      .eq("id", idea_id)
      .single();
    if (fetchError || !idea) throw new Error("Idea not found");

    // Fetch Trello credentials
    const { data: settings } = await supabase
      .from("az_pod_settings")
      .select("trello_api_key, trello_token")
      .eq("user_id", user.id)
      .single();

    if (!settings?.trello_api_key || !settings?.trello_token) {
      return json({ error: "Trello credentials not configured. Go to Settings tab." }, 400);
    }

    const a = idea.analysis as any;
    const description = `## 🔥 VIRAL TEXT CONTENT

**"${a?.content_text || idea.idea_text}"**

---

## 📊 SOURCE INFORMATION
- **Platform:** ${a?.platform || 'N/A'}
- **Discovery Date:** ${new Date(idea.created_at).toLocaleDateString()}

---

## 📈 VIRAL METRICS
- **Engagement Score:** ${a?.engagement_score || 'N/A'}
- **Viral Indicators:** ${a?.viral_indicators || 'N/A'}

---

## 💰 COMMERCIAL VIABILITY
- **Overall Score:** ${a?.commercial_viability_score || 'N/A'}/10
- **Score Explanation:** ${a?.score_explanation || 'N/A'}
- **Target Audience:** ${a?.target_audience || 'N/A'}

---

## 🛍️ MERCHANDISE APPLICATIONS
${a?.merchandise_applications || 'N/A'}

---

## ⚖️ LEGAL ASSESSMENT
- **Copyright Status:** ${a?.copyright_status || 'N/A'}
- **Usage Rights:** ${a?.usage_rights || 'N/A'}
- **Legal Notes:** ${a?.legal_notes || 'N/A'}

---

## 📅 TREND ANALYSIS
- **Longevity Prediction:** ${a?.longevity_prediction || 'N/A'}
- **Market Positioning:** ${a?.market_positioning || 'N/A'}

---

## 🎨 PRODUCTION NOTES
- **Font Suggestions:** ${a?.font_suggestions || 'N/A'}
- **Design Considerations:** ${a?.design_considerations || 'N/A'}
- **Product Recommendations:** ${a?.product_recommendations || 'N/A'}

---

## 📝 ADDITIONAL NOTES
${a?.additional_notes || 'N/A'}`;

    const trelloResponse = await fetch("https://api.trello.com/1/cards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        idList: "687449ac29797fd36252a8aa",
        name: (a?.content_text || idea.idea_text || "POD Idea").substring(0, 100),
        desc: description,
        key: settings.trello_api_key,
        token: settings.trello_token,
      })
    });

    const trelloCard = await trelloResponse.json();
    if (!trelloResponse.ok) throw new Error(`Trello API error: ${JSON.stringify(trelloCard)}`);

    const { data: updatedIdea, error: updateError } = await supabase
      .from("az_pod_ideas")
      .update({
        status: "approved",
        trello_card_id: trelloCard.id,
        trello_card_url: trelloCard.shortUrl || trelloCard.url,
        updated_at: new Date().toISOString()
      })
      .eq("id", idea_id)
      .select()
      .single();

    if (updateError) throw updateError;

    return json({ idea: updatedIdea, trello_card: trelloCard });
  } catch (error) {
    console.error("pod-approve error:", error);
    return json({ error: error.message }, 500);
  }
});
