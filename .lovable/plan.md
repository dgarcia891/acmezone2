

# Plan: Unify Kanban Board + Wizard into Single Flow

## Problem
Currently there are two separate ways to interact with ideas: the Kanban board (view/manage) and the "New Idea" wizard (create/generate). Clicking a card on the Kanban opens a detail sheet, but you can't re-enter the wizard steps for that idea. The two modes are disconnected and confusing.

## Solution
Eliminate the separate "New Idea" view toggle. Instead:
1. **Kanban is always the home view** (plus Settings)
2. **"+ New Idea" becomes a button** on the board that enters the wizard
3. **Clicking any Kanban card opens the wizard** at the correct step based on the idea's status
4. **Completing or closing the wizard returns to the Kanban**
5. **Remove the IdeaDetailSheet** — the wizard replaces it entirely

## Status → Wizard Step Mapping

| Idea Status | Wizard Step | What the user sees |
|---|---|---|
| *(new idea, no ID)* | `input` | Idea input form |
| `pending` (analyzed) | `review` | Analysis review with Generate button |
| `designing` / `analyzed` / `designs_generated` | `generate` | Design generation with regenerate/approve |
| `listings` | `listings` | Listing editor (new step) |
| `ready` / `production` / `live` | `summary` | Read-only summary with action buttons |

## Changes

### 1. `PodPipeline.tsx` — Restructure view modes
- Remove `"new"` from ViewMode — only `"board"` and `"settings"` remain
- Add state: `wizardIdea` (the idea being edited, or `null` for new)
- Add state: `wizardOpen` (boolean)
- When `wizardOpen` is true, show the wizard instead of the board
- Add a `+ New Idea` button in the header that sets `wizardOpen=true, wizardIdea=null`
- Pass an `onCardClick` handler to KanbanBoard that sets `wizardIdea` and `wizardOpen=true`
- Derive the initial `step` from the idea's status using the mapping above
- On wizard close/reset → set `wizardOpen=false`

### 2. `KanbanBoard.tsx` — Remove IdeaDetailSheet, bubble clicks up
- Accept an `onCardClick` prop from parent instead of managing its own sheet
- Remove `IdeaDetailSheet` import and usage
- Remove `selectedIdea` and `sheetOpen` state

### 3. `PipelineStepIndicator.tsx` — Add `listings` and `summary` steps
- Expand the steps array to include the two new stages so the wizard covers the full lifecycle

### 4. New: Listings step in the wizard (`PodPipeline.tsx`)
- After "Approve Design" generates listings, move to a `listings` step
- Show `ListingEditor` for each listing with approve/regenerate buttons (logic currently in IdeaDetailSheet)
- On approve listings → move to `summary` step

### 5. New: Summary step (lightweight)
- Shows the idea status, designs, listing links, and action buttons (Send to Printify, Mark as Live)
- "Back to Board" button closes the wizard

### 6. Delete `IdeaDetailSheet.tsx`
- All its functionality is absorbed into the wizard flow

## Result
- One unified flow: Board → click card or "+ New" → Wizard (auto-positioned at correct step) → back to Board
- No more confusion between two separate interaction patterns

