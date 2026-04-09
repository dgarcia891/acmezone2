-- Migration: Add false_positive_count, auto_promoted_at to sa_domain_reputation
-- Business Impact: Safe — additive columns with defaults, no existing data affected
-- Purpose: Enables community-driven false-positive tracking and records when a domain
--          was auto-promoted to the blocklist based on the community threshold formula.

ALTER TABLE public.sa_domain_reputation
  ADD COLUMN IF NOT EXISTS false_positive_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS auto_promoted_at TIMESTAMPTZ;

-- Index for querying recently auto-promoted domains in the admin UI
CREATE INDEX IF NOT EXISTS idx_domain_rep_auto_promoted
  ON public.sa_domain_reputation(auto_promoted_at DESC)
  WHERE auto_promoted_at IS NOT NULL;

-- ============================================================================
-- Add min_reports threshold config to sa_app_config
-- ============================================================================
-- This lets admins tune the community-promotion threshold via the DB without
-- a code deploy. Default of 1 works for solo testing; raise to 5+ for production.

INSERT INTO public.sa_app_config (key, value)
VALUES
  ('min_reports_for_auto_promote', '1'::jsonb),
  ('min_consensus_ratio', '0.70'::jsonb),
  ('ai_auto_promote_threshold', '85'::jsonb)
ON CONFLICT (key) DO NOTHING;


-- ============================================================================
-- RLS: sa_domain_reputation — ensure service_role can update FP columns
-- ============================================================================
-- sa_domain_reputation should already allow service_role writes.
-- Documenting for audit purposes; no new policy needed if existing policy
-- already grants service_role or authenticated full access.
-- Review: SELECT * FROM pg_policies WHERE tablename = 'sa_domain_reputation';
