
ALTER TABLE public.az_pod_settings
  ADD COLUMN IF NOT EXISTS tshirt_margin_pct integer DEFAULT 100,
  ADD COLUMN IF NOT EXISTS sticker_margin_pct integer DEFAULT 100;

ALTER TABLE public.az_pod_printify_shops
  ADD COLUMN IF NOT EXISTS tshirt_margin_pct integer DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS sticker_margin_pct integer DEFAULT NULL;
