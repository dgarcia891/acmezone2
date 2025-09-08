-- Remove unused restaurant contact data columns
ALTER TABLE public.restaurants DROP COLUMN IF EXISTS email;
ALTER TABLE public.restaurants DROP COLUMN IF EXISTS phone;