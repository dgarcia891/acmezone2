---
name: deploy
description: "Prepare and validate a deploy for the Lovable app with lovable_architect pre-deploy checks."
---

# Workflow: deploy

1. Scope the Deploy
   - Identify the set of changes intended for this deploy (commits, branches, or specific features).
   - Summarize the main features/bug fixes included.

2. Quality Gates
   - Run or ensure the following checks (if available in the project):
     - Test suite (e.g., npm test or equivalent).
     - Lint/scan scripts (e.g., npm run lint, npm run scan).
     - Drift or schema checks if present.
   - Note any failures and what would be required to resolve them.

3. Lovable Architect Pre-Deploy Check
   - If this repo is connected to Lovable or uses Supabase/GitHub for the Lovable app:
     - Activate and follow lovable_architect.
     - Verify:
       - All database changes are represented as SQL migration files under supabase/migrations/ with comments and Business Impact labels.
       - No forbidden Lovable zones (generated integration code, protected config) were modified as part of this deploy.
       - Git remote(s) point to the correct Lovable-connected GitHub repository.
       - The target branch (e.g., main) is appropriate for Lovable sync.
   - If any violations, risky migrations, or potential breaking changes are found:
     - Stop and clearly report them instead of proceeding.

4. Deploy Plan
   - Based on checks and lovable_architect validation, outline the recommended deploy sequence, for example:
     - Apply database migrations in a safe environment.
     - Verify app health checks or smoke tests.
     - Push to the target branch.
   - Highlight any steps that must be performed manually by a human or external system.

5. Post-Deploy Considerations
   - Suggest basic post-deploy verification (key flows to test in Lovable preview).
   - Note any metrics or logs that should be monitored closely after deploy.
