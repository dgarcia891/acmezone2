---
description: 🤖 Generate prompts for Lovable/Supabase (DB & Env changes).
---
# 🤖 Lovable Proxy Protocol

**Goal:** Generate prompts for the user to paste into Lovable.

**IF Database Change:**
Generate:
> "⚠️ **Database Change Required**
> Paste this into Lovable:
>
> ```text
> Please apply this SQL migration:
> [INSERT SQL]
> ```"

**IF Secret/Env Change:**
Generate:
> "🔑 **Secret Key Required**
> Paste this into Lovable:
>
> ```text
> Set the environment variable [KEY_NAME] to [VALUE].
> ```"
