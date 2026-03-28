-- Update linkedin-job-scanner and trellobridge to use Early Access waitlist
-- Business Impact: Safe (Price label update and link removal)
UPDATE az_products
SET price_label = 'Early Access', link = NULL
WHERE slug IN ('linkedin-job-scanner', 'trellobridge');
