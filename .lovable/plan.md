

## Add "Set as Default" Button for Margin Overrides

### Problem
Users can customize margins per-idea, but there's no way to promote these custom values as the new defaults for future ideas. They have to manually go to Settings to update defaults.

### Solution
Add a "Set as Default" button next to the "Reset" button in each shop's margin override section. When clicked:
- Saves the current **effective margins** (custom or inherited) as the new shop/global default
- Clears the idea-level override (since it's now the default)
- Updates the pricing preview to reflect the new baseline

### Implementation

**File: `src/components/pod/WizardListingsStep.tsx`**

1. Import `useSetShopMargin` and `useSavePodSettings` from `usePodPipeline`
2. Add a `setAsDefaultForShop()` function that:
   - For **primary shop**: calls `useSavePodSettings` with `tshirt_margin_pct` and `sticker_margin_pct`
   - For **additional shops**: calls `useSetShopMargin` with shop `id` (from `additionalShops`)
   - After success, clears the idea override by calling `saveOverride.mutateAsync()` with `null` values
   - Shows success toast

3. Add "Set as Default" button in the margin override card (line ~476, next to "Reset"):
   - Icon: `CheckCircle2`
   - Only enabled if at least one custom margin is set
   - Disabled during save operations
   - Text: "Set as Default"

### Technical Details

**Shop identification:**
- Primary shop: `shop.marketplace === "default"` → update global settings
- Additional shop: find in `additionalShops` by `shop_id` → get `id` field → update shop-specific defaults

**Hooks already available:**
- `useSetShopMargin()` — updates `az_pod_printify_shops.tshirt_margin_pct/sticker_margin_pct`
- `useSavePodSettings()` — updates `az_pod_settings.tshirt_margin_pct/sticker_margin_pct`
- `useSaveIdeaOverride()` — clears idea-level overrides

### User Flow

1. User customizes margins for an idea (e.g., "T-shirt 150%, Sticker 80%")
2. Clicks "Set as Default" for a shop
3. System saves these as shop/global defaults
4. Idea-level override is cleared (now using the new defaults)
5. Next idea automatically inherits these new defaults

