-- 1. Add new columns to az_pod_ideas for extended pipeline tracking
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS printify_product_id TEXT;
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS printify_product_url TEXT;
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS listing_url TEXT;
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS listing_platform TEXT;
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'normal';

-- 2. Create labels tables for categorizing ideas (like Trello labels)
CREATE TABLE IF NOT EXISTS az_pod_labels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '#6366f1',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS az_pod_idea_labels (
  idea_id UUID NOT NULL REFERENCES az_pod_ideas(id) ON DELETE CASCADE,
  label_id UUID NOT NULL REFERENCES az_pod_labels(id) ON DELETE CASCADE,
  PRIMARY KEY (idea_id, label_id)
);

ALTER TABLE az_pod_labels ENABLE ROW LEVEL SECURITY;
ALTER TABLE az_pod_idea_labels ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage labels" ON az_pod_labels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "Admins manage idea labels" ON az_pod_idea_labels
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 3. Seed default labels
INSERT INTO az_pod_labels (name, color) VALUES
  ('Trending', '#ef4444'),
  ('High Priority', '#f97316'),
  ('Animals & Cute', '#eab308'),
  ('Seasonal', '#22c55e'),
  ('Memes & Humor', '#3b82f6'),
  ('Political', '#8b5cf6'),
  ('Sports', '#06b6d4'),
  ('Music & Pop Culture', '#ec4899'),
  ('Food & Drink', '#f59e0b'),
  ('Motivational', '#10b981');