

## Fix: Show Transparent Designs in Finalize Step

### Problem
The "Select Products to Publish" section in `WizardListingsStep` displays design images on a solid gray (`bg-muted`) background, making it impossible to see whether backgrounds have been removed. The designs shown here ARE the transparent versions (confirmed in DB — `sticker_design_url` and `tshirt_design_url` point to the post-removal files), but the gray card background masks the transparency.

### Database Confirmation
For idea `d047911f`, the `sticker_raw_url` and `tshirt_raw_url` (with `-raw` suffix) are distinct from the `_design_url` fields, confirming background removal did run. The `_design_url` fields (which are what gets sent to Printify) contain the transparent versions. The visual confusion is purely a display issue.

### Fix (1 file: `WizardListingsStep.tsx`)

1. **Add checkerboard background** to the design preview images in both the "Select Products to Publish" section (lines 235-258) and "Completed Designs" section (lines 276-298), using the same checkerboard CSS pattern already used in `BackgroundRemovalStep.tsx`.

2. **Changes**:
   - Define `checkerboardStyle` constant (same as in `BackgroundRemovalStep.tsx`)
   - Apply it to the `<img>` wrapper divs so transparency is clearly visible
   - This affects only the display — no change to what gets sent to Printify (already uses the correct transparent URLs)

