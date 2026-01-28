# Users Management Troubleshooting Guide

## Issue 1: Header Shows "Principal Dashboard" Instead of "IT Admin Dashboard"

### Root Cause
The dashboard title is determined by checking `userProfile?.role === 'it_admin'` in the DashboardContent component. If you're seeing "Principal Dashboard", it means the role is not `it_admin`.

### Solution Steps

1. **Check Your Current User's Role**
   
   Open browser console (F12) and run:
   ```javascript
   // Check auth context
   console.log('Current profile from context:', profile);
   ```

2. **Verify Role in Database**
   
   Run this SQL in Supabase SQL Editor:
   ```sql
   -- Check the role of the currently logged-in user
   SELECT id, email, first_name, last_name, role 
   FROM profiles 
   WHERE email = 'YOUR_EMAIL_HERE';
   ```

3. **Update Role to IT Admin**
   
   If the role is not `it_admin`, update it:
   ```sql
   UPDATE profiles 
   SET role = 'it_admin' 
   WHERE email = 'YOUR_EMAIL_HERE';
   ```

4. **Force Re-login**
   
   After updating the role:
   - Log out completely
   - Clear browser cache (or use Ctrl+Shift+R to hard refresh)
   - Log back in
   - The dashboard title should now show "IT Admin Dashboard"

---

## Issue 2: Failing to Fetch Users in Users Management

### Possible Causes & Solutions

### A. Role Permission Issue

**Symptom:** You can see the "Users Management" menu but clicking it shows an error.

**Check Console Logs:**
Open browser console and look for messages like:
- `[UsersManagement] Error from server: Access denied. IT Admin role required. Current role: principal`

**Solution:**
```sql
-- Update your role to it_admin
UPDATE profiles 
SET role = 'it_admin' 
WHERE email = 'YOUR_EMAIL_HERE';
```

Then log out and log back in.

---

### B. Session/Authentication Issue

**Symptom:** Error message says "Session expired" or "Unauthorized"

**Check:**
1. Open browser console
2. Run: `await (await fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/users/list', { headers: { 'Authorization': 'Bearer ' + (await supabase.auth.getSession()).data.session.access_token } })).json()`

**Solution:**
- Log out and log back in
- Clear browser cache
- Check that you're logged in with a valid account

---

### C. Backend Function Not Deployed

**Symptom:** Network error or 404 when trying to fetch users

**Check:**
1. Open browser DevTools → Network tab
2. Try to access Users Management
3. Look for the request to `/users/list`
4. Check the response status

**Solution:**
The backend function should be automatically deployed. If you see a 404:
1. Check that the Supabase edge function is running
2. Verify the URL format: `https://PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/users/list`

---

### D. CORS or Network Issue

**Symptom:** CORS error in browser console

**Check Console for:**
- `Access-Control-Allow-Origin` errors
- Network request blocked messages

**Solution:**
This should be handled automatically by the Supabase Edge Function. If you see CORS errors, the backend may need to be redeployed.

---

## Quick Diagnostic Script

Run this in your browser console (F12) to get all diagnostic info:

```javascript
(async () => {
  console.log('=== USERS MANAGEMENT DIAGNOSTIC ===');
  
  // 1. Check current session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('Session exists:', !!session);
  console.log('User ID:', session?.user?.id);
  
  // 2. Check profile from database
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session?.user?.id)
    .single();
  
  console.log('Profile:', profile);
  console.log('Current Role:', profile?.role);
  console.log('Is IT Admin?', profile?.role === 'it_admin');
  
  // 3. Test users/list endpoint
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
    console.log('Users List Response:', result);
    
    if (result.success) {
      console.log('✅ Successfully fetched users:', result.users.length);
    } else {
      console.error('❌ Error:', result.error);
    }
  } catch (error) {
    console.error('❌ Fetch Error:', error);
  }
  
  console.log('=== END DIAGNOSTIC ===');
})();
```

---

## Expected Behavior

### When Everything Works:

1. **As IT Admin (`it_admin` role):**
   - ✅ Dashboard title: "IT Admin Dashboard"
   - ✅ Sidebar menu includes "Users Management"
   - ✅ Clicking "Users Management" shows the user list
   - ✅ Can search, filter, view, reset passwords, and delete users

2. **Console Logs (Success):**
   ```
   [UsersManagement] Fetching users...
   [UsersManagement] Fetching from: https://xxx.supabase.co/functions/v1/make-server-1ddd013a/users/list
   [UsersManagement] Response status: 200
   [UsersManagement] Response data: { success: true, users: [...] }
   [UsersManagement] Loaded users: 25
   ```

3. **Backend Logs (Success):**
   ```
   [List Users] Request received
   [List Users] Auth user: abc-123 Auth error: null
   [List Users] Admin profile: { role: 'it_admin' } Profile error: null
   [List Users] Access granted for IT admin
   [List Users] Fetched profiles count: 25 Fetch error: null
   ```

### When There's an Issue:

1. **Wrong Role:**
   ```
   [List Users] Access denied. User role: principal
   Error: Access denied. IT Admin role required. Current role: principal
   ```

2. **No Session:**
   ```
   [UsersManagement] No session found
   Error: Session expired. Please log in again.
   ```

---

## Still Not Working?

If after following all steps above you still have issues:

1. **Verify You've Updated the Role:**
   ```sql
   SELECT email, role FROM profiles WHERE email = 'YOUR_EMAIL';
   ```
   Expected: `role = 'it_admin'`

2. **Clear Everything:**
   - Log out
   - Clear browser cache (Ctrl+Shift+Delete → Clear all)
   - Close all browser tabs
   - Reopen browser
   - Log in again

3. **Check Backend Logs:**
   - Go to Supabase Dashboard
   - Edge Functions → server → Logs
   - Look for errors when you click "Users Management"

4. **Manual Test:**
   Open a new tab and test the endpoint directly:
   - Get your access token from browser console:
     ```javascript
     (await supabase.auth.getSession()).data.session.access_token
     ```
   - Use Postman or curl to test:
     ```bash
     curl -X GET \
       'https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/users/list' \
       -H 'Authorization: Bearer YOUR_ACCESS_TOKEN' \
       -H 'Content-Type: application/json'
     ```

---

## Common Mistakes

1. ❌ **Using `director` instead of `it_admin`**
   - Old role: `director` 
   - Correct role: `it_admin`

2. ❌ **Not logging out after role change**
   - The auth context caches the profile
   - Must log out and log back in

3. ❌ **Checking wrong user's role**
   - Make sure you're updating the role for the email you're logged in with

4. ❌ **Browser cache**
   - Old JavaScript/React state may be cached
   - Hard refresh (Ctrl+Shift+R) or clear cache

---

## Quick Fix Checklist

- [ ] Run: `UPDATE profiles SET role = 'it_admin' WHERE email = 'YOUR_EMAIL';`
- [ ] Log out completely
- [ ] Clear browser cache (or hard refresh with Ctrl+Shift+R)
- [ ] Log back in
- [ ] Check dashboard title (should say "IT Admin Dashboard")
- [ ] Check sidebar (should have "Users Management" menu)
- [ ] Click "Users Management"
- [ ] Check browser console for any errors
- [ ] Verify users are loading

---

## Contact Information

If you've followed all steps and it's still not working, check:
1. Browser console for detailed error messages
2. Supabase Edge Function logs
3. Network tab to see the actual API request/response

All the code has been implemented correctly. The most common issue is forgetting to update the role to `it_admin` and logging out/in after the change.
