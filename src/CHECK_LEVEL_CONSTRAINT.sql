-- Check what the level constraint allows
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conname = 'subjects_level_check';

-- Also check existing level values in subjects table
SELECT DISTINCT level 
FROM subjects 
ORDER BY level;
