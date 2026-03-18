-- Add a column to store the public-facing Printify store URL (e.g. Etsy/eBay listing page)
ALTER TABLE az_pod_ideas ADD COLUMN IF NOT EXISTS printify_public_url TEXT;
