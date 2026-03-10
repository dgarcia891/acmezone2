

## Fix: Persist POD Pipeline State Across Navigation

### Root Cause
Two problems cause state loss when navigating away and back:

1. **ScrollToTop component** forces `window.scrollTo(0, 0)` on every route change — so even if state were preserved, scroll position resets
2. **All wizard state lives in `useState`** — when the component unmounts on navigation, everything (wizard step, idea, scroll position) is destroyed

### Fix

**`src/components/ScrollToTop.tsx`**
- Exclude `/admin/pod-pipeline` from the automatic scroll-to-top behavior so the page doesn't jump on return

**`src/pages/PodPipeline.tsx`**
- Persist key state to `sessionStorage` on every change: `wizardOpen`, `wizardIdea.id`, `step`, `productType`, `scrollY`
- On mount, restore from sessionStorage: look up the idea ID in the react-query cache (or wait for the query to load), restore the wizard step, and restore scroll position
- Clear sessionStorage entries in `closeWizard` (user explicitly goes back to board)
- This means: open wizard → navigate away → come back → wizard reopens at the same step with the same idea, scrolled to where you were

### Session keys
- `pod_wizard_open` — boolean
- `pod_wizard_idea_id` — string
- `pod_wizard_step` — step name
- `pod_wizard_product_type` — string
- `pod_scroll_y` — number

