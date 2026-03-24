import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { submitterId } = await req.json();
    if (!submitterId) {
      return new Response(JSON.stringify({ error: "Missing submitterId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Pre-generate a totally unique License Code
    const licenseCode = 'IR-DASH-' + crypto.randomUUID().split('-')[0].toUpperCase() + crypto.randomUUID().split('-')[1].toUpperCase();

    // 2. Insert into DB as 'pending' (or update if they already exist but inactive)
    const { error: dbError } = await supabase
      .from('dashboard_subscriptions')
      .upsert({
        submitter_id: submitterId,
        license_code: licenseCode,
        status: 'pending',
        updated_at: new Date().toISOString()
      }, { onConflict: 'submitter_id' });

    if (dbError) throw dbError;

    // 3. Create Stripe Checkout Session
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2023-10-16',
      httpClient: Stripe.createFetchHttpClient(),
    });

    // Assume standard $4.99/mo price ID exists in env, or use a lookup.
    // For this implementation, we expect STRIPE_PRICE_ID_DASHBOARD in the environment
    const priceId = Deno.env.get('STRIPE_PRICE_ID_DASHBOARD');
    if (!priceId) throw new Error("Server misconfiguration: missing price ID");

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: `https://acme.zone/insightreel/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `https://acme.zone/insightreel/subscribe?submitterId=${submitterId}&canceled=true`,
      client_reference_id: submitterId, // Crucial for webhook matching
      metadata: { type: 'dashboard_pro' }
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    console.error("Error creating checkout:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});
