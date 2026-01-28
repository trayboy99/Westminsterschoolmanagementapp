# Quick Test: Admin Upload Feature

## 🚀 How to Test Right Now

### Step 1: Login as Admin
Use your principal/admin account

### Step 2: Navigate to Uploads
Click: **Uploads** → **Upload New** button

### Step 3: Look for Teacher Field
You should immediately see:
```
┌─────────────────────────────────────────┐
│ 🟣 Purple Box                            │
│                                          │
│ Upload for Teacher (Optional)            │
│                                          │
│ [Dropdown with all teachers]             │
│                                          │
│ 💡 Helper text at bottom                 │
└─────────────────────────────────────────┘
```

✅ **SUCCESS**: If you see this purple box, it's working!

❌ **PROBLEM**: If you don't see it, check the debug panel above it

### Step 4: Check Debug Panel
Look for blue box at top:
```
🐛 Debug Info:
• User Role: admin ← Should say "admin"
• Teachers Loaded: 2 ← Should be > 0
• Teacher Field: ALWAYS SHOWS FOR ADMIN ✅
```

### Step 5: Test Upload
1. Select a teacher from dropdown (or leave as yourself)
2. Fill in title: "Test Upload"
3. Select subject
4. Add a test file
5. Click "Upload Files"

### Step 6: Verify in Compliance
1. Go to **Compliance Tracker**
2. Find the teacher you selected
3. Look for your upload
4. Should show **purple badge** "Uploaded by Principal" (if uploaded for someone else)

---

## 🐛 Troubleshooting

### Issue: Teacher field not showing
**Check**:
1. Debug panel shows `User Role: admin`?
2. Debug panel shows `Teachers Loaded: 2` (or more)?
3. Browser console for errors?

**Fix**: Refresh page, check user role in database

### Issue: Teachers dropdown is empty
**Check**:
1. Console shows `[UploadForm] Teachers loaded: 0`?
2. Do teachers exist in database?

**Fix**: Run this SQL:
```sql
SELECT id, first_name, last_name, email, role 
FROM profiles 
WHERE role = 'teacher';
```

### Issue: Date error when creating deadline
**Check**: Did you update UploadSettings.tsx?

**Fix**: The code has been updated - refresh your app

---

## 📋 Expected Behavior

### ✅ What Should Happen

1. **Purple teacher field ALWAYS shows for admins** ✓
2. **Can select any teacher** ✓
3. **Can upload for self or others** ✓
4. **Upload saves correctly** ✓
5. **Shows in compliance with badge** ✓
6. **No date errors** ✓

### ❌ What Should NOT Happen

1. ❌ Field hidden before deadline expires
2. ❌ "Loading teachers..." stuck forever
3. ❌ Date picker crashes
4. ❌ Upload fails
5. ❌ Badge doesn't show

---

## 🎯 Quick Verification

Run through this in 2 minutes:

1. ✓ Login as admin
2. ✓ Click "Upload New"
3. ✓ See purple teacher field
4. ✓ See debug panel
5. ✓ Select a teacher
6. ✓ Add test file
7. ✓ Upload successfully
8. ✓ Check compliance tracker
9. ✓ See purple badge

**All checked?** Feature is working! 🎉

---

## 💡 Tips

- **Purple box** = Normal operation
- **Yellow box** = Deadline expired (more urgent)
- **Debug panel** = Your diagnostic tool
- **Console logs** = Detailed debugging

---

## 🆘 Still Having Issues?

Copy and share:
1. Screenshot of debug panel
2. Screenshot of teacher field (or lack of)
3. Browser console logs (all `[UploadForm]` messages)
4. Your user role from database:
   ```sql
   SELECT role FROM profiles WHERE email = 'your@email.com';
   ```

This will help diagnose the issue quickly!
