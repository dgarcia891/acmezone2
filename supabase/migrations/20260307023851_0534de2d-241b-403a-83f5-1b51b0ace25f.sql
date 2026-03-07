ALTER TABLE az_pod_printify_shops ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false;
ALTER TABLE az_pod_settings ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT false;