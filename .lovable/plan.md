

## Auto-Fetch Printify Print Providers for Blueprint ID

### Overview
Replace the manual Print Provider ID text input in `ListingEditor.tsx` with a dynamic dropdown that auto-fetches available print providers from the Printify API when a Blueprint ID is entered.

### Implementation

**1. New Edge Function: `pod-printify-providers/index.ts`**
- Accepts `{ blueprint_id: string }` in the request body
- Reads the Printify API key from `az_pod_settings` (same pattern as `pod-send-to-printify`)
- Calls `GET /v1/catalog/blueprints/{blueprint_id}/print_providers.json`
- Returns the array of providers (each has `id`, `title`, `location` fields)
- Requires auth, CORS headers, standard error handling

**2. New Hook: add `usePrintifyProviders` to `src/hooks/usePodListings.ts`**
- Takes a `blueprintId: string | null` parameter
- Calls the edge function via `supabase.functions.invoke("pod-printify-providers", { body: { blueprint_id } })`
- Uses `useQuery` with `enabled: !!blueprintId && blueprintId.length > 0`
- Caches results per blueprint ID (`queryKey: ["printify-providers", blueprintId]`)

**3. Update `src/components/pod/ListingEditor.tsx`**
- Import `usePrintifyProviders` and `Select` component
- When `blueprintId` changes (on blur/save), the hook fetches providers
- Replace the Print Provider ID `<Input>` with a `<Select>` dropdown:
  - Shows provider `title` and `location` as label, `id` as value
  - Loading state: show skeleton/spinner inside select
  - Error state: fall back to manual text input with warning
  - Empty state: show "No providers found" message
- On selection, save `printify_print_provider_id` to the listing

### Files Changed

| File | Change |
|------|--------|
| `supabase/functions/pod-printify-providers/index.ts` | New edge function to proxy Printify catalog API |
| `supabase/config.toml` | Add `[functions.pod-printify-providers]` with `verify_jwt = false` |
| `src/hooks/usePodListings.ts` | Add `usePrintifyProviders(blueprintId)` query hook |
| `src/components/pod/ListingEditor.tsx` | Replace provider ID input with auto-populated Select dropdown |

