# Upload Form Field Reference

## Fields Required by Upload Form

Based on `/components/uploads/UploadForm.tsx`, here are all the fields used in the upload process:

### Core Upload Metadata
```typescript
{
  // Required fields
  title: string,              // e.g., "Quadratic Equations - Chapter 5"
  subject: string,            // Subject ID from subjects table
  class: string,              // Class ID from classes table
  week: number,               // Week number (1-14)
  term: string,               // e.g., "First Term", "Second Term", "Third Term"
  session: string,            // e.g., "2024/2025", "2025/2026"
  teacherId: string,          // Teacher's UUID
  teacherName: string,        // Teacher's full name
  uploadType: string,         // 'e-notes' | 'exam-questions' | 'assignment' | 'other-resources'
  
  // Optional fields
  description: string,        // Additional notes about the upload
  
  // Files array
  files: [
    {
      id: string,
      name: string,
      size: number,
      type: string,
      file: File,
      status: 'pending' | 'uploading' | 'completed' | 'error'
    }
  ]
}
```

## Deadline Matching Logic

When a teacher tries to upload, the system checks for a matching deadline using these 3 fields:

### 1. Term
- Value: `formData.term`
- Example: `"First Term"`, `"Second Term"`, `"Third Term"`
- Source: Auto-populated from active term in session settings

### 2. Session
- Value: `formData.session`
- Example: `"2024/2025"`, `"2025/2026"`
- Source: Auto-populated from active session in session settings

### 3. Upload Type
- Value: `formData.uploadType` (frontend) → mapped to database type
- Mapping:
  ```typescript
  'e-notes' → 'e-notes'
  'exam-questions' → 'exam_question'
  'assignment' → 'assignment'
  'other-resources' → 'other_resources'
  ```

### Deadline Check Request
```typescript
POST /check-upload-deadline
Body: {
  term: "First Term",
  session: "2025/2026",
  type: "e-notes"  // Already mapped to database format
}
```

### Database Query (in backend)
```sql
SELECT * FROM upload_deadlines
WHERE enabled = true
  AND term = 'First Term'
  AND session = '2025/2026'
  AND (upload_type = 'e-notes' OR upload_type = 'all');
```

## Upload Types in Detail

### 1. E-Notes
- **Display Name:** "E-Notes"
- **Form Value:** `'e-notes'`
- **Database Value:** `'e-notes'`
- **Description:** Electronic notes, study materials, lesson summaries

### 2. Exam Questions
- **Display Name:** "Exam Questions"
- **Form Value:** `'exam-questions'`
- **Database Value:** `'exam_question'` (note: singular)
- **Description:** Past questions, practice exams, test papers

### 3. Assignment
- **Display Name:** "Assignment"
- **Form Value:** `'assignment'`
- **Database Value:** `'assignment'`
- **Description:** Homework, class assignments, exercises

### 4. Other Resources
- **Display Name:** "Other Resources"
- **Form Value:** `'other-resources'`
- **Database Value:** `'other_resources'` (note: underscore)
- **Description:** Additional materials, reference documents

### 5. All Types (Deadline Only)
- **Display Name:** "All Types"
- **Form Value:** N/A (not selectable in form)
- **Database Value:** `'all'`
- **Description:** Deadline applies to all upload types
- **Usage:** When creating a deadline that applies to everything

## Example Scenarios

### Scenario 1: Specific Deadline for E-Notes
**Admin Creates Deadline:**
```
Term: First Term
Session: 2025/2026
Upload Type: E-Notes
Deadline: Dec 31, 2025 11:59 PM
```

**Database Record:**
```json
{
  "term": "First Term",
  "session": "2025/2026",
  "upload_type": "e-notes",
  "deadline": "2025-12-31T23:59:00Z",
  "enabled": true
}
```

**Teacher Uploads E-Notes:**
- ✅ Matches deadline → Button controlled by expiration
- Form shows: "Deadline: Dec 31, 2025, 11:59 PM"

**Teacher Uploads Exam Questions:**
- ❌ No matching deadline → Button always enabled
- Form shows: "No deadline set for this upload type"

### Scenario 2: Deadline for All Types
**Admin Creates Deadline:**
```
Term: First Term
Session: 2025/2026
Upload Type: All Types
Deadline: Jan 15, 2026 11:59 PM
```

**Database Record:**
```json
{
  "term": "First Term",
  "session": "2025/2026",
  "upload_type": "all",
  "deadline": "2026-01-15T23:59:00Z",
  "enabled": true
}
```

**Teacher Uploads Anything:**
- ✅ All upload types match → Button controlled by expiration
- Form shows: "Deadline: Jan 15, 2026, 11:59 PM (applies to all materials)"

### Scenario 3: Multiple Deadlines
**Admin Creates Multiple Deadlines:**
```
Deadline 1: E-Notes      → Dec 20, 2025
Deadline 2: Exam Questions → Dec 25, 2025
Deadline 3: Assignment   → Dec 30, 2025
```

**Teacher Behavior:**
- E-Notes: Disabled after Dec 20
- Exam Questions: Disabled after Dec 25
- Assignments: Disabled after Dec 30
- Other Resources: No deadline (always enabled)

## Button State Logic

```javascript
// Pseudo-code for button state
function getButtonState(formData, deadlineInfo) {
  // No deadline set
  if (!deadlineInfo || !deadlineInfo.deadline) {
    return {
      enabled: true,
      message: "No deadline set - you can upload at any time"
    };
  }
  
  // Deadline exists but not expired
  if (deadlineInfo.allowed && !deadlineInfo.isExpired) {
    return {
      enabled: true,
      message: `You can upload until ${formatDate(deadlineInfo.deadline)}`
    };
  }
  
  // Deadline expired - teacher cannot upload
  if (!deadlineInfo.allowed && deadlineInfo.isExpired && userRole === 'teacher') {
    return {
      enabled: false,
      message: `Deadline expired on ${formatDate(deadlineInfo.deadline)}`
    };
  }
  
  // Deadline expired - admin can still upload (on behalf)
  if (deadlineInfo.isExpired && userRole === 'admin') {
    return {
      enabled: true,
      message: "You can upload on behalf of teachers even after deadline"
    };
  }
}
```

## Visual Reference

### Upload Form Screenshot Analysis (from your image)

From the image you provided, the form shows:

```
✅ No Deadline Set:
   You can upload at any time for First Term, 2025/2026 (e-notes)
   
   Button State: ENABLED ✓
```

**Fields visible in form:**
1. **Title** - "e.g., Quadratic Equations - Chapter 5"
2. **Class** - Dropdown to select class
3. **Subject** - Dropdown (filtered by class selection)
4. **Upload Type** - Dropdown with "E-Notes" selected

**What's happening:**
- Term: "First Term" (auto-filled from active term)
- Session: "2025/2026" (auto-filled from active session)
- Upload Type: "E-Notes" → maps to `'e-notes'`
- Backend checks: No deadline found for this combination
- Result: Button enabled, green banner shown

## Testing Checklist

### For Admins Creating Deadlines:
- [ ] Term matches active term in session settings
- [ ] Session matches active session
- [ ] Upload type uses correct database value:
  - `'e-notes'` for E-Notes
  - `'exam_question'` for Exam Questions
  - `'assignment'` for Assignments
  - `'other_resources'` for Other Resources
  - `'all'` for all types
- [ ] Deadline date/time is in future (for active deadline)
- [ ] Enabled checkbox is checked

### For Teachers Using Upload Form:
- [ ] See deadline banner at top of form
- [ ] Banner shows correct deadline date
- [ ] Upload button reflects deadline status:
  - Enabled if no deadline or deadline not expired
  - Disabled if deadline expired
- [ ] Can upload successfully when button enabled
- [ ] Get clear error when button disabled

---

**Key Takeaway:** The deadline matching uses exactly 3 fields:
1. **term** (exact match, case-sensitive)
2. **session** (exact match)
3. **upload_type** (exact match or 'all')

Make sure these match exactly between the upload form and the deadline configuration!
