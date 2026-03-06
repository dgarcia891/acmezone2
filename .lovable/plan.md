

# Plan: Product Type Selection Before Publishing + Store-Aware Listings View

## Changes

### 1. Summary Step (`WizardSummaryStep.tsx`)
- Add checkboxes next to each design (sticker/t-shirt) so the user can deselect one before hitting "Send to Printify"
- Pass the selected `product_types` array (e.g. `["sticker"]` or `["sticker", "tshirt"]`) to the `sendToPrintify` mutation
- Disable the Send button if nothing is selected

### 2. Send-to-Printify Edge Function (`pod-send-to-printify/index.ts`)
- Accept optional `product_types` string array in the request body
- Filter approved listings to only include the selected product types (if provided)
- If not provided, publish all approved listings (backward compatible)

### 3. Listings Step (`WizardListingsStep.tsx`)
- Fetch configured additional shops from the database via a new query
- Show a "Publishing To" section at the top listing the primary shop + all active additional shops with marketplace badges
- Each listing editor card already shows the product type badge — no change needed there

### 4. `usePodListings.ts` — Update `useSendToPrintify`
- Accept `{ idea_id, product_types? }` instead of just `idea_id`

### 5. `usePodPipeline.ts` — Add `useAdditionalShops` query
- Query `az_pod_printify_shops` for the current user to display in the listings step

## Files Changed

| File | Change |
|---|---|
| `src/components/pod/WizardSummaryStep.tsx` | Add product type checkboxes before Send to Printify |
| `src/components/pod/WizardListingsStep.tsx` | Show configured stores section |
| `src/hooks/usePodListings.ts` | Update `useSendToPrintify` to accept `product_types` |
| `src/hooks/usePodPipeline.ts` | Add `useAdditionalShops` query hook |
| `supabase/functions/pod-send-to-printify/index.ts` | Filter listings by `product_types` if provided |

