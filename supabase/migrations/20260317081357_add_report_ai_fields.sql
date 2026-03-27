-- Add new context fields for AI heuristics to sa_user_reports
ALTER TABLE public.sa_user_reports 
ADD COLUMN IF NOT EXISTS sender_domain TEXT,
ADD COLUMN IF NOT EXISTS is_free_provider BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS trigger_indicators JSONB DEFAULT '[]'::jsonb;

-- Create global blocklist table for URLs
CREATE TABLE IF NOT EXISTS public.sa_blocklist (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    url TEXT NOT NULL UNIQUE,
    source TEXT NOT NULL,
    active BOOLEAN DEFAULT true,
    added_by UUID REFERENCES auth.users(id),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- RLS policies for blocklist
ALTER TABLE public.sa_blocklist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access to blocklist"
    ON public.sa_blocklist FOR ALL
    USING (has_role(auth.uid(), 'admin'))
    WITH CHECK (has_role(auth.uid(), 'admin'));

-- Set up realtime for blocklist
ALTER PUBLICATION supabase_realtime ADD TABLE sa_blocklist;
