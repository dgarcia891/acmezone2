

## Collapsible Kanban Columns (Trello-style)

### What it does
Each Kanban column gets a collapse toggle. When collapsed, the column shrinks to a narrow ~40px strip showing the emoji, label rotated vertically, and card count badge. Clicking the strip expands it back to full width.

### Changes

**`src/components/pod/KanbanColumn.tsx`**
- Add `collapsed` and `onToggleCollapse` props
- When collapsed, render a narrow clickable strip (~40px wide) with:
  - Emoji at top
  - Label text rotated 90° via `writing-mode: vertical-rl` (CSS)
  - Badge count at bottom
  - Same `min-h` as expanded columns for visual consistency
  - Still acts as a droppable target so drag-and-drop works
- When expanded, render current layout with a small collapse button (e.g., `ChevronsLeft` icon) in the column header

**`src/components/pod/KanbanBoard.tsx`**
- Add `collapsedColumns` state: `Record<string, boolean>` defaulting all to `false`
- Pass `collapsed` and `onToggleCollapse` callback to each `KanbanColumn`
- Toggle updates the state for that column's status key

### Collapsed column visual (ASCII)

```text
┌──┐  ┌────────280px────────┐  ┌──┐
│📥│  │ 🎨 Designing    [3] │  │📝│
│  │  │                     │  │  │
│N │  │  [card]             │  │L │
│e │  │  [card]             │  │i │
│w │  │  [card]             │  │s │
│  │  │                     │  │t │
│[2]│  │                     │  │[0]│
└──┘  └─────────────────────┘  └──┘
 40px       expanded            40px
```

No other files need changes.

