-- Check what the gender constraint allows
SELECT 
  conname AS constraint_name,
  pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conname LIKE '%gender%'
  AND conrelid = 'graduated_students'::regclass;

-- Also check profiles table to see what it uses
SELECT DISTINCT gender 
FROM profiles 
WHERE gender IS NOT NULL
LIMIT 10;
