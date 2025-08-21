import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";
import Stripe from "https://esm.sh/stripe@14.21.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Helper logging function
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    // Get environment variables
    const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeSecretKey || !webhookSecret) {
      logStep("Missing environment variables");
      return new Response(JSON.stringify({ error: "Configuration error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Initialize Stripe
    const stripe = new Stripe(stripeSecretKey, { apiVersion: "2023-10-16" });

    // Initialize Supabase client with service role
    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get raw body and signature
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("Missing Stripe signature");
      return new Response(JSON.stringify({ error: "Missing signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Verify webhook signature
    let event;
    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
      logStep("Webhook signature verified", { eventType: event.type, eventId: event.id });
    } catch (error) {
      logStep("Webhook signature verification failed", { error: error.message });
      return new Response(JSON.stringify({ error: "Invalid signature" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Check if we've already processed this event (idempotency)
    const { data: existingEvent } = await supabaseService
      .from("az_stripe_events")
      .select("id")
      .eq("id", event.id)
      .single();

    if (existingEvent) {
      logStep("Event already processed", { eventId: event.id });
      return new Response(JSON.stringify({ ok: true, message: "Event already processed" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // Store the event for audit/idempotency
    await supabaseService.from("az_stripe_events").insert({
      id: event.id,
      type: event.type,
      payload: event,
      created_at: new Date().toISOString()
    });

    // Handle checkout.session.completed event
    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      logStep("Processing checkout session", { sessionId: session.id });

      // Get user ID from client_reference_id
      const userId = session.client_reference_id;
      if (!userId) {
        logStep("No client_reference_id found in session");
        return new Response(JSON.stringify({ error: "No user ID in session" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      // Get credit information from session metadata
      const credits = session.metadata?.credits;
      const packageId = session.metadata?.packageId;

      if (!credits || !packageId) {
        logStep("Missing credit information in session metadata", { 
          metadata: session.metadata 
        });
        return new Response(JSON.stringify({ error: "Missing credit information" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      const creditsAmount = parseInt(credits);
      if (isNaN(creditsAmount) || creditsAmount <= 0) {
        logStep("Invalid credits amount", { credits });
        return new Response(JSON.stringify({ error: "Invalid credits amount" }), {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        });
      }

      logStep("Adding credits from metadata", { 
        userId, 
        creditsAmount, 
        packageId,
        sessionId: session.id 
      });

      // Add credits to user account
      await supabaseService.from("az_credits").insert({
        user_id: userId,
        delta: creditsAmount,
        reason: `stripe_purchase:${packageId}`,
        created_at: new Date().toISOString()
      });

      logStep("Checkout session processed successfully");
    } else {
      logStep("Event type not handled", { eventType: event.type });
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in stripe-webhook", { message: errorMessage });
    
    return new Response(JSON.stringify({ error: "Server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }
});