# 🚨 HOW TO FIX: Students Can't See Uploads

## The Problem

**Students can't see the "2025/2026" session folder even though uploads exist.**

## Why This Happens

Your students have `class_id = 06bdb592-0ebe-426d-943f-d0f9acab38ec`

But your uploads have a **DIFFERENT** `class_id` (some other UUID).

Even though both are "JSS2", they have different IDs in the database.

## The Backend is Working Correctly

The backend code at line 6848 does this:

```typescript
if (profile.role === "student" && profile.class_id) {
  query = query.eq("class_id", profile.class_id);
}
```

This is **CORRECT**. It fetches uploads where `class_id` matches the student's class.

The problem is: **there are NO uploads with the student's class_id**.

## The Fix (30 seconds)

### Step 1: Open Supabase SQL Editor

Go to your Supabase project → SQL Editor

### Step 2: Copy and Paste This Query

```sql
UPDATE profiles
SET class_id = (
  SELECT DISTINCT u.class_id
  FROM uploads u
  JOIN classes c ON c.id = u.class_id
  WHERE u.session = '2025/2026'
    AND c.name ILIKE '%JSS%2%'
  LIMIT 1
)
WHERE role = 'student'
  AND class_id IN (
    SELECT id FROM classes WHERE name ILIKE '%JSS%2%'
  );
```

### Step 3: Run It

Click "Run" button

### Step 4: Refresh Student Page

Go to student's browser → Press F5 → Click "Notes"

**✅ Sessions should now appear!**

## What This Does

1. **Finds** the JSS2 class that has uploads with session "2025/2026"
2. **Reassigns** ALL JSS2 students to that class
3. **Result:** Students' class_id now matches uploads' class_id
4. **Students can see uploads!**

## Verification Query

Run this to verify it worked:

```sql
SELECT 
  p.first_name || ' ' || p.last_name as student,
  c.name as class_name,
  (SELECT COUNT(*) 
   FROM uploads 
   WHERE class_id = p.class_id 
   AND session = '2025/2026') as uploads_visible
FROM profiles p
JOIN classes c ON c.id = p.class_id
WHERE p.role = 'student';
```

If `uploads_visible > 0`, you're done! 🎉

## Alternative: Move Uploads to Students' Class

If you prefer to keep students in their current class and move the uploads instead:

```sql
UPDATE uploads
SET class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec'
WHERE session = '2025/2026'
  AND class_id IN (
    SELECT id FROM classes WHERE name ILIKE '%JSS%2%'
  );
```

This moves the uploads to the students' current class.

## Files to Use

- `/INSTANT_FIX_STUDENTS_UPLOADS.sql` - Complete diagnostic + fix in one file
- `/SUPER_SIMPLE_FIX_NOW.sql` - Just the fix with before/after verification
- `/DIAGNOSE_WHY_STUDENT_CANT_SEE.sql` - Diagnostic only (no fix)

## Expected Time

- **Run SQL:** 10 seconds
- **Refresh page:** 5 seconds
- **Total:** 15 seconds

---

**The backend is not broken. The data just needs to be aligned.**
