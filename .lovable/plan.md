

## Fix: Toast Duration + Stacking & Edge Function Stack Overflow

### Issue 1: Toasts disappear too fast and don't stack

The Sonner toaster has no `duration` or `visibleToasts` props set, so it defaults to ~4 seconds and shows only 1 toast.

**Fix in `src/components/ui/sonner.tsx`**:
- Add `duration={30000}` (30 seconds)
- Add `visibleToasts={5}` to allow stacking

### Issue 2: `pod-refine-color` crashes with "Maximum call stack size exceeded"

Line 79: `btoa(String.fromCharCode(...imgBytes))` uses the spread operator on the entire image byte array. For large images (100K+ bytes), this exceeds the JS call stack limit.

**Fix in `supabase/functions/pod-refine-color/index.ts`**:
- Replace the one-liner with a chunked base64 conversion that processes bytes in batches of 8192.

Same pattern exists on line ~120 for the refined image bytes -- fix that too.

