# Finance Payment Form - Debug Guide

## ✅ What I Just Added:

### Console Logging
The PaymentEntryForm now has detailed console logs to help debug why the clearance card isn't showing.

## 🔍 How to Debug:

### Step 1: Open Browser Console
1. Press **F12** (or right-click → Inspect)
2. Go to **Console** tab
3. Clear the console (trash icon)

### Step 2: Navigate to Payment Entry
1. Login as Finance Admin
2. Go to Finance Dashboard
3. Click on **"Payment Entry"** tab

### Step 3: Watch the Console
You should see:
```
[PaymentForm] Form data changed: {
  student_id: "",
  session: "2024/2025",
  term: "First Term",
  shouldFetch: false
}
```

### Step 4: Select a Student
When you select a student from the dropdown, you should see:
```
[PaymentForm] Form data changed: {
  student_id: "uuid-here",
  session: "2024/2025",
  term: "First Term",
  shouldFetch: true
}
[PaymentForm] Fetching clearance info: { student_id: "...", session: "...", term: "..." }
[PaymentForm] Clearance response: { success: true, clearance: {...} }
[PaymentForm] Setting clearance info: { student_type: "Day", ... }
```

## 🚨 Common Issues & Solutions:

### Issue 1: `shouldFetch: false` even after selecting student
**Symptom:** Console shows `shouldFetch: false` after selecting student
**Cause:** Student ID not being set properly
**Solution:** Check if students are loading correctly

### Issue 2: `No clearance data or error: Student type not set`
**Symptom:** Response has error "Student type not set"
**Cause:** Students don't have `student_type` column filled
**Solution:** Run this SQL:
```sql
UPDATE profiles 
SET student_type = 'Day' 
WHERE role = 'student' 
AND student_type IS NULL;
```

### Issue 3: `404 Not Found`
**Symptom:** Network error or 404 in console
**Cause:** Backend endpoint not deployed
**Solution:** Restart your development server

### Issue 4: `Invalid session or term`
**Symptom:** Error says "Invalid session or term"
**Cause:** No academic sessions/terms in database
**Solution:** Check if academic_sessions and academic_terms tables have data:
```sql
SELECT * FROM academic_sessions WHERE session_name = '2024/2025';
SELECT * FROM academic_terms WHERE term_name = 'First Term';
```

### Issue 5: Clearance card shows but says "No fee structure"
**Symptom:** Amber warning "No fee structure configured"
**Cause:** No fee_structure record for this student type/session/term
**Solution:** This is OK! Payment will still be recorded. To fix the warning:
```sql
-- Get IDs first
SELECT id FROM academic_sessions WHERE session_name = '2024/2025';
SELECT id FROM academic_terms WHERE term_name = 'First Term';

-- Insert fee structure
INSERT INTO fee_structure (student_type, session_id, term_id, required_amount)
VALUES ('Day', 'session-id-here', 'term-id-here', 50000);
```

## 📋 What You Should See (Working State):

### Before Selecting Student:
```
┌─────────────────────────────────────────┐
│ 📝 New Payment Entry                   │
├─────────────────────────────────────────┤
│                                         │
│ Student: [Select student ▼]            │
│                                         │
│ Academic Year: [2024/2025 ▼]           │
│ Term: [First Term ▼]                    │
│                                         │
│ (No clearance card visible)             │
│                                         │
└─────────────────────────────────────────┘
```

### After Selecting Student:
```
┌─────────────────────────────────────────┐
│ 📝 New Payment Entry                   │
├─────────────────────────────────────────┤
│                                         │
│ Student: [John Doe - JSS 1 (Day) ▼]   │
│                                         │
│ ┌─ 💡 Clearance Information ─────────┐ │
│ │ Student Type: Day • Next: Part 1   │ │
│ │                                     │ │
│ │ Required:  Total:   Outstanding:   │ │
│ │ ₦50,000    ₦0       ₦50,000        │ │
│ └─────────────────────────────────────┘ │
│                                         │
│ Academic Year: [2024/2025 ▼]           │
│ Term: [First Term ▼]                    │
│                                         │
└─────────────────────────────────────────┘
```

## 🎯 Expected Console Output (Success):

```
[PaymentForm] Form data changed: {
  student_id: "",
  session: "2024/2025",
  term: "First Term",
  shouldFetch: false
}

// After selecting student:
[PaymentForm] Form data changed: {
  student_id: "a1b2c3d4-...",
  session: "2024/2025",
  term: "First Term",
  shouldFetch: true
}

[PaymentForm] Fetching clearance info: {
  student_id: "a1b2c3d4-...",
  session: "2024/2025",
  term: "First Term"
}

[PaymentForm] Clearance response: {
  success: true,
  clearance: {
    student_type: "Day",
    required_amount: 50000,
    total_paid: 0,
    outstanding_balance: 50000,
    is_cleared: false,
    next_part_payment_number: 1
  }
}

[PaymentForm] Setting clearance info: {
  student_type: "Day",
  required_amount: 50000,
  ...
}
```

## 🔧 Quick Fixes:

### Hard Refresh Browser
Sometimes the browser caches the old version:
- **Windows:** Ctrl + Shift + R
- **Mac:** Cmd + Shift + R

### Restart Dev Server
If backend endpoint isn't available:
```bash
# Stop current server (Ctrl+C)
# Restart
npm run dev
# or
deno task serve
```

### Set Student Types
If students don't have student_type:
```sql
-- Set all to Day
UPDATE profiles SET student_type = 'Day' 
WHERE role = 'student' AND student_type IS NULL;

-- Or set specific students to Boarding
UPDATE profiles SET student_type = 'Boarding' 
WHERE id IN ('student-id-1', 'student-id-2');
```

### Create Academic Sessions/Terms
If missing:
```sql
INSERT INTO academic_sessions (session_name, is_active)
VALUES ('2024/2025', true);

INSERT INTO academic_terms (term_name, is_active)
VALUES ('First Term', true);
```

## 📝 Report Back:

After opening the console and selecting a student, please share:

1. **What logs you see** (copy from console)
2. **Any error messages** (red text in console)
3. **Network tab** - Does the `/finance/clearance` request appear?
4. **What the clearance response is** (if any)

This will help me identify exactly what's preventing the card from showing!

