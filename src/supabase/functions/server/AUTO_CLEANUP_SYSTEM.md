# Automatic Student Subject Cleanup System

## Problem Statement
The `student_subjects` table was accumulating stale records when students were:
- Promoted to new classes
- Graduated
- Deleted
- Manually moved to different classes

This caused marks completion percentages to be inaccurate (showing 50% when actually 100% complete).

## Solution: Automatic Cleanup

The system now **automatically** cleans up `student_subjects` records in real-time when these events occur:

### 1. Student Promotion (Class Change)
**Location:** `/make-server-1ddd013a/promote-students` endpoint (line ~31317)

**When:** Students are promoted from one class to another (e.g., JS1 → JS2)

**What happens:**
```typescript
// Deletes all student_subjects for the OLD class
await adminSupabase
  .from("student_subjects")
  .delete()
  .in("student_id", studentIds)
  .eq("class_id", from_class_id);
```

**Why:** When students move to a new class, they need NEW subject assignments for that class. The old assignments are invalid.

### 2. Student Graduation
**Location:** `/make-server-1ddd013a/promote-students` endpoint (line ~31178, graduation branch)

**When:** Students graduate (e.g., SS3 → Graduated)

**What happens:**
```typescript
// Deletes ALL student_subjects for graduated students
await adminSupabase
  .from("student_subjects")
  .delete()
  .in("student_id", studentIds);
```

**Why:** Graduated students no longer attend classes, so all subject assignments should be removed.

### 3. Student Deletion
**Location:** `/make-server-1ddd013a/users/delete` endpoint (line ~20109)

**When:** A student account is permanently deleted by IT Admin

**What happens:**
```typescript
// Cascade delete student_subjects when user is deleted
await supabase
  .from("student_subjects")
  .delete()
  .eq("student_id", user_id);
```

**Why:** Deleted users should not have any lingering data in the database.

### 4. Manual Cleanup (Admin Tool)
**Location:** `/make-server-1ddd013a/cleanup-orphaned-assignments` endpoint

**When:** Admin clicks "🧹 Cleanup Database" button in Result Publishing Settings

**What happens:** Comprehensive scan of ALL student_subjects records:
- ✅ Checks if student profile exists
- ✅ Checks if student graduated
- ✅ Checks if student's current class matches assignment class
- ✅ Checks if student role is still "student"

**Who can run:** `admin`, `principal_admin`, `it_admin`

## Benefits

### Before (Manual Cleanup)
❌ Admins had to manually delete orphaned records from database
❌ Easy to forget cleanup after promotions/graduations
❌ Marks completion showed incorrect percentages
❌ Result publishing was blocked by phantom incomplete marks

### After (Automatic Cleanup)
✅ Cleanup happens automatically during normal operations
✅ No manual intervention needed
✅ Marks completion shows accurate percentages
✅ Result publishing works correctly
✅ Database stays clean automatically

## Testing the System

1. **Test Promotion:**
   - Promote students from JS1 to JS2
   - Check `student_subjects` table - old JS1 records should be gone
   - Students will need to be assigned subjects for JS2

2. **Test Graduation:**
   - Graduate SS3 students
   - Check `student_subjects` table - all records for those students should be gone

3. **Test Deletion:**
   - Delete a student account
   - Check `student_subjects` table - records for that student should be gone

4. **Test Manual Cleanup:**
   - Go to Result Publishing Settings
   - Click "🧹 Cleanup Database"
   - Should show "No orphaned records found" if system is working

## Monitoring

Check the server logs for these messages:

**Successful Cleanup:**
```
[Promotion] 🧹 Auto-cleanup: Deleting student_subjects for graduated students...
[Promotion] ✅ Cleaned up student_subjects for 25 graduated students
```

**Cleanup Errors:**
```
[Promotion] ⚠️ Failed to cleanup student_subjects: <error details>
```

Note: Cleanup errors are logged but don't fail the main operation (promotion/graduation/deletion).

## Database Integrity

The system maintains referential integrity:
- When `profiles.class_id` changes → `student_subjects` for old class are deleted
- When `profiles.is_graduated = true` → all `student_subjects` are deleted
- When `profiles` record is deleted → all `student_subjects` are cascade deleted

This ensures `student_subjects` always reflects the **current** state of student enrollment.

## Future Enhancements

Consider adding:
1. **Session-based cleanup** - Archive old session data when new session starts
2. **Scheduled cleanup** - Nightly cron job to catch any edge cases
3. **Cleanup history** - Track what was cleaned and when for auditing
4. **Soft delete** - Archive deleted records instead of hard delete

## Deployment

Deploy trigger: `2025-01-16-AUTO-CLEANUP-V5`

All automatic cleanup logic is now active in production.
