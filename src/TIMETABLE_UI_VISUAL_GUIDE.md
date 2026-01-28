# 🎨 Timetable UI - Visual Guide

## 📸 What You'll See

### Main Module - Tabs

```
┌────────────────────────────────────────────────────────────────────────┐
│  🕐 Timetable Management                        [Settings] [Edit] [Publish] │
│  Manage school timetables, schedules, and assignments                  │
├────────────────────────────────────────────────────────────────────────┤
│  Tabs:                                                                 │
│  [View] [Generate] [📚 Subjects] [👥 Teachers] [🏫 Classes] [🔗 Pairs] │
│  [Teacher View] [Student View]                                        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 1️⃣ Subjects Manager UI

```
┌────────────────────────────────────────────────────────────────────────┐
│  📚 Subjects Master List                              [+ Add Subject]  │
│  Manage all subjects with Nigerian school settings                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Mathematics                [MATH] [Major] [SS1-3]                │ │
│  │                                                                  │ │
│  │ Periods/Week: 5      Double Periods: —      Preferred: Morning  │ │
│  │                                                   [Edit] [Delete] │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Physics                    [PHY] [Major] [SS1-3] [Science]      │ │
│  │                                                                  │ │
│  │ Periods/Week: 4      Double Periods: Max 1/week  Preferred: Any │ │
│  │                                                   [Edit] [Delete] │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Civic Education            [CIV] [JSS1-3]                        │ │
│  │                                                                  │ │
│  │ Periods/Week: 2      Double Periods: —      Preferred: Afternoon │ │
│  │                                                   [Edit] [Delete] │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Add/Edit Subject Form

```
┌────────────────────────────────────────────────────────────────────────┐
│  Add New Subject                                                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  Subject Name: [Mathematics        ]  Subject Code: [MATH      ]      │
│                                                                        │
│  Level: [Senior (SS1-3) ▼]  Type: [General ▼]  Department: [—]       │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  ✓ Major Subject                                             │   │
│  │    Major subjects typically get more periods per week          │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Min Periods/Week: [5]          Max Periods/Week: [5]                 │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  ☐ Allow Double Periods                                        │   │
│  │    Can this subject have consecutive periods?                  │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Preferred Time Slots: [Morning (Better Focus) ▼]                     │
│                                                                        │
│                                           [Cancel] [Create Subject]    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 2️⃣ Teachers Manager UI with Availability Grid

```
┌────────────────────────────────────────────────────────────────────────┐
│  👥 Teachers Master List                              [+ Add Teacher]  │
│  Manage teachers with availability and preferences                    │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ John Smith                        [Part-Time (high)]             │ │
│  │                                                                  │ │
│  │ Max Periods: 12/week, 4/day    Subjects: 3 qualified            │ │
│  │ Preferred Classes: 2 selected  Conflicts: 1 teacher(s)          │ │
│  │                                                          [Edit]  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ Jane Doe                                                         │ │
│  │                                                                  │ │
│  │ Max Periods: 20/week, 6/day    Subjects: 5 qualified            │ │
│  │                                                          [Edit]  │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

### Add/Edit Teacher Form with VISUAL AVAILABILITY GRID

```
┌────────────────────────────────────────────────────────────────────────┐
│  Add New Teacher                                                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  First Name: [John    ]  Last Name: [Smith   ]  Email: [john@...]    │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │  ✓ Part-Time Teacher                                           │   │
│  │    Part-time teachers have priority scheduling                 │   │
│  │                                                                 │   │
│  │    Scheduling Priority: [High (Schedule First) ▼]              │   │
│  └────────────────────────────────────────────────────────────────┘   │
│                                                                        │
│  Max Periods/Week: [12]           Max Periods/Day: [4]                │
│                                                                        │
│  Qualified Subjects:                                                  │
│  ☑ Mathematics    ☑ Physics       ☐ Chemistry                        │
│  ☐ Biology        ☐ English       ☐ Literature                       │
│                                                                        │
│  Weekly Availability    [Apply preset: Full Week ▼]                   │
│  Click cells to toggle availability for each period                   │
│                                                                        │
│  ┌────────────────────────────────────────────────────────────────┐   │
│  │ Period │ Monday │ Tuesday │ Wednesday │ Thursday │ Friday      │   │
│  ├────────┼────────┼─────────┼───────────┼──────────┼─────────────┤   │
│  │   1    │   ✓    │    ✓    │     ✓     │    ✓     │     ✓       │   │
│  │   2    │   ✓    │    ✓    │     ✓     │    ✓     │     ✓       │   │
│  │   3    │   ✓    │         │     ✓     │    ✓     │     ✓       │   │
│  │   4    │   ✓    │         │     ✓     │    ✓     │     ✓       │   │
│  │   5    │        │         │           │    ✓     │             │   │
│  │   6    │        │         │           │    ✓     │             │   │
│  │   7    │        │         │           │    ✓     │             │   │
│  │   8    │        │         │           │    ✓     │             │   │
│  │   9    │        │         │           │    ✓     │             │   │
│  │   10   │        │         │           │    ✓     │             │   │
│  └────────────────────────────────────────────────────────────────┘   │
│  ✓ = Available  Gray = Not applicable  Thu: 10 periods, Fri: 7       │
│                                                                        │
│  Preferred Classes (Optional):                                        │
│  ☑ SS2A    ☐ SS2B    ☑ SS3A    ☐ SS3B                                │
│                                                                        │
│  Cannot Teach Same Period As (Conflicts):                             │
│  ☐ Jane Doe    ☑ David Lee    ☐ Sarah Wilson                         │
│                                                                        │
│                                           [Cancel] [Create Teacher]    │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3️⃣ Classes Manager UI with Subject Assignment

```
┌────────────────────────────────────────────────────────────────────────┐
│  🏫 Classes & Subject Assignments                      [+ Add Class]   │
│  Manage classes and assign subjects with periods                      │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ SS2 Science          [SS] [Science] [6 subjects]                 │ │
│  │                                      [Manage Subjects] [Edit]    │ │
│  │                                                                  │ │
│  │  ┌────────────────── Available Subjects (8) ──────────────────┐ │ │
│  │  │                                                             │ │ │
│  │  │  ☑ Mathematics            [Major]         Periods/Week: [5] │ │ │
│  │  │    Default: 5 periods/week                                 │ │ │
│  │  │                                                             │ │ │
│  │  │  ☑ English                [Major]         Periods/Week: [4] │ │ │
│  │  │    Default: 4 periods/week                                 │ │ │
│  │  │                                                             │ │ │
│  │  │  ☑ Physics          [Major] [Science]     Periods/Week: [4] │ │ │
│  │  │    Default: 4 periods/week                                 │ │ │
│  │  │                                                             │ │ │
│  │  │  ☑ Chemistry        [Major] [Science]     Periods/Week: [4] │ │ │
│  │  │    Default: 4 periods/week                                 │ │ │
│  │  │                                                             │ │ │
│  │  │  ☑ Biology          [Major] [Science]     Periods/Week: [4] │ │ │
│  │  │    Default: 4 periods/week                                 │ │ │
│  │  │                                                             │ │ │
│  │  │  ☐ Further Math     [Science]                              │ │ │
│  │  │    Default: 3 periods/week                                 │ │ │
│  │  │                                                             │ │ │
│  │  │  ☑ Civic Education                        Periods/Week: [2] │ │ │
│  │  │    Default: 2 periods/week                                 │ │ │
│  │  │                                                             │ │ │
│  │  │  ☐ Literature       [Arts]      (Not for Science class)    │ │ │
│  │  │  ☐ Commerce         [Commercial] (Not for Science class)   │ │ │
│  │  └─────────────────────────────────────────────────────────────┘ │ │
│  └──────────────────────────────────────────────────────────────────┘ │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐ │
│  │ JSS1A                [JSS] [4 subjects]                          │ │
│  │                                      [Manage Subjects] [Edit]    │ │
│  └──────────────────────────────────────────────────────────────────┘ │
└────────────────────────────────────────────────────────────────────────┘
```

**Smart Filtering:**
- ✅ SS2 Science → Shows General + Science subjects ONLY
- ✅ SS2 Arts → Shows General + Arts subjects ONLY
- ✅ JSS1A → Shows all Junior subjects
- ✅ Grayed out subjects not applicable to class department

---

## 4️⃣ Subject Pairs Manager UI

```
┌────────────────────────────────────────────────────────────────────────┐
│  🔗 Subject Pairs (Departmental)                      [+ Add Pair]     │
│  Define subject pairings for senior departments                       │
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│  ┌────────────────────────────────┐  ┌───────────────────────────────┐│
│  │ Physics-Chemistry              │  │ Biology-Chemistry             ││
│  │ [SS] [Science]                 │  │ [SS] [Science]                ││
│  │                                │  │                               ││
│  │ Subjects: Physics + Chemistry  │  │ Subjects: Biology + Chemistry ││
│  │ Core science pair for SS1-3    │  │ Alternative science pair      ││
│  │                  [Edit] [Delete]│  │                  [Edit] [Delete]││
│  └────────────────────────────────┘  └───────────────────────────────┘│
│                                                                        │
│  ┌────────────────────────────────┐  ┌───────────────────────────────┐│
│  │ Literature-Government          │  │ Economics-Commerce            ││
│  │ [SS] [Arts]                    │  │ [SS] [Commercial]             ││
│  │                                │  │                               ││
│  │ Subjects: Literature + Govt    │  │ Subjects: Economics + Commerce││
│  │ Core arts pair                 │  │ Core commercial pair          ││
│  │                  [Edit] [Delete]│  │                  [Edit] [Delete]││
│  └────────────────────────────────┘  └───────────────────────────────┘│
└────────────────────────────────────────────────────────────────────────┘
```

---

## 🎨 Color Coding

### Badges

```
[Major]           → Blue background, blue text (is_major = true)
[JSS1-3]          → Gray background (level = junior)
[SS1-3]           → Default/dark (level = senior)
[Science]         → Purple background (department = Science)
[Arts]            → Purple background (department = Arts)
[Commercial]      → Purple background (department = Commercial)
[Part-Time]       → Orange background (is_part_time = true)
[High/Med/Low]    → Inside part-time badge (slot_priority)
[MATH]            → Outlined (subject code)
```

### UI States

```
✓ Green cell      → Available period (teachers availability grid)
  White cell      → Not available (click to toggle)
  Gray cell       → Not applicable (Thu period 11, Fri period 8+)

✓ Green border    → Assigned subject (classes manager)
  White border    → Unassigned subject

[Edit] button     → Outline, blue on hover
[Delete] button   → Outline, red on hover
[Save] button     → Primary blue, solid
[Cancel] button   → Outline, gray
```

---

## 📱 Responsive Design

All components are responsive:

- **Desktop:** Full multi-column layout
- **Tablet:** 2-column layout
- **Mobile:** Single column, stacked
- **Availability Grid:** Horizontal scroll on mobile

---

## ✨ Interactive Features

### Click Actions

1. **Subject Cards:** Click [Edit] to modify, [Delete] to remove
2. **Teacher Availability Grid:** Click any cell to toggle availability
3. **Class Subject Assignment:** Check/uncheck to assign/unassign
4. **Period Inputs:** Type new value, auto-saves on blur
5. **Dropdown Presets:** Select preset, immediately applies

### Visual Feedback

- **Toast Notifications:** Success/error messages
- **Loading States:** Buttons show "Loading..." while saving
- **Hover Effects:** All clickable elements have hover states
- **Badge Indicators:** Color-coded for quick scanning

---

## 🎯 Workflow Example

### Adding a New Subject

```
1. Click "Subjects" tab
2. Click [+ Add Subject]
3. Form appears with all fields
4. Fill in: Mathematics, MATH, Senior, General, Major, 5/5 periods, Morning
5. Click [Create Subject]
6. Toast: "Subject created!" ✓
7. New subject appears in list with badges
8. Can immediately [Edit] or continue adding more
```

### Setting Up Teacher Availability

```
1. Click "Teachers" tab
2. Click [+ Add Teacher]
3. Fill basic info
4. Toggle "Part-Time Teacher" ON
5. Set priority to "High"
6. Select "Morning Only" preset → Grid auto-fills
7. Click periods 3-4 on Tuesday to remove (they turn white)
8. Check qualified subjects: Math, Physics
9. Click [Create Teacher]
10. Toast: "Teacher created!" ✓
11. List shows: "Part-Time (high)" badge
```

### Assigning Subjects to Class

```
1. Click "Classes" tab
2. Click [+ Add Class]
3. Name: SS2 Science, Level: Senior, Department: Science
4. Click [Create Class]
5. Class appears in list
6. Click [Manage Subjects]
7. Expandable section shows filtered subjects
8. See: Math, English, Physics, Chemistry, Biology, Civic (✓ relevant)
9. Don't see: Literature, Commerce (✗ not for Science)
10. Check boxes for subjects to assign
11. Adjust periods if needed (default is auto-filled)
12. Uncheck to remove
13. Changes save automatically
```

---

## 🚀 Performance Features

- ✓ Lazy loading of data
- ✓ Debounced auto-save for period inputs
- ✓ Optimistic UI updates
- ✓ Client-side validation before API calls
- ✓ Cached subject/class lists
- ✓ Minimal re-renders

---

## 📖 User Experience Highlights

### 1. **Smart Defaults**
- Period counts default to subject settings
- Availability presets for common patterns
- Auto-fills based on level/department

### 2. **Inline Editing**
- No modal overload
- Edit in place where possible
- Immediate visual feedback

### 3. **Progressive Disclosure**
- Expandable sections (class subjects)
- Show fields only when relevant (department for senior)
- Hide complexity until needed

### 4. **Validation**
- Real-time validation
- Helpful error messages
- Prevents invalid states

### 5. **Visual Hierarchy**
- Clear headings
- Badge system for metadata
- Consistent spacing
- Color coding

---

## ✅ Complete Feature Checklist

- [x] Subject management with ALL Nigerian school fields
- [x] Teacher management with visual availability grid
- [x] Class creation with department support
- [x] Automatic subject filtering per class
- [x] Subject assignment with period configuration
- [x] Subject pairs for departments
- [x] Part-time teacher priority settings
- [x] Conflict management (cannot teach same period)
- [x] Preferred classes selection
- [x] Time slot preferences
- [x] Major/minor subject flags
- [x] Double period configuration
- [x] Min/max periods constraints
- [x] Availability presets
- [x] Responsive design
- [x] Toast notifications
- [x] Loading states
- [x] Validation
- [x] Color-coded badges

**ALL FEATURES IMPLEMENTED!** 🎉

---

Your timetable system is now fully equipped with an intuitive, professional UI for complete Nigerian school management!
