# Implementation Steps for Subject-Class-Teacher Assignments

## ✅ COMPLETED

### 1. Database Table Created
- ✅ **File**: `/CREATE_SUBJECT_ASSIGNMENTS.sql`
- ✅ Creates `subject_assignments` table with:
  - `subject_id` → links to subjects
  - `class_id` → links to classes  
  - `teacher_id` → links to profiles (teachers)
  - UNIQUE constraint on (subject_id, class_id)
  - RLS policies enabled
  - Indexes for performance

**ACTION REQUIRED**: Run this SQL in your Supabase SQL Editor

### 2. Backend API Endpoints Added
- ✅ **File**: `/supabase/functions/server/index.tsx` (lines 1702+)
- ✅ Four new endpoints:

#### GET /subject-assignments
```typescript
// Get all assignments, optionally filter by subject_id, class_id, or teacher_id
GET /make-server-1ddd013a/subject-assignments
GET /make-server-1ddd013a/subject-assignments?subject_id=xxx
GET /make-server-1ddd013a/subject-assignments?teacher_id=xxx
```

Returns:
```json
{
  "success": true,
  "assignments": [
    {
      "id": "...",
      "subject_id": "...",
      "class_id": "...",
      "teacher_id": "...",
      "subject": {"name": "Mathematics", "code": "MATH", "level": "junior"},
      "class": {
        "name": "JSS1",
        "display_name": "JSS1 Gold",
        "sections": {"name": "Gold"}
      },
      "teacher": {
        "id": "...",
        "name": "John Doe",
        "email": "john@school.edu"
      }
    }
  ]
}
```

#### POST /subject-assignments
```typescript
// Create a new assignment
POST /make-server-1ddd013a/subject-assignments
Body: {
  "subject_id": "uuid",
  "class_id": "uuid",
  "teacher_id": "uuid" // optional
}
```

#### PUT /subject-assignments/:id
```typescript
// Update teacher assignment
PUT /make-server-1ddd013a/subject-assignments/:id
Body: {
  "teacher_id": "uuid"
}
```

#### DELETE /subject-assignments/:id
```typescript
// Remove an assignment
DELETE /make-server-1ddd013a/subject-assignments/:id
```

## ⏳ TODO - Frontend Implementation

### 3. Update SubjectsManager Component

You need to update `/components/academic/SubjectsManager.tsx` to include class assignments.

#### Current Form:
```tsx
<FormSection>
  <Label>Main Teacher</Label>
  <Select value={formData.main_teacher_id}>
    {teachers.map(t => <SelectItem>{t.name}</SelectItem>)}
  </Select>
</FormSection>
```

#### New Form Should Have:
```tsx
<FormSection>
  <Label>Main Teacher (Overall)</Label>
  <Select value={formData.main_teacher_id}>
    {teachers.map(t => <SelectItem>{t.name}</SelectItem>)}
  </Select>
</FormSection>

<Separator />

<FormSection>
  <Label>Class Assignments</Label>
  <Alert>
    Assign teachers to specific classes for this subject
  </Alert>
  
  {filteredClasses.map(classItem => (
    <div key={classItem.id} className="flex items-center gap-4 p-3 border rounded">
      <Label className="flex-1">{classItem.display_name}</Label>
      <Select 
        value={assignments[classItem.id] || ''}
        onValueChange={(teacherId) => handleAssignmentChange(classItem.id, teacherId)}
      >
        <SelectItem value="">No teacher</SelectItem>
        {teachers.map(t => (
          <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
        ))}
      </Select>
      {assignments[classItem.id] && (
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => handleRemoveAssignment(classItem.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      )}
    </div>
  ))}
</FormSection>
```

#### Required State Changes:
```tsx
// Add to component state
const [classes, setClasses] = useState<any[]>([]);
const [assignments, setAssignments] = useState<Record<string, string>>({});
const [existingAssignments, setExistingAssignments] = useState<any[]>([]);

// Fetch classes on mount
useEffect(() => {
  fetchClasses();
}, []);

// Fetch existing assignments when editing
useEffect(() => {
  if (editingSubject) {
    fetchAssignments(editingSubject.id);
  }
}, [editingSubject]);

// Filter classes by subject level
const filteredClasses = classes.filter(c => {
  if (formData.level === 'junior') {
    return c.name.includes('JSS');
  } else {
    return c.name.includes('SSS');
  }
});
```

#### Required Functions:
```tsx
const fetchClasses = async () => {
  const response = await fetch(`${baseUrl}/classes`, { headers });
  const data = await response.json();
  if (data.success) setClasses(data.classes);
};

const fetchAssignments = async (subjectId: string) => {
  const response = await fetch(
    `${baseUrl}/subject-assignments?subject_id=${subjectId}`, 
    { headers }
  );
  const data = await response.json();
  if (data.success) {
    const assignmentMap = {};
    data.assignments.forEach(a => {
      assignmentMap[a.class_id] = a.teacher_id;
    });
    setAssignments(assignmentMap);
    setExistingAssignments(data.assignments);
  }
};

const handleAssignmentChange = (classId: string, teacherId: string) => {
  setAssignments(prev => ({
    ...prev,
    [classId]: teacherId
  }));
};

const handleRemoveAssignment = (classId: string) => {
  setAssignments(prev => {
    const newAssignments = { ...prev };
    delete newAssignments[classId];
    return newAssignments;
  });
};

const saveAssignments = async (subjectId: string) => {
  // Delete removed assignments
  for (const existing of existingAssignments) {
    if (!assignments[existing.class_id]) {
      await fetch(`${baseUrl}/subject-assignments/${existing.id}`, {
        method: 'DELETE',
        headers
      });
    }
  }

  // Create/update assignments
  for (const [classId, teacherId] of Object.entries(assignments)) {
    const existing = existingAssignments.find(a => a.class_id === classId);
    
    if (existing) {
      // Update if teacher changed
      if (existing.teacher_id !== teacherId) {
        await fetch(`${baseUrl}/subject-assignments/${existing.id}`, {
          method: 'PUT',
          headers,
          body: JSON.stringify({ teacher_id: teacherId })
        });
      }
    } else {
      // Create new
      await fetch(`${baseUrl}/subject-assignments`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          subject_id: subjectId,
          class_id: classId,
          teacher_id: teacherId
        })
      });
    }
  }
};
```

#### Update handleSubmit:
```tsx
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault();
  
  // ... existing validation ...
  
  // Save subject first
  const response = await fetch(url, { method, headers, body: JSON.stringify(requestData) });
  const data = await response.json();
  
  if (data.success) {
    const subjectId = editingSubject?.id || data.subject.id;
    
    // Save assignments
    await saveAssignments(subjectId);
    
    toast.success(`Subject ${editingSubject ? 'updated' : 'created'} successfully with class assignments!`);
    // ... rest of success logic ...
  }
};
```

### 4. Update GET /teacher-assignments Endpoint

Update the `/teacher-assignments` endpoint to use subject_assignments instead of just main_teacher_id:

```typescript
// OLD: Get subjects where main_teacher_id = teacher.id
const { data: assignedSubjects } = await supabase
  .from("subjects")
  .select("*")
  .eq("main_teacher_id", user.id);

// NEW: Get subjects where teacher has ANY class assignment
const { data: subjectAssignments } = await supabase
  .from("subject_assignments")
  .select("*, subjects(*), classes(*, sections(name))")
  .eq("teacher_id", user.id);

// Extract unique subjects
const uniqueSubjects = [...new Set(subjectAssignments.map(a => a.subject_id))];
const subjects = subjectAssignments
  .filter((a, i, arr) => arr.findIndex(x => x.subject_id === a.subject_id) === i)
  .map(a => a.subjects);

// Extract classes where teacher teaches
const teacherClasses = subjectAssignments.map(a => ({
  ...a.classes,
  display_name: a.classes.sections?.name
    ? `${a.classes.name} ${a.classes.sections.name}`
    : a.classes.name
}));
```

### 5. Update MarksEntryForm Component

Filter classes based on teacher's subject assignments:

```tsx
// When subject is selected, fetch only assigned classes
const fetchClassesForSubject = async (subjectId: string) => {
  const response = await fetch(
    `${baseUrl}/subject-assignments?subject_id=${subjectId}&teacher_id=${teacherId}`,
    { headers }
  );
  const data = await response.json();
  
  if (data.success) {
    const assignedClasses = data.assignments.map(a => a.class);
    setClasses(assignedClasses);
  }
};

// In the form:
<Select 
  value={selectedSubject}
  onValueChange={(value) => {
    setSelectedSubject(value);
    fetchClassesForSubject(value);
  }}
>
  {subjects.map(s => <SelectItem value={s.id}>{s.name}</SelectItem>)}
</Select>

<Select value={selectedClass}>
  {classes.map(c => (
    <SelectItem value={c.id}>{c.display_name}</SelectItem>
  ))}
</Select>
```

### 6. Update Teacher's My Subjects Page

Show which classes they teach for each subject:

```tsx
{subjects.map(subject => (
  <Card key={subject.id}>
    <CardHeader>
      <CardTitle>{subject.name}</CardTitle>
      <CardDescription>{subject.code}</CardDescription>
    </CardHeader>
    <CardContent>
      <Label>Classes You Teach:</Label>
      <div className="space-y-2">
        {subject.assignments?.map(assignment => (
          <Badge key={assignment.id} variant="secondary">
            {assignment.class.display_name}
          </Badge>
        ))}
      </div>
      {subject.assignments?.length === 0 && (
        <p className="text-muted-foreground">No classes assigned yet</p>
      )}
    </CardContent>
  </Card>
))}
```

## Testing Checklist

Once implemented, test these scenarios:

### ✅ Create Subject with Assignments
1. Create "Mathematics" subject with level "Junior"
2. Assign John to JSS1 Gold
3. Assign Kelvin to JSS1 Diamond
4. Save and verify assignments are created

### ✅ Edit Subject Assignments
1. Edit "Mathematics"
2. Change JSS1 Gold from John to Sarah
3. Remove JSS1 Diamond assignment
4. Add JSS2 Gold with John
5. Save and verify changes

### ✅ Teacher View
1. Login as John
2. Go to "My Subjects"
3. Should see Mathematics with only JSS1 Gold, JSS2 Gold
4. Should NOT see JSS1 Diamond

### ✅ Marks Entry
1. Login as John
2. Go to Marks Entry
3. Select Mathematics
4. Class dropdown should show ONLY JSS1 Gold, JSS2 Gold
5. Should NOT show all junior classes

### ✅ Delete Subject
1. Delete a subject
2. Verify subject_assignments are cascade deleted (automatic)

## Benefits of This Approach

✅ **Flexible**: Assign different teachers to same subject in different classes
✅ **Accurate**: Teachers only see classes they actually teach
✅ **Scalable**: Easy to add/remove assignments
✅ **Maintainable**: Clear relationship between subject, class, and teacher
✅ **Reportable**: Easy to generate workload and performance reports

## SQL Summary

```sql
-- Run this in Supabase SQL Editor
-- See /CREATE_SUBJECT_ASSIGNMENTS.sql for full SQL

CREATE TABLE subject_assignments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  subject_id UUID NOT NULL REFERENCES subjects(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(subject_id, class_id)
);
```

## API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/subject-assignments` | GET | Get all assignments (with filters) |
| `/subject-assignments` | POST | Create new assignment |
| `/subject-assignments/:id` | PUT | Update assignment (change teacher) |
| `/subject-assignments/:id` | DELETE | Remove assignment |

## Next Actions

1. ✅ Run `/CREATE_SUBJECT_ASSIGNMENTS.sql` in Supabase
2. ⏳ Update SubjectsManager component with class assignments UI
3. ⏳ Update teacher-assignments endpoint to use subject_assignments
4. ⏳ Update MarksEntryForm to filter classes by assignments
5. ⏳ Update Teacher Dashboard to show assigned classes
6. ⏳ Test the complete flow

The backend is ready! Now you just need to update the frontend components to use these new endpoints.
