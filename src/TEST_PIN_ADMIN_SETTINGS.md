# 🧪 TEST PIN WITH ADMIN SETTINGS - Quick Guide

## ⚡ 3-Minute Test

### Step 1: Check Admin Settings (30 seconds)

**As Principal:**

1. Login to dashboard
2. Go to **Settings** tab
3. Click **Session Settings**
4. Check which session is marked "Current" ✓
5. Check which term is marked "Current" ✓

**Example:**
```
Sessions:
├─ 2024/2025 [ ]
├─ 2025/2026 [✓] ← Current
└─ 2026/2027 [ ]

Terms:
├─ First Term  [✓] ← Current
├─ Second Term [ ]
└─ Third Term  [ ]
```

**If nothing is marked current:**
- Mark one session as current
- Mark one term as current
- Click "Save Settings"
- Continue to Step 2

---

### Step 2: Generate PIN (1 minute)

**As Student:**

1. Login to student dashboard
2. Click **"Learning Materials"** in sidebar
3. Click **"Generate New PIN"** button
4. Wait for success message

**Expected:**
```
✅ Success: Result PIN generated successfully!
```

**If you see error:**
```
❌ No current session or term set by admin. 
   Please contact school administration.
```
→ Go back to Step 1 and set current session/term

---

### Step 3: Verify PIN (1 minute)

**Check the generated PIN:**

You should see something like:

```
┌─────────────────────────────────────┐
│ [••••••••] [👁️] [📋]                 │
│ ✅ Active                            │
│ First Term - 2025/2026               │
│ Created: Oct 26, 2025                │
│ Expires: Nov 25, 2025                │
└─────────────────────────────────────┘
```

**Verify:**
- ✅ Term matches what admin set (e.g., "First Term")
- ✅ Session matches what admin set (e.g., "2025/2026")
- ✅ Status is "Active" (green badge)
- ✅ Expiry date is 30 days from now

---

### Step 4: Database Check (30 seconds - Optional)

```sql
-- Check the latest PIN
SELECT 
  pin_code,
  term,
  session,
  active,
  TO_CHAR(created_at, 'YYYY-MM-DD HH24:MI') AS created,
  TO_CHAR(expires_at, 'YYYY-MM-DD HH24:MI') AS expires
FROM pins
ORDER BY created_at DESC
LIMIT 1;
```

**Expected Output:**
```
pin_code | term        | session    | active | created          | expires
---------|-------------|------------|--------|------------------|------------------
AB3C4DEF | First Term  | 2025/2026  | true   | 2025-10-26 14:30 | 2025-11-25 14:30
```

✅ `term` and `session` should match admin settings!

---

## 🔧 Test Scenarios

### Scenario 1: Admin Changes Term

**Before:**
- Current: First Term, 2025/2026

**Action:**
1. Admin changes to Second Term
2. Admin saves settings

**Test:**
1. Student generates NEW PIN
2. NEW PIN should show "Second Term - 2025/2026"
3. OLD PINs still show "First Term - 2025/2026" (unchanged)

**Result:** ✅ New PINs use new settings, old PINs unchanged

---

### Scenario 2: No Current Session Set

**Setup:**
1. Admin unchecks all "Current" boxes for sessions
2. Admin saves

**Test:**
1. Student tries to generate PIN

**Expected:**
```
❌ Error: No current session or term set by admin. 
   Please contact school administration.
```

**Result:** ✅ System prevents PIN generation without settings

---

### Scenario 3: Mid-Year Session Change

**Before:**
- Current: First Term, 2025/2026

**Action:**
1. Admin changes to First Term, 2026/2027 (new session)
2. Admin saves

**Test:**
1. Student generates PIN
2. PIN shows "First Term - 2026/2027"

**Result:** ✅ Immediately uses new session

---

## ✅ Success Criteria

| Check | Status |
|-------|--------|
| Admin can set current session | ✅ |
| Admin can set current term | ✅ |
| PIN uses admin's current session | ✅ |
| PIN uses admin's current term | ✅ |
| Error shown if no current set | ✅ |
| Display shows correct session/term | ✅ |
| Database stores correct values | ✅ |

---

## 📊 Quick Verification SQL

### Check Admin Settings

```sql
-- What's currently set as current?
SELECT * FROM kv_store_1ddd013a 
WHERE key IN ('academic_sessions', 'academic_terms');
```

### Check Latest PIN

```sql
-- Latest PIN details
SELECT 
  p.pin_code,
  p.term,
  p.session,
  p.active,
  prof.first_name || ' ' || prof.last_name AS student_name,
  p.created_at,
  p.expires_at
FROM pins p
LEFT JOIN profiles prof ON p.student_id = prof.id
ORDER BY p.created_at DESC
LIMIT 5;
```

### Check If Session/Term Match

```sql
-- Do PINs match current settings?
WITH current_settings AS (
  SELECT 
    (SELECT value FROM kv_store_1ddd013a WHERE key = 'academic_sessions') AS sessions,
    (SELECT value FROM kv_store_1ddd013a WHERE key = 'academic_terms') AS terms
)
SELECT 
  p.pin_code,
  p.session AS pin_session,
  p.term AS pin_term,
  'Check if matches current admin settings' AS note
FROM pins p
ORDER BY p.created_at DESC
LIMIT 5;
```

---

## 🎯 What to Look For

### ✅ CORRECT Behavior

```
Admin Sets: "Second Term - 2025/2026"
        ↓
PIN Shows:  "Second Term - 2025/2026"
        ↓
Database:   term="Second Term", session="2025/2026"
```

**Perfect sync!** ✅

### ❌ INCORRECT Behavior

```
Admin Sets: "Second Term - 2025/2026"
        ↓
PIN Shows:  "First Term - 2024/2025"
        ↓
Database:   term="First Term", session="2024/2025"
```

**Not synced!** ❌ (Should not happen now)

---

## 🚨 Common Issues

### Issue 1: PIN shows old term after admin changed it

**Not a bug!** 
- Existing PINs keep their original session/term
- Only NEW PINs use the new settings
- This is correct behavior

**Test:** Generate a NEW PIN - it should use new settings

---

### Issue 2: Error "No current session or term set"

**Cause:** Admin hasn't set current session/term

**Fix:**
1. Login as Principal
2. Settings → Session Settings
3. Mark one session as Current ✓
4. Mark one term as Current ✓
5. Save Settings
6. Try again

---

### Issue 3: Multiple students get different terms

**Check:** Did admin change settings between PIN generations?

**If yes:** This is normal
- Student A generated PIN when it was First Term
- Admin changed to Second Term
- Student B generated PIN when it was Second Term
- Both are correct!

**If no:** Something is wrong - check admin settings

---

## 📝 Test Report Template

```
PIN ADMIN SETTINGS TEST REPORT
Date: _______________
Tester: _______________

1. ADMIN SETTINGS
   Current Session: _______________
   Current Term: _______________
   Settings Saved: [Yes/No]

2. PIN GENERATION
   PIN Generated: [Yes/No]
   Error Message (if any): _______________
   
3. PIN DISPLAY
   Displayed Session: _______________
   Displayed Term: _______________
   Matches Admin Settings: [Yes/No]

4. DATABASE CHECK
   Stored Session: _______________
   Stored Term: _______________
   Matches Admin Settings: [Yes/No]

5. OVERALL RESULT
   Test Passed: [Yes/No]
   Notes: _______________
```

---

## 🎉 Expected Results

**If everything works:**

1. ✅ Admin sets "First Term - 2025/2026" as current
2. ✅ Student generates PIN
3. ✅ PIN shows "First Term - 2025/2026"
4. ✅ Database contains correct values
5. ✅ All synchronized!

**THE PIN SYSTEM NOW RESPECTS ADMIN SETTINGS!** 🎊

---

## ⏱️ Quick Test Checklist

- [ ] Admin has set current session
- [ ] Admin has set current term
- [ ] Student can generate PIN without error
- [ ] PIN displays correct session
- [ ] PIN displays correct term
- [ ] Database stores correct values
- [ ] Error shown if no current set
- [ ] Old PINs unchanged after admin changes settings
- [ ] New PINs use new settings immediately

**All checked?** You're good to go! ✅
