

# Fix: Wizard idea state not refreshing after step transitions

## Problem
When transitioning from Listings → Summary, the `wizardIdea` object in `PodPipeline.tsx` still holds stale data (old status like `designs_generated`). The `WizardSummaryStep` conditionally renders buttons based on `idea?.status`, so "Send to Printify" doesn't appear until you leave and re-enter.

Same issue exists after other mutations (e.g., Send to Printify updates status to `production`, Mark as Live updates to `live`).

## Solution
Two changes:

### 1. `PodPipeline.tsx` — Update `wizardIdea` status when transitioning from listings to summary
In the `onApproved` callback passed to `WizardListingsStep`, update `wizardIdea` to reflect the new `ready` status before moving to the summary step:
```typescript
onApproved={() => {
  setWizardIdea((prev: any) => ({ ...prev, status: "ready" }));
  setStep("summary");
}}
```

### 2. `WizardSummaryStep.tsx` — Refresh idea from DB after mutations
After "Send to Printify" succeeds, update the local idea status to `production`. After "Mark as Live", update to `live`. This keeps the UI in sync without requiring the user to leave and return.

Pass a callback or use the mutation's `onSuccess` to update the parent's `wizardIdea` state. Simplest approach: accept an `onStatusChange` prop from the parent, or have the summary step re-fetch the idea after mutations.

**Preferred approach**: Have `WizardSummaryStep` accept an `onIdeaUpdated` callback and call it after successful mutations so the parent updates `wizardIdea`.

| File | Change |
|------|--------|
| `src/pages/PodPipeline.tsx` | Update `wizardIdea.status` to `"ready"` in `onApproved` callback; pass `onIdeaUpdated` to `WizardSummaryStep` |
| `src/components/pod/WizardSummaryStep.tsx` | Accept `onIdeaUpdated` prop; call it after Send to Printify / Mark as Live mutations succeed |

