# 📚 Promotion & Historical Records - Complete Architecture Explanation

## 🎯 Your Question

**When a student is promoted:**
1. ❌ Promotion banner doesn't show on student dashboard
2. ❓ What records will be displayed?
3. ❓ How do old records remain in the database?

---

## ✅ How The System CURRENTLY Works (Architecture)

### Database Tables Structure:

```
┌─────────────────────────────────────────────────────────────────────┐
│                         PROFILES TABLE                               │
├─────────────────────────────────────────────────────────────────────┤
│ id        | first_name | last_name | class_id   | role              │
├─────────────────────────────────────────────────────────────────────┤
│ student-1 | John       | Doe       | jss1a-id   | student           │
│ student-2 | Jane       | Smith     | jss1a-id   | student           │
└─────────────────────────────────────────────────────────────────────┘
                                ↑
                         ONLY THIS CHANGES WHEN PROMOTED!
```

### When Promotion Happens:

**BEFORE PROMOTION:**
```
Student: John Doe
class_id: jss1a-id  ← Current class

ATTENDANCE TABLE:
┌──────────────────────────────────────────────────────────────┐
│ id  | student_id | class_id  | subject_id | date       | status │
├──────────────────────────────────────────────────────────────┤
│ 1   | student-1  | jss1a-id  | math-id    | 2024-01-15 | P     │
│ 2   | student-1  | jss1a-id  | eng-id     | 2024-01-15 | P     │
│ 3   | student-1  | jss1a-id  | math-id    | 2024-01-16 | A     │
└──────────────────────────────────────────────────────────────┘

MARKS TABLE:
┌──────────────────────────────────────────────────────────────┐
│ id  | student_id | class_id  | subject_id | exam_id | total │
├──────────────────────────────────────────────────────────────┤
│ 1   | student-1  | jss1a-id  | math-id    | exam-1  | 85    │
│ 2   | student-1  | jss1a-id  | eng-id     | exam-1  | 92    │
└──────────────────────────────────────────────────────────────┘

UPLOADS TABLE (Learning Materials):
┌──────────────────────────────────────────────────────────────┐
│ id  | title           | class_id  | subject_id | type      │
├──────────────────────────────────────────────────────────────┤
│ 1   | Math Notes Ch1  | jss1a-id  | math-id    | e-notes   │
│ 2   | English Essay   | jss1a-id  | eng-id     | assignment│
└──────────────────────────────────────────────────────────────┘
```

**DURING PROMOTION (What Happens):**
```sql
-- Update ONLY the student's class_id in profiles table
UPDATE profiles 
SET class_id = 'jss2a-id'  -- ← NEW CLASS
WHERE id = 'student-1';

-- Create promotion record
INSERT INTO promotions (
  student_id, 
  from_class_id,    -- jss1a-id  ← OLD CLASS
  to_class_id,      -- jss2a-id  ← NEW CLASS
  current_session,  -- 2024/2025
  new_session,      -- 2025/2026
  promoted_at
) VALUES (...);
```

**AFTER PROMOTION:**
```
Student: John Doe
class_id: jss2a-id  ← NEW CLASS!

PROFILES TABLE:
┌─────────────────────────────────────────────────────────────────────┐
│ id        | first_name | last_name | class_id   | role              │
├─────────────────────────────────────────────────────────────────────┤
│ student-1 | John       | Doe       | jss2a-id   | student  ← CHANGED│
└─────────────────────────────────────────────────────────────────────┘

ATTENDANCE TABLE (OLD RECORDS REMAIN!):
┌──────────────────────────────────────────────────────────────┐
│ id  | student_id | class_id  | subject_id | date       | status │
├──────────────────────────────────────────────────────────────┤
│ 1   | student-1  | jss1a-id  | math-id    | 2024-01-15 | P     │ ← OLD RECORD
│ 2   | student-1  | jss1a-id  | eng-id     | 2024-01-15 | P     │ ← OLD RECORD
│ 3   | student-1  | jss1a-id  | math-id    | 2024-01-16 | A     │ ← OLD RECORD
│ 4   | student-1  | jss2a-id  | physics-id | 2025-01-10 | P     │ ← NEW RECORD!
│ 5   | student-1  | jss2a-id  | chem-id    | 2025-01-10 | P     │ ← NEW RECORD!
└──────────────────────────────────────────────────────────────┘
                      ↑                        ↑
                   OLD CLASS              NEW CLASS

MARKS TABLE (OLD RECORDS REMAIN!):
┌──────────────────────────────────────────────────────────────┐
│ id  | student_id | class_id  | subject_id | exam_id | total │
├──────────────────────────────────────────────────────────────┤
│ 1   | student-1  | jss1a-id  | math-id    | exam-1  | 85    │ ← OLD RECORD
│ 2   | student-1  | jss1a-id  | eng-id     | exam-1  | 92    │ ← OLD RECORD
│ 3   | student-1  | jss2a-id  | physics-id | exam-5  | 78    │ ← NEW RECORD!
│ 4   | student-1  | jss2a-id  | chem-id    | exam-5  | 88    │ ← NEW RECORD!
└──────────────────────────────────────────────────────────────┘
                      ↑                        ↑
                   OLD CLASS              NEW CLASS
```

---

## 🔍 How Records Are Filtered (Current Implementation)

### Student Dashboard Overview

**Code in `/supabase/functions/server/index.tsx` (Line ~10180-10185):**

```typescript
// Get subjects for the student's class
if (student?.class_id) {
  const { count } = await supabase
    .from("subject_assignments")
    .select("id", { count: "exact" })
    .eq("class_id", student.class_id);  // ← FILTERS BY CURRENT CLASS!
  subjectsCount = count || 0;
}
```

**What This Means:**
- If John was in JSS1 A (old class), he saw Math, English subjects
- After promotion to JSS2 A (new class), he NOW sees Physics, Chemistry subjects
- ✅ **Correct behavior!**

### Student Attendance View

**Code in `/supabase/functions/server/index.tsx` (Line ~16080-16084):**

```typescript
// Apply filters
if (class_id) query = query.eq("class_id", class_id);
if (session) query = query.eq("session", session);
if (term) query = query.eq("term", term);
if (student_id) query = query.eq("student_id", student_id);
```

**Current Behavior:**
```
When student views "My Attendance":
- If filtered by CURRENT CLASS (JSS2 A) → Shows only NEW attendance
- If filtered by STUDENT ID only → Shows ALL attendance (old + new)
```

**Example Query:**
```sql
-- Show current class attendance (what student sees by default)
SELECT * FROM attendance 
WHERE student_id = 'student-1' 
  AND class_id = 'jss2a-id'          -- Current class
  AND session = '2025/2026';         -- Current session

-- Show ALL historical attendance (for transcripts/reports)
SELECT * FROM attendance 
WHERE student_id = 'student-1'       -- All classes, all sessions
ORDER BY date DESC;
```

### Student Marks/Results

**Same Pattern:**
```sql
-- Show current class results (default view)
SELECT * FROM marks 
WHERE student_id = 'student-1' 
  AND class_id = 'jss2a-id'          -- Current class only
  AND session = '2025/2026';

-- Show ALL historical results (for transcripts)
SELECT * FROM marks 
WHERE student_id = 'student-1'       -- All classes
ORDER BY exam_date DESC;
```

### Learning Materials (E-Notes, Assignments)

**Code in `/supabase/functions/server/index.tsx` (Line ~10242-10246):**

```typescript
const { data: recentUploads } = await supabase
  .from("uploads")
  .select("title, type, created_at, subjects(name)")
  .eq("class_id", student.class_id)   // ← FILTERS BY CURRENT CLASS!
  .eq("status", "approved")
  .order("created_at", { ascending: false })
  .limit(2);
```

**What This Means:**
- John was in JSS1 A → Saw "Math Notes Ch1", "English Essay"
- After promotion to JSS2 A → NOW sees "Physics Lab Manual", "Chemistry Notes"
- ✅ **Correct behavior!**

---

## 📊 Visual Data Flow

### Current Records vs Historical Records

```
┌────────────────────────────────────────────────────────────────┐
│                  STUDENT DASHBOARD VIEWS                        │
└────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📱 MY SUBJECTS (Current Class Only)                             │
├─────────────────────────────────────────────────────────────────┤
│ Query: WHERE class_id = current_class_id                       │
│                                                                  │
│ BEFORE PROMOTION (JSS1 A):                                      │
│ • Mathematics                                                    │
│ • English                                                        │
│ • Civic Education                                               │
│                                                                  │
│ AFTER PROMOTION (JSS2 A):                                       │
│ • Physics                                                        │
│ • Chemistry                                                      │
│ • Biology                                                        │
│ • Mathematics (different curriculum level!)                     │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📊 MY RESULTS (Current Session + Class)                         │
├─────────────────────────────────────────────────────────────────┤
│ Query: WHERE class_id = current AND session = current          │
│                                                                  │
│ Shows: Only exams for JSS2 A in 2025/2026 session              │
│ • 1st Term CA1 - Physics: 85%                                  │
│ • 1st Term CA2 - Chemistry: 78%                                │
│                                                                  │
│ OLD RESULTS (JSS1 A) are NOT shown here                        │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📅 MY ATTENDANCE (Current Session + Class)                      │
├─────────────────────────────────────────────────────────────────┤
│ Query: WHERE class_id = current AND session = current          │
│                                                                  │
│ Shows: Only attendance for JSS2 A in 2025/2026 session         │
│ • Jan 10, 2025 - Physics: Present                              │
│ • Jan 10, 2025 - Chemistry: Present                            │
│                                                                  │
│ OLD ATTENDANCE (JSS1 A) is NOT shown here                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 📚 LEARNING MATERIALS (Current Class Only)                      │
├─────────────────────────────────────────────────────────────────┤
│ Query: WHERE class_id = current_class_id                       │
│                                                                  │
│ Shows: Only materials for JSS2 A                                │
│ • Physics Lab Manual (Jan 8, 2025)                             │
│ • Chemistry Notes Ch1 (Jan 5, 2025)                            │
│                                                                  │
│ OLD MATERIALS (JSS1 A) are NOT shown here                      │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ 🎓 TRANSCRIPT/HISTORICAL VIEW (ALL Records!)                    │
├─────────────────────────────────────────────────────────────────┤
│ Query: WHERE student_id = X (no class_id filter!)              │
│                                                                  │
│ Shows: EVERYTHING from ALL classes and sessions                │
│                                                                  │
│ 📊 JSS1 A (2024/2025):                                         │
│ • Math: 85%, English: 92%, Civic: 78%                          │
│ • Attendance: 95%                                               │
│                                                                  │
│ 📊 JSS2 A (2025/2026):                                         │
│ • Physics: 88%, Chemistry: 82%, Biology: 90%                   │
│ • Attendance: 97%                                               │
│                                                                  │
│ ✅ Used for: Graduation certificates, transfer letters,         │
│    historical reports, cumulative GPA                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ✅ Summary: What Records Are Shown?

### Default Student Dashboard (Current View):

**Shows ONLY:**
- ✅ Subjects assigned to NEW class (JSS2 A)
- ✅ Attendance for NEW class in CURRENT session
- ✅ Marks/Results for NEW class in CURRENT session
- ✅ Learning materials uploaded for NEW class
- ✅ Exams scheduled for NEW class

**Does NOT Show:**
- ❌ Old subjects from JSS1 A
- ❌ Old attendance from JSS1 A
- ❌ Old results from JSS1 A
- ❌ Old learning materials from JSS1 A

### Historical/Transcript View (When Needed):

**Shows EVERYTHING:**
- ✅ All attendance records (all classes, all sessions)
- ✅ All marks (all classes, all sessions)
- ✅ All subjects ever taken
- ✅ Complete academic history

**Query Difference:**
```sql
-- CURRENT VIEW (default dashboard)
WHERE student_id = 'X' 
  AND class_id = 'current-class'      -- ← Filters to current class
  AND session = 'current-session'     -- ← Filters to current session

-- HISTORICAL VIEW (transcripts)
WHERE student_id = 'X'                -- ← No class/session filter!
ORDER BY date DESC
```

---

## 🎨 Promotion Banner Issue

### Current Code (`/components/PromotionBanner.tsx` Line 60-82):

```typescript
// Check for recent promotion (within last 4 weeks = 28 days)
const fourWeeksAgo = new Date();
fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);

const { data: promotion } = await supabase
  .from('promotions')
  .select(`
    *,
    from_class:classes!promotions_from_class_id_fkey(name),
    to_class:classes!promotions_to_class_id_fkey(name)
  `)
  .eq('student_id', userId)
  .gte('promoted_at', fourWeeksAgo.toISOString())
  .order('promoted_at', { ascending: false })
  .limit(1)
  .single();

if (promotion && !promotion.is_reverted) {
  setPromotionInfo({
    isPromoted: true,
    fromClass: promotion.from_class?.name || 'Previous Class',
    toClass: promotion.to_class?.name || 'Graduated',
    newSession: promotion.new_session,
    promotedAt: promotion.promoted_at,
    isGraduation: promotion.is_graduation
  });
}
```

### ✅ The Banner Logic Already Works!

**When student is promoted:**
1. Promotion record is created in `promotions` table
2. Banner checks if promotion happened in last 28 days
3. Banner shows: "🎉 Congratulations! You have been promoted to JSS2 A!"
4. User can dismiss banner
5. Banner reappears until 28 days pass

### Why Banner Might Not Show:

**Possible Issues:**
1. ❌ Promotion record has `is_reverted = true` (if promotion was reverted)
2. ❌ Promotion happened more than 28 days ago
3. ❌ User dismissed banner (saved in sessionStorage)
4. ❌ No promotion record exists for this student

---

## 🐛 Potential Issue: Is Reverted Check

### Problem:

After our recent fixes, when we allow multiple reverts, the query might pick up a REVERTED promotion instead of the ACTIVE one!

**Example:**
```
PROMOTIONS TABLE:
┌──────────────────────────────────────────────────────────────────┐
│ id  | student_id | from_class | to_class | is_reverted | promoted_at│
├──────────────────────────────────────────────────────────────────┤
│ 1   | student-1  | jss1a      | jss2a    | TRUE        | 2025-01-10│ ← REVERTED
│ 2   | student-1  | jss1a      | jss2a    | FALSE       | 2025-01-15│ ← ACTIVE!
└──────────────────────────────────────────────────────────────────┘
```

**Current Query:**
```typescript
.order('promoted_at', { ascending: false })  // Most recent first
.limit(1)                                    // Take first one
.single();

if (promotion && !promotion.is_reverted) {   // Check if not reverted
  // Show banner
}
```

**What Happens:**
- Takes most recent promotion (id=2, is_reverted=FALSE) ✅
- Checks `!promotion.is_reverted` → TRUE ✅
- Shows banner ✅

**This should work correctly!**

---

## 🔧 If Banner Still Doesn't Show - Debug Steps

### Step 1: Check if Promotion Record Exists

```sql
-- Check recent promotions for student
SELECT * FROM promotions 
WHERE student_id = 'your-student-id'
ORDER BY promoted_at DESC 
LIMIT 5;
```

**Expected:**
```
✅ Should see at least one record with is_reverted = false
✅ promoted_at should be within last 28 days
```

### Step 2: Check Browser Console

**Open F12 → Console → Look for:**
```
[PromotionBanner] Error: ...
```

### Step 3: Check Session Storage

**Open F12 → Application → Session Storage → Look for:**
```
banner_dismissed_student-id_student: "true"
```

**If found:**
- User dismissed the banner
- Clear session storage to see it again

### Step 4: Manually Test Query

```sql
-- What the banner is checking
SELECT 
    p.*,
    fc.name as from_class_name,
    tc.name as to_class_name
FROM promotions p
LEFT JOIN classes fc ON fc.id = p.from_class_id
LEFT JOIN classes tc ON tc.id = p.to_class_id
WHERE p.student_id = 'your-student-id'
  AND p.promoted_at >= (NOW() - INTERVAL '28 days')
  AND p.is_reverted = false
ORDER BY p.promoted_at DESC
LIMIT 1;
```

**Should return:**
```
✅ One promotion record
✅ is_reverted = false
✅ promoted_at within 28 days
✅ from_class_name and to_class_name have values
```

---

## 🎯 Final Answer to Your Questions

### Question 1: Why doesn't the banner show?

**Answer:** The banner code is already implemented and should work! 

**Check:**
1. Promotion record exists with `is_reverted = false`
2. Promoted within last 28 days
3. User hasn't dismissed banner (check sessionStorage)
4. No errors in console

### Question 2: What records will be displayed after promotion?

**Answer:** Only CURRENT class records by default!

**Student will see:**
- ✅ NEW subjects (for JSS2 A, not JSS1 A)
- ✅ NEW attendance (only JSS2 A in current session)
- ✅ NEW marks/results (only JSS2 A in current session)
- ✅ NEW learning materials (only JSS2 A materials)
- ❌ OLD records (JSS1 A) are NOT shown in default views

### Question 3: Do old records remain in database?

**Answer:** YES! 100% YES! ✅

**How:**
- Old records still have `class_id = jss1a-id` in database
- New records have `class_id = jss2a-id` in database
- Both exist together in same tables
- Filtered by `WHERE class_id = current_class` for default views
- Filtered by `WHERE student_id = X` (no class filter) for historical views

---

## 🚀 Architecture is PERFECT!

Your system is already designed correctly:

✅ **Student Profile:** Only stores CURRENT class_id
✅ **Historical Records:** All old records remain in database with their old class_id
✅ **Current View:** Filters by current class_id and session
✅ **Historical View:** Queries by student_id only (no class filter)
✅ **Transcripts:** Can access complete history across all classes
✅ **Promotion Tracking:** Promotions table tracks all movements

**This is EXACTLY how it should work!** 🎉

---

## 📋 What Needs to be Fixed (If Banner Not Showing)

**Option 1: Banner query needs to filter reverted promotions**

Add `.eq('is_reverted', false)` to the query:

```typescript
const { data: promotion } = await supabase
  .from('promotions')
  .select(`...`)
  .eq('student_id', userId)
  .eq('is_reverted', false)  // ← ADD THIS!
  .gte('promoted_at', fourWeeksAgo.toISOString())
  .order('promoted_at', { ascending: false })
  .limit(1)
  .single();
```

**Option 2: Check if student was ACTUALLY promoted**

Verify student's current class matches the promotion's to_class:

```typescript
// Get student's current class
const { data: profile } = await supabase
  .from('profiles')
  .select('class_id')
  .eq('id', userId)
  .single();

// Check if promotion's to_class matches current class
if (promotion && 
    !promotion.is_reverted && 
    promotion.to_class_id === profile.class_id) {
  // Show banner - student is actually in the new class!
}
```

**This ensures banner only shows if student is ACTUALLY in the promoted class (not reverted).**
