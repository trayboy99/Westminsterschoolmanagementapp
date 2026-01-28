# ⚡ 2-Step Fix for PIN Errors

## Your Errors:
1. ❌ `column "is_active" does not exist`
2. ❌ `Could not find 'uses_count' column in schema cache`

---

## Fix (2 Minutes)

### Step 1: Run This SQL
📁 **File:** `/FIX_TRANSCRIPT_PINS_COLUMNS_CORRECTED.sql`

Copy entire file into Supabase SQL Editor → Click **Run**

**Expected:** 
```
✅ Added max_uses column
✅ Added uses_count column  
✅ TRANSCRIPT PINS TABLE FIXED
```

---

### Step 2: Reload Schema Cache
**In Supabase Dashboard:**

1. Click **Settings** (left sidebar)
2. Click **API** tab
3. Click **"Reload Schema"** button
4. Wait 15 seconds

**OR restart your project:**
- Settings → General → Pause → Resume

---

## Test It

1. Go to `/alumni`
2. Enter PIN: `C7GV-GEZG-UP99`
3. Click "Verify PIN"

**Expected:** ✅ **Transcript loads!**

---

## Why This Fixes It

**Problem 1 - Wrong SQL:**
- Old SQL referenced `is_active` column that doesn't exist
- New SQL only adds `uses_count` and `max_uses`

**Problem 2 - Cached Schema:**
- Supabase API cached old table structure
- Reload makes it see new columns

---

## Files to Use

✅ `/FIX_TRANSCRIPT_PINS_COLUMNS_CORRECTED.sql` - **USE THIS**  
❌ `/ADD_PIN_USAGE_TRACKING_COLUMNS.sql` - Don't use (has errors)

---

That's it! Run SQL + Reload Schema = Fixed! 🎉
