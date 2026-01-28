# 🧪 TEST STUDENT UPLOADS - QUICK GUIDE

## What We Fixed
The **type mapping mismatch** that was causing uploads to not show up:
- Database had: `exam_question` 
- Backend searched for: `exam-questions` ❌
- **Now fixed to match!** ✅

## Quick Test Steps

### 1️⃣ Login as Student Favour
- **Email:** (use Favour's login)
- **Class:** jss3
- **Expected Result:** Should have access to 1 upload

### 2️⃣ Navigate to Files
1. Click **"Notes"** in sidebar
2. Click **"My Files"** tab
3. You should see sessions from academic_calendar

### 3️⃣ Drill Down to Exam Questions
Navigate through the folder structure:
```
📅 Click on the session (e.g., "2025/2026" or whatever shows)
  ↓
📁 Click "First Term" 
  ↓
📚 Click "Exam Questions"
  ↓
📄 You should see 1 file!
```

### 4️⃣ Open Browser Console (F12)
Look for these success messages:
```
✅ [Upload Files] Type mapping: { frontend: "Exam Questions", backend: "exam_question" }
✅ [Upload Files] Query successful - Found 1 uploads
✅ [StudentFileExplorer] Successfully loaded 1 files
```

## If It's Still Loading Forever or Shows 0 Files

### Run the Diagnostic
1. Go to **Notes → 🔍 Diagnostic** tab
2. Click **"Run Diagnostic"**
3. Screenshot the results and check:
   - **Total Uploads:** Should be 1 (or more)
   - **Unique Sessions:** Should show actual session strings (not auth tokens)
   - **Unique Terms:** Should show "First Term"
   - **Unique Types:** Should show "exam_question"

### Check These Potential Issues

#### Issue A: Session Mismatch
**Problem:** Academic calendar has "2025/2026" but upload has "2025-2026"

**How to Check:**
```sql
-- Run this in Supabase SQL Editor
SELECT session FROM academic_calendar;
SELECT session FROM uploads WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec';
```

**Fix:** Make sure they match exactly (same format, spelling, case)

#### Issue B: Term Mismatch
**Problem:** Upload says "1st Term" but academic_calendar says "First Term"

**How to Check:**
```sql
SELECT term FROM academic_calendar;
SELECT term FROM uploads WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec';
```

**Fix:** Use identical spelling in both tables

#### Issue C: Class Not Assigned
**Problem:** Favour's class_id doesn't match the upload's class_id

**How to Check:**
```sql
-- Check Favour's class
SELECT first_name, class_id FROM profiles WHERE first_name = 'Favour';

-- Check the upload's class
SELECT title, class_id FROM uploads WHERE class_id = '06bdb592-0ebe-426d-943f-d0f9acab38ec';
```

**Fix:** Update either profile or upload to use matching class_id

## Expected Console Output (Success)

When it works, you'll see:
```
[StudentFileExplorer] 📥 FETCHING FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[StudentFileExplorer] Parameters: { 
  session: "2025/2026", 
  term: "First Term", 
  resourceType: "Exam Questions" 
}
[StudentFileExplorer] Student Class: 06bdb592-0ebe-426d-943f-d0f9acab38ec
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[Upload Files] 📥 FETCHING FILES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
[Upload Files] Request: { 
  session: "2025/2026", 
  term: "First Term", 
  resourceType: "Exam Questions" 
}
[Upload Files] User: { role: "student", class_id: "06bdb592-0ebe-426d-943f-d0f9acab38ec" }
[Upload Files] Type mapping: { frontend: "Exam Questions", backend: "exam_question" }
[Upload Files] 🎓 Student filter applied - class_id: 06bdb592-0ebe-426d-943f-d0f9acab38ec
[Upload Files] ✅ Query successful - Found 1 uploads
[Upload Files] 📄 Sample upload: {
  id: "...",
  title: "...",
  class_id: "06bdb592-0ebe-426d-943f-d0f9acab38ec",
  type: "exam_question",
  session: "...",
  term: "First Term"
}
[Upload Files] ✅ Successfully formatted 1 files
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[StudentFileExplorer] ✅ Successfully loaded 1 files
[StudentFileExplorer] 📄 First file: { 
  id: "...", 
  title: "...", 
  fileName: "...", 
  fileType: "pdf" 
}
```

## Still Not Working?

If you still see `Found 0 files`, paste the following into browser console:
```javascript
console.log('=== DEBUG INFO ===');
console.log('Check these queries in Supabase SQL Editor:');
console.log('1. SELECT * FROM academic_calendar;');
console.log('2. SELECT * FROM uploads WHERE class_id = \'06bdb592-0ebe-426d-943f-d0f9acab38ec\';');
console.log('3. SELECT * FROM profiles WHERE first_name = \'Favour\';');
```

Then run those queries and share the results!

---

**Expected Result:** Favour should see the 1 exam question file that exists in the database! 🎉
