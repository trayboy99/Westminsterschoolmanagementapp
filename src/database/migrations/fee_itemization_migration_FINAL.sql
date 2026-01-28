-- =====================================================
-- MIGRATION: FEE ITEMIZATION SYSTEM (FINAL - FIXED)
-- Purpose: Transform single-amount fee structure into itemized fee system
-- Date: 2026-01-08
-- Fixed: Handles existing student_type column properly
-- =====================================================

-- =====================================================
-- STEP 1: Make student_type nullable (if exists)
-- =====================================================

-- First, drop the NOT NULL constraint on student_type if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'fee_structure' 
        AND column_name = 'student_type'
    ) THEN
        ALTER TABLE fee_structure ALTER COLUMN student_type DROP NOT NULL;
        RAISE NOTICE '✓ Made student_type column nullable';
    END IF;
END $$;

-- Drop old unique constraint that prevents multiple fee items per student_type/session/term
ALTER TABLE fee_structure 
DROP CONSTRAINT IF EXISTS fee_structure_student_type_session_id_term_id_key;

DO $$ 
BEGIN
    RAISE NOTICE '✓ Removed old unique constraint to allow multiple fee items per student type/session/term';
END $$; 


-- =====================================================
-- STEP 2: Add new columns to fee_structure table
-- =====================================================

ALTER TABLE fee_structure 
ADD COLUMN IF NOT EXISTS item_name TEXT,
ADD COLUMN IF NOT EXISTS is_tuition BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_compulsory BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS class_level TEXT DEFAULT 'ALL',
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES profiles(id);

-- Update student_type constraint to accept 'ALL', 'Day', 'Boarding'
ALTER TABLE fee_structure 
DROP CONSTRAINT IF EXISTS fee_structure_student_type_check;

ALTER TABLE fee_structure 
ADD CONSTRAINT fee_structure_student_type_check 
CHECK (student_type IN ('ALL', 'Day', 'Boarding'));

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
        RAISE NOTICE '✓ Renamed required_amount to amount';
    END IF;
END $$;

-- Add amount column if it doesn't exist (after possible rename)
ALTER TABLE fee_structure 
ADD COLUMN IF NOT EXISTS amount NUMERIC(12, 2) DEFAULT 0;

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fee_structure_session_term_v2 
ON fee_structure(session_id, term_id);

CREATE INDEX IF NOT EXISTS idx_fee_structure_is_tuition 
ON fee_structure(is_tuition);

CREATE INDEX IF NOT EXISTS idx_fee_structure_class_level 
ON fee_structure(class_level);

-- Update table comments
COMMENT ON TABLE fee_structure IS 'Master list of all fee items created by Director (Tuition, Boarding, Sports, etc.)';

COMMENT ON COLUMN fee_structure.item_name IS 'Name of fee item (e.g., Tuition, Boarding, Sports, Lab Materials)';
COMMENT ON COLUMN fee_structure.is_tuition IS 'TRUE if this is the main Tuition item (only one per session/term/class)';
COMMENT ON COLUMN fee_structure.is_compulsory IS 'TRUE if all students must pay this item';
COMMENT ON COLUMN fee_structure.amount IS 'Base amount for this fee item';
COMMENT ON COLUMN fee_structure.class_level IS 'Class level this fee applies to (e.g., JSS1, SSS2, or ALL)';
COMMENT ON COLUMN fee_structure.created_by IS 'Director who created this fee item';


-- =====================================================
-- STEP 3: Check if fees table exists, create if not
-- =====================================================

CREATE TABLE IF NOT EXISTS fees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add new columns to fees table
ALTER TABLE fees 
ADD COLUMN IF NOT EXISTS fee_item_id UUID REFERENCES fee_structure(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES academic_sessions(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS term_id UUID REFERENCES academic_terms(id) ON DELETE CASCADE,
ADD COLUMN IF NOT EXISTS tuition_discount_percentage NUMERIC(5, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS discounted_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS original_amount NUMERIC(12, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS assigned_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS assigned_at TIMESTAMPTZ DEFAULT NOW(),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_fees_student_id 
ON fees(student_id);

CREATE INDEX IF NOT EXISTS idx_fees_fee_item_id 
ON fees(fee_item_id);

CREATE INDEX IF NOT EXISTS idx_fees_session_term 
ON fees(session_id, term_id);

CREATE INDEX IF NOT EXISTS idx_fees_is_active 
ON fees(is_active);

-- Create composite index for common queries
CREATE INDEX IF NOT EXISTS idx_fees_student_session_term 
ON fees(student_id, session_id, term_id, is_active);

-- Update table comments
COMMENT ON TABLE fees IS 'Student-specific fee assignments - which fee items each student pays';

COMMENT ON COLUMN fees.fee_item_id IS 'Reference to the fee item from fee_structure table';
COMMENT ON COLUMN fees.session_id IS 'Reference to academic_sessions table';
COMMENT ON COLUMN fees.term_id IS 'Reference to academic_terms table';
COMMENT ON COLUMN fees.tuition_discount_percentage IS 'Discount percentage (0-100) applied ONLY to tuition item';
COMMENT ON COLUMN fees.discounted_amount IS 'Final amount after applying discount (for tuition items)';
COMMENT ON COLUMN fees.original_amount IS 'Original amount before discount';
COMMENT ON COLUMN fees.is_active IS 'FALSE if this fee assignment was removed/deactivated';
COMMENT ON COLUMN fees.assigned_by IS 'Finance Admin who assigned this fee to the student';


-- =====================================================
-- STEP 4: Create helper view for easy querying
-- =====================================================

CREATE OR REPLACE VIEW student_fee_summary AS
SELECT 
    f.student_id,
    p.first_name || ' ' || p.last_name AS student_name,
    c.name AS class_name,
    s.session_name,
    t.term_name,
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
LEFT JOIN academic_sessions s ON f.session_id = s.id
LEFT JOIN academic_terms t ON f.term_id = t.id
WHERE f.is_active = true
ORDER BY f.student_id, fs.is_tuition DESC, fs.item_name;

COMMENT ON VIEW student_fee_summary IS 'Comprehensive view of all student fee assignments with calculated amounts';


-- =====================================================
-- STEP 5: Create function to calculate student total fees
-- =====================================================

CREATE OR REPLACE FUNCTION calculate_student_total_fees(
    p_student_id UUID,
    p_session_id UUID,
    p_term_id UUID
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
            AND f.session_id = p_session_id
            AND f.term_id = p_term_id
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
-- STEP 6: Create trigger to auto-calculate discounted_amount
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

-- Drop existing trigger if exists
DROP TRIGGER IF EXISTS trigger_auto_calculate_discounted_amount ON fees;

-- Create new trigger
CREATE TRIGGER trigger_auto_calculate_discounted_amount
    BEFORE INSERT OR UPDATE ON fees
    FOR EACH ROW
    EXECUTE FUNCTION auto_calculate_discounted_amount();

COMMENT ON TRIGGER trigger_auto_calculate_discounted_amount ON fees IS 'Automatically calculates discounted_amount when fee assignment is created/updated';


-- =====================================================
-- STEP 7: Add constraints for data integrity
-- =====================================================

-- Ensure tuition_discount_percentage is between 0 and 100
ALTER TABLE fees 
DROP CONSTRAINT IF EXISTS check_tuition_discount_range;

ALTER TABLE fees 
ADD CONSTRAINT check_tuition_discount_range 
CHECK (tuition_discount_percentage >= 0 AND tuition_discount_percentage <= 100);

-- Ensure only one tuition item per session/term/class
DROP INDEX IF EXISTS idx_unique_tuition_per_session_term_class;

CREATE UNIQUE INDEX idx_unique_tuition_per_session_term_class
ON fee_structure(session_id, term_id, class_level, is_tuition)
WHERE is_tuition = true;

-- Ensure student can't have duplicate fee items for same session/term
DROP INDEX IF EXISTS idx_unique_student_fee_assignment;

CREATE UNIQUE INDEX idx_unique_student_fee_assignment
ON fees(student_id, fee_item_id, session_id, term_id)
WHERE is_active = true;


-- =====================================================
-- STEP 8: Migration Complete Message
-- =====================================================

DO $$ 
BEGIN
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '✅ MIGRATION COMPLETE: Fee Itemization System';
    RAISE NOTICE '✅ ========================================';
    RAISE NOTICE '';
    RAISE NOTICE '📋 Tables Modified:';
    RAISE NOTICE '   ✓ fee_structure (now stores fee items master list)';
    RAISE NOTICE '   ✓ fees (now stores student-specific fee assignments)';
    RAISE NOTICE '';
    RAISE NOTICE '🔧 New Features:';
    RAISE NOTICE '   ✓ Itemized fee structure (Tuition + Additional Items)';
    RAISE NOTICE '   ✓ Discount applies ONLY to Tuition';
    RAISE NOTICE '   ✓ Auto-calculation triggers';
    RAISE NOTICE '   ✓ Helper views and functions';
    RAISE NOTICE '   ✓ Uses session_id/term_id (UUID) from academic_sessions/academic_terms';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️  Old student_type column is now nullable (backward compatible)';
    RAISE NOTICE '';
    RAISE NOTICE '✅ READY TO USE! Go to Director Dashboard → Finance → Fee Items';
    RAISE NOTICE '✅ ========================================';
END $$;