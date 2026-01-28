# ❌ "Failed to Fetch" Error - Troubleshooting Guide

## Error

```
TypeError: Failed to fetch
```

---

## What This Error Means

**"Failed to fetch" = The browser couldn't connect to the backend server**

This is NOT a code bug. This means:
1. ❌ Backend server is not running
2. ❌ Network connectivity issue
3. ❌ CORS blocking the request
4. ❌ Wrong URL or endpoint

---

## Immediate Fix (3 Steps)

### Step 1: Check If Backend Is Running

**Open your Supabase Dashboard:**
```
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click: "Edge Functions" in left sidebar
4. Look for: "make-server-1ddd013a"
5. Check status: Should show "Active" or "Running"
```

**If NOT running:**
```
1. Click on the function
2. Click "Deploy"
3. Wait for deployment to complete
```

---

### Step 2: Test Backend Health

**Open browser console and run:**
```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health')
  .then(res => res.json())
  .then(data => console.log('✅ Backend is running:', data))
  .catch(err => console.error('❌ Backend is NOT running:', err));
```

**Replace `YOUR_PROJECT_ID` with your actual project ID**

**Expected response:**
```json
✅ Backend is running: {
  "status": "ok",
  "timestamp": "2025-11-16T..."
}
```

**If you see error:**
```
❌ Backend is NOT running: TypeError: Failed to fetch
```

**This confirms the backend is down!**

---

### Step 3: Check Network Tab

**Open DevTools:**
```
1. Press F12
2. Click "Network" tab
3. Try saving configuration again
4. Look for failed requests (red)
5. Click on the failed request
6. Check the error details
```

**Common errors you'll see:**

**Error 1: "Failed to fetch"**
```
Status: (failed)
Type: cors
```
**Meaning:** Backend is not running or not reachable

**Error 2: "502 Bad Gateway"**
```
Status: 502
```
**Meaning:** Backend crashed or timed out

**Error 3: "404 Not Found"**
```
Status: 404
```
**Meaning:** Wrong URL or endpoint doesn't exist

**Error 4: "401 Unauthorized"**
```
Status: 401
```
**Meaning:** Authentication token is invalid or expired

---

## Solutions

### Solution 1: Backend Not Running (Most Common)

**Problem:**
- Backend Edge Function stopped or crashed
- Not deployed properly
- Deployment failed

**Fix:**

**Option A: Redeploy via Supabase CLI**
```bash
cd your-project-directory
npx supabase functions deploy make-server-1ddd013a
```

**Option B: Redeploy via Dashboard**
```
1. Go to Supabase Dashboard
2. Edge Functions → make-server-1ddd013a
3. Click "Deploy" button
4. Wait for "Successfully deployed"
```

**Option C: Check Logs**
```
1. Supabase Dashboard
2. Edge Functions → make-server-1ddd013a
3. Click "Logs" tab
4. Look for errors or crash messages
```

---

### Solution 2: CORS Issue

**Problem:**
- Browser blocking request due to CORS policy
- Backend CORS headers not configured

**Fix:**

**Check backend CORS config** (in `/supabase/functions/server/index.tsx`):
```typescript
app.use(
  "/*",
  cors({
    origin: "*",  // ✅ Should be "*" to allow all origins
    allowHeaders: ["Content-Type", "Authorization"],
    allowMethods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    exposeHeaders: ["Content-Length"],
    maxAge: 600,
  }),
);
```

**If CORS is missing, add it and redeploy**

---

### Solution 3: Network Connectivity

**Problem:**
- Your internet connection is down
- Firewall blocking requests
- VPN interfering

**Fix:**

**Test internet:**
```
1. Try opening google.com
2. Try pinging 8.8.8.8
3. Disable VPN temporarily
4. Check firewall settings
```

**Test Supabase connection:**
```javascript
// In browser console
fetch('https://YOUR_PROJECT_ID.supabase.co/rest/v1/')
  .then(res => console.log('✅ Can reach Supabase'))
  .catch(err => console.error('❌ Cannot reach Supabase'));
```

---

### Solution 4: Wrong URL

**Problem:**
- Project ID is incorrect
- Endpoint path is wrong

**Check URL in console:**

The code now logs:
```javascript
Request URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/subject-configs
```

**Verify:**
1. ✅ Project ID matches your Supabase project
2. ✅ Path is `/functions/v1/make-server-1ddd013a/subject-configs`
3. ✅ No typos

**Get correct project ID:**
```
1. Supabase Dashboard
2. Settings → General
3. Copy "Reference ID" or "Project URL"
```

---

### Solution 5: Authentication Token Expired

**Problem:**
- Your login session expired
- Access token is invalid

**Fix:**

**Logout and login again:**
```
1. Click logout in your app
2. Clear browser cache (Ctrl+Shift+Delete)
3. Login again
4. Try saving configuration again
```

**Check token in console:**
```javascript
// The code now logs this:
Access token (first 20 chars): eyJhbGciOiJIUzI1NiI...
```

**If you see `undefined` or error:**
- Your session is invalid
- Logout and login again

---

## Updated Error Messages

### With the fix, you'll now see detailed errors:

**Before (not helpful):**
```
❌ Error saving config: TypeError: Failed to fetch
Error details: Failed to fetch
```

**After (helpful):**
```
❌ Fetch request failed: TypeError: Failed to fetch
This usually means:
1. Backend server is not running
2. Network connectivity issue
3. CORS problem
4. Invalid URL

Network request failed: Failed to fetch. Check if backend server is running.
```

---

## Debugging Checklist

When you see "Failed to fetch":

**Step 1: Check Console**
```
✅ Look for: "Request URL: https://..."
✅ Verify the URL is correct
✅ Check if "Access token" is logged
```

**Step 2: Test Health Endpoint**
```javascript
// In browser console
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health')
  .then(res => res.json())
  .then(data => console.log('✅ Backend running:', data))
  .catch(err => console.error('❌ Backend down:', err));
```

**Step 3: Check Network Tab**
```
✅ F12 → Network tab
✅ Try the action again
✅ Look for red/failed requests
✅ Click on failed request
✅ Check error type
```

**Step 4: Check Backend Logs**
```
✅ Supabase Dashboard
✅ Edge Functions → make-server-1ddd013a
✅ Click "Logs" tab
✅ Look for errors/crashes
```

**Step 5: Try Redeploying**
```
✅ Supabase Dashboard
✅ Edge Functions → make-server-1ddd013a
✅ Click "Deploy"
✅ Wait for success message
✅ Try again
```

---

## Common Scenarios

### Scenario 1: Fresh Deployment

**Symptoms:**
- Was working, now getting "Failed to fetch"
- Just deployed code changes
- Backend logs show crashes

**Likely cause:**
- Backend has a bug and crashed
- Deployment failed partway

**Fix:**
```
1. Check backend logs for error messages
2. Fix any bugs in server/index.tsx
3. Redeploy
4. Test health endpoint
```

---

### Scenario 2: First Time Setup

**Symptoms:**
- Never worked
- Always get "Failed to fetch"
- Backend might not be deployed at all

**Likely cause:**
- Backend not deployed yet
- Wrong project ID

**Fix:**
```
1. Deploy backend: npx supabase functions deploy make-server-1ddd013a
2. Verify project ID in /utils/supabase/info.tsx
3. Test health endpoint
```

---

### Scenario 3: Works Sometimes

**Symptoms:**
- Works randomly
- Fails after a while
- Works after refreshing

**Likely cause:**
- Backend cold starts (takes time to wake up)
- Session timeout
- Network instability

**Fix:**
```
1. Wait 10-15 seconds for cold start
2. Check session expiry
3. Add retry logic
4. Check network stability
```

---

## Testing After Fix

### Test 1: Health Check (10 seconds)

**In browser console:**
```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health')
  .then(res => res.json())
  .then(data => console.log('✅ Health check:', data))
  .catch(err => console.error('❌ Health check failed:', err));
```

**Expected:**
```
✅ Health check: { status: "ok", timestamp: "..." }
```

---

### Test 2: Save Configuration (30 seconds)

```
1. Go to: Timetable → Settings → Subject Configurations
2. Click "Configure" on any subject
3. Fill in all steps
4. Click "Save Configuration"
5. Open console (F12)
```

**Expected console output:**
```javascript
Request URL: https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/subject-configs
Access token (first 20 chars): eyJhbGciOiJIUzI1NiI...
Response status: 200
Backend save successful!
✅ Save complete
```

**Expected UI:**
```
✅ Success toast
✅ Dialog closes
✅ Button shows "Edit"
✅ Green badge
```

---

### Test 3: Network Tab (20 seconds)

```
1. Open DevTools (F12)
2. Network tab
3. Try saving again
4. Look for POST request to /subject-configs
```

**Expected:**
```
✅ Status: 200
✅ Type: fetch
✅ Response: {"success": true, ...}
```

---

## Files Modified

### `/components/timetable/SubjectsConfigManager.tsx`

**Change: Better error handling and logging (Line ~499-522)**

**Added:**
```typescript
const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subject-configs`;
console.log('Request URL:', url);
console.log('Access token (first 20 chars):', session.access_token.substring(0, 20) + '...');

let response;
try {
  response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ configs: updatedConfigs })
  });
} catch (fetchError) {
  console.error('❌ Fetch request failed:', fetchError);
  console.error('This usually means:');
  console.error('1. Backend server is not running');
  console.error('2. Network connectivity issue');
  console.error('3. CORS problem');
  console.error('4. Invalid URL');
  throw new Error(`Network request failed: ${fetchError.message}. Check if backend server is running.`);
}

if (!response.ok) {
  const errorText = await response.text();
  console.error(`❌ Backend returned error status ${response.status}:`, errorText);
  throw new Error(`Backend error (${response.status}): ${errorText}`);
}
```

---

## Summary

### What Causes "Failed to Fetch":
1. ❌ Backend server not running (most common)
2. ❌ Network connectivity issue
3. ❌ CORS blocking
4. ❌ Wrong URL/endpoint
5. ❌ Authentication expired

### How to Fix:
1. ✅ Check if backend is running
2. ✅ Test health endpoint
3. ✅ Redeploy backend if needed
4. ✅ Check network tab for details
5. ✅ Verify URL and project ID

### What Was Updated:
1. ✅ Better error logging
2. ✅ Detailed error messages
3. ✅ URL and token logging
4. ✅ Try-catch for fetch
5. ✅ Response validation

---

**Check if your backend is running, then try again!** 🔧
