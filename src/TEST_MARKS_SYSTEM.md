# Marks System Testing & Debugging Guide

## Recent Changes Made

### 1. Terminal CA2 Field Fix
**Problem**: Terminal CA2 was showing auto-calculated values instead of being empty for manual entry.

**Solution**: Modified `/components/marks/MarksModule.tsx` to properly handle terminal marks:
- Terminal CA1: Auto-calculated from midterm average (preserved)
- Terminal CA2: Manual entry only - loads from database if exists, otherwise null
- Terminal Exam: Manual entry only - loads from database if exists, otherwise null

### 2. Improved Error Handling
Added better error handling in `/components/marks/MarksModule.tsx`:
- HTTP status code checking
- Detailed error logging
- Payload validation before submission

## Testing Steps

### Step 1: Check Marks Entry Form Access
1. Login as a teacher
2. Navigate to "Marks" tab
3. Click "New Entry"
4. Verify you can select:
   - Class (from your assignments)
   - Subject (from your assignments)
   - Session
   - Term
   - Exam

### Step 2: Test Midterm Marks Entry
1. After selecting class/subject/exam, students should load
2. Enter midterm marks:
   - CA1 (0-10)
   - CA2 (0-10)
   - Exam (0-20)
3. Verify midterm total auto-calculates
4. Click "Save Draft"
5. Check for success toast message

### Step 3: Test Terminal Marks Entry
1. Switch to "Terminal Assessment" tab
2. Verify:
   - Terminal CA1 is auto-filled (from midterm average)
   - Terminal CA2 input is EMPTY (not pre-populated)
   - Terminal Exam input is EMPTY (not pre-populated)
3. Manually enter:
   - CA2 (0-20)
   - Exam (0-60)
4. Verify terminal total auto-calculates
5. Click "Save Draft"

### Step 4: Test Submission
1. After filling all required marks, click "Submit for Review"
2. Check browser console for:
   - `[MarksModule] Sending submission payload:` - should show your data
   - `[MarksModule] Submit response:` - should show success
3. Check for success toast message
4. Verify marks appear in "Marks" tab overview

## Debugging "Failed to Fetch" Error

### Check Browser Console
Look for these log messages:
```
[MarksModule] Submitting marks for review...
[MarksModule] Sending submission payload: { ... }
[MarksModule] HTTP error: ...
[MarksModule] Error response: ...
```

### Common Causes

#### 1. Network/CORS Issue
**Symptoms**: "Failed to fetch" with no HTTP status
**Check**: Browser Network tab - is the request even going out?
**Fix**: Server might be down or CORS issue

#### 2. Authentication Issue  
**Symptoms**: HTTP 401 error
**Check**: Console shows "Unauthorized"
**Fix**: Re-login to get fresh auth token

#### 3. Validation Error
**Symptoms**: HTTP 400 error
**Check**: Error response shows missing fields
**Fix**: Ensure exam is selected and students have marks

#### 4. Server Error
**Symptoms**: HTTP 500 error
**Check**: Server logs (Supabase dashboard -> Functions -> Logs)
**Fix**: Check backend code for bugs

### Manual Diagnostic

Open browser console and run:
```javascript
// Check if you're authenticated
const { data: { session } } = await window.supabase.auth.getSession();
console.log('Session:', session);

// Test marks endpoint directly
const response = await fetch(
  'https://[your-project-id].supabase.co/functions/v1/make-server-1ddd013a/marks',
  {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`
    },
    body: JSON.stringify({
      exam_id: 'test-exam-id',
      subject_id: 'test-subject-id',
      students_marks: {
        students: []
      },
      status: 'draft'
    })
  }
);

console.log('Response status:', response.status);
const result = await response.json();
console.log('Response data:', result);
```

## Expected Data Flow

### 1. New Entry
```
User selects class/subject/exam
  ↓
Frontend fetches students for that class
  ↓
Frontend creates student marks array with null values
  ↓
User enters midterm marks → CA1, CA2, Exam
  ↓
Frontend auto-calculates midterm total
  ↓
Frontend auto-fills terminal CA1 (average of midterm marks)
  ↓
User manually enters terminal CA2 and Exam
  ↓
Frontend auto-calculates terminal total
  ↓
User clicks Submit
  ↓
Frontend sends to /marks endpoint
  ↓
Backend validates exam exists
  ↓
Backend saves to marks table (2 rows per student: midterm + terminal)
  ↓
Backend returns success
```

### 2. Edit Existing Entry
```
User clicks Edit on existing marks
  ↓
Frontend fetches existing marks from database
  ↓
Frontend populates form with existing values
  ↓
Terminal CA2 and Exam loaded from database (if they exist)
  ↓
User modifies marks
  ↓
User clicks Resubmit
  ↓
Backend deletes old marks for this exam/subject
  ↓
Backend inserts new marks
  ↓
Backend returns success
```

## Database Schema Reference

### Marks Table
```
id: UUID (primary key)
student_id: UUID (references profiles.id)
exam_id: UUID (references exams.id)
subject_id: UUID (references subjects.id)
type: TEXT ('midterm' or 'terminal')
ca1: NUMERIC (nullable)
ca2: NUMERIC (nullable)
exam: NUMERIC (nullable)
status: TEXT (draft, pending_approval, approved, rejected)
submitted_by: UUID (references profiles.id)
approved_by: UUID (nullable, references profiles.id)
created_at: TIMESTAMP
updated_at: TIMESTAMP
```

### Expected Constraints
- Midterm: CA1 (0-10), CA2 (0-10), Exam (0-20)
- Terminal: CA1 (0-20), CA2 (0-20), Exam (0-60)

## Quick Fixes

### If Terminal CA2 Shows Old Calculated Values
The system now correctly preserves manual entries. If you see old auto-calculated values:
1. They are from the database (previously saved)
2. You can edit them to the correct manual values
3. Save or submit to update the database

### If Submission Fails
1. Check browser console for detailed error
2. Verify you selected an exam (required field)
3. Verify students have at least some marks entered
4. Try saving as draft first before submitting
5. Check Supabase function logs for backend errors

### If Marks Don't Load
1. Check that exams table has valid exams
2. Verify teacher has subject-class assignments
3. Check that selected class has students
4. Look for console errors during data fetch

## Contact Points for Issues

1. **Authentication errors**: Check AuthContext, re-login
2. **Data not loading**: Check backend endpoints in server logs
3. **Validation errors**: Check payload structure in console
4. **Database errors**: Check Supabase dashboard > Database > Logs
5. **Server errors**: Check Supabase dashboard > Functions > Logs
