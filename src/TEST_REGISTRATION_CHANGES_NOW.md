# Test Registration & Approval Changes - Quick Guide ⚡

## What Changed (2 Things)

1. ✅ **Registration Form**: Added principal, super_admin, and director to admin dropdown
2. ✅ **Pending Approvals**: Moved to IT Admin dashboard only (removed from Principal)

---

## Test 1: Registration Form (2 minutes)

### Step 1: Go to Registration Page

1. Open your app
2. Click **"Register"** or go to registration page
3. Click **"Administrator Registration"**

### Step 2: Check Admin Role Dropdown

1. Scroll to **"Desired Admin Role"** field
2. Click the dropdown
3. **Verify you see:**

```
✅ Principal            ← NEW
✅ Super Admin          ← NEW
✅ Director             ← NEW
✅ Secretary
✅ Transport Manager
✅ IT Administrator
✅ Finance Administrator
```

**Expected:** All 7 roles visible

---

### Step 3: Test Director Registration

1. Fill in the form:
   ```
   First Name: Test
   Last Name: Director
   Email: test-director@school.com
   Password: Test123!
   Confirm Password: Test123!
   Admin Role: Director ← Select this
   ```

2. Click **"Submit Application"**

3. **Expected:**
   - ✅ Success message: "Your application has been submitted"
   - ✅ Form clears
   - ✅ Registration pending approval

---

## Test 2: Principal Dashboard (1 minute)

### Step 1: Log in as Principal

```
Email: principal@school.com
Password: [your principal password]
```

### Step 2: Check Overview Page

1. Go to **Overview** (should be default page)
2. Look at the left column
3. **Verify:**

```
✅ Quick Actions        ← Should be here
❌ Pending Approvals    ← Should NOT be here
```

**Expected:** Pending Approvals section is GONE

---

### Visual Check:

**Before (WRONG):**
```
┌────────────┬──────────┐
│ Pending    │ Activity │
│ Approvals  │ Log      │
│ --------   │          │
│ Quick      │          │
│ Actions    │          │
└────────────┴──────────┘
```

**After (CORRECT):**
```
┌────────────┬──────────┐
│ Quick      │ Activity │
│ Actions    │ Log      │
│            │          │
│            │          │
└────────────┴──────────┘
```

---

## Test 3: IT Admin Dashboard (1 minute)

### Step 1: Log in as IT Admin

```
Email: it-admin@school.com
Password: [your IT admin password]
```

### Step 2: Check Overview Page

1. Go to **Overview**
2. Look at the left column
3. **Verify:**

```
✅ Pending Approvals    ← Should be here
   ├─ Registrations
   └─ Marks Approvals
✅ Quick Actions
```

**Expected:** Pending Approvals section is PRESENT

---

### Step 3: Check Pending Registrations

1. Click **"Registrations"** tab in Pending Approvals
2. **Should see:**
   - Test Director (from Test 1)
   - Other pending registrations

3. **Test approval:**
   - Click "View Details"
   - Review information
   - Click "Approve" (optional)

---

## Test 4: Full Director Flow (3 minutes)

### Complete End-to-End Test

1. **Register as Director** (Test 1 - Step 3)
   - Use email: `new-director@school.com`
   - Select role: Director

2. **Log in as IT Admin**
   - Go to Overview → Pending Approvals
   - Find the new director registration

3. **Approve Director**
   - Click "Approve"
   - Confirm approval

4. **Log in as Director**
   - Email: `new-director@school.com`
   - Password: [password you set]

5. **Verify Director Dashboard**
   - ✅ Should see "Director Dashboard"
   - ✅ Should see 11 menu items:
     - Overview
     - Teachers
     - Students
     - Classes
     - Subjects
     - Compliance Record
     - Timetable
     - Results Check
     - Finance
     - Profile Creation
     - Settings

---

## Quick Verification Checklist

### Registration Form:
- [ ] Admin registration page loads
- [ ] "Desired Admin Role" dropdown has 7 options
- [ ] "Principal" option visible
- [ ] "Super Admin" option visible
- [ ] "Director" option visible
- [ ] Field marked as required (*)
- [ ] Can submit with Director selected

### Principal Dashboard:
- [ ] Logs in successfully
- [ ] Overview page loads
- [ ] NO "Pending Approvals" section
- [ ] Only "Quick Actions" on left
- [ ] "Activity Log" on right
- [ ] Clean, simplified layout

### IT Admin Dashboard:
- [ ] Logs in successfully
- [ ] Overview page loads
- [ ] "Pending Approvals" section present
- [ ] "Registrations" tab visible
- [ ] "Marks Approvals" tab visible
- [ ] Can view pending registrations
- [ ] Can approve/reject users

### Director Dashboard:
- [ ] Director can register
- [ ] IT Admin can approve
- [ ] Director can log in
- [ ] Director Dashboard loads
- [ ] 11 menu items visible
- [ ] All sections accessible

---

## Browser Console Check

Press **F12** and run:

```javascript
// Check registration form has all roles
const form = document.querySelector('form');
const roleSelect = document.querySelector('[id*="admin_role"]');
console.log('Registration form found:', !!form);
console.log('Admin role select found:', !!roleSelect);

// Check current dashboard
const dashboardTitle = document.querySelector('h1');
console.log('Dashboard title:', dashboardTitle?.textContent);

// Check for pending approvals
const pendingApprovals = document.querySelector('[class*="PendingApprovals"]');
console.log('Pending Approvals present:', !!pendingApprovals);
```

---

## Expected Results by Role

### Principal:
```javascript
{
  dashboardTitle: "Principal Dashboard",
  pendingApprovalsPresent: false,  // ← Changed to false
  quickActionsPresent: true,
  activityLogPresent: true
}
```

### IT Admin:
```javascript
{
  dashboardTitle: "IT Admin Dashboard",
  pendingApprovalsPresent: true,   // ← Still true
  quickActionsPresent: true,
  activityLogPresent: true
}
```

### Director:
```javascript
{
  dashboardTitle: "Director Dashboard",
  menuItemsCount: 11,
  pendingApprovalsPresent: false
}
```

---

## Common Issues & Fixes

### Issue: Still seeing old admin role dropdown (4 options)

**Fix:**
1. Hard refresh: **Ctrl + Shift + R** (Windows/Linux)
2. Or: **Cmd + Shift + R** (Mac)
3. Clear browser cache
4. Reload page

---

### Issue: Principal still sees Pending Approvals

**Fix:**
1. Log out completely
2. Clear browser cache
3. Log back in as Principal
4. Should now be gone

---

### Issue: IT Admin doesn't see Pending Approvals

**Fix:**
1. Check user role is exactly `it_admin`
2. Run in SQL:
   ```sql
   SELECT role FROM profiles WHERE email = 'it-admin@school.com';
   ```
3. If not `it_admin`, update:
   ```sql
   UPDATE profiles SET role = 'it_admin' WHERE email = 'it-admin@school.com';
   ```

---

### Issue: Can't submit admin registration

**Fix:**
1. Make sure "Desired Admin Role" is selected (now required)
2. Check all required fields are filled
3. Password must be at least 6 characters
4. Passwords must match

---

## SQL Quick Checks

### Check Pending Registrations:

```sql
-- See all pending registrations
SELECT 
  email, 
  first_name, 
  last_name, 
  additional_info->>'admin_role' as desired_role,
  status,
  created_at
FROM registrations
WHERE status = 'pending'
ORDER BY created_at DESC;
```

### Check User Roles:

```sql
-- See all admin users
SELECT 
  email, 
  first_name, 
  last_name, 
  role 
FROM profiles 
WHERE role IN (
  'principal', 
  'super_admin', 
  'director', 
  'it_admin', 
  'finance_admin', 
  'secretary', 
  'transport_manager'
)
ORDER BY role, last_name;
```

### Check IT Admin Access:

```sql
-- Verify IT Admin role
SELECT 
  email, 
  role,
  CASE 
    WHEN role = 'it_admin' THEN 'Can approve registrations ✅'
    ELSE 'Cannot approve registrations ❌'
  END as approval_access
FROM profiles
WHERE email = 'your-it-admin-email@school.com';
```

---

## Success Indicators

### ✅ Everything Working If:

1. **Registration Form**
   - Dropdown shows 7 admin roles
   - Principal, Super Admin, Director are visible
   - Can select and submit with Director

2. **Principal Dashboard**
   - No Pending Approvals section
   - Clean overview page
   - Quick Actions visible

3. **IT Admin Dashboard**
   - Pending Approvals section present
   - Can see and manage registrations
   - Can approve/reject users

4. **Director Access**
   - Can register as Director
   - IT Admin can approve
   - Can log in with Director account
   - Director Dashboard loads with 11 menu items

---

## Visual Comparison

### Registration Form Dropdown

**Before:**
```
┌─────────────────────┐
│ Secretary           │
│ Transport Manager   │
│ IT Administrator    │
│ Finance Admin       │
└─────────────────────┘
4 options
```

**After:**
```
┌─────────────────────┐
│ Principal           │ ← NEW
│ Super Admin         │ ← NEW
│ Director            │ ← NEW
│ Secretary           │
│ Transport Manager   │
│ IT Administrator    │
│ Finance Admin       │
└─────────────────────┘
7 options
```

---

### Dashboard Layouts

**Principal (Before):**
```
┌──────────────────────┐
│ [Pending Approvals]  │ ← Had this
│ [Quick Actions]      │
└──────────────────────┘
```

**Principal (After):**
```
┌──────────────────────┐
│ [Quick Actions]      │ ← Only this now
└──────────────────────┘
```

**IT Admin (Unchanged):**
```
┌──────────────────────┐
│ [Pending Approvals]  │ ← Still has this
│ [Quick Actions]      │
└──────────────────────┘
```

---

## Summary

**Test Time:** 7 minutes total
- Registration form: 2 min
- Principal dashboard: 1 min
- IT Admin dashboard: 1 min
- Full director flow: 3 min

**Changes to Test:**
1. ✅ 3 new admin roles in registration
2. ✅ Pending Approvals removed from Principal
3. ✅ Pending Approvals kept for IT Admin
4. ✅ Director can register and log in

**Files Changed:**
- `/components/auth/RegistrationForm.tsx`
- `/components/DashboardContent.tsx`

**Ready!** Start testing now! 🚀
