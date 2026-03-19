---
name: plan
description: "Plan and design changes for the Lovable app with MCP-first analysis and lovable_architect guidance."
---

# Workflow: plan

1. Load Context
   - Read key docs if present: README, docs/architecture/architecture.md, docs/architecture/DECISIONS.md, and any project overview files.
   - Summarize the user request and relevant context in a few bullet points.

2. Optional MCP Project Analysis
   - If the requested change is non-trivial (new feature, major refactor, schema change):
     - Use available MCP tools to analyze the project structure (components, routes, data flows).
     - Capture key findings that affect design and implementation.

3. Lovable Architect Activation
   - If the request involves ANY of:
     - Lovable web app pages or flows.
     - Supabase schema or database changes.
     - GitHub ↔ Lovable sync behavior.
   - THEN:
     - Explicitly activate and follow the lovable_architect skill.
     - Use it to:
       - Identify safe vs forbidden directories/files.
       - Decide whether additional MCP project/schema analysis is needed.
       - Decide which changes must be implemented as SQL migrations under supabase/migrations/.
       - Identify potential high-risk areas (RLS, auth, multi-tenant data).

4. Constraints & Risks
   - Write down:
     - Architectural constraints (forbidden zones, required directories).
     - Database constraints (migrations only, RLS considerations).
     - GitHub/Lovable sync assumptions (branch, remote, deploy flow).
   - Flag any open questions that should be clarified with the user.

5. Implementation Plan
   - Produce a concrete, step-by-step Implementation Plan that:
     - Ties directly back to the user request.
     - Includes file- and directory-level actions where possible.
     - Includes creation of SQL migrations for any schema changes, with notes for Business Impact.
     - Specifies tests to add or update.
   - Keep the plan structured so it can be executed by the build workflow.
