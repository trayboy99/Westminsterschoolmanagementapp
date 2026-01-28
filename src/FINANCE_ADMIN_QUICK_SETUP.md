# 🚀 Finance Admin User Account - Quick Setup Guide

## 📋 Overview
This guide will help you create the Finance Admin user account in 3 simple steps.

---

## ⚡ Quick Steps

### Step 1: Add Finance Admin Role (1 minute)
```sql
-- Copy and paste this into Supabase SQL Editor
-- Go to: Supabase Dashboard → SQL Editor → New Query

ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'student', 
  'teacher', 
  'principal', 
  'director', 
  'it_admin',
  'finance_admin'
));
```

**Expected Output:** `Success. No rows returned`

---

### Step 2: Create Finance Admin User via Supabase Dashboard (2 minutes)

#### Option A: Via Supabase UI (Recommended)

1. **Go to Supabase Dashboard**
   - Navigate to: **Authentication** → **Users**

2. **Click "Add User"**
   - Click the dropdown: **"Create new user"**

3. **Fill in Details:**
   ```
   Email: finance@westminster.edu.ng
   Password: [Create a strong password - give this to finance admin]
   
   ✅ Check: "Auto Confirm User" (so they don't need email verification)
   ```

4. **Click "Create user"**

5. **Copy the User ID**
   - After creation, you'll see the new user in the list
   - Click on the user
   - Copy the **User ID** (it's a UUID like `abc123-def456-...`)

---

### Step 3: Add Profile for Finance Admin (1 minute)

```sql
-- Paste this into Supabase SQL Editor
-- ⚠️ IMPORTANT: Replace the UUID with the actual User ID from Step 2

INSERT INTO profiles (
  id,
  email,
  first_name,
  middle_name,
  last_name,
  role,
  phone,
  gender,
  date_of_birth,
  created_at
) VALUES (
  'PASTE-THE-USER-ID-FROM-STEP-2-HERE',  -- ⚠️ REPLACE THIS
  'finance@westminster.edu.ng',
  'Finance',
  NULL,
  'Administrator',
  'finance_admin',
  '08012345678',
  'other',
  '1990-01-01',
  NOW()
)
ON CONFLICT (id) DO UPDATE
SET role = 'finance_admin';
```

**Example with actual UUID:**
```sql
INSERT INTO profiles (
  id, email, first_name, last_name, role, phone, gender
) VALUES (
  '123e4567-e89b-12d3-a456-426614174000',  -- Real UUID from Step 2
  'finance@westminster.edu.ng',
  'Finance',
  'Administrator',
  'finance_admin',
  '08012345678',
  'other'
);
```

---

### Step 4: Verify Finance Admin Account (30 seconds)

```sql
-- Run this to verify
SELECT 
  id,
  email,
  first_name,
  last_name,
  role,
  created_at
FROM profiles
WHERE role = 'finance_admin';
```

**Expected Output:**
| id | email | first_name | last_name | role | created_at |
|----|-------|------------|-----------|------|------------|
| abc-123... | finance@westminster.edu.ng | Finance | Administrator | finance_admin | 2025-11-06 ... |

✅ **If you see 1 row, Finance Admin account is ready!**

---

## 🧪 Test the Account

### Test Login:
1. **Logout** from current account (if logged in)
2. **Go to Login Page**
3. **Enter:**
   - Email: `finance@westminster.edu.ng`
   - Password: `[the password you set in Step 2]`
4. **Click "Sign In"**

### Expected Result:
- ✅ Should redirect to **Director Dashboard**
- ✅ Sidebar shows: Overview, Teachers, Students, Classes, **Finance**, etc.
- ✅ Click **"Finance"** → Shows Finance Module with tabs

---

## 📱 What Finance Admin Can Do

After login, Finance Admin will see:

### Finance Module Tabs:
1. **📊 Dashboard** - Overview stats and charts
2. **➕ Record Payment** - Manual single entry form
3. **📝 Bulk Entry** - Excel-like grid for multiple payments
4. **📜 Payment History** - All payments with filters
5. **📊 Reports** - Export and analytics

### Finance Admin Permissions:
| Action | Can Do? |
|--------|---------|
| Create single payment | ✅ Yes |
| Bulk import payments | ✅ Yes |
| View all payment history | ✅ Yes |
| Export reports | ✅ Yes |
| Approve/reject payments | ❌ No (Director only) |
| Manage student clearance | ❌ No (Director only) |

---

## 🔒 Security Notes

### Password Requirements:
- Minimum 8 characters
- Include: uppercase, lowercase, numbers
- Store securely
- Give to Finance Admin privately

### Role Verification:
```sql
-- Check if finance_admin role exists
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_role_check';
```

Should show: `role IN ('student', 'teacher', 'principal', 'director', 'it_admin', 'finance_admin')`

---

## 🐛 Troubleshooting

### Issue 1: "Role check constraint violation"
**Problem:** Trying to create user before adding role to constraint  
**Solution:** Run Step 1 first (ADD_FINANCE_ADMIN_ROLE.sql)

### Issue 2: "Duplicate key value violates unique constraint"
**Problem:** User ID already exists in profiles table  
**Solution:** Use `ON CONFLICT` clause or check if profile already exists

### Issue 3: Finance Admin sees blank page after login
**Problem:** Role not recognized by frontend  
**Solution:** Check `AuthContext.tsx` and ensure `finance_admin` is treated like `director`

### Issue 4: Can't see Finance menu item
**Problem:** Sidebar doesn't show Finance for this role  
**Solution:** Finance menu only shows for `director` and `finance_admin` roles

---

## 📊 Verify Setup Checklist

- [ ] Step 1: Role constraint updated ✅
- [ ] Step 2: User created in Supabase Auth ✅
- [ ] Step 3: Profile inserted with role = 'finance_admin' ✅
- [ ] Step 4: Verification query returns 1 row ✅
- [ ] Test: Can login with email/password ✅
- [ ] Test: Redirects to Director Dashboard ✅
- [ ] Test: Finance menu visible in sidebar ✅
- [ ] Test: Can open Finance Module ✅

---

## 🎯 Next Steps After Finance Admin Creation

1. **Create Payments Table** (from PRD Phase 1)
2. **Set up Backend Endpoints** (10 API routes)
3. **Build Finance Module UI** (tabs and forms)
4. **Test payment creation flow**
5. **Train Finance Admin on system usage**

---

## 📞 Support

### If you need to create multiple Finance Admins:
Repeat Steps 2-3 for each additional Finance Admin user.

### If you need to change someone's role to Finance Admin:
```sql
UPDATE profiles
SET role = 'finance_admin'
WHERE email = 'existing.user@school.com';
```

### If you need to remove Finance Admin role:
```sql
UPDATE profiles
SET role = 'teacher'  -- or whatever role they should be
WHERE email = 'finance@westminster.edu.ng';
```

---

## ✅ Success Confirmation

Run this final check:
```sql
-- Should return at least 1 row
SELECT COUNT(*) as finance_admin_count
FROM profiles
WHERE role = 'finance_admin';
```

**If count ≥ 1:** ✅ **Finance Admin account is ready!**

---

## 📝 Summary

**Files Created:**
1. `ADD_FINANCE_ADMIN_ROLE.sql` - Adds role to database
2. `CREATE_FINANCE_ADMIN_USER.sql` - Creates user account
3. `FINANCE_ADMIN_QUICK_SETUP.md` - This guide

**Total Time:** ~5 minutes  
**Difficulty:** ⭐ Easy  
**Status:** ✅ Ready to use

---

**🎉 Finance Admin account is now ready for Finance Module implementation!**
