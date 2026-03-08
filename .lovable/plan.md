

## Smart Color-Aware Variant Selection for Printify

### Problem
When publishing t-shirt designs to Printify, all color variants are enabled indiscriminately. A predominantly black design on a black t-shirt is invisible; same for white-on-white. The system should analyze the design's dominant colors and automatically exclude clashing variants.

### Approach

**Edge Function: `pod-send-to-printify/index.ts`**

1. **Analyze design dominant color** — Before creating the product, fetch the design image as raw pixels. Use a simple server-side approach: decode the PNG via a lightweight library or canvas API available in Deno, sample pixels, and compute the dominant luminance/color bucket (dark, light, mid, colored).

2. **Fetch variant color metadata** — Printify's variant endpoint returns color info per variant (e.g., `options.color`). Cross-reference the design's dominant color against each variant's color name/hex to determine clashes.

3. **Disable clashing variants** — Instead of enabling all variants, set `is_enabled: false` for variants whose color is too close to the design's dominant color. For example:
   - Dark design (avg luminance < 80) → disable Black, Dark Heather, Navy
   - Light design (avg luminance > 200) → disable White, Natural, Sport Grey
   - Keep a safe middle range always enabled

4. **Store recommendation** — Save the color analysis result on the listing or idea so the UI can display it.

**New helper: color analysis**

Since we're in Deno and can't use Canvas easily, we'll create a lightweight approach:
- Fetch the image URL as bytes
- Use a minimal PNG decoder or call the Lovable AI vision model to describe dominant colors (simpler, already available)
- Actually, the most reliable and simplest approach: use the AI gateway with a vision model to analyze the image and return dominant color info as structured JSON. This avoids any image decoding complexity.

**Revised approach — AI-powered color analysis:**

Add a function in `pod-send-to-printify` that, for t-shirt product types:
1. Calls the AI gateway with the design image URL asking: "What are the dominant colors of this design? Is it predominantly dark, light, or colorful? Return JSON with `dominance: 'dark' | 'light' | 'medium'` and `dominant_colors: string[]`"
2. Maps Printify variant colors to dark/light/medium categories using a lookup table of common Printify color names
3. Disables variants that clash

**Frontend: `WizardListingsStep.tsx`**

- Show a small info badge/note like "🎨 Auto-excluded 5 dark variants (design is predominantly dark)" in the Printify results section
- No additional UI controls needed — this is automatic smart behavior

### Changes

| File | Change |
|------|--------|
| `supabase/functions/pod-send-to-printify/index.ts` | Add `analyzeDesignColors()` helper using AI vision. Add `DARK_COLORS` / `LIGHT_COLORS` lookup sets for Printify color names. Filter `is_enabled` on variants based on analysis. Include analysis in response. |
| `src/components/pod/WizardListingsStep.tsx` | Display color analysis note when Printify results include excluded variants info |

### Color Classification Lookup (for Printify variant colors)

```text
DARK_COLORS: Black, Dark Heather, Navy, Dark Grey, Forest Green, Maroon, Dark Chocolate
LIGHT_COLORS: White, Natural, Sport Grey, Light Blue, Light Pink, Sand, Ash
```

### Variant Filtering Logic

```text
if design_dominance == "dark":
    disable variants where color ∈ DARK_COLORS
elif design_dominance == "light":
    disable variants where color ∈ LIGHT_COLORS
else:
    enable all (medium/colorful designs work on most colors)

Always keep at least 3 variants enabled as fallback.
```

### Edge Cases
- Stickers: Skip color analysis (no garment color concern)
- If AI analysis fails: Fall back to enabling all variants (current behavior)
- If all variants would be disabled: Keep the 3 most contrasting ones enabled

