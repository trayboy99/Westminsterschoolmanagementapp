# Deploy Backend Fix - Quick Guide 🚀

## What Needs to Happen

The backend server code has been updated, but it needs to be **redeployed** to Supabase for the changes to take effect.

---

## Option 1: Automatic Deployment (If Configured)

If you have automatic deployments set up, the changes should deploy automatically within a few minutes.

**Check deployment status:**
1. Go to Supabase Dashboard
2. Navigate to **Edge Functions**
3. Look for deployment activity
4. Wait for "Deployed" status

---

## Option 2: Manual Deployment via Supabase Dashboard

### Step 1: Go to Supabase Dashboard

1. Open https://supabase.com
2. Log in to your account
3. Select your project

### Step 2: Navigate to Edge Functions

1. Click **"Edge Functions"** in the left sidebar
2. Find the function: **"make-server-1ddd013a"** (or "server")

### Step 3: Deploy the Function

1. Click on the function name
2. Look for **"Deploy"** or **"Redeploy"** button
3. Click it
4. Wait for deployment to complete (usually 30-60 seconds)
5. Status should change to "Active" or "Deployed"

---

## Option 3: Deploy via Supabase CLI (If Installed)

If you have the Supabase CLI installed:

```bash
# Navigate to your project directory
cd /path/to/your/project

# Deploy the edge function
supabase functions deploy server

# Or deploy all functions
supabase functions deploy
```

---

## Verify Deployment

### Method 1: Check Edge Functions Dashboard

1. In Supabase Dashboard
2. Go to **Edge Functions**
3. Check **"Last Deployed"** timestamp
4. Should be recent (within last few minutes)

### Method 2: Test the Endpoint

```bash
# Test health endpoint
curl https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health

# Should return:
# {
#   "status": "ok",
#   "timestamp": "2024-01-15T..."
# }
```

---

## After Deployment

### Step 1: Clear Browser Cache

1. Press **Ctrl + Shift + R** (Windows/Linux)
2. Or **Cmd + Shift + R** (Mac)
3. This forces a hard refresh

### Step 2: Log Out and Back In

1. Log out of your IT Admin account
2. Log back in
3. Go to Overview page

### Step 3: Verify Fix

**You should now see:**
```
┌─────────────────────────────────────────┐
│ Pending Registrations      [Refresh]    │
├─────────────────────────────────────────┤
│                                         │
│ [List of pending registrations]         │
│ OR                                      │
│ "No Pending Registrations"              │
│                                         │
└─────────────────────────────────────────┘
```

**You should NOT see:**
```
❌ "Insufficient permissions - only Principal and Directors..."
```

---

## Troubleshooting

### Issue: Don't see Edge Functions in Dashboard

**Solution:**
- Edge Functions might be in a different section
- Try looking under "Functions" or "Serverless"
- Or use the CLI method instead

---

### Issue: No Deploy Button

**Solution:**
- You might need to redeploy via CLI
- Or the function auto-deploys on code changes
- Wait a few minutes and check again

---

### Issue: Deployment Failed

**Solution:**
1. Check error logs in Supabase Dashboard
2. Look for syntax errors
3. Verify all environment variables are set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
   - `SUPABASE_ANON_KEY`

---

### Issue: Still seeing permission error after deployment

**Solution:**
1. **Clear browser cache completely:**
   - Chrome: Settings → Privacy → Clear browsing data
   - Check "Cached images and files"
   - Click "Clear data"

2. **Log out and log back in**

3. **Check deployment timestamp**
   - Make sure deployment is actually complete
   - Should see recent timestamp

4. **Check server logs:**
   - In Supabase Dashboard → Edge Functions
   - Click on function
   - View logs
   - Look for permission check logs

---

## Expected Timeline

| Action                     | Time Required    |
|---------------------------|------------------|
| Code changes made         | ✅ Complete      |
| Trigger deployment        | 10 seconds       |
| Deployment in progress    | 30-60 seconds    |
| Deployment complete       | ✅ Done          |
| Clear browser cache       | 5 seconds        |
| Test the fix              | 1 minute         |
| **Total:**                | **~2-3 minutes** |

---

## Quick Test After Deployment

### Test 1: IT Admin (30 seconds)

```
1. Log in as IT Admin
2. Go to Overview
3. Look for "Pending Registrations"
4. Should see NO error message
5. Should see pending users OR "No pending" message
```

**Expected:** ✅ Works perfectly

---

### Test 2: Principal (30 seconds)

```
1. Log in as Principal
2. Go to Overview
3. Should NOT see "Pending Registrations" at all
```

**Expected:** ✅ Component doesn't render

---

## Visual Success Indicator

### BEFORE Deployment ❌

```
IT Admin Dashboard:
┌──────────────────────────┐
│ Pending Registrations    │
├──────────────────────────┤
│ ⚠️ Insufficient perms    │ ← ERROR
│   only Principal and     │
│   Directors...           │
└──────────────────────────┘
```

### AFTER Deployment ✅

```
IT Admin Dashboard:
┌──────────────────────────┐
│ Pending Registrations    │
├──────────────────────────┤
│ • Test User    [approve] │ ← WORKING
│ • John Doe     [approve] │
│                          │
└──────────────────────────┘
```

---

## Files That Changed (Reference)

1. `/components/auth/PendingRegistrationsManager.tsx` (frontend)
2. `/supabase/functions/server/index.tsx` (backend) ← **This needs deployment**

---

## What Changed in Backend

### Two Permission Checks Fixed:

1. **Get Pending Registrations** (line ~989)
   ```tsx
   // OLD
   const authorizedRoles = ["principal", "director"];
   
   // NEW
   if (!profile || profile.role !== "it_admin")
   ```

2. **Approve Registration** (line ~1085)
   ```tsx
   // OLD
   const authorizedRoles = ["principal", "director"];
   
   // NEW
   if (!adminProfile || adminProfile.role !== "it_admin")
   ```

---

## Summary

**What to do:**
1. Deploy the backend function (via Dashboard or CLI)
2. Wait for deployment to complete
3. Clear browser cache
4. Log out and back in as IT Admin
5. Test pending registrations

**Expected result:**
- ✅ IT Admin can see pending registrations
- ✅ No permission errors
- ✅ Can approve/reject registrations
- ✅ Principal sees nothing (as intended)

---

**Once deployed, the fix will be live!** 🎉

Let me know when deployment is complete and I'll help verify everything is working.
