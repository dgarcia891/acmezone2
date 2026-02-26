
-- Add new columns to az_profiles
ALTER TABLE public.az_profiles
  ADD COLUMN IF NOT EXISTS trial_credits integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS has_byok_license boolean NOT NULL DEFAULT false;

-- Update the handle_new_user_profile trigger function to set trial_credits = 3
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.az_profiles (user_id, email, trial_credits)
  VALUES (NEW.id, NEW.email, 3)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$function$;
