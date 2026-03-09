

## Per-Idea Profit Margins & Color Variant Selection

### Current State

**Profit Margins:**
- Set globally in POD Settings (with per-shop overrides)
- Applied uniformly to all ideas at publish time
- Users see a pricing preview in the Finalize step but can't adjust margins

**Product Variant Colors:**
- T-shirt colors are automatically filtered by AI analysis in `pod-send-to-printify`
- System analyzes design brightness (dark/light/medium) and disables clashing colors
- No user control over which colors to include/exclude
- Example: A dark design auto-disables black, navy, and other dark t-shirt colors

### Problem

Both settings are global, but different products need different treatment:
- **Margins:** Premium designs, seasonal sales, or test runs need custom pricing
- **Colors:** Sometimes the AI gets it wrong, or you want specific colors for branding/testing

### Proposed Solution

Add per-idea configuration in the **Finalize step** with smart defaults from global settings:

**1. Margin Overrides Section**
- Card in the Finalize step showing per-shop margins (inherited from global by default)
- Inline numeric inputs to override margins for this specific idea
- Visual indicator showing: "Using default 100%" vs "Custom 150%"
- Updates the pricing preview table in real-time

**2. Color Variant Selection Section**
- Card showing available t-shirt colors from Printify (fetched from catalog)
- Checkboxes for each color with preview swatches
- Pre-selected based on AI analysis (with visual badge showing "AI Recommended")
- Manual override: uncheck AI recommendations or add colors AI excluded
- Not shown for stickers (stickers use all colors by default)

### Technical Implementation

**Database Changes:**
- Add `az_pod_idea_overrides` table:
  ```sql
  - id uuid primary key
  - idea_id uuid (FK to az_pod_ideas)
  - shop_id text
  - tshirt_margin_pct int (nullable, overrides global)
  - sticker_margin_pct int (nullable, overrides global)
  - tshirt_color_overrides jsonb (array of enabled variant IDs)
  - created_at, updated_at
  ```

**Edge Function: `pod-send-to-printify/index.ts`**
- Fetch idea-specific overrides before creating products
- Use idea margins if set, otherwise fall back to shop/global margins
- Use explicit color selections if set, otherwise use AI analysis
- Preserve existing AI analysis as a recommendation layer

**UI Changes:**

1. `WizardListingsStep.tsx` — Add before "Select Products to Publish" card:
   - **Margin Overrides Card:** Per-shop inputs with "Reset to default" buttons
   - **Color Selection Card (T-shirts only):** Grid of color checkboxes with swatches, badge showing AI recommendation
   
2. New hooks:
   - `useIdeaOverrides(ideaId)` — Fetch overrides for idea
   - `useSaveIdeaOverrides()` — Persist margin/color overrides
   - `useFetchVariantColors(blueprintId, providerId)` — Get available colors from Printify

**User Flow:**

1. User reaches Finalize step
2. Sees pricing preview with current margins (global defaults)
3. Opens "Customize Pricing" section → adjusts margins per shop → pricing table updates
4. Opens "Customize Colors" section → sees AI-recommended colors pre-selected → manually toggles colors → see color count update
5. Clicks "Send to Printify" → products created with custom margins and selected colors
6. Can revisit idea later (board view) → margins and colors preserved for future republishing

### Benefits

- **Per-idea control:** Different margins for different products
- **Color flexibility:** Override AI when it gets it wrong, enforce brand colors
- **Smart defaults:** Still uses global settings if no overrides, so existing workflow unchanged
- **Transparent:** Users see exactly what margins and colors will be used before publishing

