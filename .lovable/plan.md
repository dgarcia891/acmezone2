

# Bug Fix: Design Step Shows Failure Instead of Triggering Generation

## Root Cause

When you open an idea from the Kanban board that has status `analyzed`, the wizard jumps directly to the **Generate** step (line 27: `case "analyzed": return "generate"`). However, the actual design generation mutation is **never triggered** — it only runs when you click "Generate Designs" from the Review step via `handleGenerate()`.

Since the idea has no `sticker_design_url` or `tshirt_design_url` yet, and `loadingTypes` is empty, the `DesignCard` component immediately renders the "Image generation failed" placeholder. Nothing actually failed — generation was simply never started.

## Fix

**Two changes in `PodPipeline.tsx`:**

1. Add a `useEffect` that detects when the wizard opens at the `generate` step for an idea that has **no design URLs**. In that case, automatically call `handleGenerate()` to kick off design generation.

2. This covers both: reopening from Kanban and the normal flow (which already works via `handleGenerate` → `setStep("generate")`). The effect will be guarded to only fire when there are no existing designs, so reopening an idea with designs already generated won't re-trigger.

**Additionally in `DesignGeneration.tsx`:**

3. Add a manual "Generate Designs" button as a fallback in case the auto-trigger doesn't fire (e.g., if the mutation errored out). This replaces the misleading "Image generation failed" text when no generation was ever attempted — showing "No design yet — click Generate or Regenerate" instead.

## Files Changed

| File | Change |
|---|---|
| `src/pages/PodPipeline.tsx` | Add useEffect to auto-trigger generation when entering generate step with no designs |
| `src/components/pod/DesignGeneration.tsx` | Show "Generate" button instead of misleading failure message when no generation was attempted |

