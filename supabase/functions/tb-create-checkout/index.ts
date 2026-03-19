import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno"

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') || '', {
  apiVersion: '2023-10-16',
  httpClient: Stripe.createFetchHttpClient(),
})

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: { 
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type',
      } 
    })
  }

  try {
    const { email, successUrl, cancelUrl } = await req.json()
    console.log(`Creating checkout session for: ${email}`)

    const priceId = Deno.env.get('TB_STRIPE_PRICE_ID')
    if (!priceId) {
      throw new Error("TB_STRIPE_PRICE_ID is not set in Supabase secrets")
    }

    const session = await stripe.checkout.sessions.create({
      customer_email: email,
      payment_method_types: ['card'],
      line_items: [{
        price: priceId,
        quantity: 1,
      }],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
    })

    console.log(`Session created: ${session.id}`)

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*' 
      },
    })
  } catch (err) {
    console.error("STRIPE ERROR:", err.message)
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { 
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*'
      },
    })
  }
})
