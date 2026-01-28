# 📅 Upload Deadlines - Complete Database Fix

## Problem Summary
You reported that:
1. When saving settings, all 3 deadlines were being saved again instead of just the modified one
2. Teachers were not seeing deadlines - it shows "No Deadline Set"
3. Deadlines didn't have their own table (stored in KV store)
4. Expired deadlines should disable the upload button
5. New deadlines should re-enable the upload button

## Root Cause
The system was using **KV store** for deadlines, but some backend endpoints were trying to query a non-existent `upload_settings` table. This caused a mismatch where:
- Frontend saved to KV store
- Backend tried to read from database table (which didn't exist)
- Teachers never saw deadlines because queries failed silently

## Solution Implemented

### 1. Created Dedicated `upload_deadlines` Table
**File:** `/CREATE_UPLOAD_DEADLINES_TABLE.sql`

Run this SQL to create the table:
```sql
-- See CREATE_UPLOAD_DEADLINES_TABLE.sql
```

**Table Structure:**
- `id` - UUID primary key
- `term` - Text (e.g., "First Term")
- `session` - Text (e.g., "2024/2025")
- `upload_type` - Text ('e-notes', 'exam_question', 'assignment', 'other_resources', 'all')
- `deadline` - Timestamp with timezone
- `enabled` - Boolean (to temporarily disable a deadline)
- `description` - Text (optional notes)
- `created_at`, `created_by`, `updated_at`, `updated_by` - Audit fields

**Unique Constraint:** One deadline per term/session/type combination

### 2. Updated Backend Endpoints

#### `GET /upload-settings`
- Now fetches deadlines from `upload_deadlines` table
- Global settings still in KV store (`upload_global_settings` key)
- Transforms database format to frontend format

#### `POST /upload-settings`
- Saves global settings to KV store
- **Deletes ALL old deadlines** from table
- **Inserts NEW deadlines** sent from frontend
- This ensures no duplication - old ones are removed before new ones are added

#### `POST /check-upload-deadline`
- Queries `upload_deadlines` table (not KV store)
- Checks if deadline exists for term/session/type
- Compares current time with deadline
- **For TEACHERS**: Disables upload if deadline expired
- **For ADMINS**: Allows upload even after deadline (on behalf of teachers)

### 3. Teacher Experience

#### Before Deadline:
```
✅ No Deadline Set
You can upload at any time for First Term, 2025/2026 (e-notes)
Button State: ENABLED ✓
```

#### Active Deadline (Not Expired):
```
⏰ Deadline: Dec 15, 2025, 11:59 PM
You have until December 15, 2025 to upload
Button State: ENABLED ✓
```

#### Expired Deadline:
```
❌ Deadline Passed
Upload deadline expired on Dec 15, 2025, 11:59 PM
Button State: DISABLED ✗
```

#### New Deadline Created (Not Expired):
```
✅ New Deadline Set
You can upload until March 20, 2026, 11:59 PM
Button State: ENABLED ✓
```

## Step-by-Step Testing

### Step 1: Run the SQL
```sql
-- Copy and run CREATE_UPLOAD_DEADLINES_TABLE.sql in Supabase SQL Editor
```

### Step 2: Restart Backend
The backend code has been updated. If using Supabase Edge Functions, deploy:
```bash
# The server at /supabase/functions/server/index.tsx has been updated
# Deployment should happen automatically
```

### Step 3: Test as Admin

1. **Login as Principal/Admin**

2. **Go to Upload Settings**
   - Navigate to Upload Management → Settings icon

3. **Create a Test Deadline**
   - Click "Add Deadline"
   - Term: "First Term" (will auto-populate from active term)
   - Session: "2025/2026" (will auto-populate from active session)
   - Upload Type: "E-Notes"
   - Deadline: Tomorrow at 11:59 PM
   - Enabled: ✓ Checked
   - Description: "Test deadline for e-notes"

4. **Save Settings**
   - Click "Save Settings"
   - Should see: "Settings saved successfully. 1 deadline configured."

5. **Verify in Database**
   ```sql
   SELECT * FROM upload_deadlines;
   -- Should show 1 row with your deadline
   ```

### Step 4: Test as Teacher

1. **Login as Teacher**

2. **Go to Upload Learning Materials**
   - Navigate to Teacher Dashboard → Upload Materials

3. **Check Deadline Display**
   - Should see a green/yellow banner showing:
     ```
     ⏰ Deadline: [Your deadline date]
     You have until [date] to upload e-notes
     ```

4. **Verify Upload Button**
   - Upload button should be **ENABLED** ✓
   - Banner should say: "Button State: ENABLED ✓"

5. **Fill the Form**
   - Title: "Test Upload"
   - Class: Select any class
   - Subject: Select any subject
   - Upload Type: "E-Notes"
   - Add a PDF file

6. **Try to Submit**
   - Should work successfully ✓

### Step 5: Test Expired Deadline

1. **Login as Admin Again**

2. **Edit the Deadline**
   - Go to Upload Settings
   - Change the deadline to **yesterday**
   - Save Settings

3. **Login as Teacher**

4. **Check Upload Page**
   - Should see RED alert banner:
     ```
     ❌ Deadline Expired
     Upload deadline expired on [date]
     ```

5. **Verify Upload Button**
   - Upload button should be **DISABLED** ✗
   - Button should appear grayed out
   - Clicking should show: "Cannot upload - deadline has passed"

### Step 6: Test New Deadline Re-enables Button

1. **Login as Admin**

2. **Create New Future Deadline**
   - Go to Upload Settings
   - Delete old deadline (click X)
   - Add new deadline for **next week**
   - Save Settings

3. **Login as Teacher**

4. **Check Upload Page**
   - Should see GREEN banner:
     ```
     ✅ New Deadline Set
     You can upload until [date]
     ```

5. **Verify Upload Button**
   - Upload button should be **ENABLED** ✓
   - Teacher can upload again ✓

## Database Queries for Verification

### Check Active Deadlines
```sql
SELECT 
  term,
  session,
  upload_type,
  deadline,
  enabled,
  description,
  CASE 
    WHEN deadline < NOW() THEN '❌ EXPIRED'
    ELSE '✅ ACTIVE'
  END as status
FROM upload_deadlines
WHERE enabled = true
ORDER BY deadline ASC;
```

### See All Deadlines (Including Disabled)
```sql
SELECT 
  *,
  CASE 
    WHEN NOT enabled THEN '⏸️  DISABLED'
    WHEN deadline < NOW() THEN '❌ EXPIRED'
    ELSE '✅ ACTIVE'
  END as status
FROM upload_deadlines
ORDER BY deadline DESC;
```

### Check Teacher's View (What They See)
```sql
-- This mimics what the check-upload-deadline endpoint does
SELECT 
  term,
  session,
  upload_type,
  deadline,
  NOW() > deadline as is_expired,
  CASE 
    WHEN NOW() > deadline THEN 'Upload button will be DISABLED for teachers'
    ELSE 'Upload button will be ENABLED'
  END as button_state
FROM upload_deadlines
WHERE enabled = true
  AND term = 'First Term'
  AND session = '2025/2026'
  AND (upload_type = 'e-notes' OR upload_type = 'all');
```

## Key Changes Summary

### Frontend (`/components/uploads/UploadSettings.tsx`)
- ✅ No changes needed - already working correctly
- Sends deadlines array to backend

### Backend (`/supabase/functions/server/index.tsx`)
- ✅ Updated GET endpoint to read from database table
- ✅ Updated POST endpoint to delete-all-then-insert (prevents duplicates)
- ✅ Updated check-upload-deadline to query database
- ✅ Removed duplicate endpoint definition

### Database
- ✅ New `upload_deadlines` table with proper constraints
- ✅ RLS policies for security
- ✅ Indexes for performance

## Expected Behavior

### Saving Multiple Deadlines
When you save 3 deadlines:
1. Backend deletes ALL old deadlines from table
2. Backend inserts 3 NEW deadlines
3. Result: Exactly 3 deadlines in database (no duplicates)

### Teacher Upload Button Logic
```
IF no deadline exists for term/session/type:
  → Button ENABLED ✓

IF deadline exists AND not expired:
  → Button ENABLED ✓
  
IF deadline exists AND expired AND user is TEACHER:
  → Button DISABLED ✗

IF deadline exists AND expired AND user is ADMIN:
  → Button ENABLED ✓ (can upload on behalf of teacher)
```

## Troubleshooting

### Teachers Still See "No Deadline Set"
1. Check if deadlines are in database:
   ```sql
   SELECT * FROM upload_deadlines WHERE enabled = true;
   ```
2. Verify backend is deployed and running
3. Check browser console for errors
4. Verify term/session match exactly (case-sensitive)

### Deadlines Duplicating
- This should no longer happen
- Backend now deletes ALL before inserting NEW
- If still happening, check for multiple backend instances

### Upload Button Not Disabling
1. Check deadline is actually expired:
   ```sql
   SELECT deadline, NOW(), deadline < NOW() as expired FROM upload_deadlines;
   ```
2. Verify teacher role (admins can upload past deadline)
3. Check browser console logs for `[UploadForm] deadlineInfo updated:`

## Next Steps

After running the SQL:
1. ✅ Create a test deadline as admin
2. ✅ Verify teacher sees it
3. ✅ Test expired deadline disables button
4. ✅ Test new deadline re-enables button
5. ✅ Confirm no duplicates when saving multiple times

## Success Criteria ✓

- [ ] SQL executed successfully
- [ ] Can create deadlines in Upload Settings
- [ ] Teachers see deadline banner
- [ ] Expired deadline disables upload button
- [ ] New future deadline enables upload button
- [ ] No duplicate deadlines when saving repeatedly
- [ ] Admins can upload even after deadline (on behalf)
- [ ] Teachers cannot upload after deadline

---

**Status:** Ready to test! Run the SQL first, then test as described above.
