-- =====================================================
-- FIX: Add Missing Columns to subject_pairings Table
-- Run this NOW to fix the error
-- =====================================================

-- Add the missing columns
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT CHECK (level IN ('junior', 'senior'));

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_subject_pairings_group_id 
ON subject_pairings(pair_group_id);

-- Update existing rows to have default values
UPDATE subject_pairings
SET 
  pair_group_id = COALESCE(pair_group_id, 'legacy_' || id::text),
  pair_group_name = COALESCE(pair_group_name, 'Paired Subjects'),
  level = COALESCE(level, 'senior')
WHERE pair_group_id IS NULL;

-- Verify the columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subject_pairings'
ORDER BY ordinal_position;

-- Show the updated structure
SELECT 
  'Columns Added Successfully' as status,
  COUNT(*) as total_rows
FROM subject_pairings;
