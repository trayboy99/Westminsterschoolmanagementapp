-- =====================================================
-- MIGRATION: FEE ITEMIZATION SYSTEM
-- Purpose: Transform single-amount fee structure into itemized fee system
-- Date: 2026-01-08
-- =====================================================

-- =====================================================
-- STEP 1: Modify fee_structure table to become fee_items (Master Fee Items)
-- =====================================================

-- Add new columns to fee_structure table
ALTER TABLE fee_structure 
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS is_tuition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS class_level TEXT,
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Rename required_amount to amount for clarity (if column exists)
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'fee_structure' 
        AND column_name = 'required_amount'
    ) THEN
        ALTER TABLE fee_structure RENAME COLUMN required_amount TO amount;
    END IF;
END $$;

-- Add amount column if it doesn't exist
ALTER TABLE fee_structure 
ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0;

-- Add created_at if it doesn't exist
ALTER TABLE fee_structure 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_fee_structure_session_term 
ON fee_structure(session, term);

CREATE INDEX IF NOT EXISTS idx_fee_structure_is_tuition 
ON fee_structure(is_tuition);

CREATE INDEX IF NOT EXISTS idx_fee_structure_class_level 
ON fee_structure(class_level);

-- Add comment to table
COMMENT ON TABLE fee_structure IS 'Master list of all fee items created by Director (Tuition, Boarding, Sports, etc.)';

COMMENT ON COLUMN fee_structure.item_name IS 'Name of fee item (e.g., Tuition, Boarding, Sports, Lab Materials)';
COMMENT ON COLUMN fee_structure.is_tuition IS 'TRUE if this is the main Tuition item (only one per session/term/class)';
COMMENT ON COLUMN fee_structure.is_compulsory IS 'TRUE if all students must pay this item';
COMMENT ON COLUMN fee_structure.amount IS 'Base amount for this fee item';
COMMENT ON COLUMN fee_structure.class_level IS 'Class level this fee applies to (e.g., JSS1, SSS2, or ALL)';
COMMENT ON COLUMN fee_structure.created_by IS 'Director who created this fee item';


-- =====================================================
-- STEP 2: Modify fees table to become student_fee_assignments
-- =====================================================

-- Add new columns to fees table
ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS fee_item_id UUID REFERENCES fee_structure(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tuition_discount_percentage NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discounted_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add session and term if they don't exist
ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS session TEXT,
ADD COLUMN IF NOT EXISTS term TEXT;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fees_student_id 
ON fees(student_id);

CREATE INDEX IF NOT EXISTS idx_fees_fee_item_id 
ON fees(fee_item_id);

CREATE INDEX IF NOT EXISTS idx_fees_session_term 
ON fees(session, term);

CREATE INDEX IF NOT EXISTS idx_fees_is_active 
ON fees(is_active);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_fees_student_session_term 
ON fees(student_id, session, term, is_active);

-- Add comment to table
COMMENT ON TABLE fees IS 'Student-specific fee assignments - which fee items each student pays';

COMMENT ON COLUMN fees.fee_item_id IS 'Reference to the fee item from fee_structure table';
COMMENT ON COLUMN fees.tuition_discount_percentage IS 'Discount percentage (0-100) applied ONLY to tuition item';
COMMENT ON COLUMN fees.discounted_amount IS 'Final amount after applying discount (for tuition items)';
COMMENT ON COLUMN fees.original_amount IS 'Original amount before discount';
COMMENT ON COLUMN fees.is_active IS 'FALSE if this fee assignment was removed/deactivated';
COMMENT ON COLUMN fees.assigned_by IS 'Finance Admin who assigned this fee to the student';


-- =====================================================
-- STEP 3: Create helper view for easy querying
-- =====================================================

CREATE OR REPLACE VIEW student_fee_summary AS
SELECT 
    f.student_id,
    p.first_name || ' ' || p.last_name AS student_name,
    c.name AS class_name,
    f.session,
    f.term,
    fs.item_name,
    fs.is_tuition,
    f.original_amount,
    f.tuition_discount_percentage,
    f.discounted_amount,
    CASE 
        WHEN fs.is_tuition THEN f.discounted_amount
        ELSE f.original_amount
    END AS final_amount,
    f.is_active,
    f.assigned_at
FROM fees f
JOIN fee_structure fs ON f.fee_item_id = fs.id
JOIN profiles p ON f.student_id = p.id
LEFT JOIN classes c ON p.class_id = c.id
WHERE f.is_active = true
ORDER BY f.student_id, fs.is_tuition DESC, fs.item_name;

COMMENT ON VIEW student_fee_summary IS 'Comprehensive view of all student fee assignments with calculated amounts';


-- =====================================================
-- STEP 4: Create function to calculate student total fees
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_student_total_fees(
    p_student_id UUID,
    p_session TEXT,
    p_term TEXT
)
RETURNS TABLE(
    total_fees NUMERIC,
    tuition_amount NUMERIC,
    tuition_discount NUMERIC,
    discounted_tuition NUMERIC,
    other_fees_total NUMERIC,
    fee_items_count INTEGER
) 
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    WITH fee_breakdown AS (
        SELECT 
            f.student_id,
            fs.is_tuition,
            f.original_amount,
            f.tuition_discount_percentage,
            CASE 
                WHEN fs.is_tuition THEN f.discounted_amount
                ELSE f.original_amount
            END AS final_amount
        FROM fees f
        JOIN fee_structure fs ON f.fee_item_id = fs.id
        WHERE f.student_id = p_student_id
            AND f.session = p_session
            AND f.term = p_term
            AND f.is_active = true
    )
    SELECT 
        COALESCE(SUM(final_amount), 0) AS total_fees,
        COALESCE(SUM(original_amount) FILTER (WHERE is_tuition = true), 0) AS tuition_amount,
        COALESCE(MAX(tuition_discount_percentage) FILTER (WHERE is_tuition = true), 0) AS tuition_discount,
        COALESCE(SUM(final_amount) FILTER (WHERE is_tuition = true), 0) AS discounted_tuition,
        COALESCE(SUM(final_amount) FILTER (WHERE is_tuition = false), 0) AS other_fees_total,
        COUNT(*)::INTEGER AS fee_items_count
    FROM fee_breakdown;
END;
$$;

COMMENT ON FUNCTION calculate_student_total_fees IS 'Calculates total fees for a student including tuition discount and other items';


-- =====================================================
-- STEP 5: Create trigger to auto-calculate discounted_amount
-- =====================================================

CREATE OR REPLACE FUNCTION auto_calculate_discounted_amount()
RETURNS TRIGGER 
LANGUAGE plpgsql
AS $$
DECLARE
    v_is_tuition BOOLEAN;
BEGIN
    -- Get is_tuition flag from fee_structure
    SELECT is_tuition INTO v_is_tuition
    FROM fee_structure
    WHERE id = NEW.fee_item_id;

    -- Set original_amount if not provided
    IF NEW.original_amount IS NULL OR NEW.original_amount = 0 THEN
        SELECT amount INTO NEW.original_amount
        FROM fee_structure
        WHERE id = NEW.fee_item_id;
    END IF;

    -- Calculate discounted_amount
    IF v_is_tuition AND NEW.tuition_discount_percentage > 0 THEN
        NEW.discounted_amount := NEW.original_amount - (NEW.original_amount * NEW.tuition_discount_percentage / 100);
    ELSE
        NEW.discounted_amount := NEW.original_amount;
    END IF;

    NEW.updated_at := NOW();
    
    RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_auto_calculate_discounted_amount
    BEFORE INSERT OR UPDATE ON fees
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_discounted_amount();

COMMENT ON TRIGGER trigger_auto_calculate_discounted_amount ON fees IS 'Automatically calculates discounted_amount when fee assignment is created/updated';


-- =====================================================
-- STEP 6: Add constraints for data integrity
-- =====================================================

-- Ensure tuition_discount_percentage is between 0 and 100
ALTER TABLE fees 
DROP CONSTRAINT IF EXISTS check_tuition_discount_range;

ALTER TABLE fees 
ADD CONSTRAINT check_tuition_discount_range 
CHECK (tuition_discount_percentage >= 0 AND tuition_discount_percentage <= 100);

-- Ensure only one tuition item per session/term/class
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_tuition_per_session_term_class
ON fee_structure(session, term, class_level, is_tuition)
WHERE is_tuition = true;

-- Ensure student can't have duplicate fee items for same session/term
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_student_fee_assignment
ON fees(student_id, fee_item_id, session, term)
WHERE is_active = true;


-- =====================================================
-- STEP 7: Migration Complete Message
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ Migration Complete: Fee Itemization System';
    RAISE NOTICE '📋 Tables Modified:';
    RAISE NOTICE '   - fee_structure (now stores fee items master list)';
    RAISE NOTICE '   - fees (now stores student-specific fee assignments)';
    RAISE NOTICE '🔧 New Features:';
    RAISE NOTICE '   - Itemized fee structure (Tuition + Additional Items)';
    RAISE NOTICE '   - Discount applies ONLY to Tuition';
    RAISE NOTICE '   - Auto-calculation triggers';
    RAISE NOTICE '   - Helper views and functions';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  NEXT STEPS:';
    RAISE NOTICE '   1. Update backend endpoints to use new table structure';
    RAISE NOTICE '   2. Migrate existing KV store data (if needed)';
    RAISE NOTICE '   3. Update frontend components';
END $$;
