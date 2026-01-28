# 🗄️ SQL QUICK REFERENCE - Fee Itemization System

## 📊 TABLE STRUCTURE AFTER MIGRATION

### **fee_structure** (Master Fee Items List)
```sql
-- Columns:
- id                  UUID PRIMARY KEY
- item_name           TEXT (e.g., "Tuition", "Boarding", "Sports")
- amount              NUMERIC(12, 2)
- is_tuition          BOOLEAN (true for main tuition item)
- is_compulsory       BOOLEAN (true if all students must pay)
- session             TEXT (e.g., "2024/2025")
- term                TEXT (e.g., "First Term")
- class_level         TEXT (e.g., "JSS1", "SSS2", or "ALL")
- created_by          UUID (director's ID)
- created_at          TIMESTAMPTZ
- updated_at          TIMESTAMPTZ
```

### **fees** (Student Fee Assignments)
```sql
-- Columns:
- id                             UUID PRIMARY KEY
- student_id                     UUID (FK to profiles)
- fee_item_id                    UUID (FK to fee_structure)
- original_amount                NUMERIC(12, 2)
- tuition_discount_percentage    NUMERIC(5, 2) (0-100)
- discounted_amount              NUMERIC(12, 2) (auto-calculated)
- session                        TEXT
- term                           TEXT
- is_active                      BOOLEAN
- assigned_by                    UUID (finance admin's ID)
- assigned_at                    TIMESTAMPTZ
- updated_at                     TIMESTAMPTZ
```

---

## 🔍 USEFUL QUERIES

### 1. **View All Fee Items for a Session/Term**
```sql
SELECT 
    item_name,
    amount,
    is_tuition,
    is_compulsory,
    class_level
FROM fee_structure
WHERE session = '2024/2025'
  AND term = 'First Term'
ORDER BY is_tuition DESC, item_name;
```

### 2. **View Student's Fee Assignment with Breakdown**
```sql
SELECT 
    fs.item_name,
    fs.is_tuition,
    f.original_amount,
    f.tuition_discount_percentage,
    f.discounted_amount,
    CASE 
        WHEN fs.is_tuition THEN f.discounted_amount
        ELSE f.original_amount
    END AS final_amount
FROM fees f
JOIN fee_structure fs ON f.fee_item_id = fs.id
WHERE f.student_id = 'student-uuid-here'
  AND f.session = '2024/2025'
  AND f.term = 'First Term'
  AND f.is_active = true;
```

### 3. **Calculate Student's Total Required Fees**
```sql
SELECT 
    student_id,
    session,
    term,
    SUM(CASE WHEN is_tuition THEN discounted_amount ELSE original_amount END) AS total_required
FROM fees f
JOIN fee_structure fs ON f.fee_item_id = fs.id
WHERE student_id = 'student-uuid-here'
  AND session = '2024/2025'
  AND term = 'First Term'
  AND is_active = true
GROUP BY student_id, session, term;
```

### 4. **Using the Helper Function**
```sql
SELECT * FROM calculate_student_total_fees(
    'student-uuid-here',
    '2024/2025',
    'First Term'
);
```
**Returns:**
- `total_fees`
- `tuition_amount`
- `tuition_discount`
- `discounted_tuition`
- `other_fees_total`
- `fee_items_count`

### 5. **Using the Helper View**
```sql
SELECT 
    student_name,
    class_name,
    item_name,
    is_tuition,
    original_amount,
    tuition_discount_percentage,
    final_amount
FROM student_fee_summary
WHERE session = '2024/2025'
  AND term = 'First Term'
ORDER BY student_name, is_tuition DESC;
```

---

## 🛠️ COMMON OPERATIONS

### **Create Tuition Fee Item (Director)**
```sql
INSERT INTO fee_structure (
    item_name,
    amount,
    is_tuition,
    is_compulsory,
    session,
    term,
    class_level,
    created_by
) VALUES (
    'Tuition',
    150000,
    true,
    true,
    '2024/2025',
    'First Term',
    'ALL',
    'director-uuid-here'
);
```

### **Create Additional Fee Item (e.g., Boarding)**
```sql
INSERT INTO fee_structure (
    item_name,
    amount,
    is_tuition,
    is_compulsory,
    session,
    term,
    class_level,
    created_by
) VALUES (
    'Boarding',
    80000,
    false,
    false,
    '2024/2025',
    'First Term',
    'ALL',
    'director-uuid-here'
);
```

### **Assign Fee Items to Student (Finance Admin)**
```sql
-- First, deactivate existing assignments
UPDATE fees
SET is_active = false
WHERE student_id = 'student-uuid-here'
  AND session = '2024/2025'
  AND term = 'First Term';

-- Then insert new assignments
INSERT INTO fees (
    student_id,
    fee_item_id,
    original_amount,
    tuition_discount_percentage,
    session,
    term,
    is_active,
    assigned_by
) VALUES 
-- Tuition with 10% discount
(
    'student-uuid-here',
    'tuition-fee-item-uuid',
    150000,
    10,
    '2024/2025',
    'First Term',
    true,
    'finance-admin-uuid'
),
-- Boarding (no discount)
(
    'student-uuid-here',
    'boarding-fee-item-uuid',
    80000,
    0,
    '2024/2025',
    'First Term',
    true,
    'finance-admin-uuid'
);
-- The trigger will automatically calculate discounted_amount
```

### **Update Tuition Discount for Student**
```sql
UPDATE fees
SET tuition_discount_percentage = 15  -- Change from 10% to 15%
WHERE student_id = 'student-uuid-here'
  AND fee_item_id IN (
      SELECT id FROM fee_structure WHERE is_tuition = true
  )
  AND session = '2024/2025'
  AND term = 'First Term'
  AND is_active = true;
-- The trigger will automatically recalculate discounted_amount
```

---

## 🔐 DATA INTEGRITY CHECKS

### **Check for Duplicate Tuition Items**
```sql
SELECT 
    session,
    term,
    class_level,
    COUNT(*) AS tuition_count
FROM fee_structure
WHERE is_tuition = true
GROUP BY session, term, class_level
HAVING COUNT(*) > 1;
-- Should return 0 rows (unique constraint prevents this)
```

### **Check Students Without Fee Assignments**
```sql
SELECT 
    p.id,
    p.first_name || ' ' || p.last_name AS student_name,
    c.name AS class_name
FROM profiles p
LEFT JOIN classes c ON p.class_id = c.id
LEFT JOIN fees f ON p.id = f.student_id 
    AND f.session = '2024/2025'
    AND f.term = 'First Term'
    AND f.is_active = true
WHERE p.role = 'student'
  AND f.id IS NULL;
```

### **Check Fee Items Used by Students (Before Deletion)**
```sql
SELECT 
    fs.item_name,
    COUNT(f.id) AS students_assigned
FROM fee_structure fs
LEFT JOIN fees f ON fs.id = f.fee_item_id AND f.is_active = true
WHERE fs.id = 'fee-item-uuid-to-delete'
GROUP BY fs.item_name;
-- If count > 0, you cannot delete this fee item
```

---

## 📈 REPORTING QUERIES

### **Total Expected Revenue per Fee Item**
```sql
SELECT 
    fs.item_name,
    fs.is_tuition,
    COUNT(DISTINCT f.student_id) AS students_count,
    SUM(CASE 
        WHEN fs.is_tuition THEN f.discounted_amount 
        ELSE f.original_amount 
    END) AS total_expected
FROM fee_structure fs
JOIN fees f ON fs.id = f.fee_item_id
WHERE f.session = '2024/2025'
  AND f.term = 'First Term'
  AND f.is_active = true
GROUP BY fs.item_name, fs.is_tuition
ORDER BY total_expected DESC;
```

### **Students with Discounts**
```sql
SELECT 
    p.first_name || ' ' || p.last_name AS student_name,
    c.name AS class_name,
    f.original_amount AS tuition_before_discount,
    f.tuition_discount_percentage AS discount_percentage,
    f.discounted_amount AS tuition_after_discount,
    (f.original_amount - f.discounted_amount) AS discount_amount_saved
FROM fees f
JOIN profiles p ON f.student_id = p.id
LEFT JOIN classes c ON p.class_id = c.id
JOIN fee_structure fs ON f.fee_item_id = fs.id
WHERE fs.is_tuition = true
  AND f.tuition_discount_percentage > 0
  AND f.session = '2024/2025'
  AND f.term = 'First Term'
  AND f.is_active = true
ORDER BY f.tuition_discount_percentage DESC;
```

### **Fee Structure Summary per Class**
```sql
SELECT 
    c.name AS class_name,
    COUNT(DISTINCT p.id) AS students_count,
    SUM(
        SELECT SUM(
            CASE 
                WHEN fs.is_tuition THEN f.discounted_amount 
                ELSE f.original_amount 
            END
        )
        FROM fees f
        JOIN fee_structure fs ON f.fee_item_id = fs.id
        WHERE f.student_id = p.id
          AND f.session = '2024/2025'
          AND f.term = 'First Term'
          AND f.is_active = true
    ) AS total_expected_per_class
FROM profiles p
JOIN classes c ON p.class_id = c.id
WHERE p.role = 'student'
GROUP BY c.name
ORDER BY c.name;
```

---

## 🚨 TROUBLESHOOTING

### **If Trigger Not Firing (discounted_amount not calculated)**
```sql
-- Check if trigger exists
SELECT 
    trigger_name,
    event_manipulation,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_auto_calculate_discounted_amount';

-- If missing, recreate it from migration file
```

### **If Foreign Key Errors**
```sql
-- Verify fee_item_id exists in fee_structure
SELECT 
    f.id,
    f.fee_item_id,
    fs.id AS fee_structure_id
FROM fees f
LEFT JOIN fee_structure fs ON f.fee_item_id = fs.id
WHERE fs.id IS NULL AND f.is_active = true;
-- Should return 0 rows
```

### **Reset All Fee Assignments for Testing**
```sql
-- ⚠️ CAUTION: This will delete all fee assignments
DELETE FROM fees;

-- Or just deactivate them
UPDATE fees SET is_active = false;
```

---

## 💡 TIPS

1. **Always use the trigger** - Don't manually set `discounted_amount`, let the trigger handle it
2. **Check constraints before deleting** - Use the "Fee Items Used by Students" query
3. **Use transactions** - When assigning multiple fee items, wrap in a transaction
4. **Index usage** - The migration already creates necessary indexes
5. **Helper function is faster** - Use `calculate_student_total_fees()` instead of manual SUM queries

---

## 🔗 RELATED FILES

- Migration: `/database/migrations/fee_itemization_migration.sql`
- Backend Endpoints: `/supabase/functions/server/fee_items_endpoints.tsx`
- Implementation Guide: `/IMPLEMENTATION_GUIDE_FEE_ITEMIZATION.md`
