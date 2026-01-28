# Student Sessions Diagnostic Guide

## Issue
Student sees: **"No academic sessions have been set up yet"**

## What This Means
The backend is returning an empty `organized` object, meaning **NO valid uploads exist for the student's class**.

## Updated Backend Logs
The backend now provides detailed diagnostic logs. Check the browser console for:

### ✅ If Uploads Exist:
```
[Browse Uploads] BEFORE filtering: 45 uploads
[Browse Uploads] User: student, Class: abc-123-class-id
[Browse Uploads] AFTER filtering: 42 valid uploads
[Browse Uploads] Sample valid upload: {session: "2025/2026", term: "First Term", ...}
[Browse Uploads] 📅 Sessions extracted from valid uploads: ["2025/2026", "2024/2025"]
```

### ❌ If NO Uploads (Empty Result):
```
[Browse Uploads] BEFORE filtering: 0 uploads
[Browse Uploads] User: student, Class: abc-123-class-id
[Browse Uploads] ❌ NO VALID UPLOADS FOUND!
[Browse Uploads] Student's class_id: abc-123-class-id
[Browse Uploads] Check if:
  1. Uploads exist for this class in database
  2. All uploads have valid session format (YYYY/YYYY)
[Browse Uploads] ⚠️  WARNING: No sessions found in organized structure!
[Browse Uploads] This means NO valid uploads exist for this student's class.
[Browse Uploads] Possible reasons:
  - No uploads have been created for class_id: abc-123-class-id
  - All uploads for this class have corrupted sessions
  - Student is not assigned to a class (class_id is null)
```

### ⚠️  If Uploads Filtered Out (Had Data, But All Invalid):
```
[Browse Uploads] BEFORE filtering: 15 uploads
[Browse Uploads] User: student, Class: abc-123-class-id
[Browse Uploads] ⚠️  FILTERED OUT: upload 1 with bad session: "{"access_token":"eyJ..."}"
[Browse Uploads] ⚠️  FILTERED OUT: upload 2 with bad session: "null"
[Browse Uploads] ⚠️  FILTERED OUT: upload 3 with bad session: "undefined"
... (more filtered uploads)
[Browse Uploads] AFTER filtering: 0 valid uploads
[Browse Uploads] ❌ NO VALID UPLOADS FOUND!
```

## Troubleshooting Steps

### Step 1: Check Student's Class Assignment
```sql
-- Check if student has a class assigned
SELECT id, first_name, last_name, class_id, role
FROM profiles
WHERE role = 'student'
AND email = 'student@example.com';  -- Replace with actual student email
```

**Expected Result:**
- `class_id` should NOT be NULL
- Should show a valid UUID like `abc-123-class-id`

**If class_id is NULL:**
- Student is not assigned to any class
- Admin needs to assign student to a class in Students Manager

### Step 2: Check if Uploads Exist for This Class
```sql
-- Check uploads for the student's class
SELECT 
  id,
  session,
  term,
  type,
  class_id,
  subject_id,
  created_at
FROM uploads
WHERE class_id = 'abc-123-class-id'  -- Replace with actual class_id from Step 1
ORDER BY created_at DESC
LIMIT 10;
```

**Expected Result:**
- Should show uploads with `session` like `"2025/2026"`, `"2024/2025"`
- `class_id` should match the student's class

**If NO rows returned:**
- No uploads have been created for this class yet
- Teachers/Admin need to upload materials for this class

**If rows exist but session looks wrong:**
```
session: "{"access_token":"eyJhbGciOiJI..."}"  ❌ CORRUPTED!
session: "null"  ❌ CORRUPTED!
session: "undefined"  ❌ CORRUPTED!
```
These are corrupted and will be filtered out. Clean them up (see Step 4).

### Step 3: Check Upload Settings (Academic Calendar)
```sql
-- Check if academic sessions are configured
SELECT * FROM academic_calendar
ORDER BY created_at DESC;
```

**Expected Result:**
- Should have sessions like "2025/2026", "2024/2025"

**If empty:**
- Admin needs to create academic sessions in Settings

### Step 4: Clean Up Corrupted Sessions (If Found)
If Step 2 showed corrupted sessions, run this:

```sql
-- Find all corrupted uploads
SELECT id, session, class_id, term
FROM uploads
WHERE session !~ '^[0-9]{4}/[0-9]{4}$'  -- Regex: NOT matching YYYY/YYYY
OR session IS NULL;
```

**To fix corrupted uploads:**

Option A: **Delete them** (if they're garbage data)
```sql
DELETE FROM uploads
WHERE session !~ '^[0-9]{4}/[0-9]{4}$'
OR session IS NULL;
```

Option B: **Update them** (if they're real uploads with bad session values)
```sql
-- Update corrupted uploads to current session
UPDATE uploads
SET session = '2025/2026'  -- Use the current academic session
WHERE session !~ '^[0-9]{4}/[0-9]{4}$'
OR session IS NULL;
```

### Step 5: Verify Student Can See Uploads

After fixing (if needed), test again:

1. **Login as student**
2. **Click "Notes" in sidebar**
3. **Open browser console** (F12)
4. **Look for logs**:
   ```
   [Browse Uploads] AFTER filtering: X valid uploads
   [Browse Uploads] 📅 Sessions extracted from valid uploads: ["2025/2026"]
   [StudentFileExplorer] ✅ Loaded folder structure
   [StudentFileExplorer] Sessions: ["2025/2026"]
   ```
5. **See session folders** on screen

## Quick Test: Create a Test Upload

To quickly test if the system works, create a test upload:

```sql
-- Create a test upload for the student's class
INSERT INTO uploads (
  id,
  session,
  term,
  class_id,
  subject_id,
  type,
  file_url,
  file_type,
  file_size,
  teacher_id,
  created_at
)
VALUES (
  gen_random_uuid(),
  '2025/2026',  -- Valid session format
  'First Term',
  'abc-123-class-id',  -- Replace with student's class_id
  (SELECT id FROM subjects LIMIT 1),  -- Any subject
  'resource',
  'https://example.com/test.pdf',
  'pdf',
  1024,
  (SELECT id FROM profiles WHERE role = 'teacher' LIMIT 1),  -- Any teacher
  NOW()
);
```

After running this, refresh the student's Notes page. You should see "2025/2026" folder appear!

## Summary Checklist

- [ ] Student has `class_id` assigned (not NULL)
- [ ] Uploads exist for that `class_id` in database
- [ ] Upload sessions are in valid format: `YYYY/YYYY`
- [ ] Academic calendar has sessions configured
- [ ] Student can see session folders in Notes

## Most Common Issues

1. **Student not assigned to class** → Admin assigns in Students Manager
2. **No uploads for that class** → Teacher/Admin uploads materials
3. **Corrupted session data** → Clean up database (Step 4)
4. **Wrong class filter** → Check upload `class_id` matches student's class

---

**Date:** January 2025  
**Status:** Backend logging enhanced for better diagnostics
