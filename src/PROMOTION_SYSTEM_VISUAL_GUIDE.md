# 🎓 Student Promotion System - Visual Guide

## 📱 User Interface Walkthrough

### **1. Settings → Class Hierarchy**

```
╔══════════════════════════════════════════════════════════════╗
║  Class Hierarchy                              [Save Hierarchy]║
╠══════════════════════════════════════════════════════════════╣
║  Define the progression order of classes for student promotion║
╠══════════════════════════════════════════════════════════════╣
║  ℹ️  How Class Hierarchy Works:                               ║
║  • Arrange classes from lowest to highest (JSS1 → JSS2)      ║
║  • Classes with sections should be at the same level         ║
║  • Students will be promoted to the next class in this order ║
║  • The highest class students become "graduating students"   ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ [≡]  ① JSS1               Lowest Class  [↑] [↓]        │ ║
║  │      Level: JSS1 • 45 students                          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ [≡]  ② JSS2                            [↑] [↓]          │ ║
║  │      Level: JSS2 • 42 students                          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ [≡]  ③ JSS3                            [↑] [↓]          │ ║
║  │      Level: JSS3 • 40 students                          │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ [≡]  ④ SS1                             [↑] [↓]          │ ║
║  │      Level: SS1 • 38 students                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ [≡]  ⑤ SS2                             [↑] [↓]          │ ║
║  │      Level: SS2 • 35 students                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │ [≡]  ⑥ SS3            Graduating Class [↑] [↓]          │ ║
║  │      Level: SS3 • 38 students                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **2. Admin Dashboard → Promotions**

```
╔══════════════════════════════════════════════════════════════╗
║  📈 Student Promotion Management                              ║
╠══════════════════════════════════════════════════════════════╣
║  Promote students to the next class based on class hierarchy ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Current Session:  │ 2024/2025                        │      ║
║  New Session:      │ 2025/2026________________        │      ║
║                                                               ║
╠══════════════════════════════════════════════════════════════╣
║  ℹ️  How Promotion Works:                                     ║
║  • Students are promoted to the next class in the hierarchy  ║
║  • Section matching is preserved when possible               ║
║  • The highest class becomes "graduating students"           ║
║  • Graduated students can access transcripts                 ║
║  • Click "Promote" for each class individually               ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  JSS1                  →      JSS2          [Promote]   │ ║
║  │  👥 45 students                                          │ ║
║  │  Level: JSS1 • Hierarchy: #1                            │ ║
║  │  ─────────────────────────────────────────────────────  │ ║
║  │  ✅ Section matching preserved                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  JSS2                  →      JSS3          [Promote]   │ ║
║  │  👥 42 students                                          │ ║
║  │  Level: JSS2 • Hierarchy: #2                            │ ║
║  │  ─────────────────────────────────────────────────────  │ ║
║  │  ✅ Section matching preserved                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  JSS3                  →      SS1           [Promote]   │ ║
║  │  👥 40 students                                          │ ║
║  │  Level: JSS3 • Hierarchy: #3                            │ ║
║  │  ─────────────────────────────────────────────────────  │ ║
║  │  ⚠️  Section changes detected                            │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  SS1                   →      SS2           [Promote]   │ ║
║  │  👥 38 students                                          │ ║
║  │  Level: SS1 • Hierarchy: #4                             │ ║
║  │  ─────────────────────────────────────────────────────  │ ║
║  │  ℹ️  No sections configured                              │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  SS2                   →      SS3           [Promote]   │ ║
║  │  👥 35 students                                          │ ║
║  │  Level: SS2 • Hierarchy: #5                             │ ║
║  │  ─────────────────────────────────────────────────────  │ ║
║  │  ✅ Section matching preserved                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
║  ┌─────────────────────────────────────────────────────────┐ ║
║  │  SS3                   🎓  Graduating Students           │ ║
║  │  👥 38 students                          [Graduate] 🎓  │ ║
║  │  Level: SS3 • Hierarchy: #6                             │ ║
║  │  Session: 2025/2026                                     │ ║
║  │  📄 Transcript access enabled                           │ ║
║  └─────────────────────────────────────────────────────────┘ ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **3. Promotion Confirmation Dialog**

```
╔══════════════════════════════════════════════════════════════╗
║  ⚠️  Confirm Student Promotion                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Promote 45 students from JSS1 to JSS2?                      ║
║                                                               ║
║  This will update all student records for session 2025/2026. ║
║                                                               ║
║  ⚠️  Warnings:                                                ║
║  • Section matching preserved: JSS1-A → JSS2-A               ║
║                                                               ║
║  ⚠️  This action cannot be undone. Continue?                 ║
║                                                               ║
║                          [Cancel]  [Confirm Promotion]       ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **4. Graduation Confirmation Dialog**

```
╔══════════════════════════════════════════════════════════════╗
║  🎓 Confirm Student Graduation                                ║
╠══════════════════════════════════════════════════════════════╣
║                                                               ║
║  Graduate 38 students from SS3?                              ║
║                                                               ║
║  This will update all student records for session 2025/2026. ║
║                                                               ║
║  Students will be marked as:                                 ║
║  • Status: Graduated                                         ║
║  • Graduation Session: 2025/2026                             ║
║  • Transcript Access: Enabled                                ║
║  • Current Class: None                                       ║
║                                                               ║
║  ⚠️  This action cannot be undone. Continue?                 ║
║                                                               ║
║                          [Cancel]  [🎓 Confirm Graduation]   ║
║                                                               ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **5. Success Toast Messages**

```
┌────────────────────────────────────────────────┐
│ ✅ 45 students promoted to JSS2!               │
└────────────────────────────────────────────────┘

┌────────────────────────────────────────────────┐
│ ✅ 38 students graduated successfully!         │
└────────────────────────────────────────────────┘
```

---

### **6. Student Profile (Before Promotion)**

```
╔══════════════════════════════════════════════════════════════╗
║  Student Profile: John Doe                                    ║
╠══════════════════════════════════════════════════════════════╣
║  Name:         John Doe                                       ║
║  Email:        john.doe@student.school.com                    ║
║  Class:        JSS1                                           ║
║  Status:       Active                                         ║
║  Session:      2024/2025                                      ║
║  Graduated:    No                                             ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **7. Student Profile (After Promotion to JSS2)**

```
╔══════════════════════════════════════════════════════════════╗
║  Student Profile: John Doe                                    ║
╠══════════════════════════════════════════════════════════════╣
║  Name:         John Doe                                       ║
║  Email:        john.doe@student.school.com                    ║
║  Class:        JSS2 ⬆️ (Promoted from JSS1)                   ║
║  Status:       Active                                         ║
║  Session:      2025/2026                                      ║
║  Graduated:    No                                             ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **8. Student Profile (After Graduation)**

```
╔══════════════════════════════════════════════════════════════╗
║  Student Profile: Jane Smith                    🎓 GRADUATED ║
╠══════════════════════════════════════════════════════════════╣
║  Name:              Jane Smith                                ║
║  Email:             jane.smith@student.school.com             ║
║  Class:             None (Graduated)                          ║
║  Status:            Graduated                                 ║
║  Graduation Year:   2024/2025                                 ║
║  Transcript:        ✅ Available                              ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **9. Class Teacher View (Before Promotion)**

```
╔══════════════════════════════════════════════════════════════╗
║  My Class: JSS1                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Total Students: 45                                           ║
╠══════════════════════════════════════════════════════════════╣
║  #  | Name           | Gender | Age | Attendance            ║
║  1  | John Doe       | M      | 11  | 95%                   ║
║  2  | Jane Smith     | F      | 11  | 97%                   ║
║  3  | Bob Johnson    | M      | 12  | 88%                   ║
║  ... (42 more students)                                       ║
╚══════════════════════════════════════════════════════════════╝
```

---

### **10. Class Teacher View (After Promotion)**

```
╔══════════════════════════════════════════════════════════════╗
║  My Class: JSS1                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Total Students: 0                                            ║
╠══════════════════════════════════════════════════════════════╣
║  ℹ️  All students have been promoted to JSS2                  ║
║     Awaiting new student admissions for session 2025/2026    ║
╚══════════════════════════════════════════════════════════════╝

╔══════════════════════════════════════════════════════════════╗
║  My Class: JSS2                                               ║
╠══════════════════════════════════════════════════════════════╣
║  Total Students: 45 ⬆️ (Newly promoted from JSS1)             ║
╠══════════════════════════════════════════════════════════════╣
║  #  | Name           | Gender | Age | Attendance            ║
║  1  | John Doe       | M      | 12  | -                     ║
║  2  | Jane Smith     | F      | 12  | -                     ║
║  3  | Bob Johnson    | M      | 13  | -                     ║
║  ... (42 more students)                                       ║
╚══════════════════════════════════════════════════════════════╝
```

---

## 📊 Database Changes Visualization

### **Before Promotion:**

```
profiles table:
┌──────────────┬────────────┬────────────┬──────────┬─────────────────────┐
│ id           │ first_name │ last_name  │ class_id │ status              │
├──────────────┼────────────┼────────────┼──────────┼─────────────────────┤
│ student-001  │ John       │ Doe        │ jss1-id  │ active              │
│ student-002  │ Jane       │ Smith      │ jss1-id  │ active              │
│ student-003  │ Bob        │ Johnson    │ ss3-id   │ active              │
└──────────────┴────────────┴────────────┴──────────┴─────────────────────┘

classes table:
┌──────────┬───────┬───────┬─────────────────┐
│ id       │ name  │ level │ hierarchy_order │
├──────────┼───────┼───────┼─────────────────┤
│ jss1-id  │ JSS1  │ JSS1  │ 1               │
│ jss2-id  │ JSS2  │ JSS2  │ 2               │
│ ss3-id   │ SS3   │ SS3   │ 6               │
└──────────┴───────┴───────┴─────────────────┘
```

### **After Promotion (JSS1 → JSS2):**

```
profiles table:
┌──────────────┬────────────┬────────────┬──────────┬─────────────────────┐
│ id           │ first_name │ last_name  │ class_id │ status              │
├──────────────┼────────────┼────────────┼──────────┼─────────────────────┤
│ student-001  │ John       │ Doe        │ jss2-id  │ active   ⬅ CHANGED │
│ student-002  │ Jane       │ Smith      │ jss2-id  │ active   ⬅ CHANGED │
│ student-003  │ Bob        │ Johnson    │ ss3-id   │ active              │
└──────────────┴────────────┴────────────┴──────────┴─────────────────────┘
```

### **After Graduation (SS3):**

```
profiles table:
┌──────────────┬────────────┬────────────┬──────────┬───────────┬────────────────────┐
│ id           │ first_name │ last_name  │ class_id │ status    │ graduation_session │
├──────────────┼────────────┼────────────┼──────────┼───────────┼────────────────────┤
│ student-001  │ John       │ Doe        │ jss2-id  │ active    │ null               │
│ student-002  │ Jane       │ Smith      │ jss2-id  │ active    │ null               │
│ student-003  │ Bob        │ Johnson    │ NULL     │ graduated │ 2024/2025 ⬅ NEW   │
└──────────────┴────────────┴────────────┴──────────┴───────────┴────────────────────┘
                                           ⬆ CHANGED   ⬆ CHANGED
```

---

## 🎯 Key Visual Indicators

### **Status Badges:**

```
┌────────────────┐  ┌────────────────────┐  ┌───────────────┐
│ Lowest Class   │  │ Graduating Class   │  │ 👥 45 students│
└────────────────┘  └────────────────────┘  └───────────────┘
   (Green)              (Purple)              (Gray outline)

┌────────────────────────────────┐  ┌────────────────────────────┐
│ ✅ Section matching preserved  │  │ ⚠️  Section changes detected│
└────────────────────────────────┘  └────────────────────────────┘
        (Green)                              (Amber)
```

### **Progress States:**

```
Ready to Promote:
┌──────────────────────────────────┐
│  JSS1 → JSS2      [Promote]      │
└──────────────────────────────────┘

Promoting:
┌──────────────────────────────────┐
│  JSS1 → JSS2   [⏳ Promoting...] │
└──────────────────────────────────┘

Promoted:
┌──────────────────────────────────┐
│  JSS1 → JSS2      [✅ Promoted]  │
│  45 students moved to JSS2       │
└──────────────────────────────────┘
```

---

This visual guide matches exactly what you'll see in the production system! 🎓✨
