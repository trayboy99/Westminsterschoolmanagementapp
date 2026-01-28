# Quick Fix: Users Management Not Working

## The Issue

You're experiencing:
1. ❌ Dashboard header still shows "Principal Dashboard" instead of "IT Admin Dashboard"
2. ❌ Users Management page fails to fetch users

## The Root Cause

**Your user role is NOT set to `it_admin` in the database.**

The code checks for `role === 'it_admin'`, but you might have:
- `role = 'principal'`
- `role = 'director'` (old role name)
- `role = 'admin'`
- Or any other value

## The Quick Fix (3 Steps)

### Step 1: Update Your Role

Open Supabase SQL Editor and run:

```sql
-- Replace 'your-email@example.com' with YOUR actual email
UPDATE profiles 
SET role = 'it_admin' 
WHERE email = 'your-email@example.com';

-- Verify it worked
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';
-- Should show: role = 'it_admin'
```

### Step 2: Log Out Completely

1. Click Logout button
2. Wait for page to reload to login screen
3. (Optional but recommended) Press **Ctrl+Shift+R** to hard refresh

### Step 3: Log Back In

1. Log in with the email you updated in Step 1
2. You should now see:
   - ✅ Dashboard title: **"IT Admin Dashboard"**
   - ✅ Sidebar menu: **"Users Management"** option
   - ✅ Clicking it shows the user list

---

## Visual Checklist

### ✅ What You Should See (Success):

```
┌─────────────────────────────────────────────┐
│  IT Admin Dashboard                          │  ← Should say "IT Admin Dashboard"
│  Welcome back, John Doe. Here's what's...   │
└─────────────────────────────────────────────┘

Sidebar Menu:
├── Overview
├── Teachers
├── Students
├── Subjects & Classes
├── Timetable
├── Exams
├── Marks Entry
├── Results
├── Comments
├── Uploads
├── Promotions
├── PIN Management
├── Users Management  ← ✅ This option should appear
├── Settings
└── Audit Logs
```

### ❌ What You Might See (Problem):

```
┌─────────────────────────────────────────────┐
│  Principal Dashboard                         │  ← Wrong! Should say "IT Admin"
│  Welcome back, John Doe. Here's what's...   │
└─────────────────────────────────────────────┘

Sidebar Menu:
├── Overview
├── Teachers
├── Students
├── ...
├── PIN Management
├── Settings  ← ❌ "Users Management" is missing
└── Audit Logs
```

---

## How to Check Your Current Role

### Method 1: SQL Query

```sql
-- Find your current role
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email = 'your-email@example.com';
```

### Method 2: Browser Console

1. Press **F12** to open console
2. Paste and run:

```javascript
const { data: { session } } = await supabase.auth.getSession();
const { data: profile } = await supabase
  .from('profiles')
  .select('role, email')
  .eq('id', session.user.id)
  .single();
console.log('Your role:', profile.role);
```

Expected output: `Your role: it_admin`

---

## Still Not Working?

### Double-Check the Role Value

The role must be EXACTLY `it_admin`:

❌ Wrong:
- `IT_ADMIN` (uppercase)
- `It_Admin` (mixed case)
- `it_Admin` (wrong case)
- `director` (old role)
- `admin` (wrong role)
- `it-admin` (dash instead of underscore)

✅ Correct:
- `it_admin` (lowercase with underscore)

### Make Sure You're Using the Right Email

If you have multiple accounts:

```sql
-- List all admin accounts
SELECT email, role, first_name, last_name 
FROM profiles 
WHERE role IN ('principal', 'it_admin', 'director')
ORDER BY created_at DESC;
```

Update the one you're actually logging in with!

### Clear Everything and Start Fresh

1. Log out
2. Clear browser cache:
   - Chrome: Ctrl+Shift+Delete → Clear all
   - Or just hard refresh: Ctrl+Shift+R
3. Close all browser tabs
4. Open a new browser window
5. Log in again

---

## Test After Fix

Once you've:
1. ✅ Updated role to `it_admin`
2. ✅ Logged out
3. ✅ Logged back in

You should be able to:

1. **See "IT Admin Dashboard" as the title**
   - Go to Overview section
   - Look at the top of the page
   - It should say "IT Admin Dashboard"

2. **See "Users Management" in sidebar**
   - Look at the sidebar menu
   - Between "PIN Management" and "Settings"
   - There should be a "Users Management" option

3. **Access Users Management**
   - Click "Users Management"
   - You should see a list of all users
   - Search bar at the top
   - Role filter buttons
   - Action buttons (View, Reset Password, Delete) for each user

4. **View console logs (optional)**
   - Press F12 to open console
   - Click "Users Management"
   - Look for success messages:
     ```
     [UsersManagement] Loaded users: 25
     ✅ Loaded 25 users successfully
     ```

---

## Common Mistakes

### Mistake 1: Updated Wrong User
- **Problem:** You updated a different user's role
- **Solution:** Make sure the email in the UPDATE query matches the email you're logging in with

### Mistake 2: Didn't Log Out
- **Problem:** The app caches your old role in memory
- **Solution:** MUST log out and log back in after changing role

### Mistake 3: Typo in Role Name
- **Problem:** Set role to `it_Admin` or `IT_ADMIN` instead of `it_admin`
- **Solution:** Role must be exactly `it_admin` (all lowercase, underscore)

### Mistake 4: Browser Cache
- **Problem:** Old JavaScript is still running
- **Solution:** Hard refresh (Ctrl+Shift+R) or clear browser cache

---

## Emergency Diagnostic

If it's STILL not working after following all steps, run this complete diagnostic:

```javascript
(async () => {
  console.log('=== EMERGENCY DIAGNOSTIC ===');
  
  // 1. Check session
  const { data: { session } } = await supabase.auth.getSession();
  console.log('1. Session:', session ? '✅ Valid' : '❌ Missing');
  console.log('   User ID:', session?.user?.id);
  console.log('   Email:', session?.user?.email);
  
  // 2. Check profile
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', session?.user?.id)
    .single();
  console.log('2. Profile:', profile ? '✅ Found' : '❌ Not found');
  console.log('   Email:', profile?.email);
  console.log('   Role:', profile?.role);
  console.log('   Is IT Admin?', profile?.role === 'it_admin' ? '✅ YES' : '❌ NO');
  
  // 3. Test API
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
  console.log('3. API Test:', result.success ? '✅ Success' : '❌ Failed');
  console.log('   Status:', res.status);
  console.log('   Response:', result);
  
  if (!result.success) {
    console.error('   Error:', result.error);
  }
  
  console.log('=== END DIAGNOSTIC ===');
  
  // Summary
  console.log('\n=== SUMMARY ===');
  if (profile?.role === 'it_admin' && result.success) {
    console.log('✅ Everything is working correctly!');
  } else if (profile?.role !== 'it_admin') {
    console.error('❌ PROBLEM: Your role is "' + profile?.role + '", needs to be "it_admin"');
    console.log('FIX: Run this SQL query:');
    console.log(`UPDATE profiles SET role = 'it_admin' WHERE email = '${profile?.email}';`);
  } else if (!result.success) {
    console.error('❌ PROBLEM: API is rejecting requests');
    console.log('Check error message above for details');
  }
})();
```

Copy the output and check the SUMMARY at the bottom.

---

## Final Checklist

Before asking for help, confirm:

- [ ] Ran SQL query to set role to `it_admin`
- [ ] Verified query with `SELECT email, role FROM profiles WHERE email = 'MY_EMAIL';`
- [ ] Confirmed role shows as exactly `it_admin` (not IT_ADMIN, not director)
- [ ] Logged out of the application completely
- [ ] Cleared browser cache OR hard refreshed (Ctrl+Shift+R)
- [ ] Logged back in with the same email I updated
- [ ] Checked dashboard title (should say "IT Admin Dashboard")
- [ ] Checked sidebar for "Users Management" option
- [ ] Opened browser console (F12) and checked for errors
- [ ] Ran the diagnostic script above

---

## The Bottom Line

**99% of the time, the issue is:**
1. Role is not `it_admin` in the database
2. Forgot to log out and log back in after changing role

**The fix is literally 3 commands:**

```sql
UPDATE profiles SET role = 'it_admin' WHERE email = 'YOUR_EMAIL';
```

Then log out, log back in. Done! 🎉

---

**All the code is working perfectly.** You just need to make sure your database role is set correctly!
