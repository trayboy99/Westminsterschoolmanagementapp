-- ==================================================================================
-- FIX MARKS STATUS AND TYPE - Run this NOW to fix report card issues
-- ==================================================================================
-- This fixes marks that have incorrect status or type values
-- ==================================================================================

-- Step 1: Check current status values in marks table
SELECT 
  DISTINCT status,
  COUNT(*) as count,
  MIN(created_at) as first_created,
  MAX(created_at) as last_created
FROM marks
GROUP BY status
ORDER BY count DESC;

-- Step 2: Check current type values in marks table
SELECT 
  DISTINCT type,
  COUNT(*) as count,
  CASE 
    WHEN type IS NULL THEN 'NULL (needs fixing!)'
    ELSE type
  END as type_status
FROM marks
GROUP BY type
ORDER BY count DESC;

-- Step 3: Fix status values to be lowercase "approved"
-- This handles: Approved, APPROVED, approved_by_principal, etc.
UPDATE marks
SET status = 'approved'
WHERE status IN (
  'Approved',
  'APPROVED', 
  'approved_by_principal',
  'approved_final',
  'final',
  'published'
)
AND status != 'approved';

-- Check how many were updated
SELECT 
  COUNT(*) as marks_with_corrected_status,
  'Status normalized to lowercase "approved"' as note
FROM marks
WHERE status = 'approved';

-- Step 4: Fix type values to be lowercase "midterm" or "terminal"
UPDATE marks
SET type = LOWER(type)
WHERE type IS NOT NULL
  AND type != LOWER(type);

-- Step 5: Fix NULL type values based on exam name
-- This is critical for marks that were saved without a type
UPDATE marks m
SET type = CASE
  WHEN e.name ILIKE '%midterm%' OR e.name ILIKE '%mid-term%' OR e.name ILIKE '%mid term%' THEN 'midterm'
  WHEN e.name ILIKE '%terminal%' OR e.name ILIKE '%final%' OR e.name ILIKE '%end of term%' THEN 'terminal'
  ELSE 'terminal' -- Default to terminal if we can't determine
END
FROM exams e
WHERE m.exam_id = e.id
  AND m.type IS NULL;

-- Step 6: Verify the fixes
SELECT 
  'Status values after fix:' as check_type,
  status,
  COUNT(*) as count
FROM marks
GROUP BY status
ORDER BY count DESC;

SELECT 
  'Type values after fix:' as check_type,
  type,
  COUNT(*) as count
FROM marks
GROUP BY type
ORDER BY count DESC;

-- Step 7: Find any marks that still have issues
SELECT 
  m.id,
  m.student_id,
  p.first_name || ' ' || p.last_name as student_name,
  s.name as subject_name,
  e.name as exam_name,
  m.status,
  m.type,
  m.ca1,
  m.ca2,
  m.exam as exam_mark,
  m.total,
  CASE 
    WHEN m.type IS NULL THEN '❌ Type is NULL'
    WHEN m.type NOT IN ('midterm', 'terminal') THEN '⚠️ Invalid type value'
    WHEN m.status IS NULL THEN '❌ Status is NULL'
    WHEN m.status NOT IN ('draft', 'pending_approval', 'approved', 'rejected') THEN '⚠️ Invalid status'
    ELSE '✅ OK'
  END as issue
FROM marks m
LEFT JOIN profiles p ON m.student_id = p.id
LEFT JOIN subjects s ON m.subject_id = s.id
LEFT JOIN exams e ON m.exam_id = e.id
WHERE m.type IS NULL 
   OR m.type NOT IN ('midterm', 'terminal')
   OR m.status IS NULL
   OR m.status NOT IN ('draft', 'pending_approval', 'approved', 'rejected')
ORDER BY m.created_at DESC
LIMIT 50;

-- ==================================================================================
-- EXPECTED RESULTS:
-- ==================================================================================
-- After running this:
-- 1. All status values should be lowercase: draft, pending_approval, approved, rejected
-- 2. All type values should be lowercase: midterm, terminal
-- 3. No NULL values in type or status columns
-- 4. Report cards should now display marks correctly
-- ==================================================================================

-- Optional: Add constraints to prevent future issues
-- (Only run if you want to enforce data quality)

-- ALTER TABLE marks
-- ADD CONSTRAINT marks_status_valid 
-- CHECK (status IN ('draft', 'pending_approval', 'approved', 'rejected'));

-- ALTER TABLE marks
-- ADD CONSTRAINT marks_type_valid 
-- CHECK (type IN ('midterm', 'terminal'));

-- ALTER TABLE marks
-- ALTER COLUMN type SET NOT NULL;

-- ALTER TABLE marks
-- ALTER COLUMN status SET NOT NULL;

-- ==================================================================================
-- DONE! Now refresh your report card page
-- ==================================================================================
