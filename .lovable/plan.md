

## Trending Ideas Discovery Page

### What We're Building

A "Trending Ideas" panel/dialog that fetches **5 trending POD ideas at once** from the AI, displayed in a ranked list with metrics (viability score, target audience, trend reasoning, product type). The user can browse, compare, and pick one to send into the wizard.

### Changes

**1. Update edge function `pod-suggest-idea` to return 5 ideas**

Modify the system prompt to request 5 ranked ideas instead of 1. Each idea includes:
- `idea_text`, `product_type`, `reasoning`, `target_audience`
- `estimated_viability` (1-10 score)
- `trend_momentum` — "rising", "peaking", or "steady" (gives a sense of recency/urgency)
- `category` — e.g. "memes", "seasonal", "niche community"

Accept a `count` param (default 5) from the request body. Return `{ suggestions: [...] }` instead of `{ suggestion: {...} }`.

**2. Update `useSuggestIdea` hook in `usePodPipeline.ts`**

Change return type to an array. Update the mutation to pass `count: 5` and return `data.suggestions`.

**3. New component: `src/components/pod/TrendingIdeasDialog.tsx`**

A dialog/sheet that opens when "Give me an idea" is clicked. Contents:
- Header: "Trending Ideas" with a "Refresh" button
- Loading state with skeleton cards
- List of 5 idea cards, each showing:
  - **Viability score** as a colored badge (green 8-10, yellow 5-7, red 1-4)
  - **Trend momentum** indicator (arrow up for rising, flame for peaking, dash for steady)
  - **Category** tag
  - **Idea text** (the description)
  - **Target audience** in muted text
  - **Reasoning** in smaller text
  - **"Use This Idea"** button on each card
- Clicking "Use This Idea" closes the dialog and opens the wizard pre-filled

**4. Update `AdminPodPipeline.tsx`**

Replace the current inline `onClick` on "Give me an idea" button to open the `TrendingIdeasDialog` instead of directly invoking and auto-filling. Pass a callback `onSelectIdea` that opens the wizard with the chosen idea's data.

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/pod-suggest-idea/index.ts` | Return 5 ranked ideas with momentum + category fields |
| `src/hooks/usePodPipeline.ts` | Update `useSuggestIdea` to return array of suggestions |
| `src/components/pod/TrendingIdeasDialog.tsx` | New component — ranked list with metrics, pick-to-use |
| `src/pages/admin/AdminPodPipeline.tsx` | Wire button to open dialog, pass selection callback |

