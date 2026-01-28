-- Run this to check if the constraint already exists

-- Check all constraints on attendance table
SELECT constraint_name, constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'attendance';

-- Check all columns in attendance table
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'attendance'
ORDER BY ordinal_position;

-- Check for any unique indexes on attendance table
SELECT 
    i.relname as index_name,
    a.attname as column_name
FROM 
    pg_class t,
    pg_class i,
    pg_index ix,
    pg_attribute a
WHERE 
    t.oid = ix.indrelid
    AND i.oid = ix.indexrelid
    AND a.attrelid = t.oid
    AND a.attnum = ANY(ix.indkey)
    AND t.relkind = 'r'
    AND t.relname = 'attendance'
    AND ix.indisunique = true;
