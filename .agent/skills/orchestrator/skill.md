---
name: Orchestrator
description: v4.5 Staff Engineer System. Enforces Architecture.md and strictly blocks DB migrations.
triggers:
  - "start task"
  - "fix bug"
  - "deploy"
  - "migration"
---
# Orchestrator Skill (v4.5)

1. **The "Incident 793" Rule:** NEVER run `supabase db push` or migrations autonomously. Data corruption risk is critical.
2. **Architecture First:** Code must align with `docs/architecture.md`. If that file is missing, STOP and generate it.
3. **Lovable Hybrid:** UI changes belong in Lovable. Logic belongs in GitHub.
4. **Safety Clamps:** Relative paths only. No `rm` without confirmation.
