

# Plan: Show Per-Marketplace Listing Preview

## Problem
Currently the Listings step shows one card per product type (sticker/t-shirt) with Etsy and eBay title fields side by side. But the user can't see at a glance what each configured shop will actually receive — especially since the title, and potentially description, differ per marketplace.

## Approach
Add a **"Marketplace Preview"** section below each `ListingEditor` card that renders a read-only preview card for each configured shop, showing the exact title that shop will receive (applying the marketplace-specific title and character limit rules). This keeps the current editing UX intact while adding visibility into what each store gets.

## Changes

### 1. `WizardListingsStep.tsx`
- Pass the list of configured shops (primary + additional) down to each `ListingEditor`
- Group by product type, then show per-shop preview beneath each editor

### 2. `ListingEditor.tsx`
- Accept a new `shops` prop (array of `{ shop_id, marketplace, label }`)
- Add a collapsible "Marketplace Preview" section at the bottom of each listing card
- For each shop, display a compact read-only row showing:
  - Shop label + marketplace badge
  - The resolved title that shop will receive (ebay_title for eBay, etsy_title for Etsy, standard title for others)
  - Character count with limit indicator
- This gives immediate visual feedback: "eBay Shop → 78/80 chars ✓" vs "Etsy Shop → 137/140 chars ✓"

## Files Changed

| File | Change |
|---|---|
| `src/components/pod/WizardListingsStep.tsx` | Pass shops array to ListingEditor |
| `src/components/pod/ListingEditor.tsx` | Add marketplace preview section showing resolved titles per shop |

