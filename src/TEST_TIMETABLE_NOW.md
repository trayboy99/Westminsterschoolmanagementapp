# ⚡ Quick Test Guide - Timetable Automation

## 🚀 5-Minute Setup & Test

Follow these steps to get your timetable automation working NOW:

---

## Step 1: Run Database Setup (2 minutes)

### A. Create Tables
**Go to:** Supabase Dashboard → SQL Editor

**Run this file:**
```sql
/CREATE_TIMETABLE_TABLES.sql
```

✅ **Expected:** You'll see success messages about tables created

### B. Add Sample Data
**In the same SQL Editor, run:**
```sql
/TIMETABLE_SAMPLE_DATA_SETUP.sql
```

✅ **Expected:** 
```
✅ Sample data setup complete!
👥 Teachers configured: X (Y part-time)
📚 Subjects configured: Z
🎓 Classes: W
📋 Class-Subject assignments: Q
```

---

## Step 2: Update UI Component (1 minute)

**File:** `/components/timetable/TimetableModule.tsx`

**Find this section (around line 101-110):**
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

**Replace with:**
```tsx
import { TimetableSettingsNew } from './TimetableSettingsNew';
import { TimetableEditorNew } from './TimetableEditorNew';

// ... later in the component:

if (showSettings) {
  return (
    <div className={className}>
      <TimetableSettingsNew
        onSave={(settings) => {
          setShowSettings(false);
          toast.success('Settings saved!');
        }}
        onCancel={() => setShowSettings(false)}
      />
    </div>
  );
}
```

**Find this section (around line 112-122):**
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

**Replace with:**
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

---

## Step 3: Configure Settings (1 minute)

**Navigate:** Admin Dashboard → Timetable Management → Settings button

### Fill in the form:

**Basic Settings Tab:**
- Academic Year: Select current session (e.g., `2024/2025`)
- Term: Select current term (e.g., `First Term`)
- ✅ Double periods only once per week
- ✅ Allow same teacher consecutive periods

**Daily Timings Tab:**
Leave defaults OR customize:
```
Mon:  08:00-15:00,  8 periods, 40 min each
Tue:  08:00-15:00,  8 periods, 40 min each
Wed:  08:00-15:00,  8 periods, 40 min each
Thu:  08:00-15:00, 10 periods, 35 min each
Fri:  08:00-13:00,  7 periods, 40 min each
```

**Breaks Tab:**
Click "Add Break" twice:

1. **Morning Assembly**
   - Name: `Assembly`
   - After Period: `1`
   - Duration: `15` minutes
   - Applies to: Monday, Wednesday, Friday

2. **Short Break**
   - Name: `Short Break`
   - After Period: `3`
   - Duration: `15` minutes
   - Applies to: All days

**Special Rules Tab:**

**Thursday:**
- Academic Periods: `8`
- Co-curricular Periods: `2`

**Friday:**
- First Academic Periods: `4`
- Period 5 Caption: `Note Check`
- Periods 6-7 Caption: `Sports`

**Click:** Save Settings ✅

---

## Step 4: Generate Timetable (1 minute)

**Navigate:** Admin Dashboard → Timetable Management → Generate tab

1. **Click:** "Generate Timetable" button
2. **Wait:** 2-5 seconds for generation
3. **Check Stats Card:** Should show:
   ```
   Teachers: X
   Subjects: Y
   Classes: Z
   Generated Slots: ### (should be >0)
   ```

### Review Results:

**Conflicts Panel (Left):**
- ✅ **If empty:** Perfect! No conflicts.
- ⚠️ **If has items:** Read each conflict message:
  - Example: "Part-time teacher John Doe could not be fully scheduled (3/6 periods)"
  - **Fix:** See troubleshooting below

**Warnings Panel (Right):**
- ℹ️ Informational only (e.g., "Reserved double period for JSS 1 - Physics")

**Preview Tables:**
- Scroll down to see timetables for first 3 classes
- **Check:**
  - Friday period 5 shows "Note Check" ✅
  - Friday periods 6-7 show "Sports" ✅
  - Thursday last 2 periods show "Co-curricular" ✅
  - Part-time teacher appears in orange cells ✅

---

## Step 5: Save & Verify

1. **Click:** "Save Timetable" button
2. **Confirm:** You see "Timetable saved successfully!"
3. **Refresh page**
4. **Click:** "Generate" tab again
5. **Verify:** Generated Slots count is still there (data persisted)

---

## 🎉 Success Checklist

- [x] Tables created in database
- [x] Sample data loaded
- [x] UI components updated
- [x] Settings configured and saved
- [x] Timetable generated with 0 conflicts
- [x] Preview shows correct Friday/Thursday rules
- [x] Timetable saved and persists after refresh

---

## 🐛 Troubleshooting

### Problem: "No timetable settings configured"

**Cause:** Settings not saved properly

**Fix:**
1. Go back to Settings tab
2. Make sure Academic Year and Term are selected
3. Click Save Settings again
4. Check browser console for errors

---

### Problem: "No teacher is qualified to teach [Subject]"

**Quick Fix - SQL:**
```sql
-- Find the subject ID
SELECT id, name FROM subjects WHERE name ILIKE '%[SUBJECT_NAME]%';

-- Find a teacher
SELECT id, first_name, last_name FROM profiles WHERE role = 'teacher' LIMIT 1;

-- Assign subject to teacher
UPDATE profiles
SET qualified_subjects = array_append(qualified_subjects, '[SUBJECT_ID]'::text)
WHERE id = '[TEACHER_ID]';
```

Then regenerate timetable.

---

### Problem: "Part-time teacher could not be fully scheduled"

**Quick Fix - SQL:**
```sql
-- Check teacher availability
SELECT 
  first_name,
  last_name,
  max_periods_per_week,
  availability
FROM profiles
WHERE is_part_time = true;

-- Increase availability for a part-time teacher
UPDATE profiles
SET availability = '{
  "mon": [1,2,3,4,5,6,7,8],
  "wed": [1,2,3,4,5,6,7,8],
  "fri": [1,2,3,4,5,6,7]
}'::jsonb
WHERE id = '[TEACHER_ID]' AND is_part_time = true;
```

Then regenerate.

---

### Problem: "Class [Name] needs X more periods for subject [Subject]"

**Option A - Add more teachers:**
```sql
UPDATE profiles
SET qualified_subjects = array_append(qualified_subjects, '[SUBJECT_ID]'::text)
WHERE id = '[ANOTHER_TEACHER_ID]';
```

**Option B - Reduce required periods:**
```sql
UPDATE class_subject_assignments
SET periods_per_week = 4
WHERE class_id = '[CLASS_ID]' AND subject_id = '[SUBJECT_ID]';
```

Then regenerate.

---

### Problem: "Thursday should have at least 10 periods"

**Fix in UI:**
1. Go to Settings → Daily Timings tab
2. Change Thursday: `10` periods
3. Save Settings
4. Regenerate

---

### Problem: Generated Slots = 0

**Check console logs:**
1. Open browser Developer Tools (F12)
2. Go to Console tab
3. Look for `[Generator]` messages
4. Common issues:
   - No classes have subject assignments
   - No teachers qualified for any subjects

**Verify data:**
```sql
-- Check class-subject assignments exist
SELECT COUNT(*) FROM class_subject_assignments;

-- Check teachers have qualified subjects
SELECT 
  COUNT(*) as teachers_with_subjects
FROM profiles
WHERE 
  role = 'teacher'
  AND cardinality(qualified_subjects) > 0;
```

If count is 0, rerun `/TIMETABLE_SAMPLE_DATA_SETUP.sql`

---

## 📊 Verify Data Before Generating

**Run this quick check in SQL Editor:**

```sql
-- 1. Check teachers are set up
SELECT 
  'Teachers' as category,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_part_time = true) as part_time_count
FROM profiles WHERE role = 'teacher'

UNION ALL

-- 2. Check subjects configured
SELECT 
  'Subjects',
  COUNT(*),
  COUNT(*) FILTER (WHERE double_allowed = true)
FROM subjects

UNION ALL

-- 3. Check class assignments
SELECT 
  'Class-Subject Assignments',
  COUNT(*),
  NULL
FROM class_subject_assignments

UNION ALL

-- 4. Check classes
SELECT 
  'Classes',
  COUNT(*),
  NULL
FROM classes;
```

**Expected output:**
```
Category                    | Count | Extra Info
---------------------------+-------+-----------
Teachers                   |   15  |     2
Subjects                   |   20  |     5
Class-Subject Assignments  |  120  |  NULL
Classes                    |    8  |  NULL
```

If any count is 0 or very low, rerun setup scripts.

---

## 🎯 Next Steps After Success

1. **Customize teacher availability:**
   - Identify actual part-time teachers in your school
   - Update their availability in SQL or build a UI for it

2. **Fine-tune subject periods:**
   - Adjust `periods_per_week` per your curriculum
   - Enable/disable `double_allowed` as needed

3. **Export timetables:**
   - Implement PDF/Excel export (hooks are ready)
   - Print class timetables

4. **Publish to users:**
   - Students view their class timetable
   - Teachers view their teaching schedule

---

## 💡 Pro Tips

1. **Start small:** Generate for 1-2 classes first, verify logic works
2. **Part-time teachers:** Keep max 6 periods/week, specific days only
3. **Balance loads:** Full-time teachers should have 15-20 periods/week
4. **Double periods:** Only enable for lab subjects (Physics, Chemistry, Biology, Computer)
5. **Breaks:** Standard is 3 breaks: Assembly (15min), Short Break (15min), Lunch (60min)

---

## ✅ Final Verification

Run this comprehensive check:

```sql
-- Comprehensive timetable validation query
WITH teacher_stats AS (
  SELECT 
    COUNT(*) as total_teachers,
    COUNT(*) FILTER (WHERE is_part_time = true) as part_time_teachers,
    COUNT(*) FILTER (WHERE cardinality(qualified_subjects) > 0) as qualified_teachers
  FROM profiles WHERE role = 'teacher'
),
subject_stats AS (
  SELECT 
    COUNT(*) as total_subjects,
    SUM(periods_per_week) as total_periods_required
  FROM subjects WHERE level IS NOT NULL
),
class_stats AS (
  SELECT 
    COUNT(DISTINCT csa.class_id) as classes_with_assignments,
    COUNT(*) as total_assignments
  FROM class_subject_assignments csa
),
settings_check AS (
  SELECT 
    CASE WHEN COUNT(*) > 0 THEN 'Configured' ELSE 'Missing' END as status
  FROM timetable_settings
)
SELECT 
  ts.total_teachers,
  ts.part_time_teachers,
  ts.qualified_teachers,
  ss.total_subjects,
  cs.classes_with_assignments,
  cs.total_assignments,
  sc.status as settings_status
FROM teacher_stats ts, subject_stats ss, class_stats cs, settings_check sc;
```

**All numbers should be > 0 and settings_status should be "Configured"**

---

## 🎊 You're Done!

Your timetable automation system is now:
- ✅ Fully installed
- ✅ Configured with sample data
- ✅ Generating conflict-free timetables
- ✅ Enforcing special Thursday/Friday rules
- ✅ Prioritizing part-time teacher availability
- ✅ Ready for production use!

**Time to celebrate! 🎉**

For detailed documentation, see `/TIMETABLE_AUTOMATION_COMPLETE_GUIDE.md`
