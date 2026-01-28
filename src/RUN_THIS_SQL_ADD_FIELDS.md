# ⚡ Quick Start - Add Student/Teacher Fields

## 1️⃣ Run This SQL File

```
File: /ADD_MISSING_STUDENT_TEACHER_COLUMNS.sql
```

**Copy entire file** → **Paste in Supabase SQL Editor** → **Run**

---

## 2️⃣ What It Does

Adds 4 columns to profiles table:

✅ `admission_number` - Auto-generated (ADM2025001)  
✅ `phone` - For students & teachers  
✅ `gender` - Male/Female (students only)  
✅ `date_of_birth` - Birth date (students only)  

**Note:** `is_part_time` already exists! ✅

---

## 3️⃣ Test It

### Register a Student:
1. Go to Registration → Select Student
2. Fill new fields:
   - **Gender:** Male or Female
   - **Date of Birth:** Pick a date
   - **Student Phone:** (optional)
3. Submit
4. IT Admin approves
5. Check database:
   ```sql
   SELECT admission_number, gender, date_of_birth, phone 
   FROM profiles WHERE role='student' 
   ORDER BY admission_number DESC LIMIT 1;
   ```
   **Expected:** `admission_number: ADM2025001` (auto-generated!)

### Register a Teacher:
1. Go to Registration → Select Teacher
2. Fill new fields:
   - **Phone Number:** (optional)
   - **Employment Type:** Full-time or Part-time
3. Submit
4. IT Admin approves
5. Check database:
   ```sql
   SELECT phone, is_part_time 
   FROM profiles WHERE role='teacher' 
   ORDER BY created_at DESC LIMIT 1;
   ```
   **Expected:** `is_part_time: TRUE` (if you selected Part-time)

---

## 4️⃣ Done! ✅

All changes are live:
- ✅ Database columns added
- ✅ Registration forms updated
- ✅ Backend auto-generation working
- ✅ No errors expected

---

## 📚 Full Guides

For detailed info, see:
- `/ADD_STUDENT_TEACHER_FIELDS_COMPLETE_GUIDE.md` - Full implementation guide
- `/STUDENT_TEACHER_FIELDS_VISUAL.md` - Visual diagrams

---

**You asked, we delivered!** 🎉
