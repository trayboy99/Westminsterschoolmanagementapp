# Quick Fix - Role Constraint Error ⚡

## Problem

```
Failed to create user profile: new row for relation "profiles" 
violates check constraint "profiles_role_check"
```

---

## Root Cause

**Backend was inserting wrong role:**
- Tried to insert: `role = "admin"` ❌
- Database expects: `role = "director"`, `"it_admin"`, etc. ✅

---

## Fix Applied

**File:** `/supabase/functions/server/index.tsx` (Line ~1150)

**BEFORE:**
```tsx
role: registrationData.role,  // = "admin" ❌
```

**AFTER:**
```tsx
// Extract specific admin role
let actualRole = registrationData.role;
if (registrationData.role === "admin") {
  actualRole = registrationData.additional_info.admin_role;
}
// Use: actualRole  // = "director", "it_admin", etc. ✅
```

---

## What to Do

1. **Deploy backend** (Supabase Dashboard → Edge Functions → Deploy)
2. **Test approval** (Register as Director → Approve → Should work)
3. **Verify login** (New user can log in successfully)

---

## Expected Result

### BEFORE:
```
❌ Constraint violation error
❌ Profile not created
❌ User stuck in pending
```

### AFTER:
```
✅ Approval succeeds
✅ Profile created with correct role
✅ User can log in
```

---

**Full Documentation:** `/PROFILE_ROLE_CHECK_CONSTRAINT_FIX.md`

**Status:** ✅ Fixed, needs backend deployment
