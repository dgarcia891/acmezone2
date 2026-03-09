

## Make Spreadshirt Export (and non-Printify sections) Collapsible with Persistent State

### Approach
Wrap the Spreadshirt Export section in an accordion/collapsible component. Store the expanded/collapsed state in `localStorage` so it persists across sessions.

### Changes

**`src/components/pod/SpreadshirtExport.tsx`**
- Wrap the entire Card in a `Collapsible` from Radix UI (already installed)
- Add a toggle button (chevron) in the card header
- Read initial open/closed state from `localStorage` key `pod-spreadshirt-expanded`
- On toggle, persist the new state to `localStorage`
- Default to collapsed (`false`) since it's a secondary export option

**`src/components/pod/WizardListingsStep.tsx`**
- No changes needed — SpreadshirtExport handles its own collapsible state internally

### Technical Details
- Use `@radix-ui/react-collapsible` (already in dependencies via shadcn `collapsible.tsx`)
- `localStorage.getItem("pod-spreadshirt-expanded")` on mount
- `localStorage.setItem(...)` on toggle
- Chevron icon rotates based on open state

