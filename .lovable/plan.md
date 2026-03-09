
## Hydra Guard — Code Review & Improvement Plan

### What's Already Good
The system is architecturally solid: isolated from other features, proper API-key auth for extension endpoints, JWT + role-check in `approve-correction`, burst protection, real-time subscriptions, maintenance mode, and a well-structured snapshot viewer. These don't need touching.

---

### Gaps Identified (5 genuine improvements)

#### 1. Detections Tab — Missing "Promote to Pattern" action
When an admin views a high-severity detection, there's no way to directly create a new pattern from the signals it contains. They'd have to manually go to Patterns tab and re-type the phrase. We should add a **"Promote Signal → Pattern"** button in the detection detail dialog that pre-fills the Add Pattern form with the matched phrase, category guess, and severity mapped from the detection weight.

#### 2. Corrections Tab — No "Needs Review" stat card + missing total count
The stats row only shows 3 cards: Pending, Approved (7d), Rejected (7d). The `needs_review` status exists but has no card. Also the table pagination shows "Page X of Y" with no total record count (unlike Detections which shows total count in parens).

#### 3. UserReportsTab — "Promoted" action is misleadingly labelled
The third action button says "Flag for Review" but sets `review_status = 'promoted'`. This is confusing — "Promoted" implies a pattern was created from the report, but no pattern is actually created. The button should either:
   - Actually create a pattern from the reported URL/signals and set status to `promoted`, OR
   - Be relabelled "Flag for Investigation" with status `flagged` to match its real behaviour.

#### 4. PatternsTab — No duplicate detection on save
If an admin adds a phrase that already exists (e.g., different casing), a duplicate is silently inserted. We should check for an existing match before inserting and show a warning with the existing record's weight.

#### 5. Hydra Guard Overview — No cross-tab summary dashboard
Entering "Hydra Guard" drops you straight into the Corrections sub-tab. There's no at-a-glance view showing pending counts across all four tabs simultaneously. A simple summary row at the top (mirroring the POD Pipeline's Kanban overview) would help admins triage without clicking every tab.

---

### Implementation Plan

#### Files to Modify
| File | Change |
|------|--------|
| `src/components/hydra-guard/DetectionsTab.tsx` | Add "Promote to Pattern" button in detail dialog |
| `src/components/hydra-guard/CorrectionsTab.tsx` | Add `needs_review` stat card + total count in pagination |
| `src/components/hydra-guard/UserReportsTab.tsx` | Relabel "promoted" action to "Flag for Investigation" → `flagged` status, or wire up actual pattern promotion |
| `src/components/hydra-guard/PatternsTab.tsx` | Add duplicate phrase check before insert |
| `src/pages/Admin.tsx` | Add Hydra Guard cross-tab summary row above the sub-tabs |

#### New: Promote Signal to Pattern (DetectionsTab)
In the detail dialog, extract signal phrases from `selected.signals.hard` and `selected.signals.soft`. Show them as selectable chips. Admin picks one, hits "Promote to Pattern" — opens the existing pattern dialog pre-filled. No new edge function needed; direct Supabase insert with admin RLS.

#### New: Cross-tab Summary Banner
```text
┌──────────────┬──────────────┬──────────────┬──────────────┐
│ Detections   │ Corrections  │ Patterns     │ User Reports │
│ (7d): 42     │ Pending: 3   │ Active: 187  │ Pending: 7   │
└──────────────┴──────────────┴──────────────┴──────────────┘
```
Fetched in a single parallel query block, renders above the sub-tab list.

#### Fix: Duplicate Pattern Check
Before `supabase.from('sa_patterns').insert(...)`, run:
```ts
const { data: existing } = await supabase
  .from('sa_patterns')
  .select('id, severity_weight')
  .ilike('phrase', form.phrase.trim())
  .single();
if (existing) { toast({ title: 'Duplicate', ... }); return; }
```

#### Scope
- 5 files modified, ~150 lines net new
- No database migrations required (all existing tables/columns)
- No new edge functions required
