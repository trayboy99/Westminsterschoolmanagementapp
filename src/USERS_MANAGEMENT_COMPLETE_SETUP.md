# Users Management - Complete Setup & Troubleshooting Guide

## ✅ What Has Been Implemented

All code for the Users Management system has been successfully implemented:

### Frontend Components:
1. **`/components/UsersManagement.tsx`** - Main user management interface
2. **`/components/DashboardContent.tsx`** - Updated with IT Admin title and users section
3. **`/components/PrincipalSidebar.tsx`** - Updated with "Users Management" menu item

### Backend Endpoints:
4. **`/supabase/functions/server/index.tsx`** - Three new endpoints:
   - `GET /users/list` - Fetch all users with complete profiles
   - `POST /users/delete` - Delete a user
   - `POST /users/reset-password` - Reset user password

### Features Implemented:
- ✅ Dashboard title changes to "IT Admin Dashboard" for IT admins
- ✅ "Users Management" menu appears only for IT admins
- ✅ Complete user listing with data from profiles table + KV store
- ✅ Search by name, email, or phone
- ✅ Filter by role (Students, Teachers, Principals, IT Admins, Finance Admins)
- ✅ View complete user profile
- ✅ Reset user passwords
- ✅ Delete users from the system
- ✅ Role-based access control (only IT admins can access)
- ✅ Enhanced logging for debugging

---

## 🔧 Setup Instructions

### Step 1: Create or Promote an IT Admin

**Option A: Using Supabase SQL Editor**

1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Run the following query (replace the email):

```sql
-- Check current role
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email = 'your-email@example.com';

-- Update to IT Admin
UPDATE profiles 
SET role = 'it_admin' 
WHERE email = 'your-email@example.com';

-- Verify the change
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email = 'your-email@example.com';
```

**Option B: Quick Reference Script**

Use the provided SQL file: `/SETUP_IT_ADMIN_ROLE.sql`

---

### Step 2: Log Out and Log Back In

**This step is CRITICAL!**

1. Click the logout button in your dashboard
2. Wait for the page to fully reload
3. Clear your browser cache (or press Ctrl+Shift+R for hard refresh)
4. Log back in with the IT Admin account

Why? The auth context caches your profile data. Logging out and back in forces a fresh fetch from the database with your new role.

---

### Step 3: Verify IT Admin Access

After logging back in, you should see:

1. **Dashboard Title** (top of the page when on Overview):
   - ✅ Should show: **"IT Admin Dashboard"**
   - ❌ If it shows "Principal Dashboard", your role wasn't updated correctly

2. **Sidebar Menu**:
   - ✅ Should have a **"Users Management"** option
   - ❌ If you don't see it, your role is not `it_admin`

3. **Users Management Page**:
   - Click "Users Management" in the sidebar
   - You should see a list of all users
   - Search, filter, and action buttons should work

---

## 🐛 Troubleshooting

### Issue 1: Dashboard Still Shows "Principal Dashboard"

**Diagnosis:**
Your role in the database is not `it_admin`.

**Solution:**
1. Open browser console (F12)
2. Run this diagnostic:
   ```javascript
   const { data: { session } } = await supabase.auth.getSession();
   const { data: profile } = await supabase
     .from('profiles')
     .select('*')
     .eq('id', session.user.id)
     .single();
   console.log('Current role:', profile.role);
   ```
3. If the role is not `it_admin`, go back to Step 1
4. Make sure to log out and log back in after updating

---

### Issue 2: "Users Management" Menu Not Visible

**Diagnosis:**
The sidebar only shows this menu if `userProfile?.role === 'it_admin'`.

**Check:**
```sql
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';
```

**Solution:**
- Ensure role is exactly `it_admin` (not `director`, not `IT_ADMIN`, not `it_Admin`)
- Log out completely
- Clear browser cache
- Log back in

---

### Issue 3: Clicking "Users Management" Shows Error

**Possible Errors and Solutions:**

#### Error: "Access denied. IT Admin role required. Current role: principal"

**Cause:** Your role in the database is not `it_admin`.

**Solution:**
```sql
UPDATE profiles SET role = 'it_admin' WHERE email = 'your-email@example.com';
```
Then log out and log back in.

---

#### Error: "Session expired. Please log in again."

**Cause:** Your authentication session has expired.

**Solution:**
- Log out
- Log back in
- Try again

---

#### Error: "Failed to load users" or Network Error

**Cause:** Backend endpoint is not responding.

**Check:**
1. Open browser DevTools → Network tab
2. Look for the request to `/users/list`
3. Check the status code:
   - 200: Success (check response body for data)
   - 401: Unauthorized (session expired)
   - 403: Forbidden (role is not IT admin)
   - 404: Endpoint not found (backend issue)
   - 500: Server error (check backend logs)

**Solution:**
- For 401/403: Fix your role and re-login
- For 404/500: Check Supabase Edge Function logs

---

### Issue 4: Users List is Empty

**Diagnosis:**
Either no users exist or there's a database connection issue.

**Check:**
```sql
SELECT COUNT(*) FROM profiles;
```

If the count is > 0 but you see an empty list:
1. Open browser console
2. Look for error messages
3. Check the Network tab for the API response

---

## 📊 Diagnostic Tools

### Browser Console Diagnostic

Run this in your browser console (F12):

```javascript
(async () => {
  console.log('=== IT ADMIN DIAGNOSTIC ===');
  
  // Get session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('✅ Session exists:', !!session);
  
  // Get profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session?.user?.id)
    .single();
  
  console.log('✅ Current Profile:', profile);
  console.log('✅ Current Role:', profile?.role);
  console.log(profile?.role === 'it_admin' ? '✅ IS IT ADMIN' : '❌ NOT IT ADMIN');
  
  // Test endpoint
  try {
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/list`,
      {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      }
    );
    const result = await res.json();
    console.log('✅ API Response:', result);
    
    if (result.success) {
      console.log('✅ Successfully fetched', result.users.length, 'users');
    } else {
      console.error('❌ API Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Network Error:', error);
  }
  
  console.log('=== END DIAGNOSTIC ===');
})();
```

---

## 🎯 Expected Console Logs

### When Everything Works:

**Frontend (Browser Console):**
```
[UsersManagement] Fetching users...
[UsersManagement] Fetching from: https://xxx.supabase.co/functions/v1/make-server-1ddd013a/users/list
[UsersManagement] Response status: 200
[UsersManagement] Response data: { success: true, users: [...] }
[UsersManagement] Loaded users: 25
✅ Loaded 25 users successfully
```

**Backend (Supabase Edge Function Logs):**
```
[List Users] Request received
[List Users] Auth user: abc-123-def Auth error: null
[List Users] Admin profile: { role: 'it_admin' } Profile error: null
[List Users] Access granted for IT admin
[List Users] Fetched profiles count: 25 Fetch error: null
```

### When There's a Problem:

**Wrong Role:**
```
[List Users] Access denied. User role: principal
❌ API Error: Access denied. IT Admin role required. Current role: principal
```

**No Session:**
```
[UsersManagement] No session found
❌ Error: Session expired. Please log in again.
```

---

## 🔑 Role Reference

| Role | Database Value | Dashboard Title | Users Menu | Purpose |
|------|---------------|-----------------|------------|---------|
| IT Admin | `it_admin` | "IT Admin Dashboard" | ✅ Yes | Manage all users |
| Principal | `principal` | "Principal Dashboard" | ❌ No | Manage school operations |
| Teacher | `teacher` | N/A | ❌ No | Enter marks, upload files |
| Student | `student` | N/A | ❌ No | View results, materials |
| Finance Admin | `finance_admin` | "Finance Admin Dashboard" | ❌ No | Manage finances |

---

## 📋 Quick Checklist

Before reporting an issue, verify:

- [ ] Role in database is exactly `it_admin` (run SQL query to check)
- [ ] Logged out completely after changing role
- [ ] Cleared browser cache (or hard refresh with Ctrl+Shift+R)
- [ ] Logged back in with the correct email
- [ ] Dashboard title shows "IT Admin Dashboard"
- [ ] "Users Management" appears in sidebar
- [ ] Browser console shows no errors
- [ ] Network tab shows successful API call (status 200)

---

## 🚀 How to Use Users Management

Once you're logged in as IT Admin and can access Users Management:

### Search Users
- Type in the search box to filter by name, email, or phone
- Search is case-insensitive and searches across all fields

### Filter by Role
- Click role buttons to filter: All, Students, Teachers, Principals, IT Admins
- Count badge shows number of users in each role

### View Complete Profile
- Click 👁️ "View" button on any user
- See all information from profiles table and KV store
- Includes personal info, contact details, parent info (for students)

### Reset Password
- Click 🔑 "Reset Password" button
- Enter new password (min 8 characters)
- New password is immediately active
- ⚠️ **Security Note:** Communicate new password to user securely (in person, phone, etc.)

### Delete User
- Click 🗑️ "Delete" button
- Confirm deletion in dialog
- ⚠️ **Warning:** This is permanent and cannot be undone
- Removes user from:
  - Supabase Auth (cannot log in)
  - Profiles table
  - KV Store (extended profile data)
  - All related data (marks, uploads, etc.)

---

## 📞 Still Need Help?

If you've followed all steps and it's still not working:

1. **Check Console Logs:**
   - Open browser console (F12)
   - Look for red error messages
   - Copy the exact error message

2. **Check Network Logs:**
   - Open DevTools → Network tab
   - Find the `/users/list` request
   - Check status code and response

3. **Check Backend Logs:**
   - Supabase Dashboard → Edge Functions → server → Logs
   - Look for errors matching your request timestamp

4. **Run Diagnostic Script:**
   - Use the browser console diagnostic above
   - Copy the output

5. **Verify Database:**
   ```sql
   SELECT email, role FROM profiles WHERE role = 'it_admin';
   ```
   - Should show your email with `it_admin` role

---

## ✨ Summary

**Everything is implemented and ready to use.** The most common issue is forgetting to:
1. Update the role to `it_admin` (not `director`)
2. Log out completely
3. Log back in

Once you complete these steps, the Users Management system will work perfectly!

---

**Files Created:**
- `/SETUP_IT_ADMIN_ROLE.sql` - Quick SQL script to set up IT admin
- `/TROUBLESHOOTING_GUIDE.md` - Detailed troubleshooting guide
- `/USERS_MANAGEMENT_COMPLETE_SETUP.md` - This comprehensive guide

**Files Modified:**
- `/components/UsersManagement.tsx` - Enhanced logging
- `/components/DashboardContent.tsx` - IT Admin title support
- `/components/PrincipalSidebar.tsx` - Users menu for IT admins
- `/supabase/functions/server/index.tsx` - Backend endpoints with enhanced logging
