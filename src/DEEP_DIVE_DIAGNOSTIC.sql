-- ========================================
-- DEEP DIVE: Find EVERYTHING referencing required_amount
-- ========================================

-- 1. Show FULL trigger definitions (not just names)
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    action_statement  -- This shows the actual code!
FROM information_schema.triggers 
WHERE event_object_table = 'payments';

-- 2. Find ALL functions that reference required_amount
SELECT 
    routine_name,
    routine_type,
    routine_definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%required_amount%'
AND routine_schema = 'public';

-- 3. Find ALL views that reference required_amount
SELECT 
    table_name,
    view_definition
FROM information_schema.views
WHERE view_definition ILIKE '%required_amount%'
AND table_schema = 'public';

-- 4. Check for ANY constraints on payments table
SELECT 
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'payments'::regclass;

-- 5. Check table columns again (just to be sure)
SELECT 
    column_name, 
    data_type,
    column_default,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 6. Search for EVERYTHING in the database that mentions required_amount
-- This is the nuclear option - it searches ALL code
SELECT 
    'FUNCTION' as object_type,
    routine_name as object_name,
    routine_definition as definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%required_amount%'
UNION ALL
SELECT 
    'VIEW' as object_type,
    table_name as object_name,
    view_definition as definition
FROM information_schema.views
WHERE view_definition ILIKE '%required_amount%'
UNION ALL
SELECT 
    'TRIGGER' as object_type,
    trigger_name as object_name,
    action_statement as definition
FROM information_schema.triggers
WHERE action_statement ILIKE '%required_amount%';
