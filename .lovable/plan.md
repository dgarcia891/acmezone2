

# Plan: Fix Remove.bg Key Source + Add Validation + Block on Failure

## Root Cause

The `pod-generate-designs` edge function reads the Remove.bg API key from **`Deno.env.get("REMOVE_BG_API_KEY")`** (a server-level secret), but you enter your key through the Settings UI which saves it to the **`az_pod_settings` database table**. The function never reads from that table — so the key you entered via Settings is completely ignored.

## Changes

### 1. Edge Function: Read key from `az_pod_settings` table (not env)

**File:** `supabase/functions/pod-generate-designs/index.ts`

- After authenticating the user, query `az_pod_settings` for the user's `removebg_api_key`
- Use that key for the Remove.bg API call instead of `Deno.env.get("REMOVE_BG_API_KEY")`
- Remove the env-based `REMOVE_BG_API_KEY` reference entirely

### 2. Edge Function: Block pipeline if no valid key

Instead of silently skipping background removal and uploading the raw image:

- If no Remove.bg key is configured in settings, **return an error** telling the user to add their key in Settings before generating designs
- If the Remove.bg API returns 403 (invalid key), **return an error** with a clear message: "Remove.bg API key is invalid. Please update it in Settings."
- The idea status will NOT be updated to `designs_generated` — it stays in its current state so the user can retry after fixing their key

### 3. Edge Function: Add key validation endpoint to `pod-settings`

**File:** `supabase/functions/pod-settings/index.ts`

- Add a `PUT` method that sends a lightweight validation request to Remove.bg's `/account` endpoint to verify the key works
- Returns success/failure so the UI can show immediate feedback when saving

### 4. UI: Validate key on save in Settings form

**File:** `src/components/pod/PodSettingsForm.tsx`

- When saving a Remove.bg key, call the validation endpoint first
- Show a success toast ("Remove.bg key verified") or error toast ("Invalid key — please check and try again")

### 5. Sticker prompt optimization

**File:** `supabase/functions/pod-generate-designs/index.ts`

- Update the sticker prompt to demand edge-to-edge artwork filling 95-100% of the canvas with no margins or whitespace

## Flow After Fix

```text
User enters key in Settings → Validate via Remove.bg /account → Save to DB
                                                                    │
Design generation triggered → Read key from az_pod_settings ────────┘
                                   │
                              Key missing? → ERROR: "Add key in Settings"
                              Key present? → Generate image → Remove.bg API
                                                                   │
                                                          403? → ERROR: "Invalid key"
                                                          200? → Upload transparent PNG ✓
```

