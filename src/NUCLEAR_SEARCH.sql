-- ========================================
-- NUCLEAR OPTION: Find EVERYTHING
-- ========================================

-- 1. Check if student_fee_items table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE '%fee%'
ORDER BY table_name;

-- 2. Check all columns in payments table
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'payments'
AND table_schema = 'public'
ORDER BY ordinal_position;

-- 3. Search EVERY database object for required_amount
-- Including table defaults, check constraints, etc.
SELECT 
    'TABLE DEFAULT' as type,
    table_name,
    column_name,
    column_default as definition
FROM information_schema.columns
WHERE column_default ILIKE '%required_amount%'
AND table_schema = 'public'

UNION ALL

SELECT 
    'CHECK CONSTRAINT' as type,
    tc.table_name,
    cc.check_clause as column_name,
    cc.check_clause as definition
FROM information_schema.check_constraints cc
JOIN information_schema.table_constraints tc 
    ON cc.constraint_name = tc.constraint_name
WHERE cc.check_clause ILIKE '%required_amount%'

UNION ALL

SELECT 
    'FUNCTION' as type,
    routine_name as table_name,
    routine_type as column_name,
    LEFT(routine_definition, 200) as definition
FROM information_schema.routines
WHERE routine_definition ILIKE '%required_amount%'
AND routine_schema = 'public'

UNION ALL

SELECT 
    'VIEW' as type,
    table_name,
    'VIEW' as column_name,
    LEFT(view_definition, 200) as definition
FROM information_schema.views
WHERE view_definition ILIKE '%required_amount%'
AND table_schema = 'public'

UNION ALL

SELECT 
    'TRIGGER' as type,
    event_object_table as table_name,
    trigger_name as column_name,
    action_statement as definition
FROM information_schema.triggers
WHERE action_statement ILIKE '%required_amount%'
AND trigger_schema = 'public';

-- 4. Show all triggers on payments table
SELECT 
    trigger_name,
    action_timing,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE event_object_table = 'payments'
ORDER BY action_timing, trigger_name;
