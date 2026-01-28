# Proof of Payment Feature - Complete Setup Guide

## Problem

Getting this error when creating a payment:
```
❌ [Supabase] [Finance] Error creating payment: {
  code: "PGRST204",
  message: "Could not find the 'proof_of_payment_url' column of 'payments' in the schema cache"
}
```

## Solution

The `proof_of_payment_url` column doesn't exist in the payments table yet. We need to add it.

---

## Step 1: Run the SQL Migration

### Option A: Supabase Dashboard (Recommended)
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **SQL Editor** in the left sidebar
4. Click **New Query**
5. **Copy and paste** the contents of `/ADD_PROOF_OF_PAYMENT_COLUMN.sql`
6. Click **Run** (or press Ctrl+Enter)

### Option B: Direct SQL (Quick)
Run this single command in Supabase SQL Editor:

```sql
-- Add the column
ALTER TABLE payments 
ADD COLUMN IF NOT EXISTS proof_of_payment_url TEXT;

-- Verify it worked
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'payments' 
AND column_name = 'proof_of_payment_url';
```

If you see a row returned with `proof_of_payment_url | text`, it worked! ✅

---

## Step 2: Set Up Storage Bucket

### In Supabase Dashboard:

1. Go to **Storage** in the left sidebar
2. Click **New bucket**
3. Bucket name: `payment-proofs`
4. **Public bucket**: Check this box ✅
5. Click **Create bucket**

### Set Bucket Policies:

In **Storage** → **payment-proofs** → **Policies**:

#### Policy 1: Upload Access
- **Policy name**: Allow authenticated users to upload
- **Target roles**: authenticated
- **Policy definition**: 
```sql
bucket_id = 'payment-proofs'
```
- **Allowed operations**: INSERT

#### Policy 2: View Access
- **Policy name**: Allow authenticated users to view
- **Target roles**: authenticated  
- **Policy definition**:
```sql
bucket_id = 'payment-proofs'
```
- **Allowed operations**: SELECT

#### Policy 3: Delete Access (Finance Admin Only)
- **Policy name**: Finance staff can delete
- **Target roles**: authenticated
- **Policy definition**:
```sql
bucket_id = 'payment-proofs' 
AND auth.uid() IN (
  SELECT id FROM profiles 
  WHERE role IN ('finance_admin', 'director')
)
```
- **Allowed operations**: DELETE

---

## Step 3: Verify Everything Works

### Test 1: Check Database Column
Run this query in SQL Editor:
```sql
SELECT id, student_id, amount_paid, proof_of_payment_url 
FROM payments 
LIMIT 5;
```

You should see the `proof_of_payment_url` column (probably with NULL values).

### Test 2: Check Storage Bucket
1. Go to **Storage** → **payment-proofs**
2. Try uploading a test image manually
3. If upload succeeds, storage is configured correctly ✅

### Test 3: Test Payment Entry Form
1. Log in as Finance Admin
2. Go to Finance → Payment Entry
3. Fill in payment details
4. Click the **Proof of Payment** file input
5. Upload a PNG or JPEG image
6. Submit the form
7. Check if payment saves successfully ✅

---

## What This Feature Does

### Frontend (Already Implemented)
- ✅ File input field in Payment Entry Form
- ✅ Validates PNG/JPEG files only
- ✅ Max file size: 5MB
- ✅ Uploads to Supabase Storage
- ✅ Saves public URL to database
- ✅ Shows upload progress
- ✅ Optional field (not required)

### Backend (Already Implemented)
- ✅ Accepts `proof_of_payment_url` in POST /finance/payments
- ✅ Stores URL in database
- ✅ Returns payment data with proof URL

### Storage
- ✅ Public bucket for easy access
- ✅ Files named: `payment_proof_{payment_id}_{timestamp}.{ext}`
- ✅ Images accessible via public URL
- ✅ Authenticated users can upload
- ✅ Finance staff can delete

---

## After Setup Complete

Once you've completed the steps above:

1. **Refresh your browser** (hard refresh: Ctrl+Shift+R or Cmd+Shift+R)
2. **Test creating a payment** with a proof of payment image
3. **Check the console** for upload logs

### Expected Flow:
```
[PaymentForm] Proof file selected: receipt.png image/png 245632
[PaymentForm] ✅ SUCCESS - Showing toast
[PaymentForm] Uploading proof of payment...
[PaymentForm] Upload successful: { path: "payment_proof_123_1699999999.png" }
[PaymentForm] Public URL: https://...supabase.co/storage/v1/object/public/payment-proofs/...
[PaymentForm] Proof URL updated successfully
✅ Payment entry created successfully
```

Then automatically redirects to **Overview** tab! 🎉

---

## Features Summary

### Payment Entry Form Now Includes:

1. **Proof of Payment Upload** (Optional)
   - PNG or JPEG only
   - Max 5MB file size
   - Shows selected filename
   - Upload progress indicator

2. **Automatic Redirect** After Success
   - Saves payment → Shows success toast → Redirects to Overview tab
   - Refreshes finance statistics automatically

3. **Better User Experience**
   - Can see upload status
   - Clear validation messages
   - File size and type restrictions shown
   - Optional field (won't block payment submission)

---

## Troubleshooting

### Issue: Storage bucket creation fails
**Solution**: You may need to create it manually in the Supabase Dashboard Storage section.

### Issue: Upload fails with 403 error
**Solution**: Check storage policies. Make sure authenticated users can INSERT to the bucket.

### Issue: Can't see uploaded images
**Solution**: 
1. Verify bucket is **public** ✅
2. Check SELECT policy exists
3. Try accessing the URL directly in browser

### Issue: Column still not found after migration
**Solution**: 
1. Check if SQL ran successfully (no errors)
2. Refresh the Supabase schema cache: Go to API settings → click "Reload schema"
3. Wait 30 seconds and try again

---

## File Structure

```
Payment Entry Form
├── Student Selection
├── Academic Year/Term
├── Amount & Date
├── Payment Method & Receipt
├── 🆕 Proof of Payment Upload (PNG/JPEG)
├── Notes
└── Save Button
    ↓
    Saves to DB with proof_of_payment_url
    ↓
    Uploads file to Storage
    ↓
    Updates payment record with URL
    ↓
    Shows success toast
    ↓
    Redirects to Overview tab ✅
```

---

## Quick Test Commands

### Check if column exists:
```sql
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'proof_of_payment_url';
```

### Add column if missing:
```sql
ALTER TABLE payments ADD COLUMN IF NOT EXISTS proof_of_payment_url TEXT;
```

### View recent payments with proof:
```sql
SELECT id, student_id, amount_paid, proof_of_payment_url, created_at 
FROM payments 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## Success Criteria

✅ SQL migration runs without errors  
✅ `proof_of_payment_url` column exists in payments table  
✅ `payment-proofs` storage bucket created  
✅ Storage policies configured  
✅ Can upload PNG/JPEG files from Payment Entry Form  
✅ File uploads successfully to Storage  
✅ Payment saves with proof URL  
✅ After payment success, redirects to Overview tab  
✅ Finance statistics refresh automatically  

---

## Summary

This feature allows Finance Admins to optionally attach proof of payment (receipt images) when entering payments manually. The images are stored in Supabase Storage and linked to payment records. After successful payment entry, the system automatically redirects to the Overview tab for a better user experience.

**Total Setup Time**: 2-3 minutes  
**Complexity**: Low (just add a column and bucket)  
**Impact**: High (better record keeping and UX)
