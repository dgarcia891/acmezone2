
-- Add CHECK constraints to sa_patterns
ALTER TABLE public.sa_patterns
  ADD CONSTRAINT sa_patterns_category_check CHECK (category IN ('keyword', 'phrase', 'tld', 'domain')),
  ADD CONSTRAINT sa_patterns_severity_weight_check CHECK (severity_weight IN (1, 2)),
  ADD CONSTRAINT sa_patterns_source_check CHECK (source IN ('manual', 'ai_promoted', 'community'));

-- Add default and CHECK constraints to sa_detections
ALTER TABLE public.sa_detections
  ALTER COLUMN signals SET DEFAULT '{}'::jsonb,
  ADD CONSTRAINT sa_detections_severity_check CHECK (severity IN ('SAFE', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  ADD CONSTRAINT sa_detections_ai_verdict_check CHECK (ai_verdict IN ('CONFIRMED', 'DOWNGRADED', 'ESCALATED')),
  ADD CONSTRAINT sa_detections_ai_confidence_check CHECK (ai_confidence BETWEEN 0 AND 100);

-- Add CHECK constraints to sa_corrections, fix FK to ON DELETE SET NULL
ALTER TABLE public.sa_corrections
  ADD CONSTRAINT sa_corrections_feedback_check CHECK (feedback IN ('false_positive', 'false_negative', 'wrong_severity')),
  ADD CONSTRAINT sa_corrections_review_status_check CHECK (review_status IN ('pending', 'accepted', 'rejected'));

-- Drop and recreate FK with ON DELETE SET NULL
ALTER TABLE public.sa_corrections
  DROP CONSTRAINT IF EXISTS sa_corrections_detection_id_fkey;

ALTER TABLE public.sa_corrections
  ADD CONSTRAINT sa_corrections_detection_id_fkey
  FOREIGN KEY (detection_id) REFERENCES public.sa_detections(id) ON DELETE SET NULL;
