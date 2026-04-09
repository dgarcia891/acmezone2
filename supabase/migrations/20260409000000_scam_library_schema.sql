-- 1. Create Suggestions Table
CREATE TABLE IF NOT EXISTS sa_phrase_suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'general',
  context TEXT,
  submitter_ip TEXT,
  status TEXT NOT NULL DEFAULT 'pending',  -- pending | approved | rejected
  reviewed_by UUID REFERENCES auth.users(id),
  reviewed_at TIMESTAMPTZ,
  promoted_pattern_id UUID REFERENCES sa_patterns(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optimize queries for tracking status, preventing duplicates, and rate limiting
CREATE INDEX IF NOT EXISTS idx_phrase_suggestions_status ON sa_phrase_suggestions(status);
CREATE INDEX IF NOT EXISTS idx_phrase_suggestions_phrase ON sa_phrase_suggestions(LOWER(phrase));
CREATE INDEX IF NOT EXISTS idx_phrase_suggestions_ip_time ON sa_phrase_suggestions(submitter_ip, created_at);

ALTER TABLE sa_phrase_suggestions ENABLE ROW LEVEL SECURITY;

-- NO PUBLIC INSERT POLICY. Edge functions use service_role to bypass RLS.
-- Admin Management Policy
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admin can manage suggestions' AND tablename = 'sa_phrase_suggestions') THEN
        CREATE POLICY "Admin can manage suggestions" ON sa_phrase_suggestions FOR ALL
          USING (EXISTS (SELECT 1 FROM az_user_roles WHERE user_id = auth.uid() AND role = 'admin'));
    END IF;
END $$;

-- 2. Open Public Read Access to ACTIVE sa_patterns ONLY
ALTER TABLE sa_patterns ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Public read active patterns' AND tablename = 'sa_patterns') THEN
        -- Explicitly restricted to anon
        CREATE POLICY "Public read active patterns" ON sa_patterns FOR SELECT TO anon USING (active = true);
    END IF;
END $$;

-- 3. Atomic Admin Approval RPC
CREATE OR REPLACE FUNCTION sa_approve_phrase_suggestion(
    p_suggestion_id UUID,
    p_phrase TEXT,
    p_category TEXT,
    p_severity_weight INTEGER
) RETURNS UUID AS $$
DECLARE
    v_pattern_id UUID;
BEGIN
    -- Verify Admin
    IF NOT EXISTS (SELECT 1 FROM az_user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
        RAISE EXCEPTION 'Unauthorized: Requires admin privileges';
    END IF;

    -- Insert into patterns safely
    INSERT INTO sa_patterns (phrase, category, severity_weight, source, active)
    VALUES (p_phrase, p_category, p_severity_weight, 'community_promotion', true)
    RETURNING id INTO v_pattern_id;

    -- Update suggestion atomicity
    UPDATE sa_phrase_suggestions
    SET status = 'approved',
        promoted_pattern_id = v_pattern_id,
        reviewed_by = auth.uid(),
        reviewed_at = NOW()
    WHERE id = p_suggestion_id;

    RETURN v_pattern_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE EXECUTE ON FUNCTION sa_approve_phrase_suggestion FROM public;
REVOKE EXECUTE ON FUNCTION sa_approve_phrase_suggestion FROM anon;
