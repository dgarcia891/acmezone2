

# Hybrid Monetization Model for InsightReel

## Overview
Transform the InsightReel backend from a single "Pro-only" gate into a three-tier access system: Free Trial (3 credits), Managed Pro ($9.99/mo subscription), and BYOK Lifetime License ($29 one-time).

---

## 1. Database Migration

Add two new columns to `az_profiles`:

| Column | Type | Default | Purpose |
|--------|------|---------|---------|
| `trial_credits` | integer | 3 | Free analyses for new users |
| `has_byok_license` | boolean | false | Lifetime BYOK license flag |

Update the `handle_new_user_profile` trigger so new signups get `trial_credits = 3`.

---

## 2. Update `ir-analyze` Edge Function

Replace the current binary Pro check with a tiered authorization flow:

```text
Request arrives
  |
  +-- Read X-User-Gemini-Key header
  |
  +-- Fetch profile (is_pro, has_byok_license, trial_credits)
  |
  +-- BYOK path: header present + has_byok_license = true
  |     -> Call Gemini directly with user's key
  |
  +-- Pro path: is_pro = true
  |     -> Call Gemini via Lovable AI gateway (existing flow)
  |
  +-- Trial path: trial_credits > 0
  |     -> Call Gemini via Lovable AI gateway
  |     -> On success, decrement trial_credits by 1
  |
  +-- None of the above -> 402 PAYMENT_REQUIRED
```

Key details:
- Add `x-user-gemini-key` to the CORS `Access-Control-Allow-Headers` list
- For BYOK, call `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={userKey}` directly
- Log usage for all three paths (metadata includes `{ mode: "byok" | "pro" | "trial" }`)
- CORS remains locked to `chrome-extension://plohgpfkkhnennkgoneolbpomnhoclmk`

---

## 3. Update `ir-stripe-webhook` Edge Function

Currently handles `checkout.session.completed` (sets `is_pro = true`) and `customer.subscription.deleted` (sets `is_pro = false`).

Update the `checkout.session.completed` handler to distinguish between:
- **Subscription checkout** (`session.mode === "subscription"`) -- existing behavior, set `is_pro = true`
- **One-time payment** (`session.mode === "payment"`) -- new BYOK license, set `has_byok_license = true`

No new Stripe price ID secret is needed at this stage -- the webhook simply checks the session mode.

---

## 4. Files Changed

| File | Action |
|------|--------|
| DB migration | Add `trial_credits` and `has_byok_license` columns, update trigger |
| `supabase/functions/ir-analyze/index.ts` | Rewrite authorization logic for 3-tier access |
| `supabase/functions/ir-stripe-webhook/index.ts` | Add BYOK one-time payment handling |

---

## Technical Notes

- The `ir-get-history`, `ir-create-checkout`, and `ir-manage-subscription` functions require no changes.
- A separate Stripe Price for the $29 BYOK license will need to be created in your Stripe dashboard and passed to `ir-create-checkout` when the extension requests a BYOK purchase (future frontend work).
- Existing Pro subscribers are unaffected -- their `trial_credits` will default to 3 but won't be consumed since the Pro check runs first.

