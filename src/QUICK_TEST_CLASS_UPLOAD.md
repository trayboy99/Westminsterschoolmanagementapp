# Quick Test: Class Field in Upload Form

## 🚀 Test in 3 Minutes

### Step 1: Run SQL Migration (30 seconds)

Go to Supabase SQL Editor and run:

```sql
-- Add class_id column
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

-- Add indexes
CREATE INDEX IF NOT EXISTS idx_uploads_class_id ON uploads(class_id);
CREATE INDEX IF NOT EXISTS idx_uploads_folder_structure 
ON uploads(class_id, subject_id, type, term, session);

-- Update existing uploads
UPDATE uploads u
SET class_id = (
  SELECT sa.class_id 
  FROM subject_assignments sa
  WHERE sa.teacher_id = u.teacher_id 
    AND sa.subject_id = u.subject_id
  LIMIT 1
)
WHERE u.class_id IS NULL;
```

---

### Step 2: Verify Teacher Has Assignments (30 seconds)

```sql
-- Check teacher assignments
SELECT 
  p.first_name || ' ' || p.last_name as teacher,
  c.name || ' ' || COALESCE(sec.name, '') as class_display,
  s.name as subject
FROM subject_assignments sa
JOIN profiles p ON sa.teacher_id = p.id
JOIN classes c ON sa.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
JOIN subjects s ON sa.subject_id = s.id
WHERE p.role = 'teacher'
ORDER BY teacher, class_display;
```

**Expected**: At least 1 row showing a teacher with class and subject

**If empty**: Create test assignments:
```sql
-- Get IDs first
SELECT id, first_name, last_name FROM profiles WHERE role = 'teacher' LIMIT 1;
SELECT id, name FROM classes LIMIT 1;
SELECT id, name FROM subjects LIMIT 1;

-- Create assignment (replace UUIDs with actual values)
INSERT INTO subject_assignments (teacher_id, class_id, subject_id)
VALUES ('TEACHER_UUID', 'CLASS_UUID', 'SUBJECT_UUID');
```

---

### Step 3: Login and Test (2 minutes)

1. **Login as Teacher**

2. **Navigate**: Uploads → Upload New

3. **Look for Class Field**:
```
Should see:
┌────────────────────────┐
│ Class *                │
│ ┌────────────────────┐ │
│ │ JSS 1 A        ▼  │ │
│ └────────────────────┘ │
│ Subjects will be       │
│ filtered for this class│
└────────────────────────┘
```

**✅ PASS**: Class field appears with teacher's classes
**❌ FAIL**: No class field OR shows "No classes assigned"

---

4. **Select a Class**:
```
Click: JSS 1 A
```

**Watch Subject Field**:
```
Before:
┌────────────────────────┐
│ Subject *              │
│ ┌────────────────────┐ │
│ │ Select class first │ │ ← Disabled
│ └────────────────────┘ │
└────────────────────────┘

After:
┌────────────────────────┐
│ Subject *              │
│ ┌────────────────────┐ │
│ │ Mathematics    ▼  │ │ ← Enabled!
│ └────────────────────┘ │
│ 3 subject(s) available │
└────────────────────────┘
```

**✅ PASS**: Subject field enables and shows filtered subjects
**❌ FAIL**: Still disabled OR shows all subjects

---

5. **Complete Upload**:

Fill in:
- Title: "Test Upload with Class"
- Class: JSS 1 A
- Subject: Mathematics
- Type: E-Notes
- Week: 1
- Add a test PDF file

Click: **Upload Files**

**Expected Result**:
```
✅ Success toast: "Files uploaded successfully!"
```

---

6. **Verify in Database** (30 seconds):

```sql
-- Check the latest upload
SELECT 
  u.id,
  c.name || ' ' || COALESCE(sec.name, '') as class,
  s.name as subject,
  u.type,
  u.created_at
FROM uploads u
LEFT JOIN classes c ON u.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
JOIN subjects s ON u.subject_id = s.id
ORDER BY u.created_at DESC
LIMIT 1;
```

**Expected Output**:
```
id         | class    | subject      | type  | created_at
---------------------------------------------------------
uuid-123   | JSS 1 A  | Mathematics  | enote | 2025-01-20...
```

**✅ PASS**: Upload has class_id populated
**❌ FAIL**: class_id is NULL

---

## 🎯 Quick Validation Tests

### Test A: Class Filtering (30 seconds)

**Setup**: Teacher teaches Math in JSS 1 A and JSS 2 A

1. Select Class: **JSS 1 A**
2. Subject dropdown should show: **Mathematics** ✅

3. Change Class to: **JSS 2 A**
4. Subject dropdown should STILL show: **Mathematics** ✅

**Result**: ✅ Subject appears in both classes

---

### Test B: No Wrong Subjects (30 seconds)

**Setup**: Teacher teaches Math in JSS 1 A, English in JSS 1 B

1. Select Class: **JSS 1 A**
2. Subject dropdown should show: **Mathematics** ✅
3. Subject dropdown should NOT show: **English** ❌

4. Change Class to: **JSS 1 B**
5. Subject dropdown should show: **English** ✅
6. Subject dropdown should NOT show: **Mathematics** ❌

**Result**: ✅ Subjects filtered correctly per class

---

### Test C: Subject Clears on Class Change (30 seconds)

1. Select Class: **JSS 1 A**
2. Select Subject: **Mathematics**
3. Change Class to: **JSS 1 B**
4. Subject field should: **Clear automatically** (if Math not in JSS 1 B)

**Result**: ✅ Subject resets when class changes

---

## 📊 Console Debug Checklist

Open browser console (F12) and look for these logs:

### On Form Load:
```
[UploadForm] Component mounted, userRole: teacher
[UploadForm] Fetching teacher assignments...
[UploadForm] Teacher assignments response: {success: true, ...}
[UploadForm] Loaded: {classes: 3, subjects: 5, pairs: 8}
```

**✅ All logs present** = Form loaded correctly

---

### On Class Selection:
```
[UploadForm] Class selected: class-uuid-123
[UploadForm] Filtered subjects: 3
```

**✅ Filtered count > 0** = Subject filtering works

---

### On Upload:
```
Processing upload: {subject_id: "...", class_id: "...", type: "enote", ...}
Upload completed successfully: upload-uuid-456
```

**✅ class_id present in log** = Backend receiving class_id

---

## 🐛 Common Issues & Fixes

### Issue 1: "No classes assigned"

**Check**:
```sql
SELECT COUNT(*) FROM subject_assignments 
WHERE teacher_id = 'YOUR_TEACHER_UUID';
```

**Fix**: Create subject assignments for the teacher

---

### Issue 2: Subject field stays disabled

**Check browser console**: Look for errors

**Possible causes**:
- No subjects assigned for selected class
- JavaScript error preventing state update
- Class selection not registering

**Fix**: 
1. Check `classSubjectPairs` array in console
2. Verify subject exists for that class in database
3. Clear browser cache and reload

---

### Issue 3: Upload fails with "Missing required fields"

**Check network tab**: Look at request payload

**Should include**:
```json
{
  "subject_id": "uuid",
  "class_id": "uuid",  ← Must be present
  "type": "enote",
  "files": [...]
}
```

**If class_id missing**: Check form validation

---

### Issue 4: All subjects still showing

**Symptom**: Subject dropdown shows 30+ subjects regardless of class

**Cause**: Using old `subjects` state instead of `filteredSubjects`

**Fix**: Verify UploadForm.tsx line ~747 uses `filteredSubjects.map()`

---

## ✅ Success Criteria

Form is working correctly when:

1. ✅ Class dropdown shows only teacher's classes
2. ✅ Subject field is disabled until class selected
3. ✅ Subject dropdown shows only subjects for selected class
4. ✅ Helper text shows correct subject count
5. ✅ Upload saves with class_id in database
6. ✅ Console logs show proper filtering
7. ✅ No JavaScript errors in console

**All 7 checked?** = Perfect! 🎉

---

## 🎯 Advanced Tests (Optional)

### Multi-Class Upload Test

Upload same content to multiple classes:

1. **Upload 1**: Class = JSS 1 A, Subject = Math, File = "Week1.pdf"
2. **Upload 2**: Class = JSS 1 B, Subject = Math, File = "Week1.pdf"
3. **Upload 3**: Class = JSS 2 A, Subject = Math, File = "Week1.pdf"

**Check database**:
```sql
SELECT 
  c.name || ' ' || COALESCE(sec.name, '') as class,
  s.name as subject,
  COUNT(*) as upload_count
FROM uploads u
JOIN classes c ON u.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
JOIN subjects s ON u.subject_id = s.id
WHERE u.teacher_id = 'YOUR_TEACHER_UUID'
GROUP BY c.name, sec.name, s.name;
```

**Expected**:
```
class    | subject      | upload_count
---------------------------------------
JSS 1 A  | Mathematics  | 1
JSS 1 B  | Mathematics  | 1
JSS 2 A  | Mathematics  | 1
```

**✅ All 3 uploads** = Multi-class works correctly

---

## 📞 Still Having Issues?

Share these details:

1. **SQL migration output** (any errors?)
2. **Teacher assignments query result**
3. **Console logs** (all `[UploadForm]` messages)
4. **Network tab** (upload request payload)
5. **Screenshot** of upload form

This will help diagnose the problem quickly!

---

## 🎉 Summary

**Total Time**: ~3 minutes
**Steps**: 6 simple checks
**Result**: Fully functional class-based upload system!

The class field makes uploads more organized and teacher-friendly! 🚀
