-- =====================================================
-- FINANCE MODULE - CLEARANCE SYSTEM MIGRATIONS
-- School Management System
-- =====================================================
-- Purpose: Add fee structure, student clearance tracking, and part payment system
-- Version: 2.0
-- Date: November 6, 2025
-- =====================================================

-- =====================================================
-- PART 1: Create fee_structure table
-- =====================================================

CREATE TABLE IF NOT EXISTS fee_structure (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Student Type (Day or Boarding)
  student_type VARCHAR(20) NOT NULL CHECK (student_type IN ('Day', 'Boarding')),
  
  -- Academic Period (from academic_sessions and academic_terms tables)
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  
  -- Fee Amount
  required_amount DECIMAL(12,2) NOT NULL CHECK (required_amount >= 0),
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one fee per student type per session per term
  UNIQUE(student_type, session_id, term_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_fee_structure_student_type ON fee_structure(student_type);
CREATE INDEX IF NOT EXISTS idx_fee_structure_session_term ON fee_structure(session_id, term_id);

-- Add comment
COMMENT ON TABLE fee_structure IS 'Stores required school fees for Day and Boarding students per term';
COMMENT ON COLUMN fee_structure.student_type IS 'Day or Boarding student type';
COMMENT ON COLUMN fee_structure.required_amount IS 'Required school fee amount for this student type and term';

-- Enable RLS
ALTER TABLE fee_structure ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Finance Admin can view fee structure"
  ON fee_structure FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance_admin', 'director', 'it_admin')
    )
  );

CREATE POLICY "Finance Admin can manage fee structure"
  ON fee_structure FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

-- =====================================================
-- PART 2: Add student_type to profiles table
-- =====================================================

-- Add student_type column to profiles if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'student_type'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN student_type VARCHAR(20) CHECK (student_type IN ('Day', 'Boarding'));
    
    COMMENT ON COLUMN profiles.student_type IS 'Student type: Day or Boarding (only for students)';
  END IF;
END $$;

-- =====================================================
-- PART 3: Modify payments table to add part_payment_number
-- =====================================================

-- Add part_payment_number column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'part_payment_number'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN part_payment_number INTEGER NOT NULL DEFAULT 1 CHECK (part_payment_number > 0);
    
    COMMENT ON COLUMN payments.part_payment_number IS 'Installment number for this payment (1, 2, 3, etc.)';
  END IF;
END $$;

-- Add index for part payment number
CREATE INDEX IF NOT EXISTS idx_payments_part_payment_number ON payments(student_id, session, term, part_payment_number);

-- =====================================================
-- PART 4: Create student_clearance table
-- =====================================================

CREATE TABLE IF NOT EXISTS student_clearance (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Student Information
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Academic Period (from academic_sessions and academic_terms tables)
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  
  -- Student Type
  student_type VARCHAR(20) NOT NULL CHECK (student_type IN ('Day', 'Boarding')),
  
  -- Fee Information
  required_amount DECIMAL(12,2) NOT NULL CHECK (required_amount >= 0),
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  outstanding_balance DECIMAL(12,2) GENERATED ALWAYS AS (required_amount - total_paid) STORED,
  outstanding_brought_forward DECIMAL(12,2) DEFAULT 0 CHECK (outstanding_brought_forward >= 0),
  
  -- Clearance Status
  is_cleared BOOLEAN GENERATED ALWAYS AS (total_paid >= required_amount) STORED,
  
  -- Payment Count
  total_payments INTEGER NOT NULL DEFAULT 0,
  approved_payments INTEGER NOT NULL DEFAULT 0,
  pending_payments INTEGER NOT NULL DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint: one clearance record per student per session per term
  UNIQUE(student_id, session_id, term_id)
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_student_clearance_student_id ON student_clearance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_clearance_session_term ON student_clearance(session_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_clearance_is_cleared ON student_clearance(is_cleared);
CREATE INDEX IF NOT EXISTS idx_student_clearance_student_session_term ON student_clearance(student_id, session_id, term_id);

-- Add comment
COMMENT ON TABLE student_clearance IS 'Tracks student fee clearance status per term with part payment aggregation';
COMMENT ON COLUMN student_clearance.total_paid IS 'Sum of all approved payments for this student/session/term';
COMMENT ON COLUMN student_clearance.outstanding_balance IS 'Auto-calculated: required_amount - total_paid';
COMMENT ON COLUMN student_clearance.outstanding_brought_forward IS 'Outstanding balance from previous term';
COMMENT ON COLUMN student_clearance.is_cleared IS 'Auto-calculated: true if total_paid >= required_amount';

-- Enable RLS
ALTER TABLE student_clearance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Finance Admin can view all clearance records"
  ON student_clearance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance_admin', 'director', 'it_admin')
    )
  );

CREATE POLICY "Finance Admin can manage clearance records"
  ON student_clearance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

CREATE POLICY "Students can view their own clearance"
  ON student_clearance FOR SELECT
  USING (student_id = auth.uid());

-- =====================================================
-- PART 5: Create updated_at trigger for new tables
-- =====================================================

CREATE OR REPLACE FUNCTION update_fee_structure_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_fee_structure_updated_at
  BEFORE UPDATE ON fee_structure
  FOR EACH ROW
  EXECUTE FUNCTION update_fee_structure_updated_at();

CREATE OR REPLACE FUNCTION update_student_clearance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_student_clearance_updated_at
  BEFORE UPDATE ON student_clearance
  FOR EACH ROW
  EXECUTE FUNCTION update_student_clearance_updated_at();

-- =====================================================
-- PART 6: Create helper functions for clearance
-- =====================================================

-- Function 1: Update student clearance after payment approval/rejection
CREATE OR REPLACE FUNCTION update_student_clearance_from_payments()
RETURNS TRIGGER AS $$
DECLARE
  v_session_id UUID;
  v_term_id UUID;
  v_student_type VARCHAR(20);
  v_required_amount DECIMAL(12,2);
  v_total_paid DECIMAL(12,2);
  v_total_payments INTEGER;
  v_approved_payments INTEGER;
  v_pending_payments INTEGER;
BEGIN
  -- Get session_id and term_id from academic tables
  SELECT id INTO v_session_id 
  FROM academic_sessions 
  WHERE session = NEW.session;
  
  SELECT id INTO v_term_id 
  FROM academic_terms 
  WHERE name = NEW.term;
  
  -- Get student type
  SELECT student_type INTO v_student_type
  FROM profiles
  WHERE id = NEW.student_id;
  
  -- Get required amount from fee_structure
  SELECT required_amount INTO v_required_amount
  FROM fee_structure
  WHERE student_type = v_student_type
    AND session_id = v_session_id
    AND term_id = v_term_id;
  
  -- Calculate totals
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE status = 'approved'),
    COUNT(*) FILTER (WHERE status = 'pending')
  INTO v_total_paid, v_total_payments, v_approved_payments, v_pending_payments
  FROM payments
  WHERE student_id = NEW.student_id
    AND session = NEW.session
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
    total_paid = v_total_paid,
    total_payments = v_total_payments,
    approved_payments = v_approved_payments,
    pending_payments = v_pending_payments,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update clearance when payment is inserted or updated
CREATE TRIGGER trigger_update_clearance_on_payment_change
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_clearance_from_payments();

-- =====================================================
-- PART 7: Create view for Director's payment approvals with clearance info
-- =====================================================

CREATE OR REPLACE VIEW director_payment_approvals_with_clearance AS
SELECT 
  p.id as payment_id,
  p.student_id,
  pr.first_name || ' ' || pr.last_name as student_name,
  pr.student_type,
  c.name as class_name,
  asess.session as academic_session,
  aterm.name as academic_term,
  p.amount as amount_paid,
  p.part_payment_number,
  p.payment_date,
  p.payment_method,
  p.reference_number as receipt_number,
  p.description as notes,
  p.status,
  sc.required_amount,
  sc.total_paid,
  sc.outstanding_balance,
  sc.is_cleared,
  finance.first_name || ' ' || finance.last_name as entered_by_name,
  p.created_at
FROM payments p
JOIN profiles pr ON p.student_id = pr.id
LEFT JOIN classes c ON pr.class_id = c.id
JOIN profiles finance ON p.entered_by = finance.id
LEFT JOIN academic_sessions asess ON p.session = asess.session
LEFT JOIN academic_terms aterm ON p.term = aterm.name
LEFT JOIN student_clearance sc ON (
  sc.student_id = p.student_id 
  AND sc.session_id = asess.id 
  AND sc.term_id = aterm.id
)
ORDER BY p.created_at DESC;

COMMENT ON VIEW director_payment_approvals_with_clearance IS 'Director view of all payments with student clearance information';

-- =====================================================
-- PART 8: Insert sample fee structure data
-- =====================================================

-- Note: This will be populated by Finance Admin through the UI
-- Sample structure (commented out - uncomment and modify as needed):
/*
INSERT INTO fee_structure (student_type, session_id, term_id, required_amount)
SELECT 
  'Day',
  (SELECT id FROM academic_sessions WHERE session = '2024/2025'),
  (SELECT id FROM academic_terms WHERE name = 'First Term'),
  50000.00
WHERE NOT EXISTS (
  SELECT 1 FROM fee_structure 
  WHERE student_type = 'Day' 
    AND session_id = (SELECT id FROM academic_sessions WHERE session = '2024/2025')
    AND term_id = (SELECT id FROM academic_terms WHERE name = 'First Term')
);

INSERT INTO fee_structure (student_type, session_id, term_id, required_amount)
SELECT 
  'Boarding',
  (SELECT id FROM academic_sessions WHERE session = '2024/2025'),
  (SELECT id FROM academic_terms WHERE name = 'First Term'),
  120000.00
WHERE NOT EXISTS (
  SELECT 1 FROM fee_structure 
  WHERE student_type = 'Boarding' 
    AND session_id = (SELECT id FROM academic_sessions WHERE session = '2024/2025')
    AND term_id = (SELECT id FROM academic_terms WHERE name = 'First Term')
);
*/

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'fee_structure') THEN
    RAISE NOTICE '✅ fee_structure table created successfully';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'student_clearance') THEN
    RAISE NOTICE '✅ student_clearance table created successfully';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'student_type'
  ) THEN
    RAISE NOTICE '✅ student_type column added to profiles table';
  END IF;
  
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'part_payment_number'
  ) THEN
    RAISE NOTICE '✅ part_payment_number column added to payments table';
  END IF;
END $$;

-- =====================================================
-- CLEARANCE SYSTEM MIGRATIONS COMPLETE
-- =====================================================

RAISE NOTICE '🎉 Finance Module Clearance System migrations completed successfully!';
RAISE NOTICE '📊 Ready for:';
RAISE NOTICE '   - Fee structure configuration (Day/Boarding fees per term)';
RAISE NOTICE '   - Student clearance tracking with part payments';
RAISE NOTICE '   - Automatic clearance calculation';
RAISE NOTICE '   - Director payment approval with clearance visibility';
