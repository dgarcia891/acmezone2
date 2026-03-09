

# Hydra Guard Code Review

## Overall Assessment
The Hydra Guard system is well-architected with solid security practices (API key auth, burst protection, maintenance mode, server-side admin verification). However, there are several issues worth addressing.

## Issues Found

### 1. Dead / Duplicate Components (Medium Priority)
The `src/components/admin/sa/` directory contains **older versions** of DetectionViewer and CorrectionViewer that are no longer used in routing. The active admin views use the `src/components/hydra-guard/` tabs (DetectionsTab, CorrectionsTab, PatternsTab, UserReportsTab) via the sidebar routes. The old `sa/` components:
- `DetectionViewer.tsx` — hardcoded `limit(200)`, no pagination, no filters, no real-time
- `CorrectionViewer.tsx` — same issues, plus it does direct `update()` without going through the `approve-correction` edge function (bypasses pattern weight adjustment logic)

**Recommendation**: Delete `src/components/admin/sa/DetectionViewer.tsx` and `src/components/admin/sa/CorrectionViewer.tsx`. Keep `DetectionSnapshotView.tsx` and `PatternManagement.tsx` only if they're still imported somewhere.

### 2. `sa-submit-correction` Missing Burst Protection (Low-Medium Priority)
The `sa-report-detection` and `sa-report-user` functions both have the `activeRequests` burst limiter, but `sa-submit-correction` does **not**. It should have the same guard since it's also a public-facing endpoint.

**Recommendation**: Add the same `activeRequests` / `MAX_CONCURRENT` / `finally` block.

### 3. `sa-sync-patterns` Category Filter Excludes Valid Categories (Medium Priority)
The sync function filters patterns to only return `phrase`, `tld`, `domain`, and `keyword` categories. But the PatternsTab allows creating patterns with categories: `urgency`, `coercion`, `impersonation`, `financial`, `credential`, `typosquat`, `other`. **None of these match** the sync filter, meaning patterns created in the admin panel will never be synced to the Chrome extension.

**Recommendation**: Either remove the category filter from `sa-sync-patterns` (return all active patterns), or align the admin category list with the sync filter categories. This is likely the most impactful bug.

### 4. `sa-patterns` Table Has No Unique Constraint on `phrase` (Low Priority)
The `sa-submit-correction` function does `upsert` with `onConflict: "phrase"`, but the `sa_patterns` table schema shows no unique constraint on the `phrase` column. This would cause the upsert to fail silently or error.

**Recommendation**: Add a unique index on `sa_patterns.phrase`.

### 5. CorrectionsTab Detail Dialog Missing Detection Snapshot View (Low Priority)
The new `CorrectionsTab.tsx` (the active one in `hydra-guard/`) renders raw JSON for `ai_review_result` and `ai_analysis`, but it does **not** render the `detection_snapshot` field using the structured `DetectionSnapshotView` component (which exists and works well in the old `CorrectionViewer`). The `detection_snapshot` field isn't even in the Correction interface.

**Recommendation**: Add `detection_snapshot` to the interface and render it using `DetectionSnapshotView` in the detail dialog.

### 6. UserReportsTab "Promote" Action Has No Backend Logic (Low Priority)
The "Promote" button sets `review_status` to `'promoted'` but there's no backend logic to actually create a pattern from the reported URL. It's just a status label.

**Recommendation**: Either wire it to create a new `sa_patterns` entry, or rename the button to something clearer like "Flag for Pattern Review."

### 7. Minor: `approve-correction` Uses Deprecated `getClaims` API
The `getClaims` method may not be available in all Supabase client versions. A more standard approach is `getUser()` from the auth header.

---

## Summary of Recommended Changes

| # | Issue | Priority | Effort |
|---|-------|----------|--------|
| 1 | Delete dead `sa/` viewer components | Medium | Small |
| 2 | Add burst protection to `sa-submit-correction` | Low-Med | Small |
| 3 | Fix category filter mismatch in `sa-sync-patterns` | **High** | Small |
| 4 | Add unique index on `sa_patterns.phrase` | Low | Small |
| 5 | Add DetectionSnapshotView to CorrectionsTab dialog | Low | Small |
| 6 | Clarify "Promote" button behavior | Low | Small |
| 7 | Replace `getClaims` with `getUser` in approve-correction | Low | Small |

Issue #3 is the most critical — patterns created through the admin UI are effectively invisible to the Chrome extension due to the category mismatch in the sync endpoint.

