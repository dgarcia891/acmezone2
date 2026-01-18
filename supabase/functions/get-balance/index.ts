import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const auth = req.headers.get('Authorization') || '';
    
    if (!auth || !auth.startsWith('Bearer ')) {
      return new Response(
        JSON.stringify({ error: 'UNAUTHORIZED' }), 
        { 
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    // Call the RPC function to get user's credit balance
    const resp = await fetch(`${Deno.env.get('SUPABASE_URL')}/rest/v1/rpc/az_get_my_balance`, {
      method: 'POST',
      headers: {
        'Authorization': auth,
        'apikey': Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({})
    });

    if (!resp.ok) {
      console.error('Failed to fetch balance:', resp.status, await resp.text());
      return new Response(
        JSON.stringify({ error: 'SERVER_ERROR' }), 
        { 
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    }

    const balance = await resp.json();
    
    return new Response(
      JSON.stringify({ ok: true, balance }), 
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error('Error in get-balance function:', error);
    return new Response(
      JSON.stringify({ error: 'SERVER_ERROR' }), 
      { 
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
});