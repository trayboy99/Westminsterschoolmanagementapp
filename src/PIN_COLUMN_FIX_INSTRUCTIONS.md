# ⚡ Fix PIN "uses_count" Column Error

## Your Error:
```
❌ Could not find the 'uses_count' column of 'transcript_pins' in the schema cache
```

---

## ✅ Solution (2 Steps - Takes 2 Minutes)

### Step 1: Add Missing Columns

**Run this SQL in Supabase SQL Editor:**
📁 `/ADD_USES_COUNT_COLUMN_SIMPLE.sql`

1. Open Supabase Dashboard
2. Go to SQL Editor
3. Copy and paste the entire file
4. Click **Run**

**Expected Output:**
```
✅ Added max_uses column (default: 3 uses per PIN)
✅ Added uses_count column (default: 0)
✅ Added data integrity constraints
✅ PIN USAGE TRACKING COLUMNS ADDED
```

---

### Step 2: Reload Schema Cache ⚠️ **CRITICAL!**

**This is mandatory - don't skip!**

**Option A - Reload Schema (Fastest):**
1. In Supabase Dashboard, click **Settings** (left sidebar)
2. Click **API** tab
3. Find **"Reload Schema"** button
4. Click it
5. Wait 15-30 seconds

**Option B - Restart Project:**
1. Settings → General
2. Click **Pause Project**
3. Wait 10 seconds
4. Click **Resume Project**

---

## Why Both Steps Are Needed

### After Step 1 Only:
```
✅ Database has uses_count column
❌ Supabase API cache doesn't know about it
❌ Backend still fails with "not in schema cache"
```

### After Step 2 (Schema Reload):
```
✅ Database has uses_count column
✅ Supabase API knows about it
✅ Backend works perfectly!
```

---

## Test It

After completing both steps:

1. Go to `/alumni` 
2. Select "Get Transcript"
3. Enter PIN: `C7GV-GEZG-UP99`
4. Click "Verify PIN"

**Expected:** ✅ Transcript loads successfully!

---

## What These Columns Do

### `uses_count` (INTEGER)
- Tracks how many times a PIN has been used
- Starts at 0
- Increments by 1 each time PIN is verified
- Example: 0 → 1 → 2 → 3

### `max_uses` (INTEGER)  
- Maximum number of times a PIN can be used
- Default: 3
- Can be configured in admin settings
- PIN stops working when `uses_count` >= `max_uses`

### Example PIN Lifecycle:

| Use | uses_count | max_uses | Status |
|-----|-----------|----------|---------|
| Fresh | 0 | 3 | ✅ Ready |
| 1st | 1 | 3 | ✅ 2 uses left |
| 2nd | 2 | 3 | ✅ 1 use left |
| 3rd | 3 | 3 | ✅ Last use |
| 4th | 3 | 3 | ❌ Exhausted |

---

## Troubleshooting

### Still getting "column not in schema cache" error?

**1. Did you reload schema?**
- This is the #1 cause of the error
- Even after SQL runs successfully, cache must be reloaded

**2. Wait longer**
- Cache reload can take 30-60 seconds
- Try waiting 1-2 minutes

**3. Hard refresh browser**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

**4. Check columns were added:**
```sql
SELECT column_name 
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
AND column_name IN ('uses_count', 'max_uses');
```

Expected result: Both columns listed

---

## Quick Commands

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

### Reset PIN for Testing
```sql
UPDATE transcript_pins
SET uses_count = 0, is_used = false
WHERE pin_code = 'C7GV-GEZG-UP99';
```

---

## Summary

✅ **Step 1:** Run `/ADD_USES_COUNT_COLUMN_SIMPLE.sql`  
✅ **Step 2:** Reload schema cache in Supabase  
✅ **Test:** Alumni Portal with PIN  

**That's it! Your PIN system will work perfectly!** 🎉
