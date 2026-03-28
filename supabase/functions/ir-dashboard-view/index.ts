import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Simple in-memory rate limiting (max 10 requests per minute per IP)
const rateLimits = new Map<string, { count: number, resetAt: number }>();

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const clientIp = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const now = Date.now();
    
    let limitData = rateLimits.get(clientIp);
    if (!limitData || limitData.resetAt < now) {
      limitData = { count: 0, resetAt: now + 60000 };
    }
    
    limitData.count++;
    rateLimits.set(clientIp, limitData);

    if (limitData.count > 10) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded. Try again in a minute." }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json", "Retry-After": "60" }
      });
    }

    const url = new URL(req.url);
    const licenseCode = url.searchParams.get("licenseCode");

    if (!licenseCode) {
      return new Response(JSON.stringify({ error: "Missing licenseCode parameter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Verify license code and get submitterId
    const { data: subData, error: subError } = await supabase
      .from('dashboard_subscriptions')
      .select('submitter_id, status')
      .eq('license_code', licenseCode)
      .maybeSingle();

    if (subError || !subData) {
      return new Response(JSON.stringify({ error: "Invalid license code" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    if (subData.status !== 'active') {
       return new Response(JSON.stringify({ error: "Subscription is inactive or pending" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Fetch all video analyses for this user
    const { data: videos, error: videosError } = await supabase
      .from('ir_video_analyses')
      .select('*')
      .eq('submitter_id', subData.submitter_id)
      .order('created_at', { ascending: false });

    if (videosError) throw videosError;

    return new Response(JSON.stringify({ success: true, videos }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Dashboard view error:", error);
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
