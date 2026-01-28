# SS1 Further Maths Timetable Fix

## Problem Identified

The debug output revealed the root cause of why SS1 Further Maths slots aren't displaying:

**SS1 Further Maths Subject Configs: 0**  
**SS1 Timetable Slots: 0**  
**Further Maths Slots: -** (empty)

### Root Cause
There are **NO subject configurations** for Further Maths in SS1 classes. The `subject_configs` table is missing the entries that map the Further Maths subject to SS1 class sections.

While Further Maths appears for SS2 and SS3 (because configs exist for those classes), SS1 was never configured.

## Solution Implemented

Enhanced the **TimetableDebugger** component with:

### 1. Problem Detection
- Checks if Further Maths subject exists in database
- Checks if SS1 classes exist
- Detects missing subject_configs linking them

### 2. Quick Fix Button
A one-click solution that automatically:
- Retrieves the Further Maths subject
- Gets all SS1 class IDs
- Creates a new `subject_configs` entry with:
  - All SS1 classes linked
  - Default teacher assignment (can be edited later)
  - 3 periods per week (min/max)
  - Double periods allowed
  - Marked as departmental subject (Science)
  - Marked as elective type

### 3. Diagnostic Display
Shows:
- ✅ Further Maths subject status
- ✅ SS1 classes count
- ⚠️ Subject configs count
- 📊 Timetable slots analysis

## How to Use

### Option 1: Quick Fix (Recommended)
1. Go to **Admin Dashboard** → **Timetable** → **Debug** tab
2. Look for the orange alert: "Problem Detected"
3. Click **"Quick Fix: Create Config"** button
4. Wait for success message
5. Click **Refresh** to verify the config was created
6. Go back to **Timetable Editor** and regenerate the timetable

### Option 2: Manual Configuration
1. Go to **Admin Dashboard** → **Timetable** → **Subjects Config** tab
2. Find "Further Maths" in the subject list
3. Click **"Configure"** button
4. Select all SS1 classes (SS1 Silver, SS1 Gold, etc.)
5. Add teacher assignments
6. Set periods per week: 3-3
7. Click **"Save Configuration"**

## After Creating Config

Once the subject configuration exists:
1. **Regenerate the timetable** in the Timetable Editor
2. The timetable generator will now:
   - See Further Maths as available for SS1 classes
   - Create time slots for SS1 Further Maths
   - Display properly in "View Timetables" tab

## Technical Details

**Database Table:** `subject_configs`  
**Key Fields:**
- `subject_id` - Links to Further Maths subject
- `class_ids` - Array of SS1 class UUIDs
- `teachers` - JSON array of teacher assignments
- `min_periods_per_week` / `max_periods_per_week` - Set to 3
- `is_departmental` - Set to `true` (Science elective)
- `type` - Set to `'elective'`

**Why This Matters:**
The timetable generator uses `subject_configs` to determine:
1. Which subjects should be scheduled for which classes
2. Which teachers can teach them
3. How many periods to allocate
4. Scheduling constraints and preferences

Without a config entry, the subject is invisible to the generator.
