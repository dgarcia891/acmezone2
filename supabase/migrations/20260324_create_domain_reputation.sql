-- Domain Reputation System: Phase 1 Migration
-- DB Impact: SAFE — new tables only, no existing data affected
-- Created: 2026-03-24

-- ===========================================================================
-- Table: sa_domain_reputation (Rollup — one row per normalized domain)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS sa_domain_reputation (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain TEXT NOT NULL UNIQUE,
    total_score INTEGER NOT NULL DEFAULT 0,
    report_count INTEGER NOT NULL DEFAULT 0,
    distinct_reporters INTEGER NOT NULL DEFAULT 0,
    ai_modifier INTEGER NOT NULL DEFAULT 0,
    ai_reviewed_at TIMESTAMPTZ,
    ai_next_review TIMESTAMPTZ,
    external_source TEXT,
    external_flagged BOOLEAN NOT NULL DEFAULT FALSE,
    external_checked_at TIMESTAMPTZ,
    last_activity_at TIMESTAMPTZ DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'active'
        CHECK (status IN ('active', 'cleared', 'confirmed_dangerous')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by domain (already enforced by UNIQUE, but explicit for clarity)
CREATE INDEX IF NOT EXISTS idx_sa_domain_reputation_domain
    ON sa_domain_reputation (domain);

-- AI review scheduler: find domains due for review
CREATE INDEX IF NOT EXISTS idx_sa_domain_reputation_ai_next_review
    ON sa_domain_reputation (ai_next_review)
    WHERE ai_next_review IS NOT NULL;

-- External staleness check: find domains needing external refresh
CREATE INDEX IF NOT EXISTS idx_sa_domain_reputation_external_checked
    ON sa_domain_reputation (external_checked_at)
    WHERE external_checked_at IS NOT NULL;

-- ===========================================================================
-- Table: sa_domain_reports (Event log — one row per user report)
-- ===========================================================================
CREATE TABLE IF NOT EXISTS sa_domain_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    domain_id UUID NOT NULL REFERENCES sa_domain_reputation(id) ON DELETE CASCADE,
    domain TEXT NOT NULL,
    report_type TEXT NOT NULL
        CHECK (report_type IN ('suspicious', 'scammy', 'dangerous')),
    score INTEGER NOT NULL
        CHECK (score IN (1, 2, 3)),
    url TEXT,
    description TEXT,
    reporter_hash TEXT,
    ai_reviewed BOOLEAN NOT NULL DEFAULT FALSE,
    ai_reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Fast lookups by domain for aggregation queries
CREATE INDEX IF NOT EXISTS idx_sa_domain_reports_domain
    ON sa_domain_reports (domain);

-- Fast lookups by parent domain_id
CREATE INDEX IF NOT EXISTS idx_sa_domain_reports_domain_id
    ON sa_domain_reports (domain_id);

-- ===========================================================================
-- Rate limiting constraint: max 1 report per reporter per domain per day
-- Uses a generated column to extract the date from created_at
-- ===========================================================================
-- Postgres doesn't allow TIMESTAMPTZ::DATE in unique indexes because it's STABLE (timezone dependent),
-- so we explicitly cast to UTC first to make it IMMUTABLE.
CREATE UNIQUE INDEX IF NOT EXISTS idx_sa_domain_reports_rate_limit
    ON sa_domain_reports (domain_id, reporter_hash, (CAST(created_at AT TIME ZONE 'UTC' AS DATE)))
    WHERE reporter_hash IS NOT NULL;

-- ===========================================================================
-- Auto-update updated_at on sa_domain_reputation
-- ===========================================================================
CREATE OR REPLACE FUNCTION update_sa_domain_reputation_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sa_domain_reputation_updated_at ON sa_domain_reputation;
CREATE TRIGGER trg_sa_domain_reputation_updated_at
    BEFORE UPDATE ON sa_domain_reputation
    FOR EACH ROW
    EXECUTE FUNCTION update_sa_domain_reputation_updated_at();

-- ===========================================================================
-- RLS Policies (Edge Functions use service_role key, so these are permissive)
-- ===========================================================================
ALTER TABLE sa_domain_reputation ENABLE ROW LEVEL SECURITY;
ALTER TABLE sa_domain_reports ENABLE ROW LEVEL SECURITY;

-- Allow service_role full access (Edge Functions)
CREATE POLICY "service_role_full_access_reputation"
    ON sa_domain_reputation
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);

CREATE POLICY "service_role_full_access_reports"
    ON sa_domain_reports
    FOR ALL
    USING (TRUE)
    WITH CHECK (TRUE);
