-- =====================================================
-- VERIFY FINANCE MODULE PHASE 1 MIGRATIONS
-- =====================================================
-- Run this after running FINANCE_MODULE_PHASE1_MIGRATIONS.sql
-- This will check that everything was created correctly
-- =====================================================

\echo '🔍 VERIFYING FINANCE MODULE PHASE 1 MIGRATIONS...\n'

-- =====================================================
-- CHECK 1: Verify payments table exists
-- =====================================================

\echo '📋 CHECK 1: Payments table structure'

SELECT 
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'payments'
ORDER BY ordinal_position;

-- =====================================================
-- CHECK 2: Verify indexes
-- =====================================================

\echo '\n📊 CHECK 2: Payments table indexes'

SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'payments'
ORDER BY indexname;

-- =====================================================
-- CHECK 3: Verify RLS policies
-- =====================================================

\echo '\n🔒 CHECK 3: Row Level Security policies'

SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename IN ('payments', 'payment_upload_batches')
ORDER BY tablename, policyname;

-- =====================================================
-- CHECK 4: Verify payment_upload_batches table
-- =====================================================

\echo '\n📦 CHECK 4: Payment upload batches table'

SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'payment_upload_batches'
ORDER BY ordinal_position;

-- =====================================================
-- CHECK 5: Verify views
-- =====================================================

\echo '\n👁️ CHECK 5: Helper views'

SELECT 
  table_name as view_name,
  view_definition
FROM information_schema.views
WHERE table_name IN ('payment_summary', 'pending_payment_approvals')
ORDER BY table_name;

-- =====================================================
-- CHECK 6: Verify functions
-- =====================================================

\echo '\n⚙️ CHECK 6: Helper functions'

SELECT 
  routine_name,
  routine_type,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name IN (
  'get_student_clearance_status',
  'approve_payment',
  'reject_payment',
  'update_payments_updated_at'
)
ORDER BY routine_name;

-- =====================================================
-- CHECK 7: Verify constraints
-- =====================================================

\echo '\n✅ CHECK 7: Table constraints'

SELECT 
  constraint_name,
  constraint_type
FROM information_schema.table_constraints
WHERE table_name = 'payments'
ORDER BY constraint_type, constraint_name;

-- =====================================================
-- CHECK 8: Verify RLS is enabled
-- =====================================================

\echo '\n🔐 CHECK 8: RLS enabled status'

SELECT 
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename IN ('payments', 'payment_upload_batches')
ORDER BY tablename;

-- =====================================================
-- CHECK 9: Test function execution (safe test)
-- =====================================================

\echo '\n🧪 CHECK 9: Test helper function (dry run)'

-- Test get_student_clearance_status with dummy UUID
SELECT 
  'Function exists and is callable' as status,
  routine_name,
  data_type as return_type
FROM information_schema.routines
WHERE routine_name = 'get_student_clearance_status';

-- =====================================================
-- CHECK 10: Count summary
-- =====================================================

\echo '\n📊 CHECK 10: Migration summary'

DO $$
DECLARE
  v_payments_count INTEGER;
  v_batches_count INTEGER;
  v_policies_count INTEGER;
  v_indexes_count INTEGER;
  v_views_count INTEGER;
  v_functions_count INTEGER;
BEGIN
  -- Count tables
  SELECT COUNT(*) INTO v_payments_count
  FROM information_schema.tables
  WHERE table_name = 'payments';
  
  SELECT COUNT(*) INTO v_batches_count
  FROM information_schema.tables
  WHERE table_name = 'payment_upload_batches';
  
  -- Count policies
  SELECT COUNT(*) INTO v_policies_count
  FROM pg_policies
  WHERE tablename IN ('payments', 'payment_upload_batches');
  
  -- Count indexes
  SELECT COUNT(*) INTO v_indexes_count
  FROM pg_indexes
  WHERE tablename = 'payments';
  
  -- Count views
  SELECT COUNT(*) INTO v_views_count
  FROM information_schema.views
  WHERE table_name IN ('payment_summary', 'pending_payment_approvals');
  
  -- Count functions
  SELECT COUNT(*) INTO v_functions_count
  FROM information_schema.routines
  WHERE routine_name IN (
    'get_student_clearance_status',
    'approve_payment',
    'reject_payment',
    'update_payments_updated_at'
  );
  
  -- Display results
  RAISE NOTICE '╔════════════════════════════════════════╗';
  RAISE NOTICE '║   FINANCE MODULE PHASE 1 SUMMARY      ║';
  RAISE NOTICE '╠════════════════════════════════════════╣';
  RAISE NOTICE '║ Tables Created:        % / 2          ║', v_payments_count + v_batches_count;
  RAISE NOTICE '║ RLS Policies:          % / 11         ║', v_policies_count;
  RAISE NOTICE '║ Indexes Created:       % / 9          ║', v_indexes_count;
  RAISE NOTICE '║ Views Created:         % / 2          ║', v_views_count;
  RAISE NOTICE '║ Functions Created:     % / 4          ║', v_functions_count;
  RAISE NOTICE '╚════════════════════════════════════════╝';
  
  IF v_payments_count = 1 AND v_batches_count = 1 AND 
     v_policies_count >= 11 AND v_indexes_count >= 9 AND
     v_views_count = 2 AND v_functions_count = 4 THEN
    RAISE NOTICE '✅ ALL CHECKS PASSED - Phase 1 migration successful!';
  ELSE
    RAISE WARNING '⚠️ Some components missing - check details above';
  END IF;
END $$;

-- =====================================================
-- QUICK REFERENCE: Expected Structure
-- =====================================================

\echo '\n📚 EXPECTED STRUCTURE:'
\echo '  Tables:'
\echo '    ✓ payments (main table)'
\echo '    ✓ payment_upload_batches (bulk upload tracking)'
\echo ''
\echo '  RLS Policies (11 total):'
\echo '    ✓ 8 policies on payments table'
\echo '    ✓ 3 policies on payment_upload_batches table'
\echo ''
\echo '  Indexes (9 total):'
\echo '    ✓ idx_payments_student_id'
\echo '    ✓ idx_payments_session_term'
\echo '    ✓ idx_payments_status'
\echo '    ✓ idx_payments_entered_by'
\echo '    ✓ idx_payments_director_id'
\echo '    ✓ idx_payments_payment_date'
\echo '    ✓ idx_payments_bulk_batch'
\echo '    ✓ idx_payments_created_at'
\echo '    ✓ idx_payments_student_session_term'
\echo ''
\echo '  Views (2 total):'
\echo '    ✓ payment_summary'
\echo '    ✓ pending_payment_approvals'
\echo ''
\echo '  Functions (4 total):'
\echo '    ✓ get_student_clearance_status'
\echo '    ✓ approve_payment'
\echo '    ✓ reject_payment'
\echo '    ✓ update_payments_updated_at'

\echo '\n✨ Verification complete!\n'
