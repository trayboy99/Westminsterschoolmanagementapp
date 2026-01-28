# 📸 Visual Guide: Reload Schema Cache

## Current Status

✅ **Database has column** - You've confirmed this  
❌ **API cache doesn't know** - This is why you get the error

---

## Step-by-Step Screenshots Guide

### Step 1: Go to Settings
```
Supabase Dashboard
└── Left Sidebar
    └── ⚙️ Settings (click this)
```

### Step 2: Click API Tab
```
Settings Page
└── Tabs at top
    └── API (click this)
```

### Step 3: Find Schema Section
```
API Page
└── Scroll down
    └── "Schema" section
        └── Last updated: [timestamp]
```

### Step 4: Click Reload Schema
```
Schema Section
└── Button: "Reload Schema"
    └── CLICK THIS!
```

### Step 5: Wait
```
Loading...
⏳ 15-30 seconds
✅ "Schema reloaded successfully"
```

---

## Alternative: Restart Project

### Faster Method (10 seconds)

**Step 1: Go to Settings → General**

**Step 2: Click "Pause Project"**
```
Project Status: Active ✅
↓
[Pause Project] button
↓
Project Status: Paused ⏸️
```

**Step 3: Wait 10 seconds**

**Step 4: Click "Resume Project"**
```
Project Status: Paused ⏸️
↓
[Resume Project] button
↓
Project Status: Active ✅
```

---

## What Happens During Reload

### Before:
```
╔═══════════════════════════════════════╗
║ Supabase API Layer (OLD CACHE)       ║
╠═══════════════════════════════════════╣
║ transcript_pins columns:              ║
║ - pin_code                            ║
║ - graduated_student_id                ║
║ - generated_by                        ║
║ - expires_at                          ║
║ - is_used                             ║
║                                       ║
║ ❌ NO uses_count                      ║
║ ❌ NO max_uses                        ║
╚═══════════════════════════════════════╝
          ↓
    Backend Request:
    UPDATE uses_count = 1
          ↓
    ❌ Error: Column not in cache
```

### After Reload:
```
╔═══════════════════════════════════════╗
║ Supabase API Layer (REFRESHED CACHE) ║
╠═══════════════════════════════════════╣
║ transcript_pins columns:              ║
║ - pin_code                            ║
║ - graduated_student_id                ║
║ - generated_by                        ║
║ - expires_at                          ║
║ - is_used                             ║
║ - uses_count ✅ NEW!                  ║
║ - max_uses ✅ NEW!                    ║
╚═══════════════════════════════════════╝
          ↓
    Backend Request:
    UPDATE uses_count = 1
          ↓
    ✅ Success!
```

---

## After Reload: Test Flow

### Test Scenario:
```
1. Open: /alumni
   ↓
2. Click: "Get Transcript"
   ↓
3. Enter PIN: C7GV-GEZG-UP99
   ↓
4. Click: "Verify PIN"
   ↓
5. Backend checks:
   - uses_count (0) < max_uses (3) ✅
   ↓
6. Backend updates:
   - uses_count: 0 → 1 ✅
   ↓
7. Frontend receives:
   - Transcript data ✅
   ↓
8. Display:
   - Full academic transcript ✅
   - School settings from admin ✅
   - Download PDF button ✅
```

---

## Success Indicators

### ✅ Schema Reload Worked:
- No error in browser console
- Transcript loads
- PIN counter increments

### ❌ Still Not Working:
- Check: Did you wait 30 seconds?
- Check: Did you hard refresh browser?
- Check: Is Supabase project online?

---

## Quick Verification Commands

### After Reload, Run These:

**1. Check Column Exists:**
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'transcript_pins'
AND column_name IN ('uses_count', 'max_uses');
```

**Expected:**
```
column_name | data_type
------------+----------
uses_count  | integer
max_uses    | integer
```

**2. Check PIN Status:**
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

**3. Test Update (Simulate Backend):**
```sql
UPDATE transcript_pins
SET uses_count = uses_count + 1
WHERE pin_code = 'C7GV-GEZG-UP99'
RETURNING uses_count, max_uses;
```

**Expected:**
```
uses_count | max_uses
-----------+---------
    1      |    3
```

If this works, your backend will work too!

---

## Common Mistakes

### ❌ Mistake 1: Not Reloading Schema
```
Added column ✅
Tested immediately ❌
Error: "not in schema cache"
```

**Fix:** Always reload schema after migrations!

### ❌ Mistake 2: Not Waiting Long Enough
```
Reload schema ✅
Test 5 seconds later ❌
Error: Cache still propagating
```

**Fix:** Wait 30-60 seconds!

### ❌ Mistake 3: Browser Cache
```
Schema reloaded ✅
Browser has old JS cached ❌
Error: Old code running
```

**Fix:** Hard refresh browser!

---

## Final Checklist

Before testing:
- [ ] Column added to database
- [ ] Schema reloaded in Supabase
- [ ] Waited 30+ seconds
- [ ] Hard refreshed browser
- [ ] Supabase project is online

After testing:
- [ ] Transcript loads
- [ ] No console errors
- [ ] PIN counter works
- [ ] Can use PIN multiple times

---

## Expected Results

### 1st Use:
```
Before: uses_count = 0
After:  uses_count = 1
Status: ✅ Success - 2 uses remaining
```

### 2nd Use:
```
Before: uses_count = 1
After:  uses_count = 2
Status: ✅ Success - 1 use remaining
```

### 3rd Use:
```
Before: uses_count = 2
After:  uses_count = 3
Status: ✅ Success - 0 uses remaining (exhausted)
```

### 4th Attempt:
```
Before: uses_count = 3
After:  uses_count = 3 (no change)
Status: ❌ Error - "PIN has been used 3 times"
```

---

## You're Almost Done! 🎉

**Just reload schema and you're golden!**

1. ✅ Column exists
2. ⏳ Reload schema (do this now)
3. 🧪 Test Alumni Portal

**Total time: 2 minutes**
