

## Fix: Background-Removed Images Not Visible + Wizard State Lost on Page Return

### Issue 1: Images appear with backgrounds in Step 5

**Root Cause:** The `pod-remove-bg` function uploads the transparent PNG to the **same storage path** as the original (e.g., `sticker-{id}.png`), overwriting it. The URL string is identical before and after, so the browser serves its **cached copy** of the original (with background). No cache-busting parameter is appended when loading images from the database.

**Fix:** Append a cache-busting query param using the idea's `updated_at` timestamp to all design image URLs in `WizardListingsStep.tsx`. This forces the browser to fetch the current (transparent) version.

In `WizardListingsStep.tsx`, create a helper:
```tsx
const cacheBust = (url: string) => `${url}?t=${encodeURIComponent(idea.updated_at || '')}`;
```
Apply to all `<img src>` attributes: `src={cacheBust(idea.sticker_design_url)}`, etc.

Also apply the same in `BackgroundRemovalStep.tsx` for consistency.

### Issue 2: Navigating away from Step 5 and returning kicks to Kanban

**Root Cause:** The wizard state (`wizardOpen`, `wizardIdea`, `step`) is ephemeral React state. When the user navigates to another page and back, the component remounts with defaults (`wizardOpen = false`), so they see the Kanban board. They then have to click the card again to re-enter the wizard.

**Fix:** Persist the active idea ID in the URL search params (`?idea={id}`). On mount, if an `idea` param is present, auto-open the wizard for that idea. On wizard close, remove the param. This way, browser back/forward and page refreshes preserve the wizard context.

In `AdminPodPipeline.tsx` (and `PodPipeline.tsx`):
1. Read `idea` from `useSearchParams` on mount
2. If present, fetch that idea from the Kanban data and call `openWizardForIdea`
3. When opening a wizard, set `?idea={id}` in the URL
4. When closing the wizard, remove the param

### Files Changed (4)

| File | Change |
|------|--------|
| `src/components/pod/WizardListingsStep.tsx` | Add `cacheBust()` helper, apply to all design image `src` attributes |
| `src/components/pod/BackgroundRemovalStep.tsx` | Same cache-busting for consistency |
| `src/pages/admin/AdminPodPipeline.tsx` | Persist active idea ID in URL search params; auto-reopen wizard on mount |
| `src/pages/PodPipeline.tsx` | Same URL param persistence |

