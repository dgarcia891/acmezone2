
-- ============================================
-- Scam Alert tables (sa_ prefix)
-- ============================================

-- 1. sa_patterns
CREATE TABLE public.sa_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase text NOT NULL UNIQUE,
  category text NOT NULL,
  severity_weight integer NOT NULL DEFAULT 1,
  source text NOT NULL DEFAULT 'manual',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sa_patterns ENABLE ROW LEVEL SECURITY;

-- Publicly readable (anon key)
CREATE POLICY "Anyone can read active patterns"
  ON public.sa_patterns FOR SELECT
  USING (active = true);

-- Only admins can mutate
CREATE POLICY "Admins can manage patterns"
  ON public.sa_patterns FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 2. sa_detections
CREATE TABLE public.sa_detections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  url_hash text NOT NULL,
  signals jsonb NOT NULL,
  severity text NOT NULL,
  extension_version text,
  ai_verdict text,
  ai_confidence integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sa_detections ENABLE ROW LEVEL SECURITY;

-- Only admins can read (edge functions use service role)
CREATE POLICY "Admins can view detections"
  ON public.sa_detections FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage detections"
  ON public.sa_detections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. sa_corrections
CREATE TABLE public.sa_corrections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  detection_id uuid REFERENCES public.sa_detections(id),
  feedback text NOT NULL,
  user_comment text,
  url_hash text NOT NULL,
  review_status text NOT NULL DEFAULT 'pending',
  ai_review_result jsonb,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sa_corrections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view corrections"
  ON public.sa_corrections FOR SELECT
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins can manage corrections"
  ON public.sa_corrections FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. sa_app_config
CREATE TABLE public.sa_app_config (
  key text PRIMARY KEY,
  value jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sa_app_config ENABLE ROW LEVEL SECURITY;

-- Publicly readable (edge functions need this via anon key)
CREATE POLICY "Anyone can read sa_app_config"
  ON public.sa_app_config FOR SELECT
  USING (true);

CREATE POLICY "Admins can manage sa_app_config"
  ON public.sa_app_config FOR ALL
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Updated_at trigger for sa_patterns
CREATE TRIGGER update_sa_patterns_updated_at
  BEFORE UPDATE ON public.sa_patterns
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Updated_at trigger for sa_app_config
CREATE TRIGGER update_sa_app_config_updated_at
  BEFORE UPDATE ON public.sa_app_config
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
