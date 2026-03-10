ALTER TABLE public.az_pod_design_versions ADD COLUMN IF NOT EXISTS color_name text DEFAULT NULL;
ALTER TABLE public.az_pod_design_versions ADD COLUMN IF NOT EXISTS bg_hex text DEFAULT NULL;