

## Investigation Summary

The Color Previews section exists in `WizardListingsStep.tsx` (lines 694-754) as a separate Card that renders the design image on colored backgrounds for each selected color variant. Its render conditions are:

```
hasTshirt && tshirtSelected && !isProduction && !isLive && variantsQuery.data && tshirtVariantIds.length > 0
```

From your screenshot, you can see the **T-Shirt Color Variants** checkboxes (Solid Black 8/8, Solid White 8/8) AND the **Select Products to Publish** section. The Color Previews card should appear **between** these two sections. Since all conditions appear to be met (variant data loaded, variants selected), the most likely issue is a **state hydration timing gap**: `tshirtVariantIds` starts as `[]` and only populates via a `useEffect` that depends on both `overrideData` and `variantsQuery.data` being loaded simultaneously. There may be a render cycle where the conditions pass for the checkboxes but `tshirtVariantIds` is still empty for the Color Previews card.

## Plan

### Fix: Merge Color Previews into the Color Variants card

Instead of keeping Color Previews as a separate Card with its own render gate, **move it inside** the T-Shirt Color Variants card (after the checkbox grid). This way it shares the exact same rendering lifecycle and eliminates the possibility of one section rendering without the other.

**File: `src/components/pod/WizardListingsStep.tsx`**

1. Remove the standalone Color Previews Card (lines 694-754)
2. Insert the color preview grid directly inside the Color Variants card content (after the checkbox grid at line 687), guarded only by `tshirtVariantIds.length > 0`
3. Add a visual separator between the checkboxes and previews

This consolidates two related sections into one, ensuring previews always appear when variant checkboxes do. No new files, no database changes.

