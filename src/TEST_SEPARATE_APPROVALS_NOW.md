# 🧪 TEST SEPARATE MIDTERM/TERMINAL APPROVALS - 5 MINUTES

## 🎯 WHAT TO TEST

You now have **TWO SEPARATE APPROVAL WORKFLOWS** - one for midterm, one for terminal.

---

## ✅ QUICK TEST (5 Steps)

### **STEP 1: Clear Cache**
```
Press: Ctrl + Shift + R (Windows/Linux)
or: Cmd + Shift + R (Mac)
```

---

### **STEP 2: Submit Midterm Marks (As Teacher)**

1. Login as teacher
2. Go to **Marks Entry & Management**
3. Click **"Enter New Marks"**
4. Select:
   - Class: `JSS1A`
   - Subject: `Mathematics`
   - Exam: `Midterm Exam`
5. Switch to **"Midterm Assessment"** tab
6. Enter marks for ONE student:
   - CA1: `10`
   - CA2: `8`
   - Exam: `16`
7. Notice: **Terminal CA1 Preview shows: 17**
8. Click **"Submit Midterm Scores"**
9. ✅ Toast: "🎉 Midterm marks submitted for review!"

---

### **STEP 3: Check Approval Panel (As Principal)**

1. Logout teacher
2. Login as principal
3. Go to **Marks Entry & Management**
4. Click **"Approval"** tab
5. **EXPECTED:**
   - See ONE card: **"📝 Midterm Score Approval - Mathematics"**
   - Badge: `Midterm | Pending`
   - Shows: `1 students`
   - No terminal card yet ✅

---

### **STEP 4: Approve Midterm**

1. Click **"Approve"** button on the midterm card
2. ✅ Toast: "Marks approved successfully"
3. Card disappears from pending list
4. **EXPECTED:**
   - Database now has: `type='midterm', status='approved'`
   - Terminal marks don't exist yet

---

### **STEP 5: Submit Terminal Marks (As Teacher)**

1. Logout principal
2. Login as teacher
3. Go to **Marks Entry & Management**
4. Click **"Enter New Marks"**
5. Select:
   - Class: `JSS1A`
   - Subject: `Mathematics`
   - Exam: `Terminal Exam`
6. Switch to **"Terminal Assessment"** tab
7. **Notice: Terminal CA1 already shows: 17** (auto-calculated!) ✅
8. Enter marks for the SAME student:
   - CA2: `18`
   - Exam: `55`
9. Click **"Submit Terminal Scores"**
10. ✅ Toast: "🎉 Terminal marks submitted for review!"

---

### **STEP 6: Check Approval Panel Again (As Principal)**

1. Logout teacher
2. Login as principal
3. Go to **Marks Entry & Management → Approval** tab
4. **EXPECTED:**
   - See ONE card: **"📊 Terminal Score Approval - Mathematics"**
   - Badge: `Terminal | Pending`
   - Shows: `1 students`
   - **Midterm already approved (not shown in pending)** ✅

---

### **STEP 7: Approve Terminal**

1. Click **"Approve"** button on the terminal card
2. ✅ Toast: "Marks approved successfully"
3. Card disappears from pending list
4. **EXPECTED:**
   - Database now has TWO rows:
     - `type='midterm', status='approved'`
     - `type='terminal', status='approved'`

---

## 🔍 VERIFY IN DATABASE

Run this SQL query to confirm both types exist:

```sql
SELECT 
  profiles.full_name,
  marks.type,
  marks.ca1,
  marks.ca2,
  marks.exam,
  marks.status
FROM marks
JOIN profiles ON marks.student_id = profiles.id
WHERE profiles.full_name = 'Your Student Name'
  AND marks.subject_id = (SELECT id FROM subjects WHERE name = 'Mathematics')
ORDER BY marks.type;
```

**Expected Result:**
```
full_name    | type     | ca1 | ca2 | exam | status
-------------|----------|-----|-----|------|--------
John Doe     | midterm  | 10  | 8   | 16   | approved
John Doe     | terminal | 17  | 18  | 55   | approved
```

**TWO SEPARATE ROWS! ✅**

---

## 🎯 WHAT TO LOOK FOR

### **✅ SUCCESS INDICATORS:**

1. **Two submission buttons:**
   - Midterm tab has: "Submit Midterm Scores"
   - Terminal tab has: "Submit Terminal Scores"

2. **Two separate approval cards:**
   - "📝 Midterm Score Approval - Mathematics"
   - "📊 Terminal Score Approval - Mathematics"

3. **Three tabs in approval panel:**
   - All (shows count: 2)
   - Midterm (shows count: 1)
   - Terminal (shows count: 1)

4. **Independent approval:**
   - Approving midterm doesn't approve terminal
   - Both can have different statuses

5. **Database has two rows:**
   - One with `type='midterm'`
   - One with `type='terminal'`

---

## ❌ WHAT SHOULD NOT HAPPEN

1. **❌ One button submits both** - OLD BEHAVIOR, NOW FIXED
2. **❌ Approving midterm approves terminal** - NOW SEPARATE
3. **❌ Terminal overwrites midterm** - NOW TWO ROWS
4. **❌ Only one approval card shows** - NOW TWO CARDS
5. **❌ Database has only one row** - NOW TWO ROWS

---

## 🚨 TROUBLESHOOTING

### **Problem: Only see one approval card**

**Solution:**
- Check you submitted BOTH midterm and terminal
- Check both are pending (not already approved)
- Refresh the page

### **Problem: Approving midterm approves terminal too**

**Solution:**
- Clear browser cache completely
- Backend may not be deployed yet
- Check console for errors

### **Problem: Terminal CA1 not auto-filled**

**Solution:**
- Make sure you submitted midterm FIRST
- Check midterm has all three values (CA1, CA2, Exam)
- Calculation is: `(CA1 + CA2 + Exam) / 2`

---

## 📊 CONSOLE LOGS TO CHECK

### **When fetching approvals:**
```
[Pending Approvals] Fetching pending approvals...
[Pending Approvals] ✅ Fetched approvals: [
  { id: "..._midterm", type: "midterm", subject: "Mathematics" },
  { id: "..._terminal", type: "terminal", subject: "Mathematics" }
]
[Pending Approvals] Grouped into 2 approval items
```

### **When approving midterm:**
```
[MarksApprovalPanel] 🔥 Approving: exam123_subject456_class789_midterm
[Review Marks] Approving midterm marks for exam:..., subject:..., class:...
[Supabase] Updated 1 midterm marks to approved
```

### **When approving terminal:**
```
[MarksApprovalPanel] 🔥 Approving: exam123_subject456_class789_terminal
[Review Marks] Approving terminal marks for exam:..., subject:..., class:...
[Supabase] Updated 1 terminal marks to approved
```

---

## ✅ PASS CRITERIA

**ALL of these must be true:**

- [ ] Midterm and Terminal have separate submit buttons
- [ ] Submitting midterm shows ONE approval card
- [ ] Approving midterm makes card disappear
- [ ] Submitting terminal shows ONE NEW approval card
- [ ] Approval panel shows TWO separate cards when both pending
- [ ] Tabs show correct counts (All: 2, Midterm: 1, Terminal: 1)
- [ ] Approving each changes only that type's status
- [ ] Database has TWO rows with different `type` values
- [ ] Terminal CA1 auto-fills from midterm average
- [ ] Neither overwrites the other

---

## 🎉 EXPECTED OUTCOME

After testing, you should have:

1. **Frontend:** Two separate approval cards with type badges
2. **Database:** Two rows per student (midterm + terminal)
3. **Approval Flow:** Independent workflows for each type
4. **No Overwriting:** Both marks coexist peacefully

**THIS IS EXACTLY WHAT YOU ASKED FOR!** ✅
