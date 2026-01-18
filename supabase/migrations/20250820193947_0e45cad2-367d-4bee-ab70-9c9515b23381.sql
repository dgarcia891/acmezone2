-- ============ PRE-APPLY AI BACKEND TABLES ============

-- User profiles for Pre-Apply system
CREATE TABLE IF NOT EXISTS public.pa_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT UNIQUE,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Credit ledger: +delta on purchase, -delta on analyze usage
CREATE TABLE IF NOT EXISTS public.pa_credits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  reason TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Per-request usage log (auditing/reporting)
CREATE TABLE IF NOT EXISTS public.pa_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,          -- 'openai' | 'gemini'
  company TEXT,
  job_title TEXT,
  cached BOOLEAN DEFAULT false,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Cache: dedupe identical analyses to avoid re-billing
CREATE TABLE IF NOT EXISTS public.pa_analysis_cache (
  cache_key TEXT PRIMARY KEY,
  result TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stripe event storage for webhook idempotency/audit
CREATE TABLE IF NOT EXISTS public.pa_stripe_events (
  id TEXT PRIMARY KEY,             -- stripe event id
  type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============ RLS POLICIES ============

ALTER TABLE pa_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_analysis_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE pa_stripe_events ENABLE ROW LEVEL SECURITY;

-- Users can read their own profile
CREATE POLICY "pa_profiles_read_own" ON pa_profiles
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert their own profile
CREATE POLICY "pa_profiles_insert_own" ON pa_profiles
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "pa_profiles_update_own" ON pa_profiles
  FOR UPDATE USING (auth.uid() = user_id);

-- Users can read their own credits
CREATE POLICY "pa_credits_read_own" ON pa_credits
  FOR SELECT USING (auth.uid() = user_id);

-- Users can read their own usage logs
CREATE POLICY "pa_usage_read_own" ON pa_usage_logs
  FOR SELECT USING (auth.uid() = user_id);

-- Cache is readable by anyone (it's non-sensitive text); writes only via service role
CREATE POLICY "pa_cache_read_all" ON pa_analysis_cache
  FOR SELECT USING (true);

-- Stripe events are not user-readable
CREATE POLICY "pa_stripe_events_read_none" ON pa_stripe_events
  FOR SELECT USING (false);

-- ============ VIEWS / FUNCTIONS ============

-- Current credit balance per user (aggregated)
CREATE OR REPLACE VIEW public.pa_credit_balance AS
SELECT user_id, COALESCE(SUM(delta), 0) AS balance
FROM pa_credits
GROUP BY user_id;

-- Helper function: return balance for the logged-in user
CREATE OR REPLACE FUNCTION public.pa_get_my_balance()
RETURNS INTEGER
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(SUM(delta), 0)::INT
  FROM pa_credits
  WHERE user_id = auth.uid();
$$;

-- Trigger to auto-create profile on user signup
CREATE OR REPLACE FUNCTION public.pa_handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.pa_profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Optional: Give new users 100 free credits (1 free analysis)
  INSERT INTO public.pa_credits (user_id, delta, reason)
  VALUES (NEW.id, 100, 'signup_bonus');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user signup
DROP TRIGGER IF EXISTS pa_on_auth_user_created ON auth.users;
CREATE TRIGGER pa_on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.pa_handle_new_user();