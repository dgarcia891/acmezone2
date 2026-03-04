
-- Add columns to sa_corrections
ALTER TABLE sa_corrections 
  ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS ai_analysis jsonb;

-- Note: reviewed_at already exists on sa_corrections

-- Create pattern_adjustments table
CREATE TABLE pattern_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  phrase_id uuid REFERENCES sa_patterns(id) ON DELETE CASCADE,
  correction_id uuid REFERENCES sa_corrections(id) ON DELETE SET NULL,
  old_weight integer NOT NULL,
  new_weight integer NOT NULL,
  adjustment_reason text,
  adjusted_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE pattern_adjustments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view adjustments" ON pattern_adjustments FOR SELECT
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert adjustments" ON pattern_adjustments FOR INSERT
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Enable realtime on sa_detections
ALTER PUBLICATION supabase_realtime ADD TABLE sa_detections;
