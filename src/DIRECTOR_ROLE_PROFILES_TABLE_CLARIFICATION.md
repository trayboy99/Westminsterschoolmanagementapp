# Director Role - Profiles Table Clarification ✅

## Important Update

**The director role is stored in the `profiles` table, NOT the KV store.**

This clarification has been applied to all documentation and SQL scripts.

---

## Database Structure

### Correct Structure:

```
Supabase Database
├── auth.users (Supabase Auth)
│   ├── id (UUID)
│   ├── email
│   └── encrypted_password
│
└── profiles (Your custom table)
    ├── id (references auth.users.id)
    ├── first_name
    ├── middle_name
    ├── last_name
    ├── role ← DIRECTOR STORED HERE
    └── email
```

### How It Works:

```
User Login Flow:
1. User enters email + password
2. Supabase Auth validates (auth.users table)
3. App fetches profile from profiles table
4. Checks profile.role === 'director'
5. If true → Show Director Dashboard
```

---

## What Was Updated

### Files Modified:

1. **`/ADD_DIRECTOR_ROLE.sql`**
   - Changed from KV store constraint to profiles table constraint
   - Now correctly adds 'director' to profiles.role allowed values

2. **`/DIRECTOR_DASHBOARD_QUICK_START.md`**
   - Updated user creation instructions
   - Now uses profiles table SQL

3. **`/DIRECTOR_DASHBOARD_COMPLETE.md`**
   - Updated "How to Create Director User" section
   - Added Supabase Dashboard method

4. **`/DIRECTOR_DASHBOARD_SUMMARY.md`**
   - Updated Step 2 SQL examples
   - Now references profiles table

5. **`/TEST_DIRECTOR_DASHBOARD_NOW.md`**
   - Updated verification queries
   - Now checks profiles table for director role

### Files Created:

1. **`/ADD_DIRECTOR_ROLE_UPDATED.md`**
   - Comprehensive guide for adding director role
   - Clear explanation of profiles vs KV store
   - Troubleshooting section

2. **`/QUICK_ADD_DIRECTOR_NOW.sql`**
   - One-file SQL solution
   - Copy-paste ready
   - Includes all steps with comments

---

## Frontend Code (No Changes Needed)

The React components already correctly check the role from the profile:

```typescript
// In App.tsx
if (profile?.role === 'director') {
  return <DirectorDashboard />
}
```

This `profile` object comes from:
```typescript
// AuthContext fetches from profiles table
const { data: profile } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single();
```

So the frontend is already compatible with the profiles table structure! ✅

---

## Quick Setup (3 Steps)

### Step 1: Add Director to Allowed Roles (30 seconds)

Copy `/QUICK_ADD_DIRECTOR_NOW.sql` and paste into Supabase SQL Editor, then run.

Or just this part:
```sql
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;

ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'principal', 'super_admin', 'director', 'secretary', 
  'transport_manager', 'it_admin', 'finance_admin', 
  'teacher', 'student', 'parent'
));
```

---

### Step 2: Make a User Director (10 seconds)

**Via Supabase Dashboard:**
1. Table Editor → profiles
2. Find user → Edit
3. Change role to `director`
4. Save

**Via SQL:**
```sql
UPDATE profiles 
SET role = 'director' 
WHERE email = 'your@email.com';
```

---

### Step 3: Log In (5 seconds)

Log in with the director user credentials → Director Dashboard appears!

---

## Verification

### Check Director User Exists:

```sql
SELECT id, first_name, last_name, email, role 
FROM profiles 
WHERE role = 'director';
```

**Expected:**
```
id                  | first_name | last_name | email              | role
--------------------|------------|-----------|--------------------|---------
abc-123-def-456...  | John       | Director  | john@school.com    | director
```

---

### Check Constraint Exists:

```sql
SELECT constraint_name, check_clause
FROM information_schema.check_constraints
WHERE constraint_name = 'profiles_role_check';
```

**Expected:** Check clause includes 'director'

---

## Common Mistakes (Now Fixed)

### ❌ WRONG - Using KV Store:
```sql
-- DON'T DO THIS
INSERT INTO kv_store_1ddd013a (key, value)
VALUES ('user:123:role', '"director"');
```

### ✅ CORRECT - Using Profiles Table:
```sql
-- DO THIS INSTEAD
UPDATE profiles 
SET role = 'director' 
WHERE id = '123';
```

---

## Why Profiles Table?

### Advantages:

1. **Structured Data**
   - Proper relational database
   - Foreign key to auth.users
   - Type safety with CHECK constraints

2. **Easy Queries**
   - Simple SELECT statements
   - Can join with other tables
   - Good for reporting

3. **Supabase Integration**
   - Works with Row Level Security (RLS)
   - Can use Supabase Auth helpers
   - Better for production

4. **Consistent with Other Roles**
   - Teachers, students, principals all use profiles table
   - Director follows same pattern
   - Easier maintenance

---

## KV Store vs Profiles Table

### KV Store (kv_store_1ddd013a):
- Used for: Settings, configurations, temporary data
- Key-value pairs
- JSON values
- Example: `session:settings`, `school:logo_url`

### Profiles Table:
- Used for: User data, roles, personal information
- Relational structure
- Typed columns
- Example: User profiles with role, name, email

**Director role belongs in profiles table!** ✅

---

## Summary

### What Changed:
- ✅ SQL now updates profiles table, not KV store
- ✅ Documentation updated to reflect correct table
- ✅ All examples use profiles table

### What Didn't Change:
- ✅ Frontend code (already correct)
- ✅ Director dashboard components (already work)
- ✅ TypeScript types (director already defined)

### What You Need to Do:
1. Run SQL to add director constraint to profiles table
2. Set a user's role to 'director' in profiles table
3. Log in and use Director Dashboard

**Total time:** 1 minute ⚡

---

## Files Reference

### SQL Files:
- `/ADD_DIRECTOR_ROLE.sql` - Main SQL script (updated)
- `/QUICK_ADD_DIRECTOR_NOW.sql` - One-file solution

### Documentation:
- `/ADD_DIRECTOR_ROLE_UPDATED.md` - Complete guide
- `/DIRECTOR_DASHBOARD_QUICK_START.md` - Quick setup
- `/DIRECTOR_DASHBOARD_COMPLETE.md` - Full documentation
- `/TEST_DIRECTOR_DASHBOARD_NOW.md` - Testing guide

### Components (Already Complete):
- `/components/DirectorSidebar.tsx`
- `/components/DirectorDashboardContent.tsx`
- `/components/director/DirectorTeachersOverview.tsx`
- `/App.tsx` (includes director routing)

---

## Final Checklist

Before testing:
- [ ] SQL script updated to use profiles table ✅
- [ ] Documentation updated ✅
- [ ] Frontend code compatible ✅
- [ ] Ready to run SQL ✅

To test:
- [ ] Run `/QUICK_ADD_DIRECTOR_NOW.sql`
- [ ] Update a user's role to 'director' in profiles table
- [ ] Log in as director
- [ ] Verify Director Dashboard appears
- [ ] Check 11 menu items visible
- [ ] Test Teachers page

**Everything is ready!** Just run the SQL and set a user to director role. 🚀
