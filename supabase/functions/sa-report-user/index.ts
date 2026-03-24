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
      trigger_indicators,
      scan_result,
      extension_version,
      sender_domain,
      is_free_provider
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
         let reputationInfo = "Not checked";
         
         if (sender_email) {
            try {
              const emailRepKey = Deno.env.get("EMAILREP_KEY");
              const headers: Record<string, string> = {};
              if (emailRepKey) headers["Key"] = emailRepKey;

              const repResp = await fetch(`https://emailrep.io/${encodeURIComponent(sender_email)}`, { headers });
              if (repResp.ok) {
                const repData = await repResp.json();
                reputationInfo = `Reputation: ${repData.reputation} | Suspicious: ${repData.suspicious} | References: ${repData.references} | Details: ${repData.details.profiles.join(', ')} | Disposable: ${repData.details.disposable}`;
              } else {
                reputationInfo = `Check failed (Status: ${repResp.status})`;
              }
            } catch (err) {
              console.warn("EmailRep check failed:", err);
              reputationInfo = "Error during check";
            }
         }

         const systemPrompt = `You are a scam detection heuristics engine. Analyze a user-submitted scam report.
Your goal is to extract purely textual, generalized patterns that a regex/heuristic engine can use to catch similar scams.
You MUST assign EACH suggested pattern to one of the following exact categories: 'gift_card', 'command', 'finance', 'vague_lure', 'authority_pressure', 'urgency', 'securityKeywords', or 'general'.`;

         const userPrompt = `A user submitted a potential scam report.
URL: ${url}
Description: ${description || "N/A"}
Sender Email: ${sender_email || "N/A"} (Domain: ${sender_domain || "N/A"}, Free Provider: ${is_free_provider ? "YES" : "NO"})
Email Reputation: ${reputationInfo}
Body Preview: ${body_preview || "N/A"}
Indicators: ${JSON.stringify(indicators || [])}
Trigger Indicators: ${JSON.stringify(trigger_indicators || [])}

Respond ONLY with valid JSON, no markdown:
{
  "verdict": "SCAM" | "SAFE" | "SUSPICIOUS",
  "reason": "<max 20 words>",
  "confidence": <0-100>,
  "suggested_patterns": [
     { "phrase": "extracted text pattern", "category": "one of the exact categories above" }
  ]
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
             if (aiAnalysis) {
               aiAnalysis.reputation_info = reputationInfo; // Save reputation into DB along with AI output
             }
           }
         } catch (e) {
           console.error("AI review error:", e);
         }
      }
    }

    // ========================================================================
    // Domain Reputation Tracking (Phase 1 Integration)
    // ========================================================================
    try {
      const { parse } = await import("https://esm.sh/tldts@6.1.1");
      const parsed = parse(url);
      const domain = parsed.domain || new URL(url).hostname.replace(/^www\./, '');
      
      const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("cf-connecting-ip") || "unknown";
      const encoder = new TextEncoder();
      const dataBuffer = encoder.encode(clientIp + Deno.env.get("SUPABASE_URL")); 
      const hashBuffer = await crypto.subtle.digest("SHA-256", dataBuffer);
      const reporterHash = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');

      // Determine numeric score
      const scoreMap: Record<string, number> = { suspicious: 1, scammy: 2, dangerous: 3 };
      const numericScore = scoreMap[report_type] || 2; 
      const finalReportType = report_type === 'dangerous' ? 'dangerous' : (report_type === 'suspicious' ? 'suspicious' : 'scammy');

      let { data: rep } = await supabase.from('sa_domain_reputation').select('id, total_score, report_count').eq('domain', domain).single();
      
      if (!rep) {
          const { data: newRep, error: newRepErr } = await supabase.from('sa_domain_reputation').insert({ domain, status: 'active' }).select('id, total_score, report_count').single();
          if (!newRepErr) {
             rep = newRep;
          } else {
             rep = await supabase.from('sa_domain_reputation').select('id, total_score, report_count').eq('domain', domain).single().then(r => r.data);
          }
      }

      if (rep) {
         // Insert the event. The UNIQUE index prevents multiple reports from same user on same day.
         const { error: repErr } = await supabase.from('sa_domain_reports').insert({
            domain_id: rep.id,
            domain,
            report_type: finalReportType,
            score: numericScore,
            url: url.trim(),
            description: description ?? null,
            reporter_hash: reporterHash
         });

         if (!repErr) {
             const { count: dCount } = await supabase.from('sa_domain_reports').select('reporter_hash', { head: true, count: 'exact' }).eq('domain_id', rep.id);
             await supabase.from('sa_domain_reputation').update({
                 total_score: rep.total_score + numericScore,
                 report_count: rep.report_count + 1,
                 distinct_reporters: dCount || rep.report_count + 1,
                 last_activity_at: new Date().toISOString()
             }).eq('id', rep.id);
         }
      }
    } catch (repTrackErr) {
      console.warn("Domain Reputation tracking failed (non-fatal):", repTrackErr);
    }

    const { data, error } = await supabase

      .from("sa_user_reports")
      .insert({
        url: url.trim(),
        report_type: report_type ?? "scam",
        description: description ?? null,
        sender_email: sender_email ?? null,
        sender_domain: sender_domain ?? null,
        is_free_provider: is_free_provider ?? false,
        subject: subject ?? null,
        body_preview: body_preview ?? null,
        user_notes: user_notes ?? null,
        severity: severity ?? "UNKNOWN",
        indicators: indicators ?? [],
        trigger_indicators: trigger_indicators ?? [],
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

    // AUTONOMOUS AI PROMOTION LOOP
    // If AI is highly confident it's a scam, push patterns immediately
    if (aiAnalysis && aiAnalysis.verdict === 'SCAM' && aiAnalysis.confidence >= 90 && Array.isArray(aiAnalysis.suggested_patterns)) {
      try {
        const patternsToInsert = aiAnalysis.suggested_patterns.map((p: any) => ({
           phrase: p.phrase,
           category: p.category || 'general',
           severity_weight: 50,
           active: true,
           source: 'ai_auto_promotion'
        }));
        
        if (patternsToInsert.length > 0) {
            const { error: promoErr } = await supabase
              .from('sa_patterns')
              .insert(patternsToInsert);
              
            if (promoErr) console.error("sa-report-user auto-promotion error:", promoErr);
            else {
               // Update the report to show it was promoted
               await supabase.from('sa_user_reports').update({
                   review_status: 'reviewed',
                   admin_notes: 'Autonomously promoted by AI Heuristic Engine.',
                   reviewed_at: new Date().toISOString()
               }).eq('id', data.id);
            }
        }
      } catch (promoCatch) {
         console.error("sa-report-user auto-promotion caught error:", promoCatch);
      }
    }

    return json({ ok: true, id: data.id });
  } catch (err) {
    console.error("sa-report-user error:", err);
    return json({ error: "SERVER_ERROR", message: String(err) }, 500);
  } finally {
    activeRequests--;
  }
});
