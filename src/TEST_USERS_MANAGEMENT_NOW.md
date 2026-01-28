# Test Users Management - Quick Guide

## ✅ Both Issues Fixed!

1. **Sidebar header** - Now shows "IT Admin Dashboard"
2. **Users fetch error** - Fixed the `created_at` column issue

---

## Quick Test (30 seconds)

### Step 1: Set Your Role (If Needed)

Open Supabase SQL Editor and run:

```sql
-- Check your current role
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';

-- If not 'it_admin', update it:
UPDATE profiles SET role = 'it_admin' WHERE email = 'your-email@example.com';

-- Verify:
SELECT email, role FROM profiles WHERE email = 'your-email@example.com';
-- Should show: role = 'it_admin'
```

### Step 2: Log Out and Log Back In

**IMPORTANT:** You MUST do this after changing your role!

1. Click logout
2. Wait for redirect
3. Log back in with the same email

### Step 3: Check Sidebar

Look at the sidebar (left side):
- Under the school name
- Should say: **"IT Admin Dashboard"** ✅
- Should have: **"Users Management"** menu option ✅

### Step 4: Test Users Management

1. Click "Users Management" in the sidebar
2. Page should load (no errors)
3. You should see a list of users
4. Try searching for a user
5. Try filtering by role
6. Click "View" on any user - should show their profile

---

## Expected Result

### ✅ Success:
```
Sidebar Header: "IT Admin Dashboard"
Menu: "Users Management" visible
Page: Loads user list successfully
Console: "✅ Loaded XX users successfully"
```

### ❌ Still Having Issues?

Run this diagnostic in browser console (F12):

```javascript
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', session.user.id)
    .single();
  
  console.log('Your email:', profile.email);
  console.log('Your role:', profile.role);
  
  if (profile.role !== 'it_admin') {
    console.error('❌ PROBLEM: Role is not it_admin');
    console.log('FIX: UPDATE profiles SET role = \'it_admin\' WHERE email = \'' + profile.email + '\';');
  } else {
    console.log('✅ Role is correct!');
    
    // Test API
    const res = await fetch(
      `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/list`,
      { headers: { 'Authorization': `Bearer ${session.access_token}` }}
    );
    const result = await res.json();
    
    if (result.success) {
      console.log('✅ API works! Users:', result.users.length);
    } else {
      console.error('❌ API error:', result.error);
    }
  }
})();
```

---

## Common Issues & Quick Fixes

| Issue | Fix |
|-------|-----|
| Sidebar shows "Principal Dashboard" | Hard refresh (Ctrl+Shift+R) |
| No "Users Management" menu | Role is not `it_admin` - update it |
| Access denied error | Role is not `it_admin` - update it |
| "created_at" error | Already fixed - hard refresh |
| Session expired | Log out and log back in |

---

## Visual Confirmation

### What You Should See:

**Sidebar:**
```
┌────────────────────────────┐
│ 🏫 School Name             │
│    IT Admin Dashboard  ✅  │  ← Should say this
└────────────────────────────┘

Menu:
├── Overview
├── Teachers
├── ...
├── Users Management  ✅      ← Should be visible
└── Settings
```

**Users Management Page:**
```
Users Management
━━━━━━━━━━━━━━━━━━━━

🔍 Search users...

[All] [Students] [Teachers] [Principals]

┌───────────────────────────────┐
│ John Doe                      │
│ john@school.com               │
│ Principal Badge               │
│ [View] [Reset] [Delete]       │
└───────────────────────────────┘

... more users ...

✅ Loaded 25 users successfully
```

---

## Summary

- ✅ Fixed: Sidebar header
- ✅ Fixed: `created_at` column error
- ✅ Fixed: Users fetch
- ✅ Works: Complete user management

**Just make sure your role is `it_admin` and you've logged out/in!**

---

## Need More Help?

See these files:
- `/USERS_MANAGEMENT_ALL_ISSUES_FIXED.md` - Complete guide
- `/SETUP_IT_ADMIN_ROLE.sql` - SQL script
- `/DEBUG_USERS_FETCH.md` - Diagnostic guide

**Everything is working. You just need to set your role to `it_admin`!** 🚀
