# 🚨 QUICK FIX: "Failed to fetch exams: Unauthorized" Error

## ⚡ Fastest Solution (Works 90% of the time)

### Option 1: Simple Logout/Login
```
1. Click your profile → Logout
2. Close ALL browser tabs
3. Open a new browser tab
4. Login again with admin credentials
5. Go to Results Management
6. Select Session + Term
7. ✅ Exams should load
```

### Option 2: Hard Refresh
```
1. Press Ctrl + Shift + Delete (Windows) or Cmd + Shift + Delete (Mac)
2. Clear "Cookies and site data" + "Cached images and files"
3. Check "All time" as time range
4. Click "Clear data"
5. Refresh the page (Ctrl + F5)
6. Login again
7. ✅ Try Results Management
```

---

## 🔍 Diagnostic Steps (If quick fix doesn't work)

### Step 1: Open Browser Console
1. Press **F12** (or Right-click → Inspect)
2. Click **Console** tab
3. Keep it open while testing

### Step 2: Test the Feature
1. Go to **Results Management**
2. Select a **Session** (e.g., "2024/2025")
3. Select a **Term** (e.g., "First Term")
4. **Watch the console** for logs

### Step 3: Check Console Output

#### ✅ GOOD (Working):
```
[AdminResultManagement] Fetching exams with auth token: eyJhbGci...
[AdminResultManagement] Fetching exams with params: {session: "2024/2025", term: "First Term", hasToken: true}
[AdminResultManagement] Exams response status: 200
[AdminResultManagement] Exams response data: {success: true, exams: Array(5)}
```
**Result:** Exams dropdown populates ✅

#### ❌ BAD (Not Working):
```
[AdminResultManagement] No session found
```
**Solution:** Log out and log back in

OR

```
[AdminResultManagement] Exams response status: 401
[AdminResultManagement] Exams response data: {success: false, error: "Unauthorized"}
```
**Solution:** Session expired - log out and log back in

---

## 🐛 Advanced Debugging

### Check if Classes/Sessions Load
If you can see the **Class**, **Session**, and **Term** dropdowns populated, it means:
- ✅ You ARE logged in
- ✅ Authentication IS working
- ❌ Something specific to the Exams endpoint is failing

### Check Network Tab
1. Open **Network** tab in DevTools (F12)
2. Filter by "Fetch/XHR"
3. Select Session + Term to trigger the request
4. Look for request to `/make-server-1ddd013a/exams`
5. Click on it → **Headers** tab

**What to check:**
- **Request Headers** → Look for `Authorization: Bearer eyJ...`
  - ✅ If present: Token is being sent
  - ❌ If missing: Frontend issue

- **Response** → Check status code
  - **200**: Success (but maybe returning error in body)
  - **401**: Unauthorized (session invalid)
  - **500**: Server error

### Check Response Body
Click on the failing request → **Response** tab

**If you see:**
```json
{
  "success": false,
  "error": "Unauthorized: No access token provided"
}
```
**Solution:** Token isn't being sent. Log out/in.

**If you see:**
```json
{
  "success": false,
  "error": "Unauthorized: Invalid user session"
}
```
**Solution:** Token is invalid. Log out/in.

**If you see:**
```json
{
  "success": false,
  "error": "Unauthorized: <some Supabase error>"
}
```
**Solution:** Supabase authentication issue. Check project status.

---

## 📋 Verification Checklist

Before reporting the issue, verify:

- [ ] I can see the **Class dropdown** populated (confirms auth works)
- [ ] I can see the **Session dropdown** populated (confirms API access)
- [ ] I can see the **Term dropdown** populated
- [ ] Clicking on Session shows sessions (no error)
- [ ] Clicking on Term shows terms (no error)
- [ ] **ONLY the Exam dropdown fails** with "Unauthorized"
- [ ] I've tried logging out and back in
- [ ] I've cleared browser cache
- [ ] I've checked console logs (F12)
- [ ] Console shows `[AdminResultManagement]` logs

---

## 🎯 Expected Behavior

### What SHOULD Happen:
1. Open Results Management
2. See 4 dropdowns: Class, Session, Term, Exam
3. **Class dropdown** → Shows all classes (e.g., JSS1, JSS2, SS1, etc.)
4. **Session dropdown** → Shows sessions (e.g., 2024/2025, 2023/2024)
5. **Term dropdown** → Shows terms (First Term, Second Term, Third Term)
6. **Select Session + Term**
7. **Exam dropdown becomes active**
8. Click Exam dropdown
9. **Shows exams for that session/term** (e.g., "First CA", "Mid Term", etc.)
10. Select all filters
11. Click "View Students"
12. See list of students with "View Result" buttons

### What's CURRENTLY Happening (Bug):
Step 8 shows: "❌ Failed to fetch exams: Unauthorized"

---

## 🔧 Technical Investigation

If you're a developer investigating:

### Check Supabase Edge Function Logs
1. Go to Supabase Dashboard
2. Edge Functions → `make-server-1ddd013a`
3. View Logs
4. Look for `[Exams API]` entries

**Expected logs when working:**
```
[Exams API] Authorization header: Present
[Exams API] Access token: Present (eyJhbGciOiJIUzI1Ni...)
[Exams API] Auth result - User ID: <uuid>
[Exams API] Auth error: None
[Exams API] ✅ User authenticated: <uuid>
Fetching exams...
[Exams] Query params: {session: "2024/2025", term: "First Term", ...}
Successfully fetched 5 exams
```

**Error logs to look for:**
```
[Exams API] ERROR: No access token provided
OR
[Exams API] ERROR: Auth verification failed: <message>
OR
[Exams API] ERROR: User ID not found after successful auth check
```

### Verify Database
Run this SQL in Supabase SQL Editor:
```sql
-- Check if exams exist for the selected session/term
SELECT id, name, session, term, status 
FROM exams 
WHERE session = '2024/2025' 
  AND term = 'First Term'
ORDER BY created_at DESC;
```

If this returns exams, the data exists. The issue is authentication.

### Verify User Role
```sql
-- Check your user's role
SELECT id, email, role 
FROM profiles 
WHERE email = 'your-admin-email@example.com';
```

Should return `role: 'admin'` or `role: 'principal'` or `role: 'it_admin'`

---

## 💡 Why This Happens

### Common Causes:
1. **Session Timeout** - Your login session expired (most common)
2. **Stale Token** - Browser cached an old authentication token
3. **Multiple Tabs** - Logged out in one tab, still logged in another
4. **Supabase Project Issue** - Project is paused or has authentication issues

### Why Other Endpoints Work:
The Classes and Sessions endpoints might be called **before** your session expired, or they might be using **cached data** from localStorage or a previous successful call.

---

## ✅ Confirmation Test

After applying the fix:
1. Open Results Management
2. Select Session: **2024/2025**
3. Select Term: **First Term**
4. **Exam dropdown should show exams** (not error)
5. Select an Exam
6. Select a Class
7. Click "View Students"
8. **Students list should appear**
9. Click "View Midterm Result" or "View Terminal Result" on any student
10. **Report card should load**

If ALL these steps work → ✅ **FIXED!**

---

## 📞 Still Not Working?

Share these details:
1. Browser console logs (copy the `[AdminResultManagement]` lines)
2. Network tab screenshot (showing the failed `/exams` request)
3. Supabase Edge Function logs (the `[Exams API]` entries)
4. Whether other admin features work (Classes, Students, etc.)

This will help diagnose if it's:
- A frontend issue (token not sent)
- A backend issue (token not verified)
- A Supabase configuration issue
