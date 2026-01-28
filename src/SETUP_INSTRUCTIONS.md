# School Management System - First Time Setup

## Current Status
✅ Login page loads successfully  
❌ Database not initialized yet  
❌ Auth users not created yet  

## The Errors You're Seeing

```
⚠️ Could not check demo users status: TypeError: Failed to fetch
❌ Login error: AuthRetryableFetchError: Failed to fetch
```

These errors occur because:
1. **The Supabase database tables haven't been created yet**
2. **No auth users exist in Supabase Auth**
3. **The backend edge function server isn't deployed** (optional for now)

## Quick Fix - Follow These 3 Steps

### Step 1: Open Your Supabase Dashboard

1. Go to https://supabase.com/dashboard
2. Find your project: `wwjnjdexkiprzyutnvym`
3. Click on "SQL Editor" in the left sidebar

### Step 2: Create the Database Tables

Click "New Query" and paste this SQL:

```sql
-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('principal', 'super_admin', 'director', 'secretary', 'transport_manager', 'teacher', 'student', 'parent')),
  email TEXT UNIQUE NOT NULL,
  class_id UUID REFERENCES classes(id) ON DELETE SET NULL
);

-- Enable Row Level Security
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Allow authenticated users to read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow users to insert their own profile" ON profiles FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow users to update their own profile" ON profiles FOR UPDATE TO authenticated USING (true);
```

Click **Run** to execute.

### Step 3: Create Auth Users

Still in the SQL Editor, run this to create the demo users:

```sql
-- Note: You need to create auth users through the Supabase Dashboard
-- Go to Authentication > Users > Add user (manually)
-- Then insert matching profiles here:

INSERT INTO profiles (id, first_name, middle_name, last_name, role, email) VALUES 
('11111111-1111-1111-1111-111111111111', 'Dr. Sarah', '', 'Johnson', 'principal', 'principal@school.edu'),
('22222222-2222-2222-2222-222222222222', 'Ahmed', '', 'Hassan', 'teacher', 'teacher@school.edu'),
('33333333-3333-3333-3333-333333333333', 'John', '', 'Smith', 'student', 'student@school.edu')
ON CONFLICT (id) DO NOTHING;
```

**IMPORTANT:** For each user above, you also need to:
1. Go to **Authentication** > **Users** in Supabase Dashboard
2. Click **Add User**
3. Enter:
   - Email: `principal@school.edu` (or teacher/student)
   - Password: `demo123`
   - User UID: `11111111-1111-1111-1111-111111111111` (or the matching UUID)
4. Uncheck "Auto Confirm User"
5. Click **Create User**

Repeat for all 3 users.

### Step 4: Refresh Your App

Once you've:
- ✅ Created the `profiles` table
- ✅ Created the 3 auth users in Supabase Auth
- ✅ Inserted the 3 profiles

**Refresh your browser** and you should see:
- ✅ Login page loads
- ✅ No more "Failed to fetch" errors
- ✅ You can log in with:
  - `principal@school.edu` / `demo123`
  - `teacher@school.edu` / `demo123`
  - `student@school.edu` / `demo123`

## Alternative: Use the Database Setup Screen

If you refresh now, you should see a **"Database Setup"** screen with instructions and SQL to copy. This is an easier way to set up the database.

## What's Next?

After the database is set up and you can log in, the app will guide you through creating:
- Classes
- Subjects
- Timetables
- Exams
- etc.

## Need Help?

If you still see errors after following these steps, please share:
1. The error messages you see
2. Which step you're stuck on
3. Screenshots of your Supabase dashboard (Authentication > Users)
