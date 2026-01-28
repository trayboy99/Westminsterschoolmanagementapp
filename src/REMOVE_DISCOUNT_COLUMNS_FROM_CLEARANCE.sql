-- =====================================================
-- Remove Discount Columns from student_clearance Table
-- =====================================================
-- 
-- These columns are NOT needed because:
-- 1. Discount data is stored in KV store: fee_item_discounts:session_id:term_id
-- 2. The /finance/clearance/bulk endpoint fetches discounts from KV store
-- 3. Frontend receives discount info from the API response
-- 4. Keeping discounts in KV store allows for easier updates without database migrations
--
-- =====================================================

-- Drop discount columns if they exist
ALTER TABLE student_clearance 
DROP COLUMN IF EXISTS original_amount,
DROP COLUMN IF EXISTS discount_percentage,
DROP COLUMN IF EXISTS discount_reason;

-- Verify columns are removed
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'student_clearance'
ORDER BY ordinal_position;
