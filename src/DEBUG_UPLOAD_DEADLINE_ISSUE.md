# Debug Upload Deadline & Teacher Selection Issue

## 🐛 What to Check

### Step 1: Open Upload Form (as Admin/Principal)
1. Navigate to Uploads → Upload New
2. You should see a **BLUE DEBUG PANEL** at the top of the form

### Step 2: Check the Debug Panel
The debug panel shows:
```
🐛 Debug Info:
• User Role: [should show "admin"]
• Deadline Loaded: [Yes/No]
• Is Expired: [Yes/No]
• Requires Selection: [Yes/No]
• Teachers Loaded: [number]
• Should Show Field: [YES ✅ / NO ❌]
```

### Step 3: Check Browser Console
Open browser console (F12) and look for these logs:

```
[UploadForm] Component mounted, userRole: admin
[UploadForm] Fetching teachers for admin...
[UploadForm] Starting fetchTeachers...
[UploadForm] Teachers fetch response: {success: true, teachers: [...]}
[UploadForm] Teachers loaded: 5
[UploadForm] Checking deadline for: {term: "First Term", session: "2024/2025", type: "enote"}
[UploadForm] deadlineInfo updated: {allowed: true, isExpired: true, ...}
[UploadForm] Should show teacher field? {userRole: "admin", isAdmin: true, ...}
```

## 🔍 Common Issues & Fixes

### Issue 1: "Deadline Info keeps resetting"
**Symptom**: Alerts flash on/off rapidly
**Cause**: Form data changing triggers deadline check loop
**Check**: 
- Console shows repeated "[UploadForm] Checking deadline" messages
- deadlineInfo keeps resetting to null

**Fix**: The useEffect dependencies are correct. This might be a race condition.

### Issue 2: "Teacher field not showing"
**Symptom**: No yellow teacher selection box appears
**Debug Panel Shows**:
```
• Should Show Field: NO ❌
```

**Possible Causes**:
1. **User Role Not "admin"**
   - Check: Debug panel shows `User Role: teacher` or `User Role: principal`
   - Fix: The upload module passes role correctly, but check if principal should be treated as admin

2. **Deadline Info Not Loaded**
   - Check: Debug panel shows `Deadline Loaded: No`
   - Fix: Check console for deadline fetch errors

3. **Is Expired = False**
   - Check: Debug panel shows `Is Expired: No`
   - Reason: Deadline hasn't actually expired yet
   - Solution: Either wait for deadline OR create expired deadline in upload settings

4. **Teachers Not Loading**
   - Check: Debug panel shows `Teachers Loaded: 0`
   - Fix: Check console for teacher fetch errors
   - Verify: Teachers exist in profiles table with role='teacher'

### Issue 3: "Backend returns wrong data"
**Check Server Logs**:
Look for:
```
[Check Deadline] Checking for: {term: "...", session: "...", type: "...", userRole: "admin"}
[Check Deadline] Settings query result: {settings: {...}, settingsError: null}
```

**If No Settings Found**:
```
[Check Deadline] No settings found - allowing upload
```
Response: `{allowed: true, isExpired: false, requiresTeacherSelection: false}`
Result: Teacher field WON'T show (no deadline means no need to select teacher)

## ✅ Expected Behavior

### Scenario A: No Upload Settings Configured
```
Debug Panel:
• Deadline Loaded: Yes
• Is Expired: No
• Requires Selection: No
• Should Show Field: NO ❌
```
**Result**: No teacher field (normal upload)

### Scenario B: Deadline Not Expired
```
Debug Panel:
• Deadline Loaded: Yes
• Is Expired: No
• Requires Selection: No
• Should Show Field: NO ❌

Alert Shows: "Upcoming Deadline: ... must be submitted before [date]"
```
**Result**: No teacher field (normal upload with deadline warning)

### Scenario C: Deadline Expired (Admin View)
```
Debug Panel:
• Deadline Loaded: Yes
• Is Expired: Yes
• Requires Selection: Yes
• Teachers Loaded: 5
• Should Show Field: YES ✅

Alert Shows: "Deadline Expired: ... you can upload on behalf of teachers..."
```
**Result**: Yellow teacher selection field SHOULD appear

## 🛠️ Quick Fixes

### Fix 1: Check if upload_settings table exists
Run in Supabase SQL Editor:
```sql
SELECT * FROM upload_settings;
```

If table doesn't exist or is empty, create a test deadline:
```sql
INSERT INTO upload_settings (term, session, upload_type, deadline, created_at)
VALUES 
  ('First Term', '2024/2025', 'enote', '2024-01-01', NOW()),
  ('First Term', '2024/2025', 'exam_question', '2024-01-01', NOW());
```

This creates EXPIRED deadlines (2024-01-01 is in the past).

### Fix 2: Force teacher selection for admins
If you want admins to ALWAYS select a teacher (even without deadline), change the condition in UploadForm.tsx:

```typescript
// FROM:
{userRole === 'admin' && (deadlineInfo?.isExpired || deadlineInfo?.requiresTeacherSelection) && (

// TO:
{userRole === 'admin' && (
```

### Fix 3: Check user role in database
```sql
SELECT id, first_name, last_name, role, email 
FROM profiles 
WHERE email = 'your-admin-email@example.com';
```

Verify role is 'admin' or 'principal'.

## 📋 Testing Checklist

- [ ] Debug panel appears (blue box)
- [ ] Console shows component mounted log
- [ ] Console shows teachers fetch (if admin)
- [ ] Console shows deadline check
- [ ] Console shows deadline info updated
- [ ] Console shows "Should show teacher field" with all values
- [ ] Teacher field appears if conditions met
- [ ] Alerts don't flicker
- [ ] Can select teacher from dropdown
- [ ] Upload works with selected teacher

## 🎯 What Should Happen

1. **Admin opens form** → Fetches teachers immediately
2. **Selects term/session/type** → Checks deadline
3. **If deadline expired** → Shows orange alert + yellow teacher field
4. **Selects teacher** → Upload goes to that teacher
5. **After upload** → Shows in teacher's compliance with "Uploaded by Principal" badge

## 📞 Still Not Working?

Copy the following from your browser console and share:
1. All `[UploadForm]` log messages
2. The debug panel screenshot
3. The result of: `SELECT * FROM upload_settings LIMIT 5;`
4. Your user role from profiles table
