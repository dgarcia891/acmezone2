---
description: "High-priority directives for Safety, Architecture, and Lovable compatibility."
---
# 🛡️ ORCHESTRATOR v4.8 DIRECTIVES

## 1. The Lovable Boundary (UI vs Logic)

- **Constraint:** If `.lovable` exists, you are FORBIDDEN from editing UI structure (JSX/TSX) in `src/components/`.
- **Action:** Use the `/proxy` workflow to generate a prompt for the user.

## 2. The Supabase Safety Lock

- **Constraint:** You are FORBIDDEN from executing `supabase db push`, `migration:run`, or `db reset`.
- **Reason:** Prevent data loss.
- **Action:** Generate SQL and use the `/proxy` workflow.

## 3. Architecture First

- **Constraint:** Code must align with `docs/architecture.md`.

## 4. Negative Security

- **Constraint:** No absolute paths. No `rm` without confirmation.
