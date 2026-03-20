-- Add ResuFill product
-- Business Impact: Introduces a new lead-generation product to the site

INSERT INTO public.az_products (
  id, name, slug, category, summary, description, features, price_label, link, image, is_active, display_order, tags
) VALUES (
  gen_random_uuid(),
  'ResuFill',
  'resufill',
  'Extension',
  'Job Application Autofill Chrome Extension that learns from your behavior.',
  E'ResuFill is a Chrome extension that **learns from your own form behavior** to progressively eliminate repetitive work across every job application. Unlike competitors that require heavy upfront profile configuration, ResuFill starts filling forms from day one and gets smarter with every submission — ultimately reaching a state where 90%+ of fields are pre-filled before the user touches the keyboard.\n\nPassive learning first, zero configuration needed. Focus on interviews, not forms.',
  ARRAY[
    'Passive Learning — Starts applying immediately and learns new fields inline',
    'Multi-Page Auto-Advance — Breeze through paginated Workday or Taleo forms',
    'Paste & Upload Anywhere — Seamlessly inject PDF resume or paste plain text',
    '100% Local Privacy — Your data stays on your device in our free tier',
    'Per-site autofill mode toggle (auto / suggest / off)'
  ],
  'Free (Beta)',
  '/products/resufill',
  '/lovable-uploads/resufill-hero.png',
  true,
  20,
  ARRAY['Extension', 'AI', 'Autofill', 'Productivity', 'Job Search']
);
