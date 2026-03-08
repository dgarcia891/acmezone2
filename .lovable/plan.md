

## Fix: Persist Trending Ideas Dialog State Across Navigation

### Problem
The Trending Ideas dialog loses its fetched results when navigating to another tab and back, because `ideas` and `hasLoaded` are local component state that resets on unmount.

### Solution
Persist the fetched ideas array and loaded flag to `sessionStorage`. On mount, restore from storage so previously fetched results are still visible when the user returns.

### Changes

**File:** `src/components/pod/TrendingIdeasDialog.tsx`

1. On component mount, initialize `ideas` and `hasLoaded` from `sessionStorage` keys (`pod_trending_ideas`, `pod_trending_loaded`).
2. After a successful fetch, write the results to `sessionStorage`.
3. On refresh, clear storage before re-fetching.
4. Adjust `handleOpenChange` so it only auto-fetches if there are no cached results.

**File:** `src/pages/admin/AdminPodPipeline.tsx`

Also persist the `trendingOpen` dialog state to `sessionStorage` so the dialog re-opens when the user navigates back.

- On mount, check `sessionStorage` for `pod_trending_open` and restore.
- When `trendingOpen` changes, write to `sessionStorage`.
- When the dialog closes normally (via idea selection), clear the flag.

