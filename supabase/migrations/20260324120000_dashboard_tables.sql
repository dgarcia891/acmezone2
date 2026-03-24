CREATE TABLE IF NOT EXISTS public.dashboard_subscriptions (
    submitter_id TEXT PRIMARY KEY,
    license_code TEXT UNIQUE NOT NULL,
    email TEXT,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    status TEXT DEFAULT 'pending',
    current_period_end TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.ir_video_analyses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    submitter_id TEXT REFERENCES public.dashboard_subscriptions(submitter_id),
    analysis_type TEXT NOT NULL,
    video_id TEXT NOT NULL,
    video_url TEXT,
    video_title TEXT,
    thumbnail_url TEXT,
    ai_results JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ir_video_analyses_submitter ON public.ir_video_analyses(submitter_id);
