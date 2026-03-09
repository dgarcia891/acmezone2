

## POD Pipeline Code Export

I've read every file in the POD system. Here's what I'll create:

### Approach
Create a single downloadable text file at `public/pod-pipeline-export.txt` containing the full source of all 30+ POD files, clearly separated with file path headers. You can then download it from your published URL.

### Files to Include (32 files total)

**Pages (2)**
- `src/pages/PodPipeline.tsx` (488 lines)
- `src/pages/admin/AdminPodPipeline.tsx` (294 lines)

**Components (15)**
- `src/components/pod/AnalysisReview.tsx`
- `src/components/pod/ApprovalSuccess.tsx`
- `src/components/pod/BackgroundRemovalStep.tsx`
- `src/components/pod/DesignGallery.tsx`
- `src/components/pod/DesignGeneration.tsx`
- `src/components/pod/IdeaInputForm.tsx`
- `src/components/pod/ImageEditor.tsx`
- `src/components/pod/KanbanBoard.tsx`
- `src/components/pod/KanbanCard.tsx`
- `src/components/pod/KanbanColumn.tsx`
- `src/components/pod/ListingEditor.tsx`
- `src/components/pod/PipelineStepIndicator.tsx`
- `src/components/pod/PodHistoryTable.tsx`
- `src/components/pod/PodSettingsForm.tsx`
- `src/components/pod/SpreadshirtExport.tsx`
- `src/components/pod/TrendingIdeasDialog.tsx`
- `src/components/pod/WizardListingsStep.tsx`
- `src/components/pod/editor/AdjustmentSliders.tsx`
- `src/components/pod/editor/CropOverlay.tsx`
- `src/components/pod/editor/EditorToolbar.tsx`

**Hooks (4)**
- `src/hooks/usePodPipeline.ts`
- `src/hooks/usePodKanban.ts`
- `src/hooks/usePodListings.ts`
- `src/hooks/usePodOverrides.ts`

**Edge Functions (11)**
- `supabase/functions/pod-analyze/index.ts`
- `supabase/functions/pod-approve/index.ts`
- `supabase/functions/pod-export-image/index.ts`
- `supabase/functions/pod-generate-designs/index.ts`
- `supabase/functions/pod-generate-listings/index.ts`
- `supabase/functions/pod-printify-providers/index.ts`
- `supabase/functions/pod-printify-shops/index.ts`
- `supabase/functions/pod-remove-bg/index.ts`
- `supabase/functions/pod-send-to-printify/index.ts`
- `supabase/functions/pod-settings/index.ts`
- `supabase/functions/pod-suggest-idea/index.ts`
- `supabase/functions/pod-test-trello/index.ts`

### Output
A single `public/pod-pipeline-export.txt` file (~6,000+ lines) with each file separated by:
```
================================================================================
FILE: path/to/file.tsx
================================================================================
```

After creation, you can download it at your preview URL: `/pod-pipeline-export.txt`

