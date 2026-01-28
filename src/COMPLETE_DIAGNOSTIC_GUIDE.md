# 🔍 Complete Diagnostic Guide - Student Can't See Sessions

## Problem
Student sees "No academic sessions have been set up yet" even though valid uploads exist in database.

## Root Cause (Most Likely)
**CLASS ID MISMATCH** - The student's `class_id` doesn't match the `class_id` of the JSS2 uploads.

## How to Diagnose (Step by Step)

### Step 1: Check Browser Console
1. Login as student
2. Click "Notes" in sidebar  
3. Open browser console (F12)
4. Look for this section:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Browse Uploads] 🔍 BEFORE filtering: X uploads
[Browse Uploads] 👤 User: student, Class ID: abc-123-uuid-here
[Browse Uploads] 📚 Upload class IDs found: [xyz-456-uuid-here]
[Browse Uploads] 🧹 Filtered out X corrupted uploads
[Browse Uploads] ✅ AFTER filtering: X valid uploads
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

### Step 2: Interpret the Logs

#### ✅ GOOD - Working Correctly:
```
[Browse Uploads] 👤 User: student, Class ID: abc-123-uuid
[Browse Uploads] 📚 Upload class IDs found: [abc-123-uuid]  ← MATCH!
[Browse Uploads] ✅ AFTER filtering: 2 valid uploads
[Browse Uploads] 📅 Valid sessions found: ["2025/2026"]
[StudentFileExplorer] 📅 Sessions found: 1
[StudentFileExplorer] 📋 Session list: ["2025/2026"]
```

#### ❌ BAD - Class ID Mismatch:
```
[Browse Uploads] 👤 User: student, Class ID: abc-123-uuid
[Browse Uploads] 📚 Upload class IDs found: [xyz-456-uuid]  ← DIFFERENT!
[Browse Uploads] 🔍 BEFORE filtering: 0 uploads  ← NO UPLOADS!
[Browse Uploads] ❌ NO VALID UPLOADS FOUND!
[StudentFileExplorer] ❌ NO SESSIONS FOUND!
```

#### ❌ BAD - All Sessions Corrupted:
```
[Browse Uploads] 🔍 BEFORE filtering: 5 uploads
[Browse Uploads] ⚠️  FILTERED OUT: upload 1 with bad session: "{"access_token":"eyJ..."
[Browse Uploads] ⚠️  FILTERED OUT: upload 2 with bad session: "{"access_token":"eyJ..."
[Browse Uploads] 🧹 Filtered out 5 corrupted uploads
[Browse Uploads] ✅ AFTER filtering: 0 valid uploads
```

### Step 3: Run SQL Diagnostic

Open `/DIAGNOSE_STUDENT_CLASS_MISMATCH.sql` and run it in Supabase SQL Editor.

This will show you:
- Student's class_id
- JSS2 class_id with uploads
- Whether they match

### Step 4: Apply the Fix

Based on diagnostic results, choose ONE fix:

## Fix Option 1: Student in Wrong Class (MOST COMMON)

**Problem:** Student is assigned to a different JSS2 class than the one with uploads.

**Example:**
- Student class_id: `abc-123-uuid` (JSS2 Section A)
- Upload class_id: `xyz-456-uuid` (JSS2 Section B)

**Solution:** Reassign student to correct class

```sql
-- Find the correct JSS2 class (the one with uploads)
SELECT 
  id as class_id,
  name,
  section,
  (SELECT COUNT(*) FROM uploads WHERE class_id = classes.id AND session = '2025/2026') as upload_count
FROM classes
WHERE name LIKE '%JSS%2%'
ORDER BY upload_count DESC;

-- Reassign student to the class with uploads
UPDATE profiles
SET class_id = 'xyz-456-uuid'  -- ⚠️ Use the class_id with uploads
WHERE email = 'student@example.com'  -- ⚠️ Change to actual student email
  AND role = 'student';
```

## Fix Option 2: Uploads in Wrong Class

**Problem:** Uploads were created for wrong JSS2 class.

**Solution:** Move uploads to student's class

```sql
-- Move all JSS2 uploads to student's class
UPDATE uploads
SET class_id = (
  SELECT class_id 
  FROM profiles 
  WHERE email = 'student@example.com'  -- ⚠️ Change this
  AND role = 'student'
)
WHERE class_id IN (
  SELECT id FROM classes WHERE name LIKE '%JSS%2%'
)
AND session = '2025/2026';
```

## Fix Option 3: Clean Up Corrupted Sessions

**Problem:** All uploads have corrupted session values.

**Solution:** Fix the session field

```sql
-- Update corrupted sessions to valid format
UPDATE uploads
SET session = '2025/2026'
WHERE session !~ '^[0-9]{4}/[0-9]{4}$'
   OR session IS NULL;
```

## Verification

After applying fix, verify it worked:

### 1. SQL Verification:
```sql
SELECT 
  p.email as student,
  p.class_id as student_class,
  c.name as class_name,
  (SELECT COUNT(*) 
   FROM uploads 
   WHERE class_id = p.class_id 
   AND session = '2025/2026') as uploads_visible
FROM profiles p
LEFT JOIN classes c ON c.id = p.class_id
WHERE p.email = 'student@example.com'
  AND p.role = 'student';
```

Expected result: `uploads_visible > 0`

### 2. Browser Verification:
1. **Refresh** student's Notes page (F5)
2. **Check console** - should see:
   ```
   [Browse Uploads] ✅ AFTER filtering: 2 valid uploads
   [Browse Uploads] 📅 Valid sessions found: ["2025/2026"]
   [StudentFileExplorer] 📅 Sessions found: 1
   ```
3. **On screen** - should see "2025/2026" folder! 🎉

## Common Scenarios

### Scenario 1: Duplicate JSS2 Classes
```sql
-- Check for duplicate classes
SELECT name, section, COUNT(*) as count
FROM classes
WHERE name LIKE '%JSS%2%'
GROUP BY name, section
HAVING COUNT(*) > 1;
```

If duplicates exist, consolidate them:
1. Keep one class (with most uploads/students)
2. Reassign all students to that class
3. Move all uploads to that class
4. Delete duplicate class

### Scenario 2: No Class Assignment
```sql
-- Find students with no class
SELECT id, email, first_name, last_name
FROM profiles
WHERE role = 'student'
  AND class_id IS NULL;
```

Fix: Assign students to classes via Students Manager in admin dashboard.

### Scenario 3: Wrong Class Name
If uploads are for "JSS 2" but student is in "JSS2" (no space), they're different classes!

Check exact names:
```sql
SELECT DISTINCT name FROM classes WHERE name LIKE '%JSS%' OR name LIKE '%Junior%';
```

## Summary Checklist

- [ ] Browser console shows student's class_id
- [ ] Browser console shows upload class_ids
- [ ] Class IDs match
- [ ] At least 1 upload has session "2025/2026"
- [ ] Upload session format is "YYYY/YYYY" (not corrupted)
- [ ] Student can see session folders

## Quick Test

Run this ONE query to check everything:

```sql
-- Complete diagnostic in one query
WITH student_info AS (
  SELECT id, email, class_id, 
         (SELECT name FROM classes WHERE id = class_id) as class_name
  FROM profiles 
  WHERE email = 'student@example.com' AND role = 'student'
),
upload_info AS (
  SELECT class_id, COUNT(*) as upload_count
  FROM uploads
  WHERE session = '2025/2026'
    AND class_id = (SELECT class_id FROM student_info)
  GROUP BY class_id
)
SELECT 
  s.email,
  s.class_id as student_class_id,
  s.class_name,
  COALESCE(u.upload_count, 0) as uploads_available,
  CASE 
    WHEN COALESCE(u.upload_count, 0) > 0 THEN '✅ Student CAN see uploads'
    ELSE '❌ Student CANNOT see uploads - CLASS MISMATCH or NO UPLOADS'
  END as status
FROM student_info s
LEFT JOIN upload_info u ON u.class_id = s.class_id;
```

---

**If still not working after all fixes, share:**
1. Browser console output (full [Browse Uploads] section)
2. SQL diagnostic results
3. Screenshots of what student sees

**Last Updated:** January 2025
