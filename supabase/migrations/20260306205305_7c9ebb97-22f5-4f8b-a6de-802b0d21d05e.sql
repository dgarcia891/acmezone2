CREATE TABLE az_pod_printify_shops (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id text NOT NULL,
  marketplace text NOT NULL DEFAULT 'default',
  label text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE az_pod_printify_shops ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage printify shops"
ON az_pod_printify_shops
FOR ALL
TO authenticated
USING (has_role(auth.uid(), 'admin'))
WITH CHECK (has_role(auth.uid(), 'admin'));