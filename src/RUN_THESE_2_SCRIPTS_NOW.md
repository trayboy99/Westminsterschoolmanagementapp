# ⚡ RUN THESE 2 SCRIPTS (Copy & Paste)

## 🎯 Problem: Graduated students not showing in dropdown

## ✅ Solution: 2 SQL scripts

---

## **SCRIPT 1: Add Status Column**

**Copy this entire block → Paste in Supabase SQL Editor → Click Run**

```sql
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'profiles' AND column_name = 'status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN status TEXT DEFAULT 'active';
  END IF;
END $$;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_status_check 
  CHECK (status IN ('active', 'inactive', 'graduated', 'suspended'));

UPDATE profiles SET status = 'graduated'
WHERE role = 'student' AND class_id IS NULL;

UPDATE profiles SET status = 'active'
WHERE role = 'student' AND class_id IS NOT NULL;

SELECT 
  'Graduated students found' as result,
  COUNT(*) as count,
  string_agg(first_name || ' ' || last_name, ', ') as names
FROM profiles WHERE status = 'graduated';
```

**✅ Expected Output**: Should show count and names of graduated students

---

## **SCRIPT 2: Sync to graduated_students**

**Copy this entire block → Paste in Supabase SQL Editor → Click Run**

```sql
INSERT INTO graduated_students (
  student_id, first_name, last_name, middle_name,
  graduation_session, graduation_class, graduation_date,
  email, phone, gender, date_of_birth,
  fees_clearance_required, fees_cleared, outstanding_balance, is_active
)
SELECT 
  p.id, p.first_name, p.last_name, p.middle_name,
  COALESCE(p.graduation_session, '2024/2025'), 'SS3', 
  COALESCE(p.updated_at, p.created_at),
  p.email, p.phone, p.gender, p.date_of_birth,
  true, false, 0, true
FROM profiles p
WHERE p.role = 'student' AND p.status = 'graduated'
AND NOT EXISTS (SELECT 1 FROM graduated_students gs WHERE gs.student_id = p.id)
ON CONFLICT (student_id) DO NOTHING;

SELECT 
  '✅ Synced students' as result,
  COUNT(*) as count
FROM graduated_students;
```

**✅ Expected Output**: Should show count of synced students

---

## **STEP 3: Test in Frontend**

1. Go to **Director Dashboard → Transcript PIN Management**
2. Press **F5** (refresh)
3. Click **"Generate New PIN"**
4. Open the dropdown
5. **Students should appear!** 🎉

---

## 🚨 Errors?

### **Error: "relation graduated_students does not exist"**

**Fix**: Run this first (in Supabase SQL Editor):

```sql
-- File: CREATE_GRADUATED_STUDENTS_TRANSCRIPT_SYSTEM.sql
-- Find this file and run it first, then run Script 1 & 2 above
```

### **Error: Still no students in dropdown**

**Check if any students are graduated:**

```sql
SELECT COUNT(*) FROM profiles WHERE role = 'student' AND class_id IS NULL;
```

**If returns 0**: No students have been graduated yet. Promote some SS3 students first.

---

## ✅ Done!

**Files for reference:**
- `ULTIMATE_FIX_NO_MORE_ERRORS.md` - Full guide
- `RUN_THESE_2_SCRIPTS_NOW.md` - **← You are here** (Quick version)

**Status**: Ready! Run Script 1, then Script 2, then test! 🚀
