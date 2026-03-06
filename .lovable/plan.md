

# Plan: Add Remove.bg Background Removal to Design Generation

## What Changes

**Single file**: `supabase/functions/pod-generate-designs/index.ts`

### 1. Improve AI Prompts
- **T-shirt prompt**: Request isolated artwork on a **solid pure white (#FFFFFF) background** — no mockups, no fabric, no frames, no checkered patterns
- **Sticker prompt**: Same approach — artwork on solid white background, clean edges

### 2. Add Remove.bg Post-Processing Step
After the AI generates an image (base64), before uploading to storage:
1. Decode the base64 image to binary
2. Send it to the **Remove.bg API** (`https://api.remove.bg/v1.0/removebg`) using the existing `REMOVE_BG_API_KEY` secret
3. Receive back a transparent PNG
4. Upload the transparent PNG to storage

### 3. Fallback Behavior
- If Remove.bg fails (rate limit, API error, key missing), log a warning and upload the original image as-is (current behavior preserved)
- The user still gets a design, just without background removal

### 4. Force PNG Format
- Always save as `.png` with `content-type: image/png` to preserve alpha transparency

### Flow Summary

```text
AI generates image (white bg)
        │
        ▼
  Remove.bg API call
        │
   ┌────┴────┐
   │ Success  │  Failure
   ▼          ▼
 transparent  original
   PNG        image
   │          │
   └────┬─────┘
        ▼
  Upload to pod-assets
```

No database changes, no new secrets, no UI changes needed.

