

## Fix: `pod-generate-listings` Not Deployed

### Root Cause
The edge function `pod-generate-listings` is missing from `supabase/config.toml`. Without a config entry, it was never deployed. When you clicked "Approve & Generate Listings" in Step 4, the function call returned a 404/error, the `onError` handler showed a toast (which you may have missed), and the wizard stayed on Step 4. Since you walked away, the page may have refreshed or the session timed out, returning you to the Kanban board. The idea's status is still `bg_removed` -- listings were never generated.

### Fix (1 file)

**`supabase/config.toml`** -- Add the missing function entry:

```toml
[functions.pod-generate-listings]
verify_jwt = false
```

This will trigger auto-deployment of the function. After that, you can re-open the idea from the Kanban board (it will open at Step 4 since status is `bg_removed`), click "Approve & Generate Listings" again, and it should work.

### Also missing from config (while we're at it)
I'll audit whether `pod-remove-bg` and `pod-send-to-printify` are also missing. `pod-remove-bg` appears to work (logs show successful runs), so it was likely deployed at some point. `pod-send-to-printify` should also be checked.

