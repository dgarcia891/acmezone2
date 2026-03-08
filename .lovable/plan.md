

## Fix: Color-Aware Variant Filtering Not Matching Printify Color Names

### Root Cause
Printify's catalog variant endpoint returns variant titles in the format `"Color / Size"` (e.g., `"Black / S"`, `"White / XL"`). The current `classifyVariantColor` function does an exact match on the full string against the `DARK_COLORS`/`LIGHT_COLORS` sets, so nothing ever matches.

Additionally, the `options` field may not exist on catalog variants (it's present on product variants, not catalog variants), so the fallback to `v.title` is the primary path — and it's broken.

### Changes

**File: `supabase/functions/pod-send-to-printify/index.ts`**

1. **Fix `classifyVariantColor`** — Extract the color portion from compound titles by splitting on ` / ` and taking the first segment before doing the lookup.

2. **Add fuzzy/partial matching** — Check if any known dark/light color name is contained within the variant color string (handles cases like `"Dark Heather Grey / S"` or unusual Printify naming).

3. **Add debug logging** — Log the extracted color name and classification for each variant so future issues are diagnosable from the edge function logs.

4. **Log variant structure once** — Log the first variant's full JSON structure to confirm the data shape (will help diagnose any future provider-specific differences).

### Updated `classifyVariantColor` logic

```text
function classifyVariantColor(rawName: string): "dark" | "light" | "neutral" {
  // Extract color from "Color / Size" format
  const colorPart = rawName.split(" / ")[0].toLowerCase().trim();
  
  // Exact match first
  if (DARK_COLORS.has(colorPart)) return "dark";
  if (LIGHT_COLORS.has(colorPart)) return "light";
  
  // Partial/contains match (e.g. "dark heather grey" contains "dark")
  for (const dc of DARK_COLORS) {
    if (colorPart.includes(dc) || dc.includes(colorPart)) return "dark";
  }
  for (const lc of LIGHT_COLORS) {
    if (colorPart.includes(lc) || lc.includes(colorPart)) return "light";
  }
  
  return "neutral";
}
```

### Updated filtering section — add debug logs

```text
// Log first variant structure for debugging
if (variantList.length > 0) {
  console.log("Sample variant structure:", JSON.stringify(variantList[0]));
}

// In filterVariantsByColor, log each classification:
console.log(`Variant ${v.id}: color="${colorName}" → extracted="${colorPart}" → ${category}`);
```

This is a targeted fix to the matching logic — no structural changes needed.

