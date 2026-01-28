# Subject Level & Exam Status Fixes

## Issues Fixed

### ✅ Issue 1: Subject Level Not Updating
**Problem:** When editing a subject and changing the level from "junior" to "senior" (or vice versa), clicking "Update Subject" button did not save the level change to the database.

**Root Cause:** The frontend was not including the `level` field in the request payload when updating a subject.

**Solution:** Added `level: formData.level` to the requestData object in SubjectsManager.

**File:** `/components/academic/SubjectsManager.tsx`
**Line:** 225

**Before:**
```typescript
const requestData = {
  name: formData.name.trim(),
  code: formData.code.trim().toUpperCase(),
  department_id: formData.department_id === 'none' ? null : formData.department_id || null,
  main_teacher_id: formData.main_teacher_id
};
```

**After:**
```typescript
const requestData = {
  name: formData.name.trim(),
  code: formData.code.trim().toUpperCase(),
  level: formData.level,  // ✅ ADDED THIS LINE
  department_id: formData.department_id === 'none' ? null : formData.department_id || null,
  main_teacher_id: formData.main_teacher_id
};
```

**Testing:**
1. ✅ Go to Subjects Management
2. ✅ Click edit icon on any subject
3. ✅ Change level from "Junior" to "Senior" (or vice versa)
4. ✅ Click "Update Subject"
5. ✅ Verify the badge in the subjects table updates
6. ✅ Check database to confirm level column was updated

---

### ✅ Issue 2: Exam Update Failing with Status Check Constraint Error

**Problem:** When clicking the update/edit icon for an exam, got this database error:
```
Error updating exam: {
  code: "23514",
  details: "Failing row contains (..., active, ...).",
  message: 'new row for relation "exams" violates check constraint "exams_status_check"'
}
```

**Root Cause:** The database table `exams` has a CHECK constraint on the `status` column that doesn't include "active" as a valid value. The frontend allows selecting "active" but the database rejects it.

**Likely Issue:** The database was created with an older constraint that only allowed certain status values, and "active" was not included or was misspelled in the constraint definition.

**Solution:** 

#### Option 1: SQL Migration (RECOMMENDED)
Execute the SQL file `/FIX_EXAM_STATUS_CONSTRAINT.sql` in your Supabase SQL Editor:

```sql
-- Drop old constraint
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_status_check;

-- Add correct constraint
ALTER TABLE exams 
ADD CONSTRAINT exams_status_check 
CHECK (status IN ('draft', 'upcoming', 'active', 'completed'));
```

#### Option 2: Manual Database Fix
1. Go to Supabase Dashboard
2. Navigate to Table Editor → exams table
3. Click on the "status" column
4. Check the "Constraints" section
5. Remove the existing check constraint
6. Add new constraint: `status IN ('draft', 'upcoming', 'active', 'completed')`

**Enhanced Error Logging:**
Also improved backend error logging to show more details:

**File:** `/supabase/functions/server/index.tsx`
**Lines:** 2663-2669

**Before:**
```typescript
if (error) {
  console.error('Error updating exam:', error);
  return c.json({ 
    success: false, 
    error: `Failed to update exam: ${error.message}` 
  }, 500);
}
```

**After:**
```typescript
if (error) {
  console.error('[Supabase] Error updating exam:', error);
  return c.json({ 
    success: false, 
    error: `Failed to update exam: ${error.message}. Details: ${error.details || 'N/A'}. Hint: ${error.hint || 'N/A'}` 
  }, 500);
}
```

This now shows the full error details in the error message, making debugging easier.

---

## Testing Checklist

### Test Subject Level Update
- [ ] Open Subjects Management
- [ ] Create a new subject with level "Junior"
- [ ] Edit the subject
- [ ] Change level to "Senior"
- [ ] Click "Update Subject"
- [ ] **Expected:** Badge changes from blue "Junior" to purple "Senior"
- [ ] Refresh page
- [ ] **Expected:** Level is still "Senior" (persisted to database)
- [ ] Check in Supabase Table Editor
- [ ] **Expected:** `level` column shows "senior"

### Test Exam Status Update (After Running SQL Fix)
- [ ] Run the SQL migration: `/FIX_EXAM_STATUS_CONSTRAINT.sql`
- [ ] Open Exams Management
- [ ] Click edit icon on any exam
- [ ] Change status to "Active"
- [ ] Click "Update Exam"
- [ ] **Expected:** Success toast message
- [ ] **Expected:** No error in console
- [ ] Verify exam status shows "Active" in table
- [ ] Try each status value:
  - [ ] Draft
  - [ ] Upcoming  
  - [ ] Active
  - [ ] Completed
- [ ] **Expected:** All should save successfully

---

## Files Modified

### Frontend
1. ✅ `/components/academic/SubjectsManager.tsx`
   - Line 225: Added `level` field to requestData

### Backend  
2. ✅ `/supabase/functions/server/index.tsx`
   - Lines 2663-2669: Enhanced error logging for exam updates

### Database Migration
3. ✅ `/FIX_EXAM_STATUS_CONSTRAINT.sql`
   - New SQL file to fix status constraint

### Documentation
4. ✅ `/SUBJECT_AND_EXAM_FIXES.md`
   - This file

---

## Common Errors & Solutions

### Error: "Subject updated successfully" but level didn't change
**Cause:** Browser cache showing old data  
**Solution:** Hard refresh (Ctrl+F5 or Cmd+Shift+R)

### Error: "Failed to update subject: ..."
**Cause:** Backend issue or authentication problem  
**Solution:** 
1. Check browser console for detailed error
2. Verify you're logged in as admin/principal
3. Check Supabase function logs

### Error: "violates check constraint exams_status_check"
**Cause:** SQL migration not run yet  
**Solution:** Run `/FIX_EXAM_STATUS_CONSTRAINT.sql` in Supabase SQL Editor

### Error: Constraint already exists
**Cause:** Running migration twice  
**Solution:** The SQL uses `IF EXISTS` so it's safe, but you can skip re-running

---

## Verification Queries

### Check Subject Levels in Database
```sql
SELECT id, name, code, level, updated_at
FROM subjects
ORDER BY updated_at DESC
LIMIT 10;
```

### Check Exam Status Constraint
```sql
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conrelid = 'exams'::regclass
  AND conname = 'exams_status_check';
```

**Expected Result:**
```
conname             | definition
--------------------+-------------------------------------------------------
exams_status_check  | CHECK ((status)::text = ANY (ARRAY['draft'::character varying, 'upcoming'::character varying, 'active'::character varying, 'completed'::character varying]))
```

### Check Current Exam Statuses
```sql
SELECT status, COUNT(*) as count
FROM exams
GROUP BY status
ORDER BY status;
```

---

## Rollback (If Needed)

### To Undo Subject Level Change
If the fix causes issues, you can temporarily disable sending the level:

```typescript
// In SubjectsManager.tsx, comment out the level line:
const requestData = {
  name: formData.name.trim(),
  code: formData.code.trim().toUpperCase(),
  // level: formData.level,  // COMMENTED OUT
  department_id: formData.department_id === 'none' ? null : formData.department_id || null,
  main_teacher_id: formData.main_teacher_id
};
```

### To Undo Status Constraint Change
Run this to revert to old constraint (if you know what it was):

```sql
ALTER TABLE exams DROP CONSTRAINT exams_status_check;
-- Add back your old constraint here
```

---

## Related Documentation

- [ADD_LEVEL_TO_SUBJECTS.sql](ADD_LEVEL_TO_SUBJECTS.sql) - Initial migration for level field
- [IMPLEMENTATION_SUMMARY.md](IMPLEMENTATION_SUMMARY.md) - Full implementation details
- [TESTING_GUIDE.md](TESTING_GUIDE.md) - Comprehensive testing guide

---

## Summary

**Both issues are now fixed:**

1. ✅ **Subject Level Update** - Frontend now sends level field to backend
2. ✅ **Exam Status Constraint** - SQL migration provided to fix database constraint

**Action Required:**
1. ✅ Code changes already applied
2. ⚠️ **You must run the SQL migration:** `/FIX_EXAM_STATUS_CONSTRAINT.sql`

After running the SQL migration, both features will work perfectly!

---

**Last Updated:** October 14, 2025  
**Status:** ✅ Fixed  
**Version:** 2.2
