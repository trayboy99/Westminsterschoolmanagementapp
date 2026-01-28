# ✅ Timetable System - Quick Start Checklist

## 🎯 Complete Setup in 3 Steps

### ☐ Step 1: Database Setup (5 minutes)

1. **First-time setup:**
   ```bash
   # Run in Supabase SQL Editor
   /FIX_ALL_TIMETABLE_ERRORS_NOW.sql
   ```
   This creates the basic timetable tables.

2. **Enhanced features:**
   ```bash
   # Run in Supabase SQL Editor
   /TIMETABLE_ENHANCED_SCHEMA.sql
   ```
   This adds all Nigerian school fields and new tables.

3. **Verify:**
   - Check subjects table has new columns (level, type, department, is_major, etc.)
   - Check profiles table has teacher fields (is_part_time, slot_priority, etc.)
   - Check new tables exist (subject_pairs, departmental_requirements, teacher_availability_presets)

---

### ☐ Step 2: Frontend Ready (Already Done! ✓)

**4 New Components Created:**
- ✅ `/components/timetable/SubjectsManagerEnhanced.tsx`
- ✅ `/components/timetable/TeachersManagerEnhanced.tsx`
- ✅ `/components/timetable/ClassesManagerEnhanced.tsx`
- ✅ `/components/timetable/SubjectPairsManager.tsx`

**Module Updated:**
- ✅ `/components/timetable/TimetableModule.tsx` (added 4 new tabs)

**Types Updated:**
- ✅ `/types/timetable.ts` (all enhanced types)

**Backend Updated:**
- ✅ `/supabase/functions/server/index.tsx` (4 new endpoints)

**Everything is ready to use!**

---

### ☐ Step 3: Data Entry (30-60 minutes)

#### A. Add Subjects (10-15 min)

**Navigate to:** Timetable → **Subjects** tab

**Junior Subjects** (Create these first):
- [ ] Mathematics (Major, 5 periods, Morning)
- [ ] English (Major, 4 periods, Morning)
- [ ] Basic Science (Major, 4 periods, Morning)
- [ ] Civic Education (Minor, 2 periods, Afternoon)
- [ ] Computer Studies (Minor, 2 periods, Any)

**Senior General Subjects:**
- [ ] Mathematics (Senior, General, Major, 4-5 periods)
- [ ] English (Senior, General, Major, 4 periods)

**Senior Science Subjects:**
- [ ] Physics (Senior, Departmental-Science, Major, 4 periods, Double allowed)
- [ ] Chemistry (Senior, Departmental-Science, Major, 4 periods, Double allowed)
- [ ] Biology (Senior, Departmental-Science, Major, 4 periods, Double allowed)
- [ ] Further Mathematics (Senior, Departmental-Science, Minor, 3 periods)

**Senior Arts Subjects:**
- [ ] Literature (Senior, Departmental-Arts, Major, 4 periods)
- [ ] Government (Senior, Departmental-Arts, Major, 3 periods)
- [ ] Economics (Senior, Departmental-Arts, Major, 3 periods)
- [ ] CRK (Senior, Departmental-Arts, Minor, 2 periods)

**Senior Commercial Subjects:**
- [ ] Accounting (Senior, Departmental-Commercial, Major, 4 periods)
- [ ] Commerce (Senior, Departmental-Commercial, Major, 4 periods)
- [ ] Business Studies (Senior, Departmental-Commercial, Major, 3 periods)

---

#### B. Add Teachers (10-15 min)

**Navigate to:** Timetable → **Teachers** tab

**Full-Time Teachers:**
- [ ] Create 3-5 full-time teachers
  - is_part_time: OFF
  - max_periods_per_week: 20
  - max_periods_per_day: 6
  - availability: Full Week preset
  - qualified_subjects: Select 2-3 subjects each

**Part-Time Teachers:**
- [ ] Create 2-3 part-time teachers
  - is_part_time: ON
  - slot_priority: High (for most constrained)
  - max_periods_per_week: 8-12
  - max_periods_per_day: 3-4
  - availability: Click specific periods only
  - qualified_subjects: Select 1-2 subjects

---

#### C. Create Classes (5-10 min)

**Navigate to:** Timetable → **Classes** tab

**Junior Classes:**
- [ ] JSS1A (Junior)
- [ ] JSS2A (Junior)
- [ ] JSS3A (Junior)

**Senior Science Classes:**
- [ ] SS1 Science (Senior, Department: Science)
- [ ] SS2 Science (Senior, Department: Science)
- [ ] SS3 Science (Senior, Department: Science)

**Senior Arts Classes:**
- [ ] SS1 Arts (Senior, Department: Arts)
- [ ] SS2 Arts (Senior, Department: Arts)
- [ ] SS3 Arts (Senior, Department: Arts)

**Senior Commercial Classes:**
- [ ] SS1 Commercial (Senior, Department: Commercial)
- [ ] SS2 Commercial (Senior, Department: Commercial)
- [ ] SS3 Commercial (Senior, Department: Commercial)

---

#### D. Assign Subjects to Classes (15-20 min)

**Navigate to:** Timetable → **Classes** tab

**For each class:**
1. [ ] Click "Manage Subjects"
2. [ ] Check boxes for relevant subjects (auto-filtered!)
3. [ ] Adjust periods/week if needed
4. [ ] Major subjects: 4-5 periods
5. [ ] Minor subjects: 2-3 periods

**Example for SS2 Science:**
- ✓ Mathematics (5 periods)
- ✓ English (4 periods)
- ✓ Physics (4 periods)
- ✓ Chemistry (4 periods)
- ✓ Biology (4 periods)
- ✓ Civic Education (2 periods)
- ✗ Literature (not shown - Arts subject)
- ✗ Commerce (not shown - Commercial subject)

---

#### E. Create Subject Pairs (5 min) - Optional

**Navigate to:** Timetable → **Subject Pairs** tab

**Science Pairs:**
- [ ] Physics-Chemistry (Science, Senior)
- [ ] Biology-Chemistry (Science, Senior)

**Arts Pairs:**
- [ ] Literature-Government (Arts, Senior)

**Commercial Pairs:**
- [ ] Economics-Commerce (Commercial, Senior)

---

## 🚀 After Setup

### Configure Timetable Settings

**Navigate to:** Timetable → Click **[Settings]** button (top-right)

1. [ ] Set Academic Year and Term
2. [ ] Configure daily schedules
   - Monday-Wednesday: 8 periods
   - Thursday: 10 periods (8 academic + 2 co-curricular)
   - Friday: 7 periods (4 academic + 1 note check + 2 sports)
3. [ ] Add breaks
   - Morning Break (after period 3, 15 min)
   - Lunch Break (after period 6, 30 min)
4. [ ] Set special Thursday/Friday rules
5. [ ] Click **Save Settings**

---

### Generate Timetable

**Navigate to:** Timetable → **Generate** tab

1. [ ] Click **"Generate Timetable"**
2. [ ] Wait for algorithm to complete (~30 seconds)
3. [ ] Review conflicts and warnings
4. [ ] Adjust if needed
5. [ ] Click **"Publish"** when satisfied

---

## 🎓 What You Get

### Automatic Features

✅ **Part-Time Teachers Scheduled First**
- High priority teachers get best available slots
- Respects their limited availability

✅ **Major Subjects Prioritized**
- Mathematics, English, Sciences scheduled early
- Gets preferred time slots (morning)

✅ **Smart Conflict Avoidance**
- No teacher double-booking
- Respects "cannot teach same period as" settings
- Checks teacher availability

✅ **Double Periods Handled**
- Only appears once per week (as configured)
- Reserved for appropriate subjects

✅ **Thursday/Friday Special Rules**
- Thursday: 8 academic + 2 co-curricular periods
- Friday: 4 academic + note check + 2 sports

✅ **Department Filtering**
- Science classes only get Science + General subjects
- Arts classes only get Arts + General subjects
- Junior classes get all junior subjects

---

## 📊 Feature Coverage

### C. Subjects ✅
- [x] subject_id, name
- [x] level (junior/senior)
- [x] type (general/departmental)
- [x] department (Science/Arts/Commercial)
- [x] is_major (bool)
- [x] min_periods_per_week (int)
- [x] max_periods_per_week (int)
- [x] double_period_allowed (bool)
- [x] double_period_max_per_week (int)
- [x] preferred_time_slots (morning/afternoon)

### D. Subject Pairs ✅
- [x] subject_pair creation
- [x] departmental mapping
- [x] compulsory subjects per department

### E. Classes ✅
- [x] class_id (e.g., JSS1, SS1 Science)
- [x] level (junior/senior)
- [x] department (for senior)
- [x] required subjects list
- [x] periods_per_week per subject

### F. Teachers ✅
- [x] teacher_id, name
- [x] is_part_time (bool)
- [x] qualified_subjects (list)
- [x] max_periods_per_week (cap)
- [x] max_periods_per_day (cap)
- [x] availability (day-level + period indexes)
- [x] weekly matrix UI (5 days × 10 periods)
- [x] preferred_classes (optional)
- [x] cannot_teach_same_period_as (conflicts)

### G. Part-Time Teachers ✅
- [x] day-level availability (mandatory)
- [x] slot_priority (high/medium/low)

---

## 📖 Documentation Files

- `/TIMETABLE_FRONTEND_COMPLETE_GUIDE.md` - Complete setup guide
- `/TIMETABLE_UI_VISUAL_GUIDE.md` - Visual mockups of UI
- `/TIMETABLE_ENHANCED_COMPLETE_GUIDE.md` - Backend/database guide
- `/TEST_TIMETABLE_AUTOMATION_NOW.md` - Algorithm testing guide

---

## ✅ Final Checklist

- [ ] Database migration completed
- [ ] Subjects created with all fields
- [ ] Teachers added with availability
- [ ] Classes created with departments
- [ ] Subjects assigned to classes
- [ ] Subject pairs defined (optional)
- [ ] Timetable settings configured
- [ ] Test generation run
- [ ] Conflicts resolved
- [ ] Timetable published

---

## 🎉 You're Done!

Your Nigerian school timetable system is now:

✅ Fully functional  
✅ All features implemented  
✅ Database configured  
✅ UI ready to use  
✅ Ready for automatic generation  

**Time to first generated timetable: ~60 minutes from scratch!**

Enjoy your automated timetable system! 🚀
