

## Fix: Show Loading Skeletons Immediately in Trending Ideas Dialog

The dialog opens empty because the loading state (`isPending`) isn't true until the next render cycle after `fetchIdeas()` is called. The skeletons should show immediately when the dialog opens and ideas haven't loaded yet.

### Change

**File:** `src/components/pod/TrendingIdeasDialog.tsx`

Update the skeleton condition from `suggestMutation.isPending && ideas.length === 0` to also cover the case where the dialog is open but nothing has loaded yet. Simplest fix: show skeletons when `ideas.length === 0 && !hasLoaded` OR when `isPending`.

Replace:
```tsx
{suggestMutation.isPending && ideas.length === 0 ? (
```
With:
```tsx
{(suggestMutation.isPending || (!hasLoaded && ideas.length === 0)) ? (
```

This ensures skeletons appear the instant the dialog opens, before `isPending` flips to `true`.

