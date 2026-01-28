# 🔍 DIAGNOSTIC WITH NEW LOGGING

## ✅ WHAT I JUST DID

I added **EXTENSIVE LOGGING** to the marks calculation and saving code:

1. **MarksEntryTable.tsx** - `calculateTotals()` function now logs EVERY student's calculation
2. **MarksEntryTable.tsx** - `handleSave()` function now logs what's being saved
3. **MarksModule.tsx** - `roundMarks()` function now logs before/after rounding

## 📋 FOLLOW THESE STEPS EXACTLY

### **STEP 1: Delete All Marks**

```sql
DELETE FROM marks;
SELECT COUNT(*) FROM marks;  -- Should be 0
```

### **STEP 2: Open Incognito Browser**

- Chrome: `Ctrl+Shift+N`
- Firefox: `Ctrl+Shift+P`

### **STEP 3: Open Developer Console**

- Press **F12**
- Go to **Console** tab
- **KEEP IT OPEN!**

### **STEP 4: Login and Go to Marks Entry**

1. Login as teacher
2. Navigate to Marks Entry
3. **Select MIDTERM exam** (NOT Terminal!)
4. Select your class and subject

### **STEP 5: Enter Test Marks**

Enter these exact values for ONE student:

```
Midterm CA1: 8
Midterm CA2: 7
Midterm Exam: 16
```

### **STEP 6: CHECK CONSOLE IMMEDIATELY**

You should see this in the console:

```
[calculateTotals] ===== STARTING CALCULATION =====
[calculateTotals] Processing 1 students
[calculateTotals] Student 1 (StudentName): {
  midtermCA1: 8,
  midtermCA2: 7,
  midtermExam: 16,
  midtermTotal: 31,
  terminalCA1_BEFORE: null,
  terminalCA1_CALCULATED: 15.5,
  terminalCA2: null,
  terminalExam: null,
  formula: "(8 + 7 + 16) / 2 = 15.5"
}
[calculateTotals] ✅ Terminal CA1 SET TO: 15.5
```

### **STEP 7: Click "Save Draft"**

You should see:

```
[handleSave] ===== SAVING MARKS =====
[handleSave] Current students state: [...]
[handleSave] First student terminal.ca1: 15.5
[handleSave] First student terminal.ca2: null
[handleSave] First student terminal.exam: null

[roundMarks] ===== ROUNDING MARKS =====
[roundMarks] Student 1 BEFORE rounding: {
  name: "StudentName",
  midterm: { ca1: 8, ca2: 7, exam: 16 },
  terminal: { ca1: 15.5, ca2: null, exam: null }
}
[roundMarks] Student 1 AFTER rounding: {
  name: "StudentName",
  midterm: { ca1: 8, ca2: 7, exam: 16 },
  terminal: { ca1: 15.5, ca2: null, exam: null }
}

[MarksModule] Sample student data: {
  name: "StudentName",
  midterm: { ca1: 8, ca2: 7, exam: 16 },
  terminal: { ca1: 15.5, ca2: null, exam: null }
}
```

### **STEP 8: Check Database**

```sql
SELECT student_id, type, ca1, ca2, exam
FROM marks
ORDER BY created_at DESC;
```

**EXPECTED RESULT:**

```
type      | ca1 | ca2  | exam
----------|-----|------|------
midterm   | 8   | 7    | 16
terminal  | 16  | null | null  (15.5 rounded to 16 by backend)
```

---

## ❌ IF YOU SEE WRONG VALUES IN CONSOLE

### **Scenario A: calculateTotals shows WRONG calculation**

If you see:
```
terminalCA1_CALCULATED: 15  ❌ (8 + 7 instead of (8+7+16)/2)
```

**THEN:** The code changes weren't saved/deployed properly.

**FIX:**
1. Check if MarksEntryTable.tsx shows "unsaved changes"
2. Save the file explicitly
3. Wait 30 seconds
4. Hard refresh browser
5. Try again

### **Scenario B: calculateTotals shows CORRECT but handleSave shows WRONG**

If calculateTotals shows 15.5 but handleSave shows 15:
```
[calculateTotals] Terminal CA1 SET TO: 15.5  ✅
[handleSave] First student terminal.ca1: 15   ❌
```

**THEN:** Something is modifying the data AFTER calculation.

**FIX:**
1. Take a screenshot of the console logs
2. Send to me immediately
3. I'll find where the data is being modified

### **Scenario C: handleSave shows CORRECT but roundMarks shows WRONG**

If handleSave shows 15.5 but roundMarks changes it:
```
[handleSave] terminal.ca1: 15.5  ✅
[roundMarks] AFTER rounding: terminal.ca1: 15  ❌
```

**THEN:** The roundMarks function is incorrectly rounding Terminal CA1.

**FIX:**
1. Check line 48-64 in MarksModule.tsx
2. Make sure it says: `ca1: student.terminal.ca1,` (NOT `Math.round(student.terminal.ca1)`)

### **Scenario D: roundMarks shows CORRECT but database shows WRONG**

If roundMarks shows 15.5 but database has 15 in terminal CA1 AND 16 in terminal CA2:
```
[roundMarks] AFTER: { ca1: 15.5, ca2: null, exam: null }  ✅
Database: ca1=15, ca2=16  ❌
```

**THEN:** The backend is doing something wrong OR there's OLD data.

**FIX:**
1. Run `DELETE FROM marks;` again
2. Try saving again
3. If still wrong, check backend logs

---

## 📊 WHAT TO SEND ME

Please copy and paste:

### **1. ALL Console Logs**

Copy EVERYTHING from the console from when you click "Save Draft". Include:

```
[calculateTotals] ...
[handleSave] ...
[roundMarks] ...
[MarksModule] ...
[Supabase] ...
```

### **2. Database Query Result**

```sql
SELECT * FROM marks ORDER BY created_at DESC LIMIT 5;
```

Paste the full result.

### **3. Which Step Failed?**

Tell me which step had the wrong values:

- [ ] Step 6: calculateTotals shows wrong calculation
- [ ] Step 7: handleSave shows wrong values
- [ ] Step 7: roundMarks shows wrong values
- [ ] Step 8: Database has wrong values

---

## 🎯 WHAT SHOULD HAPPEN

With the new code, you should see:

**In Console:**
- `terminalCA1_CALCULATED: 15.5` ✅
- `terminal: { ca1: 15.5, ca2: null, exam: null }` ✅

**In Database:**
- Midterm: ca1=8, ca2=7, exam=16
- Terminal: ca1=16 (15.5 rounded), ca2=null, exam=null

**NOT:**
- Terminal: ca1=15 (8+7), ca2=16 (midterm exam) ❌

---

## 🔥 IMPORTANT NOTES

1. **Use INCOGNITO browser** - This ensures fresh code
2. **Keep console OPEN** - You need to see the logs
3. **Select MIDTERM exam** - NOT Terminal exam
4. **Delete all marks first** - No old data to confuse things
5. **Send me ALL logs** - Don't just tell me "it's wrong", I need to see the actual logs

---

The new logging will tell us EXACTLY where the bug is happening!
