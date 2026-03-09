
## Root Cause & Fix

### The Actual Bug
In `PodPipeline.tsx`, `handleApproveAfterReview` calls `generateListings.mutate()` and on success only calls `setStep("listings")`. It never updates `wizardIdea.status` to `"listings"` in local React state.

So when the user navigates:
1. Step 4 → Step 5 (first time): AI runs, DB status = "listings", but `wizardIdea.status` in React state is still `"bg_removed"`
2. Step 5 → Step 4 (go back): `wizardIdea.status` is still `"bg_removed"` in memory
3. Step 4 → Step 5 (forward again): `hasListings` check sees `"bg_removed"` → `false` → AI regenerates unnecessarily

The existing guard at line 300 (`hasListings` check) is correct logic — it's just never actually reached because status was never updated.

### Fix
**File: `src/pages/PodPipeline.tsx`** — In `handleApproveAfterReview`, add `setWizardIdea` to update the status after successful listing generation:

```typescript
const handleApproveAfterReview = () => {
  if (!wizardIdea) return;
  const hasListings = ["listings", "ready", "production", "live"].includes(wizardIdea.status ?? "");
  if (hasListings) {
    setStep("listings");
    return;
  }
  generateListings.mutate(wizardIdea.id, {
    onSuccess: () => {
      setWizardIdea((prev: any) => ({ ...prev, status: "listings" }));  // ← add this
      setStep("listings");
    },
  });
};
```

Also update the Step 5 `onBack` handler: when the user navigates back from Step 5 to Step 4 AND the idea already has listings (i.e. they've already been through Step 5), the `BackgroundRemovalStep` approve button should say "Continue to Finalize" instead of "Approve & Generate Listings". This requires passing a `hasListings` prop to `BackgroundRemovalStep`.

### Two-part change

**1. `src/pages/PodPipeline.tsx`** — Update `handleApproveAfterReview` to persist status in local state after generation (one line added).

**2. `src/components/pod/BackgroundRemovalStep.tsx`** — Accept an optional `hasListings` boolean prop. When true, change the approve button label from "Approve & Generate Listings" to "Continue to Finalize".

**3. `src/pages/PodPipeline.tsx` (JSX)** — Pass `hasListings` to `BackgroundRemovalStep`:
```tsx
hasListings={["listings","ready","production","live"].includes(wizardIdea?.status ?? "")}
```

No database, no edge functions, no new dependencies. Three small changes across two files.
