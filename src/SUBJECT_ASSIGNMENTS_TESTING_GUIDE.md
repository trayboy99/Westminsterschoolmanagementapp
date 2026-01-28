# Subject Assignments - Testing Guide

## ✅ What Was Completed

### Backend (Already Done)
- ✅ Created `subject_assignments` table (you ran the SQL)
- ✅ Added 4 API endpoints for CRUD operations
- ✅ All endpoints use sections JOIN to return `display_name` (e.g., "JSS1 Gold")

### Frontend (Just Updated)
- ✅ Updated `SubjectsManager.tsx` with class assignments UI
- ✅ Fetches classes with sections (display_name)
- ✅ Shows dropdown for each class at the subject's level
- ✅ Saves/updates/deletes assignments automatically
- ✅ Loads existing assignments when editing

## 🧪 How to Test

### Test 1: Create Subject with Multiple Class Assignments

1. **Go to Admin Dashboard** → Subjects & Classes
2. **Click "Add Subject"**
3. **Fill in the form:**
   - Name: `Mathematics`
   - Code: `MATH`
   - Level: `Junior (JS 1-3)`
   - Main Teacher: `John Doe`
   
4. **Scroll down to "Class Assignments" section**
5. **You should see all Junior classes:**
   - JSS1 Gold
   - JSS1 Diamond
   - JSS1 Platinum (if you have it)
   - JSS2 Gold
   - JSS2 Diamond
   - etc.

6. **Assign teachers:**
   - JSS1 Gold: Select `John Doe`
   - JSS1 Diamond: Select `Kelvin Smith`
   - JSS2 Gold: Select `John Doe`
   - Leave others blank or assign as needed

7. **Click "Create Subject"**
8. **Expected result:**
   - Toast: "Subject created successfully! Class assignments saved successfully!"
   - Subject appears in table

### Test 2: Edit Subject and Change Assignments

1. **Click Edit** on the Mathematics subject
2. **You should see:**
   - All previous fields filled
   - Class assignments section shows previously selected teachers
   - JSS1 Gold: John Doe (pre-selected)
   - JSS1 Diamond: Kelvin Smith (pre-selected)

3. **Make changes:**
   - Change JSS1 Gold from John to Sarah
   - Remove JSS1 Diamond assignment (select "No teacher")
   - Add JSS3 Gold: John Doe

4. **Click "Update Subject"**
5. **Expected result:**
   - Changes saved
   - Toast message confirms success

### Test 3: Level Filtering Works

1. **Create a Senior subject:**
   - Name: `Physics`
   - Level: `Senior (SS 1-3)`
   
2. **In Class Assignments section, you should see ONLY:**
   - SSS1 Gold
   - SSS1 Diamond
   - SSS2 Gold
   - etc.

3. **Should NOT see JSS classes**

### Test 4: Remove All Assignments

1. **Edit Mathematics**
2. **Click the X button** next to each assigned teacher
3. **OR select "No teacher" for each class**
4. **Click "Update Subject"**
5. **Expected:**
   - All assignments removed from database
   - Next time you edit, no teachers pre-selected

### Test 5: Same Teacher for Multiple Classes

1. **Create/Edit English:**
   - Level: Junior
   
2. **Assign John Doe to ALL classes:**
   - JSS1 Gold: John Doe
   - JSS1 Diamond: John Doe
   - JSS2 Gold: John Doe
   - JSS2 Diamond: John Doe
   - JSS3 Gold: John Doe
   - JSS3 Diamond: John Doe

3. **Save successfully**
4. **This proves one teacher can teach same subject across all sections**

## 🔍 Verify in Database (Optional)

### Check subject_assignments table:

```sql
SELECT 
  sa.id,
  s.name as subject_name,
  c.name as class_name,
  sec.name as section_name,
  p.first_name || ' ' || p.last_name as teacher_name
FROM subject_assignments sa
JOIN subjects s ON s.id = sa.subject_id
JOIN classes c ON c.id = sa.class_id
LEFT JOIN sections sec ON sec.id = c.section_id
LEFT JOIN profiles p ON p.id = sa.teacher_id
ORDER BY s.name, c.name, sec.name;
```

Expected result:
```
Mathematics | JSS1 | Gold    | John Doe
Mathematics | JSS1 | Diamond | Kelvin Smith
Mathematics | JSS2 | Gold    | John Doe
Physics     | SSS1 | Gold    | Dr. Santos
```

## 🐛 Troubleshooting

### Issue: No classes appear in Class Assignments section

**Solution:**
1. Check console for errors
2. Ensure classes with sections exist in database
3. Verify `/classes` endpoint returns `display_name` field
4. Check browser console logs: "Classes API response:"

### Issue: Assignments not saving

**Solution:**
1. Open browser DevTools → Network tab
2. Click "Create Subject"
3. Look for POST requests to `/subject-assignments`
4. Check response for errors
5. Verify you ran `CREATE_SUBJECT_ASSIGNMENTS.sql` in Supabase

### Issue: Can't see edited assignments

**Solution:**
1. Check console for: "Subject assignments API response:"
2. Verify GET `/subject-assignments?subject_id=xxx` returns data
3. Check `existingAssignments` state in React DevTools

### Issue: Level filtering not working

**Solution:**
1. Ensure classes have correct `name` field (JSS1, JSS2, SSS1, etc.)
2. Check filter logic: `classItem.name.startsWith('JSS')` for junior
3. Verify subject has `level` field set correctly

## 📊 Expected Behavior Summary

| Action | What Happens |
|--------|--------------|
| Open form | Fetches all classes with sections |
| Select "Junior" level | Shows only JSS classes |
| Select "Senior" level | Shows only SSS classes |
| Select teacher for class | Updates `assignments` state |
| Click X button | Removes assignment from state |
| Save subject | Creates subject THEN creates all assignments |
| Edit subject | Loads existing assignments into form |
| Update subject | Deletes removed, updates changed, creates new assignments |

## ✅ Success Criteria

All tests pass when:
- ✅ Classes show with proper display names (e.g., "JSS1 Gold")
- ✅ Can assign different teachers to different classes
- ✅ Can assign same teacher to multiple classes
- ✅ Level filtering shows correct classes
- ✅ Editing loads existing assignments
- ✅ Changes save correctly
- ✅ Removed assignments are deleted
- ✅ No errors in console

## 🎉 What This Enables

Now that subject-class-teacher assignments work:

### 1. Teacher Dashboard
Teachers will only see classes they're assigned to when entering marks.

### 2. Marks Entry
When John selects "Mathematics", he only sees JSS1 Gold and JSS2 Gold, NOT JSS1 Diamond (which Kelvin teaches).

### 3. Accurate Reporting
Reports can show exactly which teacher teaches which subject in which class.

### 4. Flexible Assignment
Mid-year teacher changes are easy - just edit the subject and change the assignment.

---

## Next Steps After Testing

Once you confirm everything works:

1. **Update MarksEntryForm.tsx** to filter classes by assignments
2. **Update Teacher Dashboard** to show only assigned classes
3. **Update Reports** to include teacher-subject-class details
4. **Train admin users** on how to use the new assignment system

Test it out and let me know if you hit any issues!
