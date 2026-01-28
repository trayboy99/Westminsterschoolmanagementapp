-- =====================================================
-- FIX: Update student_clearance trigger for itemized fee system
-- =====================================================
-- This trigger updates the student_clearance table when payments are inserted/updated
-- It now calculates required_amount from assigned fee items instead of fee_structure.required_amount

CREATE OR REPLACE FUNCTION update_student_clearance_from_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_term_id UUID;
  v_student_type VARCHAR(20);
  v_required_amount DECIMAL(12,2) := 0;
  v_total_paid DECIMAL(12,2);
  v_total_payments INTEGER;
  v_approved_payments INTEGER;
  v_pending_payments INTEGER;
  v_discount_percentage DECIMAL(5,2) := 0;
  v_tuition_amount DECIMAL(12,2) := 0;
  v_other_items_total DECIMAL(12,2) := 0;
  v_assignment_key TEXT;
  v_assignments JSONB;
  v_student_assignment JSONB;
  v_fee_item_ids UUID[];
  v_discount_key TEXT;
  v_discounts JSONB;
  v_student_discount JSONB;
BEGIN
  -- Get session ID
  SELECT id INTO v_session_id 
  FROM academic_sessions 
  WHERE session_name = NEW.academic_year;
  
  -- Get term ID
  SELECT id INTO v_term_id 
  FROM academic_terms 
  WHERE term_name = NEW.term;
  
  -- Get student type
  SELECT student_type INTO v_student_type
  FROM profiles
  WHERE id = NEW.student_id;
  
  -- NEW ITEMIZED FEE SYSTEM: Calculate required_amount from assigned fee items
  -- Step 1: Get student's assigned fee items from KV store
  v_assignment_key := 'student_fee_assignments:' || v_session_id || ':' || v_term_id;
  
  SELECT value INTO v_assignments
  FROM kv_store_1ddd013a
  WHERE key = v_assignment_key;
  
  IF v_assignments IS NOT NULL THEN
    v_student_assignment := v_assignments->NEW.student_id::TEXT;
    
    IF v_student_assignment IS NOT NULL AND v_student_assignment->'fee_item_ids' IS NOT NULL THEN
      -- Extract fee item IDs from JSONB array
      SELECT ARRAY(
        SELECT jsonb_array_elements_text(v_student_assignment->'fee_item_ids')::UUID
      ) INTO v_fee_item_ids;
      
      -- Step 2: Get fee items and calculate total
      -- Separate tuition from other items
      SELECT 
        COALESCE(SUM(CASE WHEN is_tuition THEN amount ELSE 0 END), 0),
        COALESCE(SUM(CASE WHEN NOT is_tuition THEN amount ELSE 0 END), 0)
      INTO v_tuition_amount, v_other_items_total
      FROM fee_structure
      WHERE id = ANY(v_fee_item_ids);
      
      -- Step 3: Check for discount (only applies to tuition)
      v_discount_key := 'fee_item_discounts:' || v_session_id || ':' || v_term_id;
      
      SELECT value INTO v_discounts
      FROM kv_store_1ddd013a
      WHERE key = v_discount_key;
      
      IF v_discounts IS NOT NULL THEN
        v_student_discount := v_discounts->NEW.student_id::TEXT;
        
        IF v_student_discount IS NOT NULL AND v_student_discount->'percentage' IS NOT NULL THEN
          v_discount_percentage := (v_student_discount->>'percentage')::DECIMAL;
        END IF;
      END IF;
      
      -- Step 4: Calculate required amount (discount on tuition only)
      IF v_discount_percentage > 0 THEN
        v_required_amount := (v_tuition_amount * (1 - v_discount_percentage / 100)) + v_other_items_total;
      ELSE
        v_required_amount := v_tuition_amount + v_other_items_total;
      END IF;
      
    END IF;
  END IF;
  
  -- Fallback: If no itemized fees found, try old system
  IF v_required_amount = 0 THEN
    SELECT required_amount INTO v_required_amount
    FROM fee_structure
    WHERE student_type = v_student_type
      AND session_id = v_session_id
      AND term_id = v_term_id
    LIMIT 1;
  END IF;
  
  -- Calculate payment totals
  SELECT 
    COALESCE(SUM(CASE WHEN approval_status = 'approved' THEN amount_paid ELSE 0 END), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE approval_status = 'approved'),
    COUNT(*) FILTER (WHERE approval_status = 'pending')
  INTO v_total_paid, v_total_payments, v_approved_payments, v_pending_payments
  FROM payments
  WHERE student_id = NEW.student_id
    AND academic_year = NEW.academic_year
    AND term = NEW.term;
  
  -- Insert or update student_clearance
  INSERT INTO student_clearance (
    student_id,
    session_id,
    term_id,
    student_type,
    required_amount,
    total_paid,
    total_payments,
    approved_payments,
    pending_payments
  )
  VALUES (
    NEW.student_id,
    v_session_id,
    v_term_id,
    v_student_type,
    COALESCE(v_required_amount, 0),
    v_total_paid,
    v_total_payments,
    v_approved_payments,
    v_pending_payments
  )
  ON CONFLICT (student_id, session_id, term_id)
  DO UPDATE SET
    required_amount = COALESCE(v_required_amount, 0),
    total_paid = v_total_paid,
    total_payments = v_total_payments,
    approved_payments = v_approved_payments,
    pending_payments = v_pending_payments,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS trigger_update_clearance_on_payment_change ON payments;
CREATE TRIGGER trigger_update_clearance_on_payment_change
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_clearance_from_payments();

-- Log success
DO $$
BEGIN
  RAISE NOTICE '✅ Updated trigger: update_student_clearance_from_payments';
  RAISE NOTICE '✅ Trigger now calculates required_amount from itemized fee assignments';
  RAISE NOTICE '✅ Supports discount on tuition items';
  RAISE NOTICE '📝 Test by creating a new payment to verify student_clearance updates correctly';
END $$;