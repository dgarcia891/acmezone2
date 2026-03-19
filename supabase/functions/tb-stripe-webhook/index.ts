import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, stripe-signature, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
  apiVersion: "2023-10-16",
  httpClient: Stripe.createFetchHttpClient(),
});

const supabase = createClient(
  Deno.env.get("SUPABASE_URL") || "",
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || ""
);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const signature = req.headers.get("stripe-signature");
  const webhookSecret =
    Deno.env.get("TB_STRIPE_WEBHOOK_SECRET") ||
    Deno.env.get("STRIPE_WEBHOOK_SECRET");

  try {
    const body = await req.text();
    const event = stripe.webhooks.constructEvent(
      body,
      signature!,
      webhookSecret!
    );

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as any;
      const email = session.customer_email;
      const customerId = session.customer;

      await supabase.from("tb_licenses").upsert(
        {
          email,
          stripe_customer_id: customerId,
          tier: "pro",
          status: "active",
          updated_at: new Date().toISOString(),
        },
        { onConflict: "email" }
      );
    }

    if (
      event.type === "customer.subscription.deleted" ||
      event.type === "customer.subscription.updated"
    ) {
      const subscription = event.data.object as any;
      const status = subscription.status;
      const customerId = subscription.customer;

      await supabase
        .from("tb_licenses")
        .update({ status, updated_at: new Date().toISOString() })
        .eq("stripe_customer_id", customerId);
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(`Webhook Error: ${err.message}`, {
      status: 400,
      headers: corsHeaders,
    });
  }
});
