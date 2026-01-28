-- ============================================
-- REMOVE AUTOMATIC DEADLINE DISABLING
-- ============================================
-- This removes any triggers, functions, or cron jobs
-- that automatically set enabled=false when deadlines expire
-- ============================================

-- Step 1: Drop the trigger if it exists
DROP TRIGGER IF EXISTS auto_disable_expired_deadlines_trigger ON upload_deadlines;

-- Step 2: Drop the function if it exists
DROP FUNCTION IF EXISTS auto_disable_expired_deadlines();

-- Step 3: Remove any pg_cron job if it exists (using DO block to handle if extension doesn't exist)
DO $$
BEGIN
    -- Only try to unschedule if pg_cron extension exists
    IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
        -- Unschedule the job if it exists
        PERFORM cron.unschedule('auto-disable-expired-upload-deadlines');
    END IF;
EXCEPTION
    WHEN OTHERS THEN
        -- Ignore errors if pg_cron doesn't exist
        NULL;
END $$;

-- Step 4: Verify removal
SELECT 
    'Automatic deadline disabling has been removed' as status,
    'The enabled column will no longer automatically change to false' as note;

-- Step 5: Optional - Check current deadlines status
SELECT 
    id,
    upload_type,
    deadline,
    enabled,
    session,
    term,
    CASE 
        WHEN deadline < NOW() THEN 'EXPIRED'
        ELSE 'ACTIVE'
    END as deadline_status
FROM upload_deadlines
ORDER BY deadline DESC;
