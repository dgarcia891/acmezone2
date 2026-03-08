

## Add Image Editor to Step 4 (Review Designs)

### Approach

We'll integrate a **canvas-based image editor** directly into the Review Designs step. Since we're in a React/Vite environment with no server-side rendering, we'll build a lightweight editor using the HTML5 Canvas API. No heavy external library needed — we'll create a focused `ImageEditor` component.

### Capabilities

| Feature | Implementation |
|---|---|
| **Crop** | Drag handles on a selection rectangle, apply to canvas |
| **Rotate** | 90° CW/CCW buttons + free rotation slider |
| **Resize/Scale** | Width/height inputs with aspect-ratio lock toggle |
| **Draw** | Freehand brush tool with color picker and size slider |
| **Eraser** | Draws with transparent compositing to erase areas |
| **Add Text** | Click to place, editable text with font size/color controls |
| **Brightness/Contrast/Saturation** | CSS filter sliders applied via canvas `filter` property |
| **Undo/Redo** | Canvas state history stack |

### New Files

| File | Purpose |
|---|---|
| `src/components/pod/ImageEditor.tsx` | Main editor component — canvas, toolbar, all editing logic |
| `src/components/pod/editor/EditorToolbar.tsx` | Tool selection bar (crop, draw, text, eraser, adjustments) |
| `src/components/pod/editor/AdjustmentSliders.tsx` | Brightness/contrast/saturation slider panel |
| `src/components/pod/editor/CropOverlay.tsx` | Draggable crop selection rectangle |

### Modified Files

| File | Change |
|---|---|
| `BackgroundRemovalStep.tsx` | Add an "Edit" button on each design card. Clicking opens the `ImageEditor` in a full-width dialog/sheet. On save, the edited image is uploaded to `pod-assets` storage and the idea's URL is updated in the database. |
| `usePodPipeline.ts` | Add a `useUpdateDesignImage` mutation that uploads the edited canvas blob to storage and updates the `sticker_design_url` or `tshirt_design_url` on the idea row. |

### User Flow

```text
Step 4: Review Designs
┌──────────────────────────────┐
│  Sticker (transparent)       │
│  [image preview]             │
│  [Edit] [Drop]               │
└──────────────────────────────┘

User clicks [Edit] →

┌─────────────────────────────────────────────┐
│  Image Editor                          [X]  │
│  ┌─────────────────────────────────────┐    │
│  │ Toolbar: Crop │ Draw │ Eraser │     │    │
│  │          Text │ Adjust │ Rotate     │    │
│  ├─────────────────────────────────────┤    │
│  │                                     │    │
│  │         [Canvas]                    │    │
│  │                                     │    │
│  ├─────────────────────────────────────┤    │
│  │ Undo │ Redo      [Cancel] [Save]    │    │
│  └─────────────────────────────────────┘    │
└─────────────────────────────────────────────┘
```

### Save Flow

1. Export canvas to PNG blob
2. Upload to `pod-assets` storage bucket (same pattern as existing design uploads)
3. Update the idea row's URL column with the new public URL
4. Close editor, refresh preview

### Technical Notes

- Canvas rendering handles transparency (checkerboard background in editor)
- Undo/redo uses a stack of `ImageData` snapshots (capped at 20 for memory)
- Text tool uses `canvas.getContext('2d').fillText()` with a positioned input overlay for editing
- Color adjustments use canvas `filter` property (`brightness()`, `contrast()`, `saturate()`)
- The editor dialog uses the existing `Sheet` component opened from the right for a spacious editing area
- Cross-origin images: since designs are in our own `pod-assets` bucket, CORS is not an issue

