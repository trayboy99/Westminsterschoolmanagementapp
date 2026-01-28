# Timetable Paired Subjects Display Fix

## Issues Fixed

### 1. **Student Timetable - Paired Subjects Not Showing Both**
**Problem:** For JSS1 students, paired subjects like "Yoruba/Igbo" were only showing one subject (e.g., "Yoruba") instead of both.

**Root Cause:** The student timetable endpoint was only checking `subject_config_id` and not checking `pairs_id` for paired subjects.

**Fix Applied:**
```javascript
// BEFORE - Only checked subject_config_id:
if (slot.subject_config_id) {
  const { data: subjectConfig } = await supabase
    .from("subject_configs")
    .select("subject_id")
    .eq("id", slot.subject_config_id)
    .single();
  
  if (subjectConfig?.subject_id) {
    const { data: subject } = await supabase
      .from("subjects")
      .select("name, code")
      .eq("id", subjectConfig.subject_id)
      .single();
    
    subjectName = subject.name;
  }
}

// AFTER - Checks pairs_id first, then subject_config_id:
if (slot.pairs_id) {
  // Get both subjects from the pair
  const { data: pairData } = await supabase
    .from("subject_pairs")
    .select("subject_1_id, subject_2_id")
    .eq("id", slot.pairs_id)
    .single();

  if (pairData) {
    const { data: subject1 } = await supabase
      .from("subjects")
      .select("name, code")
      .eq("id", pairData.subject_1_id)
      .single();

    const { data: subject2 } = await supabase
      .from("subjects")
      .select("name, code")
      .eq("id", pairData.subject_2_id)
      .single();

    // Combine subject names with "/"
    if (subject1 && subject2) {
      subjectName = `${subject1.name}/${subject2.name}`;
      subjectCode = `${subject1.code}/${subject2.code}`;
    }
  }
} else if (slot.subject_config_id) {
  // Single subject (existing logic)
  ...
}
```

**Location:** `/supabase/functions/server/index.tsx` - Student Timetable endpoint (~line 17392)

---

### 2. **Admin/Teacher Timetable View - Paired Subjects Not Showing Both**
**Problem:** In the admin and teacher timetable views, paired subjects were only showing one subject instead of both (e.g., "Yoruba" instead of "Yoruba/Igbo").

**Root Cause:** The main timetable endpoint was checking an old table structure (`subject_pairings` with `pair_group_id`) instead of the new `subject_pairs` table (with `subject_1_id` and `subject_2_id`).

**Fix Applied:**
```javascript
// BEFORE - Used old subject_pairings table:
} else if (row.pairs_id) {
  const subjectNames = pairGroupMap.get(row.pairs_id) || [];
  subjectName = subjectNames.sort().join('/');
  isPaired = true;
}

// AFTER - Uses subject_pairs table correctly:
} else if (row.pairs_id) {
  // Get both subjects from the subject_pairs table
  const { data: pairData } = await supabase
    .from("subject_pairs")
    .select("subject_1_id, subject_2_id")
    .eq("id", row.pairs_id)
    .single();

  if (pairData) {
    // Fetch both subjects
    const { data: subject1 } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", pairData.subject_1_id)
      .single();

    const { data: subject2 } = await supabase
      .from("subjects")
      .select("name")
      .eq("id", pairData.subject_2_id)
      .single();

    // Combine subject names with "/"
    if (subject1 && subject2) {
      subjectName = `${subject1.name}/${subject2.name}`;
      isPaired = true;
    }
  }
}
```

**Location:** `/supabase/functions/server/index.tsx` - Main Timetable endpoint (~line 24782)

---

## Database Schema Reference

### subject_pairs Table Structure:
```sql
CREATE TABLE subject_pairs (
  id UUID PRIMARY KEY,
  pair_name TEXT NOT NULL,
  subject_1_id UUID NOT NULL REFERENCES subjects(id),
  subject_2_id UUID NOT NULL REFERENCES subjects(id),
  department TEXT NOT NULL,
  level TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### timetable_time_slots Table Structure:
```sql
CREATE TABLE timetable_time_slots (
  id UUID PRIMARY KEY,
  timetable_settings_id UUID REFERENCES timetable_settings(id),
  slot_name TEXT NOT NULL,
  start_period INTEGER,
  end_period INTEGER,
  start_time TEXT,
  end_time TEXT,
  subject_config_id UUID REFERENCES subject_configs(id),  -- For single subjects
  pairs_id UUID REFERENCES subject_pairs(id),              -- For paired subjects
  teacher_id UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## How Paired Subjects Work Now

### 1. **Timetable Generation:**
- When a paired subject is assigned to a slot, the `pairs_id` is set
- `pairs_id` references `subject_pairs.id`
- Each pair has two subjects: `subject_1_id` and `subject_2_id`

### 2. **Display Logic:**
```
IF slot has pairs_id:
  1. Fetch pair from subject_pairs table
  2. Get subject_1_id and subject_2_id
  3. Fetch both subject names from subjects table
  4. Display as: "Subject1/Subject2"
ELSE IF slot has subject_config_id:
  1. Fetch single subject from subject_configs
  2. Display subject name normally
ELSE:
  Display "Free Period"
```

### 3. **Example:**
```
Paired Subject: Yoruba/Igbo
- subject_pairs.id = "abc-123"
- subject_1_id = "yoruba-id" -> subjects.name = "Yoruba"
- subject_2_id = "igbo-id" -> subjects.name = "Igbo"
- Displayed as: "Yoruba/Igbo"
```

---

## What Was Fixed

### Before:
✗ JSS1 students saw: "Yoruba" (only one subject)  
✗ SS1 admin view showed: merged or incorrect subjects  
✗ Teacher view showed: only one subject from pair  

### After:
✅ JSS1 students see: "Yoruba/Igbo" (both subjects)  
✅ SS1 admin view shows: correct paired subjects  
✅ Teacher view shows: "Subject1/Subject2" for all pairs  
✅ Subject codes also show as: "YOR/IGB"  

---

## Affected Endpoints

1. **GET** `/student-timetable` - Student timetable view
   - Fixed to check `pairs_id` first
   - Fetches both subjects from `subject_pairs` table
   - Displays as "Subject1/Subject2"

2. **GET** `/timetable` - Admin/Teacher timetable view
   - Fixed to use `subject_pairs` table instead of old `subject_pairings`
   - Fetches both subjects correctly
   - Displays as "Subject1/Subject2"

---

## Testing Confirmed

### Test Case 1: JSS1 Student with Yoruba/Igbo Pair
**Before:** Timetable showed only "Yoruba"  
**After:** Timetable shows "Yoruba/Igbo"

### Test Case 2: SS1 Admin View
**Before:** Subjects appeared merged or incorrect  
**After:** Paired subjects display correctly as "Subject1/Subject2"

### Test Case 3: All Paired Subjects
**Before:** Only first subject in pair was shown  
**After:** Both subjects shown with "/" separator

---

## Code Changes Summary

### File: `/supabase/functions/server/index.tsx`

**1. Student Timetable Endpoint (line ~17392):**
- Added check for `slot.pairs_id`
- Query `subject_pairs` table for both subject IDs
- Fetch both subjects and combine names with "/"
- Falls back to single subject if no `pairs_id`

**2. Main Timetable Endpoint (line ~24782):**
- Updated `pairs_id` handling logic
- Changed from `subject_pairings` to `subject_pairs` table
- Query for `subject_1_id` and `subject_2_id`
- Fetch both subject names and combine with "/"

---

## Impact

### Components Affected:
1. ✅ Student Dashboard - Timetable page
2. ✅ Admin Dashboard - Timetable view
3. ✅ Teacher Dashboard - Timetable view
4. ✅ All class views (JSS1, JSS2, JSS3, SS1, SS2, SS3)

### Features Fixed:
1. ✅ Paired subject display for students
2. ✅ Paired subject display for teachers
3. ✅ Paired subject display for admins
4. ✅ Subject code display for paired subjects
5. ✅ Consistent formatting across all views

---

## Best Practices Applied

1. **Check `pairs_id` First:** Always check if a slot has `pairs_id` before checking `subject_config_id`
2. **Use Correct Table:** Use `subject_pairs` (not `subject_pairings`)
3. **Fetch Both Subjects:** Query both `subject_1_id` and `subject_2_id`
4. **Format Consistently:** Always use "/" to separate paired subject names
5. **Handle Codes:** Also combine subject codes (e.g., "YOR/IGB")

---

## Summary

All paired subjects now display correctly across all dashboards (student, teacher, admin) and all class levels. The fix ensures that when subjects are paired (like Yoruba/Igbo, French/Arabic, etc.), both subjects are shown with a "/" separator, making it clear to users which subjects are taught in that period.

**Formula:** `Display Name = Subject1.name + "/" + Subject2.name`

The timetable system is now fully functional for paired subjects!
