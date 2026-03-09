

# Show T-Shirt Designs on Color Background Instead of Checkerboard

## Problem
The "Select Products to Publish" and "Completed Designs" cards display T-shirt designs on a checkerboard transparency pattern. The user expects to see designs rendered on a representative shirt color (e.g., white or the first selected variant color), similar to the "Color Previews" section that already works correctly.

## Changes

### File: `src/components/pod/WizardListingsStep.tsx`

**1. Determine a representative background color for T-shirt previews**
- Use the first selected variant color from `tshirtVariantIds` / `colorsByName` if available
- Fall back to white (`#FFFFFF`) when no variant data is loaded yet
- Keep checkerboard for sticker previews (transparency matters there)

**2. Update "Select Products to Publish" T-shirt preview (line ~781)**
- Replace `style={checkerboardStyle}` with `style={{ backgroundColor: representativeColor }}` for the T-shirt card
- Add `p-[12%]` padding to match the Color Previews layout (design shouldn't touch edges)

**3. Update "Completed Designs" T-shirt preview (line ~813)**
- Same change: swap checkerboard for the representative color background
- Sticker previews remain on checkerboard

**Result**: T-shirt designs will display on a realistic shirt-color background across all preview sections, matching the existing Color Previews behavior. Sticker previews keep the checkerboard since transparency is meaningful for stickers.

