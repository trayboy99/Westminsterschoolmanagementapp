-- ============================================================
-- FIX TRANSCRIPT PINS - CORRECTED VERSION
-- ============================================================
-- This fixes the column issues without assuming columns exist

-- Step 1: Check what we have
DO $$ 
BEGIN
    RAISE NOTICE '=== Checking transcript_pins table ===';
END $$;

-- Show current columns
SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
ORDER BY ordinal_position;

-- Step 2: Add max_uses column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transcript_pins' 
        AND column_name = 'max_uses'
    ) THEN
        ALTER TABLE transcript_pins 
        ADD COLUMN max_uses INTEGER NOT NULL DEFAULT 3;
        RAISE NOTICE '✅ Added max_uses column (default: 3)';
    ELSE
        RAISE NOTICE 'ℹ️  max_uses column already exists';
    END IF;
END $$;

-- Step 3: Add uses_count column if missing
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transcript_pins' 
        AND column_name = 'uses_count'
    ) THEN
        ALTER TABLE transcript_pins 
        ADD COLUMN uses_count INTEGER NOT NULL DEFAULT 0;
        RAISE NOTICE '✅ Added uses_count column (default: 0)';
    ELSE
        RAISE NOTICE 'ℹ️  uses_count column already exists';
    END IF;
END $$;

-- Step 4: Initialize existing rows
UPDATE transcript_pins
SET 
    max_uses = COALESCE(max_uses, 3),
    uses_count = COALESCE(uses_count, 0)
WHERE max_uses IS NULL OR uses_count IS NULL;

-- Step 5: Add constraints (safe - drops if exists first)
DO $$
BEGIN
    -- Drop existing constraints if they exist
    ALTER TABLE transcript_pins DROP CONSTRAINT IF EXISTS transcript_pins_uses_count_check;
    ALTER TABLE transcript_pins DROP CONSTRAINT IF EXISTS transcript_pins_max_uses_check;
    ALTER TABLE transcript_pins DROP CONSTRAINT IF EXISTS transcript_pins_uses_within_max_check;
    
    -- Add new constraints
    ALTER TABLE transcript_pins
    ADD CONSTRAINT transcript_pins_uses_count_check 
    CHECK (uses_count >= 0);
    
    ALTER TABLE transcript_pins
    ADD CONSTRAINT transcript_pins_max_uses_check 
    CHECK (max_uses >= 1);
    
    ALTER TABLE transcript_pins
    ADD CONSTRAINT transcript_pins_uses_within_max_check 
    CHECK (uses_count <= max_uses);
    
    RAISE NOTICE '✅ Added check constraints';
END $$;

-- Step 6: Show final schema
SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
ORDER BY ordinal_position;

-- Step 7: Show current PIN data
SELECT 
    pin_code,
    COALESCE(uses_count, 0) as uses_count,
    COALESCE(max_uses, 3) as max_uses,
    generated_at,
    expires_at
FROM transcript_pins
ORDER BY generated_at DESC
LIMIT 10;

-- Final success message
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '╔════════════════════════════════════════════════╗';
    RAISE NOTICE '║  ✅ TRANSCRIPT PINS TABLE FIXED               ║';
    RAISE NOTICE '╚════════════════════════════════════════════════╝';
    RAISE NOTICE '';
    RAISE NOTICE 'Changes Applied:';
    RAISE NOTICE '  • max_uses column added/verified';
    RAISE NOTICE '  • uses_count column added/verified';
    RAISE NOTICE '  • All existing PINs initialized';
    RAISE NOTICE '  • Check constraints added';
    RAISE NOTICE '';
    RAISE NOTICE 'Test PIN: C7GV-GEZG-UP99';
    RAISE NOTICE 'Status: Ready for 3 uses';
    RAISE NOTICE '';
    RAISE NOTICE 'IMPORTANT: Reload your Supabase schema cache!';
    RAISE NOTICE 'Go to: Settings → API → Reload Schema';
    RAISE NOTICE '';
END $$;
