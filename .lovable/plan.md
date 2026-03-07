

# Plan: Per-Design Reject Throughout the Pipeline

## Current State
- **Step 3 (Generate)**: Has a single "Reject" button that kills the **entire idea** (sets status to `rejected`). No way to drop just one design type.
- **Step 4 (Remove BG)**: Same — single "Reject" kills the whole idea.
- **Step 5 (Listings)**: No reject at all, only "Back" and "Approve".
- **Summary**: No reject either.

The user wants to be able to **drop one design type** (e.g. reject the sticker but keep the t-shirt) at any point, and also reject the entire idea throughout.

## Changes

### 1. `DesignGeneration.tsx` — Add per-design reject buttons
- Add an "X Remove" / "Drop this design" button on each `DesignCard` (only visible when `productType === "both"` and the design exists).
- Clicking it clears that design type from the idea state (nulls the URL fields) and narrows `productType` to the remaining type.
- Keep the existing full "Reject Idea" button at the bottom.

### 2. `BackgroundRemovalStep.tsx` — Add per-design reject
- Same pattern: each design comparison section gets a "Drop" button when both types are present.
- Full "Reject Idea" button stays.

### 3. `WizardListingsStep.tsx` — Add reject capability
- Add a "Reject Idea" button in the footer alongside "Back".
- Add ability to remove individual listing types if both exist.

### 4. `PodPipeline.tsx` — Add `handleDropDesign` handler
- New function `handleDropDesign(type: "sticker" | "tshirt")`:
  - Updates the idea in DB: nulls the dropped type's URL fields, changes `product_type` to the remaining type.
  - Updates local `wizardIdea` and `productType` state accordingly.
  - If dropping means NO designs remain, treat as full reject.
- Pass this handler down to DesignGeneration, BackgroundRemovalStep, and WizardListingsStep.

### 5. Edge function or direct DB update
- Use a direct Supabase update (no new edge function needed) to null out the dropped design fields and update `product_type`.

### 6. Hook: `useDropDesign` in `usePodPipeline.ts`
- New mutation that updates `az_pod_ideas` to null the relevant design fields and set `product_type` to the remaining type.

## Files to change
1. `src/hooks/usePodPipeline.ts` — add `useDropDesign` mutation
2. `src/pages/PodPipeline.tsx` — add `handleDropDesign`, pass to child components
3. `src/components/pod/DesignGeneration.tsx` — per-design "Drop" button on each card
4. `src/components/pod/BackgroundRemovalStep.tsx` — per-design "Drop" button + keep full reject
5. `src/components/pod/WizardListingsStep.tsx` — add "Reject Idea" button

