-- =====================================================
-- PIN 3-USES FEATURE: Database Migration
-- =====================================================
-- This migration adds usage tracking to the pins table
-- to allow 3 uses per PIN before deactivation
-- =====================================================

-- Add usage_count column to track how many times a PIN has been used
ALTER TABLE pins 
ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;

-- Add last_used_at column to track when the PIN was last used
ALTER TABLE pins 
ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- Update existing pins to have usage_count = 0
UPDATE pins 
SET usage_count = 0 
WHERE usage_count IS NULL;

-- For inactive pins, set usage_count to 3 (already used/exhausted)
-- This ensures old inactive pins don't get reused
UPDATE pins 
SET usage_count = 3 
WHERE active = false AND usage_count = 0;

-- Add comments for documentation
COMMENT ON COLUMN pins.usage_count IS 'Number of times this PIN has been used (max 3)';
COMMENT ON COLUMN pins.last_used_at IS 'Timestamp of the last time this PIN was used';

-- Create index on usage_count for faster queries
CREATE INDEX IF NOT EXISTS idx_pins_usage_count ON pins(usage_count);

-- =====================================================
-- Verification Queries
-- =====================================================

-- Check the new columns
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'pins' 
  AND column_name IN ('usage_count', 'last_used_at')
ORDER BY ordinal_position;

-- Check data distribution
SELECT 
  active,
  usage_count,
  COUNT(*) as count
FROM pins
GROUP BY active, usage_count
ORDER BY active DESC, usage_count;

-- Sample data
SELECT 
  pin_code,
  active,
  usage_count,
  last_used_at,
  expires_at,
  created_at
FROM pins
ORDER BY created_at DESC
LIMIT 10;

-- =====================================================
-- Success Message
-- =====================================================
SELECT '✅ Migration complete! PINs can now be used 3 times before expiring.' as status;
