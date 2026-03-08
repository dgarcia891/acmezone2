

## Fix: Prevent Background Removal Re-trigger When Going Back from Step 5 to Step 4

### Root Cause
When navigating from Step 5 (Listings) back to Step 4 (Results), the `onBack` handler simply calls `setStep("results")`. The useEffect on line 148 then fires and checks:

```
wizardIdea.status !== "bg_removed"
```

By the time you reach Step 5, the idea status has been updated to `"listings"` or `"ready"`, so this condition passes. Combined with `bgAutoTriggeredRef.current` being `false`, the background removal triggers again unnecessarily.

### Fix (2 files: `AdminPodPipeline.tsx` and `PodPipeline.tsx`)

**Change the `onBack` handler** in the listings step to set `bgAutoTriggeredRef.current = true` before navigating back. This tells the useEffect "bg removal was already done, don't re-run."

In both files, change:
```tsx
onBack={() => setStep("results")}
```
to:
```tsx
onBack={() => { bgAutoTriggeredRef.current = true; setStep("results"); }}
```

This is the minimal, safe fix. The useEffect condition still correctly triggers bg removal when coming from Step 3 (where `handleApproveDesign` explicitly resets `bgAutoTriggeredRef.current = false`), but skips it when returning from Step 5.

