

# Plan: Display Printify Response Data and Improve "View in Printify" Button

## What Changes

### 1. Edge Function — Capture more data from Printify response (`pod-send-to-printify/index.ts`)
The Printify `POST /products` response returns `images` (mockup URLs), `variants` (with pricing/sizes), and `tags`. Currently we only extract `product.id`. We will also capture:
- `images` array (mockup image URLs)
- `variants` count and enabled count
- Product title as confirmed by Printify

Include this extra data in the response back to the client alongside the existing `printify_product_id` and `printify_url`.

### 2. Hook — Pass mutation response data through (`usePodListings.ts`)
Update `useSendToPrintify` so the `onSuccess` callback in the component receives the full response data (it already returns `data`, but the component's `onSuccess` currently ignores it). No change needed in the hook itself — the component just needs to use it.

### 3. Summary Step UI — Display response and prominent button (`WizardSummaryStep.tsx`)
- **Store mutation response** in local state after "Send to Printify" succeeds
- **Display Printify response card** showing:
  - Product type and Printify product ID
  - Number of variants created
  - Mockup images returned by Printify (displayed in a grid)
  - Product title as confirmed
- **Move "View in Printify" button** to top-right of the card header as a prominent `Button` (not a subtle text link), styled with the `outline` variant and an `ExternalLink` icon
- Remove the old small "View on Printify" text link from the links section

## Files Changed

| File | Change |
|------|--------|
| `supabase/functions/pod-send-to-printify/index.ts` | Extract `images`, `variants` count, and `title` from Printify product response; include in results array |
| `src/components/pod/WizardSummaryStep.tsx` | Add local state for Printify response; render response card with mockup images and product details; move "View in Printify" to a prominent button in the card header |

