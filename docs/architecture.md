# Acme.zone Website — Architecture Specification

> **Version:** 1.0 | **Last Updated:** 2026-01-18

## Overview

Acme.zone is a web application deployed via **Lovable.dev** with GitHub as the source of truth for logic.

---

## Stack

| Layer       | Technology            |
|-------------|-----------------------|
| Frontend    | React 19, TypeScript  |
| Build       | Vite 7                |
| Styling     | Tailwind CSS v3       |
| Deployment  | Lovable.dev           |
| Repository  | GitHub (`dgarcia891/acmezone2`) |

---

## Data Model

> **Status:** No database configured yet.

| Table | Purpose | Notes |
|-------|---------|-------|
| TBD   | TBD     | Database will be added when features require persistence. |

---

## Auth Model

> **Status:** No authentication configured yet.

| Provider | Notes |
|----------|-------|
| TBD      | Auth will be configured when user accounts are required. |

---

## Boundaries

| Logic Type     | Location           |
|----------------|--------------------|
| UI Components  | `src/` (Lovable-managed) |
| Business Logic | Edge Functions (TBD) |
| API Calls      | Edge Functions (TBD) |

---

## Constraints

1. **Lovable Hybrid:** UI changes are made in Lovable. Logic changes are made in GitHub.
2. **No Autonomous Migrations:** Supabase DB migrations require manual human approval.
3. **500-Line Limit:** Files exceeding 500 lines must be refactored before editing.
4. **Relative Paths Only:** Absolute paths are forbidden in agent operations.
