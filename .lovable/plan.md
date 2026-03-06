

# Plan: Marketplace-Aware Printify Shop Configuration

## Concept

Instead of generic "Shop ID 2", create a system where each additional Printify shop is tagged with its marketplace destination (eBay, Etsy, Shopify, etc.). The backend automatically applies the correct title rules per marketplace when posting.

## Marketplace Title Rules (from research)

| Marketplace | Title Limit | Notes |
|---|---|---|
| Printify (default) | 140 chars | Standard Printify limit |
| eBay | 80 chars | Rejected at 81+; use `ebay_title` field |
| Etsy | 140 chars | First 40-50 chars most important; use `etsy_title` field |
| Shopify | No hard limit | Standard title works |

## Changes

### 1. Database: New `az_pod_printify_shops` table

Instead of adding columns to `az_pod_settings`, create a proper table that supports N shops:

```sql
CREATE TABLE az_pod_printify_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id text NOT NULL,
  marketplace text NOT NULL DEFAULT 'default',  -- 'default', 'ebay', 'etsy', 'shopify'
  label text,  -- optional friendly name
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
```

RLS: admin-only via `has_role()`. The existing `printify_shop_id` in `az_pod_settings` becomes the primary/default shop (backward compatible).

### 2. Settings Form (`PodSettingsForm.tsx`)

- Keep existing "Printify Shop ID" as the primary/default shop
- Add an "Additional Shops" section below it with:
  - A list of configured shops showing Shop ID, marketplace badge, and delete button
  - An "Add Shop" row with: Shop ID input, marketplace dropdown (eBay, Etsy, Shopify, Other), and Add button
- Marketplace dropdown options include helper text about title rules

### 3. Settings Edge Function (`pod-settings/index.ts`)

- GET: Also fetch from `az_pod_printify_shops` and return the list of additional shops
- POST: Accept `additional_shops` array for add/remove operations

### 4. Send-to-Printify Edge Function (`pod-send-to-printify/index.ts`)

- Fetch all active shops from `az_pod_printify_shops` for the user
- For each listing, loop through primary shop + all additional shops:
  - **eBay**: Use `listing.ebay_title` truncated to 80 chars
  - **Etsy**: Use `listing.etsy_title` truncated to 140 chars
  - **Shopify / default**: Use standard `listing.title` (140 chars)
- Tag each result with `shop` label and `marketplace` type
- Return grouped results

### 5. Listing Editor (`ListingEditor.tsx`)

- Add character counters on marketplace-specific title fields:
  - eBay Title: `X/80` with red warning when over
  - Etsy Title: `X/140` with red warning when over

### 6. Summary Step (`WizardSummaryStep.tsx`)

- Group Printify results by marketplace (e.g., "Primary Shop", "eBay Shop", "Etsy Shop")
- Show separate "View in Printify" buttons per product

## Files Changed

| File | Change |
|---|---|
| Database | Create `az_pod_printify_shops` table with RLS |
| `supabase/functions/pod-settings/index.ts` | CRUD for additional shops |
| `supabase/functions/pod-send-to-printify/index.ts` | Loop all shops, apply marketplace-specific title rules |
| `src/components/pod/PodSettingsForm.tsx` | Add "Additional Shops" section with marketplace selector |
| `src/components/pod/ListingEditor.tsx` | Character counters on eBay (80) and Etsy (140) title fields |
| `src/components/pod/WizardSummaryStep.tsx` | Group results by marketplace |

