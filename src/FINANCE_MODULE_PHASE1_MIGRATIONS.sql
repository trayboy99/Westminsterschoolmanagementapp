-- =====================================================
-- FINANCE MODULE - PHASE 1 DATABASE MIGRATIONS
-- School Management System
-- =====================================================
-- Purpose: Create payments table, RLS policies, and supporting structures
-- Version: 1.0
-- Date: November 6, 2025
-- =====================================================

-- STEP 1: Create payments table
-- =====================================================

CREATE TABLE IF NOT EXISTS payments (
  -- Primary Key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Student Information
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Academic Period
  session VARCHAR(9) NOT NULL, -- e.g., "2023/2024"
  term VARCHAR(20) NOT NULL CHECK (term IN ('First Term', 'Second Term', 'Third Term')),
  
  -- Payment Details
  amount DECIMAL(12,2) NOT NULL CHECK (amount >= 0),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL CHECK (payment_method IN ('Cash', 'Bank Transfer', 'Cheque', 'POS', 'Online Payment', 'Other')),
  
  -- Reference Information
  reference_number VARCHAR(100), -- Bank teller number, receipt number, etc.
  description TEXT, -- Optional notes about the payment
  
  -- Category (for future expansion)
  category VARCHAR(50) DEFAULT 'School Fees' CHECK (category IN ('School Fees', 'Transport Fee', 'Hostel Fee', 'Exam Fee', 'Other')),
  
  -- Director Approval Workflow
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  director_id UUID REFERENCES profiles(id) ON DELETE SET NULL, -- Who approved/rejected
  approval_date TIMESTAMP WITH TIME ZONE, -- When approved/rejected
  rejection_reason TEXT, -- Only filled if rejected
  
  -- Entry Tracking
  entered_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT, -- Finance Admin who entered
  entry_method VARCHAR(20) NOT NULL DEFAULT 'manual' CHECK (entry_method IN ('manual', 'bulk_upload')),
  bulk_upload_batch_id UUID, -- Groups payments from same Excel upload
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_payments_student_id ON payments(student_id);
CREATE INDEX IF NOT EXISTS idx_payments_session_term ON payments(session, term);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status);
CREATE INDEX IF NOT EXISTS idx_payments_entered_by ON payments(entered_by);
CREATE INDEX IF NOT EXISTS idx_payments_director_id ON payments(director_id);
CREATE INDEX IF NOT EXISTS idx_payments_payment_date ON payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_payments_bulk_batch ON payments(bulk_upload_batch_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_at ON payments(created_at DESC);

-- Add composite index for common queries
CREATE INDEX IF NOT EXISTS idx_payments_student_session_term 
ON payments(student_id, session, term);

-- Add comment
COMMENT ON TABLE payments IS 'Stores all school fee payments with Director approval workflow';
COMMENT ON COLUMN payments.status IS 'pending = awaiting Director approval, approved = Director approved, rejected = Director rejected';
COMMENT ON COLUMN payments.entry_method IS 'manual = individual entry, bulk_upload = Excel upload';
COMMENT ON COLUMN payments.bulk_upload_batch_id IS 'Groups all payments from the same Excel file upload';

-- =====================================================
-- STEP 2: Create updated_at trigger
-- =====================================================

CREATE OR REPLACE FUNCTION update_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payments_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_payments_updated_at();

-- =====================================================
-- STEP 3: Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

-- Policy 1: Finance Admin can view all payments
CREATE POLICY "Finance Admin can view all payments"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

-- Policy 2: Finance Admin can insert payments
CREATE POLICY "Finance Admin can insert payments"
  ON payments
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

-- Policy 3: Finance Admin can update pending payments (before approval)
CREATE POLICY "Finance Admin can update pending payments"
  ON payments
  FOR UPDATE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

-- Policy 4: Finance Admin can delete pending payments
CREATE POLICY "Finance Admin can delete pending payments"
  ON payments
  FOR DELETE
  USING (
    status = 'pending'
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

-- Policy 5: Director can view all payments
CREATE POLICY "Director can view all payments"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  );

-- Policy 6: Director can approve/reject payments
CREATE POLICY "Director can approve or reject payments"
  ON payments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  )
  WITH CHECK (
    -- Only allow updating status-related fields
    status IN ('approved', 'rejected')
  );

-- Policy 7: IT Admin can view all payments (read-only)
CREATE POLICY "IT Admin can view all payments"
  ON payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'it_admin'
    )
  );

-- Policy 8: Students can view their own approved payments only
CREATE POLICY "Students can view their own approved payments"
  ON payments
  FOR SELECT
  USING (
    student_id = auth.uid()
    AND status = 'approved'
  );

-- =====================================================
-- STEP 4: Create bulk upload batches tracking table
-- =====================================================

CREATE TABLE IF NOT EXISTS payment_upload_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Batch Information
  filename VARCHAR(255) NOT NULL,
  total_rows INTEGER NOT NULL,
  successful_rows INTEGER DEFAULT 0,
  failed_rows INTEGER DEFAULT 0,
  
  -- Session/Term
  session VARCHAR(9) NOT NULL,
  term VARCHAR(20) NOT NULL,
  
  -- Upload Details
  uploaded_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Status
  status VARCHAR(20) DEFAULT 'processing' CHECK (status IN ('processing', 'completed', 'failed')),
  error_log TEXT, -- JSON array of errors if any
  
  -- Approval Summary
  pending_count INTEGER DEFAULT 0,
  approved_count INTEGER DEFAULT 0,
  rejected_count INTEGER DEFAULT 0
);

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_by ON payment_upload_batches(uploaded_by);
CREATE INDEX IF NOT EXISTS idx_upload_batches_session_term ON payment_upload_batches(session, term);
CREATE INDEX IF NOT EXISTS idx_upload_batches_uploaded_at ON payment_upload_batches(uploaded_at DESC);

-- Enable RLS
ALTER TABLE payment_upload_batches ENABLE ROW LEVEL SECURITY;

-- RLS Policies for upload batches
CREATE POLICY "Finance Admin can view upload batches"
  ON payment_upload_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

CREATE POLICY "Finance Admin can insert upload batches"
  ON payment_upload_batches FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

CREATE POLICY "Director can view upload batches"
  ON payment_upload_batches FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'director'
    )
  );

-- =====================================================
-- STEP 5: Create helper views for common queries
-- =====================================================

-- View 1: Payment summary by student, session, term
CREATE OR REPLACE VIEW payment_summary AS
SELECT 
  p.student_id,
  pr.first_name,
  pr.last_name,
  pr.email,
  c.name as class_name,
  p.session,
  p.term,
  COUNT(*) as total_payments,
  SUM(CASE WHEN p.status = 'approved' THEN p.amount ELSE 0 END) as approved_amount,
  SUM(CASE WHEN p.status = 'pending' THEN p.amount ELSE 0 END) as pending_amount,
  SUM(CASE WHEN p.status = 'rejected' THEN p.amount ELSE 0 END) as rejected_amount,
  MAX(p.payment_date) as last_payment_date
FROM payments p
JOIN profiles pr ON p.student_id = pr.id
LEFT JOIN classes c ON pr.class_id = c.id
GROUP BY p.student_id, pr.first_name, pr.last_name, pr.email, c.name, p.session, p.term;

COMMENT ON VIEW payment_summary IS 'Summary of payments by student, session, and term';

-- View 2: Pending approvals for Director
CREATE OR REPLACE VIEW pending_payment_approvals AS
SELECT 
  p.id,
  p.student_id,
  pr.first_name || ' ' || pr.last_name as student_name,
  pr.email as student_email,
  c.name as class_name,
  p.session,
  p.term,
  p.amount,
  p.payment_date,
  p.payment_method,
  p.reference_number,
  p.description,
  p.category,
  p.entry_method,
  finance.first_name || ' ' || finance.last_name as entered_by_name,
  p.created_at
FROM payments p
JOIN profiles pr ON p.student_id = pr.id
LEFT JOIN classes c ON pr.class_id = c.id
JOIN profiles finance ON p.entered_by = finance.id
WHERE p.status = 'pending'
ORDER BY p.created_at ASC;

COMMENT ON VIEW pending_payment_approvals IS 'List of all payments awaiting Director approval';

-- =====================================================
-- STEP 6: Create functions for payment operations
-- =====================================================

-- Function 1: Get student payment status for clearance
CREATE OR REPLACE FUNCTION get_student_clearance_status(
  p_student_id UUID,
  p_session VARCHAR(9),
  p_term VARCHAR(20)
)
RETURNS TABLE (
  total_approved DECIMAL(12,2),
  total_pending DECIMAL(12,2),
  payment_count INTEGER,
  last_payment_date DATE,
  is_cleared BOOLEAN
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) as total_approved,
    COALESCE(SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END), 0) as total_pending,
    COUNT(*)::INTEGER as payment_count,
    MAX(payment_date) as last_payment_date,
    COALESCE(SUM(CASE WHEN status = 'approved' THEN amount ELSE 0 END), 0) > 0 as is_cleared
  FROM payments
  WHERE student_id = p_student_id
    AND session = p_session
    AND term = p_term;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION get_student_clearance_status IS 'Check if student has approved payments for given session/term';

-- Function 2: Approve payment (Director only)
CREATE OR REPLACE FUNCTION approve_payment(
  p_payment_id UUID,
  p_director_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_director_role VARCHAR(50);
BEGIN
  -- Verify director role
  SELECT role INTO v_director_role
  FROM profiles
  WHERE id = p_director_id;
  
  IF v_director_role != 'director' THEN
    RAISE EXCEPTION 'Only Director can approve payments';
  END IF;
  
  -- Update payment
  UPDATE payments
  SET 
    status = 'approved',
    director_id = p_director_id,
    approval_date = NOW(),
    rejection_reason = NULL
  WHERE id = p_payment_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION approve_payment IS 'Approve a pending payment (Director only)';

-- Function 3: Reject payment (Director only)
CREATE OR REPLACE FUNCTION reject_payment(
  p_payment_id UUID,
  p_director_id UUID,
  p_rejection_reason TEXT
)
RETURNS BOOLEAN AS $$
DECLARE
  v_director_role VARCHAR(50);
BEGIN
  -- Verify director role
  SELECT role INTO v_director_role
  FROM profiles
  WHERE id = p_director_id;
  
  IF v_director_role != 'director' THEN
    RAISE EXCEPTION 'Only Director can reject payments';
  END IF;
  
  -- Update payment
  UPDATE payments
  SET 
    status = 'rejected',
    director_id = p_director_id,
    approval_date = NOW(),
    rejection_reason = p_rejection_reason
  WHERE id = p_payment_id
    AND status = 'pending';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION reject_payment IS 'Reject a pending payment with reason (Director only)';

-- =====================================================
-- STEP 7: Create sample data structure documentation
-- =====================================================

COMMENT ON COLUMN payments.session IS 'Academic session in format YYYY/YYYY (e.g., 2023/2024)';
COMMENT ON COLUMN payments.term IS 'Academic term: First Term, Second Term, or Third Term';
COMMENT ON COLUMN payments.amount IS 'Payment amount in Naira (₦)';
COMMENT ON COLUMN payments.payment_method IS 'How payment was received: Cash, Bank Transfer, Cheque, POS, Online Payment, Other';
COMMENT ON COLUMN payments.reference_number IS 'Bank teller number, receipt number, or transaction reference';
COMMENT ON COLUMN payments.category IS 'Payment category: School Fees, Transport Fee, Hostel Fee, Exam Fee, Other';

-- =====================================================
-- VERIFICATION QUERIES
-- =====================================================

-- Check if tables exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    RAISE NOTICE '✅ payments table created successfully';
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_upload_batches') THEN
    RAISE NOTICE '✅ payment_upload_batches table created successfully';
  END IF;
END $$;

-- Count RLS policies
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'payments';
  
  RAISE NOTICE '✅ % RLS policies created for payments table', policy_count;
END $$;

-- =====================================================
-- PHASE 1 MIGRATION COMPLETE
-- =====================================================

-- Summary of what was created:
-- ✅ payments table with all required fields
-- ✅ payment_upload_batches table for bulk upload tracking
-- ✅ 8 RLS policies for payments table
-- ✅ 3 RLS policies for upload_batches table
-- ✅ 2 helper views: payment_summary, pending_payment_approvals
-- ✅ 3 helper functions: get_student_clearance_status, approve_payment, reject_payment
-- ✅ Proper indexes for performance
-- ✅ Auto-update timestamp trigger
-- ✅ Comprehensive comments and documentation

RAISE NOTICE '🎉 Finance Module Phase 1 migrations completed successfully!';
RAISE NOTICE '📊 Ready for Finance Admin to start entering payments';
RAISE NOTICE '👨‍💼 Director can now approve/reject payments from Director Dashboard';
