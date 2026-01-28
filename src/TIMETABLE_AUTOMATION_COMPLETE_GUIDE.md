# 🎓 Timetable Automation System - Complete Implementation Guide

## 📋 Overview

This timetable automation system generates conflict-free school timetables with:
- ✅ **Part-time teacher priority scheduling** (scheduled first based on availability)
- ✅ **Thursday special rules** (8 academic + 2 co-curricular periods)
- ✅ **Friday special rules** (4 academic + note check + 2 sports)
- ✅ **Double period support** (max once per week)
- ✅ **Break management** (assembly, short breaks, lunch)
- ✅ **Conflict detection & resolution**
- ✅ **Automatic slot assignment** with teacher load balancing

---

## 🚀 Step 1: Run Database Migrations

### 1.1 Create Tables
Go to your **Supabase SQL Editor** and run:

```sql
/CREATE_TIMETABLE_TABLES.sql
```

This creates:
- `timetable_settings` - stores configuration
- `timetable` - stores generated slots
- `class_subject_assignments` - defines which subjects each class needs
- Updates to `profiles` table (teacher availability)
- Updates to `subjects` table (periods per week, double allowed)

**Expected output:**
```
✅ Timetable tables created successfully!
📋 Created tables: timetable_settings, timetable, class_subject_assignments
👥 Updated profiles table with teacher availability fields
📚 Updated subjects table with period configuration
🔒 Applied Row Level Security policies
```

---

## 🏗️ Step 2: File Structure Overview

### New Files Created:

```
📦 Your Project
├── /types/timetable.ts                           ← Type definitions
├── /lib/timetable/generator.ts                   ← Scheduling algorithm
├── /components/timetable/
│   ├── TimetableSettingsNew.tsx                  ← Configuration UI
│   └── TimetableEditorNew.tsx                    ← Generation & preview UI
└── /supabase/functions/server/index.tsx          ← Backend endpoints added
```

### Backend Endpoints Added:

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/timetable-settings` | GET | Fetch current settings |
| `/timetable-settings` | POST | Save configuration |
| `/class-subject-assignments` | GET | Get class-subject mappings |
| `/timetable` | GET | Fetch generated timetable |
| `/timetable` | POST | Save generated timetable |

---

## ⚙️ Step 3: Configure Teacher Data

### 3.1 Set Teacher Qualifications
Teachers need to have their qualified subjects specified. Run this SQL:

```sql
-- Example: Set qualified subjects for teachers
UPDATE profiles
SET qualified_subjects = ARRAY['math_id', 'physics_id', 'chemistry_id']
WHERE id = 'teacher_id_1' AND role = 'teacher';

-- For a part-time teacher
UPDATE profiles
SET 
  is_part_time = true,
  max_periods_per_week = 6,
  max_periods_per_day = 2,
  availability = '{
    "mon": [1,2,3,6,7],
    "wed": [1,2,3,6,7],
    "fri": [1,2,3]
  }'::jsonb,
  qualified_subjects = ARRAY['pe_subject_id', 'sports_subject_id']
WHERE id = 'part_time_teacher_id' AND role = 'teacher';
```

**Availability JSON Format:**
```json
{
  "mon": [1, 2, 3, 6, 7],    // Available periods 1-3 and 6-7 on Monday
  "tue": [],                  // Not available on Tuesday
  "wed": [1, 2, 3, 6, 7],    // Available periods on Wednesday
  "thu": [1, 2, 3],          // Available periods 1-3 on Thursday
  "fri": [1, 2]              // Available periods 1-2 on Friday
}
```

### 3.2 Bulk Update All Teachers

```sql
-- Set default availability for all full-time teachers (available all periods)
UPDATE profiles
SET 
  is_part_time = false,
  max_periods_per_week = 20,
  max_periods_per_day = 6,
  availability = '{
    "mon": [1,2,3,4,5,6,7,8],
    "tue": [1,2,3,4,5,6,7,8],
    "wed": [1,2,3,4,5,6,7,8],
    "thu": [1,2,3,4,5,6,7,8,9,10],
    "fri": [1,2,3,4,5,6,7]
  }'::jsonb
WHERE role = 'teacher' AND (is_part_time IS NULL OR is_part_time = false);
```

---

## 📚 Step 4: Configure Subjects

### 4.1 Set Subject Properties

```sql
-- Update subjects with period requirements
UPDATE subjects
SET 
  periods_per_week = 6,
  double_allowed = false
WHERE name IN ('Mathematics', 'English');

UPDATE subjects
SET 
  periods_per_week = 5,
  double_allowed = true,
  double_max_per_week = 1
WHERE name IN ('Physics', 'Chemistry', 'Biology');

UPDATE subjects
SET 
  periods_per_week = 4
WHERE name IN ('History', 'Geography', 'Civic Education');

UPDATE subjects
SET 
  periods_per_week = 2,
  double_allowed = true
WHERE name IN ('Physical Education', 'Sports');
```

### 4.2 Assign Subjects to Teachers

```sql
-- Link subjects to qualified teachers
-- First, get subject IDs
SELECT id, name FROM subjects ORDER BY name;

-- Then update teacher's qualified_subjects array
UPDATE profiles
SET qualified_subjects = ARRAY[
  'subject_id_1',
  'subject_id_2',
  'subject_id_3'
]
WHERE id = 'teacher_id' AND role = 'teacher';
```

---

## 🎯 Step 5: Set Up Class-Subject Assignments

### 5.1 Manual Assignment (Recommended)
For each class, specify which subjects and how many periods:

```sql
-- Example: JSS 1 A assignments
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
VALUES
  ('jss1a_class_id', 'math_subject_id', 6),
  ('jss1a_class_id', 'english_subject_id', 6),
  ('jss1a_class_id', 'science_subject_id', 5),
  ('jss1a_class_id', 'history_subject_id', 3),
  ('jss1a_class_id', 'geography_subject_id', 3),
  ('jss1a_class_id', 'pe_subject_id', 2),
  ('jss1a_class_id', 'art_subject_id', 2)
ON CONFLICT (class_id, subject_id) DO UPDATE
SET periods_per_week = EXCLUDED.periods_per_week;
```

### 5.2 Auto-Assignment (Bulk)
Assign all general subjects to all junior classes:

```sql
INSERT INTO class_subject_assignments (class_id, subject_id, periods_per_week)
SELECT 
  c.id as class_id,
  s.id as subject_id,
  s.periods_per_week
FROM classes c
CROSS JOIN subjects s
WHERE 
  c.level = 'junior'
  AND s.level = 'junior'
  AND s.type = 'general'
ON CONFLICT (class_id, subject_id) DO NOTHING;
```

---

## 🎨 Step 6: Update UI to Use New Components

### 6.1 Update TimetableModule.tsx

Replace the imports and integrate new components:

```tsx
// In /components/timetable/TimetableModule.tsx

// Add these imports
import { TimetableSettingsNew } from './TimetableSettingsNew';
import { TimetableEditorNew } from './TimetableEditorNew';

// Replace showSettings section with:
if (showSettings) {
  return (
    <div className={className}>
      <TimetableSettingsNew
        onSave={(settings) => {
          // Settings saved via backend
          setShowSettings(false);
          toast.success('Settings saved! You can now generate timetables.');
        }}
        onCancel={() => setShowSettings(false)}
      />
    </div>
  );
}

// Replace showEditor section with:
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

## 🧪 Step 7: Test the System

### 7.1 Configure Settings

1. **Navigate:** Admin Dashboard → Timetable → Settings
2. **Configure Basic Settings:**
   - Select Academic Year: `2024/2025`
   - Select Term: `First Term`
   - ✅ Double periods only once per week
   - ✅ Allow same teacher consecutive periods

3. **Configure Daily Timings:**
   ```
   Monday:    08:00 - 15:00,  8 periods,  40 min each
   Tuesday:   08:00 - 15:00,  8 periods,  40 min each
   Wednesday: 08:00 - 15:00,  8 periods,  40 min each
   Thursday:  08:00 - 15:00, 10 periods,  35 min each
   Friday:    08:00 - 13:00,  7 periods,  40 min each
   ```

4. **Add Breaks:**
   - **Assembly:** After period 1, 15 min, Monday/Wednesday/Friday
   - **Short Break:** After period 3, 15 min, All days
   - **Lunch Break:** After period 6, 60 min, All days

5. **Set Special Rules:**
   - **Thursday:** 8 academic + 2 co-curricular
   - **Friday:** 
     - First 4 periods: Academic
     - Period 5: `Note Check`
     - Periods 6-7: `Sports`

6. **Click Save**

### 7.2 Generate Timetable

1. **Navigate:** Admin Dashboard → Timetable → Generate
2. **Review Stats:**
   - Should show: Teachers loaded, Subjects loaded, Classes loaded
3. **Click "Generate Timetable"**
4. **Watch for:**
   - ⏳ "Generating timetable..." (with loading spinner)
   - ✅ "Timetable generated successfully!" OR
   - ⚠️ Conflict warnings

### 7.3 Review Results

**Check Conflicts Panel:**
- **If empty:** ✅ Perfect! All slots assigned successfully
- **If has conflicts:** Review each one:
  - Part-time teacher couldn't be scheduled? → Increase availability
  - Class needs more periods? → Reduce subject requirements or add more teachers

**Check Warnings Panel:**
- Shows informational messages (e.g., "Reserved double period for JSS 1 - Physics")

**Preview Timetable:**
- Scroll down to see grid for each class
- **Color coding:**
  - 🟦 Blue = Special captions (Note Check, Sports, Breaks)
  - 🟪 Purple = Co-curricular periods
  - 🟧 Orange = Part-time teacher assigned
  - ⬜ White = Regular lesson

### 7.4 Save Timetable

1. **Click "Save Timetable"**
2. **Confirm:** "Timetable saved successfully!"

---

## 🔍 Step 8: Verify Scheduling Logic

### Check Part-Time Teachers Were Scheduled First

```sql
-- Query generated timetable to see part-time teacher assignments
SELECT 
  t.slots->>'teacherId' as teacher_id,
  p.first_name || ' ' || p.last_name as teacher_name,
  p.is_part_time,
  COUNT(*) as periods_assigned
FROM timetable t,
  jsonb_array_elements(t.slots) as slot_elem,
  profiles p
WHERE (slot_elem->>'teacherId')::uuid = p.id
GROUP BY teacher_id, teacher_name, p.is_part_time
ORDER BY p.is_part_time DESC, periods_assigned DESC;
```

**Expected:** Part-time teachers should have slots matching their maxPerWeek setting.

### Verify Thursday/Friday Rules

```sql
-- Check Friday periods 5-7 have special captions
SELECT 
  slot_elem->>'classId' as class_id,
  slot_elem->>'day' as day,
  (slot_elem->>'period')::int as period,
  slot_elem->>'caption' as caption,
  slot_elem->>'isCoCurricular' as is_co_curricular
FROM timetable t,
  jsonb_array_elements(t.slots) as slot_elem
WHERE 
  slot_elem->>'day' = 'fri'
  AND (slot_elem->>'period')::int IN (5, 6, 7)
ORDER BY class_id, period;
```

**Expected:**
- Period 5: caption = "Note Check"
- Periods 6-7: caption = "Sports", isCoCurricular = true

---

## 🐛 Troubleshooting

### Issue 1: "No teacher is qualified to teach [Subject] in class [Class]"

**Solution:**
```sql
-- Check which teachers are qualified for the subject
SELECT 
  p.id,
  p.first_name || ' ' || p.last_name as name,
  p.qualified_subjects
FROM profiles p
WHERE 
  p.role = 'teacher'
  AND 'subject_id_here' = ANY(p.qualified_subjects);

-- If none, update a teacher:
UPDATE profiles
SET qualified_subjects = array_append(qualified_subjects, 'subject_id_here')
WHERE id = 'teacher_id_here';
```

### Issue 2: "Part-time teacher could not be fully scheduled"

**Solution:**
```sql
-- Check teacher's availability
SELECT 
  first_name,
  last_name,
  is_part_time,
  max_periods_per_week,
  availability
FROM profiles
WHERE id = 'part_time_teacher_id';

-- Increase availability:
UPDATE profiles
SET availability = '{
  "mon": [1,2,3,4,5,6,7,8],
  "wed": [1,2,3,4,5,6,7,8],
  "fri": [1,2,3,4,5,6,7]
}'::jsonb
WHERE id = 'part_time_teacher_id';
```

### Issue 3: "Class [Class] needs X more periods for subject [Subject]"

**Solution A:** Add more teachers qualified for that subject
**Solution B:** Reduce periods required:

```sql
UPDATE class_subject_assignments
SET periods_per_week = 4
WHERE class_id = 'class_id' AND subject_id = 'subject_id';
```

### Issue 4: Validation errors about period count

**Check:**
```sql
-- Count total periods required vs available
SELECT 
  c.name as class_name,
  SUM(csa.periods_per_week) as total_required,
  (8 + 8 + 8 + 10 + 7) as total_available_per_week
FROM classes c
JOIN class_subject_assignments csa ON c.id = csa.class_id
GROUP BY c.id, c.name;
```

If `total_required > 41`, reduce some subject periods.

---

## 📊 Step 9: Export & Publish

### 9.1 Export Options

The system supports:
- **PDF Export:** Full timetable for printing
- **Excel Export:** Editable spreadsheet format
- **Per-Class Export:** Individual class timetables
- **Per-Teacher Export:** Teacher schedules

### 9.2 Publish to Students/Teachers

Once satisfied:
1. Click **"Publish Timetable"** in TimetableModule
2. All students and teachers can now view their timetables
3. Students see: My Timetable (filtered to their class)
4. Teachers see: My Teaching Schedule (filtered to their assigned classes)

---

## 🎯 Advanced Features

### Custom Room Assignment

Add room allocation by extending slots:

```typescript
// In generator.ts, when creating slots:
slots.push({
  // ... existing fields
  roomId: assignRoom(subject, classId) // Your custom logic
});
```

### Multi-Week Rotation

Support A/B week rotation:

```sql
ALTER TABLE timetable ADD COLUMN week_type TEXT DEFAULT 'standard';
-- Generate separate timetables for 'week_a' and 'week_b'
```

### Teacher Preferences

Extend teacher availability to include time preferences:

```sql
ALTER TABLE profiles ADD COLUMN preferred_periods JSONB DEFAULT '{
  "morning": true,
  "afternoon": false
}'::jsonb;
```

---

## 📝 Summary Checklist

- [ ] ✅ Run `/CREATE_TIMETABLE_TABLES.sql`
- [ ] ✅ Set teacher `qualified_subjects` and `availability`
- [ ] ✅ Configure subject `periods_per_week` and `double_allowed`
- [ ] ✅ Create `class_subject_assignments` for all classes
- [ ] ✅ Configure timetable settings (days, breaks, special rules)
- [ ] ✅ Generate timetable and review conflicts
- [ ] ✅ Fix any conflicts (add teachers or adjust requirements)
- [ ] ✅ Save timetable
- [ ] ✅ Export and publish to users

---

## 🎉 Success Criteria

Your timetable automation is working when:

1. ✅ Part-time teachers are scheduled within their available slots
2. ✅ Thursday has 8 academic periods + 2 co-curricular
3. ✅ Friday has 4 academic + Note Check + 2 Sports
4. ✅ No teacher is double-booked (same period, different classes)
5. ✅ Double periods appear max once per week (if enabled)
6. ✅ All classes have required subject periods assigned
7. ✅ Zero conflicts reported

---

## 💡 Tips for Best Results

1. **Start with one class:** Generate for a single class first to verify logic
2. **Use realistic data:** Ensure teacher loads are balanced (15-20 periods/week)
3. **Part-time teachers:** Limit to 3-6 periods/week and specific days
4. **Subject balancing:** Major subjects (Math, English) should be 5-6 periods/week
5. **Break placement:** Place breaks after periods 2, 4, and 6 for best flow
6. **Co-curricular:** Use Thursday's last 2 periods for clubs/activities

---

## 📞 Support

If you encounter issues:
1. Check browser console for detailed logs (`[Generator]` prefix)
2. Review SQL query results for data consistency
3. Validate that RLS policies allow your role to access tables
4. Ensure all foreign key relationships are valid (teacher IDs, subject IDs, class IDs)

**Common Console Messages:**
- `[Generator] Starting timetable generation` → Generation started
- `[Generator] Phase 1: Pre-slotting N part-time teachers` → Scheduling part-timers
- `[Generator] ✓ Part-time teacher X fully scheduled` → Success for teacher X
- `[Generator] Generation complete` → Done!

---

## 🚀 You're Ready!

Your timetable automation system is now fully integrated and ready to generate conflict-free schedules automatically! 

The system will:
1. **Prioritize part-time teachers** (schedule them first in their available slots)
2. **Enforce special rules** (Thursday co-curricular, Friday note check & sports)
3. **Detect conflicts** (teacher double-booking, insufficient periods)
4. **Balance loads** (distribute subjects evenly across days)
5. **Respect constraints** (teacher availability, double periods, breaks)

Happy scheduling! 🎓✨
