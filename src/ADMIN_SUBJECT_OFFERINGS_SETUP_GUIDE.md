# Admin Guide: Setting Up Subject Offerings

## ⚠️ IMPORTANT NOTICE

**As of the latest update, teachers can ONLY enter marks for students who have been assigned to subjects through Subject Offerings management.**

**If you don't configure subject offerings, teachers will see ZERO students when trying to enter marks!**

## What Are Subject Offerings?

Subject Offerings is where you specify **which students take which subjects** in each class.

### Why Is This Necessary?

1. **Senior Classes (SS1-SS3)**: Students are in different streams
   - Science students take Physics, Chemistry, Biology
   - Arts students take Literature, Government, CRS
   - Commercial students take Accounting, Commerce, Economics

2. **Subject Exemptions**: Some students may not take certain subjects
   - Religious exemptions (CRS vs Islamic Studies)
   - Special curriculum for special needs students
   - Mid-session joiners who missed certain subjects

3. **Data Accuracy**: Prevents teachers from entering marks for wrong students

## How to Configure Subject Offerings

### Step 1: Navigate to Subject Offerings
```
Admin Dashboard → Subjects & Classes → Subject Offerings
```

### Step 2: Select Session
- Choose the academic session (e.g., **2024/2025**)
- This is usually the current active session

### Step 3: Select Class
- Choose the class (e.g., **JSS 1A**, **SS2 Science**, etc.)

### Step 4: Select Subject
- Choose the subject (e.g., **Mathematics**, **English**, **Physics**)

### Step 5: Assign Students
You'll see a list of ALL students in that class with checkboxes:

```
☑️ John Doe (Adm: 001)
☑️ Jane Smith (Adm: 002)
☐ Peter Brown (Adm: 003)  ← Not taking this subject
☑️ Mary Johnson (Adm: 004)
...
```

**Actions:**
- ✅ **Check** students who take this subject
- ❌ **Uncheck** students who don't take this subject
- 💡 **By default**, all students are checked (assumes everyone takes the subject)

### Step 6: Save Assignments
- Click **"Save Assignments"** button
- You'll see a success message
- Repeat for the next subject

## Recommended Setup Workflow

### For Junior Classes (JSS1-JSS3)

**Simple Scenario:** Most students take the same subjects

```
Example: JSS 1A - Mathematics
→ Usually ALL students take Mathematics
→ Just click "Save" (default: all checked)

Exception: If a student doesn't take a subject
→ Uncheck that student before saving
```

**Recommended Order:**
1. Start with core subjects (English, Mathematics, Basic Science)
2. Then language subjects (Yoruba, French, etc.)
3. Then vocational subjects

### For Senior Classes (SS1-SS3)

**Complex Scenario:** Students are in different streams

#### Example 1: SS1 Science Stream Class

**Students in SS1A:**
- 15 Science students
- 10 Arts students  
- 5 Commercial students

**Configure Physics:**
```
1. Select Subject: Physics
2. Check ONLY the 15 Science students
3. Uncheck the 10 Arts + 5 Commercial students
4. Save
```

**Configure Literature:**
```
1. Select Subject: Literature
2. Check ONLY the 10 Arts students
3. Uncheck the 15 Science + 5 Commercial students
4. Save
```

**Configure Accounting:**
```
1. Select Subject: Accounting
2. Check ONLY the 5 Commercial students
3. Uncheck the 15 Science + 10 Arts students
4. Save
```

#### Example 2: Pure Stream Classes

**If you organize by class:**
```
SS1 Science A (30 pure Science students)
SS1 Arts (25 pure Arts students)
SS1 Commercial (20 pure Commercial students)
```

**Configure Physics for SS1 Science A:**
```
1. Select Subject: Physics
2. All 30 students are Science → Keep all checked
3. Save
```

**Configure Literature for SS1 Arts:**
```
1. Select Subject: Literature
2. All 25 students are Arts → Keep all checked
3. Save
```

Much easier! Pure stream classes simplify configuration.

## Quick Setup Checklist

### For Each Session (e.g., 2024/2025)

#### Junior Classes (JSS1-JSS3)
For each class (JSS1A, JSS1B, JSS2A, etc.):

- [ ] English Language
- [ ] Mathematics  
- [ ] Basic Science
- [ ] Basic Technology
- [ ] Social Studies
- [ ] Civic Education
- [ ] Physical & Health Education
- [ ] Cultural & Creative Arts
- [ ] Computer Studies
- [ ] Agricultural Science
- [ ] Home Economics
- [ ] Language (Yoruba/Hausa/Igbo/French)
- [ ] Christian Religious Studies (CRS)
- [ ] Islamic Studies

**Note:** For CRS/Islamic Studies, split students by religion

#### Senior Classes (SS1-SS3)

##### Core Subjects (All Students):
- [ ] English Language
- [ ] Mathematics
- [ ] Civic Education

##### Science Stream:
- [ ] Physics
- [ ] Chemistry
- [ ] Biology
- [ ] Further Mathematics (optional)
- [ ] Agricultural Science (optional)
- [ ] Computer Science (optional)

##### Arts Stream:
- [ ] Literature in English
- [ ] Government
- [ ] Christian Religious Studies / Islamic Studies
- [ ] History (optional)
- [ ] Geography (optional)
- [ ] Economics (optional)

##### Commercial Stream:
- [ ] Commerce
- [ ] Accounting
- [ ] Economics
- [ ] Business Studies (optional)
- [ ] Office Practice (optional)

## What Happens After Configuration?

### ✅ Teachers Can Enter Marks

**Teacher Experience:**
1. Teacher logs in and goes to **Marks → Enter Marks**
2. Selects: Session, Term, Subject, Class, Exam
3. Clicks "Load Students"
4. **Sees ONLY the students assigned to that subject** ✅

**Example:**
```
Teacher: Mrs. Adeyemi (Physics Teacher)
Subject: Physics
Class: SS1A (30 students total)
Assigned: 15 Science students

Marks Entry Table Shows:
✅ 15 Science students (with input fields)
❌ NOT the 10 Arts students
❌ NOT the 5 Commercial students
```

### ❌ If Not Configured

**Teacher Experience:**
1. Teacher selects subject/class
2. Clicks "Load Students"
3. **Sees ZERO students** (empty table)
4. Error message: *"No students found. Please contact admin to configure subject offerings."*

**Console Warning (for debugging):**
```
⚠️ No students configured to offer subject Physics in class SS1A for session 2024/2025
📋 Please configure subject offerings in Subject Offerings Management
🚫 STRICT MODE: Clearing all current students
```

## Special Cases

### Case 1: Mid-Session New Student

**Scenario:** New student joins JSS 2A in Second Term

**Steps:**
1. Admin adds student to class (via Student Management)
2. Admin goes to Subject Offerings
3. For **each subject** the new student should take:
   - Select Session: 2024/2025
   - Select Class: JSS 2A
   - Select Subject: (e.g., Mathematics)
   - **Check the new student's name**
   - Save
4. Repeat for all subjects

**Result:** New student immediately appears in teacher's marks entry for those subjects

### Case 2: Student Changes Stream

**Scenario:** Student moved from Science to Arts in SS2

**Steps:**
1. **Remove from Science subjects:**
   - Go to Physics → Uncheck student → Save
   - Go to Chemistry → Uncheck student → Save
   - Go to Biology → Uncheck student → Save

2. **Add to Arts subjects:**
   - Go to Literature → Check student → Save
   - Go to Government → Check student → Save
   - Go to CRS → Check student → Save

**Result:** Student disappears from Science marks entry, appears in Arts marks entry

### Case 3: Subject Exemption

**Scenario:** Student has religious exemption from CRS, takes Islamic Studies instead

**Steps:**
1. Go to CRS → Uncheck student → Save
2. Go to Islamic Studies → Check student → Save

**Result:** Student only appears in Islamic Studies marks entry, not CRS

## Bulk Operations (Time-Saving Tips)

### Tip 1: Copy From Previous Session

If student subjects haven't changed much:

1. Note which students took which subjects last session
2. Configure current session based on last session's setup
3. Only adjust for new/departed students or stream changes

### Tip 2: Class List Preparation

Before configuring, prepare a spreadsheet:

```
| Student Name    | Adm No | English | Maths | Physics | Literature | ... |
|-----------------|--------|---------|-------|---------|------------|-----|
| John Doe        | 001    | ✓       | ✓     | ✓       | ✗          | ... |
| Jane Smith      | 002    | ✓       | ✓     | ✗       | ✓          | ... |
| Peter Brown     | 003    | ✓       | ✓     | ✓       | ✗          | ... |
```

Then systematically check/uncheck based on this reference.

### Tip 3: Start with Core Subjects

Configure subjects taken by ALL students first (English, Maths):
- These are fastest (just click Save with all checked)
- Then move to elective/stream subjects

## Troubleshooting

### Problem 1: Teacher Says "I Can't See Any Students"

**Diagnosis:** Subject offerings not configured

**Solution:**
1. Ask which subject/class they're trying to enter marks for
2. Go to Subject Offerings
3. Configure that subject/class combination
4. Ask teacher to refresh and try again

### Problem 2: Teacher Says "Some Students Are Missing"

**Diagnosis:** Those students weren't assigned to the subject

**Solution:**
1. Verify which students are missing
2. Go to Subject Offerings for that subject/class
3. Check the missing students
4. Save
5. Ask teacher to refresh

### Problem 3: Wrong Students Appearing

**Diagnosis:** Students from wrong stream were checked

**Solution:**
1. Go to Subject Offerings for that subject/class
2. Review the checked students
3. Uncheck students who shouldn't take the subject
4. Save
5. Ask teacher to refresh

## Best Practices

### ✅ Do This:
1. **Configure at start of session** - Before marks entry begins
2. **Double-check stream subjects** - Verify Science/Arts/Commercial assignments
3. **Review before exams** - Ensure new students are added
4. **Document changes** - Keep a log when changing student subjects
5. **Communicate with teachers** - Let them know when you update offerings

### ❌ Don't Do This:
1. **Don't skip configuration** - Marks entry won't work without it
2. **Don't rush** - Carefully verify each subject assignment
3. **Don't forget new students** - Remember to add them to all their subjects
4. **Don't change mid-exam** - Avoid changing offerings while marks entry is ongoing

## Verification Checklist

After configuring a subject/class, verify:

- [ ] Correct number of students checked (matches expected enrollment)
- [ ] Students from correct stream (for SS classes)
- [ ] No graduated/promoted students included
- [ ] All current active students included (unless exempted)
- [ ] Save operation successful (confirmation message appeared)

## Support

**If teachers report issues after configuration:**

1. Check console logs in browser (F12 → Console tab)
2. Look for warnings about subject offerings
3. Verify configuration in Subject Offerings page
4. Test with a different subject/class to isolate the issue
5. Check session setting matches (2024/2025, etc.)

## Summary

**Key Points:**
- ✅ Subject Offerings configuration is **REQUIRED** for marks entry
- ✅ Configure **before** teachers start entering marks
- ✅ Update when students join, leave, or change streams
- ✅ Verify assignments are correct for each subject/class
- ✅ Communicate changes to teachers

**Time Investment:**
- Junior class (all students take same subjects): ~5-10 minutes per class
- Senior class (stream-based subjects): ~15-30 minutes per class
- Total for full school: 2-4 hours (one-time setup per session)

**Benefits:**
- Accurate marks records
- No mix-ups between streams
- Clean, organized data
- Happy teachers (easier data entry)
- Happy students/parents (correct marks)

---

**Need Help?** Contact your system administrator or refer to `/SUBJECT_OFFERINGS_MARKS_ENTRY_FIX.md` for technical details.
