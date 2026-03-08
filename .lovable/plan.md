

## Per-Shop Profit Margin Configuration

### Problem
Variant prices are hardcoded in the edge function (`$24.99` for t-shirts, `$4.99` for stickers). To change pricing, you have to edit products manually in Printify after creation.

### Approach
Add a **profit margin percentage** per shop (including the primary shop) that gets applied on top of Printify's base cost when creating products. The edge function will fetch each variant's production cost from Printify's catalog API and calculate the retail price as `cost + (cost × margin%)`.

### Database Changes

**`az_pod_settings`** — add column:
- `tshirt_margin_pct` integer, default 100 (meaning 100% markup = 2× cost)
- `sticker_margin_pct` integer, default 100

**`az_pod_printify_shops`** — add columns:
- `tshirt_margin_pct` integer, default null (null = inherit from primary)
- `sticker_margin_pct` integer, default null

### Edge Function: `pod-send-to-printify/index.ts`

1. After fetching variants from catalog, also fetch variant costs via Printify's `/catalog/blueprints/{id}/print_providers/{id}/variants.json` (the `cost` field on each variant, in cents).
2. For each shop, determine the margin: use the shop's override if set, otherwise fall back to the primary settings margin.
3. Calculate price per variant: `Math.round(cost + (cost * margin_pct / 100))`, with a minimum floor of `cost + 100` (at least $1 profit).
4. Remove the `DEFAULT_VARIANT_PRICE_BY_PRODUCT_TYPE` hardcoded map.

### UI: `PodSettingsForm.tsx`

1. **Primary shop section** — Add two number inputs: "T-Shirt Margin %" and "Sticker Margin %" with helper text showing example pricing (e.g., "If production cost is $12, retail = $24 at 100%").
2. **Each additional shop row** — Add a small margin override input. When blank, it inherits from primary (shown as placeholder text).

### Changes Summary

| File | Change |
|------|--------|
| Migration | Add `tshirt_margin_pct`, `sticker_margin_pct` to `az_pod_settings` and `az_pod_printify_shops` |
| `supabase/functions/pod-send-to-printify/index.ts` | Fetch margins from settings/shops, calculate dynamic prices from variant cost + margin, remove hardcoded prices |
| `supabase/functions/pod-settings/index.ts` | Include new margin fields in GET response and POST/upsert handling |
| `src/components/pod/PodSettingsForm.tsx` | Add margin % inputs for primary shop and per additional shop |

