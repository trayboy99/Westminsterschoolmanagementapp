# ⚡ QUICK FIX CHECKLIST - Subject Pairs Not Saving

## ✅ Do These 6 Things (In Order)

### 1️⃣ Fix Database (30 seconds)
```sql
-- Paste this in Supabase SQL Editor and click RUN
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT;

ALTER TABLE subject_pairings DISABLE ROW LEVEL SECURITY;
```

---

### 2️⃣ Configure Subjects (2 minutes)
- Go to: **Timetable → Subjects Config tab**
- For Biology: Check "✅ departmental subject" → Click "Save Subject"
- For Chemistry: Check "✅ departmental subject" → Click "Save Subject"  
- For Physics: Check "✅ departmental subject" → Click "Save Subject"

---

### 3️⃣ Go to Pairs Tab
- Click: **Timetable → Pairs tab**
- Click: **"Senior Secondary (SSS)"** tab
- You should see Biology, Chemistry, Physics as cards

---

### 4️⃣ Create a Pair
- **Drag "Biology"** and **drop onto "Chemistry"**
- **Drag "Physics"** and **drop onto the green pair**
- You now have a 3-subject pair

---

### 5️⃣ Save (IMPORTANT - Use the Right Button!)
- **Click: "Save All Pairs"** button (top right, next to heading)
- **DON'T click** "Save Timetable Settings" (that's the wrong button!)
- Wait for: "✅ Saved 1 pair group(s) to database!"

---

### 6️⃣ Verify It Worked
```sql
-- Run in Supabase SQL Editor
SELECT * FROM subject_pairings;
```

**Expected:** 3 rows (Biology, Chemistry, Physics)

---

## 🔍 Still Not Working?

### Open Browser Console (F12)
When you click "Save All Pairs", you should see:

✅ **GOOD:**
```
=== SAVING PAIRS TO DATABASE ===
✅ Old pairings deleted successfully
✅ Insert successful! Inserted records: [...]
✅ Verification: Found 3 records in database
```

❌ **BAD (if you see errors):**
- **"column does not exist"** → Go back to step 1
- **"permission denied"** → RLS is still on, run step 1 again
- **"No pairings to insert"** → You didn't create any pairs, go to step 4
- **"foreign key violation"** → The subject IDs don't exist in subjects table

---

## 📝 Key Points

1. ✅ Use **"Save All Pairs"** button (inside Pairs tab)
2. ❌ NOT "Save Timetable Settings" button (that doesn't save pairs)
3. ✅ Configure subjects first in "Subjects Config" tab
4. ✅ Create pairs by dragging subjects together
5. ✅ Check console (F12) for detailed logs

---

## 🎯 What Each Button Does

| Button | Location | What It Saves |
|--------|----------|---------------|
| **"Save Subject"** | Subjects Config tab | Subject configuration (departmental checkbox) |
| **"Save All Pairs"** | Pairs tab, top right | Subject pairs to `subject_pairings` table ✅ |
| **"Save Timetable Settings"** | Top of page | Days, breaks, Thursday/Friday rules ❌ |

**Bottom line:** Only "Save All Pairs" saves your pairs to the database!
