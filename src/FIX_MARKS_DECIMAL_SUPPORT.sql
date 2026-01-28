-- =====================================================
-- FIX: Support Decimal Marks (17.5, 18.5, etc.)
-- =====================================================
-- Problem: Database columns are INTEGER type but teachers
-- are entering decimal marks like 17.5
-- Solution: Change to NUMERIC(5,2) to support decimals
-- =====================================================

-- Change marks columns from INTEGER to NUMERIC(5,2)
-- This supports values like 17.5, 99.99, etc.
-- Format: NUMERIC(5,2) means max 999.99 (5 digits total, 2 after decimal)

ALTER TABLE marks 
  ALTER COLUMN ca1 TYPE NUMERIC(5,2),
  ALTER COLUMN ca2 TYPE NUMERIC(5,2),
  ALTER COLUMN exam TYPE NUMERIC(5,2),
  ALTER COLUMN total TYPE NUMERIC(6,2); -- Slightly larger for total

-- Verify the change
SELECT 
  column_name, 
  data_type, 
  numeric_precision, 
  numeric_scale
FROM information_schema.columns 
WHERE table_name = 'marks' 
  AND column_name IN ('ca1', 'ca2', 'exam', 'total');

-- Test with a decimal value (optional - run this to verify it works)
-- SELECT 17.5::NUMERIC(5,2) as test_decimal;
