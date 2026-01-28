# 🧪 TEST TERMINAL CA1 DECIMAL PRESERVATION

## ⚡ QUICK TEST (3 Minutes)

### **Step 1: Log in as Teacher**
- Email: Any teacher account
- Password: Your password

---

### **Step 2: Go to Marks Entry**
- Click **"Marks"** in sidebar
- Click **"Enter New Marks"** button

---

### **Step 3: Select Form Data**
1. **Class**: Pick any class (e.g., JSS 1A)
2. **Subject**: Pick any subject (e.g., Mathematics)
3. **Session**: Pick current session (e.g., 2025/2026)
4. **Term**: Pick current term (e.g., First Term)
5. **Exam**: Select **"Mid-Term"**
6. Click **"Continue"** button

---

### **Step 4: Enter Mid-Term Marks**

**For the first student, enter these EXACT values:**
```
CA1:  8
CA2:  9
Exam: 18
```

**Expected Mid-Term Total:**
```
Total: 35 ✅
```

---

### **Step 5: Switch to Terminal Tab**
- Click **"Terminal Assessment"** tab at the top

---

### **Step 6: CHECK TERMINAL CA1 VALUE**

**✅ EXPECTED RESULT:**
```
Terminal CA1: 17.5
```

**Visual Appearance:**
- ✅ Should be **grayed out** (background: light gray)
- ✅ Should be **READ-ONLY** (not an input box)
- ✅ Should show **17.5** (not 18)

**❌ FAIL IF:**
- Shows **18** instead of 17.5
- Shows as editable input field
- Shows blank/empty

---

### **Step 7: Verify Calculation**

**Formula Check:**
```
Terminal CA1 = (Midterm CA1 + Midterm CA2 + Midterm Exam) / 2
Terminal CA1 = (8 + 9 + 18) / 2
Terminal CA1 = 35 / 2
Terminal CA1 = 17.5 ✅
```

---

### **Step 8: Enter Terminal CA2 and Exam**

**Enter these values for the same student:**
```
CA2:  18
Exam: 55
```

**Expected Terminal Total:**
```
Total: 90.5 ✅
```

**Calculation:**
```
Total = CA1 + CA2 + Exam
Total = 17.5 + 18 + 55
Total = 90.5 ✅
```

---

### **Step 9: Save and Submit**

1. Click **"Save Draft"** button
2. Wait for success message: ✅ "Marks saved as draft successfully"
3. Click **"Submit for Review"** button
4. Wait for success message: ✅ "Marks submitted for review successfully"

---

### **Step 10: Verify in Console (Developer Tools)**

1. Press **F12** to open Developer Tools
2. Go to **Console** tab
3. Look for this log:
```javascript
[MarksModule] Sample student data: {
  name: "Student Name",
  midterm: { ca1: 8, ca2: 9, exam: 18 },
  terminal: { ca1: 17.5, ca2: 18, exam: 55 }  // ✅ ca1 is 17.5, not 18
}
```

---

## 🔍 ADDITIONAL TEST CASES

### **Test Case 1: Even Midterm Total**
```
Midterm:
├── CA1: 8
├── CA2: 8
├── Exam: 18
└── Total: 34

Expected Terminal CA1: 17.0 ✅
```

### **Test Case 2: High Odd Total**
```
Midterm:
├── CA1: 10
├── CA2: 9
├── Exam: 20
└── Total: 39

Expected Terminal CA1: 19.5 ✅
```

### **Test Case 3: Low Odd Total**
```
Midterm:
├── CA1: 6
├── CA2: 7
├── Exam: 14
└── Total: 27

Expected Terminal CA1: 13.5 ✅
```

---

## ✅ SUCCESS CRITERIA

### **All of these must be TRUE:**

1. ✅ Terminal CA1 shows **decimal value** (e.g., 17.5)
2. ✅ Terminal CA1 is **grayed out** (not editable)
3. ✅ Terminal CA1 equals **(Midterm Total) / 2**
4. ✅ Terminal CA2 and Exam are **editable inputs**
5. ✅ Terminal Total = CA1 + CA2 + Exam (includes decimals)
6. ✅ Toast message says **"Terminal CA1 kept as is"**
7. ✅ Console log shows decimal value for terminal.ca1

---

## ❌ IF TEST FAILS

### **Symptom: Terminal CA1 shows 18 instead of 17.5**

**Fix:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Log out and log back in
4. Try test again

**If still failing:**
- The browser might be caching old code
- Try in an incognito/private window
- Try a different browser

---

### **Symptom: Terminal CA1 is blank**

**Possible Causes:**
1. Mid-term marks not fully entered
2. One of CA1, CA2, or Exam is missing
3. Need to save draft first

**Fix:**
- Ensure ALL three midterm values are entered
- Switch back to Mid-Term tab
- Click "Save Draft"
- Switch back to Terminal tab

---

## 🎯 QUICK REFERENCE

| Field | Value Type | Editable? | Example |
|-------|------------|-----------|---------|
| Midterm CA1 | Integer | ✅ Yes | 8 |
| Midterm CA2 | Integer | ✅ Yes | 9 |
| Midterm Exam | Integer | ✅ Yes | 18 |
| Midterm Total | Integer | ❌ Auto | 35 |
| **Terminal CA1** | **Decimal** | **❌ Auto** | **17.5** |
| Terminal CA2 | Integer | ✅ Yes | 18 |
| Terminal Exam | Integer | ✅ Yes | 55 |
| Terminal Total | Decimal | ❌ Auto | 90.5 |

---

## 📸 WHAT YOU SHOULD SEE

### **Terminal Tab - CA1 Column:**
```
┌─────────────────────────────────────────┐
│ CA1 (/20)                               │
│ Auto-calculated                         │
├─────────────────────────────────────────┤
│      17.5       │ ← Gray background    │
│                 │ ← NOT an input field  │
└─────────────────────────────────────────┘
```

### **Terminal Tab - CA2 Column:**
```
┌─────────────────────────────────────────┐
│ CA2 (/20)                               │
│ Manual entry                            │
├─────────────────────────────────────────┤
│ [       18      ] ← White background   │
│                   ← Editable input     │
└─────────────────────────────────────────┘
```

---

## ⏱️ TOTAL TEST TIME

- **Setup**: 30 seconds
- **Enter marks**: 1 minute
- **Verify**: 1 minute
- **Console check**: 30 seconds

**TOTAL: ~3 minutes** ⚡

---

## 📞 REPORT RESULTS

After testing, report:
1. ✅ Terminal CA1 value (should be 17.5)
2. ✅ Terminal Total value (should be 90.5)
3. ✅ Screenshot of Terminal tab (optional)
4. ✅ Console log output (optional)

---

**Ready? Let's test!** 🚀
