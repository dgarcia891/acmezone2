-- Migration: Create sa_heuristic_rules table
-- Purpose: Allows AI or Admins to dynamically adjust URL heuristic matching patterns
-- Business Impact: Safe structurally, but rule modifications can affect client detection logic

CREATE TABLE IF NOT EXISTS public.sa_heuristic_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    rule_key TEXT NOT NULL,          -- e.g., 'urlObfuscation.hexEncoding'
    pattern_regex TEXT NOT NULL,     -- The actual regex string
    score_weight INTEGER DEFAULT 0,  -- Optional score adjustment
    active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.sa_heuristic_rules ENABLE ROW LEVEL SECURITY;

-- Allow public read access (like sa_patterns, accessed via Edge Functions safely)
CREATE POLICY "Allow public read access on sa_heuristic_rules"
ON public.sa_heuristic_rules FOR SELECT USING (true);

-- Allow admins to manage
CREATE POLICY "Allow admin full access on sa_heuristic_rules"
ON public.sa_heuristic_rules FOR ALL
USING (auth.jwt() ->> 'role' = 'service_role' OR auth.role() = 'authenticated');
