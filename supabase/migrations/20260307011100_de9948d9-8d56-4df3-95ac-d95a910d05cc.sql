
CREATE TABLE IF NOT EXISTS sa_user_reports (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL,
    report_type TEXT DEFAULT 'scam',
    description TEXT,
    sender_email TEXT,
    subject TEXT,
    body_preview TEXT,
    user_notes TEXT,
    severity TEXT DEFAULT 'UNKNOWN',
    indicators JSONB DEFAULT '[]'::jsonb,
    scan_result JSONB DEFAULT '{}'::jsonb,
    extension_version TEXT,
    review_status TEXT DEFAULT 'pending',
    reviewed_by UUID REFERENCES auth.users(id),
    reviewed_at TIMESTAMPTZ,
    admin_notes TEXT,
    promoted_pattern_id UUID REFERENCES sa_patterns(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sa_user_reports_status ON sa_user_reports(review_status);
CREATE INDEX IF NOT EXISTS idx_sa_user_reports_created ON sa_user_reports(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_sa_user_reports_severity ON sa_user_reports(severity);

ALTER TABLE sa_user_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to user reports"
    ON sa_user_reports FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION update_sa_user_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_sa_user_reports_updated_at
    BEFORE UPDATE ON sa_user_reports
    FOR EACH ROW
    EXECUTE FUNCTION update_sa_user_reports_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE sa_user_reports;
