-- ========================================
-- Check the sync_payment_columns_trigger
-- ========================================

-- Get the function definition for sync_payment_columns_trigger
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname LIKE '%sync_payment%';

-- Also show what the trigger does
SELECT 
    trigger_name,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'sync_payment_columns_trigger';
