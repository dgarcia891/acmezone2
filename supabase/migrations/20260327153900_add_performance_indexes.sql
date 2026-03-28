-- Migration: add_performance_indexes
-- Business Impact: Safe — concurrent index creation, no data changes, no table locks
-- Purpose: Reduce sequential scans on frequently filtered/sorted columns.
-- NOTE: CONCURRENTLY cannot be run inside a transaction block. 
--       In the Supabase SQL Editor, run each statement ONE BY ONE.

-- POD Pipeline: status is used as Kanban column filter, created_at for board ordering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pod_ideas_status
  ON az_pod_ideas(status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pod_ideas_created_at
  ON az_pod_ideas(created_at DESC);

-- Hydra Guard: Detections tab filters by created_at and severity on every page load
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sa_detections_created_at
  ON sa_detections(created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sa_detections_severity
  ON sa_detections(severity);

-- Corrections tab filters by review_status and reviewed_at 
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sa_corrections_review_status
  ON sa_corrections(review_status);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sa_corrections_reviewed_at
  ON sa_corrections(reviewed_at DESC);
