# 🔍 Debug: Why Aren't Pairs Saving to Database?

## 🎯 Follow These Steps

### Step 1: Check Browser Console
Open your browser console (F12) when you click "Save All Pairs". Look for these logs:

**✅ GOOD - You should see:**
```
=== SAVING PAIRS TO DATABASE ===
Current level: senior
Groups to save: 1
Groups data: [...]
Step 1: Deleting old pairings for level: senior
✅ Old pairings deleted successfully
Step 2: Inserting new pairings
Records to insert: 3
✅ Insert successful! Inserted records: [...]
✅ Saved 3 pairing records for 1 groups
✅ Verification: Found 3 records in database
```

**❌ BAD - If you see error messages, note them down**

---

## 🐛 Common Issues & Solutions

### Issue 1: "column does not exist"
**Error:** `column subject_pairings.pair_group_name does not exist`

**Solution:** Run the SQL migration first:
```sql
-- Run in Supabase SQL Editor
ALTER TABLE subject_pairings
ADD COLUMN IF NOT EXISTS pair_group_id TEXT,
ADD COLUMN IF NOT EXISTS pair_group_name TEXT,
ADD COLUMN IF NOT EXISTS level TEXT;
```

---

### Issue 2: "No groups to save" or "currentLevelGroups is empty"
**Console shows:** `⚠️ No pairings to insert (currentLevelGroups is empty)`

**Reason:** You haven't created any pairs yet, OR you're on the wrong tab

**Solution:**
1. Make sure you've dragged subjects together to create pairs
2. Check you're on the correct tab (Junior vs Senior)
3. The pairs should appear in green "Created Pairs" section before saving

---

### Issue 3: "permission denied" or "RLS policy violation"
**Error:** `new row violates row-level security policy`

**Solution:** Disable RLS or add policy:
```sql
-- Option 1: Disable RLS temporarily (not recommended for production)
ALTER TABLE subject_pairings DISABLE ROW LEVEL SECURITY;

-- Option 2: Add proper policy
CREATE POLICY "Allow authenticated users to manage pairings"
ON subject_pairings
FOR ALL
TO authenticated
USING (true)
WITH CHECK (true);
```

---

### Issue 4: Pairs save but don't appear after refresh
**Console shows success but pairs disappear**

**Solution:** Check the level field matches:
```sql
-- Check what's actually in the database
SELECT 
  pair_group_id,
  pair_group_name,
  level,
  COUNT(*) as subjects_count
FROM subject_pairings
GROUP BY pair_group_id, pair_group_name, level;
```

If `level` is NULL or wrong, fix it:
```sql
UPDATE subject_pairings 
SET level = 'senior' 
WHERE level IS NULL;
```

---

### Issue 5: Insert succeeds but verification shows 0 records
**Console shows:** `✅ Insert successful!` then `✅ Verification: Found 0 records`

**Reason:** The delete operation might be removing what you just inserted

**Solution:** Check if there's a trigger or cascading delete. Run this:
```sql
-- Check for triggers
SELECT trigger_name, event_manipulation, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'subject_pairings';
```

---

## 📊 Diagnostic Queries

### Query 1: Check table structure
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns 
WHERE table_name = 'subject_pairings'
ORDER BY ordinal_position;
```

**Expected columns:**
- id (uuid)
- subject_id (uuid)
- pair_group_id (text) ← Must have this
- pair_group_name (text) ← Must have this
- level (text) ← Must have this
- pairing_type (text)
- created_at (timestamp)

### Query 2: Check existing data
```sql
SELECT * FROM subject_pairings ORDER BY created_at DESC;
```

### Query 3: Manual test insert
```sql
-- Replace YOUR_SUBJECT_ID with an actual subject UUID from your subjects table
INSERT INTO subject_pairings (
  pair_group_id,
  pair_group_name,
  subject_id,
  level,
  pairing_type
) VALUES (
  'test_123',
  'Test Pair',
  'YOUR_SUBJECT_ID',
  'senior',
  'departmental'
);

-- Check if it worked
SELECT * FROM subject_pairings WHERE pair_group_id = 'test_123';
```

**If this fails, copy the exact error message and check:**
- Foreign key constraints
- RLS policies
- Data types

---

## ✅ Successful Save Checklist

After clicking "Save All Pairs", verify:

- [ ] Console shows "✅ Insert successful!"
- [ ] Console shows "✅ Verification: Found N records"
- [ ] Toast message appears: "✅ Saved X pair group(s) to database!"
- [ ] Running `SELECT * FROM subject_pairings` shows your data
- [ ] Refreshing the page still shows your pairs

---

## 🚀 Quick Test

1. **Create a simple pair:**
   - Drag Biology onto Chemistry
   - You should see "Biology / Chemistry" in green "Created Pairs" section

2. **Click "Save All Pairs"**

3. **Check console for logs** (all the detailed logs I added)

4. **Verify in database:**
```sql
SELECT 
  pair_group_id,
  pair_group_name,
  subject_id,
  level
FROM subject_pairings
WHERE level = 'senior'  -- or 'junior' depending on which tab you're on
ORDER BY pair_group_id;
```

**Expected result:** 2 rows (Biology and Chemistry)

---

## 💡 Still Not Working?

Share these details:
1. **Console logs** when clicking Save
2. **Error message** (if any)
3. **Result of:** `SELECT * FROM subject_pairings;`
4. **Result of:** `SELECT column_name FROM information_schema.columns WHERE table_name = 'subject_pairings';`

I'll help you debug it!
