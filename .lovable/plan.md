

## Add "Create Variant" Feature with Image Carry-Over

### What It Does
Adds a "Create Variant" button on the Finalize step for ideas in `production`, `live`, or `ready` status. When clicked, it opens a new wizard at Step 1 with the source idea's text, product type, and **image pre-loaded** (fetched from the source idea's `image_url` and converted to base64, as if the user uploaded it).

### Changes Required

| File | Change |
|---|---|
| `IdeaInputForm.tsx` | Add optional `defaultValues` prop: `{ idea_text, product_type, image_url }`. On mount, if `image_url` is provided, fetch it, convert to base64, and populate the image preview/base64/mediaType state. Pre-fill `ideaText` and `productType` from defaults. |
| `PodPipeline.tsx` | Add `variantDefaults` state. Add `handleCreateVariant(idea)` that captures `idea_text`, `product_type`, and `image_url` from the source idea, closes the current wizard, then re-opens at Step 1 with defaults. Pass `variantDefaults` to `IdeaInputForm`. Pass `onCreateVariant` to `WizardListingsStep`. |
| `WizardListingsStep.tsx` | Add `onCreateVariant` to Props. Render a "Create Variant" button (Copy icon) in the action bar, visible when idea status is `production`, `ready`, or `live`. |

### Image Handling Detail

When `IdeaInputForm` receives a `defaultValues.image_url`:
1. Fetch the image URL using `fetch()` (it's a public storage URL)
2. Read the response as a blob, then convert to base64 via `FileReader`
3. Set `imagePreview`, `imageBase64`, and `imageMediaType` from the blob's type
4. User sees the image pre-loaded and can remove/replace it before submitting

This means the image goes through the exact same `image_base64` + `image_media_type` submission path as a manually uploaded image --- no special handling needed on the backend.

### UX Flow

1. User opens a Production/Live idea from the Kanban board
2. Clicks **"Create Variant"** in the Finalize step action bar
3. Wizard resets to Step 1 with text pre-filled, product type pre-selected, and source image shown in the preview area
4. User tweaks text/image if desired, clicks "Analyze Idea" --- a brand new independent idea is created

