

## Combine Steps 5 & 6: "Listings" + "Summary" → Single "Finalize" Step

### Current State

- **Step 5 (Listings)**: Shows AI-generated listing content (titles, descriptions, tags) with edit/regenerate capability. "Approve Listings" button advances to Step 6.
- **Step 6 (Summary)**: Shows idea summary, design selection checkboxes, per-shop publish/draft toggles, "Send to Printify" button, and post-publish results (mockups, Mark as Live).

These two steps share context and forcing an extra click between them adds friction without adding value.

### Proposed Combined Step: "Finalize"

One unified step with two sections stacked vertically:

1. **Listing Content Section** (from current Step 5) — editable listings with regenerate button, "Publishing To" shop badges
2. **Publish Section** (from current Step 6) — design selection checkboxes, per-shop publish/draft toggles, "Send to Printify" button, post-publish mockup results, "Mark as Live"

The "Approve Listings" button is removed as a separate gate. Instead, "Send to Printify" serves as the single approval action (it will call both `approveListings` and `sendToPrintify` in sequence).

### Changes Required

| File | Change |
|---|---|
| `PipelineStepIndicator.tsx` | Remove `"summary"` step. Rename `"listings"` label to `"Finalize"`. Update from 6 steps to 5. |
| `WizardListingsStep.tsx` | Merge in all Summary UI (design selection, shop toggles, Printify send, post-publish results, Mark as Live). Remove the separate "Approve Listings" button — publishing now implies approval. |
| `WizardSummaryStep.tsx` | Delete file. |
| `PodPipeline.tsx` | Remove `"summary"` step handling. Remove `onApproved` callback that transitions to summary. The `"listings"` step now handles everything through to "live" status. Update `statusToStep` mapping so `"ready"`, `"production"`, and `"live"` statuses all map to the `"listings"` step. |

### Step Indicator (Before → After)

```text
Before: Analyze → Review → Generate → Review Designs → Listings → Summary
After:  Analyze → Review → Generate → Review Designs → Finalize
```

### UX Flow in Combined Step

- **Status "listings"**: Show editable listing content + regenerate. Below that, show design previews and shop toggles. "Send to Printify" button is primary action (disabled until listings exist).
- **Status "ready"**: Same view but listings are locked/approved. Printify controls are prominent.
- **Status "production"**: Show Printify results/mockups + "Mark as Live" button.
- **Status "live"**: Show final summary with live badge and external links.

