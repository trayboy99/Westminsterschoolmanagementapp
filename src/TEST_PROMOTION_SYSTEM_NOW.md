# 🎓 Test Promotion System - Quick Start (5 Minutes)

## Step 1: Run Database Migration (1 minute)

1. **Open Supabase Dashboard** → SQL Editor
2. **Copy and paste** the contents of `/ADD_PROMOTION_SYSTEM_COLUMNS.sql`
3. **Click "Run"**
4. **✅ Verify:** You should see success message and classes with hierarchy_order

---

## Step 2: Configure Class Hierarchy (2 minutes)

1. **Login as IT Admin or Principal**
2. **Go to:** Dashboard → **Settings**
3. **Click:** "Class Hierarchy" tab
4. **You should see** all your classes listed with move buttons

5. **Arrange classes** from lowest to highest:
   ```
   Example:
   1. JSS1    ▲▼
   2. JSS2    ▲▼
   3. JSS3    ▲▼
   4. SS1     ▲▼
   5. SS2     ▲▼
   6. SS3     ▲▼
   ```

6. **Click "Save Hierarchy"**
7. **✅ Verify:** Toast shows "Class hierarchy saved successfully!"

---

## Step 3: Test Promotion (2 minutes)

1. **Go to:** Dashboard → **Promotions**
2. **You should see:**
   - Current session (e.g., 2024/2025)
   - New session field (e.g., 2025/2026)
   - All classes listed with student counts

3. **Set new session:** Type `2025/2026` (or next year)

4. **Review the promotion UI:**
   ```
   JSS1 (45 students) → JSS2     [Promote]
   ✅ Section matching preserved
   
   JSS2 (42 students) → JSS3     [Promote]
   ✅ Section matching preserved
   
   ...
   
   SS3 (38 students) → Graduated [Graduate] 🎓
   📄 Transcript access enabled
   ```

5. **Click "Promote"** on one class (start with lowest class)
6. **Confirm** the dialog
7. **✅ Verify:**
   - Toast: "✅ X students promoted to [Class]!"
   - Student count updates
   - Students appear in new class

---

## Step 4: Verify Students Moved

1. **Go to:** Dashboard → **Students**
2. **Filter by the NEW class** (e.g., JSS2)
3. **✅ Verify:** Students who were in JSS1 now show in JSS2

4. **Check Class Teacher View:**
   - Login as a class teacher assigned to JSS2
   - Go to "My Class"
   - **✅ Verify:** Newly promoted students appear

---

## Step 5: Test Graduation

1. **Go back to:** Promotions (as admin)
2. **Click "Graduate"** on SS3
3. **Confirm** the dialog
4. **✅ Verify:**
   - Toast: "✅ X students graduated successfully!"
   - Student count for SS3 becomes 0

5. **Check Graduated Students:**
   ```sql
   -- In Supabase SQL Editor
   SELECT first_name, last_name, status, graduation_session
   FROM profiles
   WHERE status = 'graduated'
   ORDER BY last_name;
   ```

6. **✅ Expected Result:**
   ```
   | first_name | last_name | status    | graduation_session |
   |------------|-----------|-----------|-------------------|
   | John       | Doe       | graduated | 2025/2026         |
   | Jane       | Smith     | graduated | 2025/2026         |
   ```

---

## ✅ Success Checklist

- [ ] Database migration completed
- [ ] Class hierarchy configured and saved
- [ ] At least one class promoted successfully
- [ ] Students appear in new class
- [ ] Class teacher sees new students
- [ ] SS3 students graduated successfully
- [ ] Graduated students have correct status in database

---

## 🎯 What to Look For

### **In Browser Console (F12):**
```
[Promotion] Promoting students: { from_class_id: "...", to_class_id: "...", ... }
[Promotion] Found X students to promote
[Promotion] ✅ Promoted X students to new class
[Promotion] Invalidating attendance caches...
```

### **In Database:**
```sql
-- Check class hierarchy
SELECT name, level, hierarchy_order 
FROM classes 
ORDER BY hierarchy_order;

-- Check student status
SELECT 
  status,
  COUNT(*) as count
FROM profiles
WHERE role = 'student'
GROUP BY status;

-- Check promoted students
SELECT 
  p.first_name,
  p.last_name,
  c.name as current_class,
  p.status
FROM profiles p
LEFT JOIN classes c ON p.class_id = c.id
WHERE p.role = 'student'
ORDER BY c.hierarchy_order;
```

---

## 🚨 Common Issues

### **Issue 1: "No classes found"**
**Solution:** Create classes first in Classes Manager

### **Issue 2: Hierarchy not saving**
**Solution:** 
- Check browser console for errors
- Verify you're logged in as admin
- Run migration SQL again

### **Issue 3: Promote button disabled**
**Solution:**
- Check if class has students (student_count > 0)
- Verify no other promotion is in progress
- Refresh the page

### **Issue 4: Students not appearing in new class**
**Solution:**
- Refresh the class teacher's dashboard
- Check SQL: `SELECT class_id FROM profiles WHERE id = 'student-id'`
- Verify promotion success in browser console

---

## 📊 Expected Database Changes

### **Before Promotion:**
```sql
-- JSS1 students
class_id: "jss1-uuid"
status: "active"
graduation_session: null
```

### **After Promotion (JSS1 → JSS2):**
```sql
-- Former JSS1 students
class_id: "jss2-uuid"  -- CHANGED
status: "active"
graduation_session: null
```

### **After Graduation (SS3):**
```sql
-- Former SS3 students
class_id: null  -- CHANGED
status: "graduated"  -- CHANGED
graduation_session: "2025/2026"  -- CHANGED
```

---

## 🎓 Next Steps After Testing

1. **Document the process** for your school's workflow
2. **Train administrators** on using the promotion system
3. **Set a promotion date** (typically after term 3 results)
4. **Communicate with teachers** about the timing
5. **Backup database** before mass promotion
6. **Promote all classes** at the start of new session

---

## 💡 Pro Tips

1. **Start from lowest class** (JSS1) and work upward
2. **Promote one class at a time** to monitor results
3. **Check student counts** before and after each promotion
4. **Keep browser console open** to see detailed logs
5. **Don't close browser** until all promotions complete

---

## 📞 Support

If you encounter issues:

1. **Check browser console** (F12) for error messages
2. **Check Supabase logs** in Supabase Dashboard
3. **Verify migration** ran successfully
4. **Review** `/STUDENT_PROMOTION_SYSTEM_COMPLETE.md` for details

---

**Testing Time:** ~5 minutes
**Status:** Ready to test ✅
**Next:** Run Step 1 in Supabase SQL Editor!
