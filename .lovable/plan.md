

# Plan: Larger T-shirt Designs + Per-Shop Publish/Draft Settings

## Problem 1: T-shirt designs are too small
The current AI prompt for t-shirt designs says "centered on a solid pure white background" but lacks size directives. The generated artwork ends up small relative to the canvas.

## Problem 2: Publish toggle only affects some shops
The edge function receives a single `publish` boolean and applies it to **all** shops uniformly. However, the `az_pod_printify_shops` table has no `auto_publish` column, so there's no per-shop setting. The UI only has one global toggle.

---

## Changes

### 1. Update T-shirt design prompt (edge function)
**File:** `supabase/functions/pod-generate-designs/index.ts` (~line 170)

Update the t-shirt prompt to explicitly instruct the AI to make the artwork large and prominent:

> "Create a t-shirt graphic design at high resolution (4500x5400 pixels or similar print-ready dimensions). The artwork MUST be LARGE and PROMINENT, filling at least 70-80% of the canvas. Make the design bold, oversized, and visually impactful — NOT small or centered in a tiny area. Output ONLY the graphic artwork on a solid pure white (#FFFFFF) background. Do NOT include any t-shirt mockup, fabric texture, clothing outline, shadow, border, or frame. No checkered pattern. Just the isolated artwork on pure white, filling the majority of the canvas. {user_prompt}"

### 2. Add `auto_publish` column to `az_pod_printify_shops`
**Migration:** Add a boolean `auto_publish` column defaulting to `false`.

```sql
ALTER TABLE az_pod_printify_shops 
  ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false;
```

### 3. Update per-shop publish settings in the Settings UI
**File:** `src/components/pod/PodSettingsForm.tsx`

Add a toggle next to each shop row (primary + additional) to set `auto_publish`. Save it via the `pod-settings` edge function.

### 4. Update `pod-settings` edge function
**File:** `supabase/functions/pod-settings/index.ts`

Support updating `auto_publish` on shops. For the primary shop (stored in `az_pod_settings`), add an `auto_publish` column there too, or store it as a shop entry.

### 5. Update `pod-send-to-printify` edge function
**File:** `supabase/functions/pod-send-to-printify/index.ts`

Instead of using the single `publish` boolean for all shops, read each shop's `auto_publish` setting and apply it individually:

```typescript
// Per-shop publish decision
const shouldPublish = shop.marketplace === "default" 
  ? primaryAutoPublish 
  : shop.auto_publish;
```

### 6. Update Summary Step UI
**File:** `src/components/pod/WizardSummaryStep.tsx`

Replace the single global "Publish immediately / Save as draft" toggle with per-shop toggles that default to each shop's `auto_publish` setting. Show each shop name with its own toggle so the admin can override at send time.

---

## Summary of files to change
1. `supabase/functions/pod-generate-designs/index.ts` — larger t-shirt prompt
2. New migration — add `auto_publish` to `az_pod_printify_shops` and `az_pod_settings`
3. `src/components/pod/PodSettingsForm.tsx` — per-shop auto_publish toggle
4. `supabase/functions/pod-settings/index.ts` — save auto_publish
5. `supabase/functions/pod-send-to-printify/index.ts` — per-shop publish logic
6. `src/components/pod/WizardSummaryStep.tsx` — per-shop publish toggles at send time

