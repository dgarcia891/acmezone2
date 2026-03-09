

## Fix: Skip Listing Regeneration When No Changes Made

### Problem
Going from step 5 (Finalize) → step 4 (Results) → back to step 5 triggers `handleApproveAfterReview`, which **always** calls `generateListings.mutate()` — regenerating all listing content via AI even when nothing changed in step 4.

### Solution
In `handleApproveAfterReview` in `src/pages/PodPipeline.tsx`, check if listings already exist for this idea. If the idea's status is already `"listings"`, `"ready"`, `"production"`, or `"live"`, simply navigate to step 5 without calling the AI.

### File Changed
**`src/pages/PodPipeline.tsx`** — Update `handleApproveAfterReview` (~line 297):

```typescript
const handleApproveAfterReview = () => {
  if (!wizardIdea) return;
  // If listings already generated, just navigate forward
  const hasListings = ["listings", "ready", "production", "live"].includes(wizardIdea.status);
  if (hasListings) {
    setStep("listings");
    return;
  }
  generateListings.mutate(wizardIdea.id, {
    onSuccess: () => {
      setStep("listings");
    },
  });
};
```

One file, ~4 lines added. No backend or database changes.

