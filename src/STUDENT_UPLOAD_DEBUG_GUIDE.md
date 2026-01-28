# Student Upload Browser - Complete Debug Guide 🔍

## ✅ What I Fixed

### 1. Backend Changes
- ✅ Changed `uploaded_class_id` → `class_id` (3 places)
- ✅ Build sessions list from ACTUAL uploads (not academic_calendar)
- ✅ Added comprehensive logging to track data flow

### 2. Frontend Changes
- ✅ Simplified to 3-level structure: Session → Term → Resource Types → Files
- ✅ Added detailed logging for each navigation level
- ✅ Shows all files from all subjects combined

### 3. Logging Added
**Backend** (`/supabase/functions/server/index.tsx`):
- User role and class_id
- Number of uploads found
- Sample upload details
- Organized structure (sessions → terms → levels → classes)

**Frontend** (`/components/uploads/StudentFileExplorer.tsx`):
- Loaded folder structure
- Available sessions
- Terms for selected session
- Files found for selected type

---

## 🧪 Testing Steps

### Step 1: Check Your Data

First, verify you have uploads in the database:

```sql
-- See all uploads
SELECT 
  id,
  session,
  term,
  type,
  class_id,
  subject_id,
  teacher_id,
  created_at
FROM uploads
ORDER BY created_at DESC
LIMIT 10;
```

**Look for**:
- ✅ Valid session (e.g., "2025/2026")
- ✅ Valid term (e.g., "First Term")  
- ✅ Valid type (e.g., "exam_question", "e-note")
- ❌ NO corrupt data like `{"access_token":"e-make-1dd"}`

### Step 2: Find a Student in Same Class

```sql
-- Find which classes have uploads
SELECT DISTINCT 
  c.id,
  c.name,
  c.section,
  c.level,
  COUNT(u.id) as upload_count
FROM uploads u
JOIN classes c ON c.id = u.class_id
GROUP BY c.id, c.name, c.section, c.level
ORDER BY upload_count DESC;
```

**Result Example**:
```
id                                   | name  | section | level  | upload_count
-------------------------------------|-------|---------|--------|-------------
a1b2c3d4-...                        | JSS 2 | NULL    | junior | 5
```

### Step 3: Find a Student in That Class

```sql
-- Find students in JSS 2
SELECT 
  id,
  first_name,
  last_name,
  email,
  class_id
FROM profiles
WHERE role = 'student'
  AND class_id = 'a1b2c3d4-...'  -- Use the class_id from Step 2
LIMIT 5;
```

### Step 4: Login as That Student

1. Open browser console (F12 → Console tab)
2. Login with student credentials
3. Click **"Notes"** in sidebar

### Step 5: Watch the Console Logs

**You should see**:

#### Backend Logs (in Edge Function logs):
```
[Browse Uploads] User: student, Class: a1b2c3d4-...
[Browse Uploads] Found 5 uploads for this user
[Browse Uploads] Sample upload: {
  session: "2025/2026",
  term: "First Term",
  type: "exam_question",
  class_id: "a1b2c3d4-..."
}
[Browse Uploads] Organized sessions: ["2025/2026", "2024/2025"]
[Browse Uploads] Session "2025/2026" has terms: ["First Term"]
[Browse Uploads]   Term "First Term" has levels: ["junior"]
[Browse Uploads]     Level "junior" has classes: ["JSS 2"]
[Browse Uploads] Returning folder structure with 2 sessions
```

#### Frontend Logs (in browser console):
```
[StudentFileExplorer] ✅ Loaded folder structure
[StudentFileExplorer] Sessions: ["2025/2026", "2024/2025"]
[StudentFileExplorer] Session "2025/2026" contains: ["First Term"]
```

### Step 6: Navigate Through Folders

**Click on "2025/2026"**:
```
[StudentFileExplorer] 📁 Navigated to session "2025/2026"
[StudentFileExplorer] 📁 Found 1 terms: ["First Term"]
```

**Click on "First Term"**:
You should see 4 resource type folders:
- E-Notes
- Exam Questions
- Assignments
- Resources

**Click on "Exam Questions"**:
```
[StudentFileExplorer] 📂 Navigated to 2025/2026 > First Term > Exam Questions
[StudentFileExplorer] 🔍 Looking for type: "exam-questions"
[StudentFileExplorer]   Checking level: junior
[StudentFileExplorer]     Checking class: JSS 2
[StudentFileExplorer]       Checking subject: English
[StudentFileExplorer]         Found 1 exam questions
[StudentFileExplorer]       Checking subject: Mathematics
[StudentFileExplorer]         Found 2 exam questions
[StudentFileExplorer] ✅ Total files found: 3
[StudentFileExplorer] 📄 Files: ["English - Exam Questions", "Mathematics - Exam Questions (1)", "Mathematics - Exam Questions (2)"]
```

You should SEE the exam question files!

---

## 🐛 Common Issues & Solutions

### Issue 1: "No terms available for this session"

**Cause**: Backend found 0 uploads for student's class

**Debug**:
```sql
-- Check if student's class_id matches any uploads
SELECT COUNT(*) 
FROM uploads 
WHERE class_id = 'STUDENT_CLASS_ID_HERE';
```

**Solution**: 
- If count = 0: Upload files for that class first
- If count > 0: Check backend logs to see why they're filtered out

### Issue 2: "No files found"

**Cause**: Files are organized but not matching the type

**Debug**: Check browser console logs:
```
[StudentFileExplorer] 🔍 Looking for type: "exam-questions"
[StudentFileExplorer]   Checking level: junior
[StudentFileExplorer]     Checking class: JSS 2
[StudentFileExplorer]       Checking subject: English
```

If it stops there, the `type` in database doesn't match.

**Check database**:
```sql
SELECT DISTINCT type FROM uploads;
```

**Expected values**:
- `exam_question` (NOT `exam-question` or `Exam Questions`)
- `e-note` (NOT `enote` or `E-Notes`)
- `assignment`
- `resource`

**Solution**: Fix the upload type values:
```sql
UPDATE uploads 
SET type = 'exam_question' 
WHERE type IN ('exam-question', 'Exam Question', 'Exam Questions');

UPDATE uploads 
SET type = 'e-note' 
WHERE type IN ('enote', 'e_note', 'E-Note', 'E-Notes');
```

### Issue 3: Corrupt Session Data

**Symptom**: Session shows as `{"access_token":"e-make-1dd"}`

**Fix**:
```sql
-- Find corrupt sessions
SELECT id, session, term 
FROM uploads 
WHERE session LIKE '%{%' 
   OR session LIKE '%access%';

-- Fix them
UPDATE uploads
SET session = '2024/2025'
WHERE session LIKE '%{%' 
   OR session LIKE '%access%';
```

### Issue 4: Student Not in Any Class

**Symptom**: Student sees no folders at all

**Check**:
```sql
SELECT id, first_name, last_name, class_id 
FROM profiles 
WHERE id = 'STUDENT_ID_HERE';
```

If `class_id` is NULL:

**Fix**:
```sql
UPDATE profiles
SET class_id = 'VALID_CLASS_ID_HERE'
WHERE id = 'STUDENT_ID_HERE';
```

---

## 📊 Expected Folder Structure

```
Student Clicks: Notes
  ↓
Sees: [2025/2026] [2024/2025]
  ↓ Click "2025/2026"
Sees: [First Term] [Second Term]
  ↓ Click "First Term"
Sees: [E-Notes] [Exam Questions] [Assignments] [Resources]
  ↓ Click "Exam Questions"
Sees: 
  • English - Exam Questions (Hassan Teacher)
  • Mathematics - Exam Questions (Math Teacher)
  • Science - Exam Questions (Science Teacher)
```

All subjects combined in one view! ✅

---

## 🎯 Quick Verification Checklist

Before testing:
- [ ] Uploads table has valid data (session, term, type, class_id)
- [ ] No corrupt session values (check for `{` or `access_token`)
- [ ] Student exists with valid class_id
- [ ] Student's class_id matches uploads in database
- [ ] Upload type values are correct (`exam_question`, not `exam-question`)

During testing:
- [ ] Backend logs show uploads found
- [ ] Backend logs show organized structure
- [ ] Frontend logs show sessions loaded
- [ ] Can navigate: Session → Term → Type
- [ ] Files appear when clicking resource type

---

## 💡 Understanding the Data Flow

```
1. Student logs in → AuthContext gets profile with class_id

2. Student clicks "Notes" → StudentFileExplorer fetches data

3. Backend receives request:
   - Gets user profile (id, role, class_id)
   - Queries uploads WHERE class_id = student.class_id
   - Enriches with teacher/subject/class names
   - Organizes into: organized[session][term][level][className][subjectName][type]
   - Returns to frontend

4. Frontend receives organized structure:
   - Level 0: Shows Object.keys(organized) as sessions
   - Level 1: Shows Object.keys(organized[session]) as terms
   - Level 2: Always shows 4 resource types
   - Level 3: Iterates through levels→classes→subjects to collect files

5. Student sees files!
```

---

## 🚀 Next Steps After Debugging

Once files appear correctly:

1. **Remove debug logs** (optional - they're helpful for troubleshooting)
2. **Add more uploads** for different subjects/types
3. **Test with multiple students** in different classes
4. **Test file download/preview** functionality
5. **Clean up any corrupt data** in uploads table

---

## 📝 Summary

**The Issue**: Students weren't seeing uploads because:
1. Column name was wrong (`uploaded_class_id` vs `class_id`)
2. Folder structure wasn't built from actual uploads
3. Navigation was too complex (6 levels vs 3 levels)

**The Fix**:
1. ✅ Use correct column name: `class_id`
2. ✅ Build sessions from actual uploads
3. ✅ Simplify to 3 levels: Session → Term → Type → Files
4. ✅ Add comprehensive logging to track data flow

**Result**: Students can now browse uploads with clear console logs showing exactly what's happening at each step!

---

**Status**: ✅ Ready for Testing  
**Date**: January 2025  
**Log Level**: Verbose (for debugging)
