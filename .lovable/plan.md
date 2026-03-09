

# Add Spreadshirt Export Support to POD Pipeline

## Overview
Add a dedicated Spreadshirt export panel to the Finalize step that provides:
1. **Copy-to-clipboard helpers** for listing metadata (title, description, tags)
2. **Download buttons** for properly-sized design images (4000×4000px PNG)
3. **CSV metadata export** for bulk upload compatibility

## Technical Details

### Spreadshirt Requirements
- **Image**: PNG/JPG, max 4000×4000px, RGB color mode, ≤10MB
- **Title**: Up to 50 characters recommended
- **Description**: Standard product description
- **Tags**: Comma-separated keywords

### Changes

#### 1. New Component: `SpreadshirtExport.tsx`
Creates a card with:
- Platform info header with Spreadshirt branding
- Per-design section (sticker/t-shirt) with:
  - Image preview thumbnail
  - "Download for Spreadshirt" button (resizes to 4000×4000)
  - Copy buttons for Title, Description, Tags (formatted for Spreadshirt)
- "Download All as ZIP" button (images + metadata.csv)

#### 2. Edge Function: `pod-export-spreadshirt/index.ts`
Handles server-side image resizing:
- Accepts design URL + target dimensions
- Returns resized image as base64 or redirects to resized URL
- Uses canvas-based resize or sharp library

#### 3. Update `WizardListingsStep.tsx`
- Add Spreadshirt export section below "Publishing To" section
- Only visible when idea has approved listings
- Conditionally renders for sticker/t-shirt based on what exists

#### 4. CSV Format for Bulk Upload
```csv
title,description,tags,image_filename
"My Design Title","Product description...","tag1,tag2,tag3",sticker_design.png
```

### Files to Create/Modify
| File | Action |
|------|--------|
| `src/components/pod/SpreadshirtExport.tsx` | Create |
| `src/components/pod/WizardListingsStep.tsx` | Add import + render |
| `supabase/functions/pod-export-image/index.ts` | Create (image resize) |

### UI Wireframe
```text
┌─────────────────────────────────────────────────┐
│ 📦 Export to Spreadshirt                        │
├─────────────────────────────────────────────────┤
│ ┌─────┐  Sticker Design                         │
│ │ img │  [Copy Title] [Copy Desc] [Copy Tags]   │
│ └─────┘  [Download PNG (4000×4000)]             │
├─────────────────────────────────────────────────┤
│ ┌─────┐  T-Shirt Design                         │
│ │ img │  [Copy Title] [Copy Desc] [Copy Tags]   │
│ └─────┘  [Download PNG (4000×4000)]             │
├─────────────────────────────────────────────────┤
│ [Download All + CSV]                            │
└─────────────────────────────────────────────────┘
```

## Scope
- 2 new files, 1 file modified
- ~300 lines of new code
- No database changes required

