# Test Finance Balance Calculation Fix

## Quick Test (30 seconds)

1. **Log in as Director**
2. **Go to**: Finance → Pending Payment Approvals
3. **Open Console**: Press F12 → Console tab
4. **Check the table**: Look for Anthony Morgan's pending payment
5. **Verify**:
   - Total Paid shows: **₦175,000.00** (not ₦75,000) ✅
   - Balance shows: **₦195,000.00** (not ₦295,000) ✅

6. **Check Console Logs**: Look for:
```javascript
[DirectorPayments] Payment xxx: {
  student: "Anthony Morgan",
  total_after_this_approval: 175000,  // ← Should match "Total Paid" column
  balance_after_approval: 195000      // ← Should match "Balance" column
}
```

## Detailed Test

### Setup (if needed)
If you need to create test data:

1. **As Finance Admin**, create a payment:
   - Student: Any day student
   - Amount: ₦75,000
   - Part Payment: 1

2. **As Director**, approve it

3. **As Finance Admin**, create another payment:
   - Same student
   - Amount: ₦100,000
   - Part Payment: 2
   - Status will be: PENDING

### Test 1: Director Pending Approvals

**Expected Result**:
- Amount: ₦100,000 (the current payment)
- Total Paid: ₦175,000 (₦75,000 + ₦100,000)
- Balance: ₦195,000 (₦370,000 - ₦175,000)

**Console Log Should Show**:
```javascript
[DirectorPayments] Payment xxx: {
  amount_paid: 100000,
  total_paid_approved_only: 75000,
  total_after_this_approval: 175000,
  balance_before_approval: 295000,
  balance_after_approval: 195000,
  required_amount: 370000
}
```

### Test 2: After Approval

**As Director**: Approve the payment

**Then as Finance Admin**: 
1. Go to Finance → Manage Payments
2. Filter: Approved
3. Find both payments for the same student

**Expected for EACH payment**:
- Total Paid: ₦175,000 (sum of both)
- Balance: ₦195,000 (remaining)

**Console Log Should Show**:
```javascript
[PaymentsManagement] Payment xxx: {
  status: "approved",
  total_paid: 175000,
  balance: 195000,
  calculation: "370000 - 175000 = 195000"
}
```

### Test 3: Edge Cases

#### 3.1 Multiple Students
- Create payments for different students
- Verify each student's totals are calculated independently

#### 3.2 Different Terms
- Create payments for same student but different terms
- Verify totals are separate per term

#### 3.3 Overpayment
- Create payments totaling more than ₦370,000
- Verify balance shows negative (overpaid)
- Check that it displays "(Overpaid)" text

#### 3.4 No Fee Structure
- If fee structure is not set, required_amount should be 0
- Balance might show as negative of total paid

## Backend Logs to Check

Look for these in the server logs (Supabase Functions logs):

```javascript
[Finance] Fee structures found: X
[Finance] All approved payments: X

[Finance] Payment xxx FINAL: {
  studentId: "...",
  studentType: "day",
  session: "2025/2026",
  term: "First Term",
  matchingStructure: "Found (Day, ₦370000)",  // ← Should NOT be "NOT FOUND"
  requiredAmount: 370000,                      // ← Should NOT be 0
  totalPaid: 75000,                            // For pending = approved only
  balance: 295000,                             // For pending = without current
  calculation: "370000 - 75000 = 295000"
}
```

## Common Issues

### Issue: Total Paid still showing ₦75,000

**Solution**: 
1. Hard refresh browser (Ctrl + Shift + R or Cmd + Shift + R)
2. Clear cache
3. Check console for errors

### Issue: Balance showing negative

**Possible Causes**:
1. Fee structure not set → required_amount = 0
2. Student type mismatch (Day vs day, Boarding vs boarding)
3. Session/Term mismatch

**Debug**:
1. Check console logs for "matchingStructure: 'NOT FOUND'"
2. Go to Director → Fee Structure Configuration
3. Verify fee structure exists for the exact session/term/type

### Issue: Console shows "NOT FOUND" for fee structure

**Solution**:
1. Director → Fee Structure Configuration
2. Create fee structure:
   - Student Type: "Day" (capitalized)
   - Session: "2025/2026" (exact match)
   - Term: "First Term" (exact match)
   - Amount: 370000

## Success Criteria

✅ Director sees projected totals when reviewing pending payments
✅ Total Paid = previous approved + current pending
✅ Balance = required - total (including pending)
✅ Console logs show correct calculations
✅ Finance Admin sees actual totals for approved payments
✅ After approval, totals update correctly

## Rollback (if needed)

If there are issues, you can revert the changes:

1. Find `/components/finance/DirectorPaymentApprovals.tsx`
2. Lines 274-284
3. Change back to:
```tsx
<TableCell>
  {formatCurrency(payment.total_paid || 0)}
</TableCell>
<TableCell>
  {formatCurrency(Math.abs(payment.balance))}
</TableCell>
```

But this will show the WRONG values (the original bug).

## Notes

- Backend calculation is correct and unchanged
- Only frontend display logic was modified
- Pending payments show PROJECTED values
- Approved payments show ACTUAL values
- This helps Director make informed decisions
