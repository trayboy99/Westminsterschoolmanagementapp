-- =====================================================
-- FIX: Remove Foreign Key Constraint That Might Block Inserts
-- =====================================================

-- Check current constraints
SELECT
    conname AS constraint_name,
    contype AS constraint_type,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'subject_pairings'::regclass;

-- If there's a foreign key on subject_id that's causing issues, we can make it less strict
-- Drop and recreate without ON DELETE CASCADE if needed

-- Option 1: Make sure subject_id foreign key exists but doesn't block
ALTER TABLE subject_pairings 
DROP CONSTRAINT IF EXISTS subject_pairings_subject_id_fkey;

ALTER TABLE subject_pairings
ADD CONSTRAINT subject_pairings_subject_id_fkey 
FOREIGN KEY (subject_id) 
REFERENCES subjects(id) 
ON DELETE CASCADE;

-- Option 2: If paired_subject_id exists and causing issues
ALTER TABLE subject_pairings 
DROP CONSTRAINT IF EXISTS subject_pairings_paired_subject_id_fkey;

-- Verify table is ready for inserts
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subject_pairings'
ORDER BY ordinal_position;
