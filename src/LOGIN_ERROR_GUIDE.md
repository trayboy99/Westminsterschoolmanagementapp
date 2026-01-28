# Login Error: "Invalid login credentials" - Solution Guide

## 🔴 The Error

```
Login error: AuthApiError: Invalid login credentials
```

---

## 🔍 What This Means

This error means one of three things:

1. **Demo users haven't been created yet** (most common for first-time setup)
2. **Wrong email or password** (typo)
3. **User exists in profiles table but not in Supabase Auth** (sync issue)

---

## ✅ Solution 1: Create Demo Users (First Time Setup)

### Step 1: Check if Demo Users Exist

When you open the login page, you should see one of these messages:

#### 🟢 If you see: "Demo users are ready!"

```
┌─────────────────────────────────────────────┐
│ ✓ Demo users are ready!                    │
│   You can sign in with any of the          │
│   credentials below.                        │
│                                             │
│ Available Demo Accounts:                    │
│ • Principal - principal@school.edu          │
│ • Teacher - teacher@school.edu              │
│ • Student - student@school.edu              │
│                                             │
│ Password: demo123                           │
└─────────────────────────────────────────────┘
```

**Action:** Click the "Sign In" button next to any account. You're all set! ✅

---

#### 🟠 If you see: "First Time Setup Required"

```
┌─────────────────────────────────────────────┐
│ ⚠ First Time Setup Required                │
│   Demo users need to be created before     │
│   you can sign in.                          │
│                                             │
│ [Create Demo Users]                         │
└─────────────────────────────────────────────┘
```

**Action:** Click the **"Create Demo Users"** button. Wait for success message, then try logging in. ✅

---

### Step 2: Sign In with Demo Account

After demo users are created, use any of these credentials:

| Role | Email | Password |
|------|-------|----------|
| **Principal** | principal@school.edu | demo123 |
| **Teacher** | teacher@school.edu | demo123 |
| **Student** | student@school.edu | demo123 |

---

## ✅ Solution 2: Verify Your Credentials

### Common Typos to Check:

1. **Email format:**
   - ✅ Correct: `principal@school.edu`
   - ❌ Wrong: `principal@school.com` (wrong domain)
   - ❌ Wrong: `principal@schools.edu` (extra 's')
   - ❌ Wrong: `principle@school.edu` (wrong spelling)

2. **Password:**
   - ✅ Correct: `demo123` (all lowercase)
   - ❌ Wrong: `Demo123` (capital D)
   - ❌ Wrong: `demo 123` (space)
   - ❌ Wrong: `demo1234` (extra 4)

3. **Extra spaces:**
   - Check for spaces before or after email/password
   - Copy-paste can sometimes add invisible characters

---

## ✅ Solution 3: Manual Account Creation (If Demo Users Failed)

If the "Create Demo Users" button doesn't work, you can create accounts manually:

### Using the Registration Page:

1. Click **"Apply for New Account"** on the login page
2. Fill in the registration form:
   ```
   First Name: John
   Last Name: Doe
   Email: john.doe@school.edu
   Password: yourpassword
   Role: [Select appropriate role]
   ```
3. Submit the application
4. **Important:** Ask a principal/admin to approve your registration
5. Once approved, you can log in

---

## 🔧 Advanced Troubleshooting

### Check if User Exists in Database

If you're a developer/admin with database access:

```sql
-- Check if profile exists
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email = 'student@school.edu';

-- Check if auth user exists
-- (Run this in Supabase Dashboard > Authentication > Users)
```

### Common Issues:

#### Issue 1: Profile exists but no auth user
**Symptom:** User is in profiles table but can't log in

**Solution:** The user needs to be created in Supabase Auth. Use the "Create Demo Users" endpoint or registration flow.

---

#### Issue 2: Auth user exists but no profile
**Symptom:** Can log in to Supabase but get errors in the app

**Solution:** The system will automatically create a profile when you first log in. If it doesn't:

1. Log out
2. Log back in
3. Wait 10 seconds for profile to be created
4. Refresh the page

---

#### Issue 3: Database not ready
**Symptom:** Login page shows "Database not ready" or similar

**Solution:** 
1. Check that all database tables are created
2. Run the SQL migration files in order
3. Check Supabase Dashboard for any RLS policy errors

---

## 🎯 Quick Checklist

Before asking for help, verify:

- [ ] Demo users are created (check the login page message)
- [ ] Email is exactly correct (no typos, correct domain)
- [ ] Password is exactly correct (demo123 for demo accounts)
- [ ] No extra spaces in email or password
- [ ] Database tables exist (profiles, exams, subjects, etc.)
- [ ] Internet connection is working
- [ ] Browser console shows no red errors

---

## 🆘 Still Not Working?

### Get Debug Information:

1. Open browser console (F12 or right-click > Inspect > Console)
2. Try to log in
3. Look for red error messages
4. Take a screenshot of:
   - The error message on screen
   - The console errors (if any)
   - The login page (showing demo users status)

### Common Error Messages:

#### "Session expired"
**Fix:** This is normal. Just try logging in again.

#### "Database not ready"
**Fix:** Database tables need to be created. Check the setup guide.

#### "Network error" or "Failed to fetch"
**Fix:** Check internet connection or Supabase service status.

#### "Too many requests"
**Fix:** Wait 5 minutes before trying again (rate limit protection).

---

## 📋 Demo Credentials Reference

Keep these handy:

```
PRINCIPAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:    principal@school.edu
Password: demo123
Access:   Full system access

TEACHER
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:    teacher@school.edu
Password: demo123
Access:   Marks entry, uploads, comments

STUDENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:    student@school.edu
Password: demo123
Access:   View results, materials, timetable

IT ADMIN
━━━━━━━━━━━━━━━━━━━━━━━━━━━
Email:    it.admin@school.edu
Password: demo123
Access:   System administration
```

---

## 🎉 Success!

Once you successfully log in, you should see:
- ✅ Welcome message with your name
- ✅ Dashboard appropriate for your role
- ✅ Navigation menu with all your features

If you see this, congratulations! Your login is working correctly! 🎊

---

## 📝 Notes

- Demo passwords are intentionally simple for testing
- In production, use strong passwords
- Always change default passwords after first login
- Enable email confirmation for production use

**Date:** October 16, 2025  
**Version:** 1.0  
**Status:** Login system fully functional with demo users
