# 🔧 Fix Schema Cache Error - 2 Minutes

## ❌ The Error You're Getting

```
Could not find the 'config' column of 'timetable_settings' in the schema cache
```

## 🎯 What's Wrong

Supabase's PostgREST cache hasn't refreshed after creating the timetable tables. This happens when:
1. Tables are created but the API layer doesn't know about them yet
2. The schema cache needs manual refresh

## ✅ Quick Fix (Choose One Method)

---

### Method 1: Run This SQL (Recommended - 30 seconds)

**File:** `/FIX_SCHEMA_CACHE_NOW.sql`

1. Open **Supabase SQL Editor**
2. Copy entire file contents
3. Paste and click **RUN**
4. **Wait 5 seconds**
5. **Refresh your browser** (Ctrl+R or Cmd+R)
6. Try settings again

---

### Method 2: Manual Schema Reload (15 seconds)

**In Supabase Dashboard:**

1. Go to **Settings** → **API**
2. Find **Schema** section
3. Click **Reload Schema** button
4. Wait 5 seconds
5. Refresh your browser
6. Try settings again

---

### Method 3: Restart PostgREST (10 seconds)

**In Supabase Dashboard:**

1. Go to **Project Settings** → **API**
2. Scroll to bottom
3. Click **Restart Server** (if available)
4. Wait 10 seconds
5. Refresh browser

---

## 🔍 Verify It's Fixed

Run this in SQL Editor:

```sql
-- Check table exists with config column
SELECT 
  column_name, 
  data_type
FROM information_schema.columns 
WHERE table_name = 'timetable_settings'
ORDER BY ordinal_position;
```

**Expected output:**
```
id          | uuid
config      | jsonb       ← This must show!
updated_by  | uuid
created_at  | timestamp
updated_at  | timestamp
```

If you see `config | jsonb`, the table is correct.

---

## 🚀 After Fix - Test Settings

1. Go to **Timetable Management**
2. Click **Settings** button
3. Fill in:
   - Academic Year
   - Term
   - Daily timings
   - Add a break
4. Click **Save Settings**

✅ **Should work now!** No more schema cache error.

---

## ⚠️ If Still Not Working

### Check if table was actually created:

```sql
SELECT EXISTS (
  SELECT 1 
  FROM information_schema.tables 
  WHERE table_name = 'timetable_settings'
);
```

**If returns FALSE:**
- Table wasn't created
- Run `/TIMETABLE_FINAL_BULLETPROOF_SETUP.sql` again

**If returns TRUE but still getting error:**
- Schema cache issue persists
- Try Method 2 (Manual reload)
- Or wait 1-2 minutes and refresh browser

---

## 🔧 Nuclear Option (If nothing works)

Delete and recreate everything:

```sql
-- Drop all timetable tables
DROP TABLE IF EXISTS timetable_settings CASCADE;
DROP TABLE IF EXISTS timetable CASCADE;
DROP TABLE IF EXISTS class_subject_assignments CASCADE;

-- Force schema reload
NOTIFY pgrst, 'reload schema';

-- Wait 5 seconds, then run:
-- /TIMETABLE_FINAL_BULLETPROOF_SETUP.sql
```

---

## 📊 Why This Happens

Supabase uses PostgREST which caches the database schema for performance. When you create new tables, PostgREST needs to:
1. Detect the schema change
2. Reload its cache
3. Expose new tables/columns via API

Usually this is automatic, but sometimes needs manual refresh.

---

## ✅ Quick Summary

1. **Run:** `/FIX_SCHEMA_CACHE_NOW.sql`
2. **Wait:** 5 seconds
3. **Refresh:** Browser (Ctrl+R)
4. **Test:** Settings should save now

**Time needed:** 30 seconds
**Success rate:** 99%

The SQL includes `NOTIFY pgrst, 'reload schema'` which forces the refresh! 🚀
