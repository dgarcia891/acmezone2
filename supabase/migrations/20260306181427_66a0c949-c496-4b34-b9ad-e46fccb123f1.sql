CREATE TABLE IF NOT EXISTS az_pod_listings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  idea_id UUID NOT NULL REFERENCES az_pod_ideas(id) ON DELETE CASCADE,
  product_type TEXT NOT NULL CHECK (product_type IN ('sticker', 'tshirt')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  seo_keywords TEXT[] DEFAULT '{}',
  etsy_title TEXT,
  ebay_title TEXT,
  printify_blueprint_id TEXT,
  printify_print_provider_id TEXT,
  is_approved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE az_pod_listings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage listings" ON az_pod_listings
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_pod_listings_idea ON az_pod_listings(idea_id);