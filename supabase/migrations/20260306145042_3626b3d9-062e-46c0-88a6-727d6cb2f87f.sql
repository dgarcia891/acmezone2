
CREATE TABLE az_pod_design_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES az_pod_ideas(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN ('sticker', 'tshirt')),
  image_url TEXT NOT NULL,
  prompt TEXT,
  version_number INTEGER NOT NULL DEFAULT 1,
  is_selected BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE az_pod_design_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage design versions" ON az_pod_design_versions
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_pod_design_versions_idea ON az_pod_design_versions(idea_id, product_type, created_at DESC);
