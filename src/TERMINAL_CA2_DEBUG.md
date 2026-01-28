# Terminal CA2 Debug Instructions

## The Problem
Terminal CA2 values are not being saved/updated, but Terminal Exam values ARE working.

## Debugging Steps

### Step 1: Open Browser Console
1. Open your app in the browser
2. Open Developer Tools (F12)
3. Go to the Console tab
4. Clear the console

### Step 2: Edit Terminal Marks
1. Go to Marks Entry
2. Select an exam, class, and subject
3. Enter some values:
   - For one student, enter Terminal CA2 = 15
   - For the same student, enter Terminal Exam = 45
4. Click "Save as Draft"

### Step 3: Check Frontend Logs
Look for these logs in the console:

```
[MarksModule] ===== DEBUGGING FIRST STUDENT DATA =====
[MarksModule] Terminal CA2 value: 15
[MarksModule] Terminal CA2 type: number
[MarksModule] Terminal Exam value: 45  
[MarksModule] Terminal Exam type: number
```

**Question 1:** Do you see both CA2 and Exam values in the console?  
- If YES → Frontend is collecting the data correctly ✅
- If NO → Problem is in MarksEntryTable.tsx

### Step 4: Check Backend Logs
The backend server logs will be visible in the Supabase dashboard or in the browser's Network tab response.

Look for these backend logs:
```
[Supabase] Sample student data received: {...}
```

Check if the JSON has both terminal.ca2 and terminal.exam values.

**Question 2:** Does the backend receive both values?
- If YES → Backend receives data correctly ✅  
- If NO → Data is lost during HTTP request

### Step 5: Check Database Save
After saving, refresh the page and reopen the same marks.

**Question 3:** Do the values reappear?
- Terminal CA2: ?
- Terminal Exam: ?

## Most Likely Issues

### Issue A: Zero vs Null Bug
If you're entering 0 (zero), it might be treated as null/empty.
- **Fix:** Use `??` instead of `||` in MarksModule.tsx line 742

### Issue B: Input Field Disabled
The CA2 input might be disabled when it shouldn't be.
- **Check:** Look at MarksEntryTable.tsx line 705 - is `disabled={...}` blocking edits?

### Issue C: Wrong Field Name
Maybe the backend is looking for a different property name.
- **Check:** Backend expects `student.terminal.ca2` - is that what we're sending?

### Issue D: Database Constraint
The database might have a constraint blocking CA2 values.
- **Check:** Run this SQL in Supabase:
  ```sql
  SELECT * FROM marks WHERE type = 'terminal' AND ca2 IS NOT NULL LIMIT 5;
  ```

## Next Actions

Based on what you find in the console logs, let me know:
1. Are the values showing in the frontend logs?
2. Are the values reaching the backend?
3. Are the values in the database after saving and refreshing?

This will help me pinpoint exactly where the CA2 value is being lost!
