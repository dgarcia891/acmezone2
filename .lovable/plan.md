

## Kanban Board: Full-Width Layout + Image Previews on Cards

### Changes

**1. Full-width board layout**

Currently the board is inside a `container mx-auto max-w-7xl` wrapper (line 339 of `PodPipeline.tsx`). The columns are fixed at `w-[280px]`. Two changes:

- **`PodPipeline.tsx`**: When showing the board view, remove the `max-w-7xl` constraint and use full-width padding instead, so columns stretch edge-to-edge.
- **`KanbanColumn.tsx`**: Change columns from fixed `w-[280px]` to `flex-1 min-w-[220px]` so they expand equally to fill available space.
- **`KanbanBoard.tsx`**: Remove `min-w-max` from the flex container so columns don't force horizontal scroll when they can fit.

**2. Show design images prominently on cards**

Currently `KanbanCard.tsx` shows a tiny 40x40px thumbnail in the corner. Update to:

- Collect all available images: `sticker_design_url`, `tshirt_design_url`, `image_url` (reference image)
- If images exist, render them in a row above the text content at a larger size (e.g. `h-20 w-full object-cover rounded`)
- If multiple images, show them side-by-side in a grid (2-up)
- Keep the existing text, score badge, priority dot, and timestamp below

### Files Changed

| File | Change |
|------|--------|
| `src/pages/PodPipeline.tsx` | Remove `max-w-7xl` for board view, use wider container |
| `src/components/pod/KanbanColumn.tsx` | `flex-1 min-w-[220px]` instead of fixed `w-[280px]` |
| `src/components/pod/KanbanBoard.tsx` | Remove `min-w-max` so columns fill available width |
| `src/components/pod/KanbanCard.tsx` | Add image preview row above text showing all design images at a glance |

