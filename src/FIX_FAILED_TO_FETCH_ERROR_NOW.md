# 🚨 Fix "Failed to Fetch" Error - Backend Down

## The Problem
```
TypeError: Failed to fetch
```

This error means **the backend server is not responding**. The frontend is trying to make requests but can't reach the backend.

## ✅ Quick Solution (3 Steps)

### Step 1: Check if Backend is Running

Open a new browser tab and go to:
```
https://[your-project-id].supabase.co/functions/v1/make-server-1ddd013a/health
```

**Replace `[your-project-id]` with your actual Supabase project ID.**

**What you should see:**
- ✅ If working: `{"status":"ok","timestamp":"2025-..."}`
- ❌ If down: Error page or timeout

---

### Step 2: Redeploy the Backend

The backend server needs to be redeployed. Here's how:

#### Option A: Via Supabase Dashboard (Recommended)

1. **Go to Supabase Dashboard**: https://supabase.com/dashboard
2. **Select your project**
3. **Click "Edge Functions"** in the left sidebar
4. **Find the function** named `make-server-1ddd013a` or `server`
5. **Click the 3 dots menu** → **"Redeploy"**
6. **Wait 30-60 seconds** for deployment to complete
7. **Test again** - Visit the health endpoint

#### Option B: Force Redeploy via Code Comment

If Option A doesn't work, I can modify a comment in the server file to force a redeploy.

---

### Step 3: Verify It's Working

After redeploying, test these endpoints:

1. **Health Check:**
   ```
   GET https://[project-id].supabase.co/functions/v1/make-server-1ddd013a/health
   ```
   Should return: `{"status":"ok"}`

2. **Subject Configs:**
   ```
   GET https://[project-id].supabase.co/functions/v1/make-server-1ddd013a/subject-configs
   ```
   (You'll need to be logged in and pass Authorization header)

---

## 🔍 Why This Happened

The backend Edge Function may have:
- **Auto-stopped** due to inactivity
- **Failed to deploy** after recent code changes
- **Crashed** due to an error

Supabase Edge Functions can sometimes enter a stopped state and need manual redeployment.

---

## 🧪 Test After Redeploying

Once the backend is back online:

1. **Go to Subject Configuration:**
   - Navigate to: Timetable → Settings → Configuration Tab

2. **Open Browser Console** (F12)

3. **Configure a Subject:**
   - Click "Configure" on any subject
   - Fill in the required fields
   - Click "Save Configuration"

4. **Check Console:**
   Should see:
   ```
   ✅ Save complete - configs persisted to backend
   🔄 Refetching from backend to ensure UI sync...
   ```

   Should NOT see:
   ```
   ❌ Fetch request failed
   ❌ Network request failed
   ```

---

## 🚑 If Still Not Working

### Check 1: Environment Variables
Make sure these environment variables are set in Supabase Dashboard → Settings → Edge Functions:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

### Check 2: View Function Logs
In Supabase Dashboard:
1. Go to Edge Functions
2. Click on your function
3. Click "Logs" tab
4. Look for errors (red messages)

### Check 3: Network Tab
In browser (F12 → Network tab):
1. Filter by "Fetch/XHR"
2. Try to configure a subject
3. Look for failed requests (red)
4. Click on the failed request
5. Check the error message

---

## 📋 Quick Checklist

- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Backend is deployed in Supabase Dashboard
- [ ] Environment variables are set
- [ ] No errors in Edge Function logs
- [ ] Subject configuration saves successfully
- [ ] UI updates after saving

---

## 🎯 Expected Flow After Fix

1. User clicks "Configure" on a subject
2. User fills in form and clicks "Save"
3. **Backend receives request** ✅
4. **Backend saves to KV store** ✅
5. **Backend returns success with configs** ✅
6. **Frontend updates state** ✅
7. **UI shows subject as configured** ✅
8. **Auto-refetch after 300ms** ✅
9. **UI remains in sync** ✅

---

## 💡 Pro Tip

To prevent this in the future, you can:
1. Set up automatic health checks
2. Pin the Edge Function to stay warm
3. Or simply redeploy when you see "Failed to fetch" errors

The Edge Function should stay running once deployed, but may need occasional redeployment if it crashes or auto-stops.
