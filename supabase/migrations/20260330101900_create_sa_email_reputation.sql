-- Create sa_email_reputation table
CREATE TABLE sa_email_reputation (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  email_hash text NOT NULL,
  reputation_score text NOT NULL DEFAULT 'none',
  is_disposable boolean NOT NULL DEFAULT false,
  is_free_provider boolean NOT NULL DEFAULT false,
  last_checked_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT sa_email_reputation_pkey PRIMARY KEY (id),
  CONSTRAINT sa_email_reputation_email_hash_key UNIQUE (email_hash)
);

-- Turn on row level security
ALTER TABLE sa_email_reputation ENABLE ROW LEVEL SECURITY;

-- Grant access to service role only
-- Authenticated and anonymous users cannot read, insert, update or delete directly
CREATE POLICY "Service role full access on sa_email_reputation"
  ON sa_email_reputation
  AS PERMISSIVE
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
