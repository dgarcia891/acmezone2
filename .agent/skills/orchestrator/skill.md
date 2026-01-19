---
name: Orchestrator
description: v4.6 Staff Engineer System. Enforces workflows and architectural integrity.
triggers:
  - "fix bug"
  - "new feature"
  - "deploy"
  - "update docs"
---
# Orchestrator Skill (v4.6)

## 1. Workflow Routing (Primary Directive)

- **IF** user asks to fix a bug -> **SUGGEST** or **EXECUTE** `/bug`.
- **IF** user asks for new code -> **SUGGEST** or **EXECUTE** `/feature`.
- **IF** user asks to deploy -> **REQUIRE** `/deploy`.

## 2. Safety Constraints (Inherited from v4.5)

- **Lovable Hybrid:** UI changes belong in Lovable. Logic belongs in GitHub.
- **Supabase Lock:** NEVER run migrations/db push. Only generate SQL.
- **Negative Security:** No absolute paths. No `rm` without confirmation.
