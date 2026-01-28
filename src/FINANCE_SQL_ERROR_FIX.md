# Finance SQL Error - FIXED

## ❌ Error You Got:
```
ERROR: 42703: column asess.session does not exist
LINE 243: LEFT JOIN academic_sessions asess ON p.session = asess.session
```

## ✅ What Was Wrong:

The view at the end was using incorrect column names for the JOIN:

**WRONG:**
```sql
LEFT JOIN academic_sessions asess ON p.session = asess.session
LEFT JOIN academic_terms aterm ON p.term = aterm.name
```

**CORRECT:**
```sql
LEFT JOIN academic_sessions asess ON p.session = asess.session_name
LEFT JOIN academic_terms aterm ON p.term = aterm.term_name
```

## ✅ What Was Fixed:

### 1. View JOIN Conditions (Line 243-244)
Changed to use correct column names:
- `academic_sessions.session_name` (not `.session`)
- `academic_terms.term_name` (not `.name`)

### 2. Trigger Function (Line 155-159)
Also updated the trigger function to use correct column names:
```sql
SELECT id INTO v_session_id 
FROM academic_sessions 
WHERE session_name = NEW.session;  -- Changed from 'session'

SELECT id INTO v_term_id 
FROM academic_terms 
WHERE term_name = NEW.term;  -- Changed from 'name'
```

### 3. Added DROP statements
Added `DROP POLICY IF EXISTS` and `DROP TRIGGER IF EXISTS` to prevent errors if you run the script multiple times.

## 🚀 How to Use:

### Option 1: Run the Fixed File (RECOMMENDED)
```bash
1. Open Supabase Dashboard → SQL Editor
2. Copy entire contents of /FINANCE_CLEARANCE_FIXED.sql
3. Paste and click "Run"
4. Should complete with NO ERRORS ✅
```

### Option 2: Quick Fix if Already Partially Run
If you already ran the old file and just need to fix the view:

```sql
CREATE OR REPLACE VIEW director_payment_approvals_with_clearance AS
SELECT 
  p.id as payment_id,
  p.student_id,
  pr.first_name || ' ' || pr.last_name as student_name,
  pr.student_type,
  c.name as class_name,
  asess.session_name as academic_session,  -- FIXED
  aterm.term_name as academic_term,  -- FIXED
  p.amount as amount_paid,
  p.part_payment_number,
  p.payment_date,
  p.payment_method,
  p.reference_number as receipt_number,
  p.description as notes,
  p.status,
  sc.required_amount,
  sc.total_paid,
  sc.outstanding_balance,
  sc.is_cleared,
  finance.first_name || ' ' || finance.last_name as entered_by_name,
  p.created_at
FROM payments p
JOIN profiles pr ON p.student_id = pr.id
LEFT JOIN classes c ON pr.class_id = c.id
JOIN profiles finance ON p.entered_by = finance.id
LEFT JOIN academic_sessions asess ON p.session = asess.session_name  -- FIXED
LEFT JOIN academic_terms aterm ON p.term = aterm.term_name  -- FIXED
LEFT JOIN student_clearance sc ON (
  sc.student_id = p.student_id 
  AND sc.session_id = asess.id 
  AND sc.term_id = aterm.id
)
ORDER BY p.created_at DESC;
```

## ✅ Verification:

After running, test with:

```sql
-- Should return the view structure (no errors)
SELECT * FROM director_payment_approvals_with_clearance LIMIT 1;

-- Check tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('fee_structure', 'student_clearance');

-- Check columns added
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'profiles' AND column_name = 'student_type';

SELECT column_name FROM information_schema.columns 
WHERE table_name = 'payments' AND column_name = 'part_payment_number';
```

## 📋 Summary of Changes:

| Item | Old (Wrong) | New (Correct) |
|------|-------------|---------------|
| Session JOIN | `asess.session` | `asess.session_name` |
| Term JOIN | `aterm.name` | `aterm.term_name` |
| Trigger session lookup | `WHERE session = ...` | `WHERE session_name = ...` |
| Trigger term lookup | `WHERE name = ...` | `WHERE term_name = ...` |

## 🎯 Next Steps After Running:

1. ✅ Verify no SQL errors
2. ✅ Update backend payment endpoint (see `/UPDATE_FINANCE_PAYMENT_ENDPOINT.md`)
3. ✅ Test Finance Admin login and access
4. ✅ Test payment creation with part_payment_number

