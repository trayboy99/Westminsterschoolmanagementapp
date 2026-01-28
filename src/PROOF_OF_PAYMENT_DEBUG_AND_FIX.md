# Proof of Payment - Debug & Fix Guide

## Current Problem

✅ Payment created successfully  
✅ Success message shows  
❌ Image file NOT uploaded  
❌ `proof_of_payment_url` column shows NULL  

## Root Cause

The **storage bucket `payment-proofs` doesn't exist** in your Supabase project yet!

When the code tries to upload to a non-existent bucket, it fails silently, leaving the URL as null.

---

## QUICK FIX (2 minutes)

### Step 1: Create Storage Bucket

1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **Storage** in the left sidebar
4. Click **New bucket** button
5. Fill in:
   - **Bucket name**: `payment-proofs`
   - **Public bucket**: ✅ Check this box (important!)
   - **File size limit**: 5MB (optional)
6. Click **Create bucket**

### Step 2: Test Payment Entry Again

1. Go to Finance Dashboard → Payment Entry
2. Fill in payment details
3. Upload a PNG or JPEG proof image
4. Click Save
5. **Check browser console** (F12) for logs

---

## What You Should See in Console

### ✅ SUCCESS (when bucket exists):
```
[PaymentForm] Proof file selected: receipt.png image/png 245632
[PaymentForm] ✅ SUCCESS - Showing toast
[PaymentForm] Uploading proof of payment...
[PaymentForm] Upload successful: { path: "payment_proof_123_1699999999.png" }
[PaymentForm] Public URL: https://abc.supabase.co/storage/v1/object/public/payment-proofs/...
[PaymentForm] Proof URL updated successfully
```

### ❌ ERROR (when bucket doesn't exist):
```
[PaymentForm] Proof file selected: receipt.png image/png 245632
[PaymentForm] ✅ SUCCESS - Showing toast
[PaymentForm] Uploading proof of payment...
[PaymentForm] Storage upload error: { message: "Bucket not found", statusCode: "404" }
[PaymentForm] Error uploading proof: Error: Bucket not found
⚠️ Failed to upload proof of payment. Payment still saved.
```

---

## Verify Bucket Exists

### Quick SQL Check:
```sql
SELECT name, public FROM storage.buckets WHERE name = 'payment-proofs';
```

**Expected result**: One row showing `payment-proofs | true`

If it returns **0 rows**, the bucket doesn't exist yet.

---

## Alternative: Create Bucket via SQL

If you prefer SQL over the dashboard:

```sql
-- Create the bucket
INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('payment-proofs', 'payment-proofs', true, 5242880)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
INSERT INTO storage.policies (name, bucket_id, definition)
VALUES (
  'Allow authenticated uploads to payment-proofs',
  'payment-proofs',
  '(bucket_id = ''payment-proofs''::text)'
)
ON CONFLICT (name, bucket_id) DO NOTHING;

-- Verify
SELECT * FROM storage.buckets WHERE name = 'payment-proofs';
```

---

## Check if Image Was Saved

After creating a payment with proof:

```sql
SELECT 
  id,
  student_id, 
  amount_paid,
  proof_of_payment_url,
  created_at
FROM payments
WHERE proof_of_payment_url IS NOT NULL
ORDER BY created_at DESC
LIMIT 5;
```

**Expected**: You should see URLs like:
```
https://xyz.supabase.co/storage/v1/object/public/payment-proofs/payment_proof_abc123_1699999999.png
```

---

## Common Issues & Solutions

### Issue 1: Bucket created but still getting 403 errors
**Solution**: Make sure bucket is PUBLIC
```sql
UPDATE storage.buckets 
SET public = true 
WHERE name = 'payment-proofs';
```

### Issue 2: Upload works but URL is still NULL
**Solution**: Check browser console for update errors. The second API call might be failing.

### Issue 3: File size too large
**Solution**: Images must be under 5MB. Compress the image first.

### Issue 4: Wrong file type
**Solution**: Only PNG and JPEG files are accepted.

---

## Testing Checklist

After creating the bucket:

- [ ] Bucket `payment-proofs` exists in Storage
- [ ] Bucket is **Public** ✅
- [ ] Can see the bucket in Supabase Dashboard → Storage
- [ ] Try uploading a test payment with proof image
- [ ] Check browser console for success logs
- [ ] Run SQL to verify `proof_of_payment_url` is NOT NULL
- [ ] Click the URL to view the uploaded image
- [ ] Image opens in browser successfully

---

## Expected Database Flow

1. **Payment Entry Form Submitted**
   ```
   POST /finance/payments
   → Creates payment record
   → Returns payment.id = "abc-123"
   ```

2. **File Upload Triggered** (if file selected)
   ```
   supabase.storage.from('payment-proofs').upload(...)
   → Uploads to: payment_proof_abc-123_1699999999.png
   → Returns public URL
   ```

3. **Payment Updated with URL**
   ```
   PUT /finance/payments/abc-123
   → Updates proof_of_payment_url field
   → Column now contains image URL
   ```

---

## View Uploaded Images

### In Supabase Dashboard:
1. Go to **Storage** → **payment-proofs**
2. You'll see all uploaded proof images
3. Click any image to preview

### Via SQL:
```sql
-- Get all payments with proof
SELECT 
  p.id,
  CONCAT(s.first_name, ' ', s.last_name) as student_name,
  p.amount_paid,
  p.proof_of_payment_url,
  p.created_at
FROM payments p
LEFT JOIN profiles s ON s.id = p.student_id
WHERE p.proof_of_payment_url IS NOT NULL
ORDER BY p.created_at DESC;
```

---

## Summary

**The fix is simple**: Create the `payment-proofs` storage bucket in Supabase!

1. Dashboard → Storage → New bucket
2. Name: `payment-proofs`
3. Public: ✅ YES
4. Create

Then test again. The proof of payment feature will work perfectly! 🎉

---

## Next Steps After Fix

Once the bucket is created and working:

✅ Finance Admins can attach proof images when entering payments  
✅ Images are stored securely in Supabase Storage  
✅ Public URLs are saved to the database  
✅ Director can view proof images when approving payments  
✅ Audit trail includes visual proof of payments  

**File naming convention**:
```
payment_proof_{payment_id}_{timestamp}.{extension}
```

Example: `payment_proof_a1b2c3d4_1699999999999.png`
