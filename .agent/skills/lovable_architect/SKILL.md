---
name: lovable_architect
description: "Lovable-native architecture, Supabase safety, MCP-first analysis, and GitHub sync discipline."
triggers: ["lovable", "supabase", "mcp", "ui", "database", "github", "sync"]
---
# Lovable Architect Skill

## 1. Surfaces & Boundaries

1. **Web frontend surface:**
   - Primary editable surface is `src/*` (or `web/src/*`) for the Lovable web app.
   - All changes must remain compatible with the existing framework, build tooling, and Lovable’s expectations.

2. **Forbidden zones (do NOT touch):**
   - Auto-generated integration code such as `src/integrations/supabase/*` or equivalent generated Supabase client code.
   - Lovable-managed config or metadata files under `.lovable/*`, unless the user explicitly asks to change them.
   - Any other workspace-specific “do not edit” directories once identified (e.g., generated code folders).

3. **Docs & decisions:**
   - When they exist, treat files like `docs/architecture/architecture.md` and `docs/architecture/DECISIONS.md` as the canonical place to record major architectural changes.
   - Propose updates to these docs for big structural changes (new major flows, large refactors, or schema changes).

## 2. MCP-First Analysis

4. **Project scan before big moves:**
   - For any non-trivial feature, refactor, or bugfix:
     - Use available MCP tools (e.g., project analysis endpoints) to understand the current component tree, routes, and data flows.
     - Summarize the key findings before proposing changes.

5. **Schema awareness:**
   - When database changes are involved:
     - Use schema analysis tools (e.g., an MCP like `analyze_database_schema`) to understand current tables, relations, and RLS policies where possible.
     - Identify which tables and columns are impacted and how.

## 3. Supabase & Database Safety

6. **Dead-drop migration pattern:**
   - Never apply schema changes directly from the agent environment.
   - Represent each schema change as a timestamped SQL migration file under `supabase/migrations/`.
   - Each migration must:
     - Include comments describing the purpose.
     - Include a Business Impact classification: Destructive, Risky, or Safe.
     - Be referenced in the chat or workflow summary so a human or CI can apply it.

7. **RLS & security awareness:**
   - When changing tables involved in authentication, authorization, or tenant boundaries:
     - Explicitly note which RLS policies may be affected.
     - Call out any required RLS updates or review steps in the migration comments and the plan.

8. **No inline secrets:**
   - Never introduce Supabase service role keys or other secrets directly into source files.
   - Enforce environment variables and configuration patterns already used by the project.

## 4. GitHub + Lovable Sync Discipline

9. **Git remote & branch assumptions:**
   - Assume the git remote is connected to the Lovable app’s GitHub repository unless the user states otherwise.
   - Assume `main` (or the repo’s default branch) is the Lovable sync branch.

10. **Deploy preconditions:**
    - Before recommending `git push` or describing a deploy:
      - Require tests to pass (e.g., `npm test` or the project’s main test command).
      - Run or assume required code quality checks (e.g., `npm run lint`, `npm run scan`) if they exist.
      - Ensure any DB changes are covered by SQL migrations.

11. **Versioning & releases:**
    - Prefer using existing release or deploy scripts (e.g., `npm run release`) over manual version bumps, so tags and versions remain aligned with Lovable and CI/CD expectations.

## 5. UI & DX Guidelines

12. **UI consistency:**
    - Prefer existing design systems and component libraries over ad hoc components.
    - Respect the app’s responsive behavior and dark/light mode patterns.

13. **Lovable preview compatibility:**
    - Ensure new flows are reachable through normal navigation paths Lovable previews use.
    - Avoid changes that break Lovable’s agent or visual editor flows unless explicitly requested.

14. **Developer experience:**
    - Keep code changes clean, readable, and well-structured.
    - Add or update comments where behavior might be surprising.

## 6. Escalation & Asking for Help

15. **Configuration ambiguity:**
    - If Lovable, Supabase, or GitHub configuration appears missing, inconsistent, or contradictory:
      - Pause implementation.
      - Clearly describe the issue and propose a remediation plan (e.g., add missing config, normalize environment variables).

16. **Multiple viable architectures:**
    - When there are several plausible architectural options:
      - Present concise options with tradeoffs.
      - Ask the user to choose rather than guessing.

17. **High-risk changes:**
    - Treat large schema changes, migration rewrites, or auth-related modifications as high risk.
    - Call them out explicitly and recommend careful review before deployment.
