-- ========================================
-- FIX: Drop and recreate director_payment_approvals_with_clearance view
-- WITHOUT required_amount column
-- ========================================

-- Step 1: Drop the old view
DROP VIEW IF EXISTS director_payment_approvals_with_clearance CASCADE;

-- Step 2: Recreate the view WITHOUT required_amount
-- This view shows payment approvals with student clearance info for the Director
CREATE OR REPLACE VIEW director_payment_approvals_with_clearance AS
SELECT 
    p.id as payment_id,
    p.student_id,
    p.amount_paid,
    p.payment_method,
    p.payment_date,
    p.session_id,
    p.term_id,
    p.status,
    p.notes,
    p.receipt_number,
    p.created_at,
    p.updated_at,
    
    -- Student info from profiles table
    prof.first_name,
    prof.last_name,
    prof.admission_number,
    prof.class_id,
    
    -- Class info
    c.class_name,
    
    -- Session info
    ses.session_name,
    
    -- Term info
    t.term_name,
    
    -- Student clearance info (WITHOUT required_amount)
    sc.total_amount_paid,
    sc.balance,
    sc.is_cleared,
    sc.clearance_status,
    
    -- Calculate total fee items for this student (replaces required_amount)
    COALESCE(
        (SELECT SUM(sfi.amount) 
         FROM student_fee_items sfi 
         WHERE sfi.student_id = p.student_id
         AND sfi.session_id = p.session_id
         AND sfi.term_id = p.term_id), 
        0
    ) as total_required_amount,
    
    -- Calculate payment percentage
    CASE 
        WHEN COALESCE(
            (SELECT SUM(sfi.amount) 
             FROM student_fee_items sfi 
             WHERE sfi.student_id = p.student_id
             AND sfi.session_id = p.session_id
             AND sfi.term_id = p.term_id), 
            0
        ) > 0 
        THEN ROUND((sc.total_amount_paid * 100.0) / NULLIF(
            (SELECT SUM(sfi.amount) 
             FROM student_fee_items sfi 
             WHERE sfi.student_id = p.student_id
             AND sfi.session_id = p.session_id
             AND sfi.term_id = p.term_id), 
            0
        ), 2)
        ELSE 0 
    END as payment_percentage

FROM payments p
INNER JOIN profiles prof ON p.student_id = prof.id AND prof.role = 'student'
LEFT JOIN classes c ON prof.class_id = c.id
LEFT JOIN academic_sessions ses ON p.session_id = ses.id
LEFT JOIN academic_terms t ON p.term_id = t.id
LEFT JOIN student_clearance sc ON p.student_id = sc.student_id 
    AND p.session_id = sc.session_id 
    AND p.term_id = sc.term_id
WHERE p.status = 'pending';

-- Step 3: Grant permissions
GRANT SELECT ON director_payment_approvals_with_clearance TO authenticated;

-- Step 4: Verify the view was created correctly
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'director_payment_approvals_with_clearance'
ORDER BY ordinal_position;

-- Done!
SELECT 'View recreated successfully! Try creating a payment now.' as status;