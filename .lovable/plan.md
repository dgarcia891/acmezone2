

## AI-Assisted Prompt Refinement for Design Regeneration

### Problem
Currently, users directly edit the raw AI prompt to request design changes. This is error-prone — most users don't know how to write effective image generation prompts.

### Solution
Add a simple "What do you want changed?" guidance field. When the user clicks Regenerate, their plain-English guidance is sent to an AI text model that rewrites the original prompt incorporating the requested changes. The refined prompt is then used for image generation.

### Changes

**1. `DesignGeneration.tsx` — UI restructure per DesignCard**
- Add a new "What do you want changed?" textarea at the top (user-facing, simple language)
- Move the existing prompt textarea into a collapsible "Advanced: View/Edit Prompt" section (collapsed by default)
- Change Regenerate button to pass both `guidance` and current `prompt` to the handler

**2. `usePodPipeline.ts` — Update `usePodGenerateDesigns` mutation**
- Accept optional `sticker_guidance` / `tshirt_guidance` fields alongside the prompts
- Pass them through to the edge function

**3. `supabase/functions/pod-generate-designs/index.ts` — AI prompt refinement step**
- Before image generation, if `guidance` is provided for a product type:
  - Call the Lovable AI gateway with a text model (e.g. `google/gemini-2.5-flash`) asking it to rewrite the original prompt incorporating the user's guidance
  - Use the AI-refined prompt for image generation
  - Store the refined prompt in the database so the user can see what was actually used
- If no guidance is provided, use the prompt as-is (backward compatible)

**4. `PodPipeline.tsx` — Wire up the new guidance field**
- Update the `onRegenerate` handler to pass guidance separately from the prompt

### UI Layout (per design card)

```text
┌─────────────────────────────────────────┐
│  [Design Image]                         │
│                                         │
│  What do you want changed?              │
│  ┌─────────────────────────────────┐    │
│  │ "Make text bigger, use blue..." │    │
│  └─────────────────────────────────┘    │
│                                         │
│  ▸ Advanced: View/Edit Prompt           │
│  (collapsed — shows raw prompt if       │
│   expanded, editable)                   │
│                                         │
│  [Regenerate with changes]              │
└─────────────────────────────────────────┘
```

### AI Prompt Refinement (edge function)

```text
System: You are a prompt engineer for AI image generation.
Given the original prompt and user guidance, rewrite the
prompt to incorporate the requested changes. Return ONLY
the new prompt text, nothing else.

User: Original prompt: {existing_prompt}
Requested changes: {user_guidance}
```

Uses `google/gemini-2.5-flash` for speed/cost efficiency since this is just text rewriting.

