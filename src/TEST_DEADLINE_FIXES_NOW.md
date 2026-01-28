# Quick Test: Deadline Fixes

## 🚀 Test in 5 Minutes

### Step 1: Create Test Deadlines

Run this SQL in Supabase:

```sql
-- Clear existing deadlines
DELETE FROM upload_settings;

-- Create 1 ACTIVE deadline (future)
INSERT INTO upload_settings (term, session, upload_type, deadline, enabled, created_at)
VALUES 
  ('First Term', '2024/2025', 'enote', '2025-12-31 23:59:00', true, NOW());

-- Create 1 EXPIRED deadline (past)
INSERT INTO upload_settings (term, session, upload_type, deadline, enabled, created_at)
VALUES 
  ('Second Term', '2024/2025', 'enote', '2024-01-01 00:00:00', true, NOW());
```

**Result**: You now have:
- 1 active deadline (December 2025 - in future)
- 1 expired deadline (January 2024 - in past)

---

### Step 2: Check Active Deadline Count

1. **Login as Admin**
2. **Go to**: Uploads → Settings Tab
3. **Look for text**: "Manage global settings, deadlines..."

**Expected Result**:
```
✓ 1 deadline currently active
```

**❌ WRONG if it shows**: "✓ 2 deadlines currently active"

**✅ CORRECT if it shows**: "✓ 1 deadline currently active"

---

### Step 3: Test Expired Deadline Alert

1. **Stay logged in as Admin**
2. **Click**: "Upload New" button
3. **Select**:
   - Term: **Second Term**
   - Session: **2024/2025**
   - Type: **E-Notes**
4. **Wait 2 seconds**
5. **Watch the alert area**

**Expected Result**:
```
┌─────────────────────────────────────────────────┐
│ ⚠️  Deadline Expired                            │
│ Upload deadline has passed. As an admin, you   │
│ can upload on behalf of teachers. Please       │
│ select the teacher below.                      │
└─────────────────────────────────────────────────┘
```

**This alert should**:
- ✅ Appear once
- ✅ STAY visible (not flicker)
- ✅ Not disappear and reappear

**❌ FAIL if**: Alert flickers on/off rapidly
**✅ PASS if**: Alert shows once and stays

---

### Step 4: Check Debug Panel

With the same form open, scroll down to see:

```
┌─────────────────────────────────────────────────┐
│ 🐛 Debug Info:                                  │
│ • User Role: admin                              │
│ • Deadline Loaded: Yes                          │
│ • Is Expired: Yes                               │
│ • Requires Selection: Yes                       │
│ • Teachers Loaded: 2                            │
│ • Teacher Field: ALWAYS SHOWS FOR ADMIN ✅      │
│ • Field Color: Yellow (Expired)                 │
└─────────────────────────────────────────────────┘
```

**✅ PASS if**:
- Is Expired: **Yes**
- Field Color: **Yellow (Expired)**

---

### Step 5: Test Active Deadline Alert

1. **Stay on upload form**
2. **Change to**:
   - Term: **First Term**
   - Session: **2024/2025**
   - Type: **E-Notes**
3. **Watch alert area**

**Expected Result**:
```
┌─────────────────────────────────────────────────┐
│ 🕐  Upcoming Deadline                           │
│ Uploads for First Term, 2024/2025 must be     │
│ submitted before 12/31/2025, 11:59:00 PM      │
└─────────────────────────────────────────────────┘
```

**Debug panel should show**:
```
• Is Expired: No
• Field Color: Purple (Normal)
```

**✅ PASS if**:
- Blue "Upcoming Deadline" alert shows
- Alert is stable (no flickering)
- Debug shows "Is Expired: No"

---

### Step 6: Check Console Logs

1. **Open browser console** (F12)
2. **Refresh the page**
3. **Go to Upload New**
4. **Look for these logs**:

**Expected (Good)**:
```
[UploadForm] Component mounted, userRole: admin
[UploadForm] Fetching teachers for admin...
[UploadForm] Checking deadline for: {term: "First Term", ...}
[UploadForm] checkDeadline called
[UploadForm] checkDeadline result: {...}
[UploadForm] Setting deadlineInfo to: {...}
```

**Count**: Should see `checkDeadline called` **ONCE**

**❌ FAIL if**: You see it called multiple times in rapid succession
**✅ PASS if**: Called only once per term/session/type selection

---

## 📋 Quick Pass/Fail Checklist

- [ ] Active deadline count shows **1** (not 2)
- [ ] Expired deadline alert appears
- [ ] Expired deadline alert **stays visible** (doesn't flicker)
- [ ] Debug panel shows "Is Expired: Yes" for expired deadline
- [ ] Yellow teacher field shows for expired deadline
- [ ] Active deadline alert shows for future deadline
- [ ] Debug panel shows "Is Expired: No" for active deadline
- [ ] Purple teacher field shows for active deadline
- [ ] Console shows `checkDeadline called` only **once** per selection
- [ ] No rapid flickering or repeated API calls

**All checked?** = All fixes working! 🎉

---

## 🐛 If Something's Not Working

### Issue: Still shows "2 deadlines active"

**Check**:
```sql
SELECT term, session, upload_type, deadline, enabled,
       CASE 
         WHEN deadline > NOW() THEN 'ACTIVE'
         ELSE 'EXPIRED'
       END as status
FROM upload_settings
WHERE enabled = true;
```

**Fix**: Make sure you have exactly 1 with status='ACTIVE'

---

### Issue: Alert still flickering

**Check console**: Do you see multiple `checkDeadline called` messages?

**If yes**: The useRef fix didn't work. Check that:
- You imported `useRef` from 'react'
- The `lastDeadlineCheck` ref is declared before the useEffect
- The useEffect is checking the ref value correctly

**Share console output** for more help

---

### Issue: Debug panel shows "Deadline Loaded: No"

**Check**: 
1. Is the backend running?
2. Any errors in console?
3. Network tab - is the deadline check API call succeeding?

**Fix**: Check backend server logs

---

## 🎯 Success Criteria

### Visual Test
✅ Open form → See alert → Alert stays (no flicker)

### Count Test  
✅ Settings shows "1 deadline active" (not 2)

### Console Test
✅ `checkDeadline` called only once per selection

**All three pass?** = Perfect! 🎉

---

## 📞 Still Having Issues?

Copy and share:
1. Screenshot of active deadline count
2. Screenshot of upload form with alert
3. Console logs (all `[UploadForm]` messages)
4. Result of this SQL:
   ```sql
   SELECT * FROM upload_settings;
   ```

This will help diagnose any remaining issues!
