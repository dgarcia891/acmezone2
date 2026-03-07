

# Plan: Fix Sticker Generation + Before/After in Remove BG Step

## Problem 1: Sticker design never finishes when generating "both"

**Root cause**: When generating "both", `handleGenerate` fires two separate edge function calls — one for sticker, one for tshirt. Each call updates the **same DB row** with `product_type` set to its single type. When the tshirt call finishes first, `res.idea` from `.select()` returns the full row (with `sticker_design_url: null`). The `setWizardIdea((prev) => ({ ...prev, ...res.idea }))` merge overwrites any sticker state with null. Then when the sticker call eventually finishes, it works correctly, but the race condition can cause display issues.

Additionally, `pod-generate-designs` still validates `REMOVE_BG_API_KEY` even though bg removal is now a separate step — an unnecessary blocker.

**Fix**: 
- **Edge function**: Remove the Remove.bg key check from `pod-generate-designs` (no longer needed). When called with a single type, only update that type's fields (don't set `product_type` to the single type — preserve it).
- **Client merge**: In `onSuccess`, only merge the specific design fields for the type that was generated, not the entire `res.idea` object. This prevents one call from overwriting the other's results.

## Problem 2: No before/after comparison in Remove BG step

Currently, the Remove BG step shows raw designs, then replaces them with transparent versions after removal. The URLs are overwritten in the DB, so there's no way to compare.

**Fix**:
- **Edge function (`pod-remove-bg`)**: Save raw URLs into new columns (`sticker_raw_url`, `tshirt_raw_url`) before overwriting the main design URLs with transparent versions. This requires a small migration.
- **BackgroundRemovalStep UI**: After bg removal, show a side-by-side before/after layout for each design type — raw on the left (from `*_raw_url`), transparent on the right (from `*_design_url`) with checkerboard background.

---

## Changes

### 1. Migration: Add raw URL columns
```sql
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS sticker_raw_url TEXT;
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS tshirt_raw_url TEXT;
```

### 2. `pod-generate-designs` edge function
- Remove the Remove.bg API key validation (lines 42-52)
- When `product_type` is a single type ("sticker" or "tshirt"), don't overwrite the `product_type` field in the update — only set the design-specific fields
- Also save the URL to the corresponding `*_raw_url` column so it persists after bg removal

### 3. `pod-remove-bg` edge function
- Before removing backgrounds, copy current `sticker_design_url` → `sticker_raw_url` and `tshirt_design_url` → `tshirt_raw_url` in the update payload

### 4. Client-side merge fix (`PodPipeline.tsx`)
- In `handleGenerate`'s `onSuccess`, only merge the relevant fields for the completed type instead of spreading the entire `res.idea`:
```typescript
onSuccess: (res) => {
  const idea = res.idea;
  const fields: Record<string, any> = {};
  if (type === "sticker") {
    fields.sticker_design_url = idea.sticker_design_url;
    fields.sticker_design_prompt = idea.sticker_design_prompt;
    fields.sticker_raw_url = idea.sticker_raw_url;
  } else {
    fields.tshirt_design_url = idea.tshirt_design_url;
    fields.tshirt_design_prompt = idea.tshirt_design_prompt;
    fields.tshirt_raw_url = idea.tshirt_raw_url;
  }
  fields.status = idea.status;
  setWizardIdea((prev) => ({ ...prev, ...fields }));
  // ...
}
```

### 5. `BackgroundRemovalStep.tsx` UI update
- After bg removal (`bgRemoved === true`), show a before/after comparison for each design type:
  - **Before** card: raw image from `idea.sticker_raw_url` / `idea.tshirt_raw_url` on a solid background
  - **After** card: transparent image from `idea.sticker_design_url` / `idea.tshirt_design_url` on a checkerboard background
- Before bg removal, show the raw designs as-is (current behavior)

---

## Files to change
1. New migration — add `sticker_raw_url` and `tshirt_raw_url` to `az_pod_ideas`
2. `supabase/functions/pod-generate-designs/index.ts` — remove Remove.bg check, selective field updates, save raw URLs
3. `supabase/functions/pod-remove-bg/index.ts` — copy raw URLs before overwriting
4. `src/pages/PodPipeline.tsx` — selective merge in onSuccess to prevent race condition
5. `src/components/pod/BackgroundRemovalStep.tsx` — before/after comparison UI

