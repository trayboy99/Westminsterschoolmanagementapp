# 🚀 Finance Module Phase 1 - Quick Start Guide

## 📋 What You're About To Run

This migration creates the complete database structure for the Finance Module, including:

- ✅ **payments** table (main payment records)
- ✅ **payment_upload_batches** table (tracks Excel uploads)
- ✅ **11 RLS policies** (security permissions)
- ✅ **9 indexes** (performance optimization)
- ✅ **2 helper views** (summary queries)
- ✅ **4 helper functions** (business logic)

---

## 🎯 Prerequisites

Before running the migration, ensure:

1. ✅ Finance Admin user is created (`finance@westminster.edu.ng`)
2. ✅ You have access to Supabase SQL Editor
3. ✅ You have Director access to approve migrations
4. ✅ You've backed up existing data (if any)

---

## ⚡ 3-Step Quick Start

### Step 1: Run the Migration

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Click **New Query**
4. Copy the entire contents of `FINANCE_MODULE_PHASE1_MIGRATIONS.sql`
5. Paste into SQL Editor
6. Click **Run** (or press `Ctrl+Enter`)

**Expected Output:**
```
✅ payments table created successfully
✅ payment_upload_batches table created successfully
✅ 8 RLS policies created for payments table
🎉 Finance Module Phase 1 migrations completed successfully!
📊 Ready for Finance Admin to start entering payments
👨‍💼 Director can now approve/reject payments from Director Dashboard
```

### Step 2: Verify the Migration

1. In SQL Editor, click **New Query**
2. Copy contents of `VERIFY_FINANCE_PHASE1_MIGRATIONS.sql`
3. Paste and click **Run**

**Expected Output:**
```
╔════════════════════════════════════════╗
║   FINANCE MODULE PHASE 1 SUMMARY      ║
╠════════════════════════════════════════╣
║ Tables Created:        2 / 2          ║
║ RLS Policies:          11 / 11        ║
║ Indexes Created:       9 / 9          ║
║ Views Created:         2 / 2          ║
║ Functions Created:     4 / 4          ║
╚════════════════════════════════════════╝
✅ ALL CHECKS PASSED - Phase 1 migration successful!
```

### Step 3: Test with Sample Data (Optional)

Run this query to insert a test payment:

```sql
-- Test payment entry
INSERT INTO payments (
  student_id,
  session,
  term,
  amount,
  payment_date,
  payment_method,
  reference_number,
  description,
  entered_by,
  entry_method
) VALUES (
  (SELECT id FROM profiles WHERE email = 'student@example.com' LIMIT 1),
  '2024/2025',
  'First Term',
  50000.00,
  CURRENT_DATE,
  'Bank Transfer',
  'TRF12345',
  'School fees payment',
  (SELECT id FROM profiles WHERE role = 'finance_admin' LIMIT 1),
  'manual'
);

-- Verify it was created
SELECT 
  p.id,
  pr.first_name || ' ' || pr.last_name as student_name,
  p.amount,
  p.status,
  p.payment_date
FROM payments p
JOIN profiles pr ON p.student_id = pr.id
ORDER BY p.created_at DESC
LIMIT 5;
```

---

## 📊 What Gets Created

### Table 1: `payments`

The main payments table with these key fields:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `student_id` | UUID | Links to profiles table |
| `session` | VARCHAR(9) | e.g., "2024/2025" |
| `term` | VARCHAR(20) | First/Second/Third Term |
| `amount` | DECIMAL(12,2) | Payment amount in ₦ |
| `payment_date` | DATE | When payment was made |
| `payment_method` | VARCHAR(50) | Cash, Bank Transfer, etc. |
| `status` | VARCHAR(20) | pending/approved/rejected |
| `director_id` | UUID | Who approved/rejected |
| `entered_by` | UUID | Finance Admin who entered |
| `entry_method` | VARCHAR(20) | manual or bulk_upload |

### Table 2: `payment_upload_batches`

Tracks Excel bulk uploads:

| Field | Type | Description |
|-------|------|-------------|
| `id` | UUID | Primary key |
| `filename` | VARCHAR(255) | Excel filename |
| `total_rows` | INTEGER | Total rows in file |
| `successful_rows` | INTEGER | Successfully imported |
| `failed_rows` | INTEGER | Failed to import |
| `session` | VARCHAR(9) | Academic session |
| `term` | VARCHAR(20) | Academic term |
| `uploaded_by` | UUID | Finance Admin |

### Helper Views

**1. payment_summary**
- Shows total payments per student
- Groups by session and term
- Calculates approved/pending/rejected amounts

**2. pending_payment_approvals**
- Lists all payments awaiting Director approval
- Includes student details and class
- Sorted by creation date

### Helper Functions

**1. get_student_clearance_status()**
```sql
-- Check if student has paid fees
SELECT * FROM get_student_clearance_status(
  'student-uuid-here',
  '2024/2025',
  'First Term'
);
```

**2. approve_payment()**
```sql
-- Director approves a payment
SELECT approve_payment(
  'payment-uuid-here',
  'director-uuid-here'
);
```

**3. reject_payment()**
```sql
-- Director rejects a payment
SELECT reject_payment(
  'payment-uuid-here',
  'director-uuid-here',
  'Invalid receipt number'
);
```

---

## 🔒 Security (RLS Policies)

### Finance Admin Can:
- ✅ View all payments
- ✅ Insert new payments
- ✅ Update pending payments
- ✅ Delete pending payments
- ❌ Cannot modify approved/rejected payments

### Director Can:
- ✅ View all payments
- ✅ Approve pending payments
- ✅ Reject pending payments
- ✅ View approval history
- ❌ Cannot delete payments

### IT Admin Can:
- ✅ View all payments (read-only)
- ❌ Cannot modify payments

### Students Can:
- ✅ View their own approved payments only
- ❌ Cannot see pending or rejected payments
- ❌ Cannot modify any payments

---

## 🎨 Data Flow

### Manual Payment Entry Flow:
```
1. Finance Admin enters payment
   ↓
2. Payment saved with status='pending'
   ↓
3. Director sees it in approval queue
   ↓
4. Director approves/rejects
   ↓
5. Status updated to 'approved' or 'rejected'
   ↓
6. Student can now see approved payment
```

### Bulk Upload Flow:
```
1. Finance Admin uploads Excel file
   ↓
2. Batch record created in payment_upload_batches
   ↓
3. Each row creates a payment record
   ↓
4. All payments have status='pending'
   ↓
5. Director bulk approves/rejects
   ↓
6. Batch summary shows approval counts
```

---

## 📁 Excel Upload Format (Phase 2)

For bulk uploads, the Excel file should have these columns:

| Column | Format | Example |
|--------|--------|---------|
| Student Email | email | student@school.com |
| Amount | number | 50000 |
| Payment Date | DD/MM/YYYY | 15/10/2024 |
| Payment Method | text | Bank Transfer |
| Reference Number | text | TRF12345 |
| Description | text | School fees |

**Note:** Bulk upload functionality will be implemented in Phase 2 backend.

---

## ✅ Verification Checklist

After running the migration, verify:

- [ ] No errors in SQL Editor output
- [ ] `payments` table exists
- [ ] `payment_upload_batches` table exists
- [ ] All 11 RLS policies created
- [ ] All 9 indexes created
- [ ] Both helper views created
- [ ] All 4 helper functions created
- [ ] Test payment can be inserted
- [ ] Test payment appears in views

---

## 🐛 Troubleshooting

### Error: "relation already exists"
**Solution:** Tables already created. Skip to verification step.

### Error: "permission denied"
**Solution:** Make sure you're using Supabase service role key, not anon key.

### Error: "foreign key constraint"
**Solution:** Ensure `profiles` table exists and has students with `status='active'`.

### No data showing in views
**Solution:** Insert at least one test payment using the sample SQL above.

---

## 🎯 Next Steps After Migration

Once Phase 1 migration is complete:

1. ✅ **Phase 1 Complete** - Database ready
2. ⏳ **Phase 2** - Create backend API endpoints (10 routes)
3. ⏳ **Phase 3** - Build Finance Module UI
4. ⏳ **Phase 4** - Implement Director approval workflow
5. ⏳ **Phase 5** - Add bulk upload functionality
6. ⏳ **Phase 6** - Integrate with transcript system
7. ⏳ **Phase 7** - Testing & training

---

## 📞 Support

If you encounter issues:

1. Check the verification output
2. Review error messages in SQL Editor
3. Confirm Finance Admin user exists
4. Ensure you have proper Supabase access
5. Check that `profiles` table has student data

---

## 🎉 Success Indicators

You'll know the migration was successful when:

- ✅ SQL Editor shows success messages
- ✅ Verification script shows "ALL CHECKS PASSED"
- ✅ You can insert a test payment
- ✅ Payment appears in `payment_summary` view
- ✅ RLS policies prevent unauthorized access

**Ready to proceed to Phase 2 backend implementation!**

---

## 📚 Related Files

- `FINANCE_MODULE_PHASE1_MIGRATIONS.sql` - Main migration file
- `VERIFY_FINANCE_PHASE1_MIGRATIONS.sql` - Verification script
- `FINANCE_MODULE_PRD.md` - Full project requirements
- `CREATE_FINANCE_ADMIN_USER.sql` - Finance Admin setup
- `VERIFY_FINANCE_ADMIN_SETUP.sql` - Finance Admin verification

---

**Last Updated:** November 6, 2025  
**Version:** 1.0  
**Status:** Ready to run ✅
