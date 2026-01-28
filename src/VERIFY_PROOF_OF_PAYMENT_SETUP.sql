-- ============================================
-- VERIFY PROOF OF PAYMENT SETUP
-- Run this to check if everything is ready
-- ============================================

-- Test 1: Check if column exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'payments' 
    AND column_name = 'proof_of_payment_url'
  ) THEN
    RAISE NOTICE '✅ TEST 1 PASSED: proof_of_payment_url column EXISTS';
  ELSE
    RAISE EXCEPTION '❌ TEST 1 FAILED: proof_of_payment_url column MISSING';
  END IF;
END $$;

-- Test 2: Check if storage bucket exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 
    FROM storage.buckets 
    WHERE name = 'payment-proofs'
  ) THEN
    RAISE NOTICE '✅ TEST 2 PASSED: payment-proofs bucket EXISTS';
  ELSE
    RAISE WARNING '⚠️ TEST 2 FAILED: payment-proofs bucket MISSING - Create it in Dashboard → Storage';
  END IF;
END $$;

-- Test 3: Check if bucket is public
DO $$
DECLARE
  is_public BOOLEAN;
BEGIN
  SELECT public INTO is_public
  FROM storage.buckets 
  WHERE name = 'payment-proofs';
  
  IF is_public IS NULL THEN
    RAISE WARNING '⚠️ TEST 3 SKIPPED: Bucket does not exist';
  ELSIF is_public = true THEN
    RAISE NOTICE '✅ TEST 3 PASSED: Bucket is PUBLIC';
  ELSE
    RAISE WARNING '⚠️ TEST 3 FAILED: Bucket is PRIVATE - Should be public for easy access';
  END IF;
END $$;

-- Test 4: Show sample data structure
SELECT 
  '✅ TEST 4: Sample query structure' as test_name,
  id,
  student_id,
  amount_paid,
  proof_of_payment_url,
  approval_status,
  created_at
FROM payments
LIMIT 1;

-- Test 5: Count payments with proof
SELECT 
  '✅ TEST 5: Payments with proof count' as test_name,
  COUNT(*) FILTER (WHERE proof_of_payment_url IS NOT NULL) as with_proof,
  COUNT(*) FILTER (WHERE proof_of_payment_url IS NULL) as without_proof,
  COUNT(*) as total
FROM payments;

-- ============================================
-- FINAL SUMMARY
-- ============================================

SELECT 
  '
  ============================================
  VERIFICATION SUMMARY
  ============================================
  
  Check the NOTICES above:
  
  ✅ = PASSED (ready to use)
  ⚠️ = WARNING (needs attention)
  ❌ = FAILED (must fix)
  
  REQUIRED FOR PROOF OF PAYMENT TO WORK:
  
  1. ✅ proof_of_payment_url column in payments table
  2. ✅ payment-proofs storage bucket exists
  3. ✅ Bucket is PUBLIC (recommended)
  
  IF ANY TEST FAILED:
  → Run /CREATE_PAYMENT_PROOFS_BUCKET.sql
  → Or create bucket manually in Dashboard
  
  NEXT STEPS:
  1. Fix any failed tests
  2. Test payment entry with proof upload
  3. Check browser console for logs
  4. Verify URL is saved in database
  
  ============================================
  ' as summary;
