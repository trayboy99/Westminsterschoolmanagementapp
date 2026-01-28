# Test "Other Resources" Upload - Quick Guide

## 🚀 Quick Test (2 minutes)

### Step 1: Run SQL (30 seconds)
Copy and paste this into your Supabase SQL Editor:

```sql
-- Fix the database constraint
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_type_check;
ALTER TABLE uploads DROP CONSTRAINT IF EXISTS uploads_resource_type_check;
ALTER TABLE uploads ADD CONSTRAINT uploads_type_check 
CHECK (type IN ('enote', 'e-notes', 'exam_question', 'assignment', 'other_resources'));
```

Click **RUN** → You should see "Success. No rows returned"

---

### Step 2: Test Upload (1 minute)

1. **Login as Teacher** (or Principal)

2. **Go to Upload Management** → Click **"Upload Files"**

3. **Fill the form:**
   - Title: `Study Guide for Mathematics`
   - Class: Select any class
   - Subject: Select any subject
   - **Upload Type: Other Resources** ← This was causing the error
   - Session: 2024/2025
   - Term: First Term
   - **Notice:** Week field should NOT appear ✅

4. **Upload a file** (any PDF)

5. **Click "Upload Files"**

6. **Result:** Should say "Upload successful!" with no errors ✅

---

### Step 3: Test Assignment Upload (30 seconds)

1. Click **"Upload Files"** again

2. **Fill the form:**
   - Title: `Chapter 1 Homework`
   - Class: Same class as before
   - Subject: Same subject
   - **Upload Type: Assignment** ← Should work now
   - Session: 2024/2025
   - Term: First Term
   - **Week: 3** ← Week field should APPEAR ✅

3. **Upload a file**

4. **Click "Upload Files"**

5. **Result:** Should succeed ✅

---

## ✅ Expected Results

### Before Fix:
- ❌ Selecting "Other Resources" → Error: "Invalid type"
- ❌ Cannot upload assignments
- ❌ Week field always shows or never shows

### After Fix:
- ✅ "Other Resources" uploads successfully
- ✅ "Assignment" uploads successfully
- ✅ Week field appears ONLY for E-Notes and Assignments
- ✅ Week field hidden for Exam Questions and Other Resources

---

## 🐛 If Still Getting Errors

### Error: "Invalid type"
**Solution:** Make sure you ran the SQL from Step 1

### Error: "Week required"
**Check:** 
- E-Notes → Week field should be visible and required
- Assignment → Week field should be visible and required
- Exam Questions → Week field should be hidden
- Other Resources → Week field should be hidden

### Error: Database constraint violation
**Run this:**
```sql
-- Check current constraint
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'uploads'::regclass;

-- Should show: CHECK (type IN ('enote', 'e-notes', 'exam_question', 'assignment', 'other_resources'))
```

---

## 📊 Verify in Database

```sql
-- Check what types are in the database
SELECT 
    type,
    title,
    week,
    created_at
FROM uploads
ORDER BY created_at DESC
LIMIT 10;

-- Should see:
-- type = 'other_resources' for Other Resources uploads
-- type = 'assignment' for Assignment uploads
-- week = number for enote and assignment
-- week = null for exam_question and other_resources
```

---

## 🎯 Student View Test

1. **Login as Student**

2. **Go to Student Notes**

3. **Select the subject you uploaded to**

4. **Should see folders:**
   - 📄 Exam Questions
   - 📁 E-Notes (with Week 1, Week 2, etc.)
   - 📁 Assignments (with Week 1, Week 2, etc.)
   - 📄 Other Resources

5. **Click "Other Resources"**
   - Should see: "Study Guide for Mathematics" ✅

6. **Click "Assignments" → Week 3**
   - Should see: "Chapter 1 Homework" ✅

---

## 📝 Summary

**What Was Fixed:**
1. ✅ Backend now accepts "other-resources" / "other_resources" type
2. ✅ Backend now accepts "assignment" type
3. ✅ Week field conditional logic fixed
4. ✅ Database stores week for assignments
5. ✅ Student folder structure updated for assignments (by week)
6. ✅ Student folder structure updated for other resources (flat)

**Upload Types Now Working:**
| Type | Week Required | Folder Structure |
|------|--------------|------------------|
| E-Notes | ✅ Yes | By Week |
| Exam Questions | ❌ No | Flat List |
| Assignment | ✅ Yes | By Week |
| Other Resources | ❌ No | Flat List |

---

**Status: READY TO TEST!** 🎉

Try uploading an "Other Resources" file now - it should work!
