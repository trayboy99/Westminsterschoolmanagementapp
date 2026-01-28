# 🔍 Test if Backend is Running

## Quick Test (30 seconds)

### Step 1: Get Your Project ID

1. Open your Supabase dashboard: https://supabase.com/dashboard
2. Select your project
3. Look at the URL - it will be something like:
   ```
   https://app.supabase.com/project/[YOUR-PROJECT-ID]/...
   ```
4. Copy the `[YOUR-PROJECT-ID]` part

---

### Step 2: Test the Health Endpoint

Open a new browser tab and paste this URL (replace with YOUR project ID):

```
https://[YOUR-PROJECT-ID].supabase.co/functions/v1/make-server-1ddd013a/health
```

**Example:**
If your project ID is `abcdefghijk`, use:
```
https://abcdefghijk.supabase.co/functions/v1/make-server-1ddd013a/health
```

---

### Step 3: Check the Response

#### ✅ If Backend is RUNNING:
You'll see a JSON response like this:
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T10:30:45.123Z"
}
```
**→ Your backend is working! The "Failed to fetch" error is something else.**

---

#### ❌ If Backend is DOWN:
You'll see one of these:
- **Error page** with "Function not found" or "Service Unavailable"
- **Timeout** (page keeps loading, never finishes)
- **CORS error** in the browser console

**→ Your backend needs to be redeployed.**

---

## 🚀 How to Redeploy Backend

### Via Supabase Dashboard:

1. **Go to**: https://supabase.com/dashboard
2. **Select your project**
3. **Click**: Edge Functions (in left sidebar)
4. **Find**: The function (might be named `make-server-1ddd013a` or `server`)
5. **Click**: The three dots menu (⋮) next to the function
6. **Select**: "Redeploy" or "Deploy again"
7. **Wait**: 30-60 seconds for deployment
8. **Test again**: Visit the health endpoint

---

## 🎯 After Redeploying

Once the health endpoint returns `{"status":"ok"}`:

1. **Refresh your application** in the browser
2. **Go to**: Timetable → Settings → Configuration
3. **Try configuring a subject** again
4. **Check if** the "Failed to fetch" error is gone

---

## 🐛 Still Getting Errors?

### If health endpoint works but you still get "Failed to fetch":

Check the browser console (F12) for the exact error. It might be:
- **Auth error** (401) - Your session might have expired, try logging out and back in
- **CORS error** - The backend might need CORS headers fixed
- **Different endpoint failing** - Not all endpoints might be working

### If health endpoint doesn't work:

1. **Check Edge Function logs**:
   - Go to Supabase Dashboard → Edge Functions
   - Click on your function
   - Click "Logs" tab
   - Look for startup errors (in red)

2. **Check environment variables**:
   - Go to Supabase Dashboard → Edge Functions
   - Click "Settings"
   - Make sure these are set:
     - `SUPABASE_URL`
     - `SUPABASE_SERVICE_ROLE_KEY`
     - `SUPABASE_ANON_KEY`

3. **Try manual deployment**:
   - If using Supabase CLI, run:
     ```bash
     supabase functions deploy make-server-1ddd013a
     ```

---

## 📊 Diagnostic Checklist

Run through this checklist:

- [ ] Health endpoint URL is correct (has your project ID)
- [ ] Health endpoint returns `{"status":"ok"}`
- [ ] Edge Function is deployed in Supabase Dashboard
- [ ] Edge Function logs show no errors
- [ ] Environment variables are set
- [ ] You're logged into the application
- [ ] Browser cache cleared (Ctrl+Shift+R)

---

## 💡 Common Causes

### Why backends go down:

1. **Auto-sleep** - Supabase Edge Functions can sleep after inactivity
2. **Failed deployment** - Recent code changes might have broken it
3. **Resource limits** - Function might have hit memory/timeout limits
4. **Configuration issue** - Environment variables missing or wrong

### The fix is almost always:

**Just redeploy the Edge Function in the Supabase Dashboard.** ✅

---

## ⚡ Quick Reference

**Health Check URL Pattern:**
```
https://[PROJECT-ID].supabase.co/functions/v1/make-server-1ddd013a/health
```

**Expected Response:**
```json
{"status":"ok","timestamp":"..."}
```

**If you see this**, your backend is alive! 🎉
