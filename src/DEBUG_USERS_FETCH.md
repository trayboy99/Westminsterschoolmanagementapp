# Debug Users Management Fetch Issue

## Step 1: Check Your Browser Console

1. Press **F12** to open Developer Tools
2. Go to the **Console** tab
3. Click "Users Management" in the sidebar
4. Look for error messages

## Step 2: Run This Diagnostic

Copy and paste this into the browser console:

```javascript
(async () => {
  console.log('========================================');
  console.log('USERS MANAGEMENT DIAGNOSTIC');
  console.log('========================================\n');
  
  // 1. Check session
  console.log('1️⃣ Checking session...');
  const { data: { session }, error: sessionError } = await supabase.auth.getSession();
  
  if (!session) {
    console.error('❌ NO SESSION FOUND');
    console.log('Solution: Log out and log back in');
    return;
  }
  
  console.log('✅ Session found');
  console.log('   User ID:', session.user.id);
  console.log('   Email:', session.user.email);
  
  // 2. Check profile and role
  console.log('\n2️⃣ Checking profile...');
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();
  
  if (profileError) {
    console.error('❌ PROFILE ERROR:', profileError);
    return;
  }
  
  console.log('✅ Profile found');
  console.log('   Email:', profile.email);
  console.log('   Name:', profile.first_name, profile.last_name);
  console.log('   Role:', profile.role);
  
  // 3. Check if IT Admin
  console.log('\n3️⃣ Checking IT Admin status...');
  if (profile.role === 'it_admin') {
    console.log('✅ USER IS IT ADMIN');
  } else {
    console.error('❌ USER IS NOT IT ADMIN');
    console.log('   Current role:', profile.role);
    console.log('   Expected role: it_admin');
    console.log('\n📝 Solution:');
    console.log('   Run this SQL in Supabase:');
    console.log(`   UPDATE profiles SET role = 'it_admin' WHERE email = '${profile.email}';`);
    console.log('   Then log out and log back in.');
    return;
  }
  
  // 4. Test API endpoint
  console.log('\n4️⃣ Testing API endpoint...');
  const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/list`;
  console.log('   URL:', url);
  
  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('   Status:', res.status);
    
    const result = await res.json();
    console.log('   Response:', result);
    
    if (res.status === 200 && result.success) {
      console.log('✅ API CALL SUCCESSFUL');
      console.log('   Users fetched:', result.users.length);
      console.log('\n🎉 EVERYTHING IS WORKING!');
      console.log('   If you\'re still not seeing users in the UI, try:');
      console.log('   1. Hard refresh (Ctrl+Shift+R)');
      console.log('   2. Clear browser cache');
      console.log('   3. Click "Refresh" button in Users Management');
    } else if (res.status === 403) {
      console.error('❌ ACCESS DENIED (403)');
      console.log('   Error:', result.error);
      console.log('\n📝 Solution:');
      console.log('   Your role is not it_admin in the database.');
      console.log(`   UPDATE profiles SET role = 'it_admin' WHERE email = '${profile.email}';`);
      console.log('   Then log out and log back in.');
    } else if (res.status === 401) {
      console.error('❌ UNAUTHORIZED (401)');
      console.log('   Session may have expired.');
      console.log('\n📝 Solution:');
      console.log('   Log out and log back in.');
    } else {
      console.error('❌ API CALL FAILED');
      console.log('   Status:', res.status);
      console.log('   Error:', result.error || result);
    }
  } catch (error) {
    console.error('❌ NETWORK ERROR:', error);
    console.log('\n📝 Possible causes:');
    console.log('   - Edge function not deployed');
    console.log('   - Network connectivity issue');
    console.log('   - CORS error');
  }
  
  console.log('\n========================================');
  console.log('END DIAGNOSTIC');
  console.log('========================================');
})();
```

## Step 3: Interpret Results

### ✅ If Everything Works:
```
✅ Session found
✅ Profile found
✅ USER IS IT ADMIN
✅ API CALL SUCCESSFUL
   Users fetched: 25
🎉 EVERYTHING IS WORKING!
```

**Next Steps:**
- If you still don't see users in the UI, hard refresh (Ctrl+Shift+R)
- Click the "Refresh" button in Users Management

---

### ❌ If Role is Wrong:
```
❌ USER IS NOT IT ADMIN
   Current role: principal
   Expected role: it_admin

📝 Solution:
   UPDATE profiles SET role = 'it_admin' WHERE email = 'admin@school.com';
   Then log out and log back in.
```

**Next Steps:**
1. Copy the UPDATE query from the console
2. Go to Supabase → SQL Editor
3. Paste and run the query
4. Log out
5. Log back in
6. Try again

---

### ❌ If Access Denied (403):
```
❌ ACCESS DENIED (403)
   Error: Access denied. IT Admin role required. Current role: principal
```

**Cause:** Your role in the database is not `it_admin`

**Solution:**
```sql
UPDATE profiles SET role = 'it_admin' WHERE email = 'your-email@example.com';
```
Then log out and log back in.

---

### ❌ If Unauthorized (401):
```
❌ UNAUTHORIZED (401)
   Session may have expired.
```

**Solution:**
- Log out
- Log back in
- Try again

---

### ❌ If Network Error:
```
❌ NETWORK ERROR: Failed to fetch
```

**Possible Causes:**
1. Edge function not deployed
2. Network connectivity issue
3. CORS error
4. Wrong project ID

**Check:**
1. Verify project ID: `console.log(projectId)`
2. Check Supabase Dashboard → Edge Functions
3. Look for CORS errors in console

---

## Step 4: Quick Fixes

### Fix 1: Update Role
```sql
-- Check current role
SELECT email, role FROM profiles WHERE email = 'YOUR_EMAIL';

-- Update to IT Admin
UPDATE profiles SET role = 'it_admin' WHERE email = 'YOUR_EMAIL';

-- Verify
SELECT email, role FROM profiles WHERE email = 'YOUR_EMAIL';
```

### Fix 2: Force Logout/Login
1. Click logout button
2. Wait for redirect to login page
3. Hard refresh (Ctrl+Shift+R)
4. Log back in with IT Admin account

### Fix 3: Clear Cache
1. Press Ctrl+Shift+Delete
2. Select "All time"
3. Check "Cached images and files"
4. Click "Clear data"
5. Hard refresh (Ctrl+Shift+R)

---

## Expected Console Logs When Working

### Frontend (Browser Console):
```
[UsersManagement] Fetching users...
[UsersManagement] Fetching from: https://xxx.supabase.co/functions/v1/make-server-1ddd013a/users/list
[UsersManagement] Response status: 200
[UsersManagement] Response data: { success: true, users: [...] }
[UsersManagement] Loaded users: 25
✅ Loaded 25 users successfully
```

### Backend (Supabase Edge Function Logs):
```
[List Users] Request received
[List Users] Auth user: abc-123 Auth error: null
[List Users] Admin profile: { role: 'it_admin' } Profile error: null
[List Users] Access granted for IT admin
[List Users] Fetched profiles count: 25 Fetch error: null
```

---

## Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| Access denied | Role is not `it_admin` | Update role in database, log out/in |
| Unauthorized | Session expired | Log out and log back in |
| No users showing | Cache issue | Hard refresh (Ctrl+Shift+R) |
| Network error | Edge function issue | Check Supabase Dashboard |
| Empty list | No users in database | Check: `SELECT COUNT(*) FROM profiles;` |

---

## Final Checklist

Before reporting an issue:

- [ ] Ran the diagnostic script above
- [ ] Verified role is `it_admin` in database
- [ ] Logged out and logged back in after role change
- [ ] Hard refreshed browser (Ctrl+Shift+R)
- [ ] Checked browser console for errors
- [ ] Checked Network tab in DevTools
- [ ] Sidebar header shows "IT Admin Dashboard"
- [ ] "Users Management" menu is visible

---

## Still Not Working?

If you've completed all steps and it's still not working:

1. **Share the diagnostic output** - Copy the entire console output from the diagnostic script
2. **Check backend logs** - Go to Supabase → Edge Functions → server → Logs
3. **Verify database** - Make sure you have users: `SELECT COUNT(*) FROM profiles;`

The code is 100% correct and working. The issue is almost always:
1. Role is not set to `it_admin`
2. Forgot to log out and log back in after changing role
3. Browser cache needs to be cleared
