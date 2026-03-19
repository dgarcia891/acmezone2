---
name: build
description: "Implement planned changes for the Lovable app using lovable_architect constraints and tests."
---

# Workflow: build

1. Load Plan & Context
   - Read the current Implementation Plan produced by the plan workflow.
   - Load relevant files, recent changes, and any notes from previous runs.

2. Learn from Recent Work
   - If there is a change log, BUG_LOG, or LESSONS_LEARNED file, review it for patterns or pitfalls to avoid.
   - Note any tests or scripts that should be run before or after changes.

3. Lovable Architect Integration
   - If the Implementation Plan or request touches:
     - Lovable UI components, pages, or routes.
     - Supabase models or migrations.
     - GitHub ↔ Lovable sync configuration or flow.
   - THEN:
     - Activate and follow lovable_architect.
     - Apply its guidance to:
       - Enforce forbidden zones (do not edit generated integration code or protected directories).
       - Implement database changes only via SQL migration files under supabase/migrations/.
       - Keep routing and UI changes compatible with Lovable preview behavior.

4. Implement Changes
   - Follow the Implementation Plan steps:
     - Edit or create files as specified, respecting lovable_architect constraints.
     - Create or update SQL migration files when schema changes are required, with comments and Business Impact classification.
     - Keep code clean, readable, and consistent with existing patterns.

5. Tests & Checks
   - Add or update tests identified in the plan.
   - Run or recommend appropriate tests and checks (e.g., npm test, lint/scan scripts) if they exist.
   - Note any failing tests and what is needed to resolve them.

6. Summary
   - Summarize what was implemented:
     - Files changed.
     - Migrations added or modified.
     - Tests added or updated.
   - Call out any remaining TODOs, risks, or manual steps (such as applying migrations).
