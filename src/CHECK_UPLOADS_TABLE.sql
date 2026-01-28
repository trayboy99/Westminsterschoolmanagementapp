-- Run this to see what's actually in the uploads table for Favour's class

-- 1. Check Favour's profile and class
SELECT 
    p.id as student_id,
    p.first_name,
    p.last_name,
    p.role,
    p.class_id,
    c.name as class_name,
    c.level,
    c.section
FROM profiles p
LEFT JOIN classes c ON p.class_id = c.id
WHERE p.first_name = 'Favour' AND p.role = 'student';

-- 2. Check all uploads for Favour's class (06bdb592-0ebe-426d-943f-d0f9acab38ec = jss3)
SELECT 
    id,
    title,
    session,
    term,
    type,
    class_id,
    subject_id,
    teacher_id,
    created_at
FROM uploads
WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec'
ORDER BY created_at DESC;

-- 3. Check academic_calendar to see available sessions/terms
SELECT 
    session,
    term,
    is_active,
    start_date,
    end_date
FROM academic_calendar
ORDER BY created_at DESC;

-- 4. DIAGNOSIS: Why files aren't showing
-- Compare what's in uploads vs what we're searching for

-- Show the actual upload with all details:
SELECT 
    'UPLOAD DATA:' as info,
    u.title,
    u.session as upload_session,
    u.term as upload_term,
    u.type as upload_type,
    c.name as class_name
FROM uploads u
LEFT JOIN classes c ON u.class_id = c.id
WHERE u.class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec';

-- The problem is likely:
-- 1. Type mismatch: "exam_question" (DB) vs "exam-questions" (search)
-- 2. Session format mismatch
-- 3. Term format mismatch
