# TEST AUTOMATED TIMETABLE GENERATION - Step-by-Step Guide

## 🎯 Overview
Your automated timetable generation system is now ready to test! The database tables have been created successfully. This guide will walk you through testing the complete system.

## ✅ Prerequisites Confirmed
- ✓ Database tables created (`timetable_settings`, `class_subject_assignments`, `timetable`)
- ✓ 4 backend API endpoints implemented
- ✓ TypeScript types defined (`/types/timetable.ts`)
- ✓ Intelligent scheduling algorithm (`/lib/timetable/generator.ts`)
- ✓ Settings UI component (`TimetableSettingsNew.tsx`)
- ✓ Generation UI component (`TimetableEditorNew.tsx`)
- ✓ TimetableModule updated to use new components

---

## 📋 STEP 1: Prepare Sample Data

Before testing the automation, you need to set up the basic data. Run these queries in **Supabase SQL Editor**:

### 1.1 Check Current Data
```sql
-- Check existing subjects
SELECT id, name, code, level, type, periods_per_week FROM subjects ORDER BY name;

-- Check existing classes
SELECT id, name, level FROM classes ORDER BY name;

-- Check existing teachers with subject assignments
SELECT 
  p.id,
  p.first_name,
  p.last_name,
  p.email,
  (SELECT COUNT(*) FROM teacher_subject_assignments tsa WHERE tsa.teacher_id = p.id) as subject_count
FROM profiles p
WHERE p.role = 'teacher'
ORDER BY p.last_name;
```

### 1.2 Add Sample Part-Time Teacher (if needed)
```sql
-- Check if you have any part-time teachers
SELECT 
  id,
  first_name,
  last_name,
  email,
  is_part_time
FROM profiles
WHERE role = 'teacher';

-- If no part-time teachers exist, add this column and update one teacher
-- (Skip if column already exists)
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS is_part_time BOOLEAN DEFAULT false;

-- Mark one teacher as part-time for testing
UPDATE profiles
SET is_part_time = true
WHERE role = 'teacher'
LIMIT 1;
```

### 1.3 Add Teacher Availability and Constraints
```sql
-- Add columns for teacher constraints if they don't exist
ALTER TABLE profiles 
ADD COLUMN IF NOT EXISTS availability JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS max_periods_per_week INTEGER DEFAULT 20,
ADD COLUMN IF NOT EXISTS max_periods_per_day INTEGER DEFAULT 6;

-- Set availability for part-time teacher
-- Example: Available Monday periods 1,2,3 and Wednesday periods 5,6
UPDATE profiles
SET availability = '{
  "mon": [1, 2, 3],
  "wed": [5, 6]
}'::jsonb,
max_periods_per_week = 5
WHERE role = 'teacher' AND is_part_time = true
LIMIT 1;
```

### 1.4 Ensure Subjects Have Required Fields
```sql
-- Add columns if they don't exist
ALTER TABLE subjects
ADD COLUMN IF NOT EXISTS double_allowed BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS double_max_per_week INTEGER DEFAULT 1;

-- Update some subjects to allow double periods
UPDATE subjects
SET 
  double_allowed = true,
  double_max_per_week = 1
WHERE name IN ('Science', 'Physics', 'Chemistry', 'Biology', 'Computer Science')
AND double_allowed IS NOT true;
```

---

## 📋 STEP 2: Configure Timetable Settings

1. **Login as Admin** in your SMS

2. **Navigate to Timetable Module**
   - From Principal Dashboard, click "Timetable" in sidebar

3. **Open Settings**
   - Click the "Settings" button in the header
   - This opens `TimetableSettingsNew` component

4. **Configure Basic Settings**:

   **Academic Year & Term**:
   - Select current session (e.g., "2024/2025")
   - Select current term (e.g., "First Term")

   **Daily Schedule**:
   - **Monday-Wednesday**: 
     - Open: 08:00, Close: 15:00
     - Periods: 8
     - Duration: 40 minutes
   
   - **Thursday** (Special: 8 academic + 2 co-curricular):
     - Open: 08:00, Close: 15:00
     - Periods: 10
     - Duration: 35 minutes
   
   - **Friday** (Special: 4 academic + note check + 2 sports):
     - Open: 08:00, Close: 13:00
     - Periods: 7
     - Duration: 40 minutes

5. **Add Breaks**:
   - Click "Add Break"
   - **Morning Break**: After period 3, 15 minutes, All days
   - **Lunch Break**: After period 6, 30 minutes, Mon-Thu

6. **Configure Special Rules**:
   - Thursday Academic Periods: **8**
   - Thursday Co-curricular Periods: **2**
   - Friday First Academic Periods: **4**
   - Friday Period 5 Caption: **"Note Check"**
   - Friday Periods 6-7 Caption: **"Sports"**

7. **Other Settings**:
   - ☑ Allow back-to-back same teacher
   - ☑ Double periods appear once per week

8. **Save Settings**
   - Click "Save Settings"
   - Should see: ✅ "Timetable settings saved successfully!"

---

## 📋 STEP 3: Set Up Class-Subject Assignments

The timetable generator needs to know which subjects each class takes and how many periods per week.

### 3.1 Add Sample Assignments via SQL

```sql
-- Example: Assign subjects to JSS 1 class
-- Replace 'your-class-id' with actual class ID from your classes table
-- Replace 'your-subject-id' with actual subject IDs

-- Get your class and subject IDs first
SELECT id, name FROM classes WHERE name LIKE '%JSS%' OR name LIKE '%1%' ORDER BY name LIMIT 1;
SELECT id, name FROM subjects ORDER BY name LIMIT 10;

-- Insert assignments (adjust IDs based on your data)
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
VALUES
  ('your-class-id', 'mathematics-subject-id', 5),
  ('your-class-id', 'english-subject-id', 4),
  ('your-class-id', 'science-subject-id', 4),
  ('your-class-id', 'social-studies-subject-id', 3),
  ('your-class-id', 'civic-education-subject-id', 2),
  ('your-class-id', 'home-economics-subject-id', 2),
  ('your-class-id', 'agricultural-science-subject-id', 2),
  ('your-class-id', 'business-studies-subject-id', 2)
ON CONFLICT (class_id, subject_id) DO UPDATE 
SET periods_per_week = EXCLUDED.periods_per_week;
```

### 3.2 Verify Assignments
```sql
SELECT 
  c.name as class_name,
  s.name as subject_name,
  csa.periods_per_week
FROM class_subject_assignments csa
JOIN classes c ON c.id = csa.class_id
JOIN subjects s ON s.id = csa.subject_id
ORDER BY c.name, s.name;
```

---

## 📋 STEP 4: Generate Timetable

1. **Navigate to Generate Tab**
   - In Timetable Module, click "Edit" button
   - This opens `TimetableEditorNew` component

2. **Review Loaded Data**
   - Should see:
     - Number of teachers loaded
     - Number of subjects loaded
     - Number of classes loaded
     - Settings status

3. **Check Validation**
   - The system will automatically validate:
     - ✓ Thursday has 10 periods (8 academic + 2 co-curricular)
     - ✓ Friday has 7 periods (4 academic + note check + 2 sports)
     - ✓ Each class has enough weekly periods
     - ✓ Teachers qualified for assigned subjects
     - ✓ Part-time teachers have sufficient availability

4. **Generate Timetable**
   - Click "Generate Timetable" button
   - Watch the generation process:
     - Phase 1: Pre-slotting part-time teachers (PRIORITY)
     - Phase 2: Reserving double periods
     - Phase 3: Filling remaining subjects per class
     - Phase 4: Adding special captions (breaks, note check, sports, co-curricular)

5. **Review Results**:
   
   **Success Indicators**:
   - ✅ Green alert: "Timetable generated successfully!"
   - 📊 Shows number of slots created
   - ⚠️ Shows any warnings
   - ❌ Shows any conflicts (if any)

   **View Generated Slots**:
   - Slots grouped by class
   - Each slot shows: Day, Period, Subject, Teacher, Time
   - Special periods (breaks, sports, note check, co-curricular) highlighted

6. **Save Timetable**
   - Review the generated timetable
   - Click "Save Timetable" button
   - Should see: ✅ "Timetable saved successfully!"

---

## 📋 STEP 5: Verify Generated Timetable

### 5.1 Check Database
```sql
-- View saved timetable settings
SELECT 
  id,
  config->>'academicYear' as academic_year,
  config->>'term' as term,
  created_at
FROM timetable_settings
ORDER BY created_at DESC
LIMIT 1;

-- View saved timetable slots
SELECT 
  id,
  academic_year,
  term,
  jsonb_array_length(slots) as total_slots,
  created_at
FROM timetable
ORDER BY created_at DESC
LIMIT 1;

-- View actual slot details
SELECT 
  slot->>'classId' as class_id,
  slot->>'day' as day,
  slot->>'period' as period,
  slot->>'subjectId' as subject_id,
  slot->>'teacherId' as teacher_id,
  slot->>'caption' as caption,
  slot->>'startTime' as start_time,
  slot->>'endTime' as end_time
FROM timetable, 
     jsonb_array_elements(slots) as slot
WHERE id = (SELECT id FROM timetable ORDER BY created_at DESC LIMIT 1)
ORDER BY 
  slot->>'classId',
  slot->>'day',
  (slot->>'period')::int
LIMIT 50;
```

### 5.2 Verify Part-Time Teacher Priority
```sql
-- Check if part-time teachers were scheduled in their available slots
SELECT 
  p.first_name,
  p.last_name,
  p.is_part_time,
  p.availability,
  COUNT(*) as periods_assigned
FROM timetable t,
     jsonb_array_elements(t.slots) as slot
JOIN profiles p ON p.id = (slot->>'teacherId')::uuid
WHERE t.id = (SELECT id FROM timetable ORDER BY created_at DESC LIMIT 1)
  AND slot->>'reservedForPartTime' = 'true'
GROUP BY p.id, p.first_name, p.last_name, p.is_part_time, p.availability;
```

### 5.3 Verify Thursday/Friday Special Rules
```sql
-- Check Thursday's last 2 periods are co-curricular
SELECT 
  slot->>'day' as day,
  slot->>'period' as period,
  slot->>'caption' as caption,
  slot->>'isCoCurricular' as is_cocurricular
FROM timetable,
     jsonb_array_elements(slots) as slot
WHERE id = (SELECT id FROM timetable ORDER BY created_at DESC LIMIT 1)
  AND slot->>'day' = 'thu'
  AND (slot->>'period')::int > 8
ORDER BY (slot->>'period')::int;

-- Check Friday period 5 = Note Check, 6-7 = Sports
SELECT 
  slot->>'day' as day,
  slot->>'period' as period,
  slot->>'caption' as caption
FROM timetable,
     jsonb_array_elements(slots) as slot
WHERE id = (SELECT id FROM timetable ORDER BY created_at DESC LIMIT 1)
  AND slot->>'day' = 'fri'
  AND (slot->>'period')::int >= 5
ORDER BY (slot->>'period')::int;
```

### 5.4 Check for Conflicts
```sql
-- Check for teacher conflicts (same teacher, same time)
WITH teacher_schedule AS (
  SELECT 
    slot->>'teacherId' as teacher_id,
    slot->>'day' as day,
    slot->>'period' as period,
    COUNT(*) as count
  FROM timetable,
       jsonb_array_elements(slots) as slot
  WHERE id = (SELECT id FROM timetable ORDER BY created_at DESC LIMIT 1)
    AND slot->>'teacherId' IS NOT NULL
  GROUP BY 
    slot->>'teacherId',
    slot->>'day',
    slot->>'period'
)
SELECT 
  p.first_name,
  p.last_name,
  ts.day,
  ts.period,
  ts.count
FROM teacher_schedule ts
JOIN profiles p ON p.id = ts.teacher_id::uuid
WHERE ts.count > 1;

-- Should return 0 rows (no conflicts)
```

---

## 📋 STEP 6: View in UI

1. **Return to Main View**
   - Close the editor
   - Navigate to "View Timetables" tab

2. **Check Display**
   - Should see timetable grid with all generated slots
   - Filter by class to see individual class timetables
   - Check that:
     - Monday-Wednesday show 8 periods + breaks
     - Thursday shows 10 periods (8 academic + 2 co-curricular)
     - Friday shows 7 periods (4 academic + Note Check + 2 Sports)

3. **Teacher View**
   - Navigate to "Teacher View" tab
   - Select a teacher
   - See their complete weekly schedule
   - Verify part-time teachers only show their assigned periods

4. **Student View**
   - Navigate to "Student View" tab
   - Select a class
   - See the class's complete weekly timetable

---

## 🐛 Troubleshooting

### Issue: "No settings found"
**Solution**: Go back to Step 2 and configure settings first.

### Issue: "No teachers qualified for subject X"
**Solution**: Check `teacher_subject_assignments` table:
```sql
-- View teacher qualifications
SELECT 
  p.first_name,
  p.last_name,
  s.name as subject_name
FROM teacher_subject_assignments tsa
JOIN profiles p ON p.id = tsa.teacher_id
JOIN subjects s ON s.id = tsa.subject_id
ORDER BY p.last_name, s.name;

-- Add qualifications if missing
INSERT INTO teacher_subject_assignments (teacher_id, subject_id)
VALUES ('teacher-uuid', 'subject-uuid');
```

### Issue: "Part-time teacher couldn't be fully scheduled"
**Solution**: 
1. Check their availability in `profiles.availability`
2. Increase available slots or reduce `max_periods_per_week`
```sql
UPDATE profiles
SET availability = '{
  "mon": [1, 2, 3, 4],
  "tue": [1, 2],
  "wed": [5, 6, 7]
}'::jsonb,
max_periods_per_week = 7
WHERE id = 'part-time-teacher-uuid';
```

### Issue: "Class needs X more periods for subject Y"
**Solution**:
1. Add more qualified teachers for that subject
2. Reduce periods per week in `class_subject_assignments`
3. Increase total periods in day configuration

### Issue: Empty timetable generated
**Solution**:
1. Verify class-subject assignments exist:
```sql
SELECT COUNT(*) FROM class_subject_assignments;
```
2. Verify teachers have subject assignments:
```sql
SELECT COUNT(*) FROM teacher_subject_assignments;
```
3. Check console logs in browser DevTools for detailed error messages

---

## ✅ Expected Results

After successful generation, you should have:

1. **✓ Timetable Settings Saved**
   - Stored in `timetable_settings` table
   - Academic year, term, day configs, breaks, special rules

2. **✓ Timetable Generated**
   - Stored in `timetable` table
   - All classes have complete schedules
   - Part-time teachers scheduled in their available slots FIRST
   - Thursday: 8 academic + 2 co-curricular periods
   - Friday: 4 academic + note check + 2 sports periods
   - No teacher conflicts (same teacher, same time)
   - Double periods (if configured) appear once per week

3. **✓ Visible in UI**
   - Admin can view all timetables
   - Teachers can see their teaching schedule
   - Students can see their class timetable
   - Export to PDF/Excel works

---

## 🎉 Success Criteria

Your timetable automation is working correctly if:

- [x] Settings can be configured and saved
- [x] Timetable generation completes without errors
- [x] Part-time teachers are scheduled FIRST in their available slots
- [x] Thursday follows 8+2 rule (8 academic, 2 co-curricular)
- [x] Friday follows 4+1+2 rule (4 academic, note check, 2 sports)
- [x] No teacher is in two places at once (no conflicts)
- [x] All classes have their required subjects scheduled
- [x] Double periods (if configured) appear only once per week
- [x] Generated timetable saves to database
- [x] Timetable displays correctly in UI for all user roles

---

## 📝 Next Steps After Testing

Once the basic system works:

1. **Add More Features**:
   - Manual slot editing
   - Drag-and-drop timetable adjustments
   - Room assignments
   - Batch generation for multiple classes
   - Timetable templates

2. **Export Functionality**:
   - PDF export with school branding
   - Excel export for printing
   - Email timetables to teachers/students

3. **Notifications**:
   - Notify teachers when timetable is published
   - Send weekly reminders
   - Alert on timetable changes

4. **Mobile View**:
   - Responsive timetable grid
   - Today's schedule widget
   - Next period notification

---

## 📞 Need Help?

If you encounter any issues:

1. Check browser console (F12) for detailed error messages
2. Check the queries above to verify data structure
3. Review the `/TIMETABLE_AUTOMATION_COMPLETE_GUIDE.md` for technical details
4. Check the generator algorithm in `/lib/timetable/generator.ts`

---

**Good luck with testing! 🚀**
