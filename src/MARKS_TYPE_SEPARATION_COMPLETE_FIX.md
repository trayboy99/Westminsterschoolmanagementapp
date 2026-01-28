# ✅ CRITICAL FIX: Midterm & Terminal Marks Now Saved as Separate Rows

## 🔥 THE PROBLEM YOU REPORTED

### Issue 1: "Unknown Teacher" and "Unknown Class" in Approval Panel
The approval panel was showing "Unknown Teacher" and "Unknown Class" because the database lookups were failing.

### Issue 2: **Midterm scores disappearing when submitting terminal scores**
When you submitted terminal scores, the midterm scores were being **deleted from the database** and replaced.

**What you expected:**
- Submit midterm scores → Creates rows with `type='midterm'` ✅
- Submit terminal scores → Creates rows with `type='terminal'` ✅
- **BOTH should exist as separate rows in the marks table** ✅

**What was happening (BUG):**
- Submit midterm scores → Creates rows with `type='midterm'` ✅
- Submit terminal scores → **DELETES ALL marks** (including midterm) → Creates only terminal rows ❌

---

## 🔧 THE FIX

### **1. Type-Aware Deletion (Backend)**

**BEFORE (Broken Code):**
```typescript
// ❌ This deleted ALL marks regardless of type
if (isUpdate) {
  const { error: deleteError } = await supabase
    .from("marks")
    .delete()
    .eq("exam_id", exam_id)
    .eq("subject_id", subject_id)
    .in("student_id", studentIds);  // ❌ Deleted BOTH midterm AND terminal
}
```

**AFTER (Fixed Code):**
```typescript
// ✅ Only delete marks of the SAME TYPE being submitted
if (isUpdate) {
  // Determine which types are being submitted
  const typesBeingSubmitted = [...new Set(marksToInsert.map(m => m.type))];
  
  // Delete only marks that match the types being submitted
  for (const type of typesBeingSubmitted) {
    const { error: deleteError } = await supabase
      .from("marks")
      .delete()
      .eq("exam_id", exam_id)
      .eq("subject_id", subject_id)
      .eq("type", type)  // 🔥 TYPE-SPECIFIC DELETION
      .in("student_id", studentIds);
  }
}
```

### **2. Enhanced Logging (Backend)**

Added comprehensive logging to verify both types are preserved:

```typescript
// Count marks by type
const midtermCount = insertedMarks?.filter(m => m.type === 'midterm').length || 0;
const terminalCount = insertedMarks?.filter(m => m.type === 'terminal').length || 0;

console.log(
  "[Supabase] Successfully saved",
  insertedMarks?.length || 0,
  "mark entries:",
  { midterm: midtermCount, terminal: terminalCount }
);

// 🔥 VERIFICATION: Check what exists in DB after save
const { data: allMarksForExamSubject } = await supabase
  .from("marks")
  .select("id, student_id, type, status")
  .eq("exam_id", exam_id)
  .eq("subject_id", subject_id);

const dbMidtermCount = allMarksForExamSubject?.filter(m => m.type === 'midterm').length || 0;
const dbTerminalCount = allMarksForExamSubject?.filter(m => m.type === 'terminal').length || 0;
console.log(
  "[Supabase] 📊 Total marks in DB for this exam/subject:",
  { midterm: dbMidtermCount, terminal: dbTerminalCount, total: allMarksForExamSubject?.length || 0 }
);
```

### **3. Approval Panel Lookup Fix**

Added detailed logging to debug why "Unknown Teacher" and "Unknown Class" were showing:

```typescript
// Filter out null IDs
const examIds = [...new Set(pendingMarks?.map(m => m.exam_id).filter(Boolean) || [])];
const subjectIds = [...new Set(pendingMarks?.map(m => m.subject_id).filter(Boolean) || [])];
const classIds = [...new Set(pendingMarks?.map(m => m.class_id).filter(Boolean) || [])];
const teacherIds = [...new Set(pendingMarks?.map(m => m.submitted_by).filter(Boolean) || [])];

console.log("[Pending Approvals] IDs to fetch:", {
  exams: examIds,
  subjects: subjectIds,
  classes: classIds,
  teachers: teacherIds
});

// Log each fetch result
console.log(`[Pending Approvals] Fetched ${exams?.length || 0} exams`);
console.log(`[Pending Approvals] Fetched ${subjects?.length || 0} subjects`);
console.log(`[Pending Approvals] Fetched ${classes?.length || 0} classes`);
console.log(`[Pending Approvals] Fetched ${teachers?.length || 0} teachers`);

// Warn if any lookup fails
if (!exam) console.warn(`[Pending Approvals] No exam found for ID: ${mark.exam_id}`);
if (!subject) console.warn(`[Pending Approvals] No subject found for ID: ${mark.subject_id}`);
if (!classData) console.warn(`[Pending Approvals] No class found for ID: ${mark.class_id}`);
if (!teacher) console.warn(`[Pending Approvals] No teacher found for ID: ${mark.submitted_by}`);
```

---

## 🎯 HOW IT WORKS NOW

### **Workflow:**

1. **Teacher submits MIDTERM scores:**
   - Frontend sends only midterm data (CA1: 10, CA2: 10, Exam: 20)
   - Backend creates rows with `type='midterm'`
   - Status: `'pending_approval'`

2. **Teacher submits TERMINAL scores:**
   - Frontend sends only terminal data (CA1: 20, CA2: 20, Exam: 60)
   - Backend **ONLY deletes existing terminal rows** (if any)
   - Backend **PRESERVES all midterm rows**
   - Backend creates new rows with `type='terminal'`
   - Status: `'pending_approval'`

3. **Database state:**
   ```
   marks table:
   | id  | student_id | exam_id | subject_id | type     | ca1 | ca2 | exam | status            |
   |-----|------------|---------|------------|----------|-----|-----|------|-------------------|
   | 1   | student-1  | exam-1  | math       | midterm  | 8   | 9   | 18   | pending_approval  |
   | 2   | student-1  | exam-1  | math       | terminal | 18  | 17  | 55   | pending_approval  |
   | 3   | student-2  | exam-1  | math       | midterm  | 7   | 8   | 16   | pending_approval  |
   | 4   | student-2  | exam-1  | math       | terminal | 16  | 18  | 52   | pending_approval  |
   ```

4. **Approval panel shows TWO separate cards:**
   - 📝 **Midterm Score Approval** - Mathematics JSS1A - 1st Term
   - 📊 **Terminal Score Approval** - Mathematics JSS1A - 1st Term

5. **Principal can approve independently:**
   - Approve midterm → All midterm rows get `status='approved'`
   - Approve terminal → All terminal rows get `status='approved'`
   - Midterm and terminal are **completely independent**

---

## ✅ VERIFICATION LOGS

After the fix, you should see these logs:

### **When submitting midterm:**
```
[Supabase] Processing 2 mark entries
[Supabase] Sample mark entry to be saved: {
  "student_id": "...",
  "exam_id": "...",
  "subject_id": "...",
  "type": "midterm",
  "ca1": 8,
  "ca2": 9,
  "exam": 18,
  "status": "pending_approval"
}
[Supabase] Deleting marks for specific students and types: {
  students: 2,
  types: ["midterm"]
}
[Supabase] ✅ Deleted midterm marks for specific students (preserving other types and classes)
[Supabase] Successfully saved 2 mark entries: { midterm: 2, terminal: 0 }
[Supabase] 📊 Total marks in DB for this exam/subject: { midterm: 2, terminal: 0, total: 2 }
```

### **When submitting terminal:**
```
[Supabase] Processing 2 mark entries
[Supabase] Sample mark entry to be saved: {
  "student_id": "...",
  "exam_id": "...",
  "subject_id": "...",
  "type": "terminal",
  "ca1": 18,
  "ca2": 17,
  "exam": 55,
  "status": "pending_approval"
}
[Supabase] Deleting marks for specific students and types: {
  students: 2,
  types: ["terminal"]
}
[Supabase] ✅ Deleted terminal marks for specific students (preserving other types and classes)
[Supabase] Successfully saved 2 mark entries: { midterm: 0, terminal: 2 }
[Supabase] 📊 Total marks in DB for this exam/subject: { midterm: 2, terminal: 2, total: 4 } 🔥
```

**👆 See that? BOTH midterm AND terminal exist! Total: 4 rows (2 midterm + 2 terminal)**

---

## 🧪 TEST NOW

### **Step 1: Clear cache**
```
Ctrl+Shift+R
```

### **Step 2: Login as teacher**

### **Step 3: Go to Marks Module**

### **Step 4: Submit midterm scores**
1. Select class, subject, exam
2. Enter midterm marks (CA1: 0-10, CA2: 0-10, Exam: 0-20)
3. Click **"Submit Midterm Scores"**
4. Check browser console for logs
5. **Go to Supabase → marks table → You should see rows with `type='midterm'`**

### **Step 5: Submit terminal scores**
1. Same class, subject, exam
2. Enter terminal marks (CA1: 0-20, CA2: 0-20, Exam: 0-60)
3. Terminal CA1 should be auto-filled from midterm average
4. Click **"Submit Terminal Scores"**
5. Check browser console for logs
6. **🔥 Go to Supabase → marks table → You should see BOTH types:**
   ```sql
   SELECT * FROM marks 
   WHERE exam_id = 'your-exam-id' 
     AND subject_id = 'your-subject-id'
   ORDER BY type, student_id;
   ```
   
   **Expected result:**
   ```
   | student_id | type     | ca1 | ca2 | exam | status            |
   |------------|----------|-----|-----|------|-------------------|
   | student-1  | midterm  | 8   | 9   | 18   | pending_approval  |
   | student-1  | terminal | 18  | 17  | 55   | pending_approval  |
   | student-2  | midterm  | 7   | 8   | 16   | pending_approval  |
   | student-2  | terminal | 16  | 18  | 52   | pending_approval  |
   ```

### **Step 6: Check approval panel (Principal)**
1. Login as principal
2. Go to Marks Module → Approval tab
3. **You should see TWO separate approval cards:**
   - 📝 Midterm Score Approval
   - 📊 Terminal Score Approval

---

## 🐛 DEBUG "Unknown Teacher/Class" ISSUE

Check the browser console for these logs:

```
[Pending Approvals] Found X submitted marks
[Pending Approvals] Sample mark: { ... }
[Pending Approvals] IDs to fetch: { exams: [...], subjects: [...], classes: [...], teachers: [...] }
[Pending Approvals] Fetched X exams
[Pending Approvals] Fetched X subjects
[Pending Approvals] Fetched X classes
[Pending Approvals] Fetched X teachers
```

If you see:
```
[Pending Approvals] No class found for ID: ...
[Pending Approvals] No teacher found for ID: ...
```

**This means:**
1. The `class_id` or `submitted_by` in the marks table is NULL or invalid
2. The class or teacher doesn't exist in the database

**To fix:**
1. Check the marks table: `SELECT class_id, submitted_by FROM marks WHERE status='pending_approval';`
2. Verify the class exists: `SELECT id, name FROM classes WHERE id='...'`
3. Verify the teacher exists: `SELECT id, full_name FROM profiles WHERE id='...'`

---

## ✅ FILES CHANGED

1. **`/supabase/functions/server/index.tsx`**
   - Lines ~5736-5760: Added type-specific deletion logic
   - Lines ~5778-5808: Added verification logging
   - Lines ~5854-5940: Enhanced approval panel logging

---

## 📊 SUMMARY

### **Before:**
- ❌ Terminal submission deleted midterm marks
- ❌ Only one type existed in database at a time
- ❌ "Unknown Teacher" and "Unknown Class" in approvals

### **After:**
- ✅ Type-specific deletion preserves other types
- ✅ Both midterm AND terminal coexist as separate rows
- ✅ Enhanced logging for debugging lookups
- ✅ Separate approval cards for each type

---

## 🎯 KEY TAKEAWAY

**The marks table now properly stores BOTH midterm AND terminal as separate rows, distinguished by the `type` column. They will NEVER overwrite each other!**

Test it now and you should see both types in your database! 🚀
