-- ============================================
-- CHECK PROOF OF PAYMENT SETUP
-- Run this to verify everything is configured
-- ============================================

-- Step 1: Check if proof_of_payment_url column exists
SELECT 
  'Column Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM information_schema.columns 
      WHERE table_name = 'payments' 
      AND column_name = 'proof_of_payment_url'
    ) THEN '✅ proof_of_payment_url column EXISTS'
    ELSE '❌ proof_of_payment_url column MISSING - Run ADD_PROOF_OF_PAYMENT_COLUMN.sql'
  END as status;

-- Step 2: Check if storage bucket exists
SELECT 
  'Storage Bucket Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM storage.buckets 
      WHERE name = 'payment-proofs'
    ) THEN '✅ payment-proofs bucket EXISTS'
    ELSE '❌ payment-proofs bucket MISSING - Create in Dashboard → Storage'
  END as status;

-- Step 3: Check if bucket is public
SELECT 
  'Bucket Public Check' as check_type,
  CASE 
    WHEN EXISTS (
      SELECT 1 
      FROM storage.buckets 
      WHERE name = 'payment-proofs' 
      AND public = true
    ) THEN '✅ payment-proofs bucket is PUBLIC'
    WHEN EXISTS (
      SELECT 1 
      FROM storage.buckets 
      WHERE name = 'payment-proofs' 
      AND public = false
    ) THEN '⚠️ payment-proofs bucket is PRIVATE - Make it public'
    ELSE '❌ payment-proofs bucket NOT FOUND'
  END as status;

-- Step 4: Show bucket details (if exists)
SELECT 
  'Bucket Details' as info_type,
  id,
  name,
  public,
  file_size_limit,
  created_at
FROM storage.buckets
WHERE name = 'payment-proofs';

-- Step 5: Check for any payments with proof already uploaded
SELECT 
  'Payments with Proof' as check_type,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Found payments with proof attachments'
    ELSE '⚠️ No payments with proof yet (upload a test payment)'
  END as status
FROM payments
WHERE proof_of_payment_url IS NOT NULL;

-- Step 6: Show recent payments with proof status
SELECT 
  'Recent Payments' as info_type,
  id,
  student_id,
  amount_paid,
  payment_date,
  CASE 
    WHEN proof_of_payment_url IS NOT NULL THEN '✅ Has Proof'
    ELSE '❌ No Proof'
  END as proof_status,
  LEFT(proof_of_payment_url, 50) as proof_url_preview,
  created_at
FROM payments
ORDER BY created_at DESC
LIMIT 10;

-- Step 7: Count total files in storage bucket (if accessible)
-- Note: This may not work depending on RLS policies
SELECT 
  'Storage Files Count' as check_type,
  COUNT(*) as file_count,
  CASE 
    WHEN COUNT(*) > 0 THEN CONCAT('✅ ', COUNT(*), ' files uploaded')
    ELSE '⚠️ No files uploaded yet'
  END as status
FROM storage.objects
WHERE bucket_id = 'payment-proofs';

-- ============================================
-- SUMMARY & NEXT STEPS
-- ============================================

SELECT 
  'SETUP SUMMARY' as summary,
  '
  ✅ = Ready to use
  ⚠️ = Warning (may still work)
  ❌ = Action required
  
  REQUIRED STEPS:
  1. Column: proof_of_payment_url must exist in payments table
  2. Bucket: payment-proofs must exist in storage
  3. Access: Bucket should be PUBLIC for easy viewing
  
  IF BUCKET IS MISSING:
  → Go to Supabase Dashboard
  → Click Storage
  → Click New Bucket
  → Name: payment-proofs
  → Public: ✅ YES
  → Create
  
  IF COLUMN IS MISSING:
  → Run: ALTER TABLE payments ADD COLUMN proof_of_payment_url TEXT;
  
  TEST THE FEATURE:
  1. Go to Finance → Payment Entry
  2. Fill in payment details
  3. Upload a PNG/JPEG image
  4. Save payment
  5. Check browser console (F12) for logs
  6. Verify proof_of_payment_url is NOT NULL
  ' as instructions;
