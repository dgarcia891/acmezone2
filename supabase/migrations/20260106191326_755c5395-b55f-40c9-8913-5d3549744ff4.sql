-- Create az_products table for managing products in the database
CREATE TABLE public.az_products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    summary TEXT NOT NULL,
    description TEXT NOT NULL,
    features TEXT[] NOT NULL DEFAULT '{}',
    tags TEXT[] NOT NULL DEFAULT '{}',
    category TEXT NOT NULL,
    price_label TEXT,
    image TEXT NOT NULL,
    images TEXT[] DEFAULT '{}',
    seo_title TEXT,
    seo_description TEXT,
    type TEXT,
    link TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    display_order INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.az_products ENABLE ROW LEVEL SECURITY;

-- Allow anyone to view active products (public access for product pages)
CREATE POLICY "Anyone can view active products"
ON public.az_products
FOR SELECT
USING (is_active = true);

-- Admins can view all products (including inactive)
CREATE POLICY "Admins can view all products"
ON public.az_products
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can insert products
CREATE POLICY "Admins can insert products"
ON public.az_products
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can update products
CREATE POLICY "Admins can update products"
ON public.az_products
FOR UPDATE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Admins can delete products
CREATE POLICY "Admins can delete products"
ON public.az_products
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'::app_role));

-- Create trigger for updating updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_az_products_updated_at
BEFORE UPDATE ON public.az_products
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for faster slug lookups
CREATE INDEX idx_az_products_slug ON public.az_products(slug);
CREATE INDEX idx_az_products_display_order ON public.az_products(display_order);