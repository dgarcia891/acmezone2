-- Create table for page views
CREATE TABLE public.AZ_page_views (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    path TEXT NOT NULL,
    ip_address TEXT,
    user_agent TEXT,
    referrer TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create table for excluded IPs
CREATE TABLE public.AZ_excluded_ips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ip_address TEXT NOT NULL UNIQUE,
    excluded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.AZ_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.AZ_excluded_ips ENABLE ROW LEVEL SECURITY;

-- Page views: Anyone can insert (for tracking), only admins can read
CREATE POLICY "Anyone can insert page views"
ON public.AZ_page_views
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view page views"
ON public.AZ_page_views
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Excluded IPs: Only admins can manage
CREATE POLICY "Admins can view excluded IPs"
ON public.AZ_excluded_ips
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert excluded IPs"
ON public.AZ_excluded_ips
FOR INSERT
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete excluded IPs"
ON public.AZ_excluded_ips
FOR DELETE
USING (public.has_role(auth.uid(), 'admin'));

-- Create index for faster queries
CREATE INDEX idx_page_views_created_at ON public.AZ_page_views(created_at DESC);
CREATE INDEX idx_page_views_path ON public.AZ_page_views(path);