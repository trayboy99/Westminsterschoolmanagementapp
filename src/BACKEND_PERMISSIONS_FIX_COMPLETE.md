# Backend Permissions Fix - IT Admin Only ✅

## Issue Identified

IT Admin was seeing the error message:
```
"Insufficient permissions - only Principal and Directors can view pending registrations"
```

This was happening because the **backend server endpoints** had the wrong permission checks.

---

## Root Cause

### Frontend vs Backend Permission Checks

**Frontend (Already Fixed):**
- ✅ `PendingRegistrationsManager.tsx` - checks for `it_admin`

**Backend (Was Broken):**
- ❌ `get-pending-registrations` endpoint - was checking for `principal` or `director`
- ❌ `approve-registration` endpoint - was checking for `principal` or `director`

**Result:** Frontend allowed IT Admin, but backend rejected the request!

---

## Fixes Applied

### File Modified: `/supabase/functions/server/index.tsx`

### Fix 1: Get Pending Registrations Endpoint (Line 981-999)

**BEFORE (Wrong):**
```tsx
// Check if user is admin - only Principal and Super Admin (IT) can view pending registrations
const { data: profile, error: profileError } =
  await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

const authorizedRoles = ["principal", "director"];
if (!profile || !authorizedRoles.includes(profile.role)) {
  return c.json(
    {
      success: false,
      error:
        "Insufficient permissions - only Principal and Directors can view pending registrations",
    },
    403,
  );
}
```

**AFTER (Correct):**
```tsx
// Check if user is IT Admin - only IT Admin can view pending registrations
const { data: profile, error: profileError } =
  await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

if (!profile || profile.role !== "it_admin") {
  return c.json(
    {
      success: false,
      error:
        "Insufficient permissions - only IT Administrators can view pending registrations",
    },
    403,
  );
}
```

---

### Fix 2: Approve Registration Endpoint (Line 1077-1098)

**BEFORE (Wrong):**
```tsx
// Check if user is admin - only Principal and Super Admin (IT) can approve/reject registrations
const { data: adminProfile, error: profileError } =
  await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

const authorizedRoles = ["principal", "director"];
if (
  !adminProfile ||
  !authorizedRoles.includes(adminProfile.role)
) {
  return c.json(
    {
      success: false,
      error:
        "Insufficient permissions - only Principal and Directors can approve registrations",
    },
    403,
  );
}
```

**AFTER (Correct):**
```tsx
// Check if user is IT Admin - only IT Admin can approve/reject registrations
const { data: adminProfile, error: profileError } =
  await supabase
    .from("profiles")
    .select("role, email")
    .eq("id", user.id)
    .maybeSingle();

if (!adminProfile || adminProfile.role !== "it_admin") {
  return c.json(
    {
      success: false,
      error:
        "Insufficient permissions - only IT Administrators can approve registrations",
    },
    403,
  );
}
```

---

## Complete Permission Flow

### Before (Broken) ❌

```
Frontend (IT Admin)
    ↓
Checks: profile.role === 'it_admin' ✅ PASS
    ↓
Makes API request to backend
    ↓
Backend receives request
    ↓
Checks: role in ['principal', 'director'] ❌ FAIL
    ↓
Returns 403 Error
    ↓
Error message shown to user:
"Insufficient permissions - only Principal and Directors..."
```

---

### After (Fixed) ✅

```
Frontend (IT Admin)
    ↓
Checks: profile.role === 'it_admin' ✅ PASS
    ↓
Makes API request to backend
    ↓
Backend receives request
    ↓
Checks: role === 'it_admin' ✅ PASS
    ↓
Returns registration data
    ↓
Success! Registrations displayed
```

---

## All Files Changed Summary

### Total Files Modified: 2

1. **`/components/auth/PendingRegistrationsManager.tsx`** (Frontend)
   - Line 40: Changed to check for `it_admin` only
   - Line 122: Updated error message

2. **`/supabase/functions/server/index.tsx`** (Backend)
   - Lines 981-999: Fixed `get-pending-registrations` permission check
   - Lines 1077-1098: Fixed `approve-registration` permission check

---

## Permission Matrix

### Who Can View Pending Registrations?

| Role              | Frontend Check | Backend Check | Result  |
|-------------------|----------------|---------------|---------|
| IT Admin          | ✅ PASS        | ✅ PASS       | ✅ YES  |
| Principal         | ❌ FAIL        | ❌ FAIL       | ❌ NO   |
| Director          | ❌ FAIL        | ❌ FAIL       | ❌ NO   |
| Finance Admin     | ❌ FAIL        | ❌ FAIL       | ❌ NO   |
| Secretary         | ❌ FAIL        | ❌ FAIL       | ❌ NO   |
| Teacher           | ❌ FAIL        | ❌ FAIL       | ❌ NO   |
| Student           | ❌ FAIL        | ❌ FAIL       | ❌ NO   |

**Only IT Admin has access!** ✅

---

## API Endpoints Updated

### 1. GET Pending Registrations

**Endpoint:**
```
POST /make-server-1ddd013a/get-pending-registrations
```

**Authorization:**
```
Bearer {access_token}
```

**Permission Check:**
```tsx
// User must have role = 'it_admin'
if (!profile || profile.role !== "it_admin") {
  return 403 Forbidden
}
```

**Success Response:**
```json
{
  "success": true,
  "registrations": [
    {
      "email": "test@school.com",
      "first_name": "Test",
      "last_name": "User",
      "role": "teacher",
      "status": "pending",
      "submitted_at": "2024-01-15T10:30:00Z"
    }
  ]
}
```

**Error Response (Non-IT Admin):**
```json
{
  "success": false,
  "error": "Insufficient permissions - only IT Administrators can view pending registrations"
}
```

---

### 2. Approve/Reject Registration

**Endpoint:**
```
POST /make-server-1ddd013a/approve-registration
```

**Request Body:**
```json
{
  "email": "test@school.com",
  "action": "approve"  // or "reject"
}
```

**Permission Check:**
```tsx
// User must have role = 'it_admin'
if (!adminProfile || adminProfile.role !== "it_admin") {
  return 403 Forbidden
}
```

**Success Response:**
```json
{
  "success": true,
  "message": "Registration approved successfully"
}
```

**Error Response (Non-IT Admin):**
```json
{
  "success": false,
  "error": "Insufficient permissions - only IT Administrators can approve registrations"
}
```

---

## Testing Instructions

### Test 1: IT Admin Can View (2 minutes)

1. **Log in as IT Admin**
   ```
   Email: it-admin@school.com
   Role: it_admin
   ```

2. **Go to Overview Page**

3. **Check for Pending Registrations**
   - ✅ Should see "Pending Registrations" card
   - ✅ No error messages
   - ✅ Either shows pending users OR "No Pending Registrations"
   - ✅ NO "Insufficient permissions" error

4. **If there are pending registrations:**
   - ✅ Can click "View Details"
   - ✅ Can click "Approve"
   - ✅ Can click "Reject"

---

### Test 2: Principal Cannot View (1 minute)

1. **Log in as Principal**
   ```
   Email: principal@school.com
   Role: principal
   ```

2. **Go to Overview Page**

3. **Check for Pending Registrations**
   - ❌ Should NOT see "Pending Registrations" card at all
   - ✅ Component should not render (frontend blocks it)

---

### Test 3: Director Cannot View (1 minute)

1. **Log in as Director**
   ```
   Email: director@school.com
   Role: director
   ```

2. **Go to Overview Page**

3. **Check for Pending Registrations**
   - ❌ Should NOT see "Pending Registrations" card at all
   - ✅ Component should not render (frontend blocks it)

---

### Test 4: Full Registration Flow (3 minutes)

1. **Create New Registration**
   - Log out
   - Go to registration page
   - Fill out form:
     ```
     First Name: Test
     Last Name: IT Admin Check
     Email: test-it-check@school.com
     Password: Test123!
     Role: Teacher (or any role)
     ```
   - Submit

2. **Log in as IT Admin**
   - Email: it-admin@school.com

3. **Check Overview Page**
   - ✅ Should see "Pending Registrations" card
   - ✅ Should see "Test IT Admin Check" in list
   - ✅ NO error messages

4. **Approve the Registration**
   - Click "Approve"
   - ✅ Should succeed
   - ✅ Registration removed from list
   - ✅ Success message shown

5. **Verify User Can Log In**
   - Log out
   - Log in as the new user:
     ```
     Email: test-it-check@school.com
     Password: Test123!
     ```
   - ✅ Should successfully log in

---

## Browser Console Checks

### IT Admin Login

Press **F12** → Console, look for:

**Success Indicators:**
```javascript
[PendingRegistrations] Fetching...
[PendingRegistrations] Success: { registrations: [...] }
```

**No Error Messages Like:**
```javascript
❌ "Insufficient permissions"
❌ "403 Forbidden"
❌ "only Principal and Directors"
```

---

### Principal Login

Press **F12** → Console, look for:

```javascript
// Component should not even try to fetch
// No API calls to get-pending-registrations
```

---

## SQL Verification

### Check IT Admin User:

```sql
-- Verify IT Admin has correct role
SELECT 
  id,
  email,
  first_name,
  last_name,
  role
FROM profiles
WHERE role = 'it_admin';
```

**Expected:** At least one user with `role = 'it_admin'`

---

### Check Pending Registrations (KV Store):

Since registrations are in KV store, use the admin panel or check via API:

```bash
# Call the endpoint as IT Admin
curl -X POST https://YOUR_PROJECT.supabase.co/functions/v1/make-server-1ddd013a/get-pending-registrations \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

---

## Error Message Comparison

### Old Error (What you were seeing):

```
┌─────────────────────────────────────────┐
│ Pending Registrations                   │
├─────────────────────────────────────────┤
│ ⚠️ Insufficient permissions - only      │
│    Principal and Directors can view     │ ← WRONG MESSAGE
│    pending registrations                │
│                                         │
│ ✓ No Pending Registrations              │
│   All applications have been processed  │
└─────────────────────────────────────────┘
```

---

### New Behavior (After Fix):

**For IT Admin:**
```
┌─────────────────────────────────────────┐
│ Pending Registrations      [Refresh]    │
├─────────────────────────────────────────┤
│ • Test Director                         │
│   admin | test@school.com               │
│   [View Details] [Reject] [Approve]     │
│                                         │
│ • John Teacher                          │
│   teacher | john@school.com             │
│   [View Details] [Reject] [Approve]     │
└─────────────────────────────────────────┘
```

**OR if no pending:**
```
┌─────────────────────────────────────────┐
│ Pending Registrations      [Refresh]    │
├─────────────────────────────────────────┤
│         ✓                               │
│   No Pending Registrations              │
│   All applications have been processed  │
└─────────────────────────────────────────┘
```

**For Principal/Director:**
```
(Nothing - component doesn't render at all)
```

---

## Visual Comparison

### IT Admin Dashboard - Before (Broken) ❌

```
┌──────────────────────────────────────┐
│ IT Admin Dashboard                   │
├──────────────────────────────────────┤
│ [Overview Cards]                     │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Pending Registrations            │ │
│ ├──────────────────────────────────┤ │
│ │ ⚠️ Insufficient permissions      │ │ ← ERROR
│ │   only Principal and Directors   │ │
│ │                                  │ │
│ │ ✓ No Pending Registrations       │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

### IT Admin Dashboard - After (Fixed) ✅

```
┌──────────────────────────────────────┐
│ IT Admin Dashboard                   │
├──────────────────────────────────────┤
│ [Overview Cards]                     │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ Pending Registrations    [🔄]    │ │
│ ├──────────────────────────────────┤ │
│ │ • Test Director          [admin] │ │ ← DATA LOADS
│ │   test@school.com                │ │
│ │   [Details] [Reject] [Approve]   │ │
│ │                                  │ │
│ │ • John Teacher         [teacher] │ │
│ │   john@school.com                │ │
│ │   [Details] [Reject] [Approve]   │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

---

## Summary of All Changes

### 3 Files Modified Total:

1. **Frontend:** `/components/auth/PendingRegistrationsManager.tsx`
   - ✅ Line 40: `role === 'it_admin'`
   - ✅ Line 122: Updated error message

2. **Backend:** `/supabase/functions/server/index.tsx`
   - ✅ Lines 981-999: Get pending registrations - `role === 'it_admin'`
   - ✅ Lines 1077-1098: Approve registration - `role === 'it_admin'`

---

## Permission Flow Diagram

```
User Logs In
    ↓
What role?
    ↓
┌───────────┬──────────┬──────────┐
│           │          │          │
│ IT Admin  │Principal │ Director │
│           │          │          │
└─────┬─────┴────┬─────┴────┬─────┘
      │          │          │
      ↓          ↓          ↓
   Goes to   Goes to    Goes to
   Overview  Overview   Overview
      ↓          ↓          ↓
      │          │          │
      ↓          ↓          ↓
 Frontend    Frontend   Frontend
  Check       Check      Check
      ↓          ↓          ↓
  it_admin?  it_admin?  it_admin?
      ↓          ↓          ↓
   YES ✅      NO ❌      NO ❌
      ↓          ↓          ↓
 Component   Component  Component
  Renders   Returns    Returns
            null       null
      ↓
 Makes API
  Request
      ↓
  Backend
   Check
      ↓
  it_admin?
      ↓
   YES ✅
      ↓
 Returns
  Data
      ↓
Registrations
 Displayed!
```

---

## Key Points

### ✅ What's Fixed:

1. **Frontend permission check** - only IT Admin
2. **Backend GET endpoint** - only IT Admin
3. **Backend APPROVE endpoint** - only IT Admin
4. **Error messages** - updated to say "IT Administrators"

### ✅ Who Has Access:

- **IT Admin:** Full access to view and approve registrations
- **Principal:** No access (component doesn't render)
- **Director:** No access (component doesn't render)
- **All Others:** No access

### ✅ What IT Admin Can Do:

- View all pending registrations
- See registration details
- Approve registrations
- Reject registrations
- Create user accounts for approved registrations

---

## Troubleshooting

### Issue: Still seeing "Insufficient permissions" error

**Solution:**
1. The backend server needs to be redeployed
2. In Supabase Dashboard:
   - Go to Edge Functions
   - Find "make-server-1ddd013a"
   - Click "Deploy"
3. Wait for deployment to complete
4. Hard refresh your browser (Ctrl + Shift + R)

---

### Issue: Registrations not showing

**Solution:**
1. Check you're logged in as IT Admin
2. Verify role in database:
   ```sql
   SELECT role FROM profiles WHERE email = 'your-email@school.com';
   ```
3. Should return: `it_admin`
4. If not, update:
   ```sql
   UPDATE profiles SET role = 'it_admin' WHERE email = 'your-email@school.com';
   ```

---

### Issue: Can't approve registrations

**Solution:**
1. Check browser console for errors
2. Verify backend is deployed
3. Check access token is valid
4. Try logging out and back in

---

## Next Steps

After the backend redeploys:

1. **Test as IT Admin** - should work perfectly
2. **Test as Principal** - should see no approval section
3. **Test full registration flow** - register → approve → login
4. **Verify all error messages are gone**

---

**The fix is complete! Backend will need to redeploy for changes to take effect.** 🚀

Once deployed, IT Admin will have exclusive access to pending registrations with no permission errors.
