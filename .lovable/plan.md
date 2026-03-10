

# Unified Admin Navigation

## Problem
Admin pages are scattered across separate routes (`/admin`, `/hydra-guard/admin`) with no centralized way to navigate between them. The only way to reach Hydra Guard Admin is by typing the URL directly.

## Solution
Add a **Hydra Guard** tab directly into the main Admin Dashboard (`/admin`), eliminating the need for a separate `/hydra-guard/admin` route entirely. This consolidates all admin functionality into one place.

## Changes

### 1. Merge Hydra Guard into Admin.tsx
**File:** `src/pages/Admin.tsx`
- Add a new "Hydra Guard" tab alongside Users, Products, Analytics, Settings
- Import the three Hydra Guard tab components (`DetectionsTab`, `CorrectionsTab`, `PatternsTab`)
- Nest them inside a sub-tabs layout within the Hydra Guard tab content
- Add the Shield icon with a distinctive color to make it stand out

### 2. Redirect old route
**File:** `src/App.tsx`
- Replace the `/hydra-guard/admin` route with a redirect to `/admin` (or remove it entirely)

### 3. Remove standalone page
**File:** `src/pages/HydraGuardAdmin.tsx`
- Can be deleted since its content now lives inside Admin.tsx

### Result
- One admin URL: `/admin`
- All admin tools accessible via tabs: Users | Products | Analytics | Hydra Guard | Settings
- Header "Admin" link takes you to everything

