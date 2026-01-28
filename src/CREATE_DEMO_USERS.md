# 🚀 CREATE DEMO USERS - QUICK START

## The Problem
You're seeing **"Invalid login credentials"** because **no users exist** in your database yet.

## The Solution
Create demo users via the backend API endpoint.

---

## METHOD 1: Use Registration Form (Easiest)

### Step 1: Go to Registration Page
1. On the login screen, click **"Apply for New Account"**
2. Fill out the registration form
3. Submit the form

### Step 2: Approve the Registration
Since you don't have admin access yet, you'll need to:

1. **Option A:** Check your Supabase Database
   - Go to Supabase Dashboard → Authentication → Users
   - You should see the new user
   - Copy their user ID
   - Run this SQL to approve them:
   ```sql
   UPDATE profiles 
   SET role = 'principal'  -- or 'teacher', 'student', etc.
   WHERE id = 'PASTE-USER-ID-HERE';
   ```

2. **Option B:** Use the backend endpoint directly (see Method 2 below)

---

## METHOD 2: Create User via Backend API (Direct)

### Create a Principal/Admin User

Open your **browser console** (F12), go to the **Console** tab, and paste this code:

```javascript
// Create a Principal user
const createPrincipal = async () => {
  const projectId = 'YOUR_PROJECT_ID'; // Replace with your actual project ID
  const publicAnonKey = 'YOUR_ANON_KEY'; // Replace with your actual anon key
  
  const response = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/signup`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${publicAnonKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: 'principal@school.com',
        password: 'Principal123!',
        firstName: 'John',
        lastName: 'Principal',
        role: 'principal',
        gender: 'male',
        phone: '08012345678',
        dateOfBirth: '1980-01-01'
      })
    }
  );
  
  const result = await response.json();
  console.log('Principal created:', result);
  
  if (result.success) {
    alert('✅ Principal user created! Email: principal@school.com, Password: Principal123!');
  } else {
    alert('❌ Error: ' + result.error);
  }
};

createPrincipal();
```

### Create More Demo Users

```javascript
// Create demo users for all roles
const createDemoUsers = async () => {
  const projectId = 'YOUR_PROJECT_ID';
  const publicAnonKey = 'YOUR_ANON_KEY';
  
  const demoUsers = [
    {
      email: 'principal@school.com',
      password: 'Principal123!',
      firstName: 'John',
      lastName: 'Principal',
      role: 'principal',
      gender: 'male',
      phone: '08012345678',
      dateOfBirth: '1980-01-01'
    },
    {
      email: 'director@school.com',
      password: 'Director123!',
      firstName: 'Jane',
      lastName: 'Director',
      role: 'director',
      gender: 'female',
      phone: '08012345679',
      dateOfBirth: '1975-01-01'
    },
    {
      email: 'teacher@school.com',
      password: 'Teacher123!',
      firstName: 'Mary',
      lastName: 'Teacher',
      role: 'teacher',
      gender: 'female',
      phone: '08012345680',
      dateOfBirth: '1985-01-01'
    },
    {
      email: 'student@school.com',
      password: 'Student123!',
      firstName: 'David',
      lastName: 'Student',
      role: 'student',
      gender: 'male',
      phone: '08012345681',
      dateOfBirth: '2005-01-01'
    },
    {
      email: 'finance@school.com',
      password: 'Finance123!',
      firstName: 'Finance',
      lastName: 'Administrator',
      role: 'finance_admin',
      gender: 'other',
      phone: '08012345682',
      dateOfBirth: '1990-01-01'
    }
  ];
  
  for (const user of demoUsers) {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/signup`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(user)
        }
      );
      
      const result = await response.json();
      console.log(`${user.role} created:`, result);
      
      if (result.success) {
        console.log(`✅ ${user.role}: ${user.email} / ${user.password}`);
      } else {
        console.error(`❌ ${user.role} error:`, result.error);
      }
      
      // Wait a bit between requests
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (error) {
      console.error(`Error creating ${user.role}:`, error);
    }
  }
  
  alert('Demo users creation complete! Check console for credentials.');
};

createDemoUsers();
```

---

## METHOD 3: Direct SQL (If Backend API Not Working)

If the backend API doesn't have a signup endpoint, you'll need to create users manually:

### Step 1: Create User in Supabase Auth
1. Go to **Supabase Dashboard** → **Authentication** → **Users**
2. Click **"Add User"** → **"Create new user"**
3. Enter:
   - **Email:** `principal@school.com`
   - **Password:** `Principal123!`
   - **Auto Confirm User:** ✅ Check this box
4. Click **"Create user"**
5. **Copy the User ID** from the list

### Step 2: Create Profile in Database
Run this SQL in **Supabase Dashboard** → **SQL Editor**:

```sql
-- Replace 'PASTE-USER-ID-HERE' with the actual UUID from Step 1
INSERT INTO profiles (
  id,
  email,
  first_name,
  last_name,
  role,
  gender,
  phone,
  date_of_birth,
  created_at
) VALUES (
  'PASTE-USER-ID-HERE',  -- ⚠️ REPLACE THIS
  'principal@school.com',
  'John',
  'Principal',
  'principal',
  'male',
  '08012345678',
  '1980-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email = 'principal@school.com';
```

---

## 🧪 TEST LOGIN

After creating users, try logging in with:

| Role | Email | Password |
|------|-------|----------|
| **Principal** | principal@school.com | Principal123! |
| **Director** | director@school.com | Director123! |
| **Teacher** | teacher@school.com | Teacher123! |
| **Student** | student@school.com | Student123! |
| **Finance Admin** | finance@school.com | Finance123! |

---

## ⚠️ Important Notes

1. **Backend Signup Endpoint Required**
   - Method 2 assumes you have a `/signup` endpoint in your backend
   - If not available, use Method 3 (manual creation)

2. **Auto Confirm Email**
   - Make sure to check "Auto Confirm User" when creating via Supabase Dashboard
   - The backend signup endpoint should set `email_confirm: true`

3. **Role Constraint**
   - Ensure the `finance_admin` role has been added to the database
   - Run `ADD_FINANCE_ADMIN_ROLE.sql` first if it hasn't been run

---

## 🔍 Troubleshooting

### Error: "Invalid login credentials"
- User doesn't exist → Create user using methods above
- Password incorrect → Reset password in Supabase Dashboard
- Email not confirmed → Check "Auto Confirm" or verify email

### Error: "User not found after signup"
- Profile wasn't created → Run the SQL from Method 3, Step 2
- Check database connection

### Error: "Role constraint violated"
- The role doesn't exist in the database
- Run the migration to add the role first

---

## Next Steps

1. Create demo users using one of the methods above
2. Test login with the credentials
3. Once logged in, you can manage users via the **Users Management** module
4. Create real users through the **Registration** → **Pending Approvals** flow
