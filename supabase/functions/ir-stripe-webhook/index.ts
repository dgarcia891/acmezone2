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

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const userId = session.client_reference_id;

    if (!userId) {
      console.error("No client_reference_id in checkout session");
      return new Response("Missing user id", { status: 400 });
    }

    if (session.metadata?.type === 'dashboard_pro') {
      // Dashboard Subscription (No Supabase Auth)
      const { error } = await supabase
        .from("dashboard_subscriptions")
        .update({ 
          status: 'active',
          stripe_customer_id: session.customer as string,
          stripe_subscription_id: session.subscription as string
        })
        .eq("submitter_id", userId);

      if (error) {
        console.error("Failed to activate dashboard subscription:", error);
        return new Response("DB error", { status: 500 });
      }
      console.log(`Submitter ${userId} activated dashboard Pro`);
    } else if (session.mode === "subscription") {
      // Managed Pro subscription
      const { error } = await supabase
        .from("az_profiles")
        .update({ is_pro: true })
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to update profile (Pro):", error);
        return new Response("DB error", { status: 500 });
      }
      console.log(`User ${userId} upgraded to Pro`);
    } else if (session.mode === "payment") {
      // BYOK Lifetime License one-time payment
      const { error } = await supabase
        .from("az_profiles")
        .update({ has_byok_license: true })
        .eq("user_id", userId);

      if (error) {
        console.error("Failed to update profile (BYOK):", error);
        return new Response("DB error", { status: 500 });
      }
      console.log(`User ${userId} granted BYOK lifetime license`);
    }
  }

  if (event.type === "customer.subscription.deleted") {
    const subscription = event.data.object as Stripe.Subscription;
    
    // Stripe subscriptions don't always carry the original session metadata easily in the deleted event.
    // So we search BOTH our tables by stripe_customer_id to downgrade whatever they had.
    const customerId = subscription.customer as string;

    // 1. Check if it was a Dashboard subscription
    const { data: dashSub } = await supabase
      .from("dashboard_subscriptions")
      .select("submitter_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    if (dashSub) {
      await supabase
        .from("dashboard_subscriptions")
        .update({ status: 'inactive' })
        .eq("submitter_id", dashSub.submitter_id);
      console.log(`Dashboard subscription for ${dashSub.submitter_id} deactivated`);
    }

    // 2. Fallback to normal Pro subscription logic
    const sessions = await stripe.checkout.sessions.list({
      customer: customerId,
      limit: 1,
    });
    const userId = sessions.data[0]?.client_reference_id;

    if (userId && !dashSub) {
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
