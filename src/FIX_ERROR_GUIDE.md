# 🔧 FIX: Character Length Error

## ❌ Error:
```
Error creating question: Error: Failed to create question
Error creating question: {
  code: "22001",
  details: null,
  hint: null,
  message: "value too long for type character varying(20)"
}
```

## 🔍 Root Cause:
The `session` and `term` columns in the `cbt_questions` table were created with **VARCHAR(20)**, which is too short to hold longer values.

Example values that might exceed 20 characters:
- Session: "2024/2025 Academic Year" = 24 characters ❌
- Term: "First Term Examination" = 22 characters ❌

## ✅ Solution:

### **Step 1: Run This SQL Immediately**

Open **Supabase Dashboard** → **SQL Editor** and run:

```sql
-- Increase column sizes from VARCHAR(20) to VARCHAR(50)
ALTER TABLE cbt_questions 
ALTER COLUMN session TYPE VARCHAR(50),
ALTER COLUMN term TYPE VARCHAR(50);
```

### **Step 2: Verify the Fix**

Run this to confirm the columns were updated:

```sql
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_name = 'cbt_questions' 
AND column_name IN ('session', 'term');
```

**Expected Output:**
```
column_name | data_type        | character_maximum_length
------------|------------------|-------------------------
session     | character varying| 50
term        | character varying| 50
```

### **Step 3: Test Creating a Question**

1. Go to your app
2. Click "Create Question"
3. Fill in the form
4. Click "Save & Close"
5. **Should work now!** ✅

---

## 📋 Alternative: Quick SQL File

If you prefer, run the entire file: **`/SQL_FIX_CBT_COLUMN_SIZE.sql`**

---

## 🎯 What Changed:

| Before | After |
|--------|-------|
| `session VARCHAR(20)` ❌ | `session VARCHAR(50)` ✅ |
| `term VARCHAR(20)` ❌ | `term VARCHAR(50)` ✅ |

---

## 🧪 Test Cases:

### ✅ Should Now Work:
- Session: "2025/2026" (9 chars)
- Session: "2024/2025 Academic Session" (27 chars)
- Term: "First Term" (10 chars)
- Term: "Second Term Examination" (23 chars)

---

## 📝 Updated Files:

1. **`/SQL_FIX_CBT_COLUMN_SIZE.sql`** - Immediate fix
2. **`/SQL_CBT_ADD_SESSION_TERM.sql`** - Updated with VARCHAR(50)
3. **`/FIX_ERROR_GUIDE.md`** - This guide

---

## 🚀 After Running SQL:

✅ Error should be fixed  
✅ Questions can be created successfully  
✅ Longer session/term names supported  
✅ No need to change any frontend or backend code  

---

## 💡 Why This Happened:

The initial SQL used `VARCHAR(20)` which is standard for short codes, but:
- Academic sessions can be descriptive (e.g., "2024/2025 Academic Year")
- Term names might include prefixes (e.g., "First Term Examination")

Now with `VARCHAR(50)`, you have plenty of room for any reasonable session/term name.

---

**🎊 Run the SQL and the error will be gone!**
