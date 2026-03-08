

# POD Pipeline SaaS — Complete PRD & Technical Design Document

## 1. PRODUCT REQUIREMENTS DOCUMENT

### 1.1 Product Vision
**MerchFlow** (working name) — an AI-powered Print-on-Demand automation platform that takes a content idea (meme, viral text, image) and turns it into production-ready merchandise listed across multiple marketplaces, in minutes instead of hours.

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

### 1.5 Marketing Website Pages
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

All tables prefixed with `app_` (or your chosen prefix). Use Supabase migrations.

```sql
-- Roles enum
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

-- User roles (NEVER store roles on profiles table)
CREATE TABLE public.app_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id, role)
);
ALTER TABLE public.app_user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function for role checks (avoids recursive RLS)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.app_user_roles WHERE user_id = _user_id AND role = _role)
$$;

-- Profiles
CREATE TABLE public.app_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'free',
  credits_remaining INTEGER NOT NULL DEFAULT 3,
  credits_reset_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.app_profiles ENABLE ROW LEVEL SECURITY;

-- Auto-create profile + role on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.app_profiles (user_id, email) VALUES (NEW.id, NEW.email) ON CONFLICT DO NOTHING;
  INSERT INTO public.app_user_roles (user_id, role) VALUES (NEW.id, 'user') ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- POD Ideas (main pipeline tracker)
CREATE TABLE public.app_pod_ideas (
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
ALTER TABLE public.app_pod_ideas ENABLE ROW LEVEL SECURITY;
-- RLS: users can only see/manage their own ideas
CREATE POLICY "Users manage own ideas" ON public.app_pod_ideas FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Design versions (iteration history)
CREATE TABLE public.app_pod_design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.app_pod_ideas(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL,
  image_url TEXT NOT NULL,
  prompt TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_pod_design_versions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own versions" ON public.app_pod_design_versions FOR ALL
  TO authenticated USING (idea_id IN (SELECT id FROM public.app_pod_ideas WHERE user_id = auth.uid()))
  WITH CHECK (idea_id IN (SELECT id FROM public.app_pod_ideas WHERE user_id = auth.uid()));

-- Listings (AI-generated copy)
CREATE TABLE public.app_pod_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES public.app_pod_ideas(id) ON DELETE CASCADE,
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
ALTER TABLE public.app_pod_listings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own listings" ON public.app_pod_listings FOR ALL
  TO authenticated USING (idea_id IN (SELECT id FROM public.app_pod_ideas WHERE user_id = auth.uid()))
  WITH CHECK (idea_id IN (SELECT id FROM public.app_pod_ideas WHERE user_id = auth.uid()));

-- User settings (API keys per user)
CREATE TABLE public.app_pod_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  printify_api_key TEXT,
  printify_shop_id TEXT,
  removebg_api_key TEXT,
  auto_publish BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_pod_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own settings" ON public.app_pod_settings FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Additional Printify shops
CREATE TABLE public.app_pod_printify_shops (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  shop_id TEXT NOT NULL,
  marketplace TEXT NOT NULL DEFAULT 'default',
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  auto_publish BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_pod_printify_shops ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own shops" ON public.app_pod_printify_shops FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Labels system
CREATE TABLE public.app_pod_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.app_pod_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own labels" ON public.app_pod_labels FOR ALL
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

CREATE TABLE public.app_pod_idea_labels (
  idea_id UUID NOT NULL REFERENCES public.app_pod_ideas(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES public.app_pod_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, label_id)
);
ALTER TABLE public.app_pod_idea_labels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own idea labels" ON public.app_pod_idea_labels FOR ALL
  TO authenticated USING (idea_id IN (SELECT id FROM public.app_pod_ideas WHERE user_id = auth.uid()))
  WITH CHECK (idea_id IN (SELECT id FROM public.app_pod_ideas WHERE user_id = auth.uid()));
```

**Storage bucket**: Create a public `pod-assets` bucket for design images.

### 2.3 Edge Functions (7 total)

Every edge function follows this auth pattern (NOT admin-only — regular authenticated users):

```typescript
// Standard auth pattern for ALL edge functions
const authHeader = req.headers.get("Authorization");
if (!authHeader) return json({ error: "No authorization header" }, 401);
const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const token = authHeader.replace("Bearer ", "");
const { data: { user }, error: userError } = await supabase.auth.getUser(token);
if (userError || !user) return json({ error: "Invalid token" }, 401);
// Then check credits: fetch profile, verify credits_remaining > 0, decrement on success
```

**Key difference from current system**: Current system checks `admin` role. SaaS version checks `authenticated user` + credit balance.

#### 2.3.1 `pod-analyze`
- **Input**: `{ idea_text: string, images?: Array<{base64, media_type}>, product_type: string }`
- **Process**: Calls Gemini 3 Flash via `https://ai.gateway.lovable.dev/v1/chat/completions` with detailed system prompt requesting JSON with commercial_viability_score (1-10), content analysis, design prompts, copyright assessment
- **Critical prompt** (copy exactly):
```
You are a viral content analyst and merchandise expert. Analyze content ideas for Print-on-Demand merchandise potential. Return ONLY a raw JSON object (no markdown, no code fences) with exactly these fields:
{
  "content_text": "...", "platform": "...", "engagement_score": "...",
  "viral_indicators": "...", "commercial_viability_score": 7,
  "score_explanation": "...", "target_audience": "...",
  "merchandise_applications": "...", "copyright_status": "...",
  "usage_rights": "...", "legal_notes": "...", "longevity_prediction": "...",
  "market_positioning": "...", "font_suggestions": "...",
  "design_considerations": "...", "product_recommendations": "...",
  "additional_notes": "...",
  "sticker_design_prompt": "A detailed image generation prompt for sticker...",
  "tshirt_design_prompt": "A detailed image generation prompt for t-shirt..."
}
```
- **Storage**: Uploads first reference image to `pod-assets/references/{uuid}.{ext}`
- **DB**: Inserts into `app_pod_ideas` with status `analyzed`
- **Returns**: `{ idea }` — the full idea record

#### 2.3.2 `pod-generate-designs`
- **Input**: `{ idea_id, product_type, sticker_prompt?, tshirt_prompt?, sticker_guidance?, tshirt_guidance? }`
- **Process (2 phases)**:
  1. **Prompt refinement** (if guidance provided): Calls Gemini 2.5 Flash asking it to rewrite the image prompt incorporating the user's plain-English guidance. System prompt: `"You are a prompt engineer for AI image generation. Given the original prompt and user guidance, rewrite the prompt incorporating changes. Keep all technical specs. Return ONLY the new prompt."`
  2. **Image generation**: Calls `google/gemini-3-pro-image-preview` with `modalities: ["image", "text"]`
- **Critical design prompts** (prepended to user prompt):
  - Sticker: `"Create a die-cut sticker design. The artwork MUST fill the ENTIRE canvas from edge to edge with absolutely NO margin, NO padding, and NO white border around it... solid pure white (#FFFFFF) background ONLY behind artwork..."`
  - T-shirt: `"Create a t-shirt graphic design at high resolution (4500x5400 pixels)... artwork MUST be LARGE and PROMINENT, filling at least 70-80% of the canvas... solid pure white (#FFFFFF) background..."`
- **Storage**: Uploads to `pod-assets/pod-designs/{type}-{idea_id}-raw.png`
- **Parallel execution**: Uses `Promise.allSettled` for both types simultaneously
- **DB**: Updates idea with design URLs, raw URLs, refined prompts, status `designs_generated`
- **Returns**: `{ idea }`

#### 2.3.3 `pod-remove-bg`
- **Input**: `{ idea_id }`
- **Process**: Downloads each design image, sends to Remove.bg API (`https://api.remove.bg/v1.0/removebg`) as `image_file` FormData with `size: "auto"`, uploads transparent PNG result
- **Storage**: Raw stays at `-raw.png`, transparent overwrites at `pod-designs/{type}-{idea_id}.png`
- **DB**: Preserves raw URLs in `sticker_raw_url`/`tshirt_raw_url`, updates `sticker_design_url`/`tshirt_design_url` with transparent versions, status `bg_removed`
- **Remove.bg key**: Fetched from user's `app_pod_settings` row (NOT a global secret)
- **Returns**: `{ idea }`

#### 2.3.4 `pod-generate-listings`
- **Input**: `{ idea_id }`
- **Process**: For each product type with a design URL, calls Gemini 3 Flash with this prompt:
```
You are an expert e-commerce copywriter for print-on-demand products sold on Etsy and eBay.
Generate: { title (max 140 chars), description (200-400 words), tags (13 items, max 20 chars each), seo_keywords, etsy_title (max 140 chars), ebay_title (max 80 chars) }
```
- **Auto-discovers Printify blueprints**: Fetches `/v1/catalog/blueprints.json`, matches keywords ("sticker"/"kiss-cut" for stickers, "unisex"/"t-shirt"/"bella"/"3001" for tshirts), fetches print providers, stores IDs on listing
- **DB**: Deletes existing listings for idea (regeneration support), inserts new listings, updates idea status to `listings`
- **Returns**: `{ listings }`

#### 2.3.5 `pod-send-to-printify`
- **Input**: `{ idea_id, product_types?: string[], publish_overrides?: Record<string, boolean> }`
- **Process per listing per shop**:
  1. Upload design image via `POST /v1/uploads/images.json` with `{ file_name, url }`
  2. Fetch variants via `/v1/catalog/blueprints/{id}/print_providers/{id}/variants.json`
  3. Create product via `POST /v1/shops/{shop_id}/products.json` with marketplace-specific title resolution
  4. Optionally publish via `POST /v1/shops/{shop_id}/products/{id}/publish.json`
- **Title resolution**: eBay → `ebay_title` (80 char limit), Etsy → `etsy_title` (140 chars), default → `title`
- **Default pricing**: Sticker: $4.99, T-shirt: $24.99 (in cents: 499, 2499)
- **Returns**: `{ products: Array<{ product_type, printify_product_id, printify_url, title, shop_id, marketplace, shop_label, images, variants_count, variants_enabled, published, error? }> }`

#### 2.3.6 `pod-settings`
- **GET**: Returns masked settings (API keys shown as `••••••••`) + boolean `has_*` flags + additional shops list
- **PUT**: Validates Remove.bg key against `https://api.remove.bg/v1.0/account`, returns `{ valid, credits }`
- **POST**: Handles multiple actions via `body.action`:
  - `add_shop`: Insert into `app_pod_printify_shops`
  - `remove_shop`: Delete by id
  - `toggle_shop`: Update `is_active`
  - `set_shop_auto_publish`: Update `auto_publish`
  - Default (no action): Upsert main settings

#### 2.3.7 `stripe-webhook` (new for SaaS)
- Handle `checkout.session.completed`, `invoice.paid`, `customer.subscription.updated/deleted`
- Update `app_profiles` with plan, credits, stripe IDs

### 2.4 Frontend Architecture

#### File Structure
```
src/
├── contexts/AuthContext.tsx          # Auth state + Supabase listener
├── hooks/
│   ├── usePodPipeline.ts            # All pipeline mutations/queries
│   ├── usePodListings.ts            # Listing CRUD
│   └── usePodKanban.ts              # Status updates, labels, priorities
├── components/
│   ├── layout/Header.tsx            # Nav with auth state
│   ├── layout/Footer.tsx
│   ├── auth/ProtectedRoute.tsx      # Redirect to /auth if not logged in
│   ├── pod/
│   │   ├── KanbanBoard.tsx          # DnD board with collapsible columns
│   │   ├── KanbanColumn.tsx         # Droppable column, collapsed/expanded
│   │   ├── KanbanCard.tsx           # Draggable card with sortable
│   │   ├── PipelineStepIndicator.tsx # 5-step progress bar
│   │   ├── IdeaInputForm.tsx        # Text + multi-image upload + product type
│   │   ├── AnalysisReview.tsx       # Score badge + analysis fields
│   │   ├── DesignGeneration.tsx     # Side-by-side design cards with regeneration
│   │   ├── DesignGallery.tsx        # Version history horizontal scroll
│   │   ├── BackgroundRemovalStep.tsx # Before/after comparison
│   │   ├── ImageEditor.tsx          # Canvas-based editor
│   │   ├── editor/EditorToolbar.tsx  # Select/Crop/Draw/Eraser/Text/Adjust
│   │   ├── editor/AdjustmentSliders.tsx # Brightness/Contrast/Saturation
│   │   ├── editor/CropOverlay.tsx   # Draggable crop rectangle with handles
│   │   ├── ListingEditor.tsx        # Inline edit with marketplace preview
│   │   ├── WizardListingsStep.tsx   # Finalize: listings + shop selection + Printify results
│   │   ├── PodSettingsForm.tsx      # API keys + multi-shop management
│   │   └── PodHistoryTable.tsx      # Table view (optional)
│   └── ui/                          # shadcn/ui components (standard)
├── pages/
│   ├── Index.tsx                    # Landing page
│   ├── Auth.tsx                     # Login/signup/reset
│   ├── Dashboard.tsx                # Main app: Kanban board + settings toggle
│   ├── Pricing.tsx                  # Plan comparison + Stripe checkout
│   └── Pipeline.tsx                 # The 5-step wizard
└── App.tsx                          # Routes
```

#### Key Component: KanbanBoard
- **Columns**: `pending`, `designing`, `listings`, `ready`, `production`, `live` + collapsed `rejected` section
- **State**: `collapsedColumns` persisted in `localStorage` key `pod-kanban-collapsed`
- **DnD**: `@dnd-kit/core` DndContext with PointerSensor (5px activation distance), `closestCenter` collision detection
- **Status mapping**: `analyzed` → `designing`, `designs_generated` → `designing`, `bg_removed` → `ready`
- **Collapsed columns**: 40px wide strip, `writing-mode: vertical-rl`, emoji + badge count + vertical label, clickable to expand

#### Key Component: ImageEditor
Full canvas-based editor with:
- **Tools**: Select/Pan, Crop, Draw (color picker + size slider), Eraser (destination-out composite), Text (size + color + click-to-place), Adjustments (brightness/contrast/saturation via CSS filter)
- **History**: Undo/redo stack (max 20 entries) using `getImageData`/`putImageData`
- **Rotation**: 90° CW/CCW via canvas transform
- **Crop**: SVG mask overlay with draggable corner handles (nw/ne/sw/se) and move handle
- **Scale**: Canvas renders at full resolution internally, displays at fitted size. All mouse coords multiplied by `scaleFactor = canvas.width / displaySize.w`
- **Checkerboard**: CSS gradient pattern for transparency visualization
- **Export**: Applies CSS filter adjustments via offscreen canvas, exports as PNG blob
- **Image loading**: Fetches image as blob first (avoids CORS with canvas `toBlob`)

#### Key Component: DesignGeneration
- Each product type gets a `DesignCard` with:
  - Image preview or loading spinner with cycling status messages every 4 seconds
  - Elapsed timer (`{mins}:{secs}`)
  - Guidance textarea ("What do you want changed?")
  - Collapsible advanced section with raw prompt textarea
  - Regenerate button (sends guidance + optionally edited prompt)
  - "Drop" button (removes one product type when both exist)
  - Version history gallery (horizontal scroll, hover reveals select/delete buttons)

#### Key Component: WizardListingsStep
- Shows "Publishing To" card with all configured shops + marketplace badges
- Listing content with inline `ListingEditor` per product type:
  - Title, description, tags (add/remove), Etsy title (140 char counter), eBay title (80 char counter)
  - Blueprint ID + Print Provider ID inputs
  - Collapsible "Marketplace Preview" showing resolved title per shop with character compliance indicators
- Product selection checkboxes with design thumbnails
- Per-shop publish/draft toggle switches (initialized from shop defaults)
- After send: Printify results cards grouped by shop showing confirmed titles, variant counts, mockup image grids, and "View in Printify" links
- Status actions: "Mark as Live", "Create Variant"

### 2.5 Critical Implementation Details

**Cache busting**: All image URLs from edge functions use fixed paths. After regeneration, append `?t=${Date.now()}` to URLs before setting state. Apply in:
- `applyGeneratedDesignToWizardIdea` (after design generation)
- `removeBgMutation` onSuccess (after background removal)

**Auto-triggers**:
- Step 3 (Generate): Auto-triggers `handleGenerate()` when entering step with no existing designs (guarded by `autoGenTriggered` flag)
- Step 4 (Review Designs): Auto-triggers `triggerBgRemoval()` on mount if status isn't already `bg_removed` (guarded by `bgAutoTriggeredRef`)

**Wizard step derivation from DB status**:
```typescript
function statusToStep(status: string): PipelineStep {
  switch (status) {
    case "pending": return "review";
    case "designing": case "analyzed": case "designs_generated": return "generate";
    case "bg_removed": return "results";
    case "listings": case "ready": case "production": case "live": return "listings";
    default: return "input";
  }
}
```

**Variant creation**: Clones idea text + product type, fetches source images as base64 to pre-populate the upload form, opens wizard at Step 1 as a new submission.

**Credit deduction** (new for SaaS): Add to `pod-analyze` edge function after successful analysis:
```typescript
await supabase.from('app_profiles')
  .update({ credits_remaining: profile.credits_remaining - 1 })
  .eq('user_id', user.id);
```

### 2.6 Required Secrets
- `LOVABLE_API_KEY` — Auto-provisioned by Lovable Cloud for AI gateway
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` — Auto-provisioned
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` — For payment processing
- User-provided (stored per-user in DB, NOT as secrets): Printify API Key, Remove.bg API Key

### 2.7 Storage Bucket
- Name: `pod-assets`, public
- Structure: `references/{uuid}.{ext}` for uploaded reference images, `pod-designs/{type}-{idea_id}-raw.png` for raw AI output, `pod-designs/{type}-{idea_id}.png` for transparent versions

### 2.8 Key Dependencies
```json
{
  "@dnd-kit/core": "^6.3.1",
  "@dnd-kit/sortable": "^10.0.0",
  "@supabase/supabase-js": "^2.89.0",
  "@tanstack/react-query": "^5.83.0",
  "react": "^18.3.1",
  "react-router-dom": "^6.30.1",
  "sonner": "^1.7.4",
  "date-fns": "^3.6.0",
  "lucide-react": "^0.462.0",
  "zod": "^3.25.76",
  "react-helmet-async": "^1.3.0"
}
```
Plus all shadcn/ui Radix primitives (accordion, dialog, dropdown-menu, select, switch, tabs, toast, tooltip, etc.) and `tailwindcss-animate`, `class-variance-authority`, `clsx`, `tailwind-merge`.

---

## 3. ONE-PROMPT BUILD INSTRUCTIONS

Build a SaaS web application called "MerchFlow" — an AI-powered Print-on-Demand automation platform. Use React + Vite + TypeScript + Tailwind CSS + shadcn/ui + Supabase (Lovable Cloud).

**Build in this order:**

1. **Database**: Create all tables from Section 2.2 above using migrations. Create the `pod-assets` public storage bucket.

2. **Auth**: Email/password authentication with AuthContext provider, ProtectedRoute component, login/signup/password-reset pages at `/auth`. Use `onAuthStateChange` listener set up BEFORE `getSession()`.

3. **Landing page** (`/`): Marketing homepage with hero section showing the 5-step pipeline visually, feature cards (AI Analysis, Design Generation, Background Removal, Listing Optimization, Multi-Shop Publishing), pricing cards linking to Stripe, and signup CTA.

4. **Dashboard** (`/dashboard`): Protected route. Toggle between Board view (KanbanBoard) and Settings view (PodSettingsForm). "New Idea" button opens wizard. Implement the full KanbanBoard with DnD, collapsible columns (localStorage persisted), and rejected section.

5. **Pipeline Wizard** (inline in dashboard, not separate page): 5-step wizard with PipelineStepIndicator. Implement all steps: IdeaInputForm → AnalysisReview → DesignGeneration (with guidance-first regeneration + version gallery) → BackgroundRemovalStep (with ImageEditor dialog) → WizardListingsStep (with ListingEditor + marketplace preview + Printify integration).

6. **Edge Functions**: Deploy all 7 edge functions from Section 2.3. Change auth from admin-role-check to authenticated-user + credit-check. The AI calls use `https://ai.gateway.lovable.dev/v1/chat/completions` with `Authorization: Bearer ${LOVABLE_API_KEY}`.

7. **Stripe integration**: Subscription checkout + webhook for plan/credit management.

8. **Image Editor**: Full canvas editor with toolbar (Select, Crop, Draw, Eraser, Text, Adjust), undo/redo history, rotation, crop overlay with drag handles, brightness/contrast/saturation sliders, checkerboard transparency background, PNG export.

