

# Plan: Fix Sticker Display Bug + Merge Generate & Remove BG Steps

## Bug: Sticker image not showing after generation

The sticker design generates successfully (visible on the next page) but doesn't display in the Generate step. This is likely because the `DesignCard` component reads `idea?.sticker_design_url` from the `wizardIdea` state, but the selective merge in `onSuccess` may not be triggering a re-render properly, or the `DesignCard` receives stale props. The fix is to ensure the component re-renders when `idea` props change — specifically, the `DesignCard` currently initializes `editedPrompt` from `prompt` on mount but the image display should work from props directly. Need to investigate if the issue is that `setWizardIdea` with functional updater and the same object reference causes React to skip the re-render.

**Fix**: Force a new object reference in the state update by spreading more carefully, and add a key prop to `DesignCard` that includes the URL to force re-mount when the design arrives.

## Combine Generate + Remove BG into one step

Currently the pipeline is 6 steps: Analyze → Review → Generate → Remove BG → Listings → Summary.

New flow will be 5 steps: **Analyze → Review → Generate & Process → Review Results → Listings → Summary** (or keep at 5 by merging Generate + Remove BG).

### Proposed new flow:
- **Step 3: "Generate & Process"** — Shows design generation (current step 3), then automatically triggers background removal once both designs are done. Shows a single combined loading state. The user can still regenerate individual designs before proceeding.
- **Step 4: "Review Results"** — Shows the before/after comparison (raw vs transparent) for each design type. This is where the user decides to approve, drop individual designs, or reject.

### Changes

#### 1. `PipelineStepIndicator.tsx` — Merge steps
- Remove `remove_bg` as a separate step
- Rename step 3 to "Generate" (auto-removes BG after generation)
- Rename step 4 to "Review" (shows before/after)
- New steps: `input` → `review` → `generate` → `results` → `listings` → `summary` (still 6 but "results" replaces "remove_bg" conceptually, though we could keep 5 by making results part of generate)

Actually simpler: keep the same 6 visual steps but relabel:
1. Analyze, 2. Review, 3. Generate, 4. Review Designs, 5. Listings, 6. Summary

Step 3 now generates designs AND removes backgrounds automatically. Step 4 shows before/after comparison.

#### 2. `PodPipeline.tsx` — Auto-trigger bg removal
- After all designs finish generating (loadingTypes becomes empty and designs exist), automatically call `handleRemoveBg`
- Track a `bgRemoving` state to show progress
- When bg removal completes, auto-advance to the results/review step
- The "Next" button on the generate step becomes "Processing..." while bg removal runs

#### 3. `DesignGeneration.tsx` — Update UI
- After designs are generated, show "Removing backgrounds..." state automatically
- The "Next" button triggers bg removal if not already done, then advances
- Remove the separate "Next: Remove Background" button text, just say "Next: Process Designs"

#### 4. `BackgroundRemovalStep.tsx` → Rename to `DesignReviewStep.tsx`
- Remove the "Remove Background" button (it's now automatic)
- Always show the before/after comparison (bgRemoved is always true when reaching this step)
- Keep Drop/Reject buttons
- Button says "Approve & Generate Listings"

#### 5. `statusToStep` mapping update
- `bg_removed` status maps to the new results step
- `designs_generated` maps to generate step (where bg removal auto-triggers)

### Files to change
1. `src/components/pod/PipelineStepIndicator.tsx` — relabel step 4
2. `src/pages/PodPipeline.tsx` — auto-trigger bg removal after generation, fix sticker display bug
3. `src/components/pod/DesignGeneration.tsx` — add bg removal loading state, fix re-render issue
4. `src/components/pod/BackgroundRemovalStep.tsx` — simplify to always show before/after (remove the "not yet removed" state)

