# ⚡ Timetable Generation - Quick Fix

## The System IS Fully Automated! ✅

The timetable generator automatically:
- Schedules all subjects across Monday-Friday
- Assigns teachers to classes
- Respects paired subjects (same time slot)
- Avoids conflicts
- Handles part-time teacher availability

---

## Why You're Not Seeing Subjects (Most Common Issue)

### ❌ Problem: Classes Don't Have Subjects Assigned

**You probably created subjects BUT forgot to assign them to classes!**

---

## 🔥 5-Minute Fix

### Step 1: Assign Subjects to Classes (2 min)

1. **Go to:** Classes Management
2. **Click** any class (e.g., JSS 1A)
3. **Click:** "Assign Subjects" or "Manage Subjects" button
4. **Select subjects** and set periods:
   - Math: 4 periods/week
   - English: 5 periods/week
   - Biology: 4 periods/week
   - (etc.)
5. **Click:** "Save Assignments"
6. **Repeat** for all classes

---

### Step 2: Assign Qualified Subjects to Teachers (2 min)

1. **Go to:** Teachers Management
2. **Click "Edit"** on each teacher
3. **Scroll down** to "Qualified Subjects"
4. **Check the boxes** for subjects they can teach
5. **Click:** "Save"
6. **Repeat** for all teachers

---

### Step 3: Generate (1 min)

1. **Go to:** Timetable section
2. **Click:** "Generate Timetable" button
3. **Wait 3-5 seconds**
4. **See:** Complete timetable with all subjects scheduled Mon-Fri!

---

## 🔍 How to Check if It's Fixed

**Open Browser Console (F12) and look for:**

✅ **GOOD** (will work):
```
[TimetableEditor] Data processed:
  - Teachers: Mr. John (3 subjects), Mrs. Jane (5 subjects)
  - Subjects: Math (4 periods/week), English (5 periods/week)
  - Classes: JSS 1A (8 subjects), JSS 2A (10 subjects)
  - Settings: Loaded

[TimetableEditor] Generation complete:
  slots: 450  ← THIS SHOULD BE > 0!
```

❌ **BAD** (won't work):
```
[TimetableEditor] Data processed:
  - Classes: JSS 1A (0 subjects), JSS 2A (0 subjects)  ← PROBLEM!
  
[TimetableEditor] Generation complete:
  slots: 0  ← NO SLOTS GENERATED!
```

---

## 📋 Full Checklist

Before generating, make sure:

### ✅ Subjects Exist
- Go to **Timetable → Settings → Subjects** tab
- Should see: Math, English, Biology, etc.
- Each should have periods per week (e.g., 4)

### ✅ Classes Have Subjects Assigned
- Go to **Classes Management**
- Click each class → Click **"Assign Subjects"**
- Should see 8-12 subjects per class
- **THIS IS THE MOST COMMONLY MISSED STEP!**

### ✅ Teachers Have Qualified Subjects
- Go to **Teachers Management**
- Edit each teacher
- Check boxes in "Qualified Subjects" section

### ✅ Timetable Settings Configured
- Go to **Timetable → Settings → Days & Periods**
- Should see: Mon (8), Tue (8), Wed (8), Thu (10), Fri (7)

---

## 🎯 Expected Result

**After clicking "Generate Timetable":**

- Toast: "✅ Timetable generated successfully! 450 slots created"
- Scroll down → See timetable tables for each class
- Each table shows Mon-Fri with subjects and teachers
- All periods are filled (except special captions like "Break", "Sports")
- Paired subjects appear together in same time slot

---

## 💡 Pro Tips

### For Subject Pairing (Biology/Chemistry together)
1. Go to **Timetable → Settings → Pairs** tab
2. Drag Biology onto Chemistry
3. Click **"Save All Pairs"**
4. Generate timetable → They'll be scheduled together

### For "General" Subjects (Math, English for all students)
1. Go to **Timetable → Settings → Subjects Config** tab
2. Click on Math
3. Set department: **"general (for all students)"**
4. Click **"Save Subject"**
5. Now Math will appear for ALL classes regardless of department

---

## Still Not Working?

**Share these 3 things:**

1. **Screenshot** of Classes Management → (any class) → Assign Subjects page
2. **Console logs** (F12 → Console tab → copy the logs starting with `[TimetableEditor]`)
3. **What you see** when clicking "Generate Timetable" (error message, empty table, etc.)

---

## Summary

**The #1 issue:** You created subjects but forgot to assign them to classes!

**The fix:** Go to Classes Management → Click each class → Assign Subjects → Save

**Then:** Generate Timetable → Wait 3 seconds → See complete Mon-Fri schedule! ✅
