-- =====================================================
-- CREATE UPLOAD_DEADLINES TABLE
-- =====================================================
-- This creates a dedicated table for upload deadlines instead of storing in KV
-- Teachers will see these deadlines and upload button will be disabled when expired

-- Drop existing table if it exists (in case of recreation)
DROP TABLE IF EXISTS upload_deadlines CASCADE;

-- Create the upload_deadlines table
CREATE TABLE upload_deadlines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Academic period
  term TEXT NOT NULL,
  session TEXT NOT NULL,
  
  -- Upload type this deadline applies to
  upload_type TEXT NOT NULL CHECK (upload_type IN ('e-notes', 'exam_question', 'assignment', 'other_resources', 'all')),
  
  -- Deadline date and time (ISO timestamp)
  deadline TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Enable/disable this deadline
  enabled BOOLEAN NOT NULL DEFAULT true,
  
  -- Optional description
  description TEXT,
  
  -- Audit fields
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by UUID REFERENCES profiles(id),
  
  -- Ensure unique deadline per term/session/type combination
  UNIQUE(term, session, upload_type)
);

-- Create index for faster queries
CREATE INDEX idx_upload_deadlines_term_session ON upload_deadlines(term, session);
CREATE INDEX idx_upload_deadlines_enabled ON upload_deadlines(enabled);
CREATE INDEX idx_upload_deadlines_deadline ON upload_deadlines(deadline);

-- Enable Row Level Security
ALTER TABLE upload_deadlines ENABLE ROW LEVEL SECURITY;

-- Policy: Everyone can read deadlines (teachers need to see them)
CREATE POLICY "Anyone can view deadlines"
  ON upload_deadlines
  FOR SELECT
  USING (true);

-- Policy: Only admins/principals can manage deadlines
CREATE POLICY "Only admins can manage deadlines"
  ON upload_deadlines
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('admin', 'principal', 'director', 'it_admin')
    )
  );

-- Create function to automatically update updated_at
CREATE OR REPLACE FUNCTION update_upload_deadline_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  NEW.updated_by = auth.uid();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to call the function
CREATE TRIGGER set_upload_deadline_timestamp
  BEFORE UPDATE ON upload_deadlines
  FOR EACH ROW
  EXECUTE FUNCTION update_upload_deadline_timestamp();

-- Grant permissions
GRANT SELECT ON upload_deadlines TO authenticated;
GRANT ALL ON upload_deadlines TO service_role;

COMMENT ON TABLE upload_deadlines IS 'Stores upload deadlines for different academic terms, sessions, and upload types';
COMMENT ON COLUMN upload_deadlines.upload_type IS 'Type of upload: e-notes, exam_question, assignment, other_resources, or all';
COMMENT ON COLUMN upload_deadlines.deadline IS 'After this date/time, teachers cannot upload (admins can still upload on behalf)';
COMMENT ON COLUMN upload_deadlines.enabled IS 'When false, this deadline is temporarily disabled';
