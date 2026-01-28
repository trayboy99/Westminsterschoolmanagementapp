# 🔐 LOGIN ERROR FIX - "Invalid Login Credentials"

## ❌ The Error You're Seeing

```
Sign in error: AuthApiError: Invalid login credentials
Login error: Error: Invalid email or password. Please check your credentials and try again.
```

## ✅ The Solution

This error means **no valid user accounts exist** in your database. You need to create demo users to test the system.

---

## 🚀 QUICK FIX - 3 METHODS

### METHOD 1: Use the Built-in Helper Tool (EASIEST!)

1. On the **login screen**, click **"Create Demo Users (First Time Setup)"**
2. Follow the step-by-step instructions
3. The tool will guide you through creating users via Supabase Dashboard

**OR** go directly to: `#create-demo-users` in your browser URL

---

### METHOD 2: Manual Creation via Supabase Dashboard

#### Step 1: Create Users in Supabase Auth

1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. For each demo user:
   - Enter email and password (see table below)
   - **✅ IMPORTANT: Check "Auto Confirm User"**
   - Click "Create user"
   - **Copy the User ID** (you'll need it in Step 2)

#### Demo User Credentials

| Role | Email | Password |
|------|-------|----------|
| **Principal** | principal@school.com | Principal123! |
| **Director** | director@school.com | Director123! |
| **Finance Admin** | finance@school.com | Finance123! |
| **Teacher** | teacher@school.com | Teacher123! |
| **Student** | student@school.com | Student123! |

#### Step 2: Create Profiles in Database

1. Go to **Supabase Dashboard** → **SQL Editor**
2. Copy and paste the SQL below
3. **Replace each `USER-ID-HERE`** with the actual UUID you copied from Step 1
4. Run the script

```sql
-- Principal
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'PRINCIPAL-USER-ID-HERE',  -- ⚠️ REPLACE
  'principal@school.com',
  'John',
  'Principal',
  'principal',
  'male',
  '08012345678',
  '1980-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Director
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'DIRECTOR-USER-ID-HERE',  -- ⚠️ REPLACE
  'director@school.com',
  'Jane',
  'Director',
  'director',
  'female',
  '08012345679',
  '1975-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Finance Admin
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'FINANCE-USER-ID-HERE',  -- ⚠️ REPLACE
  'finance@school.com',
  'Finance',
  'Administrator',
  'finance_admin',
  'other',
  '08012345682',
  '1990-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Teacher
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'TEACHER-USER-ID-HERE',  -- ⚠️ REPLACE
  'teacher@school.com',
  'Mary',
  'Teacher',
  'teacher',
  'female',
  '08012345680',
  '1985-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Student
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'STUDENT-USER-ID-HERE',  -- ⚠️ REPLACE
  'student@school.com',
  'David',
  'Student',
  'student',
  'male',
  '08012345681',
  '2005-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify all users
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email IN (
  'principal@school.com',
  'director@school.com',
  'teacher@school.com',
  'student@school.com',
  'finance@school.com'
)
ORDER BY role;
```

#### Step 3: Test Login

1. Refresh the login page
2. Login with any of the demo credentials above
3. You should now be able to access the system!

**Recommended:** Start with the **Principal** account to access all features

---

### METHOD 3: One-Command Setup (Advanced)

If you have access to your Supabase Service Role Key, you can create users via SQL:

```sql
-- This requires Supabase Service Role Key access
-- Contact your system administrator or use METHOD 2 instead
```

---

## 🔍 Troubleshooting

### Still getting "Invalid credentials" after creating users?

**Check:**
1. ✅ Did you check "Auto Confirm User" when creating in Supabase Auth?
2. ✅ Did you create a profile in the database (Step 2)?
3. ✅ Are you using the exact email and password?
4. ✅ Did you copy the correct User ID from Supabase Auth?

**Verify User Exists:**
```sql
-- Run this in Supabase SQL Editor
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email = 'principal@school.com';
```

If this returns no rows, the profile wasn't created properly.

---

### Error: "Role constraint violated"

**For Finance Admin only:** You need to add the `finance_admin` role first:

```sql
-- Run this in Supabase SQL Editor
ALTER TABLE profiles 
DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles 
ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'principal', 
  'super_admin', 
  'director', 
  'secretary', 
  'finance_admin',  -- Added
  'transport_manager', 
  'teacher', 
  'student', 
  'parent'
));
```

Then create the Finance Admin user.

---

### Auth User exists but Profile doesn't

Run this to sync them:

```sql
-- Check auth users vs profiles
SELECT 
  auth.id AS auth_id,
  auth.email AS auth_email,
  p.id AS profile_id,
  p.role AS profile_role
FROM auth.users auth
LEFT JOIN profiles p ON auth.id = p.id
WHERE p.id IS NULL;  -- Users without profiles
```

For each user without a profile, create one using the INSERT statements from METHOD 2.

---

## 🎯 After Successfully Logging In

### For Principal Account:
1. Go to **Users Management** to create more users
2. Set up your school in **Settings**
3. Create classes, subjects, and assign teachers

### For Finance Admin:
1. Access Finance Dashboard from sidebar
2. Set up Fee Structures
3. Start recording payments

### For Teacher:
1. View assigned classes and subjects
2. Enter marks for students
3. Upload materials

### For Student:
1. View your class and subjects
2. Check results with PIN
3. See attendance records

---

## 📚 Related Files

- `CREATE_DEMO_USERS.md` - Detailed demo users guide
- `CREATE_FINANCE_ADMIN_USER.sql` - Finance Admin specific setup
- `ADD_FINANCE_ADMIN_ROLE.sql` - Add Finance Admin role
- `components/auth/QuickUserCreator.tsx` - Built-in helper tool

---

## 💡 Pro Tips

1. **Always create a Principal or Director first** - They can approve registrations
2. **Use strong passwords** in production - Demo passwords are weak!
3. **Auto Confirm is crucial** - Without it, you can't login
4. **Keep User IDs handy** - You'll need them for troubleshooting
5. **Test with Principal account** - It has access to everything

---

## ✅ Success Checklist

- [ ] Created user in Supabase Auth
- [ ] Checked "Auto Confirm User"
- [ ] Copied the User ID
- [ ] Created profile in database
- [ ] Replaced placeholder UUID with actual User ID
- [ ] Verified user exists in profiles table
- [ ] Successfully logged in!

---

## 🆘 Still Stuck?

1. Check browser console (F12) for detailed errors
2. Verify Supabase connection in Settings
3. Clear browser cache and cookies
4. Try incognito/private browsing mode
5. Check that SUPABASE_URL and SUPABASE_ANON_KEY are correct

---

## 🎉 You're All Set!

Once you've created demo users and can log in, you're ready to explore the full School Management System!

**Next Steps:**
1. Explore the dashboard
2. Configure your school settings
3. Create real users through Registration → Approvals
4. Set up classes, subjects, and academic calendar
