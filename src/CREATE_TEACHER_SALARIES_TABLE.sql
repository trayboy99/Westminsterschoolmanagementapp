-- =====================================================
-- TEACHER SALARIES TABLE
-- Manages teacher salary structure with basic pay,
-- increases, taxes, and allowances
-- =====================================================

-- Create teacher_salaries table
CREATE TABLE IF NOT EXISTS teacher_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Salary Components
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  salary_increase DECIMAL(12, 2) DEFAULT 0, -- Optional salary increase/bonus
  allowances DECIMAL(12, 2) DEFAULT 0, -- Housing, transport, etc.
  
  -- Deductions
  tax_percentage DECIMAL(5, 2) DEFAULT 0, -- Tax as percentage (e.g., 10.00 for 10%)
  pension_percentage DECIMAL(5, 2) DEFAULT 0, -- Pension contribution percentage
  other_deductions DECIMAL(12, 2) DEFAULT 0, -- Other deductions (loans, etc.)
  
  -- Calculated Fields (stored for reporting)
  gross_salary DECIMAL(12, 2) GENERATED ALWAYS AS (basic_salary + salary_increase + allowances) STORED,
  total_deductions DECIMAL(12, 2) GENERATED ALWAYS AS (
    (basic_salary + salary_increase + allowances) * (tax_percentage / 100) +
    (basic_salary + salary_increase + allowances) * (pension_percentage / 100) +
    other_deductions
  ) STORED,
  net_salary DECIMAL(12, 2) GENERATED ALWAYS AS (
    (basic_salary + salary_increase + allowances) -
    (
      (basic_salary + salary_increase + allowances) * (tax_percentage / 100) +
      (basic_salary + salary_increase + allowances) * (pension_percentage / 100) +
      other_deductions
    )
  ) STORED,
  
  -- Metadata
  session TEXT NOT NULL, -- Academic session (e.g., "2024/2025")
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT, -- Optional notes about salary structure
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id), -- Who created this salary entry
  
  -- Constraints
  UNIQUE(teacher_id, session) -- One salary structure per teacher per session
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_teacher_id ON teacher_salaries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_session ON teacher_salaries(session);
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_effective_date ON teacher_salaries(effective_date);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_teacher_salaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_salaries_updated_at_trigger
BEFORE UPDATE ON teacher_salaries
FOR EACH ROW
EXECUTE FUNCTION update_teacher_salaries_updated_at();

-- Add helpful comments
COMMENT ON TABLE teacher_salaries IS 'Stores teacher salary structure with basic pay, increases, allowances, and deductions';
COMMENT ON COLUMN teacher_salaries.basic_salary IS 'Base salary amount';
COMMENT ON COLUMN teacher_salaries.salary_increase IS 'Optional salary increase or bonus';
COMMENT ON COLUMN teacher_salaries.allowances IS 'Total allowances (housing, transport, etc.)';
COMMENT ON COLUMN teacher_salaries.tax_percentage IS 'Tax rate as percentage (e.g., 10.00 for 10%)';
COMMENT ON COLUMN teacher_salaries.pension_percentage IS 'Pension contribution as percentage';
COMMENT ON COLUMN teacher_salaries.gross_salary IS 'Calculated: basic_salary + salary_increase + allowances';
COMMENT ON COLUMN teacher_salaries.net_salary IS 'Calculated: gross_salary - total_deductions';

-- Sample data comment
-- To add a teacher salary:
-- INSERT INTO teacher_salaries (teacher_id, basic_salary, salary_increase, allowances, tax_percentage, pension_percentage, session)
-- VALUES ('teacher-uuid', 150000.00, 10000.00, 25000.00, 10.00, 8.00, '2024/2025');
