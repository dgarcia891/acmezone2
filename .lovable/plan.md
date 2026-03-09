

## T-Shirt Color Preview — Design on Selected Backgrounds

### What We're Building

After the color selection checkboxes, add a visual preview grid showing the actual t-shirt design composited on each **selected** color's background. This gives an instant "what will it look like on a black shirt vs. white shirt" preview before publishing.

### UI Design

Below the color checkbox grid (line ~634), add a new section:

```text
┌──────────────────────────────────────────────┐
│  Color Previews (3 selected)                 │
│                                              │
│  ┌─────────┐  ┌─────────┐  ┌─────────┐      │
│  │ [design] │  │ [design] │  │ [design] │    │
│  │ on white │  │ on black │  │ on navy  │    │
│  │ bg       │  │ bg       │  │ bg       │    │
│  └─────────┘  └─────────┘  └─────────┘      │
│   "White"      "Black"      "Navy"           │
└──────────────────────────────────────────────┘
```

- Responsive grid: 2 cols mobile, 3 cols tablet, 4 cols desktop
- Each preview: square container with the background color filled solid, design image overlaid with `object-contain` and some padding (~10-15%)
- Color name label below each preview
- Only shows previews for **checked** colors (updates live as you toggle)
- Uses the transparent design URL (`tshirt_design_url`) for clean compositing; falls back to `tshirt_raw_url` if transparent isn't available
- Reuses the existing `swatchForColorName()` function for background colors
- Limit to max ~12 previews with a "showing X of Y" note if many colors are selected

### Technical Approach

**Pure CSS compositing** — no canvas needed:
- Container `div` with `backgroundColor` set to the swatch color
- Design `img` layered on top with `object-contain` + padding
- No new dependencies, no new API calls, no database changes

### Files Changed

1. **`src/components/pod/WizardListingsStep.tsx`** — Add the preview grid section after line ~634 (after color checkboxes, before the "Select Products to Publish" card). Approximately 40-50 lines of JSX.

No backend, database, or hook changes needed.

