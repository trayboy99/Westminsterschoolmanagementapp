-- ========================================
-- CORRECT FIX: Use PROFILES table (NOT students)
-- DON'T insert into GENERATED columns: outstanding_balance, is_cleared
-- ========================================

DROP FUNCTION IF EXISTS update_student_clearance_from_payments() CASCADE;

CREATE OR REPLACE FUNCTION update_student_clearance_from_payments()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_session_id UUID;
    v_term_id UUID;
    v_student_type VARCHAR;
BEGIN
    -- Get student type from PROFILES table (NOT students!)
    SELECT student_type INTO v_student_type
    FROM profiles
    WHERE id = NEW.student_id;

    -- Get session and term IDs from academic_year and term strings
    SELECT id INTO v_session_id 
    FROM academic_sessions 
    WHERE session_name = NEW.academic_year;
    
    SELECT id INTO v_term_id 
    FROM academic_terms 
    WHERE term_name = NEW.term;

    -- Calculate total amount paid by this student for this session/term (APPROVED only)
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
    FROM payments
    WHERE student_id = NEW.student_id
    AND academic_year = NEW.academic_year
    AND term = NEW.term
    AND approval_status = 'approved';

    -- Update or insert student_clearance record
    -- DON'T insert into GENERATED columns: outstanding_balance, is_cleared
    INSERT INTO student_clearance (
        student_id,
        session_id,
        term_id,
        student_type,
        required_amount,
        total_paid,
        outstanding_brought_forward,
        total_payments,
        approved_payments,
        pending_payments,
        academic_year,
        term,
        created_at,
        updated_at
    ) VALUES (
        NEW.student_id,
        v_session_id,
        v_term_id,
        v_student_type,
        0, -- required_amount calculated by backend from fee items
        v_total_paid,
        0,
        1,
        CASE WHEN NEW.approval_status = 'approved' THEN 1 ELSE 0 END,
        CASE WHEN NEW.approval_status = 'pending' THEN 1 ELSE 0 END,
        NEW.academic_year,
        NEW.term,
        NOW(),
        NOW()
    )
    ON CONFLICT (student_id, session_id, term_id)
    DO UPDATE SET
        total_paid = v_total_paid,
        total_payments = student_clearance.total_payments + 1,
        approved_payments = student_clearance.approved_payments + 
            CASE WHEN NEW.approval_status = 'approved' THEN 1 ELSE 0 END,
        pending_payments = student_clearance.pending_payments + 
            CASE WHEN NEW.approval_status = 'pending' THEN 1 ELSE 0 END,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate the trigger
CREATE TRIGGER trigger_update_clearance_on_payment_change
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_student_clearance_from_payments();

-- Verify
SELECT 'Trigger fixed - removed is_cleared (GENERATED column)!' as status;
