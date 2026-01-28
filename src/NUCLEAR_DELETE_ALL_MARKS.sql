-- 🔥 NUCLEAR OPTION: DELETE EVERYTHING AND START FRESH
-- This will completely wipe all marks data

-- ============================================================================
-- STEP 1: Create Backup (OPTIONAL but RECOMMENDED)
-- ============================================================================
DROP TABLE IF EXISTS marks_backup_nuclear;
CREATE TABLE marks_backup_nuclear AS SELECT * FROM marks;

SELECT COUNT(*) as backup_count FROM marks_backup_nuclear;

-- ============================================================================
-- STEP 2: DELETE EVERYTHING
-- ============================================================================

-- Delete all marks
DELETE FROM marks;

-- Verify deletion
SELECT COUNT(*) as remaining_marks FROM marks;
-- Expected: 0

-- ============================================================================
-- STEP 3: VERIFICATION - Marks should be completely empty
-- ============================================================================

-- Check by type (should return 0 rows)
SELECT type, COUNT(*) 
FROM marks 
GROUP BY type;

-- Check all marks (should return 0 rows)
SELECT * FROM marks;

-- ============================================================================
-- STEP 4: Check backup was created
-- ============================================================================

SELECT COUNT(*) as backed_up_marks FROM marks_backup_nuclear;

-- ============================================================================
-- IF YOU NEED TO RESTORE (DON'T RUN UNLESS YOU NEED TO UNDO)
-- ============================================================================

/*
-- Restore from backup
DELETE FROM marks;
INSERT INTO marks SELECT * FROM marks_backup_nuclear;

-- Verify restore
SELECT COUNT(*) FROM marks;

-- Drop backup table
DROP TABLE marks_backup_nuclear;
*/

-- ============================================================================
-- NEXT STEPS AFTER RUNNING THIS
-- ============================================================================

/*
1. ✅ Verify marks table is empty (should show 0)
2. ✅ Hard refresh browser: Ctrl+Shift+R
3. ✅ Open browser console (F12)
4. ✅ Go to Marks Entry
5. ✅ Enter NEW marks
6. ✅ Check console logs show correct calculation
7. ✅ Save marks
8. ✅ Run query below to verify correct data was saved
*/

-- ============================================================================
-- VERIFICATION QUERY: Run AFTER entering new marks
-- ============================================================================

/*
-- Check what was just saved
WITH midterm_marks AS (
  SELECT 
    student_id,
    exam_id,
    subject_id,
    ca1 as mid_ca1,
    ca2 as mid_ca2,
    exam as mid_exam,
    (ca1 + ca2 + exam) as mid_total
  FROM marks
  WHERE type = 'midterm'
),
terminal_marks AS (
  SELECT 
    student_id,
    exam_id,
    subject_id,
    ca1 as term_ca1,
    ca2 as term_ca2,
    exam as term_exam
  FROM marks
  WHERE type = 'terminal'
)
SELECT 
  '📊 MIDTERM' as section,
  m.mid_ca1 as ca1,
  m.mid_ca2 as ca2,
  m.mid_exam as exam,
  m.mid_total as total
FROM midterm_marks m
LIMIT 1

UNION ALL

SELECT 
  '📊 TERMINAL' as section,
  t.term_ca1::TEXT as ca1,
  t.term_ca2::TEXT as ca2,
  t.term_exam::TEXT as exam,
  (t.term_ca1 + COALESCE(t.term_ca2, 0) + COALESCE(t.term_exam, 0))::TEXT as total
FROM terminal_marks t
LIMIT 1

UNION ALL

SELECT 
  '✅ VALIDATION' as section,
  ROUND((m.mid_total::NUMERIC) / 2, 0)::TEXT as expected_term_ca1,
  t.term_ca1::TEXT as actual_term_ca1,
  CASE 
    WHEN ROUND((m.mid_total::NUMERIC) / 2, 0) = t.term_ca1 THEN '✅ CORRECT'
    WHEN (m.mid_ca1 + m.mid_ca2) = t.term_ca1 THEN '❌ WRONG: CA1+CA2'
    ELSE '❓ OTHER'
  END as status,
  NULL as total
FROM midterm_marks m
CROSS JOIN terminal_marks t
LIMIT 1;
*/
