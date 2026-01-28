# Test IT Admin Registration Approvals - NOW ⚡

## Quick Test (2 Minutes)

### Step 1: Log in as IT Admin (30 seconds)

```
Email: it-admin@school.com
Password: [your IT admin password]
```

---

### Step 2: Check Overview Page (30 seconds)

1. After login, you should be on **Overview** page
2. Scroll down
3. **Look for TWO approval sections:**

```
✅ Section 1: Pending Registrations
   👤 User registration applications
   
✅ Section 2: Academic Approvals
   📊 Marks submissions
```

---

### Step 3: Verify Pending Registrations Card (1 minute)

**Should see:**

```
┌─────────────────────────────────────────┐
│ 👤 Pending Registrations                │
│ Review and approve new user apps        │
├─────────────────────────────────────────┤
│                                         │
│ If there are pending registrations:    │
│                                         │
│ • Name: John Doe                        │
│   Role: teacher                         │
│   Email: john@school.com                │
│   [View Details] [Reject] [Approve]     │
│                                         │
│ OR                                      │
│                                         │
│ ✓ No Pending Registrations              │
│   All applications have been processed  │
│                                         │
└─────────────────────────────────────────┘
```

**Expected:**
- ✅ Card visible with title "Pending Registrations"
- ✅ Refresh button at top right
- ✅ List of pending users OR "no pending" message
- ✅ Each registration has Approve/Reject buttons

---

## Full Test with New Registration (5 Minutes)

### Step 1: Create Test Registration (2 minutes)

1. **Log out** (or open incognito window)

2. **Go to Registration Page**
   - Click "Register" or go to `/register`

3. **Select "Administrator Registration"**

4. **Fill in the form:**
   ```
   First Name: Test
   Last Name: Director
   Middle Name: (leave empty)
   Email: test-director-123@school.com
   Password: TestPass123!
   Confirm Password: TestPass123!
   Admin Role: Director
   ```

5. **Submit**
   - Should see success message
   - "Your application has been submitted"

---

### Step 2: Check IT Admin Dashboard (1 minute)

1. **Log in as IT Admin**
   ```
   Email: it-admin@school.com
   ```

2. **Go to Overview**
   - Should see Overview page

3. **Find Pending Registrations Card**
   - Scroll to find "Pending Registrations" section

4. **Look for the new registration:**
   ```
   • Test Director
     admin | test-director-123@school.com
     Submitted: [just now]
   ```

**Expected:**
- ✅ New registration appears in list
- ✅ Shows correct name: "Test Director"
- ✅ Shows role badge: "admin"
- ✅ Shows email: test-director-123@school.com
- ✅ Has "View Details", "Reject", "Approve" buttons

---

### Step 3: View Details (30 seconds)

1. **Click "View Details"**
   - Dialog should open

2. **Check information:**
   ```
   Name: Test Director
   Email: test-director-123@school.com
   Role: admin
   Submitted: [timestamp]
   
   Additional Information:
   Admin Role: director
   ```

**Expected:**
- ✅ All details match what you entered
- ✅ Additional info shows "Admin Role: director"

---

### Step 4: Approve Registration (1 minute)

1. **Close the details dialog**

2. **Click "Approve" button**
   - Button should show "Processing..."
   - Alert: "Registration approved successfully"

3. **Check the list**
   - Test Director should disappear from list
   - (Registration processed)

**Expected:**
- ✅ Success alert appears
- ✅ Registration removed from pending list
- ✅ If no more pending, shows "No Pending Registrations"

---

### Step 5: Verify User Can Log In (30 seconds)

1. **Log out as IT Admin**

2. **Log in as the new Director:**
   ```
   Email: test-director-123@school.com
   Password: TestPass123!
   ```

3. **Should see:**
   - Director Dashboard
   - 11 menu items (Overview, Teachers, Students, etc.)

**Expected:**
- ✅ Can log in successfully
- ✅ Director Dashboard loads
- ✅ All menu items visible

---

## Troubleshooting

### Issue: "Pending Registrations" card not showing

**Fix:**
1. Hard refresh: **Ctrl + Shift + R** (or **Cmd + Shift + R** on Mac)
2. Check you're logged in as IT Admin
3. Verify role in database:
   ```sql
   SELECT role FROM profiles WHERE email = 'it-admin@school.com';
   ```
   Should return: `it_admin`

---

### Issue: No registrations showing

**This is normal if:**
- All registrations have been approved
- No one has registered recently

**To test:**
1. Create a new registration (see Step 1 above)
2. Click "Refresh" button in Pending Registrations card

---

### Issue: Can't approve registrations

**Check:**
1. Are you logged in as IT Admin?
2. Try clicking "Refresh" button
3. Check browser console for errors (F12)

**SQL Check:**
```sql
-- See all pending registrations
SELECT email, first_name, last_name, role, status, submitted_at
FROM registrations
WHERE status = 'pending'
ORDER BY submitted_at DESC;
```

---

### Issue: "Access denied" error

**Fix:**
Your user role is not `it_admin`. Update it:

```sql
UPDATE profiles 
SET role = 'it_admin' 
WHERE email = 'your-email@school.com';
```

Then log out and log back in.

---

## Browser Console Check

Press **F12** → Console tab, run:

```javascript
// Check if Pending Registrations component is rendered
const pendingRegs = document.querySelector('[class*="PendingRegistrations"]');
console.log('Pending Registrations component found:', !!pendingRegs);

// Check current user role from localStorage/sessionStorage
console.log('Current session:', localStorage.getItem('supabase.auth.token'));
```

---

## SQL Diagnostic Queries

### Check Pending Registrations:

```sql
-- See all pending registrations
SELECT 
  email,
  first_name || ' ' || last_name AS name,
  role,
  status,
  submitted_at,
  additional_info
FROM registrations
WHERE status = 'pending'
ORDER BY submitted_at DESC;
```

---

### Check IT Admin User:

```sql
-- Verify IT Admin exists and has correct role
SELECT 
  email,
  first_name || ' ' || last_name AS name,
  role
FROM profiles
WHERE role = 'it_admin';
```

**Expected:** At least one user with `it_admin` role

---

### Check All Registrations:

```sql
-- See all registrations (pending, approved, rejected)
SELECT 
  email,
  first_name || ' ' || last_name AS name,
  role,
  status,
  submitted_at
FROM registrations
ORDER BY submitted_at DESC
LIMIT 20;
```

---

## Expected vs Actual

### IT Admin Overview Page Should Have:

```
✅ Overview Cards (top)
✅ Active Deadlines (if any)
✅ Pending Registrations Card
   ├─ Title: "Pending Registrations"
   ├─ Description: "Review and approve..."
   ├─ Refresh button
   └─ List of pending users OR "No pending" message
✅ Academic Approvals Card
   ├─ Title: "Academic Approvals"
   └─ List of marks submissions OR "All caught up"
✅ Quick Actions
✅ Activity Log
```

---

### Principal Overview Page Should Have:

```
✅ Overview Cards (top)
✅ Active Deadlines (if any)
❌ NO Pending Registrations (removed)
❌ NO Academic Approvals (removed)
✅ Quick Actions
✅ Activity Log
```

---

## Visual Verification

### IT Admin Dashboard Layout:

```
┌────────────────────────────────────────┐
│ IT Admin Dashboard                     │
│ Welcome back...                        │
├────────────────────────────────────────┤
│ [Overview Cards Row]                   │
├────────────────────────────────────────┤
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 👤 Pending Registrations           │ │ ← Should see this
│ │ ──────────────────────────────     │ │
│ │ [List of pending users]            │ │
│ │ Or "No pending registrations"      │ │
│ └────────────────────────────────────┘ │
│                                        │
│ ┌────────────────────────────────────┐ │
│ │ 📊 Academic Approvals              │ │ ← And this
│ │ ──────────────────────────────     │ │
│ │ [List of marks submissions]        │ │
│ │ Or "All caught up"                 │ │
│ └────────────────────────────────────┘ │
│                                        │
│ [Quick Actions]  [Activity Log]        │
│                                        │
└────────────────────────────────────────┘
```

---

## Success Indicators

### ✅ Everything Working If:

1. **IT Admin sees both cards:**
   - Pending Registrations card visible
   - Academic Approvals card visible

2. **Can create and approve:**
   - New registration shows up in list
   - Can click "View Details"
   - Can click "Approve"
   - Registration disappears after approval

3. **Approved user can log in:**
   - New user can log in with credentials
   - Sees correct dashboard for their role

4. **Principal doesn't see approvals:**
   - Principal dashboard has no approval sections
   - Only Quick Actions and Activity Log

---

## Quick Checklist

Before marking as complete:

- [ ] IT Admin can log in
- [ ] Overview page loads
- [ ] "Pending Registrations" card visible
- [ ] "Academic Approvals" card visible
- [ ] Can view registration details
- [ ] Can approve registrations
- [ ] Can reject registrations
- [ ] Approved users can log in
- [ ] Principal sees NO approvals
- [ ] Refresh button works

---

## Summary

**What to test:** IT Admin can see and approve user registrations

**How long:** 2-5 minutes

**Expected result:** 
- ✅ Pending Registrations card visible on IT Admin dashboard
- ✅ Can approve new registrations (including Directors)
- ✅ Approved users can log in successfully

**If it works:** ✅ Fix successful! Registration approval flow is complete.

**If not working:** Check troubleshooting section above or run SQL diagnostic queries.

---

**Start testing now!** 🚀
