# 🔧 Timetable Config Column Fix - Quick Guide

## ❌ The Problem
You're seeing this error:
```
Could not find the 'config' column of 'timetable_settings' in the schema cache
```

This happens because the timetable tables were created with an **incorrect schema** that doesn't match what the backend code expects.

---

## ✅ The Solution

### **Option 1: Complete Fix (RECOMMENDED)**

Run this file in **Supabase SQL Editor**:
```
/FIX_TIMETABLE_SCHEMA_COMPLETE.sql
```

This will:
- ✅ Drop and recreate the `timetable` table with correct schema
- ✅ Fix the `config` column in `timetable_settings` table
- ✅ Ensure `class_subject_assignments` table exists
- ✅ Add required columns to `profiles` and `subjects` tables
- ✅ Set up all RLS policies
- ✅ Create performance indexes
- ✅ Force schema cache reload

**Time:** ~30 seconds  
**Risk:** None (uses IF EXISTS/IF NOT EXISTS)

---

### **Option 2: Quick Fix (if tables already exist)**

Run this file in **Supabase SQL Editor**:
```
/ADD_CONFIG_COLUMN_NOW.sql
```

This will:
- ✅ Add the `config` column to `timetable_settings`
- ✅ Add other required columns
- ✅ Create indexes

**Time:** ~5 seconds  
**Risk:** None (only adds missing columns)

---

## 📋 What Changed

### Before (Incorrect Schema):
```sql
-- timetable_settings had NO config column ❌
CREATE TABLE timetable_settings (
  id UUID PRIMARY KEY,
  -- config column was MISSING!
  created_at TIMESTAMPTZ
);

-- timetable stored individual slots as rows ❌
CREATE TABLE timetable (
  id UUID PRIMARY KEY,
  class_id UUID,
  day TEXT,
  period INTEGER,
  subject_id UUID,
  -- ... one row per slot
);
```

### After (Correct Schema):
```sql
-- timetable_settings now has config JSONB column ✅
CREATE TABLE timetable_settings (
  id UUID PRIMARY KEY,
  config JSONB NOT NULL, -- ✅ Added!
  updated_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- timetable stores ALL slots in one JSONB array ✅
CREATE TABLE timetable (
  id UUID PRIMARY KEY,
  academic_year TEXT,
  term TEXT,
  slots JSONB NOT NULL, -- ✅ Array of all slots!
  created_by UUID,
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);
```

---

## 🔍 Why This Schema?

The backend code expects:

### For Settings:
```typescript
// Backend saves settings like this:
await supabase.from("timetable_settings").upsert({
  config: settings, // ← Entire settings object as JSONB
  updated_by: user.id,
  updated_at: new Date().toISOString()
});

// Backend reads settings like this:
const { data: settings } = await supabase
  .from("timetable_settings")
  .select("*")
  .single();
  
return settings?.config; // ← Returns the config JSONB
```

### For Timetable:
```typescript
// Backend saves entire timetable as one row:
await supabase.from("timetable").upsert({
  academic_year: "2024/2025",
  term: "First Term",
  slots: [...], // ← Array of ALL generated slots
  created_by: user.id
});

// Backend reads all slots from one row:
const { data: timetableData } = await supabase
  .from("timetable")
  .select("*")
  .single();
  
return timetableData?.slots; // ← Returns the slots array
```

---

## ✅ After Running the Fix

1. **Refresh your browser**
   - Press `Ctrl+Shift+R` (Windows/Linux)
   - Press `Cmd+Shift+R` (Mac)

2. **Verify the fix worked**
   ```sql
   -- Check timetable_settings has config column
   SELECT column_name, data_type 
   FROM information_schema.columns 
   WHERE table_name = 'timetable_settings';
   
   -- Should show: config | jsonb ✅
   ```

3. **Test the system**
   - Navigate to Timetable Module in your SMS
   - Click "Settings" button
   - Configure your timetable settings
   - Click "Save Settings"
   - Should see: ✅ "Timetable settings saved successfully!"

---

## 🎯 Next Steps

Once the schema is fixed:

1. **Configure Settings**
   - Follow `/TEST_TIMETABLE_AUTOMATION_NOW.md` - Step 2

2. **Set Up Sample Data**
   - Add class-subject assignments
   - Configure part-time teachers
   - Set teacher availability

3. **Generate Timetable**
   - Click "Edit" button in Timetable Module
   - Click "Generate Timetable"
   - Watch the automation work!

---

## 🐛 Troubleshooting

### Still seeing "config column not found"?
1. Make sure you ran the SQL in **Supabase SQL Editor**, not somewhere else
2. Check if the query completed successfully (no red errors)
3. Force refresh: `NOTIFY pgrst, 'reload schema';`
4. Clear browser cache and refresh

### Still having issues?
Run this diagnostic:
```sql
-- Check if config column exists
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name IN ('timetable_settings', 'timetable', 'class_subject_assignments')
ORDER BY table_name, ordinal_position;
```

Expected output:
```
timetable_settings | id             | uuid         | NO
timetable_settings | config         | jsonb        | NO  ← Must exist!
timetable_settings | updated_by     | uuid         | YES
timetable_settings | created_at     | timestamptz  | YES
timetable_settings | updated_at     | timestamptz  | YES

timetable          | id             | uuid         | NO
timetable          | academic_year  | text         | YES
timetable          | term           | text         | YES
timetable          | slots          | jsonb        | NO  ← Must exist!
timetable          | created_by     | uuid         | YES
timetable          | created_at     | timestamptz  | YES
timetable          | updated_at     | timestamptz  | YES
```

---

## 📝 Summary

| File | What It Does | When To Use |
|------|-------------|-------------|
| `FIX_TIMETABLE_SCHEMA_COMPLETE.sql` | Complete fix - recreates all tables with correct schema | **Use this** (safest, most complete) |
| `ADD_CONFIG_COLUMN_NOW.sql` | Quick fix - only adds missing columns | Use if tables exist but column is missing |

**Recommendation:** Run `FIX_TIMETABLE_SCHEMA_COMPLETE.sql` for a clean, complete fix.

---

**Good luck! 🚀**
