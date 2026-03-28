# Bug Log

## BUG-20260328-01: High Database Usage from sa-report-detection
- **Date**: 2026-03-28
- **Context**: Supabase Edge Function `sa-report-detection` being hit heavily by Chrome Extension on every page visit.
- **Steps to Reproduce**: 
  1. Extension users browse web pages.
  2. Extension sends `POST /functions/v1/sa-report-detection` with `severity: SAFE`.
  3. Edge function fetches `sa_app_config` and inserts into `sa_detections` on every ping.
- **Expected vs Actual Behavior**: Expected low idle DB CPU. Actual is 100% CPU exhaustion due to unbounded connections.
- **Environment**: Production Supabase
- **Severity/Impact**: Critical (DB cluster overload).
- **Status**: Resolved
