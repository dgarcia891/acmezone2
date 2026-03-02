

# Hydra Guard Admin Dashboard

## Overview
Move and upgrade the existing Scam Alert admin components from the `/admin` page into a standalone `/hydra-guard/admin` route with enhanced UI including stats cards, better filtering, severity color-coding, and pagination.

## What stays the same
- Existing `sa_patterns`, `sa_detections`, `sa_corrections`, `sa_app_config` tables and their schemas (no DB changes)
- Existing edge functions (`sa-sync-patterns`, `sa-report-detection`, `sa-submit-correction`)
- Existing RLS policies (admin-only access via `has_role`)

## Changes

### 1. Create `/hydra-guard/admin` page
**New file:** `src/pages/HydraGuardAdmin.tsx`
- Admin-only page with auth check using `useAdmin` hook (same pattern as `/admin`)
- Redirects non-admins to `/dashboard` with error toast
- Header/Footer from existing layout components
- "Hydra Guard Admin" branding with Shield icon
- Three-tab layout: Detections, Corrections (default), Patterns

### 2. Upgrade Detections tab
**New file:** `src/components/hydra-guard/DetectionsTab.tsx`
- Stats cards row: total detections (7 days), critical/high count, most common severity, AI verification rate
- Filters: severity dropdown (all/critical/high/medium/low), search by url_hash
- Table with severity color-coded badges (critical=red, high=orange, medium=yellow, low=blue)
- Expandable row detail dialog showing full signals JSON
- Pagination (50 rows per page with prev/next controls)

### 3. Upgrade Corrections tab (priority)
**New file:** `src/components/hydra-guard/CorrectionsTab.tsx`
- Stats cards: pending count, approved this week, rejected this week
- Filters: status (pending default), feedback type, date
- Table: url_hash, feedback type (badge), user comment (truncated), review status (color badge), AI review indicator, actions
- Approve/Reject buttons with immediate DB update
- Detail modal: full url_hash, feedback, user comment, AI review JSON, timestamps
- Approve action: updates `review_status` to "approved" and sets `reviewed_at`
- Reject action: updates `review_status` to "rejected" and sets `reviewed_at`

### 4. Upgrade Patterns tab
**New file:** `src/components/hydra-guard/PatternsTab.tsx`
- Stats cards: total active, recently added (7 days), patterns by category breakdown
- Filters: category, source, active toggle, search
- Table with severity_weight shown as a mini progress bar (1-10 scale)
- Source badges color-coded (manual=secondary, ai_promoted=primary, community=outline)
- Full CRUD: add/edit dialog, delete with confirmation, active toggle
- Confidence slider in edit form (severity_weight 1-10)

### 5. Remove SA tabs from `/admin`
- Remove the three SA tab triggers and content from `src/pages/Admin.tsx`
- Remove the imports for `PatternManagement`, `DetectionViewer`, `CorrectionViewer`
- Keep the old component files in `src/components/admin/sa/` (can be deleted later or kept as reference)

### 6. Register route in App.tsx
- Add `/hydra-guard/admin` route wrapped in `ProtectedRoute`
- Import new `HydraGuardAdmin` page component

### 7. Severity color scheme
Applied consistently across all tabs:
- CRITICAL / critical: `bg-red-500/15 text-red-700 border-red-200`
- HIGH / high: `bg-orange-500/15 text-orange-700 border-orange-200`
- MEDIUM / medium: `bg-yellow-500/15 text-yellow-700 border-yellow-200`
- LOW / low: `bg-blue-500/15 text-blue-700 border-blue-200`
- SAFE / safe: `bg-green-500/15 text-green-700 border-green-200`

---

## Technical Details

### File changes summary
| Action | File |
|--------|------|
| Create | `src/pages/HydraGuardAdmin.tsx` |
| Create | `src/components/hydra-guard/DetectionsTab.tsx` |
| Create | `src/components/hydra-guard/CorrectionsTab.tsx` |
| Create | `src/components/hydra-guard/PatternsTab.tsx` |
| Modify | `src/pages/Admin.tsx` (remove SA tabs) |
| Modify | `src/App.tsx` (add route) |

### Data queries
All queries use the existing `supabase` client from `@/integrations/supabase/client` with `as unknown as Type[]` casting (same pattern as existing components). Tables queried:
- `sa_patterns` -- full CRUD
- `sa_detections` -- SELECT only
- `sa_corrections` -- SELECT + UPDATE (review_status, reviewed_at)

### Pagination approach
Each tab loads 50 rows at a time using `.range(from, to)` with simple prev/next page controls at the bottom of each table.

### No database changes required
The existing schema supports everything needed. The `severity_weight` (1-10) maps naturally to a confidence/weight display. The `url_hash` privacy model is preserved.

