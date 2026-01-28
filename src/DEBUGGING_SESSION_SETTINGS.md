# Debugging Session Settings Error

## Quick Diagnosis Steps

When you get "Failed to update session settings", follow these steps:

### Step 1: Check Browser Console
1. Open browser console (Press F12)
2. Go to the Console tab
3. Look for these specific log messages:

```
[SessionSettings] Sending data: {...}
[SessionSettings] Response status: XXX
[SessionSettings] Response text: {...}
[SessionSettings] Parsed result: {...}
```

### Step 2: Identify the Error Type

#### Error Type A: "Database table does not exist"
**Error Code**: `42P01`

**What it means**: The `academic_sessions` or `academic_terms` tables haven't been created yet.

**Fix**:
1. Open your Supabase Dashboard
2. Go to SQL Editor
3. Open the file: `/RESTRUCTURE_ACADEMIC_CALENDAR.sql`
4. Copy and paste the entire SQL script
5. Run it
6. Try saving session settings again

---

#### Error Type B: "Unauthorized - Admin access required"
**HTTP Status**: `403`

**What it means**: Your user account doesn't have admin privileges.

**Fix**:
1. Check your user role in the `profiles` table
2. Your role must be one of: `principal`, `director`, or `it_admin`
3. Run this SQL to update your role:
```sql
UPDATE profiles 
SET role = 'it_admin' 
WHERE id = 'YOUR_USER_ID';
```

---

#### Error Type C: "Duplicate entry"
**Error Code**: `23505`

**What it means**: A session or term with that exact name already exists.

**Fix**:
1. Use a different session name (e.g., "2026/2027" instead of "2025/2026")
2. Or delete the existing session first:
```sql
DELETE FROM academic_sessions WHERE session_name = '2025/2026';
```

---

#### Error Type D: "Invalid sessions data - must be an array"
**HTTP Status**: `400`

**What it means**: The data being sent to the server is malformed.

**Fix**:
1. Refresh the page
2. Clear browser cache
3. If problem persists, check for JavaScript errors in console

---

## Common Scenarios

### Scenario 1: First Time Setup
**You see**: `Database table does not exist`

**What to do**:
1. This is normal for first-time setup
2. Run the SQL from `/RESTRUCTURE_ACADEMIC_CALENDAR.sql`
3. This creates all necessary tables with proper relationships and triggers

---

### Scenario 2: Empty Error Details
**You see**: `[SessionSettings] Error details: ` (nothing after the colon)

**What it means**: The error response is coming from before the database operation.

**Check these things**:
1. Are you logged in? (Check for `No active session` message)
2. Is your role correct? (Should be principal/director/it_admin)
3. Did the server deploy successfully?

**Additional debugging**:
```javascript
// In browser console, check:
console.log('[SessionSettings] Response status:', res.status);
console.log('[SessionSettings] Response text:', responseText);
```

---

### Scenario 3: Server Returns HTML Instead of JSON
**You see**: `Failed to parse response: SyntaxError: Unexpected token '<'`

**What it means**: Server returned an HTML error page instead of JSON.

**Common causes**:
1. Server function not deployed
2. Wrong endpoint URL
3. Server crashed

**Fix**:
1. Check Supabase Functions logs
2. Redeploy the server function
3. Verify the endpoint URL is correct

---

## Detailed Logging Guide

### Frontend Logs (Browser Console)

Look for this sequence:

```javascript
1. [SessionSettings] Sending data: 
   {
     sessions: [{...}],
     terms: [{...}]
   }

2. [SessionSettings] Response status: 200 (or 400, 403, 500)

3. [SessionSettings] Response text: 
   "{"success":false,"error":"..."}"

4. [SessionSettings] Parsed result: 
   {
     success: false,
     error: "Detailed error message",
     details: {...},
     errorCode: "42P01"
   }
```

### Server Logs (Supabase Dashboard → Edge Functions → Logs)

Look for:

```
[Update Session Settings] Updating sessions and terms...
[Update Session Settings] Sessions: [...]
[Update Session Settings] Terms: [...]
[Update Session Settings] Error updating session: {...}
```

---

## Error Code Reference

| Code | Meaning | Fix |
|------|---------|-----|
| `42P01` | Table does not exist | Run RESTRUCTURE_ACADEMIC_CALENDAR.sql |
| `23505` | Duplicate key violation | Use unique session/term name |
| `23503` | Foreign key violation | Referenced record doesn't exist |
| `401` | Unauthorized | Login required |
| `403` | Forbidden | Admin role required |
| `400` | Bad request | Invalid data format |
| `500` | Server error | Check server logs |

---

## Testing After Fixes

### Test 1: Add a New Session
```
1. Go to Settings → Sessions
2. Click "Add Academic Session"
3. Enter:
   - Session Name: "2026/2027"
   - Start Date: 2026-09-01
   - End Date: 2027-07-31
4. Click "Save All Settings"
5. Check console for success message
```

### Test 2: Update Existing Session
```
1. Modify an existing session name
2. Click "Save All Settings"
3. Refresh page
4. Verify changes persisted
```

### Test 3: Set Current Session
```
1. Click "Set Current" on a session
2. Save settings
3. Verify only one session is marked as current
```

---

## Still Having Issues?

If none of the above fixes work:

1. **Copy all console logs** (Right-click → Save as...)
2. **Copy server function logs** from Supabase Dashboard
3. **Take screenshot** of the error
4. **Note these details**:
   - Your user role
   - What you were trying to do
   - Exact error message
   - Browser and version

5. **Check these files exist**:
   - `/RESTRUCTURE_ACADEMIC_CALENDAR.sql` - Database schema
   - `/supabase/functions/server/index.tsx` - Server code with fixes
   
6. **Verify server deployed**:
   - Check file timestamp: `/supabase/functions/server/DEPLOY_PROMOTION_SESSION_FIX.txt`
   - Should be present if fixes were deployed

---

**Last Updated**: December 8, 2024
**Related Files**: 
- `/components/results/SessionSettings.tsx`
- `/supabase/functions/server/index.tsx` (lines 19873-20117)
- `/RESTRUCTURE_ACADEMIC_CALENDAR.sql`
