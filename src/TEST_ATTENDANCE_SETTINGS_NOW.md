# 🧪 Test Attendance Settings - Quick Guide

## ⚡ 3-Minute Test

### **Step 1: Access Settings** (30 seconds)
1. Login as **Principal** or **IT Admin**
2. Go to **Settings** menu
3. You should see a new tab: **"Attendance Settings"** ✨

### **Step 2: Configure Grading** (1 minute)
1. Click **"Attendance Settings"** tab
2. You'll see default grading levels:
   - Excellent: 95-100%
   - Very Good: 90-94%
   - Good: 85-89%
   - Fair: 80-84%
   - Poor: 75-79%
   - Unsatisfactory: 0-74%
3. **Optional:** Adjust any thresholds or remarks
4. Note the **Intervention Threshold: 85%** (students below this get flagged)
5. Click **"Save Grading"**
6. ✅ Should see success message

### **Step 3: Set School Calendar** (1 minute)
1. Scroll down to **"School Calendar (Days Opened)"** section
2. Select session: **2025/2026** (should be pre-selected as current)
3. Select term: **First Term** (should be pre-selected as current)
4. Enter **Total School Days: 67** (or whatever is accurate)
5. **Optional:** Enter start/end dates
6. See the example calculation update
7. Click **"Save Calendar"**
8. ✅ Should see: "School calendar saved for 2025/2026 - First Term!"

### **Step 4: Test API** (30 seconds)
Open browser console (F12) and run:

```javascript
// Get a student ID from your system (replace with real UUID)
const studentId = "YOUR_STUDENT_UUID_HERE";

// Get auth token
const { data: { session } } = await supabase.auth.getSession();
const token = session.access_token;

// Test summary calculation
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/summary/student?student_id=${studentId}&session=2025/2026&term=First Term`,
  { headers: { 'Authorization': `Bearer ${token}` } }
);
const result = await response.json();
console.log('📊 Attendance Summary:', result);
```

**Expected Output:**
```
📊 Attendance Summary: {
  success: true,
  summary: {
    attendance_percentage: 95.5,
    attendance_grade: "Excellent",
    attendance_remark: "Outstanding attendance! Keep it up!",
    total_school_days: 67,
    days_present: 64,
    flagged: false
  }
}
```

---

## ✅ Success Checklist

- [ ] Can see "Attendance Settings" tab in Settings Management
- [ ] Can view default grading configuration
- [ ] Can save grading configuration
- [ ] Can select session and term
- [ ] Can enter total school days
- [ ] Can save school calendar
- [ ] API returns attendance summary with correct percentage
- [ ] Grade assigned based on percentage (e.g., 95.5% = "Excellent")

---

## 🎯 What to Look For

### **In the UI:**
- New tab appears with attendance icon (clipboard)
- Grading section shows 6 default grade levels
- Calendar section shows session/term dropdowns
- "Total School Days" field is required and highlighted
- Save buttons work and show success messages

### **In Console Logs:**
```
[AttendanceSettings] Grading config loaded: ...
[AttendanceSettings] Sessions/terms loaded
[AttendanceSettings] Calendar loaded for 2025/2026 First Term
[AttendanceSettings] Grading config saved
[AttendanceSettings] Calendar saved
```

### **In Backend Logs:**
```
[Attendance Grading Config] Fetching configuration...
[School Calendar] Fetching calendar for: { session: '2025/2026', term: 'First Term' }
[School Calendar] Calendar saved successfully: school_calendar:2025/2026:First Term
[Attendance Summary] Calculating for: { student_id, session, term }
[Attendance Summary] Counts: { present: 64, absent: 2, late: 1 }
[Attendance Summary] Summary calculated and cached
```

---

## 🐛 If Something Doesn't Work

### **Tab not showing?**
- Clear browser cache
- Check if import was added: `import { AttendanceSettings } from './AttendanceSettings';`
- Check console for import errors

### **Can't save grading config?**
- Check if you're logged in as admin (principal or it_admin)
- Check network tab for API errors
- Look for authorization errors in backend logs

### **Calendar won't save?**
- Make sure session and term are selected
- Make sure total_school_days is > 0
- Check if sessions exist in "Sessions & Terms" tab

### **API returns error?**
- Make sure school calendar is saved first
- Check if student exists in database
- Check if attendance records exist for that student

---

## 📸 Screenshots You Should See

### **Attendance Settings Tab:**
```
┌─────────────────────────────────────────┐
│ [School] [Grades] [Sessions] [Sections] │
│ [Publishing] [Attendance] ← NEW!        │
└─────────────────────────────────────────┘
```

### **Grading Configuration:**
```
┌─────────────────────────────────────────┐
│ 🎯 Attendance Grading System            │
│                          [Save Grading] │
├─────────────────────────────────────────┤
│ ⚠️ Intervention Threshold: [85] %       │
│                                         │
│ Grade Levels:                [+ Add]    │
│                                         │
│ Min: [95] Max: [100] Grade: [Excellent]│
│ Remark: [Outstanding attendance!]  [🗑] │
│                                         │
│ Min: [90] Max: [94] Grade: [Very Good] │
│ ...                                     │
└─────────────────────────────────────────┘
```

### **School Calendar:**
```
┌─────────────────────────────────────────┐
│ 📅 School Calendar (Days Opened)        │
│                         [Save Calendar] │
├─────────────────────────────────────────┤
│ ℹ️ Total School Days used for % calc   │
│                                         │
│ Session: [2025/2026 ▼] Current         │
│ Term:    [First Term ▼] Current        │
│                                         │
│ Total School Days: [67] *REQUIRED       │
│ Number of Weeks:   [13]                 │
│                                         │
│ ✅ Example: 64 ÷ 67 = 95.5%             │
└─────────────────────────────────────────┘
```

---

## 🎉 Once Testing is Complete

When everything works, we'll proceed to:

**Phase 2:**
1. Add attendance section to Report Card
2. Enhance teacher marking interface with stats
3. Add admin analytics dashboard
4. Add student attendance view

Let me know:
- ✅ What works
- ❌ What doesn't work
- 💡 Any questions or issues

Ready to test! 🚀
