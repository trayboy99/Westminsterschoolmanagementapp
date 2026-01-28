# ⚡ Timetable Automation - Instant Start (3 Steps)

## 🎯 Get Your Timetable Working in 3 Minutes

### ✅ Step 1: Run SQL (1 minute)

**Go to:** Supabase SQL Editor

**Copy and paste this, then click RUN:**

```sql
-- File 1: /CREATE_TIMETABLE_TABLES.sql
-- (Paste entire contents of that file)
```

✅ **Expected:** "Timetable tables created successfully!"

**Then run:**

```sql
-- File 2: /TIMETABLE_QUICK_SETUP.sql
-- (Paste entire contents of that file)
```

✅ **Expected:** "Quick setup complete! Teachers: X, Subjects: Y"

---

### ✅ Step 2: Update UI (1 minute)

**File:** `/components/timetable/TimetableModule.tsx`

**Find line ~101-110 (the `if (showSettings)` section):**

**Add these imports at the top:**
```tsx
import { TimetableSettingsNew } from './TimetableSettingsNew';
import { TimetableEditorNew } from './TimetableEditorNew';
```

**Replace:**
```tsx
if (showSettings) {
  return (
    <div className={className}>
      <TimetableSettings
        onSave={handleSettingsSave}
        onCancel={() => setShowSettings(false)}
      />
    </div>
  );
}
```

**With:**
```tsx
if (showSettings) {
  return (
    <div className={className}>
      <TimetableSettingsNew
        onSave={(settings) => {
          setShowSettings(false);
        }}
        onCancel={() => setShowSettings(false)}
      />
    </div>
  );
}
```

**Find line ~112-122 (the `if (showEditor)` section):**

**Replace:**
```tsx
if (showEditor) {
  return (
    <div className={className}>
      <TimetableEditor
        timetable={timetable}
        onUpdateTimetable={handleTimetableUpdate}
        onClose={() => setShowEditor(false)}
      />
    </div>
  );
}
```

**With:**
```tsx
if (showEditor) {
  return (
    <div className={className}>
      <TimetableEditorNew
        onClose={() => setShowEditor(false)}
      />
    </div>
  );
}
```

**Save the file.**

---

### ✅ Step 3: Generate Timetable (1 minute)

1. **Login as Admin/Principal**
2. **Go to:** Timetable Management
3. **Click:** Settings button
4. **Fill in:**
   - Academic Year: Select current session
   - Term: Select current term
   - Keep default times (Mon-Thu: 8am-3pm, Fri: 8am-1pm)
   - Add one break: "Short Break", After period 3, 15 minutes, All days
   - Thursday: 8 academic + 2 co-curricular
   - Friday: Period 5 = "Note Check", Periods 6-7 = "Sports"
5. **Click:** Save Settings
6. **Click:** Generate tab (or back button)
7. **Click:** Generate Timetable button
8. **Wait:** 3-5 seconds
9. **See:** Preview showing timetables!
10. **Click:** Save Timetable

---

## 🎉 Done!

You now have:
- ✅ Automated timetable generation working
- ✅ Thursday: 8 academic + 2 co-curricular
- ✅ Friday: Note Check + Sports
- ✅ All teachers assigned subjects
- ✅ All classes have full subject coverage

---

## 🐛 If You Get Errors

### Error: "No teacher is qualified to teach [Subject]"

**Quick Fix:**
```sql
-- Run this in SQL Editor
UPDATE profiles
SET qualified_subjects = (
  SELECT ARRAY_AGG(id::text)
  FROM subjects
  WHERE level IS NOT NULL
)
WHERE role = 'teacher';
```

Then regenerate.

---

### Error: "No timetable settings configured"

**Fix:** Go back to Step 3, make sure you:
1. Selected Academic Year
2. Selected Term
3. Clicked "Save Settings"

---

### Error: "Class [Name] needs X more periods"

**Option 1 - Quick:** Reduce subject requirements
```sql
UPDATE class_subject_assignments
SET periods_per_week = 4
WHERE periods_per_week > 4;
```

**Option 2 - Better:** Check total isn't too high
```sql
-- Total should be ≤ 41 (8+8+8+10+7)
SELECT 
  c.name,
  SUM(csa.periods_per_week) as total
FROM classes c
JOIN class_subject_assignments csa ON c.id = csa.class_id
GROUP BY c.name
HAVING SUM(csa.periods_per_week) > 41;
```

If any class has >41, reduce some periods.

---

## 📊 Verify Setup

**Run this quick check:**
```sql
SELECT 
  'Teachers' as item,
  COUNT(*) as count
FROM profiles WHERE role = 'teacher'

UNION ALL

SELECT 
  'Subjects',
  COUNT(*)
FROM subjects WHERE level IS NOT NULL

UNION ALL

SELECT 
  'Classes',
  COUNT(*)
FROM classes

UNION ALL

SELECT 
  'Assignments',
  COUNT(*)
FROM class_subject_assignments;
```

**All counts should be > 0**

---

## 🎯 Add Part-Time Teacher (Optional)

After basic setup works, to add a part-time teacher:

```sql
-- Replace 'teacher@email.com' with actual email
UPDATE profiles
SET 
  is_part_time = true,
  max_periods_per_week = 6,
  max_periods_per_day = 2,
  availability = '{
    "mon": [6, 7],
    "wed": [6, 7],
    "fri": [6, 7]
  }'::jsonb
WHERE role = 'teacher'
  AND email = 'teacher@email.com';
```

Then regenerate timetable - they'll be scheduled first!

---

## 📝 What Just Happened?

1. **Database tables created** for timetable settings and slots
2. **Teachers configured** with full availability (all can teach all subjects)
3. **Subjects configured** with period requirements (Math=6, Science=5, etc.)
4. **Classes linked to subjects** based on level (junior/senior) and department
5. **UI updated** to use new timetable components
6. **Timetable generated** automatically with conflict detection

---

## 🚀 Full Documentation

For complete details, see:
- `/TIMETABLE_AUTOMATION_COMPLETE_GUIDE.md` - Full guide
- `/TIMETABLE_IMPLEMENTATION_SUMMARY.md` - Technical details
- `/TEST_TIMETABLE_NOW.md` - Detailed testing

---

## ✅ Success Checklist

- [x] SQL tables created
- [x] Sample data loaded
- [x] UI components integrated
- [x] Settings configured
- [x] Timetable generated
- [x] Timetable saved

**You're done! 🎊**

The system will now automatically generate conflict-free timetables respecting:
- Thursday: 8 academic + 2 co-curricular
- Friday: 4 academic + Note Check + 2 Sports
- Part-time teacher availability (when you add them)
- Teacher qualifications
- Subject requirements
- No double-booking

Enjoy your automated timetable system! 🎓✨
