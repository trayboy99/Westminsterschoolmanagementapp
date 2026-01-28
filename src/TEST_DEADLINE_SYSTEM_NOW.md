# 🚀 Quick Test: Upload Deadline System

## Before You Start
1. ✅ Run `CREATE_UPLOAD_DEADLINES_TABLE.sql` in Supabase SQL Editor
2. ✅ Backend automatically deployed (no manual action needed)
3. ✅ Have admin and teacher login credentials

---

## 30-Second Test (Teacher View)

### Test 1: No Deadline ⏱️ 10 seconds
1. Login as **teacher**
2. Click "Upload Materials"
3. ✅ Should see **GREEN banner**: "No Deadline Set - Upload Anytime"
4. ✅ Upload button should be **ENABLED**

---

### Test 2: Create Deadline ⏱️ 1 minute
1. Logout, login as **admin**
2. Go to "Upload Management" → Click **Settings icon** (⚙️)
3. Click "Add Deadline"
4. Fill in:
   - Term: Auto-populated (e.g., "First Term")
   - Session: Auto-populated (e.g., "2025/2026")
   - Upload Type: **E-Notes**
   - Deadline: **Tomorrow at 11:59 PM**
   - Enabled: ✅ Checked
5. Click "Save Settings"
6. ✅ Should see: "Settings saved successfully. 1 deadline configured."

---

### Test 3: Teacher Sees Deadline ⏱️ 15 seconds
1. Logout, login as **teacher**
2. Go to "Upload Materials"
3. Select Upload Type: **E-Notes**
4. ✅ Should see **BLUE banner**:
   ```
   📅 Upload Deadline Set
   Deadline: [Tomorrow's date] 11:59:00 PM
   Current Status: Upload Enabled ✅
   ```
5. ✅ Upload button should be **ENABLED**

---

### Test 4: Expire Deadline ⏱️ 1 minute
1. Logout, login as **admin**
2. Go to Upload Settings (⚙️)
3. Click **Edit** on the e-notes deadline
4. Change deadline to **YESTERDAY at 11:59 PM**
5. Click "Save Settings"

---

### Test 5: Teacher Sees Expired ⏱️ 15 seconds
1. Logout, login as **teacher**
2. Refresh "Upload Materials" page
3. Select Upload Type: **E-Notes**
4. ✅ Should see **RED banner**:
   ```
   ❌ Upload Deadline Expired
   Upload Button: DISABLED ❌
   ```
5. ✅ Upload button should be **DISABLED** (grayed out)
6. ✅ Cannot click the upload button

---

### Test 6: Admin Can Still Upload ⏱️ 15 seconds
1. Logout, login as **admin**
2. Go to "Upload Materials"
3. Select Upload Type: **E-Notes**
4. ✅ Should see **ORANGE banner**:
   ```
   ⚠️ Deadline Expired
   Button State: ENABLED ✅ (Admin Override Active)
   ```
5. ✅ Should see **teacher selection dropdown**
6. ✅ Upload button should be **ENABLED**
7. ✅ Admin can upload on behalf of teachers

---

## Expected Results Summary

| Scenario | Teacher Banner | Teacher Button | Admin Button |
|----------|----------------|----------------|--------------|
| No deadline | 🟢 Green "No Deadline" | ✅ ENABLED | ✅ ENABLED |
| Active deadline | 🔵 Blue "Deadline Set" | ✅ ENABLED | ✅ ENABLED |
| Expired deadline | 🔴 Red "Expired" | ❌ DISABLED | ✅ ENABLED |

---

## Verification Queries

### Check deadline in database:
```sql
SELECT 
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN deadline < NOW() THEN '❌ EXPIRED'
    ELSE '✅ ACTIVE'
  END as status
FROM upload_deadlines;
```

### See what teacher sees:
```sql
SELECT 
  term,
  session,
  upload_type,
  deadline,
  NOW() > deadline as is_expired,
  CASE 
    WHEN NOW() > deadline THEN 'Button DISABLED for teachers ❌'
    ELSE 'Button ENABLED for teachers ✅'
  END as button_state
FROM upload_deadlines
WHERE enabled = true
  AND upload_type = 'e-notes';
```

---

## Quick Troubleshooting

### ❌ Teacher still sees "No Deadline Set"
**Check:**
```sql
SELECT * FROM upload_deadlines WHERE enabled = true;
```
- If no rows: Create deadline again in Upload Settings
- If row exists: Check term/session match exactly (case-sensitive)
- Refresh browser page (Ctrl+F5)

### ❌ Upload button not disabling
**Check:**
1. Deadline is actually expired:
   ```sql
   SELECT deadline, NOW(), deadline < NOW() FROM upload_deadlines;
   ```
2. User is logged in as **teacher** (admins can always upload)
3. Browser console logs for errors
4. Hard refresh page (Ctrl+F5)

### ❌ Admin sees disabled button
**This should never happen!**
- Admins always have upload enabled
- Check if logged in as correct role
- Check browser console for errors

---

## What Teachers CANNOT Do

### ❌ Teachers CANNOT:
- Set deadlines
- Edit deadlines
- Delete deadlines
- See deadline input fields on upload form
- Access Upload Settings menu
- Upload after deadline expires

### ✅ Teachers CAN:
- See deadline notifications (read-only)
- Upload before deadline
- Contact admin to request deadline changes
- View their upload history

---

## What Admins CAN Do

### ✅ Admins CAN:
- Create deadlines via Upload Settings
- Edit existing deadlines
- Delete deadlines
- Enable/disable deadlines
- Upload even after deadline
- Upload on behalf of teachers
- See which teachers met deadlines

---

## Success Criteria ✓

After testing, you should have:
- [ ] Created a deadline as admin
- [ ] Teacher saw blue banner before deadline
- [ ] Changed deadline to expired
- [ ] Teacher saw red banner and disabled button
- [ ] Admin saw orange banner and enabled button
- [ ] Admin can select teacher and upload on behalf
- [ ] No errors in browser console
- [ ] Database shows exactly 1 deadline (no duplicates)

---

## Next Steps After Testing

1. ✅ Set realistic deadlines for your school
2. ✅ Notify teachers about deadlines via email/announcement
3. ✅ Monitor compliance using admin dashboard
4. ✅ Use admin override to help teachers who missed deadline

---

**Total Test Time:** ~5 minutes
**Status:** Ready to test immediately!

**Quick Commands:**
```sql
-- 1. Check table exists
SELECT COUNT(*) FROM upload_deadlines;

-- 2. See all deadlines
SELECT * FROM upload_deadlines ORDER BY deadline DESC;

-- 3. Delete all deadlines (reset)
DELETE FROM upload_deadlines;
```
