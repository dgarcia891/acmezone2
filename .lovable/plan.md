

## Auto-Assign Refined Designs to Matching Color Variants on Printify

### What This Does
When sending a product to Printify, instead of using a single image for all color variants, the system will automatically assign color-refined designs to their matching variants. For example, a design refined for black backgrounds gets applied to Black/Dark variant SKUs, while the original design applies to White/Light variants.

### Changes

**`supabase/functions/pod-send-to-printify/index.ts`**
- Query `az_pod_design_versions` for any color-refined versions linked to the idea
- Build a color-to-image mapping (e.g., `{ "black": "refined_url", "default": "original_url" }`)
- When constructing `print_areas`, group variants by color and assign the matching image URL
- Fall back to the original design for any color without a refinement

**`src/components/pod/WizardListingsStep.tsx`**
- In the Finalize step, show a visual indicator next to color variants that have a refined image assigned (e.g., small wand badge)
- Allow toggling per-color: use refined vs. original before submission

**`src/hooks/usePodPipeline.ts`**
- Add a query to fetch approved design versions for an idea, keyed by color
- Expose this data to the Finalize step UI

### How Printify Receives It
```text
print_areas: [
  {
    variant_ids: [101, 102],  // White, Light Gray
    placeholders: [{ position: "front", images: [{ id: "original_img_id" }] }]
  },
  {
    variant_ids: [201, 202],  // Black, Dark Gray  
    placeholders: [{ position: "front", images: [{ id: "refined_img_id" }] }]
  }
]
```

### Prerequisites
- The color refinement feature must store the target `bg_hex`/`color_name` alongside the refined image in `az_pod_design_versions` (already done)
- Printify variant color names need fuzzy matching to our refinement color names (e.g., "Black" ↔ "#000000")

