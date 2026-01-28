# 🔧 Schema Cache Error - Quick Fix

## The Error You're Seeing

```
"Could not find the 'uses_count' column of 'transcript_pins' in the schema cache"
```

This means the columns exist in the database, but Supabase's API cache doesn't know about them yet.

---

## ⚡ Quick Fix (2 Steps)

### Step 1: Run Corrected SQL
📁 File: `/FIX_TRANSCRIPT_PINS_COLUMNS_CORRECTED.sql`

This version:
- ✅ Doesn't assume `is_active` column exists
- ✅ Safely adds only the needed columns
- ✅ Works with your actual table structure

### Step 2: Reload Supabase Schema Cache
**This is critical!** After adding columns, you MUST refresh Supabase's cache:

1. Go to your Supabase Dashboard
2. Click **Settings** (gear icon in left sidebar)
3. Click **API** tab
4. Find **"Reload Schema"** button
5. Click it and wait 10-15 seconds

**OR** restart your Supabase project (faster):
1. Go to **Settings** → **General**
2. Click **Pause Project**
3. Wait 10 seconds
4. Click **Resume Project**

---

## What's Happening

### The Problem
```
Database Level:
  ✅ transcript_pins table exists
  ✅ uses_count column added
  ✅ max_uses column added

Supabase API Layer (cached):
  ❌ Still sees OLD schema without new columns
  ❌ Returns 404 for uses_count
  ❌ Backend update fails
```

### After Schema Reload
```
Database Level:
  ✅ transcript_pins table exists
  ✅ uses_count column exists
  ✅ max_uses column exists

Supabase API Layer (refreshed):
  ✅ Sees NEW schema with columns
  ✅ Allows updates to uses_count
  ✅ Backend works perfectly
```

---

## Full Fix Process

### 1️⃣ Run SQL (Supabase SQL Editor)
```bash
/FIX_TRANSCRIPT_PINS_COLUMNS_CORRECTED.sql
```

**Expected Output:**
```
✅ Added max_uses column (default: 3)
✅ Added uses_count column (default: 0)
✅ Added check constraints
✅ TRANSCRIPT PINS TABLE FIXED
```

### 2️⃣ Reload Schema Cache
**Option A - API Settings:**
- Settings → API → Reload Schema button

**Option B - Restart Project:**
- Settings → General → Pause/Resume

**Option C - Wait:**
- Cache auto-refreshes in ~5-10 minutes

### 3️⃣ Test Alumni Portal
1. Go to `/alumni`
2. Select "Get Transcript"
3. Enter PIN: `C7GV-GEZG-UP99`
4. Click "Verify PIN"

**Expected:** ✅ Transcript loads!

---

## Why First SQL Failed

### Old SQL File Issues:
```sql
-- Line 97 in ADD_PIN_USAGE_TRACKING_COLUMNS.sql
SELECT 
    ...
    is_active,  -- ❌ This column doesn't exist in your table!
    ...
FROM transcript_pins
```

Your table doesn't have `is_active` column, so the SELECT query failed.

### New SQL File Fix:
```sql
-- Only adds what we need
ALTER TABLE transcript_pins ADD COLUMN max_uses INTEGER;
ALTER TABLE transcript_pins ADD COLUMN uses_count INTEGER;
-- No reference to is_active!
```

---

## Verification Commands

### Check Columns Were Added
```sql
SELECT column_name, data_type 
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
AND column_name IN ('uses_count', 'max_uses');
```

**Expected:**
```
column_name  | data_type
-------------+----------
uses_count   | integer
max_uses     | integer
```

### Check PIN Status
```sql
SELECT 
    pin_code,
    uses_count,
    max_uses,
    (max_uses - uses_count) as remaining
FROM transcript_pins
WHERE pin_code = 'C7GV-GEZG-UP99';
```

**Expected:**
```
pin_code       | uses_count | max_uses | remaining
---------------+------------+----------+-----------
C7GV-GEZG-UP99 |     0      |    3     |     3
```

### Test Backend Update
```sql
-- This should work after schema reload
UPDATE transcript_pins
SET uses_count = 1
WHERE pin_code = 'C7GV-GEZG-UP99';

-- Check it worked
SELECT pin_code, uses_count FROM transcript_pins
WHERE pin_code = 'C7GV-GEZG-UP99';
```

---

## Troubleshooting

### Still Getting Schema Cache Error?

**1. Wait Longer**
Sometimes takes 2-3 minutes for cache to propagate.

**2. Hard Refresh Browser**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**3. Clear Supabase Service Cache**
In Supabase Dashboard:
```bash
Settings → Database → Connection Pooling → Restart
```

**4. Check RLS Policies**
```sql
-- Ensure no RLS blocking updates
ALTER TABLE transcript_pins DISABLE ROW LEVEL SECURITY;
-- Test, then re-enable if needed
```

### Columns Not Being Added?

**Check Permissions:**
```sql
-- See if you have ALTER permission
SELECT has_table_privilege('transcript_pins', 'ALTER');
```

**Run as Service Role:**
Make sure you're using SQL Editor with service role (not anon key).

---

## Quick Reference

| Issue | Solution |
|-------|----------|
| `is_active` column error | Use `/FIX_TRANSCRIPT_PINS_COLUMNS_CORRECTED.sql` |
| Schema cache error | Reload schema in Settings → API |
| Columns not found | Wait 2-3 mins or restart project |
| Update still fails | Check RLS policies, permissions |

---

## After Fix Works

✅ **Transcripts show school settings** from Admin Dashboard  
✅ **PINs work 3 times** before exhausting  
✅ **Clear error messages** with usage counts  
✅ **Full system integration** complete  

**Test PIN:** `C7GV-GEZG-UP99`  
**Max Uses:** 3

---

## Summary

**Problem:** Schema cache out of sync + SQL referenced non-existent column  
**Solution:** Corrected SQL + Schema cache reload  
**Result:** PIN system works with 3 uses per PIN! 🎉
