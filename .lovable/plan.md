

## Fix: Stale images after re-entering Step 4 (Background Removal)

### Root Cause
Both edge functions (`pod-generate-designs` and `pod-remove-bg`) upload files to fixed paths like `pod-designs/sticker-{id}.png` and `pod-designs/sticker-{id}-raw.png`. The URLs in the database never change between regeneration cycles.

In Step 3, `applyGeneratedDesignToWizardIdea` appends `?t={timestamp}` to bust browser cache. But in Step 4, `triggerBgRemoval`'s `onSuccess` does `setWizardIdea(res.idea)` with the raw database URLs -- no cache buster. The browser serves old cached images.

### Fix (1 file)

**`src/pages/PodPipeline.tsx`** -- In `triggerBgRemoval`'s `onSuccess` callback, add cache-busting query params to all image URLs before setting state:

```typescript
onSuccess: (res) => {
  const cb = `?t=${Date.now()}`;
  const idea = { ...res.idea };
  if (idea.sticker_design_url) idea.sticker_design_url += cb;
  if (idea.tshirt_design_url) idea.tshirt_design_url += cb;
  if (idea.sticker_raw_url) idea.sticker_raw_url += cb;
  if (idea.tshirt_raw_url) idea.tshirt_raw_url += cb;
  setWizardIdea(idea);
  setBgRemoving(false);
},
```

This mirrors the same cache-busting pattern already used in `applyGeneratedDesignToWizardIdea` for Step 3.

