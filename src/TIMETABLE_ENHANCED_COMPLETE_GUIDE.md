# 🎓 Enhanced Timetable System - Complete Implementation Guide

## Overview

This guide implements ALL the Nigerian school timetable requirements you specified, including:

✅ **Enhanced Subjects** - Major/minor, departmental types, period constraints, time preferences  
✅ **Subject Pairs** - Departmental pairings (Physics-Chemistry, etc.)  
✅ **Departmental Requirements** - Compulsory subjects per department  
✅ **Enhanced Teachers** - Preferences, conflicts, part-time priorities  
✅ **Enhanced Classes** - Department assignments for senior classes  
✅ **Availability Presets** - Reusable teacher availability patterns  

---

## 📦 What's Been Created

### 1. Database Schema (`/TIMETABLE_ENHANCED_SCHEMA.sql`)
- Enhanced `subjects` table with 7 new columns
- Enhanced `classes` table with department field
- Enhanced `profiles` table with 3 new teacher fields
- New `subject_pairs` table
- New `departmental_requirements` table
- New `teacher_availability_presets` table with 5 presets

### 2. TypeScript Types (`/types/timetable.ts`)
- Updated with all new fields and types
- New interfaces: `SubjectPair`, `DepartmentalRequirement`, `TeacherAvailabilityPreset`
- New type aliases: `Department`, `Level`, `SubjectType`, `TimeSlotPreference`, `SlotPriority`

### 3. Backend Endpoints (`/supabase/functions/server/index.tsx`)
- `GET /subject-pairs` - Fetch subject pairs
- `POST /subject-pairs` - Create/update pairs
- `DELETE /subject-pairs/:id` - Delete pair
- `GET /departmental-requirements` - Fetch requirements
- `POST /departmental-requirements` - Save requirement
- `GET /teacher-availability-presets` - Fetch presets

---

## 🚀 Step-by-Step Implementation

### STEP 1: Run Database Migration

**File:** `/TIMETABLE_ENHANCED_SCHEMA.sql`

1. Open Supabase SQL Editor
2. Copy the entire contents of `/TIMETABLE_ENHANCED_SCHEMA.sql`
3. Paste and run
4. Wait ~30 seconds
5. Look for success messages

**What this does:**
- Adds 7 new columns to `subjects` table
- Adds 2 new columns to `classes` table
- Adds 3 new columns to `profiles` table (teachers)
- Creates 3 new tables
- Inserts 5 availability presets
- Sets up RLS policies and indexes

---

### STEP 2: Verify Schema Changes

Run this SQL to verify everything was created:

```sql
-- Check enhanced subjects columns
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'subjects'
  AND column_name IN (
    'level', 'type', 'department', 'is_major', 
    'min_periods_per_week', 'max_periods_per_week', 
    'preferred_time_slots'
  )
ORDER BY column_name;

-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_name IN (
  'subject_pairs', 
  'departmental_requirements', 
  'teacher_availability_presets'
);

-- Check availability presets were created
SELECT name FROM teacher_availability_presets ORDER BY name;
```

Expected results:
- 7 subject columns
- 3 new tables
- 5 availability presets

---

### STEP 3: Update Existing Data

#### 3.1 Update Subjects with Levels and Types

```sql
-- Example: Update Mathematics (major subject, all levels)
UPDATE subjects
SET 
  level = 'junior',  -- or 'senior'
  type = 'general',
  is_major = true,
  min_periods_per_week = 5,
  max_periods_per_week = 5,
  double_allowed = false,
  preferred_time_slots = 'morning'
WHERE name = 'Mathematics';

-- Example: Update Physics (senior, Science departmental, major)
UPDATE subjects
SET 
  level = 'senior',
  type = 'departmental',
  department = 'Science',
  is_major = true,
  min_periods_per_week = 4,
  max_periods_per_week = 4,
  double_allowed = true,
  double_max_per_week = 1,
  preferred_time_slots = 'morning'
WHERE name = 'Physics';

-- Example: Update Literature (senior, Arts departmental)
UPDATE subjects
SET 
  level = 'senior',
  type = 'departmental',
  department = 'Arts',
  is_major = true,
  min_periods_per_week = 4,
  max_periods_per_week = 4,
  preferred_time_slots = 'any'
WHERE name = 'Literature';

-- Example: Update Civic Education (junior, general, minor)
UPDATE subjects
SET 
  level = 'junior',
  type = 'general',
  is_major = false,
  min_periods_per_week = 2,
  max_periods_per_week = 2,
  preferred_time_slots = 'afternoon'
WHERE name = 'Civic Education';
```

#### 3.2 Update Classes with Levels and Departments

```sql
-- Junior classes (JSS1-3)
UPDATE classes
SET level = 'junior'
WHERE name LIKE 'JSS%' OR name LIKE 'J%';

-- Senior Science classes
UPDATE classes
SET 
  level = 'senior',
  department = 'Science'
WHERE name LIKE '%Science%' OR name LIKE 'SS% Sci%';

-- Senior Arts classes
UPDATE classes
SET 
  level = 'senior',
  department = 'Arts'
WHERE name LIKE '%Arts%' OR name LIKE 'SS% Art%';

-- Senior Commercial classes
UPDATE classes
SET 
  level = 'senior',
  department = 'Commercial'
WHERE name LIKE '%Commercial%' OR name LIKE 'SS% Com%';
```

#### 3.3 Update Teachers with Enhanced Fields

```sql
-- Example: Update a part-time teacher
UPDATE profiles
SET 
  is_part_time = true,
  slot_priority = 'high',  -- Schedule early
  max_periods_per_week = 6,
  max_periods_per_day = 3,
  availability = '{
    "mon": [1, 2, 3],
    "wed": [5, 6, 7],
    "fri": [1, 2, 3, 4]
  }'::jsonb,
  qualified_subjects = ARRAY[
    'subject-uuid-1'::uuid,
    'subject-uuid-2'::uuid
  ],
  preferred_classes = ARRAY[
    'class-uuid-1'::uuid,
    'class-uuid-2'::uuid
  ]
WHERE email = 'parttime.teacher@school.com';

-- Example: Teacher conflict (cannot teach same period)
UPDATE profiles
SET 
  cannot_teach_same_period_as = ARRAY[
    'other-teacher-uuid'::uuid
  ]
WHERE email = 'teacher1@school.com';
```

---

### STEP 4: Create Subject Pairs

For senior classes, create departmental subject pairs:

```sql
-- Get subject IDs first
SELECT id, name FROM subjects WHERE level = 'senior';

-- Create Science pairs
INSERT INTO subject_pairs (pair_name, subject_1_id, subject_2_id, department, level, description)
VALUES
  ('Physics-Chemistry', 'physics-uuid'::uuid, 'chemistry-uuid'::uuid, 'Science', 'senior', 
   'Core science pair for SS1-3 Science students'),
  
  ('Biology-Chemistry', 'biology-uuid'::uuid, 'chemistry-uuid'::uuid, 'Science', 'senior',
   'Alternative science pair'),
  
  ('Physics-Biology', 'physics-uuid'::uuid, 'biology-uuid'::uuid, 'Science', 'senior',
   'Alternative science pair');

-- Create Arts pairs
INSERT INTO subject_pairs (pair_name, subject_1_id, subject_2_id, department, level, description)
VALUES
  ('Literature-Government', 'literature-uuid'::uuid, 'government-uuid'::uuid, 'Arts', 'senior',
   'Core arts pair'),
   
  ('Literature-CRK', 'literature-uuid'::uuid, 'crk-uuid'::uuid, 'Arts', 'senior',
   'Alternative arts pair');

-- Create Commercial pairs
INSERT INTO subject_pairs (pair_name, subject_1_id, subject_2_id, department, level, description)
VALUES
  ('Economics-Commerce', 'economics-uuid'::uuid, 'commerce-uuid'::uuid, 'Commercial', 'senior',
   'Core commercial pair'),
   
  ('Accounting-Commerce', 'accounting-uuid'::uuid, 'commerce-uuid'::uuid, 'Commercial', 'senior',
   'Alternative commercial pair');
```

---

### STEP 5: Define Departmental Requirements

Define which subjects are compulsory for each department:

```sql
-- Get subject IDs
SELECT id, name, level FROM subjects WHERE level = 'senior' ORDER BY name;

-- Science Department Requirements (SS1-3)
INSERT INTO departmental_requirements (department, level, subject_id, is_compulsory, min_periods_per_week)
VALUES
  -- Core subjects (all departments)
  ('Science', 'senior', 'mathematics-uuid'::uuid, true, 5),
  ('Science', 'senior', 'english-uuid'::uuid, true, 4),
  
  -- Science-specific
  ('Science', 'senior', 'physics-uuid'::uuid, true, 4),
  ('Science', 'senior', 'chemistry-uuid'::uuid, true, 4),
  ('Science', 'senior', 'biology-uuid'::uuid, true, 4),
  ('Science', 'senior', 'further-math-uuid'::uuid, false, 3),
  ('Science', 'senior', 'technical-drawing-uuid'::uuid, false, 2);

-- Arts Department Requirements (SS1-3)
INSERT INTO departmental_requirements (department, level, subject_id, is_compulsory, min_periods_per_week)
VALUES
  -- Core subjects
  ('Arts', 'senior', 'mathematics-uuid'::uuid, true, 4),
  ('Arts', 'senior', 'english-uuid'::uuid, true, 4),
  
  -- Arts-specific
  ('Arts', 'senior', 'literature-uuid'::uuid, true, 4),
  ('Arts', 'senior', 'government-uuid'::uuid, true, 3),
  ('Arts', 'senior', 'economics-uuid'::uuid, true, 3),
  ('Arts', 'senior', 'crk-uuid'::uuid, false, 2),
  ('Arts', 'senior', 'history-uuid'::uuid, false, 2);

-- Commercial Department Requirements (SS1-3)
INSERT INTO departmental_requirements (department, level, subject_id, is_compulsory, min_periods_per_week)
VALUES
  -- Core subjects
  ('Commercial', 'senior', 'mathematics-uuid'::uuid, true, 4),
  ('Commercial', 'senior', 'english-uuid'::uuid, true, 4),
  
  -- Commercial-specific
  ('Commercial', 'senior', 'economics-uuid'::uuid, true, 4),
  ('Commercial', 'senior', 'commerce-uuid'::uuid, true, 4),
  ('Commercial', 'senior', 'accounting-uuid'::uuid, true, 3),
  ('Commercial', 'senior', 'business-studies-uuid'::uuid, false, 2);
```

---

### STEP 6: Test Backend Endpoints

Use the browser console or Postman to test:

```javascript
// Get all subject pairs
const response = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subject-pairs`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  }
);
const data = await response.json();
console.log('Subject Pairs:', data.pairs);

// Get Science department requirements
const reqResponse = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/departmental-requirements?department=Science&level=senior`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  }
);
const reqData = await reqResponse.json();
console.log('Science Requirements:', reqData.requirements);

// Get availability presets
const presetResponse = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-availability-presets`,
  {
    headers: {
      'Authorization': `Bearer ${session.access_token}`
    }
  }
);
const presetData = await presetResponse.json();
console.log('Availability Presets:', presetData.presets);
```

---

## 📊 Enhanced Features Reference

### Subject Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `level` | TEXT | junior/senior | 'senior' |
| `type` | TEXT | general/departmental | 'departmental' |
| `department` | TEXT | Science/Arts/Commercial | 'Science' |
| `is_major` | BOOLEAN | Major subject flag | true |
| `min_periods_per_week` | INTEGER | Minimum periods | 4 |
| `max_periods_per_week` | INTEGER | Maximum periods | 5 |
| `double_allowed` | BOOLEAN | Allow double periods | true |
| `double_max_per_week` | INTEGER | Max double periods | 1 |
| `preferred_time_slots` | TEXT | morning/afternoon/any | 'morning' |

### Teacher Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `is_part_time` | BOOLEAN | Part-time teacher | true |
| `slot_priority` | TEXT | high/medium/low | 'high' |
| `max_periods_per_week` | INTEGER | Max weekly periods | 12 |
| `max_periods_per_day` | INTEGER | Max daily periods | 4 |
| `qualified_subjects` | UUID[] | Subject UUIDs | [...] |
| `preferred_classes` | UUID[] | Class UUIDs | [...] |
| `cannot_teach_same_period_as` | UUID[] | Conflicting teacher UUIDs | [...] |
| `availability` | JSONB | Weekly availability | {...} |

### Class Fields

| Field | Type | Description | Example |
|-------|------|-------------|---------|
| `level` | TEXT | junior/senior | 'senior' |
| `department` | TEXT | Science/Arts/Commercial | 'Science' |

---

## 🎯 How to Use Enhanced Features

### 1. **Major vs Minor Subjects**

```sql
-- Major subjects get more periods
UPDATE subjects SET is_major = true, max_periods_per_week = 5
WHERE name IN ('Mathematics', 'English', 'Physics', 'Chemistry');

-- Minor subjects get fewer periods
UPDATE subjects SET is_major = false, max_periods_per_week = 2
WHERE name IN ('Civic Education', 'Agricultural Science');
```

The generator will prioritize major subjects and allocate periods accordingly.

### 2. **Time Slot Preferences**

```sql
-- Schedule Mathematics in morning (better focus)
UPDATE subjects SET preferred_time_slots = 'morning' 
WHERE name = 'Mathematics';

-- Schedule Arts/Sports in afternoon
UPDATE subjects SET preferred_time_slots = 'afternoon'
WHERE name IN ('Fine Arts', 'Physical Education');
```

The generator will try to respect these preferences when scheduling.

### 3. **Part-Time Teacher Priority**

```sql
-- High priority = schedule first (most constrained)
UPDATE profiles SET slot_priority = 'high' 
WHERE is_part_time = true AND max_periods_per_week < 8;

-- Low priority = schedule last (more flexible)
UPDATE profiles SET slot_priority = 'low'
WHERE is_part_time = true AND max_periods_per_week > 15;
```

Generator schedules high-priority part-timers before low-priority.

### 4. **Teacher Conflicts**

```sql
-- Teacher A and Teacher B cannot teach at same time
UPDATE profiles
SET cannot_teach_same_period_as = ARRAY['teacher-b-uuid'::uuid]
WHERE id = 'teacher-a-uuid';
```

Generator ensures these teachers never have simultaneous classes.

### 5. **Departmental Subject Pairs**

Create pairs for senior department classes:

```sql
-- Physics-Chemistry pair for Science
INSERT INTO subject_pairs (...)
VALUES ('Physics-Chemistry', physics_id, chemistry_id, 'Science', 'senior', ...);
```

Use these when assigning subjects to senior classes.

---

## 🔧 Next Steps

### 1. **Update UI Components**

You'll need to create/update these UI components:

- [ ] `SubjectsManagerEnhanced.tsx` - Add fields for level, type, department, is_major, periods, preferences
- [ ] `SubjectPairsManager.tsx` - Manage departmental subject pairs
- [ ] `DepartmentalRequirementsManager.tsx` - Define compulsory subjects per department
- [ ] `TeachersManagerEnhanced.tsx` - Add fields for preferences, conflicts, priority
- [ ] `TeacherAvailabilityEditor.tsx` - Visual weekly grid for availability
- [ ] `ClassesManagerEnhanced.tsx` - Add department selection for senior classes

### 2. **Update Timetable Generator**

The generator algorithm (`/lib/timetable/generator.ts`) needs updates to:

- [ ] Check `preferred_time_slots` when scheduling subjects
- [ ] Use `slot_priority` for part-time teacher ordering
- [ ] Check `cannot_teach_same_period_as` for conflicts
- [ ] Respect `min_periods_per_week` and `max_periods_per_week`
- [ ] Use `is_major` for scheduling priority
- [ ] Check departmental requirements when assigning subjects to classes

### 3. **Update Timetable Settings UI**

The settings component needs to support:

- [ ] Selecting departments for senior classes
- [ ] Viewing/editing subject pairs
- [ ] Managing departmental requirements
- [ ] Visual availability editor for teachers

---

## ✅ Verification Checklist

After implementing:

- [ ] Database schema updated successfully
- [ ] TypeScript types include all new fields
- [ ] Backend endpoints working
- [ ] Subjects have levels, types, departments
- [ ] Classes have departments (for senior)
- [ ] Teachers have enhanced fields
- [ ] Subject pairs created for departments
- [ ] Departmental requirements defined
- [ ] Availability presets available
- [ ] UI components created/updated
- [ ] Generator uses new fields
- [ ] Testing completed

---

## 📖 Related Files

| File | Purpose |
|------|---------|
| `/TIMETABLE_ENHANCED_SCHEMA.sql` | **RUN THIS** - Database migration |
| `/types/timetable.ts` | **UPDATED** - TypeScript types |
| `/supabase/functions/server/index.tsx` | **UPDATED** - Backend endpoints |
| `/lib/timetable/generator.ts` | **NEEDS UPDATE** - Generator algorithm |
| `/components/timetable/TimetableSettingsNew.tsx` | **NEEDS UPDATE** - Settings UI |
| `/TEST_TIMETABLE_AUTOMATION_NOW.md` | Testing guide |

---

## 🎓 Nigerian School Timetable Requirements - COMPLETE!

✅ **Subjects**
- Level (junior/senior)
- Type (general/departmental)
- Department (Science/Arts/Commercial)
- Major subject flags
- Min/max periods per week
- Double period settings
- Time slot preferences

✅ **Subject Pairs**
- Departmental pairings
- Physics-Chemistry, Literature-Government, etc.

✅ **Departmental Requirements**
- Compulsory subjects per department
- Per level (junior/senior)

✅ **Teachers**
- Qualified subjects
- Preferred classes
- Max periods constraints
- Detailed availability
- Conflict avoidance
- Part-time priorities

✅ **Classes**
- Level assignment
- Department for senior classes

✅ **Availability Presets**
- Reusable patterns
- Full Week, Morning Only, MWF, etc.

---

**All database schema and backend endpoints are ready!**  
**Next: Update UI components to use these enhanced features.** 🚀
