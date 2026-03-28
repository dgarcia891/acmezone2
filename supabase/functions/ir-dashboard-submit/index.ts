import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const payload = await req.json();
    const { submitterId, analysisType, videoId, videoUrl, videoTitle, thumbnailUrl, ...rest } = payload;

    if (!submitterId || !analysisType || !videoId) {
      return new Response(JSON.stringify({ success: false, error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Verify active subscription
    const { data: subData, error: subError } = await supabase
      .from('dashboard_subscriptions')
      .select('status')
      .eq('submitter_id', submitterId)
      .maybeSingle();

    if (subError || subData?.status !== 'active') {
      return new Response(JSON.stringify({ success: false, error: "Active subscription required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 2. Insert analysis
    const { error: insertError } = await supabase
      .from('ir_video_analyses')
      .insert({
        submitter_id: submitterId,
        analysis_type: analysisType,
        video_id: videoId,
        video_url: videoUrl || null,
        video_title: videoTitle || 'Untitled Video',
        thumbnail_url: thumbnailUrl || null,
        ai_results: payload
      });

    if (insertError) throw insertError;

    // Return the URL where they can view their dashboard
    return new Response(JSON.stringify({ 
      success: true, 
      post_url: "https://acme.zone/insightreel/dashboard" 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error: unknown) {
    console.error("Dashboard submit error:", error);
    return new Response(JSON.stringify({ success: false, error: (error as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
