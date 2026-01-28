# ✅ Timetable System - Now Self-Contained!

## What Changed

The timetable system is now **completely self-contained** and uses ONLY its own configuration settings, not the global subjects/teachers/classes management system.

---

## How It Works Now

### Data Sources (Timetable-Specific)

The timetable generator now fetches data from:

1. **`subject_configs` table** → Subjects configured in "Subjects Config" tab
2. **`teachers` table** → But qualifications come from subject_configs
3. **`classes` table** → But subject assignments come from subject_configs
4. **`subject_pairings` table** → Paired subjects from "Pairs" tab
5. **Timetable settings** → Days, periods, breaks, rules from "Basic", "Timings", "Breaks", "Rules" tabs

### Configuration Flow

```
Timetable Settings & Configuration
│
├── Subjects Config Tab
│   ├── Add subjects (Math, English, Biology, etc.)
│   ├── Assign classes to each subject
│   ├── Assign teachers to each subject
│   ├── Set periods per week
│   └── Mark as paired/departmental
│
├── Pairs Tab
│   ├── Drag subjects together to create pairs
│   └── Save pairs to subject_pairings table
│
├── Basic Tab
│   ├── Select academic year/session
│   ├── Select term
│   └── Configure days and periods
│
├── Timings Tab (optional)
│   └── Set start times for each period
│
├── Breaks Tab
│   └── Configure break periods
│
└── Rules Tab
    ├── Thursday academic/co-curricular split
    ├── Friday special rules
    ├── Allow back-to-back same teacher
    └── Double periods once per week
```

---

## Step-by-Step Setup

### Step 1: Configure Subjects (Subjects Config Tab)

1. **Go to:** Timetable → Settings → **Subjects Config** tab
2. **Click:** "Add Subject" (bottom right)
3. **Fill in:**
   - Subject name (e.g., "Mathematics")
   - Subject code (e.g., "MTH")
   - Level: JSS or SSS
   - Department: "general" (for all students) or "science/arts/commercial"
4. **Assign Classes:**
   - Select JSS 1A, JSS 1B, JSS 2A, etc.
   - Classes that should have this subject
5. **Assign Teachers:**
   - Select teachers who can teach this subject
   - For each teacher, select which classes they teach
   - Mark if part-time and set available days
6. **Set Periods:**
   - Min periods per week: 2
   - Max periods per week: 4
7. **Optional:**
   - Check "Allow double periods"
   - Check "This is a paired subject" (for JSS)
   - Check "This is a departmental subject" (for SSS)
8. **Click:** "Save Subject"
9. **Repeat** for all subjects

---

### Step 2: Configure Pairs (Pairs Tab) - Optional

1. **Go to:** Timetable → Settings → **Pairs** tab
2. **Select level:** Junior or Senior
3. **Drag subjects together:**
   - Drag "Biology" onto "Chemistry"
   - Drag "Physics" onto the "Biology / Chemistry" pair
4. **Click:** "Save All Pairs" (top right)
5. **Result:** These subjects will be scheduled at the same time

---

### Step 3: Configure Days & Periods (Basic Tab)

1. **Go to:** Timetable → Settings → **Basic** tab
2. **Select:**
   - Academic Year: 2024/2025
   - Term: First Term
3. **Configure each day:**
   - Monday: 8 periods
   - Tuesday: 8 periods
   - Wednesday: 8 periods
   - Thursday: 10 periods (6 academic + 4 co-curricular)
   - Friday: 7 periods (5 academic + Note Check + 2 Sports)
4. **Click:** "Save Timetable Settings" (top right)

---

### Step 4: Generate Timetable

1. **Click:** "Generate Timetable" button (big blue button)
2. **Wait:** 3-5 seconds
3. **See:** Complete timetable with all subjects scheduled Mon-Fri
4. **Review:** Conflicts and warnings (if any)
5. **Click:** "Save Timetable" to finalize

---

## What the Generator Does Automatically

✅ **Schedules all subjects** across Monday-Friday
✅ **Assigns teachers** to classes based on subject_configs
✅ **Respects paired subjects** (scheduled at same time)
✅ **Avoids teacher conflicts** (no double-booking)
✅ **Handles part-time teachers** (only their available days)
✅ **Respects special rules** (Thursday co-curricular, Friday sports)
✅ **Distributes periods** evenly across the week
✅ **Creates double periods** if allowed
✅ **Detects conflicts** and shows warnings

---

## Console Output (Check Browser Console F12)

### Expected Logs:

```
[TimetableEditor] Loading data from timetable-specific configuration...
[TimetableEditor] Data loaded: {
  subjectConfigs: 15,
  teachers: 20,
  classes: 12,
  hasSettings: true
}
[TimetableEditor] Data processed from timetable configs:
  - Teachers: Mr. John (3 subjects), Mrs. Jane (5 subjects)
  - Subjects: Math (4 periods/week), English (5 periods/week), Biology (4 periods/week)
  - Classes: JSS 1A (8 subjects), JSS 2A (10 subjects), SSS 3 Science (12 subjects)
  - Settings: Loaded

[TimetableEditor] Starting generation...
[Generator] Starting timetable generation with:
  classes: 12,
  teachers: 20,
  subjects: 15,
  partTime: 3
[Generator] Phase 0: Fetching subject pair groups
[Generator] 2 pair groups configured, 4 subjects in pairs
[Generator] Phase 1: Pre-slotting 3 part-time teachers
[Generator] Phase 2: Regular subject scheduling
...
[TimetableEditor] Generation complete:
  slots: 450,
  conflicts: 0,
  warnings: 2
```

---

## Common Issues

### Issue: "Subjects: 0"

**Problem:** No subjects configured in Subjects Config tab

**Fix:**
1. Go to Subjects Config tab
2. Add subjects with "Add Subject" button
3. Configure classes and teachers for each
4. Save each subject

---

### Issue: "Classes: JSS 1A (0 subjects)"

**Problem:** Subjects not assigned to classes

**Fix:**
1. Go to Subjects Config tab
2. For each subject, click to edit
3. Check the "Assigned Classes" section
4. Select JSS 1A, JSS 1B, etc.
5. Save the subject

---

### Issue: "Teachers: Mr. John (0 subjects)"

**Problem:** Teachers not assigned to any subjects

**Fix:**
1. Go to Subjects Config tab
2. For each subject, scroll to "Teacher Assignments"
3. Select teachers who can teach this subject
4. For each teacher, select which classes they teach
5. Save the subject

---

### Issue: Empty timetable generated

**Problem:** Missing configuration in one of the tabs

**Checklist:**
- [ ] Subjects configured in "Subjects Config" tab
- [ ] Each subject has classes assigned
- [ ] Each subject has teachers assigned
- [ ] "Basic" tab configured (days, periods, academic year, term)
- [ ] "Save Timetable Settings" clicked in Basic tab
- [ ] Each subject saved individually with "Save Subject"

---

## Benefits of Self-Contained System

✅ **Independent** - Timetable doesn't depend on global subjects/teachers management
✅ **Flexible** - Can configure subjects differently for timetable vs. general management
✅ **Clean** - All timetable config in one place (Settings tabs)
✅ **Isolated** - Changes to timetable config don't affect other modules
✅ **Complete** - All necessary configuration within timetable settings

---

## Summary

The timetable system is now **completely self-contained**:
- Uses `subject_configs` table for all subject data
- Uses `subject_pairings` table for paired subjects
- Uses timetable settings for days, periods, breaks, rules
- Does NOT rely on global subjects/teachers/classes management

**To generate a timetable:**
1. Configure subjects in "Subjects Config" tab
2. Optionally configure pairs in "Pairs" tab
3. Configure days/periods in "Basic" tab
4. Click "Generate Timetable"
5. Done! ✅

All the configuration is done within the "Timetable Settings & Configuration" tabs.
