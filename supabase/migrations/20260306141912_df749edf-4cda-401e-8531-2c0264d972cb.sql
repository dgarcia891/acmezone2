
-- Pod Pipeline Ideas table (AZ prefix per project convention)
CREATE TABLE az_pod_ideas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  idea_text TEXT,
  image_url TEXT,
  product_type TEXT DEFAULT 'both',
  analysis JSONB,
  sticker_design_prompt TEXT,
  tshirt_design_prompt TEXT,
  sticker_design_url TEXT,
  tshirt_design_url TEXT,
  status TEXT DEFAULT 'pending',
  trello_card_id TEXT,
  trello_card_url TEXT,
  reject_reason TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Pod Pipeline Settings table
CREATE TABLE az_pod_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  trello_api_key TEXT,
  trello_token TEXT,
  printify_api_key TEXT,
  printify_shop_id TEXT,
  removebg_api_key TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE az_pod_ideas ENABLE ROW LEVEL SECURITY;
ALTER TABLE az_pod_settings ENABLE ROW LEVEL SECURITY;

-- Only admins can access pod_ideas
CREATE POLICY "Admins can manage pod_ideas" ON az_pod_ideas
  FOR ALL USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Only the owner can access their own settings
CREATE POLICY "Users can manage own pod_settings" ON az_pod_settings
  FOR ALL USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Storage bucket for generated design images
INSERT INTO storage.buckets (id, name, public)
  VALUES ('pod-assets', 'pod-assets', true)
  ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to pod-assets
CREATE POLICY "Authenticated users can upload pod assets"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'pod-assets' AND auth.role() = 'authenticated');

-- Allow public read access to pod-assets
CREATE POLICY "Public read access for pod assets"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'pod-assets');
