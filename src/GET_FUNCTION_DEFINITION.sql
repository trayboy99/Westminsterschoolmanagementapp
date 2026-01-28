-- ========================================
-- Get FULL definition of the problematic function
-- ========================================

-- Get the complete function definition
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'update_student_clearance_from_payments';

-- Also check what triggers use this function
SELECT 
    trigger_name,
    event_object_table,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE action_statement ILIKE '%update_student_clearance_from_payments%';
