---
name: fix
description: "Diagnose and resolve bugs in the Lovable app with lovable_architect and regression-focused testing."
---

# Workflow: fix

1. Understand the Bug
   - Gather all available information:
     - Error messages, stack traces, logs.
     - User reports or bug tickets.
     - Reproduction steps, if provided.
   - Restate the bug in your own words and outline suspected impact.

2. Learn Before Fixing
   - Check for BUG_LOG, LESSONS_LEARNED, or similar files and read relevant entries.
   - Look for past incidents that resemble this bug and note previous fixes or pitfalls.

3. Lovable Architect for Lovable/Supabase Bugs
   - If the bug involves:
     - Lovable pages, flows, or UI components.
     - Supabase queries, schema, RLS, or auth behavior.
     - GitHub ↔ Lovable sync or deployment behavior.
   - THEN:
     - Activate and follow lovable_architect.
     - Use MCP project/schema analysis if available to:
       - Understand current schema, routes, and data flows.
       - Identify which components or queries are likely involved.
     - Identify any database or RLS implications of the bug and its fix.

4. Fix Strategy & Regression Tests
   - Propose a clear fix strategy that:
     - Respects forbidden zones and DB safety.
     - Uses SQL migrations for any schema changes.
   - Design regression tests to:
     - Reproduce the bug.
     - Confirm the fix.
     - Guard against obvious regressions in adjacent behavior.

5. Implement the Fix
   - Apply code changes according to the fix strategy.
   - Add or update tests as designed.
   - Add or update SQL migrations if the fix involves schema changes, including comments and Business Impact.

6. Validate & Document
   - Run or recommend appropriate tests/checks.
   - Verify that the bug is resolved and regression tests pass.
   - Summarize:
     - Root cause.
     - Specific changes made.
     - Migrations added.
     - Any follow-up items or mitigations.
