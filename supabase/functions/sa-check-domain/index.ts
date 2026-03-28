import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { parse } from "https://esm.sh/tldts@6.1.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sa-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting
let activeRequests = 0;
const MAX_CONCURRENT = 50;

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  if (activeRequests >= MAX_CONCURRENT) {
    return new Response(JSON.stringify({ error: "TOO_MANY_REQUESTS" }), {
      status: 429,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
  activeRequests++;

  try {
    const apiKey = req.headers.get("x-sa-api-key");
    const expectedKey = Deno.env.get("SA_API_KEY");
    if (!apiKey || apiKey !== expectedKey) {
      return new Response(JSON.stringify({ error: "UNAUTHORIZED" }), { status: 401, headers: corsHeaders });
    }

    const { domain: rawDomain } = await req.json();
    if (!rawDomain || typeof rawDomain !== 'string') {
      return new Response(JSON.stringify({ error: "INVALID_BODY", message: "domain is required" }), { status: 400, headers: corsHeaders });
    }

    // Normalize using eTLD+1 to prevent "appspot.com" grouping (Finding 2)
    const parsed = parse(rawDomain);
    const domain = parsed.isIp ? parsed.hostname : (parsed.domain || rawDomain.toLowerCase().replace(/^www\./, ''));

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch from DB
    let { data: rep } = await supabase
      .from('sa_domain_reputation')
      .select('*')
      .eq('domain', domain)
      .single();

    const now = new Date();
    let needsExternalCheck = false;

    if (!rep) {
      // Create skeleton record
      const { data: newRep, error } = await supabase
        .from('sa_domain_reputation')
        .insert({ domain, status: 'active' })
        .select()
        .single();
      
      if (error && error.code !== '23505') {
        throw error;
      }
      rep = newRep || await supabase.from('sa_domain_reputation').select('*').eq('domain', domain).single().then(r => r.data);
      needsExternalCheck = true;
    } else {
      // Check staleness (older than 7 days)
      if (!rep.external_checked_at) {
         needsExternalCheck = true;
      } else {
         const daysSinceCheck = (now.getTime() - new Date(rep.external_checked_at).getTime()) / (1000 * 60 * 60 * 24);
         if (daysSinceCheck > 7) {
             needsExternalCheck = true;
         }
      }
    }

    // 2. Calculate Decayed Score (Finding 5)
    let dynamicScore = rep.total_score;
    if (rep.last_activity_at && dynamicScore > 0) {
       const daysSinceActivity = (now.getTime() - new Date(rep.last_activity_at).getTime()) / (1000 * 60 * 60 * 24);
       if (daysSinceActivity > 180) {
           dynamicScore = Math.floor(dynamicScore * 0.25);
       } else if (daysSinceActivity > 90) {
           dynamicScore = Math.floor(dynamicScore * 0.5);
       }
    }

    // 3. External Checks (Background/Parallel)
    if (needsExternalCheck) {
       let externalFlagged = rep.external_flagged;
       let externalSource = rep.external_source;

       // If not currently flagged, check external
       if (!externalFlagged) {
           // Scam Archive is just an example API. Usually you'd check GSB Server-to-Server here.
           // To keep this performant, we'll mock the external check delay.
           const scamArchiveRes = await checkScamArchive(domain!);
           if (scamArchiveRes.flagged) {
               externalFlagged = true;
               externalSource = 'scamarchive';
           }
       }

       // Update DB synchronously so we don't drop the promise in the Deno isolate
       const { error } = await supabase.from('sa_domain_reputation').update({
           external_checked_at: now.toISOString(),
           external_flagged: externalFlagged,
           external_source: externalSource
       }).eq('id', rep.id);
       
       if (error) console.error("Error updating external check", error);

       rep.external_flagged = externalFlagged;
       rep.external_source = externalSource;
    }

    const payload = {
        domain,
        score: dynamicScore,
        distinct_reporters: rep.distinct_reporters,
        external_flagged: rep.external_flagged,
        external_source: rep.external_source,
        status: rep.status,
        ai_modifier: rep.ai_modifier
    };

    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("sa-check-domain error:", err);
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } finally {
    activeRequests--;
  }
});

async function checkScamArchive(domain: string) {
    // Placeholder for actual external API calls (URLhaus, Scam Archive, GSB)
    // To ensure fast MV3 response times, these should be parallelized or batched.
    return { flagged: false };
}
