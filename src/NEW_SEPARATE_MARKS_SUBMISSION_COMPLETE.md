# ✅ NEW SEPARATE MARKS SUBMISSION SYSTEM - COMPLETE

## 🎯 WHAT CHANGED

**OLD SYSTEM:** One tab, one submit button, saves both midterm and terminal together  
**NEW SYSTEM:** Two tabs, two separate submit buttons, saves midterm and terminal independently

---

## 🔥 THE NEW FLOW

### **1. MIDTERM TAB**

**Enter:**
- CA1 (10 marks)
- CA2 (10 marks)
- Exam (20 marks)

**Auto-calculated:**
- Terminal CA1 = (CA1 + CA2 + Exam) ÷ 2 (shown as preview)

**Buttons:**
- **"Save Midterm Draft"** → Saves only midterm marks to database
- **"Submit Midterm Scores"** → Submits only midterm marks for review

**Database saved:**
```
type=midterm: ca1, ca2, exam
type=terminal: NULL, NULL, NULL
```

---

### **2. TERMINAL TAB**

**Auto-filled:**
- CA1 (20 marks) - Already calculated from midterm, displayed as badge

**Enter:**
- CA2 (20 marks)
- Exam (60 marks)

**Buttons:**
- **"Save Terminal Draft"** → Saves only terminal marks to database
- **"Submit Terminal Scores"** → Submits only terminal marks for review

**Database saved:**
```
type=midterm: NULL, NULL, NULL (not re-saved)
type=terminal: ca1 (from midterm average), ca2, exam
```

---

## 🔧 TECHNICAL CHANGES

### **File: `/components/marks/MarksEntryTable.tsx`**

**REMOVED:**
- Single `onSave` and `onSubmit` callbacks
- Combined save/submit logic

**ADDED:**
- `onSaveMidterm` callback
- `onSaveTerminal` callback
- `onSubmitMidterm` callback
- `onSubmitTerminal` callback
- Separate handlers for each button

**Key Features:**
1. **Midterm Tab:**
   - All fields editable
   - Shows Terminal CA1 preview (read-only badge)
   - Separate save/submit buttons

2. **Terminal Tab:**
   - CA1 is auto-calculated badge (not editable)
   - CA2 and Exam are editable
   - Inputs disabled if midterm not entered yet
   - Separate save/submit buttons

---

### **File: `/components/marks/MarksModule.tsx`**

**REMOVED:**
- `handleSaveMarks()` - old unified handler
- `handleSubmitMarks()` - old unified handler
- `roundMarks()` - old rounding logic

**ADDED:**
- `handleSaveMidtermMarks()` - saves ONLY midterm marks
- `handleSubmitMidtermMarks()` - submits ONLY midterm marks
- `handleSaveTerminalMarks()` - saves ONLY terminal marks
- `handleSubmitTerminalMarks()` - submits ONLY terminal marks

**Each handler:**
1. Validates session and form data
2. Creates students array with ONLY the relevant marks
3. Sets the other marks to NULL
4. Sends to backend
5. Shows appropriate success message

---

## 📊 DATABASE BEHAVIOR

### **When you save Midterm:**

**Payload sent to backend:**
```json
{
  "exam_id": "...",
  "subject_id": "...",
  "class_id": "...",
  "students_marks": {
    "students": [
      {
        "studentId": "...",
        "midterm": { "ca1": 10, "ca2": 8, "exam": 16 },
        "terminal": { "ca1": null, "ca2": null, "exam": null }
      }
    ]
  },
  "status": "draft"
}
```

**Database after save:**
```sql
SELECT * FROM marks WHERE student_id = '...';

-- Result:
type      | ca1  | ca2  | exam
----------|------|------|------
midterm   | 10   | 8    | 16
terminal  | NULL | NULL | NULL
```

---

### **When you save Terminal:**

**Payload sent to backend:**
```json
{
  "exam_id": "...",
  "subject_id": "...",
  "class_id": "...",
  "students_marks": {
    "students": [
      {
        "studentId": "...",
        "midterm": { "ca1": null, "ca2": null, "exam": null },
        "terminal": { "ca1": 17, "ca2": 18, "exam": 55 }
      }
    ]
  },
  "status": "draft"
}
```

**Database after save:**
```sql
SELECT * FROM marks WHERE student_id = '...';

-- Result:
type      | ca1  | ca2  | exam
----------|------|------|------
midterm   | 10   | 8    | 16   (unchanged)
terminal  | 17   | 18   | 55   (newly added)
```

---

## 🎯 USER EXPERIENCE

### **Step 1: Enter Midterm**
1. Teacher selects class, subject, Midterm exam
2. Switches to **"Midterm Assessment"** tab
3. Enters CA1, CA2, Exam for all students
4. Sees Terminal CA1 preview: `(10+8+16)/2 = 17`
5. Clicks **"Submit Midterm Scores"**
6. ✅ Only midterm marks saved to database

### **Step 2: Enter Terminal**
1. Teacher selects same class, subject, Terminal exam
2. Switches to **"Terminal Assessment"** tab
3. Sees Terminal CA1 already filled: `17` (from midterm)
4. Enters CA2 and Exam for all students
5. Clicks **"Submit Terminal Scores"**
6. ✅ Only terminal marks saved to database

---

## ✅ BENEFITS OF NEW SYSTEM

1. **Clear separation:** No confusion about which marks are being saved
2. **Progressive workflow:** Enter midterm first, then terminal
3. **Auto-calculation visible:** Teachers can see Terminal CA1 before submitting
4. **Prevents errors:** Can't accidentally overwrite existing marks
5. **Better UX:** Explicit buttons for each assessment type
6. **Simpler debugging:** Each submission is independent

---

## 🧪 TESTING GUIDE

### **Test 1: Save Midterm Only**

1. Login as teacher
2. Go to Marks Entry
3. Select class, subject, **Midterm** exam
4. Enter marks: CA1=10, CA2=8, Exam=16
5. Click "Submit Midterm Scores"
6. **Expected:**
   - Database has midterm row
   - Terminal CA1 preview shows 17
   - No terminal row yet

### **Test 2: Save Terminal After Midterm**

1. Go to Marks Entry
2. Select same class, subject, **Terminal** exam
3. Switch to **"Terminal Assessment"** tab
4. Verify Terminal CA1 shows 17 (auto-filled)
5. Enter CA2=18, Exam=55
6. Click "Submit Terminal Scores"
7. **Expected:**
   - Database has both midterm and terminal rows
   - Midterm unchanged
   - Terminal has ca1=17, ca2=18, exam=55

### **Test 3: Edit Midterm After Saving**

1. Edit existing midterm marks
2. Change CA1 from 10 to 9
3. Click "Submit Midterm Scores"
4. **Expected:**
   - Midterm updated in database
   - Terminal CA1 NOT automatically updated (teacher must manually update terminal if needed)

---

## 🚨 IMPORTANT NOTES

1. **Terminal CA1 is auto-calculated** from midterm total, but only when viewing/editing
2. **Once terminal is submitted**, Terminal CA1 is STORED in database (not recalculated)
3. **If midterm changes**, terminal is NOT automatically updated (by design)
4. **Backend rounds all marks** to nearest whole number before saving
5. **Terminal CA1 can be decimal** (e.g., 17.5) until backend rounds it

---

## 🔍 DEBUGGING

If marks are wrong, check:

1. **Console logs:**
   - `[handleSaveMidtermMarks]` - Shows what's being sent
   - `[handleSaveTerminalMarks]` - Shows what's being sent

2. **Payload in console:**
   ```
   midterm: { ca1: X, ca2: Y, exam: Z }
   terminal: { ca1: null, ca2: null, exam: null }  ← Should be NULL when saving midterm
   ```

3. **Database query:**
   ```sql
   SELECT student_id, type, ca1, ca2, exam
   FROM marks
   WHERE exam_id = '...' AND subject_id = '...'
   ORDER BY type, created_at DESC;
   ```

---

## ✅ COMPLETE!

The new separate submission system is fully implemented. No more confusion about which marks are being saved!

**Test it now:**
1. Clear browser cache: `Ctrl+Shift+R`
2. Login as teacher
3. Go to Marks Entry
4. Try the new two-button workflow
5. Check database after each submission
