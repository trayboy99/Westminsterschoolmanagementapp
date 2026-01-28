-- ========================================
-- FIX: Drop and recreate the clearance trigger and function
-- WITHOUT required_amount column
-- ========================================

-- Step 1: Drop the triggers
DROP TRIGGER IF EXISTS trigger_update_clearance_on_payment_change ON payments;

-- Step 2: Drop the old function
DROP FUNCTION IF EXISTS update_student_clearance_from_payments();

-- Step 3: Create NEW function that calculates required_amount from student_fee_items
CREATE OR REPLACE FUNCTION update_student_clearance_from_payments()
RETURNS TRIGGER AS $$
DECLARE
    v_total_paid NUMERIC;
    v_required_amount NUMERIC;
    v_balance NUMERIC;
    v_is_cleared BOOLEAN;
    v_clearance_status TEXT;
    v_session_id UUID;
    v_term_id UUID;
BEGIN
    -- Get session and term IDs from academic_year and term strings
    SELECT id INTO v_session_id 
    FROM academic_sessions 
    WHERE session_name = NEW.academic_year;
    
    SELECT id INTO v_term_id 
    FROM academic_terms 
    WHERE term_name = NEW.term;

    -- Calculate total amount paid by this student for this session/term
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid
    FROM payments
    WHERE student_id = NEW.student_id
    AND academic_year = NEW.academic_year
    AND term = NEW.term
    AND approval_status != 'rejected';  -- Don't count rejected payments

    -- Calculate required amount from student_fee_items (NEW ITEMIZED SYSTEM)
    SELECT COALESCE(SUM(sfi.amount), 0) INTO v_required_amount
    FROM student_fee_items sfi
    WHERE sfi.student_id = NEW.student_id
    AND sfi.session_id = v_session_id
    AND sfi.term_id = v_term_id;

    -- If no fee items found, use the amount from the payment as fallback
    IF v_required_amount = 0 THEN
        v_required_amount := NEW.amount;
    END IF;

    -- Calculate balance
    v_balance := v_required_amount - v_total_paid;

    -- Determine clearance status
    IF v_total_paid >= v_required_amount THEN
        v_is_cleared := TRUE;
        v_clearance_status := 'cleared';
    ELSIF v_total_paid >= (v_required_amount * 0.5) THEN
        v_is_cleared := FALSE;
        v_clearance_status := 'partial';
    ELSE
        v_is_cleared := FALSE;
        v_clearance_status := 'outstanding';
    END IF;

    -- Update or insert student_clearance record
    INSERT INTO student_clearance (
        student_id,
        session_id,
        term_id,
        total_amount_paid,
        balance,
        is_cleared,
        clearance_status,
        updated_at
    ) VALUES (
        NEW.student_id,
        v_session_id,
        v_term_id,
        v_total_paid,
        v_balance,
        v_is_cleared,
        v_clearance_status,
        NOW()
    )
    ON CONFLICT (student_id, session_id, term_id)
    DO UPDATE SET
        total_amount_paid = v_total_paid,
        balance = v_balance,
        is_cleared = v_is_cleared,
        clearance_status = v_clearance_status,
        updated_at = NOW();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Step 4: Recreate the triggers
CREATE TRIGGER trigger_update_clearance_on_payment_change
AFTER INSERT OR UPDATE ON payments
FOR EACH ROW
EXECUTE FUNCTION update_student_clearance_from_payments();

-- Step 5: Verify
SELECT 'Trigger and function recreated successfully!' as status;

-- Show the triggers
SELECT trigger_name, event_manipulation, action_timing
FROM information_schema.triggers 
WHERE event_object_table = 'payments';
