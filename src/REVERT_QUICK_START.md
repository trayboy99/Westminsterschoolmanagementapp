# ⚡ REVERT QUICK START - 3 Steps

## 🎯 Goal

Make revert **ACTUALLY MOVE STUDENTS BACK** to their previous classes!

---

## ✅ Step 1: Run SQL Fix (CRITICAL!)

**Go to Supabase → SQL Editor → Paste this:**

```sql
-- Allow re-promotion after revert
DROP INDEX IF EXISTS idx_promotions_unique_student_session;

CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (student_id, current_session, new_session) 
WHERE is_reverted = false;
```

**Click:** [Run]

**Why:** Without this, you can't promote again after reverting.

---

## ✅ Step 2: Test Revert

1. **Open Console:** Press F12 → Console tab
2. **Go to:** Promotion Management
3. **Find:** Any class with students (e.g., JSS1 A)
4. **Click:** [Promote] → Select next class → Confirm
5. **Wait for:** "✅ X students promoted!"

**Now revert:**

6. **Scroll to:** Recent Promotions section
7. **Click:** [Revert] on the promotion you just did
8. **Confirm:** Click OK

---

## ✅ Step 3: Verify Students Moved Back

**Check Console:**
```
✅ Successfully updated X students
Updated students: [{ name: '...', class_id: 'original-class-id' }, ...]
🎉 Successfully reverted X students
```

**Check Students Manager:**
1. Go to Students Manager
2. Filter by original class (e.g., JSS1 A)
3. **Should see:** All students back! ✅

---

## 🐛 If It Doesn't Work

### Console shows: "No promotion records found"

**Problem:** Can't find the promotion to revert

**Check:**
```sql
SELECT * FROM promotions ORDER BY promoted_at DESC LIMIT 3;
```

---

### Console shows: "Error reverting students"

**Problem:** Database update failed

**Check RLS:**
```sql
SELECT * FROM pg_policies WHERE tablename = 'profiles';
```

---

### Console shows: "Successfully updated 0 students"

**Problem:** Update query returned nothing

**Check:**
```sql
-- Do the students exist?
SELECT id, full_name, class_id FROM profiles 
WHERE role = 'student' 
LIMIT 5;
```

---

### Students still in new class after revert

**Problem:** Update didn't actually happen

**Manual fix:**
```sql
-- Find promotion
SELECT * FROM promotions WHERE is_reverted = true LIMIT 1;

-- Move students back manually
UPDATE profiles
SET class_id = 'original-class-id'  -- Replace with actual ID
WHERE id IN (
  SELECT student_id FROM promotions 
  WHERE is_reverted = true
  LIMIT 50
);
```

---

## 🎉 Success

**You'll know it works when:**

1. Console shows: "✅ Successfully updated X students"
2. Console shows: Updated students array (not empty!)
3. Students Manager shows students in original class
4. Promote button visible again for that class
5. Can promote → revert → promote → revert repeatedly

---

## 📚 Full Details

See:
- **REVERT_STUDENTS_BACK_COMPLETE_FIX.md** - Complete debugging guide
- **REVERT_ACTUALLY_WORKS_VISUAL.md** - Visual before/after

---

**🚀 That's it! Just run the SQL and test.**
