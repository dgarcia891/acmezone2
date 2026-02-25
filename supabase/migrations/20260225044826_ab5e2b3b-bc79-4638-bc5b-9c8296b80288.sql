
-- Create az_profiles table for InsightReel users
CREATE TABLE public.az_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE,
  email TEXT NOT NULL,
  is_pro BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.az_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view their own profile
CREATE POLICY "Users can view own profile"
  ON public.az_profiles FOR SELECT
  USING (auth.uid() = user_id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.az_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- Service role inserts (auto-creation on signup via trigger)
CREATE POLICY "System can insert profiles"
  ON public.az_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Admins can view all profiles
CREATE POLICY "Admins can view all profiles"
  ON public.az_profiles FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Admins can update all profiles (e.g. set is_pro via webhook)
CREATE POLICY "Admins can update all profiles"
  ON public.az_profiles FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.az_profiles (user_id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user_profile();

-- Timestamp trigger for az_profiles
CREATE TRIGGER update_az_profiles_updated_at
  BEFORE UPDATE ON public.az_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create az_usage_logs table
CREATE TABLE public.az_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action TEXT NOT NULL DEFAULT 'analyze',
  metadata JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.az_usage_logs ENABLE ROW LEVEL SECURITY;

-- Users can view their own logs
CREATE POLICY "Users can view own usage logs"
  ON public.az_usage_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Admins can view all logs
CREATE POLICY "Admins can view all usage logs"
  ON public.az_usage_logs FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

-- System inserts via edge functions (service role)
CREATE POLICY "System can insert usage logs"
  ON public.az_usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Index for fast user lookups
CREATE INDEX idx_az_usage_logs_user_id ON public.az_usage_logs (user_id);
CREATE INDEX idx_az_profiles_user_id ON public.az_profiles (user_id);
