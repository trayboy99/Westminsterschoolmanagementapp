-- ========================================
-- FIX: Drop and recreate director_payment_approvals_with_clearance view
-- WITH CORRECT COLUMN NAMES
-- ========================================

-- Step 1: Drop the old view
DROP VIEW IF EXISTS director_payment_approvals_with_clearance CASCADE;

-- Step 2: Recreate the view with CORRECT column names
-- payments table uses: academic_year, term (NOT session_id, term_id)
CREATE OR REPLACE VIEW director_payment_approvals_with_clearance AS
SELECT 
    p.id as payment_id,
    p.student_id,
    p.student_type,
    p.academic_year,
    p.term,
    p.amount,
    p.amount_paid,
    p.payment_method,
    p.payment_date,
    p.approval_status as status,
    p.notes,
    p.receipt_number,
    p.part_payment_number,
    p.proof_of_payment_url,
    p.entered_by,
    p.approved_by,
    p.created_at,
    p.updated_at,
    
    -- Student info from profiles table
    prof.first_name,
    prof.last_name,
    prof.admission_number,
    prof.class_id,
    
    -- Class info
    c.name as class_name

FROM payments p
INNER JOIN profiles prof ON p.student_id = prof.id AND prof.role = 'student'
LEFT JOIN classes c ON prof.class_id = c.id
WHERE p.approval_status = 'pending';

-- Step 3: Grant permissions
GRANT SELECT ON director_payment_approvals_with_clearance TO authenticated;

-- Step 4: Verify the view was created correctly
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'director_payment_approvals_with_clearance'
ORDER BY ordinal_position;

-- Done!
SELECT 'View recreated successfully with CORRECT columns! Try creating a payment now.' as status;
