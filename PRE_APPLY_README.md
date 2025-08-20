# Pre-Apply AI Backend - Setup Guide

## Overview
Complete Supabase-based backend for Pre-Apply job risk analysis service with credit system, AI analysis, caching, and Stripe integration.

## Features
- **Credit Management**: Ledger-based credit system with purchase and usage tracking
- **AI Analysis**: Authenticated endpoint with caching and cost optimization  
- **Stripe Integration**: Webhook-based credit purchases with 4 pricing tiers
- **Security**: Row-Level Security (RLS) with proper user isolation
- **Caching**: Duplicate analysis prevention to save costs
- **Audit Trail**: Complete usage and payment logging

## Database Schema
All tables use `pa_` prefix to avoid conflicts:
- `pa_profiles`: User profiles with auto-creation on signup
- `pa_credits`: Credit ledger (purchases/usage)
- `pa_usage_logs`: API usage auditing  
- `pa_analysis_cache`: Analysis result caching
- `pa_stripe_events`: Stripe webhook event storage

## API Endpoints

### POST /functions/v1/analyze
Authenticated AI analysis endpoint.

**Headers:**
```
Authorization: Bearer <supabase_jwt>
Content-Type: application/json
```

**Request:**
```json
{
  "company": "Acme Inc",
  "jobTitle": "Senior AE", 
  "context": "Job description text...",
  "provider": "auto"
}
```

**Responses:**
- `200`: `{"ok": true, "cached": false, "text": "Analysis result..."}`
- `401`: `{"error": "UNAUTHORIZED"}`
- `402`: `{"error": "INSUFFICIENT_CREDITS", "required": 100, "balance": 20}`
- `502`: `{"error": "PROVIDER_ERROR"}`

### POST /functions/v1/stripe-webhook
Stripe webhook handler for credit purchases.

## Setup Instructions

### 1. Database Migration
Paste this SQL into Supabase SQL Editor:

```sql
-- All the database schema from the migration (pa_ tables, RLS policies, functions)
-- This was already executed via the migration tool
```

### 2. Configure Environment Variables
Set these for **both** functions in Supabase Dashboard → Functions → Environment Variables:

**Core Variables:**
```
SUPABASE_URL=https://rnlgjpnvtqsbwjkbflvp.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<your_service_role_key>
```

**Analysis Function:**
```
ANALYZE_PROVIDER=openai
COST_PER_CALL=100
OPENAI_API_KEY=<your_openai_key>
GEMINI_API_KEY=<optional_gemini_key>
```

**Stripe Webhook:**
```
STRIPE_SECRET_KEY=<your_stripe_secret>
STRIPE_WEBHOOK_SECRET=<your_webhook_secret>
STRIPE_PRICE_TO_CREDITS={"price_1234":1000,"price_5678":5000,"price_9012":15000,"price_3456":50000}
```

### 3. Stripe Setup

#### Create Products & Prices:
1. **Starter**: $10 → 1,000 credits (`price_starter`)
2. **Pro**: $40 → 5,000 credits (`price_pro`) 
3. **Power User**: $99 → 15,000 credits (`price_power`)
4. **Enterprise**: $299 → 50,000 credits (`price_enterprise`)

#### Configure Webhook:
1. Create webhook endpoint: `https://rnlgjpnvtqsbwjkbflvp.supabase.co/functions/v1/stripe-webhook`
2. Enable event: `checkout.session.completed`
3. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

#### Update Price Mapping:
Replace the price IDs in `STRIPE_PRICE_TO_CREDITS` with your actual Stripe price IDs.

### 4. Frontend Integration

#### Create Checkout Session:
```javascript
// Include user ID as client_reference_id
const session = await stripe.checkout.sessions.create({
  client_reference_id: user.id, // Supabase user ID
  line_items: [{ price: 'price_starter', quantity: 1 }],
  mode: 'payment',
  success_url: 'https://yourapp.com/success',
  cancel_url: 'https://yourapp.com/cancel'
});
```

#### Call Analysis API:
```javascript
const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${session.access_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    company: 'Acme Inc',
    jobTitle: 'Senior Developer',
    context: 'Job description...',
    provider: 'auto'
  })
});
```

## Testing

### 1. Insert Test Credits:
```sql
INSERT INTO pa_credits (user_id, delta, reason) 
VALUES ('<user_uuid>', 1000, 'test_credits');
```

### 2. Test Analysis Endpoint:
```bash
curl -X POST "https://rnlgjpnvtqsbwjkbflvp.supabase.co/functions/v1/analyze" \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "company": "Test Company",
    "jobTitle": "Test Role", 
    "context": "Test job description",
    "provider": "openai"
  }'
```

### 3. Test Stripe Webhook:
```bash
# Use Stripe CLI
stripe listen --forward-to https://rnlgjpnvtqsbwjkbflvp.supabase.co/functions/v1/stripe-webhook
stripe trigger checkout.session.completed
```

### 4. Verify Results:
- Check `pa_credits` table for credit deduction/addition
- Check `pa_usage_logs` for API usage tracking
- Check `pa_analysis_cache` for cached results
- Verify repeat requests return `cached: true`

## Security Features

- **RLS Enabled**: All tables have Row-Level Security
- **User Isolation**: Users can only access their own data
- **Service Role Writes**: Functions use service role to bypass RLS for system operations
- **JWT Verification**: All API calls require valid Supabase JWT
- **Webhook Verification**: Stripe webhooks verified with signature
- **API Key Protection**: Provider keys never exposed to clients

## Cost Optimization

- **Smart Caching**: Identical analyses cached to prevent re-billing
- **Configurable Costs**: `COST_PER_CALL` environment variable
- **Usage Tracking**: Complete audit trail for cost analysis
- **Provider Flexibility**: Support for multiple AI providers

## Pricing Structure

| Package | Credits | Price | Per Analysis | Discount |
|---------|---------|-------|--------------|----------|
| Starter | 1,000 | $10 | $1.00 | - |
| Pro | 5,000 | $40 | $0.80 | 20% |
| Power User | 15,000 | $99 | $0.66 | 34% |
| Enterprise | 50,000 | $299 | $0.60 | 40% |

## Support & Troubleshooting

### Common Issues:

1. **"INSUFFICIENT_CREDITS"**: User needs to purchase more credits
2. **"PROVIDER_ERROR"**: Check AI provider API keys and quotas  
3. **"UNAUTHORIZED"**: Verify JWT token is valid and not expired
4. **Webhook failures**: Check Stripe webhook secret and endpoint URL

### Debugging:
- Check Supabase Functions logs for detailed error messages
- Verify all environment variables are set correctly
- Test with Stripe CLI for webhook debugging
- Use `pa_usage_logs` table to track API usage patterns

### Rate Limiting:
Consider adding rate limiting in the `analyze` function:
```typescript
// Example: 1 call per 10 seconds per user
const rateLimitKey = `rate_limit:${user.id}`;
// Implement Redis or similar caching mechanism
```

## Next Steps

1. **Frontend Integration**: Build UI for credit management and analysis requests
2. **Monitoring**: Set up alerts for low credit balances and API errors  
3. **Analytics**: Dashboard for usage patterns and revenue tracking
4. **Scaling**: Consider adding request queuing for high volume
5. **Features**: Add analysis history, export capabilities, team sharing

This backend is production-ready and supports the complete Pre-Apply AI service workflow.