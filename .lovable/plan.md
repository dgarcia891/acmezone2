

## Problem Summary

The admin experience is fragmented:
- **Header clutter**: "Admin" and "POD" are separate top-level nav links, making the header feel ad hoc
- **Flat tab soup**: The Admin page crams Users, Products, Analytics, Hydra Guard (with its own nested tabs), and Settings into one horizontal tab bar
- **POD Pipeline is orphaned**: It lives at its own route (`/pod-pipeline`) with no structural connection to the admin area
- **No persistent navigation**: Switching between admin sections requires going back to `/admin` and clicking the right tab every time

## Solution: Sidebar-Based Admin Layout

Replace the current single-page tab layout with a **sidebar-navigated admin area** using the existing Shadcn Sidebar component. Each current tab becomes its own sub-route under `/admin/*`.

```text
┌──────────────────────────────────────────────┐
│  Header:  [Acme Zone]  Home  Products  ...  [Admin ▾]  │
├──────────┬───────────────────────────────────┤
│ Sidebar  │  Content Area                     │
│          │                                   │
│ Overview │  (renders based on route)         │
│ Users    │                                   │
│ Products │                                   │
│ Analytics│                                   │
│ ──────── │                                   │
│ Security │                                   │
│  Detect. │                                   │
│  Correct.│                                   │
│  Patterns│                                   │
│  Reports │                                   │
│ ──────── │                                   │
│ POD Pipe │                                   │
│ Settings │                                   │
└──────────┴───────────────────────────────────┘
```

## Changes

### 1. New: Admin Layout Shell (`src/components/admin/AdminLayout.tsx`)
- Uses `SidebarProvider` + `Sidebar` (collapsible to icons on mobile)
- Sidebar groups: **Dashboard** (Overview), **Content** (Users, Products, Analytics), **Security** (Detections, Corrections, Patterns, User Reports), **Tools** (POD Pipeline), **System** (Settings)
- Active route highlighting via `useLocation`
- Renders `<Outlet />` for nested routes
- Wraps admin auth check (replaces the per-page check)

### 2. New: Admin sub-pages (thin wrappers, one per section)
- `src/pages/admin/AdminOverview.tsx` — stats cards + user list (extracted from current Admin.tsx)
- `src/pages/admin/AdminUsers.tsx` — dedicated users page (same content, room to grow)
- `src/pages/admin/AdminProducts.tsx` — renders `<ProductManagement />`
- `src/pages/admin/AdminAnalytics.tsx` — renders `<SiteAnalytics />`
- `src/pages/admin/AdminDetections.tsx` — renders `<DetectionsTab />`
- `src/pages/admin/AdminCorrections.tsx` — renders `<CorrectionsTab />`
- `src/pages/admin/AdminPatterns.tsx` — renders `<PatternsTab />`
- `src/pages/admin/AdminUserReports.tsx` — renders `<UserReportsTab />`
- `src/pages/admin/AdminSettings.tsx` — renders `<SmtpSettings />`

### 3. Modified: Routing (`src/App.tsx`)
- Replace single `/admin` route with nested routes:
  ```
  /admin           → AdminOverview (index)
  /admin/users     → AdminUsers
  /admin/products  → AdminProducts
  /admin/analytics → AdminAnalytics
  /admin/security/detections   → AdminDetections
  /admin/security/corrections  → AdminCorrections
  /admin/security/patterns     → AdminPatterns
  /admin/security/reports      → AdminUserReports
  /admin/pod-pipeline          → PodPipeline (moved here)
  /admin/settings              → AdminSettings
  ```
- Keep `/pod-pipeline` as a redirect to `/admin/pod-pipeline` for backward compat

### 4. Modified: Header (`src/components/layout/Header.tsx`)
- Remove separate "Admin" and "POD" nav links
- Add single "Admin" link (or dropdown) that goes to `/admin`
- Cleaner header for both admin and non-admin users

### 5. Modified: PodPipeline page
- Remove its own `<Header />` and `<Footer />` since the AdminLayout shell provides them
- Otherwise unchanged

### 6. Deleted/Replaced
- `src/pages/Admin.tsx` — replaced by AdminLayout + sub-pages

## Technical Details

- Sidebar uses `collapsible="icon"` so it shrinks to a narrow icon strip on collapse (always accessible)
- `SidebarTrigger` placed in the AdminLayout header bar, always visible
- Auth guard lives in `AdminLayout` — one place, not repeated per sub-page
- Each sub-page is a simple component with a `<Helmet>` title and the existing content component
- No database changes needed

