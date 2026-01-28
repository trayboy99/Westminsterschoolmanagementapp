# ⚠️ CRITICAL: Backend Edge Function Not Deployed

## The Problem

You're getting **"Failed to fetch"** errors because the backend Edge Function is **NOT RUNNING**.

The frontend is trying to call:
- `/functions/v1/make-server-1ddd013a/subjects`
- `/functions/v1/make-server-1ddd013a/teachers`
- `/functions/v1/make-server-1ddd013a/classes`
- `/functions/v1/make-server-1ddd013a/subject-configs`

But the server is not responding because **it hasn't been deployed** to Supabase.

---

## The Solution: Redeploy the Edge Function

### Step 1: Go to Supabase Dashboard
1. Open your browser and go to: **https://supabase.com/dashboard**
2. Select your project

### Step 2: Navigate to Edge Functions
1. In the left sidebar, click **"Edge Functions"**
2. You should see a function called **`server`** or **`make-server-1ddd013a`**

### Step 3: Redeploy the Function

**Option A: If the function exists but isn't deployed**
1. Click on the function name
2. Look for a **"Deploy"** or **"Redeploy"** button
3. Click it and wait for deployment to complete (usually 30-60 seconds)

**Option B: If no function exists, deploy manually**

Run this command in your terminal:

```bash
npx supabase functions deploy server
```

Or if you have the Supabase CLI installed:

```bash
supabase functions deploy server
```

### Step 4: Verify Deployment

After deployment, test if the backend is running:

**Method 1: Browser Test**
Open this URL in your browser (replace YOUR_PROJECT_ID with your actual project ID):
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health
```

You should see:
```json
{
  "status": "ok",
  "timestamp": "2025-11-16T..."
}
```

**Method 2: Console Test**
Open your browser console and run:
```javascript
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health')
  .then(r => r.json())
  .then(d => console.log('Backend is running:', d))
  .catch(e => console.error('Backend is DOWN:', e))
```

---

## Step 5: Test Your Timetable Subject Config

Once the backend is deployed and responding:

1. **Refresh your browser** (Ctrl+Shift+R or Cmd+Shift+R)
2. **Go to Timetable → Subjects Configuration**
3. **Try configuring a subject**
4. **The button should now change from "Configure" to "Edit"**

---

## Why This Happened

The backend Edge Function code exists in your files at `/supabase/functions/server/index.tsx`, but:

- **Local files ≠ Deployed function**
- Changes to the code don't automatically deploy to Supabase
- You must **manually deploy** or **set up auto-deployment**

---

## Next Time

To avoid this issue in the future:

1. **Always redeploy after backend changes**: Any time you modify `/supabase/functions/server/index.tsx`, you must redeploy
2. **Set up CI/CD**: Configure automatic deployment when you push changes
3. **Check backend first**: Before debugging frontend issues, always verify the backend is running using the `/health` endpoint

---

## Quick Reference

### Find Your Project ID
- Go to Supabase Dashboard → Settings → API
- Look for "Project URL": `https://YOUR_PROJECT_ID.supabase.co`
- Copy the `YOUR_PROJECT_ID` part

### Deploy Command
```bash
npx supabase functions deploy server
```

### Health Check URL
```
https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health
```

---

## If You're Still Getting Errors

If after deploying you still get "Failed to fetch":

1. **Check CORS**: The backend might be blocking requests
2. **Check Authentication**: Make sure you're logged in
3. **Check Browser Console**: Look for specific error messages
4. **Check Supabase Logs**: In Dashboard → Edge Functions → View Logs

Let me know what you see!
