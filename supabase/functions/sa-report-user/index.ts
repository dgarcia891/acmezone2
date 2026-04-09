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
      report_direction = "scam", // 'scam' | 'false_positive'
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

    // ========================================================================
    // FALSE POSITIVE path — only update FP counter, no report insert needed
    // ========================================================================
    if (report_direction === "false_positive") {
      if (!url || typeof url !== "string" || url.trim().length === 0) {
        return json({ error: "INVALID_BODY", message: "url is required." }, 400);
      }
      try {
        const { parse } = await import("https://esm.sh/tldts@6.1.1");
        const parsed = parse(url);
        const domain = parsed.domain || new URL(url).hostname.replace(/^www\./, "");

        // SELECT + UPDATE (non-atomic but acceptable for low-volume FP signals)
        const { data: rep } = await supabase
          .from("sa_domain_reputation")
          .select("id, false_positive_count")
          .eq("domain", domain)
          .single();
        if (rep) {
          await supabase
            .from("sa_domain_reputation")
            .update({ false_positive_count: (rep.false_positive_count ?? 0) + 1 })
            .eq("id", rep.id);
        }
        // If domain doesn't exist yet in reputation table, silently skip —
        // FP signal before any scam report means there's nothing to decrement
      } catch (fpErr) {
        console.warn("FP counter update failed (non-fatal):", fpErr);
      }
      return json({ ok: true, direction: "false_positive" });
    }

    // ========================================================================
    // SCAM path — validate, insert report, run AI, apply promotion tiers
    // ========================================================================

    let aiAnalysis = null;
    const geminiKey = Deno.env.get("SA_GEMINI_KEY");

    // Load configurable promotion thresholds from sa_app_config
    let aiAutoPromoteThreshold = 85;
    let minReportsForAutoPromote = 1;
    let minConsensusRatio = 0.70;
    try {
      const { data: configs } = await supabase
        .from("sa_app_config")
        .select("key, value")
        .in("key", ["ai_auto_promote_threshold", "min_reports_for_auto_promote", "min_consensus_ratio"]);
      if (configs) {
        for (const c of configs) {
          if (c.key === "ai_auto_promote_threshold") aiAutoPromoteThreshold = Number(c.value) || 85;
          if (c.key === "min_reports_for_auto_promote") minReportsForAutoPromote = Number(c.value) || 1;
          if (c.key === "min_consensus_ratio") minConsensusRatio = Number(c.value) || 0.70;
        }
      }
    } catch (cfgErr) {
      console.warn("Could not load promotion config, using defaults:", cfgErr);
    }

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

    // ========================================================================
    // TIER 1: AI Auto-promote (confidence >= configurable threshold)
    // ========================================================================
    if (aiAnalysis && aiAnalysis.verdict === 'SCAM' && aiAnalysis.confidence >= aiAutoPromoteThreshold && Array.isArray(aiAnalysis.suggested_patterns)) {
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
               // Update the report to show it was auto-promoted (Tier 1)
               await supabase.from('sa_user_reports').update({
                   review_status: 'reviewed',
                   admin_notes: `[Tier 1] Autonomously promoted by AI Heuristic Engine (confidence: ${aiAnalysis.confidence}%).`,
                   reviewed_at: new Date().toISOString()
               }).eq('id', data.id);
            }
        }
      } catch (promoCatch) {
         console.error("sa-report-user Tier 1 auto-promotion caught error:", promoCatch);
      }
    }

    // ========================================================================
    // TIER 3: Community threshold formula
    // Promote when district_reporters >= min AND consensus >= ratio
    // Tier 2 (admin queue) is the default — reports sit pending until admin acts
    // ========================================================================
    try {
      const { parse } = await import("https://esm.sh/tldts@6.1.1");
      const parsedForTier3 = parse(url);
      const domainForTier3 = parsedForTier3.domain || new URL(url).hostname.replace(/^www\./, '');

      const { data: repData } = await supabase
        .from('sa_domain_reputation')
        .select('id, report_count, distinct_reporters, false_positive_count, auto_promoted_at')
        .eq('domain', domainForTier3)
        .single();

      if (repData && !repData.auto_promoted_at) {
        const totalVotes = (repData.report_count ?? 0) + (repData.false_positive_count ?? 0);
        const scamVotes = repData.report_count ?? 0;
        const consensusRatio = totalVotes > 0 ? scamVotes / totalVotes : 0;
        const distinctReporters = repData.distinct_reporters ?? 0;

        if (distinctReporters >= minReportsForAutoPromote && consensusRatio >= minConsensusRatio) {
          // Threshold met — extract domain as a blocklist entry
          try {
            await supabase.from('sa_blocklist').insert({
              url: domainForTier3,
              source: 'community_promotion',
              active: true
            } as never);
          } catch (blErr) {
            console.warn('Blocklist insert failed (already exists?):', blErr);
          }

          // Mark domain as auto-promoted
          await supabase
            .from('sa_domain_reputation')
            .update({ auto_promoted_at: new Date().toISOString() })
            .eq('id', repData.id);

          console.log(`[sa-report-user] Tier 3 community promotion: ${domainForTier3} (${scamVotes}/${totalVotes} votes, ${distinctReporters} reporters)`);
        }
      }
    } catch (tier3Err) {
      console.warn("Tier 3 community promotion check failed (non-fatal):", tier3Err);
    }

    return json({ ok: true, id: data.id });
  } catch (err) {
    console.error("sa-report-user error:", err);
    return json({ error: "SERVER_ERROR", message: String(err) }, 500);
  } finally {
    activeRequests--;
  }
});
