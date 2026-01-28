-- 🔥 CRITICAL FIX: Result Publishing showing "No marks found"
-- 
-- PROBLEM: Backend only looks for exams with status='active'
-- If your exam has a different status, marks won't show up!

-- ============================================
-- STEP 1: Check current exam status
-- ============================================
SELECT 
  id,
  name,
  session,
  term,
  status,  -- ← This is the problem!
  created_at
FROM exams
WHERE session = '2025/2026'
  AND term = 'First Term'
ORDER BY created_at DESC;

-- If status is NOT 'active', marks won't show in Result Publishing!

-- ============================================
-- STEP 2: Check if marks exist for this exam
-- ============================================
SELECT 
  e.name as exam_name,
  e.status as exam_status,
  m.type,
  COUNT(*) as mark_count,
  COUNT(DISTINCT m.student_id) as students,
  COUNT(DISTINCT m.subject_id) as subjects,
  COUNT(DISTINCT m.class_id) as classes
FROM exams e
JOIN marks m ON m.exam_id = e.id
WHERE e.session = '2025/2026'
  AND e.term = 'First Term'
GROUP BY e.id, e.name, e.status, m.type;

-- This shows marks exist but exam status might be wrong!

-- ============================================
-- STEP 3: FIX - Set exam to 'active' status
-- ============================================
UPDATE exams
SET status = 'active'
WHERE session = '2025/2026'
  AND term = 'First Term'
  AND (status IS NULL OR status != 'active');

-- ✅ This sets all exams for 2025/2026 First Term to 'active'

-- ============================================
-- STEP 4: Verify the fix
-- ============================================
SELECT 
  id,
  name,
  session,
  term,
  status,  -- ← Should now be 'active'
  created_at
FROM exams
WHERE session = '2025/2026'
  AND term = 'First Term';

-- Expected: All exams should now show status='active'

-- ============================================
-- EXPLANATION
-- ============================================
/*
The backend code (line 13614-13619) filters like this:

const { data: exams } = await supabase
  .from("exams")
  .select("id, name, status")
  .eq("session", session)
  .eq("term", term)
  .eq("status", "active");  // ← ONLY ACTIVE EXAMS!

If your exam has:
- status = NULL → Won't find marks ❌
- status = 'draft' → Won't find marks ❌  
- status = 'pending' → Won't find marks ❌
- status = 'active' → Will find marks ✅

So even though you have marks (approved/rejected), 
Result Publishing won't see them if exam isn't 'active'!
*/

-- ============================================
-- AFTER RUNNING THIS:
-- ============================================
-- 1. Hard refresh your browser (Ctrl + Shift + R)
-- 2. Go to Results Management → Publishing Settings
-- 3. Select "Midterm" or "Terminal"
-- 4. Should now show marks completion table!

-- ✅ DONE!
