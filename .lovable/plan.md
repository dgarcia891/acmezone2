

## Support Multiple Images in IdeaInputForm

### What Changes

Currently the form supports a single optional image. We need to support **multiple images** so that when creating a variant, the original image is pre-loaded AND the user can add more images (or remove the original).

### Changes Required

| File | Change |
|---|---|
| `IdeaInputForm.tsx` | Replace single-image state (`imagePreview`, `imageBase64`, `imageMediaType`) with an **array of image objects**. Show all images as thumbnails with individual X buttons. Keep the upload drop zone visible below the thumbnails so users can always add more. Pre-load the variant's source image into the array on mount. Update `onSubmit` to send the array. |
| `PodPipeline.tsx` | Update `handleAnalyze` to accept `images` array instead of single `image_base64`/`image_media_type`. Pass the first image (or all) to the edge function. |
| `supabase/functions/pod-analyze/index.ts` | Accept `images` array (each with `base64` and `media_type`). Push all images into the AI `userContent` array so the model sees them all during analysis. |

### UI Layout

```text
Image (optional)
┌──────────┐  ┌──────────┐  ┌─────────────────────────┐
│  img 1   │  │  img 2   │  │  + Drag & drop or click  │
│    [X]   │  │    [X]   │  │    to add more images    │
└──────────┘  └──────────┘  └─────────────────────────┘
```

- Each image thumbnail has its own X button to remove it
- The upload zone is always visible (not hidden when images exist)
- Variant flow: original image appears as the first thumbnail, user can remove it or add alongside it

### Data Shape Change

```typescript
// Before
onSubmit: (data: { idea_text: string; image_base64?: string; image_media_type?: string; product_type: string }) => void;

// After
onSubmit: (data: { 
  idea_text: string; 
  images?: Array<{ base64: string; media_type: string }>; 
  product_type: string 
}) => void;
```

### Backend Change

The edge function will loop over the `images` array and push each as an `image_url` content block to the AI model, so all reference images are visible during analysis. For backward compatibility, it will also accept the old `image_base64`/`image_media_type` fields.

