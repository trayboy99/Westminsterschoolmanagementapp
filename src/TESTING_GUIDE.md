# Testing Guide: Exam, Marks & Results System

## 🎯 Purpose
This guide helps you delete existing exams and test the complete flow from exam creation to result publishing with the new composite exam ID system and marks completion tracking.

---

## 📋 Step 1: Database Preparation

### 1.1 Add Level Column to Subjects Table

**Execute this SQL in your Supabase SQL Editor:**

```sql
-- Add the level column with default value 'junior'
ALTER TABLE subjects 
ADD COLUMN IF NOT EXISTS level VARCHAR(20) DEFAULT 'junior';

-- Add a check constraint to ensure only valid values
ALTER TABLE subjects 
ADD CONSTRAINT subjects_level_check 
CHECK (level IN ('junior', 'senior'));

-- Create an index for better query performance
CREATE INDEX IF NOT EXISTS idx_subjects_level ON subjects(level);

-- Update any existing subjects to 'junior' if NULL
UPDATE subjects 
SET level = 'junior' 
WHERE level IS NULL;
```

### 1.2 Delete Existing Exams (Optional - For Clean Testing)

**If you want to start fresh, execute this SQL:**

```sql
-- First, delete all marks (they reference exams)
DELETE FROM marks;

-- Then delete all exams
DELETE FROM exams;

-- Verify deletion
SELECT COUNT(*) as remaining_exams FROM exams;
SELECT COUNT(*) as remaining_marks FROM marks;
```

**⚠️ WARNING:** This will delete ALL marks and exams. Only do this in development/testing environment!

---

## 🧪 Step 2: Complete Testing Flow

### Phase 1: Configure Academic Settings

1. **Go to Settings Management → Session Settings**
   - Create academic session (e.g., "2024/2025")
   - Mark it as "Current"
   - Configure three terms:
     - First Term (with start/end dates)
     - Second Term (with start/end dates)
     - Third Term (with start/end dates and **Next Term Begins** date)

### Phase 2: Create Subjects with Levels

2. **Go to Subjects Management**
   - Create Junior subjects:
     - Mathematics (MATH, Junior, assign teacher)
     - English (ENG, Junior, assign teacher)
     - Basic Science (SCI, Junior, assign teacher)
   
   - Create Senior subjects:
     - Physics (PHY, Senior, assign teacher)
     - Chemistry (CHEM, Senior, assign teacher)
     - Biology (BIO, Senior, assign teacher)

### Phase 3: Create Exams with Composite IDs

3. **Go to Exam Management**
   - Create First Terminal Exam:
     - Name: "First Terminal Examination"
     - Session: Select from dropdown (e.g., 2024/2025)
     - Term: Select from dropdown (e.g., First Term)
     - Status: Active
   
   - The system will automatically generate composite ID:
     ```
     First_Terminal_Examination___2024-2025___First_Term
     ```

   - Create Midterm Exam:
     - Name: "Midterm Examination"
     - Session: 2024/2025
     - Term: First Term
     - Status: Active

### Phase 4: Enter Marks (As Teachers)

4. **For Each Teacher:**
   - Login with teacher account
   - Go to Marks Entry
   - Select:
     - Session: 2024/2025
     - Term: First Term
     - Exam: First Terminal Examination
     - Class: Select assigned class
     - Subject: Select assigned subject
   
   - Enter marks for all students in the class
   - Save marks

### Phase 5: Check Marks Completion

5. **As Admin, go to Settings Management → Result Publishing**
   - Select Session: 2024/2025
   - Select Term: First Term
   - View the **Marks Completion Overview**:
     - See Junior and Senior subject tables
     - Each table shows: Subject | Teacher | JSS 1 | JSS 2 | JSS 3 (or SSS 1/2/3)
     - ✅ Green checkmarks = Marks entered for that class
     - ❌ Red X marks = Marks not entered for that class
     - Number below checkmark shows count of marks
     - Progress bar shows overall completion
   
   - **Publishing Cards:**
     - Current term is highlighted with gradient background and shadow
     - Non-current terms are slightly blurred and dimmed
     - Hover over non-current terms to see them clearly
   
   - **Publishing Rules:**
     - ✅ Can publish: When ALL classes for ALL subjects show green checkmarks
     - 🔒 Locked: If ANY class-subject combination has red X mark
     - Button shows "Locked - Incomplete" when marks are missing
     - Alert message will guide you

### Phase 6: Publish Results

6. **When All Marks Are Entered:**
   - The "Publish" button will be enabled
   - Click to publish results for 2024/2025 - First Term
   - Results become visible to students

### Phase 7: View Results

7. **As Student:**
   - Login with student account
   - Go to My Results
   - Enter your result PIN
   - View beautiful report card with:
     - Correct score structure (Midterm vs Terminal)
     - Subject marks with grades
     - Average and percentage
     - Next term begins date (for terminal results)
     - Class teacher and principal comments

---

## 🔍 Testing Scenarios

### Scenario 1: Composite Exam IDs
**Test:** Create two exams with same name but different sessions/terms

```
Exam 1: "Final Exam" + "2023/2024" + "Third Term"
  → ID: Final_Exam___2023-2024___Third_Term

Exam 2: "Final Exam" + "2024/2025" + "First Term"
  → ID: Final_Exam___2024-2025___First_Term
```

**Expected:** Both exams created successfully (unique IDs)

### Scenario 2: Duplicate Prevention
**Test:** Try creating same exam name for same session/term twice

**Expected:** Error message: "An exam with this name already exists for the selected session and term"

### Scenario 3: Publishing Control
**Test:** Try publishing results when marks are incomplete

**Steps:**
1. Have 5 subjects configured (3 junior, 2 senior)
2. Only enter marks for JSS 1 students in Math and English
3. Skip JSS 2 and JSS 3 for all subjects
4. Try to publish results for current term

**Expected:** 
- Publish button shows "Locked - Incomplete" 
- Error toast: "Cannot publish results. Not all teachers have entered marks for all classes yet."
- Junior table shows:
  - Math: ✅ JSS 1, ❌ JSS 2, ❌ JSS 3
  - English: ✅ JSS 1, ❌ JSS 2, ❌ JSS 3
  - Other subjects: ❌ ❌ ❌
- Overall progress shows incomplete percentage

### Scenario 4: Level Separation & Table Display
**Test:** Check if junior and senior subjects are displayed in table format

**Expected:**
- Two separate tables with headers:
  - Junior table (blue header): Subject | Teacher | JSS 1 | JSS 2 | JSS 3
  - Senior table (purple header): Subject | Teacher | SSS 1 | SSS 2 | SSS 3
- Each row shows one subject
- Each class column shows checkmark or X
- Teacher names displayed correctly
- Subject codes shown below subject names
- Completion percentages shown for each level

### Scenario 5: Edit Exam (Immutable Logic)
**Test:** Try editing exam name/session/term after marks are entered

**Expected:**
- If marks exist: Error preventing change
- If no marks: New composite ID created, old exam deleted

---

## 📊 Verification Checklist

After testing, verify:

- [ ] Subjects have level field (junior/senior)
- [ ] Exams have composite IDs format: `name___session___term`
- [ ] Marks reference composite exam IDs
- [ ] Result publishing checks ALL class-subject combinations have marks
- [ ] Marks completion shows table format with class columns
- [ ] Junior table shows JSS 1, JSS 2, JSS 3 columns
- [ ] Senior table shows SSS 1, SSS 2, SSS 3 columns
- [ ] Checkmarks appear when class has marks
- [ ] X marks appear when class lacks marks
- [ ] Teacher names displayed in table rows
- [ ] Current term card is highlighted and clear
- [ ] Non-current terms are blurred/dimmed
- [ ] Publish button shows "Locked - Incomplete" when needed
- [ ] Report card shows correct terminal/midterm structure
- [ ] Next term begins date displays on terminal results
- [ ] Publishing is disabled when any class-subject combo incomplete

---

## 🐛 Troubleshooting

### Issue: "Level column doesn't exist"
**Solution:** Run the SQL migration in Step 1.1

### Issue: "Cannot publish - no marks"
**Solution:** Ensure ALL teachers have entered marks for ALL subjects in the selected session/term

### Issue: "Exam creation fails"
**Solution:** Check that session and term dropdowns have values from Settings Management

### Issue: "Subjects not showing in overview"
**Solution:** 
1. Check subjects table has data
2. Verify subjects have main_teacher_id assigned
3. Ensure level field is set correctly

### Issue: "Composite ID looks wrong"
**Solution:** Check exam name doesn't have special characters. System sanitizes:
- Spaces → Underscores
- Slashes → Hyphens

---

## 💡 Best Practices

1. **Always configure sessions/terms FIRST** before creating exams
2. **Assign teachers to subjects** before expecting marks completion tracking
3. **Set level for all subjects** (junior/senior) for proper categorization
4. **Test with small data** first before full-scale deployment
5. **Use current session/term** for active testing
6. **Clear browser cache** if dropdowns don't populate

---

## 🎉 Success Indicators

You'll know the system is working correctly when:

1. ✅ Exams have readable composite IDs
2. ✅ Marks completion shows real-time status
3. ✅ Publishing is automatically disabled/enabled based on completion
4. ✅ Report cards show correct score structures
5. ✅ Junior/Senior subjects are clearly separated
6. ✅ Teacher names appear in marks overview
7. ✅ System prevents publishing incomplete results
8. ✅ Next term date displays on terminal report cards

---

## 📝 Notes

- The composite ID system ensures data integrity
- Marks completion tracking is calculated in real-time
- Publishing control automatically validates completeness
- Level field supports Nigerian school structure (JSS/SSS)
- System is designed for scale and future enhancements

**Happy Testing! 🚀**
