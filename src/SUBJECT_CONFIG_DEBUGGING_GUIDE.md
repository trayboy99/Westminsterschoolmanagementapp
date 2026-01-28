# Subject Configuration Save/Fetch Debugging Guide

## Issue Description
Configurations appear to save but don't persist when switching tabs or refreshing.

## What We Fixed
1. **Added comprehensive backend logging** to track:
   - When configs are received for saving
   - What data is being saved to KV store
   - Verification of saved data
   - What configs are being fetched

2. **Added comprehensive frontend logging** to track:
   - When data is fetched
   - What configs are received from backend
   - What configs are in local state
   - When dialogs open and what config data is loaded
   - When saves occur and what data is sent

## How to Test & Debug

### Step 1: Open Browser Console
1. Open your browser's Developer Tools (F12 or Right-click → Inspect)
2. Go to the **Console** tab
3. Clear the console (click the 🚫 icon)

### Step 2: Test Save Operation
1. Navigate to **Timetable → Subjects Config** tab
2. Watch the console - you should see:
   ```
   === FETCHING DATA ===
   Making parallel fetch requests...
   Parsing responses...
   Configs response: {...}
   Raw configs from backend: X configs
   ```

3. Click **Configure** or **Edit** on any subject
4. Watch console for:
   ```
   === OPENING CONFIG DIALOG ===
   Subject: {...}
   Current configs in state: [...]
   Looking for existing config for subject ID: xxx
   Found existing config: {...} (or null if new)
   ```

5. Fill in the configuration:
   - ✅ Step 1: Select at least one class
   - ✅ Step 2: Add at least one teacher
   - ✅ Step 3: Set periods per week
   - ✅ **Step 4: SELECT A LEVEL** (Junior/Senior/Both) - REQUIRED!
   - ✅ Step 5: Check "paired subject" or "departmental" if needed

6. Click **Save Configuration**
7. Watch console for:
   ```
   === SAVING TO BACKEND ===
   Sending configs to backend: {...}
   Response status: 200
   Response data: {...}
   Backend save successful!
   Updating local configs state with: [...]
   ```

8. Check the **Network** tab in DevTools:
   - Find the POST request to `subject-configs`
   - Check the **Request** payload
   - Check the **Response**

### Step 3: Check Backend Logs
The backend logs will show:
```
=== [Subject Configs POST] Request received ===
[Subject Configs POST] Received X configs to save
[Subject Configs POST] Configs to save: [...]
[Subject Configs POST] Starting to save configs...
[Subject Configs POST] Saving config with key: subject_config:xxx
[Subject Configs POST] Config data: {...}
[Subject Configs POST] Successfully saved config for subject: XXX
[Subject Configs POST] All configs saved successfully
[Subject Configs POST] Verification: Found X configs in KV store after save
```

### Step 4: Test Fetch After Save
1. After saving, the console should automatically show:
   ```
   Verifying save by fetching configs again...
   === FETCHING DATA ===
   ```

2. Check if the configs are fetched back correctly

### Step 5: Test Tab Switch
1. Click on the **Pairs** tab
2. Click back on the **Subjects Config** tab
3. Watch console for fetch operation
4. Click **Edit** on the subject you just configured
5. Check if the configuration is still there

### Step 6: Test Page Refresh
1. Press F5 to refresh the page
2. Navigate back to Timetable → Subjects Config
3. Watch console for fetch operation
4. Check if configurations are still there

## Common Issues & Solutions

### Issue 1: Configs array is empty after save
**Symptoms**: Console shows "Received 0 configs to save"
**Cause**: Local state not updated correctly before save
**Solution**: The save function now updates local state properly

### Issue 2: Backend shows configs saved but frontend doesn't fetch them
**Symptoms**: Backend logs show success, but frontend shows 0 configs
**Cause**: KV store getByPrefix might be returning wrong format
**Check**: Backend fetch logs should show:
```
[Subject Configs GET] Found X configs in KV store
[Subject Configs GET] Raw configs: [...]
```

### Issue 3: Configs disappear after dialog closes
**Symptoms**: Save succeeds but configs state resets
**Cause**: Dialog closing might trigger re-render before state updates
**Solution**: We now call fetchData() after save to re-fetch

### Issue 4: Step 4 (Level Selection) not selected
**Symptoms**: Save validation fails with "Please select a level"
**Cause**: Step 4 is required for pairing checkboxes to work
**Solution**: Always select Junior/Senior/Both before checking paired/departmental

## What to Report Back

Please share:
1. **Console logs** from Steps 2-6 (copy all logs)
2. **Network tab** screenshot showing the POST request and response
3. **Any error messages** you see
4. **Exact steps** that cause the issue to occur

## Expected Behavior After Fixes

✅ Save shows success toast
✅ Config appears in list immediately
✅ Config persists when switching tabs
✅ Config persists when refreshing page
✅ Config appears in Pairs tab if marked as paired/departmental
✅ Console shows all logging from frontend and backend

## Backend KV Store Check

If you have access to Supabase dashboard:
1. Go to **Table Editor**
2. Find the `kv_store_1ddd013a` table
3. Look for keys starting with `subject_config:`
4. Check if your saved configs are there with correct data

## Next Steps

After testing:
1. Share console logs with me
2. Let me know which step fails
3. I'll provide targeted fixes based on the specific issue
