# 🔧 Fix Both Alumni Portal Errors

## Your Errors:

1. **Error fetching graduation sessions: TypeError: Failed to fetch**
2. **Could not find the 'uses_count' column of 'transcript_pins' in the schema cache**

---

## ✅ Complete Fix (3 Steps)

### Step 1: Reload Schema Cache ⚠️ **CRITICAL for Error #2**

**This fixes the `uses_count` schema cache error:**

1. Open Supabase Dashboard
2. Click **Settings** (left sidebar - gear icon ⚙️)
3. Click **API** tab
4. Click **"Reload Schema"** button
5. Wait 30 seconds

**OR** restart your Supabase project:
- Settings → General → Pause Project → Wait → Resume Project

---

### Step 2: Check Graduated Students Table

**This fixes Error #1 (graduation sessions fetch)**

Run this SQL in Supabase SQL Editor:

```sql
-- Check if table exists and has data
SELECT 
    COUNT(*) as total_alumni,
    COUNT(DISTINCT graduation_session) as unique_sessions
FROM graduated_students
WHERE is_active = true;

-- Show sample data
SELECT 
    id,
    first_name,
    last_name,
    graduation_session,
    is_active
FROM graduated_students
WHERE is_active = true
LIMIT 5;

-- Show all graduation sessions
SELECT DISTINCT graduation_session
FROM graduated_students
WHERE is_active = true
ORDER BY graduation_session DESC;
```

**Expected Result:**
- Should show at least 1 alumni record
- Should show graduation sessions (e.g., "2024/2025", "2023/2024")

**If you see NO DATA:**
- The table is empty - that's why fetch fails!
- You need to add Anthony Agbai's data (we set this up earlier)

---

### Step 3: Verify Anthony Agbai Exists

**Run this SQL:**

```sql
SELECT 
    id,
    first_name,
    last_name,
    graduation_session,
    is_active
FROM graduated_students
WHERE first_name = 'Anthony'
AND last_name = 'Agbai';
```

**If NOT FOUND**, run this to create him:

```sql
INSERT INTO graduated_students (
    student_id,
    admission_number,
    graduation_number,
    first_name,
    last_name,
    gender,
    graduated_class,
    graduation_session,
    graduation_date,
    fees_cleared,
    fees_clearance_required,
    outstanding_balance,
    is_active
) VALUES (
    'a1b2c3d4-e5f6-7890-abcd-ef1234567890', -- Replace with actual student_id if exists
    'ADM2024001',
    'GRAD2025001',
    'Anthony',
    'Agbai',
    'male',
    'SS3',
    '2024/2025',
    '2025-06-15',
    true,
    false,
    0.00,
    true
)
RETURNING id, first_name, last_name, graduation_session;
```

---

## ✅ After All 3 Steps

### Test the Alumni Portal:

1. **Go to `/alumni`**
2. **You should see graduation session dropdown populate** ✅
3. **Select "Anthony Agbai"** from alumni dropdown
4. **Enter PIN:** `C7GV-GEZG-UP99`
5. **Click "Verify PIN"**
6. **Transcript should load** ✅

---

## Why These Errors Happened

### Error #1: TypeError: Failed to fetch
```
Root Cause: 
The backend endpoint exists and works fine.
BUT: graduated_students table is empty!

Without data:
→ Query returns empty array []
→ Frontend might not handle this correctly
→ "Failed to fetch" error

Solution:
Add at least 1 alumni record (Anthony Agbai)
```

### Error #2: uses_count column not in schema cache
```
Root Cause:
Column exists in database ✅
Supabase API cache doesn't know about it ❌

Solution:
Reload schema cache so API layer sees new column
```

---

## Quick Verification

### After Schema Reload:
```sql
-- This should work without error
UPDATE transcript_pins
SET uses_count = 0
WHERE pin_code = 'C7GV-GEZG-UP99';
```

### After Adding Alumni Data:
```sql
-- Should return graduation sessions
SELECT DISTINCT graduation_session
FROM graduated_students
WHERE is_active = true;
```

Expected: `2024/2025` (or whatever sessions you have)

---

## Summary Checklist

- [ ] Step 1: Reload schema cache in Supabase (Settings → API → Reload Schema)
- [ ] Step 2: Verify graduated_students table has data
- [ ] Step 3: Add Anthony Agbai record if missing
- [ ] Test: Alumni portal loads
- [ ] Test: Graduation sessions dropdown works
- [ ] Test: PIN verification works
- [ ] Test: Transcript displays

---

## Expected Results

### ✅ Graduation Sessions Dropdown:
```
Select Graduation Session
  └── 2024/2025
  └── 2023/2024
  └── (other sessions)
```

### ✅ Alumni Dropdown:
```
Select Alumni
  └── Anthony Agbai (GRAD2025001)
  └── (other alumni)
```

### ✅ PIN Verification:
```
Enter PIN: C7GV-GEZG-UP99
Click Verify
→ ✅ Transcript loads
→ Shows 6-year academic record
→ Download PDF button works
→ Can use 2 more times
```

---

## If Still Getting Errors

### "Failed to fetch" persists:
1. Check browser console for exact error
2. Verify Supabase project is online
3. Check network tab - is request reaching server?
4. Verify API key is correct in `utils/supabase/info.tsx`

### "uses_count not in schema cache" persists:
1. Wait longer (cache can take 1-2 minutes)
2. Restart Supabase project instead of just reloading
3. Hard refresh browser (Ctrl+Shift+R)
4. Clear browser cache

---

## Files to Reference

- `/ADD_USES_COUNT_COLUMN_SIMPLE.sql` - Already run ✅
- `/RUN_THIS_ANTHONY_SETUP_DECEMBER_2024.sql` - Anthony's complete data
- `/PIN_COLUMN_FIX_INSTRUCTIONS.md` - Detailed PIN fix guide
- `/RELOAD_SCHEMA_NOW.md` - Schema cache instructions

---

**Both errors will be fixed after these 3 steps!** 🎉
