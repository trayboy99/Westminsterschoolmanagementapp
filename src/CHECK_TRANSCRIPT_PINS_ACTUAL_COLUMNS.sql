-- ============================================================
-- CHECK ACTUAL COLUMNS IN transcript_pins TABLE
-- ============================================================
-- Run this first to see what columns exist

SELECT 
    column_name,
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
ORDER BY ordinal_position;

-- Also show a sample row
SELECT * FROM transcript_pins LIMIT 1;
