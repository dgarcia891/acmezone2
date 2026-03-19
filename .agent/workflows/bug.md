---
description: 🐞 Fix a bug using the Strict Test-Driven Protocol.
---
# 🐞 Bug Fix Protocol (v4.8)

1. **Log:** Update docs/BUG_LOG.md.
2. **Isolate:** Create tests/regression/BUG-[ID].test.ts.
3. **Prove:** Run the test. **IT MUST FAIL**.
4. **Review (Critic Agent, under v6.5 Unified Orchestrator):**
   - SPAWN: `Review Agent` in Planning mode with this task:
     - "Review the bug description, relevant BUG_LOG / LESSONS_LEARNED entries, the regression test(s), and the proposed fix strategy.
      Under the Core Constitution, check for:
      - Repeating previously failed approaches from BUG_LOG/LESSONS_LEARNED
      - Missing or incomplete regression coverage
      - Impact on related modules or surfaces (web, extension, shared)
      - Risky side-effects (data, security, performance) not addressed in the plan
      Output a short list of corrections or confirm that the fix plan is sound."
   - The Review Agent MUST NOT directly modify code or tests in this step; it only comments on the plan and tests.
   - The existing Two-Strike behavior (Attempt 1/Attempt 2 + Research Agent) remains in effect.
5. **Lovable Architect for Lovable/Supabase bugs:**
   - If the bug involves:
     - Lovable pages or flows,
     - Supabase queries, RLS policies, or auth,
     - GitHub ↔ Lovable sync issues,
     THEN:
     - Activate `lovable_architect`.
     - Use its MCP-first recommendations (e.g., `analyze_database_schema`, project analysis) to:
       - Understand current schema and policies.
       - Identify potential side effects of the fix.
   - Incorporate these findings into:
       - The regression test design.
       - The chosen fix approach.
   - Do not violate forbidden zones or DB safety rules defined by the skill.
6. **Fix:** Implement logic.
7. **Verify:** Run test. It must PASS.
