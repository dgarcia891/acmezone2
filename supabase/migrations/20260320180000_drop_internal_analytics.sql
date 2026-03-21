-- Drop the internal tracking tables as they are fully replaced by Google Analytics Data API 
-- Business Impact: Destructive (Safe). This deletes historical internal analytics data. 
-- GA4 now tracks all page views and custom events natively.

DROP TABLE IF EXISTS "public"."az_page_views";
DROP TABLE IF EXISTS "public"."az_excluded_ips";
