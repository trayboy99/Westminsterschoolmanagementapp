-- ============================================================================
-- REMOVE DISCOUNT COLUMNS FROM PAYMENTS TABLE
-- ============================================================================
-- This removes the 3 discount columns that were added for manual discount entry
-- We're implementing a better approach: Director sets student-specific discounts
-- ============================================================================

-- Drop the 3 discount columns
ALTER TABLE payments 
DROP COLUMN IF EXISTS original_amount,
DROP COLUMN IF EXISTS discount_percentage,
DROP COLUMN IF EXISTS discount_amount;

-- Verify columns are removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
  AND column_name IN ('original_amount', 'discount_percentage', 'discount_amount')
ORDER BY column_name;

-- Should return 0 rows if successful
