# 🎓 Student Promotion System - Complete Implementation Guide

## Overview

The **Student Promotion System** allows administrators to promote students from one class to the next based on a configurable class hierarchy. This system handles section preservation, graduation, and transcript access.

---

## 🎯 Key Features

### ✅ **Implemented Features**

1. **Class Hierarchy Configuration**
   - Visual drag-and-drop ordering of classes (JSS1 → JSS2 → JSS3 → SS1 → SS2 → SS3)
   - Classes with sections at the same level
   - Lowest and highest class badges

2. **Manual Promotion UI** (Recommended Approach)
   - Admin clicks "Promote" button for each class
   - Preview of student counts before promotion
   - Section matching indicators
   - Warnings for section mismatches

3. **Section Preservation**
   - JSS1-A → JSS2-A (maintains section if exists)
   - JSS1-A → JSS2 (drops section if target has no sections)
   - Manual transfer capability for special cases

4. **Graduation Handling**
   - SS3 students marked as "graduated"
   - Graduation session tracked (e.g., 2025/2026)
   - Transcript access automatically enabled

5. **Promotion History**
   - Tracks who promoted students and when
   - Records session, class transitions, student counts
   - Stored in KV store for auditing

---

## 📊 System Architecture

### **Database Schema**

```sql
-- Classes table additions
classes {
  id: UUID
  name: TEXT
  level: TEXT
  section_id: UUID (nullable)
  hierarchy_order: INTEGER  -- NEW: Determines promotion order
}

-- Profiles table additions
profiles {
  id: UUID
  role: TEXT
  class_id: UUID (nullable)
  status: TEXT              -- NEW: 'active', 'graduated', 'withdrawn'
  graduation_session: TEXT  -- NEW: e.g., '2025/2026'
}
```

### **KV Store Keys**

```
promotion_history:{session}:{from_class_id}
  → Tracks promotion details
  
attendance_summary:{student_id}:{session}:{term}
  → Invalidated after promotion
```

---

## 🚀 Setup Instructions

### **Step 1: Run Database Migration**

```bash
# In Supabase SQL Editor, run:
/ADD_PROMOTION_SYSTEM_COLUMNS.sql
```

This adds:
- `hierarchy_order` column to `classes`
- `status` column to `profiles`
- `graduation_session` column to `profiles`
- Indexes for performance
- Default hierarchy based on existing levels

### **Step 2: Configure Class Hierarchy**

1. **Go to:** Admin Dashboard → **Settings** → **Class Hierarchy**
2. **Arrange classes** from lowest to highest using arrow buttons
3. **Important Notes:**
   - Place classes with sections (JSS1-A, JSS1-B) at the same level
   - Lowest class = new admissions (e.g., JSS1)
   - Highest class = graduating class (e.g., SS3)
4. **Click "Save Hierarchy"**

**Example Hierarchy:**
```
1. JSS1 (or JSS1-A, JSS1-B at same order level)
2. JSS2 (or JSS2-A, JSS2-B)
3. JSS3
4. SS1
5. SS2
6. SS3 ← Graduating class
```

### **Step 3: Promote Students**

1. **Go to:** Admin Dashboard → **Promotions**
2. **Set New Session** (e.g., 2025/2026)
3. **Review each class:**
   - Shows current class → next class
   - Displays student count
   - Shows section matching status
   - Displays warnings if any

4. **Click "Promote"** for each class:
   - JSS1 → JSS2 ✅
   - JSS2 → JSS3 ✅
   - ...
   - SS3 → Graduated 🎓

5. **Confirmation Dialog:**
   - Shows student count
   - Shows destination class
   - Shows any warnings
   - Cannot be undone ⚠️

---

## 🔍 How It Works

### **Regular Promotion (JSS1 → JSS2)**

```javascript
1. Admin clicks "Promote" on JSS1
2. System finds all students with class_id = JSS1
3. System updates their class_id to JSS2
4. System invalidates attendance caches
5. System records promotion in KV store
6. Class teachers see new students immediately
```

### **Graduation (SS3 → Graduated)**

```javascript
1. Admin clicks "Graduate" on SS3
2. System finds all students with class_id = SS3
3. System updates:
   - class_id = null
   - status = 'graduated'
   - graduation_session = '2025/2026'
4. Students can now access transcripts
5. They no longer appear in class lists
```

### **Section Matching Logic**

```
Scenario 1: Perfect Match
JSS1-A (30 students) → JSS2-A
✅ Section preserved

Scenario 2: Section Dropped
JSS1-A (30 students) → JSS2 (no sections)
⚠️ Warning shown, students move to JSS2

Scenario 3: Section Mismatch
JSS1-A → JSS2-B
⚠️ Warning shown, admin confirms
```

---

## 📱 User Interface

### **Class Hierarchy Settings**
```
┌─────────────────────────────────────────┐
│ Class Hierarchy                    Save │
├─────────────────────────────────────────┤
│ ℹ️ Arrange classes from lowest to      │
│    highest for student promotion        │
├─────────────────────────────────────────┤
│ [≡] 1  JSS1            [Lowest]  ▲ ▼   │
│ [≡] 2  JSS2                      ▲ ▼   │
│ [≡] 3  JSS3                      ▲ ▼   │
│ [≡] 4  SS1                       ▲ ▼   │
│ [≡] 5  SS2                       ▲ ▼   │
│ [≡] 6  SS3      [Graduating]     ▲ ▼   │
└─────────────────────────────────────────┘
```

### **Promotion Management**
```
┌─────────────────────────────────────────────────┐
│ Student Promotion Management                    │
├─────────────────────────────────────────────────┤
│ Current Session: 2024/2025                      │
│ New Session: [2025/2026_______________]         │
├─────────────────────────────────────────────────┤
│                                                  │
│ JSS1 (45 students) → JSS2      [Promote]       │
│ ✅ Section matching preserved                   │
│                                                  │
│ JSS2 (42 students) → JSS3      [Promote]       │
│ ✅ Section matching preserved                   │
│                                                  │
│ SS3 (38 students) → Graduated  [Graduate] 🎓   │
│ 📄 Transcript access enabled                    │
│                                                  │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Promotion Workflow

### **Academic Year Transition**

**Timeline:**
1. **Term 3 Ends** (Current Session: 2024/2025)
2. **Admin Reviews Results** → Confirms all students passed
3. **New Session Created** (2025/2026) in Settings
4. **Admin Configures Hierarchy** (if not done)
5. **Admin Promotes Students** in Promotions Management
6. **New Term Begins** with students in new classes

**What Happens:**
```
Before Promotion (2024/2025 - Third Term):
- JSS1: 45 students
- JSS2: 42 students  
- JSS3: 40 students
- SS1: 38 students
- SS2: 35 students
- SS3: 38 students

After Promotion (2025/2026 - First Term):
- JSS1: 0 students (awaiting new admissions)
- JSS2: 45 students (promoted from JSS1)
- JSS3: 42 students (promoted from JSS2)
- SS1: 40 students (promoted from JSS3)
- SS2: 38 students (promoted from SS1)
- SS3: 35 students (promoted from SS2)
- Graduated: 38 students (from SS3 - Class of 2024/2025)
```

---

## 🔐 Transcript Access

### **Who Can View Transcripts?**

```javascript
// Backend logic
const canViewTranscript = (student) => {
  // Graduated students
  if (student.status === 'graduated') return true;
  
  // Students in JSS3 and above
  const transcriptEnabledLevels = ['JSS3', 'SS1', 'SS2', 'SS3'];
  if (transcriptEnabledLevels.includes(student.level)) return true;
  
  return false;
};
```

**Transcript Shows:**
- All terms across all sessions
- Final grades and positions
- Attendance records
- Principal's comments
- Graduation session (for graduated students)

---

## ⚠️ Important Considerations

### **Before Promoting:**

✅ **DO:**
- Ensure class hierarchy is configured correctly
- Verify all marks are entered and approved
- Confirm results are published for current session
- Back up data (Supabase automatic backups)
- Communicate with teachers about timing

❌ **DON'T:**
- Promote during active term
- Promote if marks are incomplete
- Promote without checking section matching
- Change hierarchy after partial promotions

### **Handling Special Cases:**

**Repeating Students:**
- Don't click "Promote" for their class
- Manually transfer them later (individual action)

**Mid-Year Transfers:**
- Use individual student profile editing
- Update `class_id` directly in Students Manager

**Withdrawn Students:**
- Update `status` to 'withdrawn' before promotion
- They won't be promoted automatically

---

## 🧪 Testing Guide

### **Test Promotion (Safe Testing)**

```sql
-- 1. Create test students in a test class
INSERT INTO profiles (first_name, last_name, email, role, class_id)
VALUES 
  ('Test', 'Student1', 'test1@test.com', 'student', 'your-jss1-id'),
  ('Test', 'Student2', 'test2@test.com', 'student', 'your-jss1-id');

-- 2. Promote via UI

-- 3. Verify promotion
SELECT first_name, last_name, class_id, status 
FROM profiles 
WHERE email LIKE 'test%@test.com';

-- 4. Check promotion history
-- View in KV store: promotion_history:2025/2026:your-jss1-id

-- 5. Clean up test data
DELETE FROM profiles WHERE email LIKE 'test%@test.com';
```

---

## 📊 Backend API Reference

### **POST /promote-students**

**Request:**
```json
{
  "from_class_id": "uuid",
  "to_class_id": "uuid | null",
  "session": "2025/2026",
  "is_graduation": false
}
```

**Response:**
```json
{
  "success": true,
  "message": "Students promoted successfully",
  "promoted_count": 45,
  "is_graduation": false,
  "session": "2025/2026"
}
```

**Authorization:** Principal or IT Admin only

---

## 🎓 Graduation Features

### **Graduated Student Profile**

```
Status: Graduated
Graduation Session: 2024/2025
Transcript Access: ✅ Enabled
Current Class: N/A
```

### **Graduated Student Dashboard Changes**

- Shows "Graduated" badge
- Full transcript access for all sessions
- No class assignments
- No active attendance marking
- Historical data preserved

---

## 🚨 Troubleshooting

### **Problem: Hierarchy not showing in Promotions**
**Solution:** Configure hierarchy in Settings → Class Hierarchy first

### **Problem: Section mismatch warnings**
**Solution:** 
- Check if both classes have sections configured
- Manually adjust sections in Classes Manager
- Or accept the warning and proceed

### **Problem: Students not appearing in new class**
**Solution:**
- Refresh the class teacher's view
- Check student's `class_id` in database
- Verify promotion was successful (check logs)

### **Problem: Attendance summaries not updating**
**Solution:**
- Promotion automatically invalidates caches
- Wait 30 seconds and refresh
- Check browser console for errors

---

## ✅ Success Indicators

After successful promotion:

1. ✅ **Students appear in new class** (Class Teacher Dashboard)
2. ✅ **Student count updated** in old and new classes
3. ✅ **Promotion history recorded** in KV store
4. ✅ **Attendance caches invalidated**
5. ✅ **Graduated students** have status = 'graduated'
6. ✅ **Transcript access** enabled for graduated students

---

## 📝 Summary

The **Student Promotion System** provides:

- ✅ **Manual control** over promotions (Option 2 - Recommended)
- ✅ **Visual hierarchy** configuration
- ✅ **Section preservation** when possible
- ✅ **Graduation handling** with transcript access
- ✅ **Audit trail** of all promotions
- ✅ **Safe operation** with confirmations
- ✅ **Reversible** through manual student editing

**Next Steps:**
1. Run SQL migration (`ADD_PROMOTION_SYSTEM_COLUMNS.sql`)
2. Configure class hierarchy in Settings
3. Test with a small class first
4. Promote all classes for new session
5. Verify students in new classes
6. Communicate changes to teachers

---

**Implementation Status:** ✅ **COMPLETE**
**Testing Status:** ⏳ **Ready for Testing**
**Documentation:** ✅ **Complete**

---

For questions or issues, check the browser console logs with prefix `[Promotion]` for detailed debugging information.
