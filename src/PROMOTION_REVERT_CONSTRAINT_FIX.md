# 🔧 Promotion Revert Constraint Fix - Complete Guide

## ❌ The Problem

### Error Message:
```
duplicate key value violates unique constraint "idx_promotions_unique_student_session"
Key (student_id, current_session, new_session)=(22a3014d-9b0a-4edc-9154-d70e1646003c, 2026/2027, 2026/2027) already exists.
```

### What Happened:
```
Day 1: Promoted JSS1 A → JSS2 A
       ✅ Record created: is_reverted = false

Day 2: Reverted promotion
       ✅ Record updated: is_reverted = true
       ✅ Student moved back to JSS1 A

Day 3: Try to promote again JSS1 A → JSS2 A
       ❌ ERROR: Unique constraint violation!
       ❌ Old record still exists (even though reverted)
```

### Root Cause:
The unique constraint `idx_promotions_unique_student_session` checks for duplicates of:
- `(student_id, current_session, new_session)`

But it **doesn't exclude reverted promotions**, so the old record blocks new ones!

---

## ✅ The Solution

### Partial Unique Index
Replace the constraint with a **partial unique index** that only applies to **non-reverted** promotions:

```sql
-- Old constraint (wrong):
CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (student_id, current_session, new_session);

-- New constraint (correct):
CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (student_id, current_session, new_session) 
WHERE is_reverted = false;  ← Only applies to active promotions!
```

---

## 🚀 How to Fix (Copy-Paste This)

### **Run this SQL in Supabase SQL Editor:**

```sql
-- Drop old constraint
DROP INDEX IF EXISTS idx_promotions_unique_student_session;

-- Create new partial index
CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (student_id, current_session, new_session) 
WHERE is_reverted = false;
```

**That's it!** 2 lines, done in 10 seconds.

---

## 🎯 What This Fixes

### Before Fix (❌):
```
promotions table:
┌────────────┬─────────┬─────────┬────────────┐
│ student_id │ current │ new     │ is_reverted│
├────────────┼─────────┼─────────┼────────────┤
│ student-1  │ 2026/27 │ 2026/27 │ true       │ ← Blocks new promotions!
└────────────┴─────────┴─────────┴────────────┘

Try to promote again:
❌ ERROR: duplicate key constraint violation
```

### After Fix (✅):
```
promotions table:
┌────────────┬─────────┬─────────┬────────────┐
│ student_id │ current │ new     │ is_reverted│
├────────────┼─────────┼─────────┼────────────┤
│ student-1  │ 2026/27 │ 2026/27 │ true       │ ← Ignored by constraint
│ student-1  │ 2026/27 │ 2026/27 │ false      │ ← NEW! Allowed!
└────────────┴─────────┴─────────┴────────────┘

Try to promote again:
✅ SUCCESS: New record created
```

---

## 📊 How Partial Index Works

### Constraint Only Checks Non-Reverted Records:

```
Scenario 1: First promotion
─────────────────────────────────────────────
promotions table: (empty)
Action: Promote student-1
Result: ✅ SUCCESS
Record: student-1, 2026/27, 2026/27, is_reverted=FALSE

Scenario 2: Revert promotion
─────────────────────────────────────────────
promotions table:
  - student-1, 2026/27, 2026/27, is_reverted=FALSE
Action: Revert promotion
Result: ✅ SUCCESS
Record updated: student-1, 2026/27, 2026/27, is_reverted=TRUE

Scenario 3: Promote again (BEFORE FIX)
─────────────────────────────────────────────
promotions table:
  - student-1, 2026/27, 2026/27, is_reverted=TRUE
Action: Promote student-1 again
Constraint checks: student-1, 2026/27, 2026/27
Result: ❌ DUPLICATE FOUND! (includes reverted)

Scenario 3: Promote again (AFTER FIX)
─────────────────────────────────────────────
promotions table:
  - student-1, 2026/27, 2026/27, is_reverted=TRUE
Action: Promote student-1 again
Constraint checks: student-1, 2026/27, 2026/27 WHERE is_reverted=false
Result: ✅ NO DUPLICATES! (reverted ignored)
Record: student-1, 2026/27, 2026/27, is_reverted=FALSE (NEW)
```

---

## 🔍 Visual Explanation

### Database State Through Journey:

#### **Step 1: Initial Promotion**
```sql
promotions table:
┌─────┬────────────┬─────────┬─────────┬────────────┐
│ id  │ student_id │ current │ new     │ is_reverted│
├─────┼────────────┼─────────┼─────────┼────────────┤
│ p-1 │ student-1  │ 2026/27 │ 2026/27 │ false      │
└─────┴────────────┴─────────┴─────────┴────────────┘

Unique constraint checks:
  WHERE is_reverted = false
  Found: 1 record (student-1, 2026/27, 2026/27)
  Status: ✅ Only one active, OK
```

#### **Step 2: Revert Promotion**
```sql
promotions table:
┌─────┬────────────┬─────────┬─────────┬────────────┐
│ id  │ student_id │ current │ new     │ is_reverted│
├─────┼────────────┼─────────┼─────────┼────────────┤
│ p-1 │ student-1  │ 2026/27 │ 2026/27 │ true       │ ← Changed!
└─────┴────────────┴─────────┴─────────┴────────────┘

Unique constraint checks:
  WHERE is_reverted = false
  Found: 0 records
  Status: ✅ No active promotions
```

#### **Step 3: Promote Again (After Fix)**
```sql
promotions table:
┌─────┬────────────┬─────────┬─────────┬────────────┐
│ id  │ student_id │ current │ new     │ is_reverted│
├─────┼────────────┼─────────┼─────────┼────────────┤
│ p-1 │ student-1  │ 2026/27 │ 2026/27 │ true       │ ← Old (ignored)
│ p-2 │ student-1  │ 2026/27 │ 2026/27 │ false      │ ← NEW!
└─────┴────────────┴─────────┴─────────┴────────────┘

Unique constraint checks:
  WHERE is_reverted = false
  Found: 1 record (student-1, 2026/27, 2026/27) [p-2]
  Status: ✅ Only one active promotion, OK
```

---

## 🧪 Testing the Fix

### Test 1: Promote → Revert → Promote Again
```
1. Go to Settings → Promotion Management
2. Promote JSS1 A → JSS2 A (5 students)
   ✅ Should succeed

3. Click [Revert] on the promotion
   ✅ Should succeed
   ✅ Students back in JSS1 A

4. Promote JSS1 A → JSS2 A again (same 5 students)
   ✅ Should succeed (NO ERROR!)
   ✅ Students in JSS2 A
```

### Test 2: Multiple Revert Cycles
```
1. Promote JSS1 A → JSS2 A
2. Revert
3. Promote JSS1 A → JSS2 A  ✅
4. Revert
5. Promote JSS1 A → JSS2 A  ✅
6. Revert
7. Promote JSS1 A → JSS2 A  ✅

Result: No errors, works every time!
```

### Test 3: Prevent Double Active Promotion
```
1. Promote JSS1 A → JSS2 A
   ✅ Creates promotion record

2. Try to promote same students again (without reverting)
   ❌ Should still block duplicate active promotion
   ❌ Error: duplicate key constraint

This is correct behavior - can't have 2 active promotions!
```

---

## 🔒 Data Integrity Maintained

### What the Constraint Still Prevents:

❌ **BLOCKED:** Two active promotions for same student/session
```sql
-- Record 1
INSERT INTO promotions (student_id, current_session, new_session, is_reverted)
VALUES ('student-1', '2026/2027', '2026/2027', false);
✅ SUCCESS

-- Record 2 (without reverting Record 1)
INSERT INTO promotions (student_id, current_session, new_session, is_reverted)
VALUES ('student-1', '2026/2027', '2026/2027', false);
❌ ERROR: duplicate key constraint
```

### What the Constraint Now Allows:

✅ **ALLOWED:** New promotion after reverting old one
```sql
-- Record 1
INSERT INTO promotions (student_id, current_session, new_session, is_reverted)
VALUES ('student-1', '2026/2027', '2026/2027', false);
✅ SUCCESS

-- Revert Record 1
UPDATE promotions SET is_reverted = true WHERE id = 'p-1';
✅ SUCCESS

-- Record 2 (after revert)
INSERT INTO promotions (student_id, current_session, new_session, is_reverted)
VALUES ('student-1', '2026/2027', '2026/2027', false);
✅ SUCCESS (no error!)
```

---

## 📊 Database Schema

### Updated Index Definition:

```sql
-- Index name: idx_promotions_unique_student_session
-- Type: UNIQUE (partial)
-- Columns: student_id, current_session, new_session
-- Condition: WHERE is_reverted = false

CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (
    student_id, 
    current_session, 
    new_session
) 
WHERE is_reverted = false;
```

### How PostgreSQL Handles This:

```
When inserting/updating a promotion:
1. Check if is_reverted = false
2. If yes, check for existing records with:
   - Same student_id
   - Same current_session
   - Same new_session
   - WHERE is_reverted = false
3. If found → ERROR
4. If not found → SUCCESS

When is_reverted = true:
- Record is excluded from constraint check
- Does not block new promotions
```

---

## 🎯 Why This is Better Than Other Solutions

### ❌ Bad Solution 1: Remove Constraint Entirely
```sql
DROP INDEX idx_promotions_unique_student_session;
-- NO NEW CONSTRAINT

Problem:
  ✅ Can promote after revert
  ❌ Can promote same student twice (data corruption!)
  ❌ No data integrity
  ❌ Database becomes messy
```

### ❌ Bad Solution 2: Delete Reverted Records
```sql
DELETE FROM promotions WHERE is_reverted = true;

Problem:
  ✅ Can promote after "revert"
  ❌ Lose audit history
  ❌ Can't see what was reverted
  ❌ No accountability
```

### ✅ Good Solution: Partial Unique Index (Our Fix)
```sql
CREATE UNIQUE INDEX ... WHERE is_reverted = false;

Benefits:
  ✅ Can promote after revert
  ✅ Prevents duplicate active promotions
  ✅ Keeps full audit history
  ✅ Data integrity maintained
  ✅ Best practice!
```

---

## 📝 Verification

### Check the Index Was Created:

```sql
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'promotions'
    AND indexname = 'idx_promotions_unique_student_session';
```

### Expected Result:
```
indexname: idx_promotions_unique_student_session
indexdef: CREATE UNIQUE INDEX idx_promotions_unique_student_session 
          ON public.promotions USING btree (student_id, current_session, new_session) 
          WHERE (is_reverted = false)
```

### Verify Active Promotions:

```sql
-- Check active promotions (not reverted)
SELECT 
    student_id,
    current_session,
    new_session,
    is_reverted,
    promoted_at
FROM promotions
WHERE is_reverted = false
ORDER BY promoted_at DESC;
```

### Verify Reverted Promotions Still Exist:

```sql
-- Check reverted promotions (history)
SELECT 
    student_id,
    current_session,
    new_session,
    is_reverted,
    reverted_at,
    reverted_by
FROM promotions
WHERE is_reverted = true
ORDER BY reverted_at DESC;
```

---

## 🎉 Summary

### The Fix:
```sql
DROP INDEX IF EXISTS idx_promotions_unique_student_session;

CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions (student_id, current_session, new_session) 
WHERE is_reverted = false;
```

### What It Does:
✅ **Allows:** Promote → Revert → Promote again  
✅ **Prevents:** Duplicate active promotions  
✅ **Keeps:** Full audit history  
✅ **Maintains:** Data integrity  
✅ **Fixes:** The exact error you're seeing  

### Result:
🎊 You can now promote, revert, and promote again without errors!

---

## ⚡ Quick Test After Fix

```
1. Run the SQL fix (2 lines)
2. Go to Promotion Management
3. Try to promote the class again
4. ✅ Should work perfectly!
5. No more constraint errors!
```

**The promotion revert system is now fully functional!** 🚀
