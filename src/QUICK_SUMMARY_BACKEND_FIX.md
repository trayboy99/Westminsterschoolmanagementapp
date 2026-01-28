# Quick Summary - Backend Permission Fix ⚡

## Problem

IT Admin saw this error:
```
"Insufficient permissions - only Principal and Directors can view pending registrations"
```

---

## Root Cause

**Backend server** had wrong permission checks:
- Was checking for `principal` or `director`
- Should check for `it_admin` only

---

## Fix Applied

**File:** `/supabase/functions/server/index.tsx`

**Changed 2 permission checks:**

1. **Get pending registrations** (line ~989)
   ```tsx
   // OLD
   authorizedRoles = ["principal", "director"]
   
   // NEW
   profile.role !== "it_admin"
   ```

2. **Approve registration** (line ~1085)
   ```tsx
   // OLD
   authorizedRoles = ["principal", "director"]
   
   // NEW
   adminProfile.role !== "it_admin"
   ```

---

## What You Need to Do

### ⚠️ IMPORTANT: Deploy the Backend

The code is fixed, but **backend must be redeployed**:

1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Find **"make-server-1ddd013a"** or **"server"**
4. Click **"Deploy"** or **"Redeploy"**
5. Wait ~30-60 seconds

**OR use CLI:**
```bash
supabase functions deploy server
```

---

## After Deployment

1. **Clear browser cache** (Ctrl + Shift + R)
2. **Log out and log back in** as IT Admin
3. **Go to Overview page**
4. **Check Pending Registrations** - should work now!

---

## Expected Result

### IT Admin Dashboard:

**Before:**
```
❌ "Insufficient permissions - only Principal and Directors..."
```

**After:**
```
✅ List of pending registrations
✅ Can approve/reject
✅ No error messages
```

---

## Files Changed

- `/components/auth/PendingRegistrationsManager.tsx` (frontend) ✅
- `/supabase/functions/server/index.tsx` (backend) ⚠️ Needs deployment

---

## Documentation

- **Full Guide:** `/BACKEND_PERMISSIONS_FIX_COMPLETE.md`
- **Deploy Guide:** `/DEPLOY_BACKEND_FIX_NOW.md`

---

**Status:** ✅ Code fixed, waiting for backend deployment
