

## Fix: `results is not defined` Error + Auto-Scroll to Results After Publish

### Bug: `results is not defined` in `pod-send-to-printify`

The edge function references `results.push(...)` on lines 378, 588, and 614, but the `results` array is never declared. This was likely lost during the recent color-refined variants edit.

**Fix in `supabase/functions/pod-send-to-printify/index.ts`**:
- Add `const results: any[] = [];` before line 365 (the `for (const listing of filteredListings)` loop)

### UX: Results not obvious after publishing

After clicking "Send to Printify", the results cards appear at the bottom of the page but the user has no indication to scroll down. The page stays at the same scroll position.

**Fix in `src/components/pod/WizardListingsStep.tsx`**:
- After `setPrintifyResults(data?.products || [])` in the `onSuccess` callback, use `setTimeout(() => document.getElementById('printify-results')?.scrollIntoView({ behavior: 'smooth' })`, 100)` to auto-scroll to the results section
- Add `id="printify-results"` to the first results card container (the `grouped` map output around line 1095)

