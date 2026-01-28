# Quick Test Guide - Upload Deadline Fix ✅

## What Was Fixed

**Removed duplicate `/check-upload-deadline` endpoint** that was causing teachers to bypass expired deadlines.

---

## 🧪 Test 1: Teacher with Expired Deadline (Most Important!)

### Steps:
1. **Check database first:**
   ```sql
   SELECT term, session, upload_type, deadline 
   FROM upload_deadlines 
   WHERE enabled = true AND deadline < NOW();
   ```
   
2. **Log in as TEACHER** (not admin!)

3. **Navigate to:** Teacher Dashboard → Uploads → Upload Learning Materials

4. **Select:**
   - Term: (from query result)
   - Session: (from query result)
   - Upload Type: (from query result)

### ✅ Expected Result:

```
┌─────────────────────────────────────────────┐
│ ❌ Upload Deadline Expired                  │
│                                             │
│ The deadline for uploading has passed.     │
│                                             │
│ Upload Blocked:                            │
│ • Term: First Term                         │
│ • Session: 2025/2026                       │
│ • Type: e-notes                            │
│                                             │
│ Upload Button: DISABLED ❌                  │
└─────────────────────────────────────────────┘

[Upload Files] ← GRAYED OUT / DISABLED
```

### ❌ If You See This (WRONG):
```
┌─────────────────────────────────────────────┐
│ ✅ No Deadline Set                          │  ← WRONG!
│ You can upload at any time...              │
│ Button State: ENABLED ✅                    │  ← WRONG!
└─────────────────────────────────────────────┘

[Upload Files] ← ENABLED  ← WRONG!
```

**If you see the wrong result:** The fix didn't deploy properly. Redeploy the server.

---

## 🧪 Test 2: Admin with Expired Deadline

### Steps:
1. **Log in as ADMIN**
2. **Navigate to:** Admin Dashboard → Uploads → Upload Learning Materials
3. **Select same term/session/type** from Test 1

### ✅ Expected Result:

```
┌─────────────────────────────────────────────┐
│ ⚠️ Deadline Expired:                        │
│ As an admin, you can upload on behalf of   │
│ teachers. Please select the teacher below. │
│                                             │
│ Button State: ENABLED ✅ (Admin Override)  │
└─────────────────────────────────────────────┘

Select Teacher: [Dropdown Menu]

[Upload Files] ← ENABLED ✅
```

**Admin should be able to upload even when deadline expired!**

---

## 🧪 Test 3: Verify Console Logs

### Steps:
1. **Open Browser Console** (F12)
2. **As Teacher**, select term/session/type with expired deadline
3. **Look for these logs:**

```
=== DEADLINE CHECK START ===
[Deadline Check] Request: {"term":"First Term","session":"2025/2026","type":"e-notes","userRole":"teacher"}
[Deadline Check] Found 1 active deadlines
[MATCH FOUND] Deadline: {...}
[Deadline Check] Is Expired: true
[Deadline Check] ❌ TEACHER + EXPIRED → DISABLED
```

### ✅ Correct: 
- `Is Expired: true`
- `TEACHER + EXPIRED → DISABLED`

### ❌ Wrong (Old Behavior):
- `[Check Deadline] No settings found - allowing upload`
- `✅ ALLOWED → Button ENABLED`

---

## 🧪 Test 4: Check Database Directly

Run this SQL to see what the backend will find:

```sql
-- This is what the endpoint now checks
SELECT 
  term,
  session,
  upload_type,
  deadline,
  CASE 
    WHEN deadline > NOW() THEN 'ACTIVE - Upload Allowed ✅'
    WHEN deadline <= NOW() THEN 'EXPIRED - Teachers Blocked ❌'
  END as status,
  -- Calculate if expired
  (deadline <= NOW()) as is_expired
FROM upload_deadlines
WHERE enabled = true
  AND term = 'First Term'  -- Change to your term
  AND session = '2025/2026'  -- Change to your session
  AND (upload_type = 'e-notes' OR upload_type = 'all')  -- Checks specific type OR catch-all
ORDER BY deadline DESC;
```

If `is_expired = true`, teachers should NOT be able to upload!

---

## 🧪 Test 5: Catch-All Deadline

If you have a deadline with `upload_type = 'all'`:

### Steps:
1. **Create/verify catch-all deadline:**
   ```sql
   INSERT INTO upload_deadlines (term, session, upload_type, deadline, enabled)
   VALUES ('First Term', '2025/2026', 'all', '2025-11-01 23:59:59', true)
   ON CONFLICT DO NOTHING;
   ```

2. **Log in as TEACHER**

3. **Try ALL upload types:**
   - e-notes
   - exam-questions  
   - assignment
   - other-resources

### ✅ Expected Result:
**ALL types should be blocked** if deadline expired!

---

## Quick Checklist

- [ ] Test 1 passes (Teacher + Expired = DISABLED)
- [ ] Test 2 passes (Admin + Expired = ENABLED)
- [ ] Console shows `TEACHER + EXPIRED → DISABLED`
- [ ] Database query shows correct expired status
- [ ] Catch-all deadlines work for all types

---

## If Tests Fail

### Problem: Still seeing green "No Deadline Set"

**Solution:**
1. Verify server redeployed
2. Clear browser cache (Ctrl+Shift+R)
3. Check database has deadline with correct term/session/type
4. Check console logs to see what backend is finding

### Problem: Console shows "No settings found"

**Solution:**
1. Check database query:
   ```sql
   SELECT * FROM upload_deadlines 
   WHERE enabled = true 
   AND term = 'First Term' 
   AND session = '2025/2026';
   ```
2. Verify `enabled = true`
3. Verify term/session match exactly (case-sensitive!)
4. Check upload_type matches or is 'all'

---

## Success Criteria

✅ **Teachers CANNOT upload when deadline expired**
✅ **Admins CAN upload even when deadline expired**
✅ **Red alert shows for expired deadlines (teachers)**
✅ **Orange alert shows for expired deadlines (admins)**
✅ **Upload button disabled for teachers with expired deadlines**

---

**Date:** November 5, 2025
**Status:** Ready to test
