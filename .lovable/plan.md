

## Two Fixes: Scroll Preservation + AI Color Variant Refinement

### 1. Preserve Scroll Position When Navigating Back to Board

**Problem**: `closeWizard` resets state and `setSearchParams({})` causes the page to re-render, losing scroll position.

**Solution**: Store the scroll position in a ref when opening the wizard, restore it when closing.

**Changes in `src/pages/PodPipeline.tsx`**:
- Add a `scrollPositionRef = useRef(0)` 
- In `openWizardForIdea` and `openWizardForNew`, capture `window.scrollY` into the ref
- In `closeWizard`, after state resets, use `requestAnimationFrame` + `window.scrollTo` to restore position
- Avoid invalidating the `pod-ideas` query unnecessarily on wizard close (the query cache already has the data)

### 2. AI Color Variant Refinement Button

**Problem**: Designs may look bad on certain background colors (e.g., dark text on black). Need a way to send the design back through AI with color-specific guidance, remove bg, and preview.

**Solution**: Add a "Refine for Color" button on each color preview tile in the Color Previews section.

**New Edge Function: `supabase/functions/pod-refine-color/index.ts`**
- Accepts: `idea_id`, `color_name`, `bg_hex`, `guidance` (user prompt)
- Sends the current t-shirt design image + guidance prompt to Gemini (e.g., "Adjust this design so text and details are clearly visible on a {color} background. {user guidance}")
- Saves the refined image to storage
- Runs bg removal on the result
- Returns the refined transparent PNG + a preview composited on the target color
- Stores as a new design version in `az_pod_design_versions`

**Changes in `src/components/pod/WizardListingsStep.tsx`**:
- Add a small "Refine" button (wand icon) on each color preview tile
- Clicking opens a small dialog/popover with a text input for guidance (pre-filled with "Make text and details clearly visible on {color} background")
- Submit triggers the edge function; show loading spinner on that tile
- On success, update the preview image and show approve/reject controls
- User can accept (replaces main design) or reject (reverts to original)

**New hook in `src/hooks/usePodPipeline.ts`**:
- `useRefineForColor` mutation — calls the new edge function, invalidates design versions query on success

### Flow
```text
User sees color preview → clicks "Refine" on black tile
→ enters guidance ("fix text visibility")
→ AI regenerates design optimized for black bg
→ bg removal runs automatically
→ new preview shown on black bg
→ user approves → design version saved, preview updated
   or rejects → reverts to original
```

