
-- Performance index for audit history queries
CREATE INDEX IF NOT EXISTS idx_pattern_adjustments_phrase_id ON pattern_adjustments(phrase_id);

-- Secure function to return adjustment history with admin emails
CREATE OR REPLACE FUNCTION public.get_adjustment_history(_limit integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  phrase_id uuid,
  correction_id uuid,
  old_weight integer,
  new_weight integer,
  adjustment_reason text,
  adjusted_by uuid,
  created_at timestamptz,
  pattern_phrase text,
  pattern_severity_weight integer,
  admin_email text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pa.id,
    pa.phrase_id,
    pa.correction_id,
    pa.old_weight,
    pa.new_weight,
    pa.adjustment_reason,
    pa.adjusted_by,
    pa.created_at,
    sp.phrase,
    sp.severity_weight,
    au.email
  FROM public.pattern_adjustments pa
  LEFT JOIN public.sa_patterns sp ON pa.phrase_id = sp.id
  LEFT JOIN auth.users au ON pa.adjusted_by = au.id
  WHERE has_role(auth.uid(), 'admin')
  ORDER BY pa.created_at DESC
  LIMIT _limit;
$$;
