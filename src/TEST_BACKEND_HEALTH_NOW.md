# ⚡ Test Backend Health (30 Seconds)

## Quick Test

### Step 1: Get Your Project ID (10 sec)

```
1. Open /utils/supabase/info.tsx
2. Find: export const projectId = "..."
3. Copy the project ID
```

---

### Step 2: Test Health Endpoint (10 sec)

**Open browser console (F12) and run:**

```javascript
// Replace YOUR_PROJECT_ID with actual ID
fetch('https://YOUR_PROJECT_ID.supabase.co/functions/v1/make-server-1ddd013a/health')
  .then(res => res.json())
  .then(data => console.log('✅ Backend is RUNNING:', data))
  .catch(err => console.error('❌ Backend is DOWN:', err));
```

---

### Step 3: Check Result (10 sec)

**✅ If backend is running:**
```javascript
✅ Backend is RUNNING: {
  status: "ok",
  timestamp: "2025-11-16T12:34:56.789Z"
}
```

**❌ If backend is down:**
```javascript
❌ Backend is DOWN: TypeError: Failed to fetch
```

---

## If Backend Is Down

### Fix 1: Redeploy via Dashboard

```
1. Go to: https://supabase.com/dashboard
2. Select your project
3. Click: "Edge Functions"
4. Find: "make-server-1ddd013a"
5. Click: "Deploy"
6. Wait for "Successfully deployed"
7. Run health test again
```

---

### Fix 2: Check Logs

```
1. Supabase Dashboard
2. Edge Functions → make-server-1ddd013a
3. Click "Logs" tab
4. Look for errors or crashes
5. Share error messages
```

---

### Fix 3: Redeploy via CLI

```bash
# If you have Supabase CLI installed
npx supabase functions deploy make-server-1ddd013a
```

---

## After Backend Is Running

### Try saving configuration again:

```
1. Go to: Timetable → Settings → Subject Configurations
2. Click "Configure" on any subject
3. Fill in all steps
4. Click "Save Configuration"
```

**Expected:**
```
✅ No "Failed to fetch" error
✅ Success toast appears
✅ Config saved
```

---

## Still Having Issues?

### Check detailed console logs:

```
1. Open DevTools (F12)
2. Console tab
3. Try saving again
4. Look for:
   - "Request URL: https://..."
   - "Access token (first 20 chars): ..."
   - "Response status: 200"
```

**Share the full console output if still failing!**

---

**Test backend health now - it takes 30 seconds!** ⚡
