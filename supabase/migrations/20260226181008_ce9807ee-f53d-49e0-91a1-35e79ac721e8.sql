
-- Add daily quota columns to az_profiles
ALTER TABLE public.az_profiles
  ADD COLUMN IF NOT EXISTS daily_usage_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_usage_reset timestamp with time zone NOT NULL DEFAULT now();

-- Create az_app_config table for kill switch
CREATE TABLE IF NOT EXISTS public.az_app_config (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT 'false'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.az_app_config ENABLE ROW LEVEL SECURITY;

-- Only admins can read/write app config
CREATE POLICY "Admins can view app config"
  ON public.az_app_config FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can update app config"
  ON public.az_app_config FOR UPDATE
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can insert app config"
  ON public.az_app_config FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Seed the maintenance_mode flag
INSERT INTO public.az_app_config (key, value)
VALUES ('maintenance_mode', 'false'::jsonb)
ON CONFLICT (key) DO NOTHING;
