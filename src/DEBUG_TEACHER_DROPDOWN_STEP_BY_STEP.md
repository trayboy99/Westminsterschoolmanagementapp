# 🔍 Debug Teacher Dropdown - Step by Step

## Issue
Teachers not showing in dropdown on Teacher Salaries page.

---

## ✅ Step 1: Check Database (Most Important!)

**Run this SQL in Supabase SQL Editor:**

```sql
SELECT 
  COUNT(*) as total_teachers
FROM profiles 
WHERE role = 'teacher';
```

### Expected Result:
- Should show a number > 0

### If Result is 0:
**You have NO teachers in the database!** 

**Quick Fix - Add a test teacher:**
```sql
-- Add a test teacher
INSERT INTO profiles (
  first_name,
  last_name,
  email,
  role
) VALUES (
  'Test',
  'Teacher',
  'test.teacher@school.com',
  'teacher'
);
```

---

## ✅ Step 2: Check Browser Console

1. **Open Developer Tools:** Press `F12`
2. **Go to Console tab**
3. **Refresh the page** (Ctrl+Shift+R)
4. **Navigate to:** Finance → Teacher Salaries

### Look for these logs:

**✅ GOOD (Should see):**
```
[TeacherSalaries] Fetching teachers from /users?role=teacher
[TeacherSalaries] Response status: 200
[TeacherSalaries] Response data: {success: true, teachers: Array(5)}
[TeacherSalaries] Setting teachers: 5 teachers found
```

**❌ BAD (Problems):**
```
401 Unauthorized
[TeacherSalaries] Failed to fetch teachers: Unauthorized
```
→ **Authentication problem** - Try logging out and back in

```
[TeacherSalaries] Response data: {success: true, teachers: []}
[TeacherSalaries] Setting teachers: 0 teachers found
```
→ **No teachers in database** - See Step 1

```
404 Not Found
```
→ **Backend endpoint missing** - Backend not deployed

---

## ✅ Step 3: Check Network Tab

1. **F12 → Network tab**
2. **Filter by:** XHR
3. **Refresh page**
4. **Navigate to Teacher Salaries**
5. **Look for request:** `/users?role=teacher`

### Click on the request and check:

**Response Tab should show:**
```json
{
  "success": true,
  "users": [
    {
      "id": "uuid...",
      "first_name": "John",
      "last_name": "Doe",
      "email": "john@school.com",
      "role": "teacher"
    }
  ],
  "teachers": [ /* same array */ ]
}
```

**If you see:**
```json
{
  "success": false,
  "error": "Unauthorized"
}
```
→ **Authentication issue** - See Step 4

---

## ✅ Step 4: Fix Authentication

### Clear Browser Storage:
1. **F12 → Application tab**
2. **Storage → Local Storage**
3. **Right-click → Clear**
4. **Storage → Session Storage**
5. **Right-click → Clear**
6. **Refresh page** (F5)
7. **Login again**

---

## ✅ Step 5: Verify You're Director

Only **Directors** can access Teacher Salaries.

**Check in SQL:**
```sql
SELECT 
  email,
  role
FROM profiles
WHERE email = 'your-email@school.com';
```

Should show: `role = 'director'`

**If not director, update:**
```sql
UPDATE profiles
SET role = 'director'
WHERE email = 'your-email@school.com';
```

---

## ✅ Step 6: Check Backend Logs

**In Supabase:**
1. Go to **Edge Functions**
2. Click on your function
3. Check **Logs**
4. Look for:
```
[Users] Fetching users with role: teacher
[Users] Found X teachers
```

---

## 🎯 Quick Diagnostic Checklist

Run this to see EVERYTHING:

```sql
-- 1. Do you have teachers?
SELECT COUNT(*) FROM profiles WHERE role = 'teacher';

-- 2. Are you a director?
SELECT role FROM profiles WHERE email = 'YOUR_EMAIL_HERE';

-- 3. List all users by role
SELECT role, COUNT(*) FROM profiles GROUP BY role;
```

---

## 🔧 Common Issues & Fixes

### Issue 1: "0 teachers found"
**Cause:** No teachers in database  
**Fix:** Add teachers via Users Management or SQL

### Issue 2: "401 Unauthorized"
**Cause:** Authentication token expired  
**Fix:** Logout and login again

### Issue 3: "404 Not Found on /users"
**Cause:** Backend not deployed  
**Fix:** Ensure `/supabase/functions/server/index.tsx` has the `/users` endpoint

### Issue 4: "Access Denied"
**Cause:** Not logged in as Director  
**Fix:** Change your role to `director` in database

### Issue 5: Dropdown shows "undefined" 
**Cause:** Frontend parsing issue  
**Fix:** Already fixed in latest code with fallback to `teachersData.users`

---

## 🚀 Nuclear Option (Last Resort)

If nothing works:

### 1. Hard Refresh
```
Windows/Linux: Ctrl + Shift + R
Mac: Cmd + Shift + R
```

### 2. Clear All Cache
```
F12 → Network tab → Right-click Refresh button → Empty Cache and Hard Reload
```

### 3. Incognito Mode
```
Ctrl + Shift + N (Windows/Linux)
Cmd + Shift + N (Mac)
```

### 4. Check Different Browser
Try Chrome, Firefox, or Edge

---

## 📊 What Success Looks Like

### In Console:
```
✅ [TeacherSalaries] Setting teachers: 5 teachers found
```

### In Dropdown:
```
┌─────────────────────────────────────┐
│ Select Teacher              ▼      │
├─────────────────────────────────────┤
│ John Doe - john@school.com         │
│ Jane Smith - jane@school.com       │
│ Mike Johnson - mike@school.com     │
└─────────────────────────────────────┘
```

---

## 🆘 Still Not Working?

### Copy and send me:

1. **Console logs** (everything from console)
2. **Network response** (from /users?role=teacher request)
3. **SQL result:**
```sql
SELECT COUNT(*) FROM profiles WHERE role = 'teacher';
SELECT email, role FROM profiles WHERE email = 'YOUR_EMAIL';
```

---

**Created:** November 11, 2025  
**For:** Teacher Salaries Dropdown Debug
