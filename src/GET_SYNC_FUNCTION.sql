-- ========================================
-- Get the FULL definition of sync_payment_columns function
-- ========================================

SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'sync_payment_columns';
