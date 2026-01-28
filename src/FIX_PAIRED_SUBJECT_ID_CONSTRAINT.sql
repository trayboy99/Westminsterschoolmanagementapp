-- =====================================================
-- FIX: Remove NOT NULL constraint from paired_subject_id
-- The new pairing system uses pair_group_id instead
-- =====================================================

-- Make paired_subject_id nullable (we don't use it anymore)
ALTER TABLE subject_pairings 
ALTER COLUMN paired_subject_id DROP NOT NULL;

-- Verify the fix
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'subject_pairings'
ORDER BY ordinal_position;

-- The result should show paired_subject_id as is_nullable = 'YES'
