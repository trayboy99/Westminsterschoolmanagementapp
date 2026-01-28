-- ============================================
-- CREATE PAYMENT PROOFS STORAGE BUCKET
-- ============================================
-- Run this ONCE to create the storage bucket for payment proof images

-- Create the bucket (public for easy access)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'payment-proofs', 
  'payment-proofs', 
  true,  -- PUBLIC bucket
  5242880,  -- 5MB max file size
  ARRAY['image/png', 'image/jpeg', 'image/jpg']  -- Only allow PNG and JPEG
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 5242880,
  allowed_mime_types = ARRAY['image/png', 'image/jpeg', 'image/jpg'];

-- Verify bucket was created
SELECT 
  '✅ Bucket created successfully!' as status,
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types,
  created_at
FROM storage.buckets
WHERE name = 'payment-proofs';

-- Show success message
SELECT 
  'SETUP COMPLETE' as result,
  '
  ✅ Storage bucket "payment-proofs" is ready!
  ✅ Bucket is PUBLIC (images can be viewed via URL)
  ✅ Max file size: 5MB
  ✅ Allowed types: PNG, JPEG
  
  NEXT STEPS:
  1. Go to Finance Dashboard → Payment Entry
  2. Create a new payment
  3. Upload a proof of payment image
  4. Check that it saves successfully
  5. Verify the image URL is saved in the database
  
  TO VIEW UPLOADED FILES:
  → Supabase Dashboard → Storage → payment-proofs
  
  TO TEST:
  → Run CHECK_PROOF_OF_PAYMENT_SETUP.sql to verify everything works
  ' as instructions;
