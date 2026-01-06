import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get IP from headers (Cloudflare/proxy) or connection
    const ip = req.headers.get('cf-connecting-ip') || 
               req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
               req.headers.get('x-real-ip') ||
               'unknown';

    // For GET requests (used to get current IP)
    if (req.method === 'GET') {
      return new Response(JSON.stringify({ ip }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { path, referrer, userAgent } = await req.json();

    if (!path) {
      return new Response(JSON.stringify({ error: 'Path is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Check if IP is excluded
    const { data: excludedIp } = await supabase
      .from('AZ_excluded_ips')
      .select('id')
      .eq('ip_address', ip)
      .single();

    if (excludedIp) {
      console.log(`Skipping page view for excluded IP: ${ip}`);
      return new Response(JSON.stringify({ success: true, excluded: true }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Insert page view
    const { error } = await supabase
      .from('AZ_page_views')
      .insert({
        path,
        ip_address: ip,
        user_agent: userAgent || req.headers.get('user-agent'),
        referrer: referrer || req.headers.get('referer'),
      });

    if (error) {
      console.error('Error inserting page view:', error);
      throw error;
    }

    console.log(`Page view tracked: ${path} from ${ip}`);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    console.error('Error tracking page view:', error);
    const message = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
