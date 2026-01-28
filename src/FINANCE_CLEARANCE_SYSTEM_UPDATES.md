# Finance Module - Clearance System Updates

## Summary

The finance endpoints exist (starting at line 11373 in `/supabase/functions/server/index.tsx`) but need updates to handle the new clearance system with:

1. **Day/Boarding student types** with different required fees
2. **Part payment system** (multiple installments per student per term)
3. **Auto-calculated clearance status** based on total_paid >= required_amount
4. **Outstanding balance tracking** including brought forward amounts

## Required Updates

### Part 1: Database Tables (✅ CREATED)
- Created `/FINANCE_MODULE_CLEARANCE_MIGRATIONS.sql` with:
  - `fee_structure` table (Day/Boarding fees per term)
  - `student_clearance` table (tracks clearance per student/session/term)
  - Modified `payments` table to add `part_payment_number` column
  - Modified `profiles` table to add `student_type` column
  - Trigger to auto-update clearance when payments are approved

### Part 2: Update Backend Endpoints (⏳ IN PROGRESS)
**File:** `/supabase/functions/server/index.tsx` starting at line 11373

#### Changes Needed:

1. **POST /finance/payments** (line 11377)
   - Change table from `fee_payments` to `payments`
   - Auto-calculate `part_payment_number` for the student/session/term
   - Use session_id/term_id instead of academic_year/term strings
   
2. **GET /finance/payments** 
   - Join with `student_clearance` to show clearance status
   - Group by student to show all part payments together

3. **POST /finance/payments/:id/approve** (Director approval)
   - Trigger auto-updates clearance via database trigger

### Part 3: Update Frontend Components (⏳ IN PROGRESS)

#### Payment Entry Form
**File:** `/components/finance/PaymentEntryForm.tsx`

Changes needed:
- Add student_type dropdown (Day/Boarding) 
- Fetch required_amount from `fee_structure` based on student_type + session + term
- Show part_payment_number (auto-calculated)
- Display outstanding balance

#### Director Payment Approvals View  
**File:** `/components/finance/DirectorPaymentApprovals.tsx`

Changes needed:
- Show part payment installment numbers (Part 1 of 3, Part 2 of 3, etc.)
- Display student_type, required_amount, total_paid, outstanding_balance
- Group payments by student to show payment history
- Show clearance status badge (Cleared / Not Cleared)

### Part 4: New Components Needed

#### Fee Structure Manager
Create `/components/finance/FeeStructureManager.tsx`
- Allow Finance Admin to configure Day/Boarding fees per session/term
- CRUD operations for `fee_structure` table

## Implementation Order

1. ✅ Run database migrations (`/FINANCE_MODULE_CLEARANCE_MIGRATIONS.sql`)
2. ⏳ Update backend payment endpoints (next step)
3. ⏳ Update PaymentEntryForm component
4. ⏳ Update DirectorPaymentApprovals component  
5. ⏳ Create FeeStructureManager component

## Key Business Logic

### Part Payment Flow:
1. Finance Admin enters payment for Student A, Term 1 → Creates payment with `part_payment_number = 1`
2. Finance Admin enters another payment for Student A, Term 1 → System auto-assigns `part_payment_number = 2`
3. Director approves Part 1 → Database trigger updates `student_clearance.total_paid`
4. Director approves Part 2 → Database trigger updates `student_clearance.total_paid` again
5. If `total_paid >= required_amount` → `student_clearance.is_cleared = true` (auto-calculated)

### Clearance Unlocks:
- Access to report cards/results
- Eligibility for transcript PINs

## Testing Checklist

After implementation:
- [ ] Create Day student with ₦50,000 required fee
- [ ] Enter Part 1 payment of ₦20,000
- [ ] Enter Part 2 payment of ₦30,000  
- [ ] Director approves both payments
- [ ] Verify `student_clearance.is_cleared = true`
- [ ] Verify outstanding_balance = ₦0
- [ ] Test with Boarding student (different required fee)
- [ ] Test brought forward balance from previous term

