
-- Update HEIC to JPG Converter product with premium image and correct link
-- Business Impact: Improves conversion rate by replacing placeholder with high-quality visual and fixing broken "Try Now" link.

UPDATE public.az_products 
SET 
  image = '/lovable-uploads/heic-to-jpg-hero.png',
  link = NULL, -- Remove explicit link to use the default /products/:slug route which is working
  updated_at = now()
WHERE slug = 'heic-to-jpg';
