# Quick Check: Is Marks Save Working?

## 🎯 The Test

1. **Edit** an existing marks entry
2. **Change** ONE value (e.g., Favour Blessing's Midterm CA1 from 7 to 10)
3. **Save Draft**
4. **Go back** and click **Edit** again on the same entry
5. **Check** if the value is 10 (NEW) or 7 (OLD)

## 📋 What to Look For in Console

Open browser console (F12) and look for these 5 checkpoints:

### ✅ Checkpoint 1: After clicking Save
```
[MarksModule] First student in payload: {
  studentName: "Favour Blessing",
  midterm: { ca1: 10, ... }  ← Should be NEW value (10)
}
```
**If you see 7 here** → Frontend state not updating (input problem)
**If you see 10** → Continue to checkpoint 2

### ✅ Checkpoint 2: Backend receives
Look at Supabase Function Logs:
```
[Supabase] Sample student data received: {
  "midterm": { "ca1": 10, ... }  ← Should be NEW value (10)
}
```
**If you see 7 here** → Payload not sent correctly (network issue)
**If you see 10** → Continue to checkpoint 3

### ✅ Checkpoint 3: Backend saves
Look at Supabase Function Logs:
```
[Supabase] Sample saved mark (verification): {
  "ca1": 10,  ← Should be NEW value (10)
  ...
}
```
**If you see 7 here** → Backend processing bug (shouldn't happen)
**If you see 10** → Continue to checkpoint 4

### ✅ Checkpoint 4: Fetch returns
After reopening for edit, check console:
```
[MarksModule] Sample fetched mark: {
  type: "midterm",
  ca1: 10,  ← Should be NEW value (10)
  updated_at: "2025-10-27..."  ← Should be recent timestamp
}
```
**If you see 7 here** → Cache problem or database didn't save
**If you see 10** → Continue to checkpoint 5

### ✅ Checkpoint 5: Student data populated
```
[MarksModule] Student Favour Blessing: {
  "midtermMark": { "ca1": 10, ... }  ← Should be NEW value (10)
}
```
**If you see 7 here** → Data mapping issue (shouldn't happen)
**If you see 10** → ✅ **SAVE IS WORKING!**

## 🔧 Quick Fixes

### If checkpoint 1 fails (Frontend state issue)
- Make sure you pressed Enter or clicked outside the input field
- Check if the row is highlighted in yellow (indicates unsaved changes)
- Verify the "X student(s) have edited marks" banner appears
- Try clicking in another field first, then clicking Save

### If checkpoint 2 fails (Network issue)
- Check Network tab for the POST request
- Verify the request body contains the updated values
- Check for HTTP errors (401, 500, etc.)

### If checkpoint 3 fails (Backend issue)
- Check Supabase Function Logs for error messages
- Verify the marks table has no constraints preventing the save
- Check if there are any database errors

### If checkpoint 4 fails (Cache or DB issue)
**Cache Issue:**
- Hard refresh (Ctrl+Shift+R or Cmd+Shift+R)
- Clear browser cache
- Try in incognito/private window

**Database Issue:**
- Go to Supabase Dashboard → SQL Editor
- Run: `SELECT * FROM marks WHERE exam_id = '...' AND subject_id = '...' ORDER BY updated_at DESC LIMIT 10;`
- Check if the ca1 value is 10 in the database
- If database shows 7, the backend didn't actually save
- If database shows 10, it's a cache problem

### If checkpoint 5 fails (Mapping issue)
- This shouldn't happen with current code
- Check if midterm/terminal marks are being swapped
- Verify you're looking at the correct student

## 🚨 Most Common Issues

### Issue #1: Clicking Save Too Quickly
**Problem**: You edit a value and immediately click Save before the input's onChange fires

**Solution**: After typing a new value, press Tab or click another field, THEN click Save

### Issue #2: Editing Wrong Field
**Problem**: You think you edited CA1 but actually edited CA2

**Solution**: Double-check which field you're editing and which field you're checking after reload

### Issue #3: Browser Cache
**Problem**: The fetch request uses cached data from before your edit

**Solution**: I've added cache-busting (`cache: 'no-store'` and `?t=timestamp`) to prevent this

### Issue #4: Multiple Tabs
**Problem**: You have multiple browser tabs open editing the same marks

**Solution**: Close all other tabs and use only one tab

### Issue #5: Someone Else Saved After You
**Problem**: Another user saved marks for the same exam/subject after you

**Solution**: This is expected - last save wins. Save your changes again.

## 📊 Expected Flow

```
User types 10 in CA1 field
    ↓
onChange fires → updateStudentMark() → setStudents()
    ↓
Row highlights yellow → "X edited" banner appears
    ↓
User clicks "Save Draft"
    ↓
handleSave() → onSave(updatedData) → handleSaveMarks()
    ↓
POST /marks with payload containing ca1: 10
    ↓
Backend receives, processes, deletes old, inserts new
    ↓
Database now has ca1 = 10
    ↓
User clicks "Edit" again
    ↓
GET /marks/exam/.../subject/... (with cache-busting)
    ↓
Backend queries database, returns ca1 = 10
    ↓
Frontend populates table with ca1 = 10
    ↓
✅ User sees the NEW value!
```

## 🎬 What to Record

If the issue persists, please provide:

1. **Screen recording** showing:
   - Editing a value
   - Clicking Save
   - Going back and clicking Edit again
   - Showing the old value appearing

2. **Console logs** (copy as text):
   - From the save operation
   - From the reload operation

3. **Network tab**:
   - Screenshot of POST /marks request payload
   - Screenshot of POST /marks response
   - Screenshot of GET /marks/exam/.../subject/... response

4. **Answer**:
   - Which checkpoint failed? (1, 2, 3, 4, or 5?)
   - What value did you expect vs what you got?

This will help identify the exact failure point!
