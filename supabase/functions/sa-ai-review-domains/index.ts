import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sa-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    if (authHeader !== `Bearer ${serviceRoleKey}`) {
      // Allow scheduled pg_cron calls without auth header, but verify secret if passed
      // Usually, Edge Function crons are invoked with service_role token
      // We'll proceed if it's authorized or allow an explicit cron secret if configured
      const cronSecret = req.headers.get("x-sa-cron-secret");
      if (!cronSecret || cronSecret !== Deno.env.get("SA_CRON_SECRET")) {
          return new Response("Unauthorized", { status: 401 });
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      serviceRoleKey
    );

    const geminiKey = Deno.env.get("SA_GEMINI_KEY");
    if (!geminiKey) throw new Error("Missing Gemini Key");

    // 1. Fetch up to 10 domains that need AI review
    // Review needed if ai_next_review is past, or if it has never been reviewed but has a score >= 15
    const now = new Date().toISOString();
    const { data: domains, error: fetchErr } = await supabase
       .from('sa_domain_reputation')
       .select('id, domain, total_score, report_count, external_flagged, external_source')
       .or(`ai_next_review.lte.${now},and(ai_reviewed_at.is.null,total_score.gte.15),and(external_flagged.eq.true,ai_reviewed_at.is.null)`)
       .limit(10);

    if (fetchErr) throw fetchErr;

    if (!domains || domains.length === 0) {
        return new Response(JSON.stringify({ message: "No domains require review" }), {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
    }

    const reviewedCount = domains.length;

    for (const d of domains) {
        // Build the prompt for Gemini
        const systemPrompt = `You are a cybersecurity domain reputation engine. Analyze a domain that has been flagged by users or external sources.
Your goal is to determine if this domain is hosting phishing, scams, or malware.
Only respond with valid JSON:
{
  "verdict": "SCAM" | "SAFE" | "SUSPICIOUS",
  "confidence": <0-100>,
  "reason": "Short 1-sentence reason",
  "suggested_patterns": [{"phrase": "malicious url path or script name", "category": "general"}]
}`;

        const userPrompt = `Domain: ${d.domain}
Total User Score: ${d.total_score}
Total Reports: ${d.report_count}
Externally Flagged: ${d.external_flagged ? "YES (" + d.external_source + ")" : "NO"}

Provide the JSON analysis.`;

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

            let aiMod = 0;
            let newStatus = d.status || 'active';
            
            if (jsonMatch) {
              const analysis = JSON.parse(jsonMatch[0]);
              
              if (analysis.verdict === 'SCAM') {
                  aiMod = 100;
                  newStatus = 'confirmed_dangerous';

                  // Extraction pass: push patterns if highly confident and externally flagged
                  if (analysis.confidence >= 90 && d.external_flagged && Array.isArray(analysis.suggested_patterns)) {
                      const patterns = analysis.suggested_patterns.map((p: any) => ({
                           phrase: p.phrase,
                           category: p.category || 'general',
                           severity_weight: 50,
                           active: true,
                           source: 'ai_domain_review'
                      }));
                      if (patterns.length > 0) {
                          await supabase.from('sa_patterns').insert(patterns);
                      }
                  }
              } else if (analysis.verdict === 'SAFE') {
                  aiMod = -50; 
                  if (!d.external_flagged) newStatus = 'cleared';
              } else if (analysis.verdict === 'SUSPICIOUS') {
                  aiMod = 25;
              }
            }

            // Update domain
            const nextReview = new Date();
            nextReview.setDate(nextReview.getDate() + 30); // Next review in 30 days

            await supabase.from('sa_domain_reputation').update({
                ai_modifier: aiMod,
                ai_reviewed_at: new Date().toISOString(),
                ai_next_review: nextReview.toISOString(),
                status: newStatus
            }).eq('id', d.id);

        } catch (e) {
            console.error(`AI review failed for domain ${d.domain}:`, e);
            // Push next review out by 1 day on error to prevent constant retries
            const retryDate = new Date();
            retryDate.setDate(retryDate.getDate() + 1);
            await supabase.from('sa_domain_reputation').update({
                ai_next_review: retryDate.toISOString()
            }).eq('id', d.id);
        }
    }

    return new Response(JSON.stringify({ ok: true, reviewed: reviewedCount }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("sa-ai-review-domains error:", err);
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
