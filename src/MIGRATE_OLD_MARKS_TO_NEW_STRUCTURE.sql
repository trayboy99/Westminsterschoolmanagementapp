-- ============================================================================
-- MIGRATE OLD MARKS DATA TO NEW STRUCTURE
-- ============================================================================
-- This script migrates existing marks from old columns (ca1, ca2, exam)
-- to new columns (midterm_ca1, midterm_ca2, midterm_exam, etc.)
-- ============================================================================

-- ✅ STEP 1: Backup - Check current state
DO $$
BEGIN
  RAISE NOTICE '=== CURRENT MARKS DATA ===';
END $$;

SELECT 
  type,
  COUNT(*) as total_marks,
  COUNT(ca1) as has_old_ca1,
  COUNT(midterm_ca1) as has_new_midterm_ca1,
  COUNT(terminal_ca1) as has_new_terminal_ca1
FROM marks
GROUP BY type;

-- ============================================================================
-- ✅ STEP 2: MIGRATE MIDTERM MARKS
-- Copy data from old columns (ca1, ca2, exam) to new columns (midterm_ca1, midterm_ca2, midterm_exam)
-- ============================================================================

UPDATE marks
SET 
  midterm_ca1 = ca1,
  midterm_ca2 = ca2,
  midterm_exam = exam
WHERE type = 'midterm'
  AND ca1 IS NOT NULL  -- Only migrate if old columns have data
  AND midterm_ca1 IS NULL;  -- Only migrate if new columns are empty

-- Check result
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM marks
  WHERE type = 'midterm' AND midterm_ca1 IS NOT NULL;
  
  RAISE NOTICE '✅ Migrated % midterm marks to new structure', migrated_count;
END $$;

-- ============================================================================
-- ✅ STEP 3: MIGRATE TERMINAL MARKS
-- Copy data from old columns (ca1, ca2, exam) to new columns (terminal_ca1, terminal_ca2, terminal_exam)
-- ============================================================================

UPDATE marks
SET 
  terminal_ca1 = ca1,
  terminal_ca2 = ca2,
  terminal_exam = exam
WHERE type = 'terminal'
  AND ca1 IS NOT NULL  -- Only migrate if old columns have data
  AND terminal_ca1 IS NULL;  -- Only migrate if new columns are empty

-- Check result
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM marks
  WHERE type = 'terminal' AND terminal_ca1 IS NOT NULL;
  
  RAISE NOTICE '✅ Migrated % terminal marks to new structure', migrated_count;
END $$;

-- ============================================================================
-- ✅ STEP 4: VERIFY MIGRATION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION COMPLETE ===';
  RAISE NOTICE 'Checking data integrity...';
END $$;

-- Show sample migrated records
SELECT 
  type,
  -- Old columns (should still have data)
  ca1 as old_ca1,
  ca2 as old_ca2,
  exam as old_exam,
  -- New columns (should now have data)
  midterm_ca1,
  midterm_ca2,
  midterm_exam,
  terminal_ca1,
  terminal_ca2,
  terminal_exam,
  status,
  created_at
FROM marks
ORDER BY created_at DESC
LIMIT 10;

-- Summary statistics
SELECT 
  type,
  COUNT(*) as total,
  COUNT(CASE WHEN midterm_ca1 IS NOT NULL THEN 1 END) as has_midterm_data,
  COUNT(CASE WHEN terminal_ca1 IS NOT NULL THEN 1 END) as has_terminal_data,
  COUNT(CASE WHEN ca1 IS NOT NULL THEN 1 END) as still_has_old_data
FROM marks
GROUP BY type;

-- ============================================================================
-- ✅ STEP 5: OPTIONAL - Clear old columns (ONLY run if migration looks good!)
-- ============================================================================
-- UNCOMMENT THESE LINES ONLY AFTER VERIFYING THE MIGRATION WORKED:

-- UPDATE marks SET ca1 = NULL, ca2 = NULL, exam = NULL WHERE type = 'midterm';
-- UPDATE marks SET ca1 = NULL, ca2 = NULL, exam = NULL WHERE type = 'terminal';

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Migration complete!';
  RAISE NOTICE '⚠️  Old columns (ca1, ca2, exam) still contain data for rollback safety.';
  RAISE NOTICE '⚠️  After testing, you can uncomment STEP 5 to clear old columns.';
END $$;
