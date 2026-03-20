
-- Update HEIC to JPG Converter product with premium image and correct link
-- Business Impact: Improves conversion rate by replacing placeholder with high-quality visual and fixing broken "Try Now" link.

UPDATE public.az_products 
SET 
  slug = 'heic-to-jpg', -- Force the slug to match the custom App.tsx route
  image = '/lovable-uploads/heic-to-jpg-hero.png',
  link = NULL, -- Remove explicit link to use the default /products/:slug route
  updated_at = now()
WHERE id = 'heic-to-jpg-converter';
