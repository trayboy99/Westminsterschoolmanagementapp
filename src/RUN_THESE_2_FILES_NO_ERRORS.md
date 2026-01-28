# ⚡ Run These 2 Files - No More Errors!

## ✅ Both Constraint Errors Fixed!

The `IF NOT EXISTS` syntax errors have been corrected in both files.

---

## 🚀 STEP 1: Sync Data

```
File: /SYNC_GRADUATED_STUDENTS_FROM_PROFILES.sql
```

Copy entire file → Paste in Supabase SQL Editor → Run

**What happens:**
- ✅ Adds UNIQUE constraint (drop → add pattern)
- ✅ Syncs graduated students from profiles table
- ✅ ON CONFLICT now works!

---

## 🚀 STEP 2: Fix Foreign Key

```
File: /FIX_TRANSCRIPT_PINS_FOREIGN_KEY.sql
```

Copy entire file → Paste in Supabase SQL Editor → Run

**What happens:**
- ✅ Drops old constraints
- ✅ Adds UNIQUE constraint (drop → add pattern)
- ✅ Re-creates foreign key to graduated_students

---

## ✅ Done!

Both files now use the correct PostgreSQL syntax:

```sql
-- ✅ CORRECT (what the files now use):
DROP CONSTRAINT IF EXISTS ...;
ADD CONSTRAINT ...;

-- ❌ WRONG (what caused the error):
ADD CONSTRAINT IF NOT EXISTS ...;
```

---

## 🎯 Expected Output

### Step 1:
```
ALTER TABLE
ALTER TABLE
INSERT 0 X  (X = number of graduated students)
```

### Step 2:
```
ALTER TABLE
ALTER TABLE
ALTER TABLE
ALTER TABLE
```

**No errors!** 🎉

---

## 📚 More Info

See: `/GRADUATED_STUDENTS_COMPLETE_FIX_NO_ERRORS.md`
