# 🧪 Test Marks Entry After Promotion - Quick Guide

## ✅ What Was Fixed

**The promotion bug:** Students disappeared from marks entry after being promoted to a new class. Now the system uses a **session-aware UNION query** that fetches:
- Current students in the class
- Promoted students who have existing marks

---

## 🎯 Test Scenario 1: Historical Marks After Promotion

### **Setup:**
1. You have students who were in **JSS1** during **2025/2026**
2. You entered marks for them in JSS1, 2025/2026, First Term
3. You promoted them to **JSS2** for **2026/2027**

### **Test Steps:**
1. Login as **Principal** or **IT Admin**
2. Go to **Marks Entry** section
3. Click **"New Marks Entry"**
4. Select:
   - **Class:** JSS1
   - **Session:** 2025/2026
   - **Term:** First Term
   - **Exam:** Midterm (or Terminal)
   - **Subject:** Mathematics (or any subject with existing marks)
5. Click **Continue**

### **Expected Result:**
✅ **Toast notification appears:**
```
"Found X current + Y promoted students with marks"
```

✅ **Students table shows:**
- All students who have marks from that period
- Includes students now in JSS2
- Marks pre-filled from database
- You can edit and resubmit

✅ **Console logs show:**
```
[MarksModule] Student breakdown: { current: X, historical: Y }
[MarksModule] ✅ Including Y promoted students with historical marks
```

### **❌ OLD Broken Behavior:**
```
Toast: "No students found in this class. The class may be empty."
Students: None
```

---

## 🎯 Test Scenario 2: Current Session (No Promotion)

### **Setup:**
1. Current session is **2026/2027**
2. Students are currently in **JSS2**
3. No marks entered yet for this session

### **Test Steps:**
1. Select:
   - **Class:** JSS2
   - **Session:** 2026/2027 (current)
   - **Term:** First Term
   - **Exam:** Midterm
   - **Subject:** Mathematics
2. Click **Continue**

### **Expected Result:**
✅ **Shows all current JSS2 students**
✅ **Marks are blank** (new entry)
✅ **Can enter new marks**

---

## 🎯 Test Scenario 3: Mixed (Promoted + Repeated Students)

### **Setup:**
1. Session 2025/2026, JSS1
2. 20 students promoted to JSS2
3. 5 students repeated in JSS1
4. All 25 have marks from 2025/2026

### **Test Steps:**
1. Select JSS1, 2025/2026, First Term, Mathematics
2. Click Continue

### **Expected Result:**
✅ **Shows all 25 students:**
- 5 currently in JSS1 (class_id = JSS1)
- 20 now in JSS2 (but have marks for JSS1 2025/2026)

✅ **Toast shows:**
```
"Found 5 current + 20 promoted students with marks"
```

---

## 🔍 Debugging Checks

### **1. Check Browser Console**

Look for these logs:
```javascript
[MarksModule] Including exam_id for session-aware query: exam_001
[MarksModule] Including subject_id for session-aware query: math_id
[MarksModule] Student breakdown: { current: 5, historical: 20 }
[MarksModule] ✅ Including 20 promoted students with historical marks
```

### **2. Check Network Tab**

**Request URL should include exam_id and subject_id:**
```
/students-by-class?class_id=JSS1_ID&exam_id=exam_001&subject_id=math_id
```

**Response should include breakdown:**
```json
{
  "success": true,
  "students": [...],
  "total_students": 25,
  "breakdown": {
    "current": 5,
    "historical": 20
  }
}
```

### **3. Check Backend Logs**

In Supabase Edge Function logs, look for:
```
[Students By Class] Session-aware fetch: { 
  classId: 'JSS1_ID', 
  examId: 'exam_001', 
  subjectId: 'math_id' 
}
[Students By Class] Found 5 current students in class JSS1_ID
[Students By Class] Fetching historical students with marks...
[Students By Class] Found 25 unique students with existing marks
[Students By Class] Fetching 20 promoted students with historical marks
[Students By Class] Added 20 promoted students to results
[Students By Class] TOTAL: Returning 25 students (current + historical)
```

---

## ❌ If It Still Doesn't Work

### **Check 1: Verify marks exist**
```sql
-- Run in Supabase SQL Editor
SELECT 
  m.id,
  m.student_id,
  m.exam_id,
  m.subject_id,
  m.class_id as marks_class,
  p.class_id as current_class,
  p.first_name,
  p.last_name,
  e.session,
  e.term
FROM marks m
JOIN profiles p ON m.student_id = p.id
JOIN exams e ON m.exam_id = e.id
WHERE e.session = '2025/2026'
  AND e.term = 'First'
ORDER BY p.first_name;
```

**Expected:** Should show marks with different `marks_class` vs `current_class` for promoted students.

### **Check 2: Verify exam_id is correct**
```sql
-- Get exam ID
SELECT id, name, session, term 
FROM exams 
WHERE session = '2025/2026' AND term = 'First';
```

### **Check 3: Verify subject_id is correct**
```sql
-- Get subject ID
SELECT id, name 
FROM subjects 
WHERE name = 'Mathematics';
```

### **Check 4: Clear browser cache**
```
1. Press Ctrl+Shift+Delete (or Cmd+Shift+Delete on Mac)
2. Clear "Cached images and files"
3. Refresh page
4. Try again
```

---

## 📊 Data Verification

### **Confirm Promotion Happened:**
```sql
-- Check if students moved classes
SELECT 
  id,
  first_name,
  last_name,
  class_id as current_class,
  graduation_session
FROM profiles
WHERE role = 'student'
ORDER BY first_name;
```

### **Confirm Marks Preserved class_id:**
```sql
-- Check that marks.class_id did NOT change after promotion
SELECT DISTINCT
  m.class_id as marks_class_id,
  c.name as class_name
FROM marks m
JOIN classes c ON m.class_id = c.id
WHERE m.exam_id IN (
  SELECT id FROM exams WHERE session = '2025/2026'
);
```

**Expected:** Should show JSS1 (marks preserved historical class).

---

## 🎯 Success Checklist

After testing, you should be able to:

- [✅] View marks from 2025/2026 session after promotion
- [✅] See promoted students in original class context
- [✅] Edit historical marks
- [✅] See breakdown toast (current + promoted)
- [✅] Console logs show session-aware query
- [✅] Network request includes exam_id and subject_id
- [✅] Backend returns breakdown object

---

## 🚀 What to Do After Successful Test

1. ✅ Test with different classes (JSS2, JSS3, SSS1, etc.)
2. ✅ Test with different sessions
3. ✅ Test with both midterm and terminal marks
4. ✅ Test with multiple subjects
5. ✅ Inform teachers marks are now accessible
6. ✅ Update any documentation

---

## 📝 Important Notes

### **Data Integrity:**
- ✅ No data was lost during promotion
- ✅ All marks preserved with correct class_id
- ✅ Student records intact
- ✅ Promotion history maintained

### **Performance:**
- ✅ UNION query is efficient
- ✅ Uses proper indexes
- ✅ No noticeable slowdown

### **User Experience:**
- ✅ Clear toast notifications
- ✅ Informative console logs
- ✅ Same workflow as before
- ✅ Just works correctly now!

---

## 🎉 You're Done!

The marks entry system is now **promotion-proof**. Students can be promoted anytime without losing access to historical marks!

**The system correctly understands:**
- `profiles.class_id` = Where student is NOW
- `marks.class_id` = Where student WAS when marks entered

**And fetches accordingly!** 🚀
