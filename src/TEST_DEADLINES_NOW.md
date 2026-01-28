# 🚀 Test Upload Deadlines NOW - 5 Minute Guide

## Step 1: Run the SQL (1 minute)

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste contents of `/CREATE_UPLOAD_DEADLINES_TABLE.sql`
3. Click "Run"
4. Should see: "Success. No rows returned"

✅ **Verify:** Run this query:
```sql
SELECT COUNT(*) FROM upload_deadlines;
-- Should return 0 (table exists but empty)
```

## Step 2: Reload Backend (30 seconds)

The backend code has been automatically updated. If using Supabase Edge Functions:
- Changes will deploy automatically
- No manual action needed

## Step 3: Test as Admin (2 minutes)

### A. Login
```
Login as: principal@school.com
```

### B. Create Deadline
1. Go to: **Upload Management** (or wherever Upload Settings is)
2. Click: **Settings icon** ⚙️
3. Click: **Upload Deadlines** tab
4. Click: **Add Deadline** button
5. Fill in:
   - **Term:** First Term (should auto-populate)
   - **Session:** 2025/2026 (should auto-populate)
   - **Upload Type:** E-Notes
   - **Deadline:** Tomorrow at 11:59 PM
   - **Enable:** ✓ Checked
   - **Description:** "Test deadline"
6. Click: **Save Settings**

✅ **Expected:** Toast message: "1 deadline saved successfully!"

### C. Verify in Database
```sql
SELECT term, session, upload_type, deadline, enabled 
FROM upload_deadlines;
```

Should show:
```
term        | session   | upload_type | deadline            | enabled
First Term  | 2025/2026 | e-notes     | 2025-12-XX 23:59:00 | true
```

## Step 4: Test as Teacher (1 minute)

### A. Login as Teacher
```
Login as: any teacher account
```

### B. Go to Upload Page
1. Navigate to: **Teacher Dashboard**
2. Click: **Upload Materials** or **Upload Learning Materials**

### C. Check Deadline Display
At the top of the form, you should see:

```
✅ Deadline Set
📅 You have until [Tomorrow], 11:59 PM to upload e-notes for First Term, 2025/2026

Button State: ENABLED ✓
```

✅ **Expected:** Green or yellow banner with deadline info

### D. Verify Upload Button Works
1. Fill in:
   - **Title:** "Test Upload"
   - **Class:** Any class
   - **Subject:** Any subject
   - **Upload Type:** E-Notes
   - **File:** Any PDF
2. Click: **Upload** button
3. Should upload successfully ✓

## Step 5: Test Expired Deadline (1 minute)

### A. Change Deadline to Past (as Admin)
1. Login as admin
2. Go to Upload Settings
3. Edit the deadline:
   - Change date to: **Yesterday**
   - Keep everything else same
4. Save Settings

### B. Check Teacher View
1. Login as teacher
2. Go to Upload page
3. Should see:

```
❌ Deadline Expired
Upload deadline for e-notes expired on [Yesterday], 11:59 PM

Button State: DISABLED ✗
```

### C. Verify Button is Disabled
- Upload button should be grayed out
- Clicking shows: "Cannot upload - deadline has passed"
- Form should still be visible but submission blocked

✅ **Expected:** Button disabled, red alert banner

## Step 6: Test New Deadline Re-enables (30 seconds)

### A. Create Future Deadline (as Admin)
1. Go to Upload Settings
2. Delete old deadline (X button)
3. Add new deadline:
   - **Deadline:** Next week
   - Keep rest same
4. Save Settings

### B. Check Teacher View
1. Refresh page as teacher
2. Should see:

```
✅ Deadline Set
📅 You have until [Next Week], 11:59 PM to upload

Button State: ENABLED ✓
```

✅ **Expected:** Button enabled again, green banner

## Quick Verification Queries

### See All Deadlines with Status
```sql
SELECT 
  term,
  session,
  upload_type as type,
  deadline,
  enabled,
  CASE 
    WHEN deadline < NOW() THEN '❌ EXPIRED'
    ELSE '✅ ACTIVE'
  END as status,
  CASE 
    WHEN deadline < NOW() THEN 'Button DISABLED for teachers'
    ELSE 'Button ENABLED'
  END as button_state
FROM upload_deadlines
ORDER BY deadline DESC;
```

### Check What Teacher Sees for E-Notes
```sql
SELECT 
  'First Term' as checking_term,
  '2025/2026' as checking_session,
  'e-notes' as checking_type,
  deadline,
  NOW() > deadline as is_expired,
  CASE 
    WHEN NOW() > deadline THEN '🚫 Upload Button DISABLED'
    ELSE '✅ Upload Button ENABLED'
  END as teacher_will_see
FROM upload_deadlines
WHERE enabled = true
  AND term = 'First Term'
  AND session = '2025/2026'
  AND (upload_type = 'e-notes' OR upload_type = 'all');
```

## Troubleshooting

### "Table does not exist"
- Run Step 1 again
- Make sure SQL executed successfully

### Teachers Don't See Deadline
1. Check deadline exists:
   ```sql
   SELECT * FROM upload_deadlines WHERE enabled = true;
   ```
2. Check term/session match exactly:
   ```sql
   -- What's in database
   SELECT term, session FROM upload_deadlines;
   
   -- What's active in system
   SELECT session_name, is_current FROM sessions;
   SELECT name, is_current FROM terms;
   ```
3. Check browser console for errors
4. Verify backend is running (check `/make-server-1ddd013a/health`)

### Button Not Disabling When Expired
1. Verify deadline is actually expired:
   ```sql
   SELECT deadline, NOW(), deadline < NOW() as expired 
   FROM upload_deadlines 
   WHERE upload_type = 'e-notes';
   ```
2. Check user is teacher (admins can always upload)
3. Clear browser cache and reload

### Deadlines Still Duplicating
This shouldn't happen anymore. If it does:
```sql
-- Clean up duplicates manually
DELETE FROM upload_deadlines 
WHERE id NOT IN (
  SELECT MIN(id) 
  FROM upload_deadlines 
  GROUP BY term, session, upload_type
);
```

## Success Checklist ✓

After completing all steps:
- [ ] SQL table created
- [ ] Can create deadline in Upload Settings
- [ ] Teacher sees deadline banner
- [ ] Upload button enabled when deadline is future
- [ ] Upload button disabled when deadline is past
- [ ] New deadline re-enables button
- [ ] No duplicate deadlines when saving multiple times

## What Fixed

### Before (Broken):
- ❌ Deadlines saved to KV store
- ❌ Backend tried to read from non-existent table
- ❌ Teachers never saw deadlines
- ❌ Button always enabled
- ❌ Deadlines duplicated on every save

### After (Fixed):
- ✅ Deadlines saved to database table
- ✅ Backend reads from database
- ✅ Teachers see deadline banners
- ✅ Button disables when expired
- ✅ Delete-all-then-insert prevents duplicates

## Next Actions

1. **Run the SQL** → `/CREATE_UPLOAD_DEADLINES_TABLE.sql`
2. **Test as Admin** → Create a deadline
3. **Test as Teacher** → See the deadline
4. **Test Expiration** → Change to past date
5. **Verify Button** → Disabled when expired

**Estimated Time:** 5 minutes total

---

**🎯 Goal:** Teachers see deadlines and upload button responds correctly to deadline status.

**📁 Files Modified:**
- `/CREATE_UPLOAD_DEADLINES_TABLE.sql` - New table
- `/supabase/functions/server/index.tsx` - Backend endpoints
- `/DEADLINES_TABLE_COMPLETE_FIX.md` - Full documentation
- `/UPLOAD_FORM_FIELD_REFERENCE.md` - Field reference
- `/TEST_DEADLINES_NOW.md` - This quick start guide

**Status:** ✅ Ready to test!
