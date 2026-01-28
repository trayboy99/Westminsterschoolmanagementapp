# 🧪 TEST SESSION FIX - COMPLETE GUIDE

## 🎯 What We Fixed

**CRITICAL BUG:** Teacher uploads were saving access tokens in the `session` field instead of "2025/2026"

**ROOT CAUSE:** Variable name collision - `session` was being overwritten by auth session object

**FILES FIXED:**
- ✅ `/components/teacher/TeacherUploads.tsx` (5 places)
- ✅ `/components/uploads/UploadForm.tsx` (3 places)

---

## 📋 Testing Checklist

### ✅ STEP 1: Fix Existing Corrupted Data

Run this SQL in Supabase SQL Editor:

```bash
Open: FIX_CORRUPTED_SESSIONS_NOW.sql
```

This will:
1. Show all corrupted sessions
2. Fix them to "2025/2026"
3. Verify the fix worked

**Expected Output:**
```
✅ SUCCESS - No corrupted sessions found!
```

---

### ✅ STEP 2: Test Teacher Upload (NEW FILES)

1. **Login as Teacher**
   - Use any teacher account
   - Go to "Uploads" section

2. **Create New Upload**
   - Click "Upload Files"
   - Fill form:
     ```
     Title: Test E-Note Week 1
     Class: JSS3 Diamond
     Subject: Mathematics
     Type: E-Notes
     Week: 1
     Session: 2025/2026  ← CRITICAL!
     Term: First Term
     ```
   - Upload a PDF file
   - Click "Upload"

3. **Verify Upload Success**
   - Should see success toast
   - File should appear in "My Uploads"
   - Status: "Pending" or "Approved"

---

### ✅ STEP 3: Check Database (CRITICAL)

Open Supabase SQL Editor and run:

```sql
-- Get the most recent upload
SELECT 
  id,
  title,
  session,  -- Should be "2025/2026", NOT a token!
  term,
  type,
  week,
  class_id,
  status,
  created_at
FROM uploads
ORDER BY created_at DESC
LIMIT 1;
```

**✅ PASS Criteria:**
```
session: "2025/2026"  ← Should be this!
```

**❌ FAIL Criteria:**
```
session: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."  ← NOT this!
```

---

### ✅ STEP 4: Test Student View

1. **Login as Student**
   - Use a student in JSS3 Diamond class
   - Go to "Notes" section

2. **Navigate Folder Structure**
   ```
   Click: 2025/2026
   Click: First Term
   Click: E-Notes
   Click: Week 1
   ```

3. **Verify File Appears**
   - ✅ Should see "Test E-Note Week 1"
   - ✅ Should show subject badge (Mathematics)
   - ✅ Should have Preview button
   - ✅ Should have Download button

4. **Test Preview**
   - Click "Preview"
   - PDF should open in dialog
   - Should display correctly

5. **Test Download**
   - Click "Download"
   - File should download with correct name

---

### ✅ STEP 5: Console Log Check

**Open Browser Console (F12):**

**Teacher Upload - Should See:**
```
[TeacherUploads] Sending payload: {
  subject_id: "...",
  class_id: "JSS3-DIAMOND",
  type: "e-note",
  week: 1,
  term: "First Term",
  session: "2025/2026",  ← CORRECT!
  files: [...]
}
```

**Student View - Should See:**
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StudentFileExplorer] 📥 FETCHING FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StudentFileExplorer] Parameters (RAW): {
  session: "2025/2026",
  term: "First Term",
  resourceType: "E-Notes",
  week: "Week 1"
}
[Backend] Query filters: {
  session: "2025/2026",  ← MATCHES!
  term: "First Term",
  type: "e-note",
  week: 1,
  class_id: "JSS3-DIAMOND"
}
[Backend] Found 1 files
```

---

## 🔍 Detailed Verification

### Check All Session Values in Database

```sql
-- Show all unique session values
SELECT 
  session,
  COUNT(*) AS count,
  CASE 
    WHEN session ~ '^\d{4}/\d{4}$' THEN '✅ Valid Format'
    WHEN LENGTH(session) > 50 THEN '❌ Looks like a token'
    WHEN session LIKE 'eyJ%' THEN '❌ JWT Token'
    ELSE '⚠️ Unknown Format'
  END AS status
FROM uploads
GROUP BY session
ORDER BY count DESC;
```

**Expected Result:**
```
session         | count | status
----------------|-------|------------------
2025/2026       | 15    | ✅ Valid Format
2024/2025       | 3     | ✅ Valid Format
```

**Bad Result (if bug not fixed):**
```
session                                    | count | status
-------------------------------------------|-------|------------------
eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...   | 8     | ❌ JWT Token
2025/2026                                  | 2     | ✅ Valid Format
```

---

## 🐛 Common Issues

### Issue 1: Students Still Can't See Files

**Symptoms:**
- Upload succeeds
- Database shows "2025/2026"
- But student sees "No Files Found"

**Possible Causes:**
1. Class ID mismatch (student.class_id != upload.class_id)
2. Status not "approved" 
3. Type mismatch ("e-notes" vs "e-note")

**Debug SQL:**
```sql
-- Compare student class with upload
SELECT 
  'Student' AS source,
  id,
  first_name,
  last_name,
  class_id
FROM profiles
WHERE email = 'student@school.edu'

UNION ALL

SELECT 
  'Upload' AS source,
  id,
  title,
  class_id,
  NULL,
  NULL
FROM uploads
WHERE session = '2025/2026'
  AND term = 'First Term'
  AND type = 'e-note';
```

**Fix:**
```sql
-- Check class names match exactly (case-sensitive!)
SELECT class_id FROM profiles WHERE email = 'student@school.edu';
-- vs
SELECT DISTINCT class_id FROM uploads WHERE type = 'e-note';
```

---

### Issue 2: Session Still Saving as Token

**Symptoms:**
- After fix, new uploads STILL have tokens in session field

**Possible Causes:**
- Browser cache
- Code not deployed
- Still using old version

**Solutions:**
1. **Hard Refresh:** Ctrl + Shift + R (or Cmd + Shift + R on Mac)
2. **Clear Browser Cache**
3. **Check Code:** Open DevTools → Sources → Find TeacherUploads.tsx → Check line ~281 has:
   ```typescript
   const { data: { session: authSession } } = await supabase.auth.getSession();
   ```

---

### Issue 3: Folder Navigation Shows Duplicates

**Symptoms:**
- Multiple "2025/2026" folders
- Strange session names

**Cause:**
- Mix of old corrupted data and new fixed data

**Solution:**
```sql
-- Clean up and standardize
UPDATE uploads
SET session = TRIM(session);

-- Then verify
SELECT DISTINCT session FROM uploads;
```

---

## 📊 Success Criteria

### ✅ All Tests Pass When:

1. **Database Check:**
   - ✅ All uploads have session format "YYYY/YYYY"
   - ✅ No tokens (length < 20 characters)
   - ✅ No JWT-like strings

2. **Teacher Upload:**
   - ✅ Form submits successfully
   - ✅ Database shows correct session
   - ✅ Console shows correct payload

3. **Student View:**
   - ✅ Can navigate folder structure
   - ✅ Files appear in correct week
   - ✅ Can preview files
   - ✅ Can download files
   - ✅ Console shows matching filters

4. **No Errors:**
   - ✅ No console errors
   - ✅ No "No Files Found" (when files exist)
   - ✅ No "Session expired" errors

---

## 🎉 Final Verification

Run this comprehensive check:

```sql
-- ═══════════════════════════════════════════════════
-- COMPREHENSIVE SESSION FIX VERIFICATION
-- ═══════════════════════════════════════════════════

-- 1. Check session format
SELECT 
  'Session Format Check' AS test,
  CASE 
    WHEN COUNT(*) FILTER (WHERE NOT (session ~ '^\d{4}/\d{4}$')) = 0 
    THEN '✅ PASS - All sessions have correct format'
    ELSE '❌ FAIL - ' || COUNT(*) FILTER (WHERE NOT (session ~ '^\d{4}/\d{4}$')) || ' corrupted sessions found'
  END AS result
FROM uploads;

-- 2. Check for tokens
SELECT 
  'Token Check' AS test,
  CASE 
    WHEN COUNT(*) FILTER (WHERE LENGTH(session) > 50 OR session LIKE 'eyJ%') = 0
    THEN '✅ PASS - No tokens in session field'
    ELSE '❌ FAIL - ' || COUNT(*) FILTER (WHERE LENGTH(session) > 50 OR session LIKE 'eyJ%') || ' tokens found'
  END AS result
FROM uploads;

-- 3. Show session distribution
SELECT 
  'Session Distribution' AS test,
  session,
  COUNT(*) AS count
FROM uploads
GROUP BY session
ORDER BY count DESC;

-- 4. Recent uploads check
SELECT 
  'Recent Uploads' AS test,
  title,
  session,
  term,
  type,
  week,
  created_at
FROM uploads
ORDER BY created_at DESC
LIMIT 5;
```

**Expected Output:**
```
✅ PASS - All sessions have correct format
✅ PASS - No tokens in session field
```

---

## 🚀 If All Tests Pass

**CONGRATULATIONS!** 🎉

The session field bug is **COMPLETELY FIXED!**

Students can now:
- ✅ See uploaded e-notes
- ✅ Navigate by session/term/week
- ✅ Preview and download files
- ✅ System works as designed!

---

## 📞 If Tests Fail

Check `/CRITICAL_SESSION_BUG_FIX.md` for:
- Detailed bug explanation
- Code changes made
- Common pitfalls
- Additional debugging steps

**Or run the diagnostic:**
```sql
-- Copy and run: FIX_CORRUPTED_SESSIONS_NOW.sql
```
