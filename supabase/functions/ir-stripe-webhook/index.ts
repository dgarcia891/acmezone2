import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  if (!stripeKey || !webhookSecret) {
    return new Response("Server config error", { status: 500 });
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
  const signature = req.headers.get("stripe-signature");
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (!userId) {
      console.error("No client_reference_id in checkout session");
      return new Response("Missing user id", { status: 400 });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Upgrade user to Pro
    const { error } = await supabase
      .from("az_profiles")
      .update({ is_pro: true })
      .eq("user_id", userId);

    if (error) {
      console.error("Failed to update profile:", error);
      return new Response("DB error", { status: 500 });
    }

    console.log(`User ${userId} upgraded to Pro`);
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    // Look up user by Stripe customer ID
    const stripe2 = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const sessions = await stripe2.checkout.sessions.list({
      customer: subscription.customer as string,
      limit: 1,
    });
    const userId = sessions.data[0]?.client_reference_id;

    if (userId) {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      await supabase
        .from("az_profiles")
        .update({ is_pro: false })
        .eq("user_id", userId);
      console.log(`User ${userId} downgraded from Pro`);
    }
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
