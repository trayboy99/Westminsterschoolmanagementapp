CREATE TABLE IF NOT EXISTS fee_structure (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_type VARCHAR(20) NOT NULL CHECK (student_type IN ('Day', 'Boarding')),
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  required_amount DECIMAL(12,2) NOT NULL CHECK (required_amount >= 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_type, session_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_fee_structure_student_type ON fee_structure(student_type);
CREATE INDEX IF NOT EXISTS idx_fee_structure_session_term ON fee_structure(session_id, term_id);

ALTER TABLE fee_structure ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance Admin can view fee structure" ON fee_structure;
CREATE POLICY "Finance Admin can view fee structure"
  ON fee_structure FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance_admin', 'director', 'it_admin')
    )
  );

DROP POLICY IF EXISTS "Finance Admin can manage fee structure" ON fee_structure;
CREATE POLICY "Finance Admin can manage fee structure"
  ON fee_structure FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'student_type'
  ) THEN
    ALTER TABLE profiles 
    ADD COLUMN student_type VARCHAR(20) CHECK (student_type IN ('Day', 'Boarding'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payments' AND column_name = 'part_payment_number'
  ) THEN
    ALTER TABLE payments 
    ADD COLUMN part_payment_number INTEGER NOT NULL DEFAULT 1 CHECK (part_payment_number > 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_payments_part_payment_number ON payments(student_id, session, term, part_payment_number);

CREATE TABLE IF NOT EXISTS student_clearance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  student_type VARCHAR(20) NOT NULL CHECK (student_type IN ('Day', 'Boarding')),
  required_amount DECIMAL(12,2) NOT NULL CHECK (required_amount >= 0),
  total_paid DECIMAL(12,2) NOT NULL DEFAULT 0 CHECK (total_paid >= 0),
  outstanding_balance DECIMAL(12,2) GENERATED ALWAYS AS (required_amount - total_paid) STORED,
  outstanding_brought_forward DECIMAL(12,2) DEFAULT 0 CHECK (outstanding_brought_forward >= 0),
  is_cleared BOOLEAN GENERATED ALWAYS AS (total_paid >= required_amount) STORED,
  total_payments INTEGER NOT NULL DEFAULT 0,
  approved_payments INTEGER NOT NULL DEFAULT 0,
  pending_payments INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(student_id, session_id, term_id)
);

CREATE INDEX IF NOT EXISTS idx_student_clearance_student_id ON student_clearance(student_id);
CREATE INDEX IF NOT EXISTS idx_student_clearance_session_term ON student_clearance(session_id, term_id);
CREATE INDEX IF NOT EXISTS idx_student_clearance_is_cleared ON student_clearance(is_cleared);
CREATE INDEX IF NOT EXISTS idx_student_clearance_student_session_term ON student_clearance(student_id, session_id, term_id);

ALTER TABLE student_clearance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Finance Admin can view all clearance records" ON student_clearance;
CREATE POLICY "Finance Admin can view all clearance records"
  ON student_clearance FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('finance_admin', 'director', 'it_admin')
    )
  );

DROP POLICY IF EXISTS "Finance Admin can manage clearance records" ON student_clearance;
CREATE POLICY "Finance Admin can manage clearance records"
  ON student_clearance FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'finance_admin'
    )
  );

DROP POLICY IF EXISTS "Students can view their own clearance" ON student_clearance;
CREATE POLICY "Students can view their own clearance"
  ON student_clearance FOR SELECT
  USING (student_id = auth.uid());

CREATE OR REPLACE FUNCTION update_fee_structure_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_fee_structure_updated_at ON fee_structure;
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

DROP TRIGGER IF EXISTS trigger_update_student_clearance_updated_at ON student_clearance;
CREATE TRIGGER trigger_update_student_clearance_updated_at
  BEFORE UPDATE ON student_clearance
  FOR EACH ROW
  EXECUTE FUNCTION update_student_clearance_updated_at();

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
  SELECT id INTO v_session_id 
  FROM academic_sessions 
  WHERE session_name = NEW.session;
  
  SELECT id INTO v_term_id 
  FROM academic_terms 
  WHERE term_name = NEW.term;
  
  SELECT student_type INTO v_student_type
  FROM profiles
  WHERE id = NEW.student_id;
  
  SELECT required_amount INTO v_required_amount
  FROM fee_structure
  WHERE student_type = v_student_type
    AND session_id = v_session_id
    AND term_id = v_term_id;
  
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

DROP TRIGGER IF EXISTS trigger_update_clearance_on_payment_change ON payments;
CREATE TRIGGER trigger_update_clearance_on_payment_change
  AFTER INSERT OR UPDATE ON payments
  FOR EACH ROW
  EXECUTE FUNCTION update_student_clearance_from_payments();

CREATE OR REPLACE VIEW director_payment_approvals_with_clearance AS
SELECT 
  p.id as payment_id,
  p.student_id,
  pr.first_name || ' ' || pr.last_name as student_name,
  pr.student_type,
  c.name as class_name,
  asess.session_name as academic_session,
  aterm.term_name as academic_term,
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
LEFT JOIN academic_sessions asess ON p.session = asess.session_name
LEFT JOIN academic_terms aterm ON p.term = aterm.term_name
LEFT JOIN student_clearance sc ON (
  sc.student_id = p.student_id 
  AND sc.session_id = asess.id 
  AND sc.term_id = aterm.id
)
ORDER BY p.created_at DESC;
