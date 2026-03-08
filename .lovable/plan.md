

## Save MerchFlow PRD as a Standalone Document

The PRD and technical design document will be saved as a markdown file in your project's `docs/` folder. You can then copy its contents and paste it as the first prompt in a brand-new Lovable project to build MerchFlow as a completely independent website — no Acme.zone pages, routes, or branding.

### What gets saved
A single file `docs/MERCHFLOW_PRD.md` containing:
- The full PRD (vision, pricing, user journey, page structure)
- Complete database schema SQL (ready to run as migrations)
- All 7 edge function specifications with exact prompts and API patterns
- Frontend architecture and component breakdown
- The "one-prompt build instructions" section at the end, designed to be pasted directly into a new Lovable project chat

### Minor adjustments for standalone context
- Remove any references to Acme.zone or existing project structure
- Ensure the document is fully self-contained (no "see current codebase" references)
- Add a brief "How to use this document" header explaining: create a new Lovable project, paste the Section 3 build instructions as your first prompt, then iterate

### Implementation
One file creation: `docs/MERCHFLOW_PRD.md`

