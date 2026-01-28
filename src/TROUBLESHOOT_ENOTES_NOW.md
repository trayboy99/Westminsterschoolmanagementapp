# 🔧 TROUBLESHOOT E-NOTES: Step-by-Step Debug Guide

## I'm tired of saying "it's fixed" too. Let's ACTUALLY find the problem.

---

## 🎯 STEP 1: Check What's in the Database

### Run this SQL query in your Supabase SQL Editor:

```sql
SELECT 
  id,
  title,
  type,
  session,
  term,
  week,
  class_id,
  file_name,
  created_at
FROM uploads
WHERE type = 'e-note'
ORDER BY created_at DESC
LIMIT 10;
```

### ✅ What to verify:
1. **`type`** = `'e-note'` (singular, lowercase, with hyphen)
   - ❌ NOT `'e-notes'`, `'E-Notes'`, `'enote'`, etc.

2. **`week`** = `1` (number, not string)
   - ❌ NOT `'Week 1'`, `'1'`, etc.

3. **`session`** = Exact value (e.g., `'2025/2026'`)
   - Check for extra spaces, different format

4. **`term`** = Exact value (e.g., `'First Term'`)
   - Check capitalization, spelling

5. **`class_id`** = Exact value (e.g., `'JSS3-DIAMOND'`)
   - Check capitalization, hyphens, spaces

---

## 🎯 STEP 2: Check Student's Class

### Run this SQL query:

```sql
SELECT 
  id,
  first_name,
  last_name,
  email,
  role,
  class_id
FROM profiles
WHERE role = 'student'
  AND email = 'REPLACE_WITH_STUDENT_EMAIL';
```

### ✅ What to verify:
1. Student has a `class_id` set (not NULL)
2. The `class_id` EXACTLY matches one of the uploads (e.g., `'JSS3-DIAMOND'`)
   - Must match EXACTLY: same capitalization, hyphens, no extra spaces

---

## 🎯 STEP 3: Test the Exact Query

### Run this SQL to simulate what the backend does:

```sql
-- Replace these values with the EXACT values from Step 1 and Step 2
SELECT *
FROM uploads
WHERE session = '2025/2026'        -- ← Use exact session from your upload
  AND term = 'First Term'          -- ← Use exact term from your upload
  AND type = 'e-note'              -- ← Must be 'e-note' (singular)
  AND week = 1                     -- ← Must be number (no quotes)
  AND class_id = 'JSS3-DIAMOND';   -- ← Use exact class_id from student profile
```

### ✅ Expected result:
- **If this returns 0 rows:** One or more filters don't match
- **If this returns rows:** The backend query SHOULD work

---

## 🎯 STEP 4: Test in the Browser

1. **Log in as the student** (JSS3 Diamond)
2. **Open browser console** (F12 → Console tab)
3. **Navigate:** Student Notes → 2025/2026 → First Term → E-Notes → Week 1
4. **Watch the console logs**

### Frontend Logs to Check:

```
[StudentFileExplorer] 📥 FETCHING FILES
[StudentFileExplorer] Parameters (RAW): {...}
[StudentFileExplorer] Student Profile: {
  id: "...",
  class: "JSS3-DIAMOND",  ← Must match upload
  role: "student"
}
━━━ CHECKING EXACT MATCH ━━━
Session sent: "2025/2026"       ← Must match upload
Term sent: "First Term"         ← Must match upload
Class ID: "JSS3-DIAMOND"        ← Must match upload
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StudentFileExplorer] 📅 Week extraction: "Week 1" → 1
[StudentFileExplorer] 📤 Sending to backend: {
  session: "2025/2026",
  term: "First Term",
  resourceType: "E-Notes",
  week: 1                        ← Numeric, no quotes
}
```

### Backend Logs to Check:

```
[Upload Files] Request: {
  session: "2025/2026",
  term: "First Term",
  resourceType: "E-Notes",
  week: 1
}
[Upload Files] Type mapping: { 
  frontend: "E-Notes", 
  backend: "e-note"              ← Must match database
}
━━━ DATABASE DEBUG ━━━
[Upload Files] 🔍 ALL E-NOTES in database: X
[Upload Files] 📋 E-Notes found:
  1. "File Name" - Session: "...", Term: "...", Week: X, Class: "..."
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━ BUILDING QUERY ━━━
[Upload Files] Query filters will be:
  session = "2025/2026"
  term = "First Term"
  type = "e-note"
  week = 1 (number)
  class_id = "JSS3-DIAMOND" (student filter)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
━━━ QUERY RESULTS ━━━
[Upload Files] ✅ Query successful - Found X uploads
```

### If "Found 0 uploads":
Look at the "DATABASE DEBUG" section and compare with "BUILDING QUERY":
- **Do the database values match the query filters EXACTLY?**
- **Is there ANY difference in spacing, capitalization, format?**

---

## 🎯 STEP 5: Common Issues & Solutions

### ❌ Issue: "Found 0 uploads" but e-notes exist in database

**Possible Causes:**

1. **Session mismatch**
   - Database: `'2025/2026'`
   - Query: `'2025 / 2026'` (extra spaces)
   - **Fix:** Ensure session format is identical

2. **Term mismatch**
   - Database: `'First Term'`
   - Query: `'first term'` (lowercase)
   - **Fix:** Ensure exact capitalization

3. **Type mismatch**
   - Database: `'e-note'` (singular)
   - Query: `'e-notes'` (plural)
   - **Fix:** Already fixed - type is mapped to `'e-note'`

4. **Class mismatch**
   - Database upload: `'JSS3-DIAMOND'`
   - Student profile: `'jss3-diamond'` (lowercase)
   - **Fix:** Update student's class_id to match exactly

5. **Week mismatch**
   - Database: `1` (number)
   - Query: `'1'` (string)
   - **Fix:** Already fixed - week is converted to number

---

## 🎯 STEP 6: If Still Not Working

### Copy and paste the following into this chat:

```
ENOTES DEBUG REPORT:

1. Database E-Notes:
   [Paste the result of SQL query from Step 1]

2. Student Profile:
   [Paste the result of SQL query from Step 2]

3. Exact Query Test:
   [Paste the result of SQL query from Step 3]
   Rows returned: [0 or number]

4. Frontend Console Logs:
   [Paste the "CHECKING EXACT MATCH" section]

5. Backend Console Logs:
   [Paste the "DATABASE DEBUG" and "QUERY RESULTS" sections]
```

With this information, I can pinpoint the EXACT issue.

---

## 🚨 CRITICAL CHECKLIST

Before anything else, verify these in your database:

- [ ] Upload has `type = 'e-note'` (not `'e-notes'`)
- [ ] Upload has `week = 1` (number, not string)
- [ ] Upload has `session = '2025/2026'` (exact format)
- [ ] Upload has `term = 'First Term'` (exact capitalization)
- [ ] Upload has `class_id = 'JSS3-DIAMOND'` (exact format)
- [ ] Student has `class_id = 'JSS3-DIAMOND'` (EXACT match to upload)
- [ ] Student has `role = 'student'`

**If ANY of these don't match EXACTLY, the query will return 0 results.**

---

## 📝 Quick Fix SQL (if class_id is wrong)

If student's class_id doesn't match:

```sql
-- Check current value
SELECT id, first_name, last_name, class_id 
FROM profiles 
WHERE email = 'student@school.edu';

-- Fix it (replace with correct class_id)
UPDATE profiles
SET class_id = 'JSS3-DIAMOND'
WHERE email = 'student@school.edu';
```

---

**I've added comprehensive logging to EVERY step. The console will now tell us EXACTLY where the mismatch is happening.**
