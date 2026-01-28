# Subject-Class-Teacher Assignments Implementation Guide

## Problem Statement

Currently, a subject has only ONE `main_teacher_id`. This doesn't work when:
- **Mathematics** is taught by **John** in **JSS1 Gold**
- **Mathematics** is taught by **Kelvin** in **JSS1 Diamond**  
- **Mathematics** is taught by **John** in **JSS2 Gold**

We need to assign different teachers to the same subject across different classes.

## Solution: Many-to-Many Relationship

Create a **`subject_assignments`** junction table:

```
subjects ←→ subject_assignments ←→ classes
                    ↓
                 teachers
```

### Database Schema

```sql
subject_assignments table:
- id (UUID, PK)
- subject_id (UUID, FK → subjects)
- class_id (UUID, FK → classes)
- teacher_id (UUID, FK → profiles)
- UNIQUE(subject_id, class_id) -- One teacher per subject per class
```

## Implementation Steps

### Step 1: Run SQL Migration ✅

Run `/CREATE_SUBJECT_ASSIGNMENTS.sql` in your Supabase SQL Editor.

This creates:
- ✅ `subject_assignments` table
- ✅ Foreign key constraints
- ✅ Indexes for performance
- ✅ RLS policies
- ✅ Updated_at trigger

### Step 2: Update Backend API

Add these new endpoints in `/supabase/functions/server/index.tsx`:

#### 2.1 GET /subject-assignments
Returns all assignments with subject, class, and teacher details.

#### 2.2 POST /subject-assignments
Creates a new assignment (subject + class + teacher).

#### 2.3 PUT /subject-assignments/:id
Updates an existing assignment.

#### 2.4 DELETE /subject-assignments/:id
Removes an assignment.

#### 2.5 Update GET /subjects
Include assignments in the response:
```typescript
{
  id: "...",
  name: "Mathematics",
  code: "MATH",
  level: "junior",
  main_teacher_id: "...",
  assignments: [
    {
      id: "...",
      class_id: "...",
      class_name: "JSS1 Gold",
      teacher_id: "...",
      teacher_name: "John Doe"
    },
    {
      id: "...",
      class_id: "...",
      class_name: "JSS1 Diamond", 
      teacher_id: "...",
      teacher_name: "Kelvin Smith"
    }
  ]
}
```

### Step 3: Update SubjectsManager Component

#### Before (Current):
```tsx
<Select
  value={formData.main_teacher_id}
  onValueChange={(value) => setFormData({...formData, main_teacher_id: value})}
>
  {teachers.map(t => <SelectItem value={t.id}>{t.name}</SelectItem>)}
</Select>
```

#### After (New):
```tsx
// Multi-select for class assignments
{classes.map(classItem => (
  <div key={classItem.id} className="flex items-center gap-2">
    <Label>{classItem.display_name}</Label>
    <Select
      value={assignments[classItem.id] || ''}
      onValueChange={(teacherId) => {
        setAssignments({...assignments, [classItem.id]: teacherId});
      }}
    >
      <SelectItem value="">No teacher</SelectItem>
      {teachers.map(t => <SelectItem value={t.id}>{t.name}</SelectItem>)}
    </Select>
  </div>
))}
```

### Step 4: Update Teacher Assignment Logic

#### When fetching a teacher's subjects:
```typescript
// OLD: subjects where main_teacher_id = teacher.id
SELECT * FROM subjects WHERE main_teacher_id = 'teacher-id';

// NEW: subjects where teacher is assigned to ANY class
SELECT DISTINCT s.* 
FROM subjects s
INNER JOIN subject_assignments sa ON sa.subject_id = s.id
WHERE sa.teacher_id = 'teacher-id';
```

#### When fetching marks entry classes for a teacher:
```typescript
// Get all classes where teacher teaches this subject
SELECT DISTINCT c.* 
FROM classes c
INNER JOIN subject_assignments sa ON sa.class_id = c.id
WHERE sa.subject_id = 'subject-id' 
  AND sa.teacher_id = 'teacher-id';
```

### Step 5: Update Marks Entry Flow

In `MarksEntryForm.tsx`:
1. When teacher selects a subject, fetch ONLY the classes they teach for that subject
2. Filter classes based on subject_assignments

```typescript
// Fetch assignments for this teacher
const { data: assignments } = await supabase
  .from('subject_assignments')
  .select('*, classes(*, sections(name))')
  .eq('teacher_id', teacherId)
  .eq('subject_id', selectedSubjectId);

// Now teacher only sees the classes they actually teach
const teacherClasses = assignments.map(a => a.classes);
```

## Benefits

### ✅ Flexibility
- Same subject, different teachers in different classes
- Easy to reassign teachers mid-session

### ✅ Accuracy
- Teachers only see classes they actually teach
- Marks entry is more controlled

### ✅ Reporting
- Track which teacher teaches what in which class
- Workload distribution reports
- Performance analysis per teacher per class

## Migration Strategy

### Option 1: Start Fresh (Recommended)
1. Run the SQL to create `subject_assignments` table
2. Admins manually assign subjects to classes with teachers
3. Keep `main_teacher_id` in subjects table for backward compatibility

### Option 2: Auto-migrate from main_teacher_id
1. Run the SQL to create `subject_assignments` table
2. Run migration SQL to create initial assignments:
```sql
INSERT INTO subject_assignments (subject_id, class_id, teacher_id)
SELECT 
  s.id as subject_id,
  c.id as class_id,
  s.main_teacher_id as teacher_id
FROM subjects s
CROSS JOIN classes c
WHERE 
  s.main_teacher_id IS NOT NULL
  AND (
    (s.level = 'junior' AND c.name LIKE 'JSS%')
    OR
    (s.level = 'senior' AND c.name LIKE 'SSS%')
  );
```
This creates assignments for ALL classes of the same level with the main teacher.

3. Admins can then edit to assign different teachers

## UI Updates Needed

### 1. SubjectsManager Form
- Add "Class Assignments" section
- For each class at the subject's level, show a dropdown to assign a teacher
- Example:
  ```
  Subject: Mathematics
  Level: Junior
  
  Class Assignments:
  JSS1 Gold: [Dropdown: John Doe]
  JSS1 Diamond: [Dropdown: Kelvin Smith]
  JSS2 Gold: [Dropdown: John Doe]
  JSS2 Diamond: [Dropdown: Sarah Jones]
  JSS3 Gold: [Dropdown: John Doe]
  JSS3 Diamond: [Dropdown: No teacher]
  ```

### 2. Subjects List Table
- Add a column showing "# of Classes Assigned"
- Click to expand and see which teacher teaches which class

### 3. Teacher Dashboard (My Subjects)
- Show subjects with specific classes:
  ```
  Mathematics
  - JSS1 Gold
  - JSS2 Gold
  
  Physics
  - SSS1 Diamond
  - SSS2 Diamond
  ```

### 4. Marks Entry Form
- When teacher selects "Mathematics", class dropdown shows ONLY:
  - JSS1 Gold (their assigned class)
  - JSS2 Gold (their assigned class)
  NOT all junior classes

## Backward Compatibility

Keep `main_teacher_id` in subjects table for:
1. Quick reference of primary teacher
2. Backward compatibility with existing code
3. Fall-back when no specific assignments exist

The subject_assignments table takes precedence when it exists.

## Next Steps

1. ✅ Run `/CREATE_SUBJECT_ASSIGNMENTS.sql`
2. ⏳ Add backend endpoints for subject_assignments
3. ⏳ Update SubjectsManager UI
4. ⏳ Update MarksEntryForm to filter classes
5. ⏳ Update Teacher Dashboard
6. ⏳ Test the full flow

## Example Query for Teacher's Classes

```typescript
// Get all subject-class combinations for a teacher
const getTeacherAssignments = async (teacherId: string) => {
  const { data } = await supabase
    .from('subject_assignments')
    .select(`
      id,
      subjects (
        id,
        name,
        code,
        level
      ),
      classes (
        id,
        name,
        level,
        sections (
          name
        )
      )
    `)
    .eq('teacher_id', teacherId);
    
  return data; // Array of {subject, class} combinations
};
```

This returns:
```json
[
  {
    "subject": {"name": "Mathematics", "code": "MATH"},
    "class": {"name": "JSS1", "section": {"name": "Gold"}}
  },
  {
    "subject": {"name": "Mathematics", "code": "MATH"},
    "class": {"name": "JSS2", "section": {"name": "Gold"}}
  }
]
```
