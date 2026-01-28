# Class Field in Upload Form - Implementation Guide

## 🎯 What Changed

Added a **Class** field to the teacher upload form that:
1. **Shows only classes the teacher teaches** (from subject_assignments)
2. **Filters subjects based on selected class**
3. **Helps organize uploads in proper folder structure**

---

## 📊 How It Works

### Before (Old Flow)
```
Teacher opens upload form
  ↓
Sees ALL subjects in database
  ↓
Uploads to any subject
  ↓
No class context ❌
  ↓
Files hard to organize by class
```

### After (New Flow)
```
Teacher opens upload form
  ↓
Sees only CLASSES they teach
  ↓
Selects a class (e.g., "JSS 1 A")
  ↓
Subject field shows only subjects for that class
  ↓
Uploads with class context ✅
  ↓
Files organized by: Class → Subject → Type
```

---

## 🎨 Visual Example

### Step 1: Select Class
```
┌────────────────────────────────────────┐
│ Class *                                │
│ ┌────────────────────────────────────┐ │
│ │ JSS 1 A                        ▼  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ Subjects will be filtered for this    │
│ class                                  │
└────────────────────────────────────────┘
```

**Dropdown shows**:
- JSS 1 A
- JSS 1 B  
- JSS 2 A
- SSS 1 C
(Only classes where teacher has assignments)

### Step 2: Subject Auto-Filters
```
┌────────────────────────────────────────┐
│ Subject *                              │
│ ┌────────────────────────────────────┐ │
│ │ Mathematics                    ▼  │ │
│ └────────────────────────────────────┘ │
│                                        │
│ 3 subject(s) available                 │
└────────────────────────────────────────┘
```

**If teacher teaches**:
- Mathematics in JSS 1 A ✅
- English in JSS 1 A ✅
- Physics in JSS 1 A ✅

**Subject dropdown shows ONLY these 3 subjects**

If teacher doesn't teach any subjects in JSS 1 A:
```
Subject field shows: "No subjects assigned for this class"
```

---

## 🔧 Implementation Steps

### Step 1: Run SQL Migration

Open Supabase SQL Editor and run:
```sql
-- File: /ADD_CLASS_TO_UPLOADS.sql
ALTER TABLE uploads 
ADD COLUMN IF NOT EXISTS class_id UUID REFERENCES classes(id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS idx_uploads_class_id ON uploads(class_id);

CREATE INDEX IF NOT EXISTS idx_uploads_folder_structure 
ON uploads(class_id, subject_id, type, term, session);
```

### Step 2: Update Existing Uploads
```sql
-- Auto-assign class_id to existing uploads based on teacher assignments
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

### Step 3: Verify Migration
```sql
SELECT 
  COUNT(*) as total_uploads,
  COUNT(class_id) as uploads_with_class,
  COUNT(*) - COUNT(class_id) as uploads_without_class
FROM uploads;
```

**Expected Result**:
```
total_uploads | uploads_with_class | uploads_without_class
---------------------------------------------------------
     15       |        15          |         0
```

---

## 📁 Folder Structure Benefit

### Old Structure (Without Class)
```
Uploads/
├── Mathematics/
│   ├── E-Notes/
│   │   ├── file1.pdf (Which class? 🤷)
│   │   └── file2.pdf (Which class? 🤷)
│   └── Exam Questions/
│       └── file3.pdf (Which class? 🤷)
```

### New Structure (With Class)
```
Uploads/
├── JSS 1 A/
│   ├── Mathematics/
│   │   ├── E-Notes/
│   │   │   ├── Week 1 - Algebra.pdf ✅
│   │   │   └── Week 2 - Geometry.pdf ✅
│   │   └── Exam Questions/
│   │       └── Midterm - 2024.pdf ✅
│   └── English/
│       └── E-Notes/
│           └── Week 1 - Grammar.pdf ✅
└── JSS 1 B/
    └── Mathematics/
        └── E-Notes/
            └── Week 1 - Algebra.pdf ✅
```

**Benefits**:
- ✅ Clear class organization
- ✅ Students see only their class files
- ✅ Teachers can manage by class
- ✅ Admins can browse by class

---

## 🧪 Testing Guide

### Test 1: Teacher Upload with Class

1. **Login as Teacher**
2. **Go to**: Uploads → Upload New
3. **Check Class Field**:
   - [ ] Class dropdown appears
   - [ ] Shows only classes teacher teaches
   - [ ] Shows proper display names (e.g., "JSS 1 A" not just "JSS 1")

4. **Select a Class**:
   - [ ] Subject field enables
   - [ ] Subject dropdown shows only subjects for that class
   - [ ] Helper text shows count (e.g., "3 subject(s) available")

5. **Change Class**:
   - [ ] Subject field updates
   - [ ] Previously selected subject clears if not in new class
   - [ ] New subject list appears

6. **Upload File**:
   - [ ] Validation requires class selection
   - [ ] Upload succeeds
   - [ ] File appears in correct class folder

### Test 2: Teacher with No Assignments

1. **Create test teacher with NO subject assignments**
2. **Login as that teacher**
3. **Go to Upload**:
   - [ ] Class dropdown shows "Loading classes..."
   - [ ] Then shows "No classes assigned"
   - [ ] Cannot proceed with upload

### Test 3: Teacher with Multiple Classes

Example: Teacher teaches Math in JSS 1 A, JSS 1 B, and JSS 2 A

1. **Login as teacher**
2. **Open upload form**
3. **Check class dropdown**:
   - [ ] Shows JSS 1 A
   - [ ] Shows JSS 1 B
   - [ ] Shows JSS 2 A
   - [ ] All have proper section display

4. **Select JSS 1 A**:
   - [ ] Subject shows "Mathematics"
5. **Select JSS 1 B**:
   - [ ] Subject still shows "Mathematics"
6. **Select JSS 2 A**:
   - [ ] Subject still shows "Mathematics"

### Test 4: Subject Filtering

Example: Teacher teaches:
- Math in JSS 1 A
- English in JSS 1 A
- Math in JSS 1 B
- Physics in JSS 2 A

1. **Select JSS 1 A**:
   - [ ] Subject dropdown shows: Math, English (2 subjects)
   - [ ] Does NOT show Physics

2. **Select JSS 1 B**:
   - [ ] Subject dropdown shows: Math only (1 subject)
   - [ ] Does NOT show English or Physics

3. **Select JSS 2 A**:
   - [ ] Subject dropdown shows: Physics only (1 subject)
   - [ ] Does NOT show Math or English

---

## 🔍 Database Verification

### Check Teacher Assignments
```sql
SELECT 
  p.first_name || ' ' || p.last_name as teacher,
  c.name || ' ' || sec.name as class_display,
  s.name as subject
FROM subject_assignments sa
JOIN profiles p ON sa.teacher_id = p.id
JOIN classes c ON sa.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
JOIN subjects s ON sa.subject_id = s.id
WHERE p.email = 'teacher@example.com'
ORDER BY class_display, subject;
```

### Check Upload Records
```sql
SELECT 
  u.id,
  p.first_name || ' ' || p.last_name as teacher,
  c.name || ' ' || COALESCE(sec.name, '') as class,
  s.name as subject,
  u.type,
  u.term,
  u.session
FROM uploads u
JOIN profiles p ON u.teacher_id = p.id
LEFT JOIN classes c ON u.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
JOIN subjects s ON u.subject_id = s.id
ORDER BY u.created_at DESC
LIMIT 20;
```

**Expected Output**:
```
teacher      | class    | subject      | type  | term       | session
------------------------------------------------------------------
John Smith   | JSS 1 A  | Mathematics  | enote | First Term | 2024/2025
Jane Doe     | JSS 2 B  | English      | exam  | First Term | 2024/2025
```

---

## 🎯 API Response Format

### `/teacher-assignments` Endpoint

**Request**:
```bash
GET /make-server-1ddd013a/teacher-assignments
Authorization: Bearer <access_token>
```

**Response**:
```json
{
  "success": true,
  "classes": [
    {
      "id": "class-uuid-1",
      "name": "JSS 1",
      "level": "JSS",
      "display_name": "JSS 1 A"
    },
    {
      "id": "class-uuid-2",
      "name": "JSS 1",
      "level": "JSS",
      "display_name": "JSS 1 B"
    }
  ],
  "subjects": [
    {
      "id": "subject-uuid-1",
      "name": "Mathematics",
      "code": "MTH"
    },
    {
      "id": "subject-uuid-2",
      "name": "English",
      "code": "ENG"
    }
  ],
  "assignments": [
    {
      "subject_id": "subject-uuid-1",
      "class_id": "class-uuid-1"
    },
    {
      "subject_id": "subject-uuid-2",
      "class_id": "class-uuid-1"
    },
    {
      "subject_id": "subject-uuid-1",
      "class_id": "class-uuid-2"
    }
  ]
}
```

**How Frontend Uses This**:
1. `classes` array → Populates class dropdown
2. `subjects` array → Stores all subjects teacher can teach
3. `assignments` array → Filters subjects when class selected

---

## 🐛 Troubleshooting

### Issue 1: Class dropdown empty

**Symptoms**: Teacher sees "No classes assigned"

**Check**:
```sql
SELECT * FROM subject_assignments WHERE teacher_id = 'TEACHER_UUID';
```

**Fix**: Assign teacher to classes via Subject Assignments module

---

### Issue 2: Subject dropdown empty after selecting class

**Symptoms**: "No subjects assigned for this class"

**Check**:
```sql
SELECT 
  c.name || ' ' || COALESCE(sec.name, '') as class,
  s.name as subject
FROM subject_assignments sa
JOIN classes c ON sa.class_id = c.id
LEFT JOIN sections sec ON c.section_id = sec.id
JOIN subjects s ON sa.subject_id = s.id
WHERE sa.teacher_id = 'TEACHER_UUID'
  AND sa.class_id = 'SELECTED_CLASS_UUID';
```

**Fix**: Assign subject to that specific class in Subject Assignments

---

### Issue 3: Upload fails with "Missing required fields"

**Check browser console**: Look for error message

**Common causes**:
- Class not selected
- Subject not selected  
- Backend not receiving class_id

**Fix**: 
1. Check network tab for payload
2. Ensure `class_id` is in request body
3. Verify backend expects `class_id` parameter

---

## 📋 Validation Rules

### Frontend Validation
```typescript
if (!formData.class) {
  toast.error('Please select a class');
  return false;
}

if (!formData.subject) {
  toast.error('Please select a subject');
  return false;
}
```

### Backend Validation
```typescript
if (!class_id) {
  return c.json(
    { success: false, error: "class_id is required" },
    400
  );
}
```

---

## ✅ Success Criteria

Upload form is working correctly when:

1. ✅ Teacher sees only their assigned classes
2. ✅ Subjects filter based on selected class
3. ✅ Subject count updates correctly
4. ✅ Validation prevents upload without class
5. ✅ Upload saves with class_id in database
6. ✅ Files organized in class-based folder structure
7. ✅ Console logs show proper filtering

---

## 🎉 Benefits Summary

### For Teachers
- 📚 See only relevant classes
- 🎯 Subjects automatically filtered
- ⚡ Faster upload process
- ✅ Less confusion

### For Students
- 📁 See only their class files
- 🔍 Easier to find materials
- 🎯 No irrelevant content

### For Admins
- 📊 Better organization
- 🗂️ Browse by class structure
- 📈 Track uploads per class
- 🔎 Easier file management

---

## 🚀 Next Steps (Optional Enhancements)

1. **Auto-select class** if teacher has only one
2. **Remember last selected class** (localStorage)
3. **Show file count per class** in dropdown
4. **Add class filter** to browse view
5. **Class-based compliance** tracking

---

## 📞 Need Help?

If issues persist:

1. Check console logs (all `[UploadForm]` messages)
2. Verify SQL migration ran successfully
3. Check teacher has subject assignments
4. Test with browser network tab open
5. Share screenshots of error messages

The class field makes uploads more organized and contextual!
