-- Create AZ prefixed tables for Pre-Apply AI credit system
-- These tables will work with the existing PA tables for backwards compatibility

-- AZ Credits table (mirrors pa_credits functionality)
CREATE TABLE public.AZ_credits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  delta INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  reason TEXT
);

-- Enable RLS
ALTER TABLE public.AZ_credits ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AZ_credits
CREATE POLICY "AZ_credits_read_own" ON public.AZ_credits
FOR SELECT
USING (auth.uid() = user_id);

-- AZ Profiles table (mirrors pa_profiles functionality)
CREATE TABLE public.AZ_profiles (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT now(),
  email TEXT
);

-- Enable RLS
ALTER TABLE public.AZ_profiles ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AZ_profiles
CREATE POLICY "AZ_profiles_read_own" ON public.AZ_profiles
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "AZ_profiles_insert_own" ON public.AZ_profiles
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "AZ_profiles_update_own" ON public.AZ_profiles
FOR UPDATE
USING (auth.uid() = user_id);

-- AZ Usage Logs table (mirrors pa_usage_logs functionality)
CREATE TABLE public.AZ_usage_logs (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  cached BOOLEAN DEFAULT false,
  tokens_in INTEGER DEFAULT 0,
  tokens_out INTEGER DEFAULT 0,
  cost_cents INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  provider TEXT NOT NULL,
  company TEXT,
  job_title TEXT
);

-- Enable RLS
ALTER TABLE public.AZ_usage_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AZ_usage_logs
CREATE POLICY "AZ_usage_read_own" ON public.AZ_usage_logs
FOR SELECT
USING (auth.uid() = user_id);

-- AZ Stripe Events table (mirrors pa_stripe_events functionality)
CREATE TABLE public.AZ_stripe_events (
  id TEXT PRIMARY KEY,
  type TEXT,
  payload JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.AZ_stripe_events ENABLE ROW LEVEL SECURITY;

-- RLS Policies for AZ_stripe_events (no read access for users)
CREATE POLICY "AZ_stripe_events_read_none" ON public.AZ_stripe_events
FOR SELECT
USING (false);

-- Create function to get AZ credit balance
CREATE OR REPLACE FUNCTION public.AZ_get_my_balance()
RETURNS integer
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT COALESCE(SUM(delta), 0)::INT
  FROM AZ_credits
  WHERE user_id = auth.uid();
$$;

-- Create function to handle new user for AZ system
CREATE OR REPLACE FUNCTION public.AZ_handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.AZ_profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  
  -- Give new users 100 free credits (1 free analysis)
  INSERT INTO public.AZ_credits (user_id, delta, reason)
  VALUES (NEW.id, 100, 'signup_bonus');
  
  RETURN NEW;
END;
$$;

-- Create trigger for new user registration
CREATE TRIGGER on_auth_user_created_az
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.AZ_handle_new_user();