import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import { encode } from "https://deno.land/std@0.168.0/encoding/hex.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-sa-api-key",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

// Rate limiting
let activeRequests = 0;
const MAX_CONCURRENT = 50;

async function computeSaltedHash(email: string, salt: string): Promise<string> {
  const text = email.toLowerCase().trim() + salt;
  const data = new TextEncoder().encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return new TextDecoder().decode(encode(new Uint8Array(hashBuffer)));
}

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

    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return new Response(JSON.stringify({ error: "INVALID_BODY", message: "email is required" }), { status: 400, headers: corsHeaders });
    }

    const hashSalt = Deno.env.get("HASH_SALT") || "default_dev_salt_change_me_in_prod";
    const emailHash = await computeSaltedHash(email, hashSalt);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch from DB cache
    let { data: rep } = await supabase
      .from('sa_email_reputation')
      .select('reputation_score, is_disposable, last_checked_at, id')
      .eq('email_hash', emailHash)
      .single();

    const now = new Date();
    let needsExternalCheck = false;

    if (!rep) {
      // Create skeleton record
      const { data: newRep, error } = await supabase
        .from('sa_email_reputation')
        .insert({ email_hash: emailHash, reputation_score: 'none' })
        .select('reputation_score, is_disposable, last_checked_at, id')
        .single();
      
      if (error && error.code !== '23505') {
        throw error;
      }
      rep = newRep || await supabase.from('sa_email_reputation').select('reputation_score, is_disposable, last_checked_at, id').eq('email_hash', emailHash).single().then(r => r.data);
      needsExternalCheck = true;
    } else {
      // Check staleness (older than 7 days)
      if (!rep.last_checked_at) {
         needsExternalCheck = true;
      } else {
         const daysSinceCheck = (now.getTime() - new Date(rep.last_checked_at).getTime()) / (1000 * 60 * 60 * 24);
         if (daysSinceCheck > 7) {
             needsExternalCheck = true;
         }
      }
    }

    // 2. External Check (EmailRep.io or Mock)
    if (needsExternalCheck) {
        // MOCK API REQUEST for V1
        // In reality, this would be: fetch(`https://emailrep.io/${email}`)
        // and would parse things like rep.details.disposable and rep.reputation
        
        let newScore = 'none';
        let isDisposable = false;

        // Mock test cases based on domain
        if (email.endsWith('@dispostable.com') || email.endsWith('@guerrillamail.com')) {
           isDisposable = true;
           newScore = 'low';
        } else if (email.endsWith('@scam.com')) {
           newScore = 'low';
        } else {
           newScore = 'high';
        }

        const { error } = await supabase.from('sa_email_reputation').update({
            reputation_score: newScore,
            is_disposable: isDisposable,
            last_checked_at: now.toISOString()
        }).eq('id', rep.id);
        
        if (error) console.error("Error updating email reputation cache", error);

        rep.reputation_score = newScore;
        rep.is_disposable = isDisposable;
    }

    const payload = {
        reputation_score: rep.reputation_score,
        is_disposable: rep.is_disposable
    };

    return new Response(JSON.stringify(payload), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("sa-check-email-rep error:", err);
    return new Response(JSON.stringify({ error: "SERVER_ERROR", message: String(err) }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  } finally {
    activeRequests--;
  }
});
