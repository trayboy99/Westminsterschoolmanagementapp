# 🚀 Timetable Generation - Quick Start Guide

## ⚡ 5 Minutes to Your First Timetable

The timetable system is **self-contained** - all configuration is done in the "Timetable Settings & Configuration" tabs. No need to touch the global subjects/teachers management!

---

## Step 1: Add Subjects (2 minutes)

**Timetable → Settings → Subjects Config tab → Add Subject**

Add 3-5 subjects to start:

### Example: Mathematics
- **Name:** Mathematics
- **Code:** MTH
- **Level:** JSS
- **Department:** general (for all students)
- **Assigned Classes:** ✅ JSS 1A, ✅ JSS 1B, ✅ JSS 2A
- **Teacher Assignments:**
  - Select: Mr. John Smith
  - Classes he teaches: ✅ JSS 1A, ✅ JSS 1B
  - Full-time: ✅ Yes
- **Periods:** Min: 3, Max: 4
- **Allow double periods:** ✅ Yes
- **Click:** "Save Subject"

**Repeat for:** English, Biology, Chemistry, Physics

---

## Step 2: Configure Days (1 minute)

**Timetable → Settings → Basic tab**

- **Academic Year:** 2024/2025
- **Term:** First Term
- **Days:**
  - Monday: 8 periods
  - Tuesday: 8 periods
  - Wednesday: 8 periods
  - Thursday: 10 periods (6 academic, 4 co-curricular)
  - Friday: 7 periods
- **Click:** "Save Timetable Settings"

---

## Step 3: Generate! (30 seconds)

**Timetable → (Main screen)**

1. **Click:** "Generate Timetable" (big blue button)
2. **Wait:** 3-5 seconds
3. **See:** Complete Mon-Fri timetable for all classes!
4. **Click:** "Save Timetable" to finalize

**Done!** ✅

---

## What You'll See

### Stats Cards:
- **Teachers:** 5 (1 part-time)
- **Subjects:** 5
- **Classes:** 3
- **Generated Slots:** 120

### Timetable Preview:
- Full Monday-Friday schedule
- All subjects distributed across periods
- Teachers assigned to each subject
- No conflicts!

---

## 🎯 Key Points

### ✅ DO:
- Configure subjects in "Subjects Config" tab
- Assign classes to each subject
- Assign teachers to each subject
- Save each subject individually
- Click "Generate Timetable" when ready

### ❌ DON'T:
- Don't use global Subjects Management (separate system)
- Don't use global Teachers Management (separate system)
- Don't forget to save each subject after configuring
- Don't forget to "Save Timetable Settings" in Basic tab

---

## 🔍 Troubleshooting (Quick)

### No subjects appearing?
→ Go to "Subjects Config" tab and add subjects

### Classes showing (0 subjects)?
→ Edit each subject and check the "Assigned Classes" boxes

### Teachers showing (0 subjects)?
→ Edit each subject and add teachers in "Teacher Assignments"

### Empty timetable?
→ Check console (F12) for logs showing what's missing

---

## 🎓 Example Full Setup (Copy This)

### Subject 1: Mathematics
- Level: JSS
- Department: general
- Classes: JSS 1A, JSS 1B, JSS 2A
- Teacher: Mr. John Smith (all classes, full-time)
- Periods: 3-4 per week
- Double periods: Yes

### Subject 2: English Language
- Level: JSS
- Department: general
- Classes: JSS 1A, JSS 1B, JSS 2A
- Teacher: Mrs. Jane Doe (all classes, full-time)
- Periods: 4-5 per week
- Double periods: No

### Subject 3: Biology
- Level: SSS
- Department: science
- Classes: SSS 1 Science, SSS 2 Science
- Teacher: Mr. David Johnson (all classes, part-time: Mon-Wed)
- Periods: 3-4 per week
- Double periods: Yes
- **Check:** "This is a departmental subject"

### Subject 4: Chemistry
- Level: SSS
- Department: science
- Classes: SSS 1 Science, SSS 2 Science
- Teacher: Dr. Sarah Williams (all classes, full-time)
- Periods: 3-4 per week
- Double periods: Yes
- **Check:** "This is a departmental subject"

### Subject 5: Physics
- Level: SSS
- Department: science
- Classes: SSS 1 Science, SSS 2 Science
- Teacher: Mr. Michael Brown (all classes, full-time)
- Periods: 3-4 per week
- Double periods: Yes
- **Check:** "This is a departmental subject"

---

## 🎨 Optional: Pair Subjects (SSS Science)

**Go to:** Pairs tab → Senior Secondary

1. **Drag** "Biology" onto "Chemistry"
2. **Drag** "Physics" onto the "Biology / Chemistry" pair
3. **Click:** "Save All Pairs"

**Result:** Biology, Chemistry, and Physics will be scheduled at the same time for SSS Science classes (students can choose their preferred option).

---

## ✅ Success Checklist

After setup, you should have:
- [ ] 5+ subjects configured in Subjects Config
- [ ] Each subject has classes assigned
- [ ] Each subject has teachers assigned
- [ ] Each subject saved with "Save Subject"
- [ ] Basic tab configured (days, periods, session, term)
- [ ] "Save Timetable Settings" clicked
- [ ] "Generate Timetable" clicked
- [ ] Timetable preview showing Mon-Fri schedule
- [ ] "Save Timetable" clicked to finalize

---

## 📊 Expected Result

**After clicking "Generate Timetable":**

```
✅ Timetable generated successfully! 120 slots created.

Preview: JSS 1A
┌────────┬──────────┬──────────┬──────────┬──────────┬──────────┐
│ Period │  Monday  │ Tuesday  │Wednesday │ Thursday │  Friday  │
├────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│   1    │ Math     │ English  │ Biology  │ Math     │ English  │
│        │ Mr. John │ Mrs. Jane│ Mr. David│ Mr. John │ Mrs. Jane│
├────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│   2    │ English  │ Math     │ Chemistry│ English  │ Math     │
│        │ Mrs. Jane│ Mr. John │ Dr. Sarah│ Mrs. Jane│ Mr. John │
├────────┼──────────┼──────────┼──────────┼──────────┼──────────┤
│   3    │ Biology  │ Physics  │ Math     │ Biology  │ Note Check
│        │ Mr. David│ Mr.Michael Mr. John │ Mr. David│          │
└────────┴──────────┴──────────┴──────────┴──────────┴──────────┘
```

---

## 🎉 That's It!

You now have a complete, AI-generated timetable that:
- Schedules all subjects across Mon-Fri
- Assigns teachers intelligently
- Avoids conflicts
- Respects part-time teacher availability
- Handles paired subjects
- Follows Nigerian school standards

**Total time:** 5 minutes
**Automation:** 100%
**Result:** Professional school timetable ready to use!
