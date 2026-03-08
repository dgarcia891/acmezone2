# MerchFlow — Complete PRD & Technical Design Document

## How to Use This Document

This is a self-contained Product Requirements Document and Technical Design Document for **MerchFlow**, an AI-powered Print-on-Demand SaaS platform. To build it:

1. Create a **new Lovable project**
2. Copy **Section 3 (One-Prompt Build Instructions)** and paste it as your first message
3. The AI will scaffold the entire application — database, auth, frontend, edge functions
4. Iterate from there on design polish, Stripe integration, and fine-tuning

The rest of this document serves as the complete reference spec.

---

## 1. PRODUCT REQUIREMENTS DOCUMENT

### 1.1 Product Vision
**MerchFlow** — an AI-powered Print-on-Demand automation platform that takes a content idea (meme, viral text, image) and turns it into production-ready merchandise listed across multiple marketplaces, in minutes instead of hours.

### 1.2 Target Users
- **Solo POD sellers** running Etsy/eBay/Shopify stores who spend hours on design + listing creation
- **Content creators** who want to monetize viral moments quickly
- **Small agencies** managing multiple POD storefronts

### 1.3 Pricing Model
| Plan | Price | Credits/mo | Features |
|------|-------|-----------|----------|
| Free | $0 | 3 ideas | Pipeline, 1 shop, watermarked designs |
| Pro | $29/mo | 50 ideas | Unlimited shops, image editor, priority AI |
| Business | $79/mo | 200 ideas | Team seats, API access, bulk import |
| Enterprise | Custom | Unlimited | White-label, dedicated support |

Each "credit" = one full idea-to-listing pipeline run (analyze + generate + bg removal + listing copy).

### 1.4 Core User Journey
1. Sign up / Sign in
2. Onboarding: connect Printify API key, Remove.bg key, add shops
3. Submit idea (text + optional reference images + product type selection)
4. AI analyzes commercial viability (score 1-10, audience, copyright, prompts)
5. Review analysis → approve or reject
6. AI generates sticker and/or t-shirt designs
7. User iterates: provide plain-English feedback, AI refines prompt and regenerates
8. Approve designs → automatic background removal
9. Review before/after, optionally edit in built-in image editor
10. AI generates marketplace-optimized listing copy (titles, descriptions, tags)
11. Review/edit listings with marketplace-specific previews and character counters
12. Send to Printify across multiple shops with per-shop publish/draft control
13. Track status on Kanban board: New → Designing → Listings → Ready → Production → Live

### 1.5 Website Pages
- **Landing page** (`/`): Hero with product demo video/animation, feature highlights, pricing cards, testimonials, CTA
- **Pricing** (`/pricing`): Plan comparison table, FAQ, Stripe checkout
- **How it works** (`/how-it-works`): 5-step visual walkthrough
- **Login / Sign up** (`/auth`): Email/password auth with email verification
- **Dashboard** (`/dashboard`): Kanban board + settings
- **Pipeline wizard** (`/pipeline/:id`): The 5-step wizard
- **Account settings** (`/settings`): Profile, API keys, shops, billing
- **Terms** (`/terms`) and **Privacy** (`/privacy`)

---

## 2. TECHNICAL DESIGN DOCUMENT

### 2.1 Tech Stack
- **Frontend**: React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui
- **Backend**: Supabase (Lovable Cloud) — Postgres, Auth, Storage, Edge Functions
- **AI**: Lovable AI gateway (`ai.gateway.lovable.dev`) — Gemini 3 Flash (analysis/listings), Gemini 3 Pro Image Preview (design generation), Gemini 2.5 Flash (prompt refinement)
- **External APIs**: Printify (product creation/publishing), Remove.bg (background removal)
- **Payments**: Stripe (subscriptions)
- **State management**: TanStack Query for server state, React context for auth
- **Drag & drop**: @dnd-kit/core + @dnd-kit/sortable

### 2.2 Database Schema

All tables prefixed with `mf_`. Use Supabase migrations.

```sql
-- Roles enum (may already exist — use CREATE TYPE IF NOT EXISTS or wrap in DO block)
DO $$ BEGIN
  CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');
EXCEPTION WHEN duplicate_object THEN null;
END $$;

-- User roles (NEVER store roles on profiles table)
CREATE TABLE public.mf_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.mf_user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.mf_has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.mf_user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.mf_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  display_name TEXT,
  plan TEXT NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.mf_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own profile" ON public.mf_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users update own profile" ON public.mf_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.mf_handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.mf_profiles (user_id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  INSERT INTO public.mf_user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER mf_on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.mf_handle_new_user();

-- POD Ideas (main pipeline tracker)
CREATE TABLE public.mf_pod_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idea_text TEXT,
  image_url TEXT,
  product_type TEXT DEFAULT 'both',
  analysis JSONB,
  sticker_design_prompt TEXT,
  tshirt_design_prompt TEXT,
  sticker_design_url TEXT,
  tshirt_design_url TEXT,
  sticker_raw_url TEXT,
  tshirt_raw_url TEXT,
  status TEXT DEFAULT 'pending',
  reject_reason TEXT,
  priority TEXT DEFAULT 'normal',
  notes TEXT,
  printify_product_id TEXT,
  printify_product_url TEXT,
  listing_url TEXT,
  listing_platform TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mf_pod_ideas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ideas" ON public.mf_pod_ideas FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Design versions (iteration history)
CREATE TABLE public.mf_pod_design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.mf_pod_ideas(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mf_pod_design_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own versions" ON public.mf_pod_design_versions FOR ALL
  TO authenticated USING (idea_id IN (SELECT id FROM public.mf_pod_ideas WHERE user_id = auth.uid()))
  WITH CHECK (idea_id IN (SELECT id FROM public.mf_pod_ideas WHERE user_id = auth.uid()));

-- Listings (AI-generated copy)
CREATE TABLE public.mf_pod_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.mf_pod_ideas(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  seo_keywords TEXT[] DEFAULT '{}',
  etsy_title TEXT,
  ebay_title TEXT,
  printify_blueprint_id TEXT,
  printify_print_provider_id TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mf_pod_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own listings" ON public.mf_pod_listings FOR ALL
  TO authenticated USING (idea_id IN (SELECT id FROM public.mf_pod_ideas WHERE user_id = auth.uid()))
  WITH CHECK (idea_id IN (SELECT id FROM public.mf_pod_ideas WHERE user_id = auth.uid()));

-- User settings (API keys per user)
CREATE TABLE public.mf_pod_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  printify_api_key TEXT,
  printify_shop_id TEXT,
  removebg_api_key TEXT,
  auto_publish BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mf_pod_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.mf_pod_settings FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Additional Printify shops
CREATE TABLE public.mf_pod_printify_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id TEXT NOT NULL,
  marketplace TEXT NOT NULL DEFAULT 'default',
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_publish BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mf_pod_printify_shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shops" ON public.mf_pod_printify_shops FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Labels system
CREATE TABLE public.mf_pod_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.mf_pod_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own labels" ON public.mf_pod_labels FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.mf_pod_idea_labels (
  idea_id UUID NOT NULL REFERENCES public.mf_pod_ideas(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.mf_pod_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, label_id)
);
ALTER TABLE public.mf_pod_idea_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own idea labels" ON public.mf_pod_idea_labels FOR ALL
  TO authenticated USING (idea_id IN (SELECT id FROM public.mf_pod_ideas WHERE user_id = auth.uid()))
  WITH CHECK (idea_id IN (SELECT id FROM public.mf_pod_ideas WHERE user_id = auth.uid()));
```

**Storage bucket**: Create a public `pod-assets` bucket for design images.
- Structure: `references/{uuid}.{ext}` for uploaded reference images, `pod-designs/{type}-{idea_id}-raw.png` for raw AI output, `pod-designs/{type}-{idea_id}.png` for transparent versions

### 2.3 Edge Functions (7 total)

Every edge function follows this auth pattern (regular authenticated users, NOT admin-only):

```typescript
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Standard auth + credit check pattern:
const authHeader = req.headers.get("Authorization");
if (!authHeader) return json({ error: "No authorization header" }, 401);
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) return json({ error: "Invalid token" }, 401);

// Credit check (apply on pod-analyze only — the entry point that consumes a credit):
const { data: profile } = await supabase.from("mf_profiles").select("credits_remaining").eq("user_id", user.id).single();
if (!profile || profile.credits_remaining <= 0) {
  return json({ error: "No credits remaining. Please upgrade your plan." }, 402);
}
```

#### 2.3.1 `mf-analyze`
- **Input**: `{ idea_text: string, images?: Array<{base64: string, media_type: string}>, product_type?: string }`
- **Process**: Calls Gemini 3 Flash via `https://ai.gateway.lovable.dev/v1/chat/completions` with `Authorization: Bearer ${Deno.env.get("LOVABLE_API_KEY")}`
- **Model**: `google/gemini-3-flash-preview`
- **System prompt** (copy exactly):
```
You are a viral content analyst and merchandise expert. Analyze content ideas for Print-on-Demand merchandise potential. Return ONLY a raw JSON object (no markdown, no code fences) with exactly these fields:
{
  "content_text": "The core text/phrase from the content",
  "platform": "Likely source platform (e.g., Twitter, TikTok, Reddit, Instagram, Original)",
  "engagement_score": "Estimated engagement level (e.g., High, Medium, Low)",
  "viral_indicators": "What makes this viral or shareable",
  "commercial_viability_score": 7,
  "score_explanation": "Why this score",
  "target_audience": "Who would buy merchandise with this",
  "merchandise_applications": "Specific product ideas and how the content would work on them",
  "copyright_status": "Assessment of copyright concerns",
  "usage_rights": "Can this be used commercially?",
  "legal_notes": "Any legal considerations",
  "longevity_prediction": "How long will this trend last?",
  "market_positioning": "Where this fits in the market",
  "font_suggestions": "Recommended fonts for merchandise",
  "design_considerations": "Design tips for merchandise",
  "product_recommendations": "Best product types for this content",
  "additional_notes": "Any other relevant notes",
  "sticker_design_prompt": "A detailed image generation prompt for creating a sticker design. Include style, colors, composition, and specific visual elements.",
  "tshirt_design_prompt": "A detailed image generation prompt for creating a t-shirt design. Include style, colors, composition, and specific visual elements."
}
The commercial_viability_score MUST be an integer from 1-10.
```
- **User message construction**: Text content, then append image_url entries for each uploaded image as `{ type: "image_url", image_url: { url: "data:{media_type};base64,{base64}" } }`
- **Response parsing**: Strip markdown fences with `responseText.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim()`, then `JSON.parse`
- **Image storage**: Upload first reference image to `pod-assets/references/{uuid}.{ext}` using base64 decode
- **DB insert**: Into `mf_pod_ideas` with status `analyzed`, store analysis JSON, sticker/tshirt prompts
- **Credit deduction**: After successful insert: `await supabase.from('mf_profiles').update({ credits_remaining: profile.credits_remaining - 1 }).eq('user_id', user.id);`
- **Returns**: `{ idea }` — the full idea record

#### 2.3.2 `mf-generate-designs`
- **Input**: `{ idea_id: string, product_type?: string, sticker_prompt?: string, tshirt_prompt?: string, sticker_guidance?: string, tshirt_guidance?: string }`
- **Process (2 phases)**:

**Phase 1 — Prompt refinement** (if guidance provided):
```typescript
// Call Gemini 2.5 Flash for prompt refinement
const refineResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({
    model: "google/gemini-2.5-flash",
    messages: [
      { role: "system", content: "You are a prompt engineer for AI image generation. Given the original prompt and user guidance, rewrite the prompt incorporating the requested changes. Keep all technical specifications (resolution, background color, etc). Return ONLY the new prompt text, nothing else." },
      { role: "user", content: `Original prompt:\n${originalPrompt}\n\nUser wants these changes:\n${guidance}` }
    ],
    temperature: 0.7
  })
});
```

**Phase 2 — Image generation**:
```typescript
// Sticker prefix (prepend to user's prompt):
const STICKER_PREFIX = "Create a die-cut sticker design. The artwork MUST fill the ENTIRE canvas from edge to edge with absolutely NO margin, NO padding, and NO white border around it. Use a solid pure white (#FFFFFF) background ONLY behind the artwork. The design should be bold, colorful, and suitable for die-cutting.";

// T-shirt prefix (prepend to user's prompt):
const TSHIRT_PREFIX = "Create a t-shirt graphic design at high resolution (4500x5400 pixels). The artwork MUST be LARGE and PROMINENT, filling at least 70-80% of the canvas. Use a solid pure white (#FFFFFF) background. The design should be print-ready with clean edges.";

// Image generation call:
const genResponse = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
  method: "POST",
  headers: { "Content-Type": "application/json", "Authorization": `Bearer ${LOVABLE_API_KEY}` },
  body: JSON.stringify({
    model: "google/gemini-3-pro-image-preview",
    messages: [{ role: "user", content: `${prefix}\n\n${finalPrompt}` }],
    modalities: ["image", "text"],
    temperature: 0.8
  })
});
// Extract base64 image from response: aiData.choices[0].message.content -> find item with type "image_url" -> image_url.url (data URI)
// Decode base64, upload to pod-assets/pod-designs/{type}-{idea_id}-raw.png
```

- **Parallel execution**: Use `Promise.allSettled` for sticker + tshirt simultaneously
- **Version tracking**: Insert into `mf_pod_design_versions` with incrementing version_number, set `is_selected = true` for latest, deselect previous
- **DB update**: Update idea with design URLs, raw URLs, refined prompts, status `designs_generated`
- **Returns**: `{ idea }`

#### 2.3.3 `mf-remove-bg`
- **Input**: `{ idea_id: string }`
- **Process**: Loads Remove.bg API key from user's `mf_pod_settings` row (NOT a global secret)
```typescript
const { data: settings } = await supabase
  .from("mf_pod_settings")
  .select("removebg_api_key")
  .eq("user_id", user.id)
  .single();
if (!settings?.removebg_api_key) {
  return json({ error: "Remove.bg API key is not configured. Please add it in Settings." }, 400);
}

async function removeBackground(imageUrl: string): Promise<Uint8Array> {
  const imgResponse = await fetch(imageUrl);
  if (!imgResponse.ok) throw new Error(`Failed to download image: ${imgResponse.status}`);
  const imageBytes = new Uint8Array(await imgResponse.arrayBuffer());

  const formData = new FormData();
  formData.append("image_file", new Blob([imageBytes], { type: "image/png" }), "design.png");
  formData.append("size", "auto");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: { "X-Api-Key": settings.removebg_api_key },
    body: formData,
  });
  if (!response.ok) throw new Error(`Remove.bg failed with status ${response.status}`);
  return new Uint8Array(await response.arrayBuffer());
}
```
- **Storage**: Upload transparent PNGs to `pod-designs/{type}-{idea_id}.png` (upsert: true)
- **DB update**: Preserve raw URLs in `sticker_raw_url`/`tshirt_raw_url`, update `sticker_design_url`/`tshirt_design_url` with transparent versions, status `bg_removed`
- **Returns**: `{ idea }`

#### 2.3.4 `mf-generate-listings`
- **Input**: `{ idea_id: string }`
- **Process**: For each product type with a design URL, calls Gemini 3 Flash
- **System prompt**:
```
You are an expert e-commerce copywriter for print-on-demand products sold on Etsy and eBay.
Given product information, generate optimized listing content.
Return ONLY a raw JSON object (no markdown, no code fences) with these fields:
{
  "title": "Main product title (max 140 characters)",
  "description": "Product description (200-400 words, engaging, SEO-optimized)",
  "tags": ["array", "of", "13", "tags", "max 20 chars each"],
  "seo_keywords": ["primary", "keyword", "phrases"],
  "etsy_title": "Etsy-optimized title (max 140 characters, keyword-rich)",
  "ebay_title": "eBay-optimized title (max 80 characters, concise)"
}
```
- **Printify blueprint auto-discovery** (optional, if user has Printify configured):
```typescript
// Fetch blueprints from Printify
const bpRes = await fetch("https://api.printify.com/v1/catalog/blueprints.json", {
  headers: { "Authorization": `Bearer ${settings.printify_api_key}` }
});
const blueprints = await bpRes.json();
// For stickers: find blueprint where title matches "sticker" or "kiss-cut"
// For tshirts: find blueprint where title matches "unisex" AND ("t-shirt" OR "bella" OR "3001")
// Then fetch print providers for that blueprint and pick first active one
```
- **DB**: Delete existing listings for idea (supports regeneration), insert new listings, update idea status to `listings`
- **Returns**: `{ listings }`

#### 2.3.5 `mf-send-to-printify`
- **Input**: `{ idea_id: string, product_types?: string[], publish_overrides?: Record<string, boolean> }`
- **Process per listing per shop**:
```typescript
// 1. Upload image to Printify
const uploadRes = await fetch(`https://api.printify.com/v1/uploads/images.json`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({ file_name: `${productType}-${ideaId}.png`, url: designUrl })
});
const uploadData = await uploadRes.json();

// 2. Fetch variants
const variantsRes = await fetch(
  `https://api.printify.com/v1/catalog/blueprints/${blueprintId}/print_providers/${providerId}/variants.json`,
  { headers: { "Authorization": `Bearer ${apiKey}` } }
);

// 3. Create product
const productRes = await fetch(`https://api.printify.com/v1/shops/${shopId}/products.json`, {
  method: "POST",
  headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    title: resolvedTitle, // eBay→ebay_title(80ch), Etsy→etsy_title(140ch), default→title
    blueprint_id: Number(blueprintId),
    print_provider_id: Number(providerId),
    variants: enabledVariants.map(v => ({
      id: v.id, price: productType === "sticker" ? 499 : 2499, is_enabled: true
    })),
    print_areas: [{ variant_ids: enabledVariants.map(v => v.id), placeholders: [{ position: "front", images: [{ id: uploadData.id, x: 0.5, y: 0.5, scale: 1, angle: 0 }] }] }]
  })
});

// 4. Optionally publish
if (shouldPublish) {
  await fetch(`https://api.printify.com/v1/shops/${shopId}/products/${product.id}/publish.json`, {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ title: true, description: true, images: true, variants: true, tags: true })
  });
}
```
- **Returns**: `{ products: Array<{ product_type, printify_product_id, printify_url, title, shop_id, marketplace, shop_label, images, variants_count, variants_enabled, published, error? }> }`

#### 2.3.6 `mf-settings`
- **GET**: Returns masked settings (API keys shown as `••••••••last4`) + boolean `has_printify_api_key`, `has_removebg_api_key` flags + additional shops list
- **PUT**: Validates Remove.bg key against `https://api.remove.bg/v1.0/account`, returns `{ valid, credits }`
- **POST**: Handles multiple actions via `body.action`:
  - `add_shop`: Insert into `mf_pod_printify_shops`
  - `remove_shop`: Delete by id
  - `toggle_shop`: Update `is_active`
  - `set_shop_auto_publish`: Update `auto_publish`
  - Default (no action): Upsert main settings into `mf_pod_settings`

#### 2.3.7 `mf-stripe-webhook`
- Verify webhook signature using `STRIPE_WEBHOOK_SECRET`
- Handle events:
  - `checkout.session.completed` → set plan + credits on `mf_profiles`
  - `invoice.paid` → reset credits for billing period
  - `customer.subscription.updated` → update plan
  - `customer.subscription.deleted` → revert to free plan, set credits to 3
- Credit amounts: free=3, pro=50, business=200

### 2.4 Frontend Architecture

#### File Structure
```
src/
├── contexts/AuthContext.tsx          # Auth state + Supabase listener
├── hooks/
│   ├── usePodPipeline.ts            # All pipeline mutations/queries
│   ├── usePodListings.ts            # Listing CRUD
│   └── usePodKanban.ts              # Status updates, labels, priorities, DnD
├── components/
│   ├── layout/
│   │   ├── Header.tsx               # Nav with auth state, plan badge
│   │   └── Footer.tsx
│   ├── auth/ProtectedRoute.tsx      # Redirect to /auth if not logged in
│   ├── landing/
│   │   ├── HeroSection.tsx          # Animated 5-step pipeline demo
│   │   ├── FeatureCards.tsx         # AI Analysis, Design, BG Removal, Listings, Publishing
│   │   ├── PricingCards.tsx         # Plan comparison with Stripe CTAs
│   │   └── TestimonialSection.tsx
│   ├── pod/
│   │   ├── KanbanBoard.tsx          # DnD board with collapsible columns
│   │   ├── KanbanColumn.tsx         # Droppable column, collapsed/expanded state
│   │   ├── KanbanCard.tsx           # Draggable card with design thumbnail
│   │   ├── PipelineStepIndicator.tsx # 5-step progress bar
│   │   ├── IdeaInputForm.tsx        # Text + multi-image upload + product type selector
│   │   ├── AnalysisReview.tsx       # Viability score badge + analysis fields
│   │   ├── DesignGeneration.tsx     # Side-by-side design cards with regeneration
│   │   ├── DesignGallery.tsx        # Version history horizontal scroll
│   │   ├── BackgroundRemovalStep.tsx # Before/after comparison slider
│   │   ├── ImageEditor.tsx          # Full canvas-based editor (see 2.4.4)
│   │   ├── editor/
│   │   │   ├── EditorToolbar.tsx    # Select/Crop/Draw/Eraser/Text/Adjust tool buttons
│   │   │   ├── AdjustmentSliders.tsx # Brightness/Contrast/Saturation sliders
│   │   │   └── CropOverlay.tsx      # Draggable crop rectangle with corner handles
│   │   ├── ListingEditor.tsx        # Inline edit with char counters
│   │   ├── WizardListingsStep.tsx   # Finalize: listings + shop selection + Printify
│   │   ├── PodSettingsForm.tsx      # API keys + multi-shop management
│   │   └── PodHistoryTable.tsx      # Table view alternative
│   └── ui/                          # shadcn/ui components
├── pages/
│   ├── Index.tsx                    # Landing/marketing page
│   ├── Auth.tsx                     # Login/signup/password-reset
│   ├── Dashboard.tsx                # Kanban board + settings toggle
│   ├── Pricing.tsx                  # Full pricing page
│   ├── HowItWorks.tsx              # 5-step walkthrough
│   ├── Settings.tsx                 # Account + API key management
│   ├── Terms.tsx
│   ├── Privacy.tsx
│   └── NotFound.tsx
└── App.tsx                          # Routes + providers
```

#### 2.4.1 KanbanBoard Details
- **Columns**: `pending`, `designing`, `listings`, `ready`, `production`, `live` + collapsed `rejected` section at bottom
- **Status mapping for column assignment**:
  - `analyzed` → `designing` column
  - `designs_generated` → `designing` column
  - `bg_removed` → `ready` column
- **Collapsed columns**: `collapsedColumns` state persisted in `localStorage` key `mf-kanban-collapsed`
  - Collapsed = 40px wide strip, `writing-mode: vertical-rl`, shows emoji + count badge + vertical label
  - Click to expand
- **DnD setup**: `@dnd-kit/core` DndContext with `PointerSensor` (5px activation distance), `closestCenter` collision detection
- **Card actions**: Click opens pipeline wizard at appropriate step, context menu for priority/labels/delete

#### 2.4.2 Pipeline Wizard (5 Steps)
**Step derivation from DB status:**
```typescript
type PipelineStep = "input" | "review" | "generate" | "results" | "listings";

function statusToStep(status: string): PipelineStep {
  switch (status) {
    case "pending": return "review";
    case "designing":
    case "analyzed":
    case "designs_generated": return "generate";
    case "bg_removed": return "results";
    case "listings":
    case "ready":
    case "production":
    case "live": return "listings";
    default: return "input";
  }
}
```

**Step 1 — IdeaInputForm**:
- Textarea for idea text
- Multi-image upload (drag & drop + click, max 4 images, shows previews)
- Product type selector: "Both" | "Sticker Only" | "T-Shirt Only"
- Submit calls `mf-analyze` edge function

**Step 2 — AnalysisReview**:
- Large viability score badge (color-coded: green ≥7, yellow 4-6, red ≤3)
- Grid of analysis fields from the JSON response
- Approve / Reject buttons (reject shows reason textarea)
- Approve advances to Step 3 and auto-triggers design generation

**Step 3 — DesignGeneration**:
- Side-by-side cards for sticker and t-shirt (if both selected)
- Each card shows:
  - Image preview OR loading spinner with cycling status messages every 4 seconds
  - Elapsed timer `{mins}:{secs}`
  - Guidance textarea: "What do you want changed?"
  - Collapsible "Advanced" section with raw prompt textarea
  - "Regenerate" button → sends guidance + optionally edited prompt to `mf-generate-designs`
  - "Drop" button (only when both types exist — removes one)
- Version history gallery below each card (horizontal scroll, hover reveals select/delete)
- **Auto-trigger**: When entering step with no existing designs, auto-call `handleGenerate()` (guard with `autoGenTriggered` flag to prevent double-calls)

**Step 4 — BackgroundRemovalStep**:
- Before/after image comparison for each design
- Shows raw (with background) on left, transparent on right
- "Edit" button opens ImageEditor dialog
- **Auto-trigger**: On mount, if status isn't `bg_removed`, auto-call `mf-remove-bg` (guard with `bgAutoTriggeredRef`)

**Step 5 — WizardListingsStep**:
- "Publishing To" card showing all configured shops with marketplace badges
- `ListingEditor` per product type with:
  - Title input
  - Description textarea
  - Tags editor (add/remove individual tags)
  - Etsy title input (140 char counter with color indicator)
  - eBay title input (80 char counter with color indicator)
  - Blueprint ID + Print Provider ID inputs
  - Collapsible "Marketplace Preview" showing resolved title per shop with character compliance
- Product selection checkboxes with design thumbnails
- Per-shop publish/draft toggle switches (initialized from shop `auto_publish` defaults)
- "Send to Printify" button
- After send: Results cards grouped by shop showing confirmed titles, variant counts, mockup images, "View in Printify" links
- Status actions: "Mark as Live", "Create Variant" (variant clones idea + fetches images as base64 to pre-populate Step 1)

#### 2.4.3 Settings (PodSettingsForm)
- Printify API Key input (masked display, paste to update)
- Printify Shop ID input
- Remove.bg API Key input with "Validate" button (calls `mf-settings` PUT to check against Remove.bg API)
- Auto-publish toggle
- Multi-shop management:
  - List of configured shops with marketplace, label, active toggle, auto-publish toggle, delete button
  - "Add Shop" form: shop_id + marketplace dropdown + label

#### 2.4.4 ImageEditor (Canvas-Based)
Full image editor opened as a Dialog from the BackgroundRemovalStep:

**Tools:**
- **Select/Pan**: Default cursor, no drawing
- **Crop**: Shows SVG mask overlay with draggable corner handles (nw/ne/sw/se) and center move handle. Apply button crops canvas.
- **Draw**: Freehand drawing with color picker + brush size slider (1-50px). Uses `globalCompositeOperation = "source-over"`.
- **Eraser**: Same as draw but uses `globalCompositeOperation = "destination-out"`. Size slider.
- **Text**: Click canvas to place text. Inputs for text content, font size (12-120), color picker.
- **Adjustments**: Brightness (-100 to +100), Contrast (-100 to +100), Saturation (0 to 200) sliders. Applied as CSS filter on canvas element for preview, baked into pixels on export via offscreen canvas.

**History:**
- Undo/redo stack (max 20 entries) using `canvas.getContext('2d').getImageData()` / `putImageData()`
- Save state after every draw stroke end, crop apply, text place, rotation

**Rotation:**
- 90° CW / 90° CCW buttons
- Implemented by creating offscreen canvas with swapped dimensions, drawing with rotation transform

**Scale handling:**
- Canvas renders at full image resolution internally
- Displayed at fitted size within the dialog
- All mouse coordinates multiplied by `scaleFactor = canvas.width / displayWidth`

**Transparency:**
- CSS checkerboard pattern behind canvas: `background: repeating-conic-gradient(#ccc 0% 25%, transparent 0% 50%) 0 0 / 20px 20px`

**Export:**
- Apply CSS filter adjustments via offscreen canvas with `ctx.filter = "brightness(...) contrast(...) saturate(...)"`
- Export as PNG blob via `canvas.toBlob()`
- Upload to storage, update idea record

**Image loading:**
- Fetch image URL as blob first (avoids CORS taint on canvas): `fetch(url).then(r => r.blob()).then(blob => URL.createObjectURL(blob))`

### 2.5 Critical Implementation Details

**Cache busting**: All image URLs from edge functions use fixed storage paths. After regeneration or bg removal, append `?t=${Date.now()}` to URLs before setting React state. This forces image re-render without browser cache.

**Auth setup**: In AuthContext, set up `onAuthStateChange` listener BEFORE calling `getSession()`:
```typescript
useEffect(() => {
  const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  });
  supabase.auth.getSession().then(({ data: { session } }) => {
    setSession(session);
    setUser(session?.user ?? null);
    setLoading(false);
  });
  return () => subscription.unsubscribe();
}, []);
```

**Supabase client call pattern** (for edge functions from frontend):
```typescript
const { data: { session } } = await supabase.auth.getSession();
const response = await supabase.functions.invoke("mf-analyze", {
  body: { idea_text, images, product_type }
});
if (response.error) throw response.error;
return response.data;
```

**TanStack Query pattern**:
```typescript
// Query
const { data: ideas } = useQuery({
  queryKey: ["pod-ideas"],
  queryFn: async () => {
    const { data, error } = await supabase.from("mf_pod_ideas").select("*").order("created_at", { ascending: false });
    if (error) throw error;
    return data;
  }
});

// Mutation with optimistic cache invalidation
const analyzeMutation = useMutation({
  mutationFn: async (payload) => {
    const { data, error } = await supabase.functions.invoke("mf-analyze", { body: payload });
    if (error) throw error;
    return data;
  },
  onSuccess: () => queryClient.invalidateQueries({ queryKey: ["pod-ideas"] })
});
```

### 2.6 Required Secrets & Environment
- `LOVABLE_API_KEY` — Auto-provisioned by Lovable Cloud for AI gateway access
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Auto-provisioned
- `STRIPE_SECRET_KEY` — Required for checkout session creation (add via Lovable Cloud secrets)
- `STRIPE_WEBHOOK_SECRET` — Required for webhook verification (add via Lovable Cloud secrets)
- User-provided keys (stored per-user in `mf_pod_settings`, NOT as environment secrets): Printify API Key, Remove.bg API Key

### 2.7 Key Dependencies
```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@supabase/supabase-js": "^2.89.0",
  "@tanstack/react-query": "^5.83.0",
  "react": "^18.3.1",
  "react-dom": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "react-hook-form": "^7.61.1",
  "@hookform/resolvers": "^3.10.0",
  "sonner": "^1.7.4",
  "date-fns": "^3.6.0",
  "lucide-react": "^0.462.0",
  "zod": "^3.25.76",
  "react-helmet-async": "^1.3.0",
  "class-variance-authority": "^0.7.1",
  "clsx": "^2.1.1",
  "tailwind-merge": "^2.6.0",
  "tailwindcss-animate": "^1.0.7",
  "next-themes": "^0.3.0",
  "framer-motion": "^11.0.0"
}
```
Plus all shadcn/ui Radix primitives (accordion, dialog, dropdown-menu, select, switch, tabs, toast, tooltip, etc.).

---

## 3. ONE-PROMPT BUILD INSTRUCTIONS

Build a SaaS web application called "MerchFlow" — an AI-powered Print-on-Demand automation platform. Use React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Supabase (Lovable Cloud).

**Design direction**: Modern, bold SaaS aesthetic. Dark mode primary with electric blue (#3b82f6) and violet (#8b5cf6) accents. Use a gradient hero. Typography: display font for headings (e.g., Plus Jakarta Sans or Cabinet Grotesk via Google Fonts), clean sans-serif body. Generous whitespace, card-based layouts, subtle shadows and glassmorphism on cards.

**Build in this exact order:**

### Step 1: Database
Create all tables from Section 2.2 above using migrations. All tables prefixed `mf_`. Create a public `pod-assets` storage bucket. Include the `mf_handle_new_user` trigger for auto-creating profiles and roles on signup.

### Step 2: Auth
Email/password authentication with:
- `AuthContext` provider wrapping the app (setup `onAuthStateChange` BEFORE `getSession()`)
- `ProtectedRoute` component that redirects to `/auth` if not authenticated
- `/auth` page with login, signup, and password reset tabs
- Do NOT enable auto-confirm — users must verify email

### Step 3: Landing Page (`/`)
Marketing homepage:
- Hero section with headline "Turn Viral Content Into Merch in Minutes", subheadline, animated 5-step pipeline visualization, "Start Free" CTA button
- Feature cards section: AI Analysis, Design Generation, Background Removal, Listing Optimization, Multi-Shop Publishing — each with icon, title, description
- Pricing section with 4 plan cards (Free, Pro $29/mo, Business $79/mo, Enterprise) showing features and credit counts
- Footer with links to Terms, Privacy, Pricing

### Step 4: Dashboard (`/dashboard`)
Protected route with:
- Header showing user email, plan badge, credits remaining, settings gear icon
- Toggle between "Board" and "Settings" views
- "New Idea" button that opens the pipeline wizard
- **KanbanBoard**: 6 columns (New, Designing, Listings, Ready, Production, Live) + collapsed Rejected section. Full @dnd-kit drag-and-drop. Collapsed columns persist to localStorage. Cards show design thumbnail, idea text preview, priority badge, labels.
- **PodSettingsForm**: API key management (Printify, Remove.bg with validation), multi-shop management with add/remove/toggle

### Step 5: Pipeline Wizard
Inline wizard in dashboard (dialog or slide-over panel) with PipelineStepIndicator showing 5 steps:
1. **Input**: IdeaInputForm — textarea, multi-image upload (max 4), product type selector
2. **Review**: AnalysisReview — viability score badge, analysis grid, approve/reject
3. **Generate**: DesignGeneration — side-by-side design cards, guidance textarea for feedback, regenerate with prompt refinement, version gallery, drop button
4. **Results**: BackgroundRemovalStep — before/after comparison, "Edit" button opens ImageEditor dialog
5. **Listings**: WizardListingsStep — listing editor with char counters, marketplace previews, shop selection, publish/draft toggles, Printify send + results

### Step 6: Edge Functions
Deploy these 7 edge functions (see Section 2.3 for complete specifications):
- `mf-analyze` — AI content analysis + credit deduction
- `mf-generate-designs` — AI image generation with prompt refinement
- `mf-remove-bg` — Remove.bg integration
- `mf-generate-listings` — AI listing copy generation + Printify blueprint discovery
- `mf-send-to-printify` — Multi-shop Printify product creation
- `mf-settings` — Settings CRUD with key validation
- `mf-stripe-webhook` — Stripe subscription management

All use authenticated user pattern (not admin-only). The `mf-analyze` function checks and deducts credits. AI calls use `https://ai.gateway.lovable.dev/v1/chat/completions` with `Authorization: Bearer ${Deno.env.get("LOVABLE_API_KEY")}`.

### Step 7: Image Editor
Full canvas-based editor opened as Dialog:
- Toolbar: Select, Crop (SVG overlay with draggable handles), Draw (color + size), Eraser, Text (size + color + click-to-place), Adjustments
- Undo/redo (max 20 history entries)
- 90° rotation CW/CCW
- Brightness/Contrast/Saturation sliders (CSS filter preview, baked on export)
- Checkerboard transparency background
- PNG blob export with upload to storage
- Load images as blob to avoid CORS canvas taint

### Step 8: Additional Pages
- `/pricing` — Full pricing page with plan comparison table and FAQ
- `/how-it-works` — Visual 5-step walkthrough
- `/settings` — Account settings (profile, billing, API keys)
- `/terms` and `/privacy` — Legal pages
- 404 page

All pages should have proper SEO: unique title (<60 chars), meta description (<160 chars), single H1, semantic HTML.
