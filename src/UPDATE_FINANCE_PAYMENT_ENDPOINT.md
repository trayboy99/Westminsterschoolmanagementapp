# Update Finance Payment Endpoint - Part Payment Support

## Changes Needed in `/supabase/functions/server/index.tsx`

Find line **11377** and replace the entire POST /finance/payments endpoint with this updated version:

```typescript
// 1. POST /finance/payments - Create payment entry with auto part_payment_number
app.post("/make-server-1ddd013a/finance/payments", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    if (!accessToken) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user?.id) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Verify user is finance_admin
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "finance_admin") {
      return c.json({ success: false, error: "Access denied - Finance Admin only" }, 403);
    }

    const body = await c.req.json();
    const { student_id, session, term, amount, payment_date, payment_method, reference_number, description } = body;

    console.log("[Finance] Creating payment entry:", { student_id, session, term, amount });

    if (!student_id || !session || !term || !amount || !payment_date || !payment_method) {
      return c.json({
        success: false,
        error: "Missing required fields: student_id, session, term, amount, payment_date, payment_method"
      }, 400);
    }

    // Calculate next part_payment_number for this student/session/term
    const { data: existingPayments } = await supabase
      .from("payments")
      .select("part_payment_number")
      .eq("student_id", student_id)
      .eq("session", session)
      .eq("term", term)
      .order("part_payment_number", { ascending: false })
      .limit(1);

    const nextPartPaymentNumber = existingPayments && existingPayments.length > 0
      ? (existingPayments[0].part_payment_number + 1)
      : 1;

    console.log("[Finance] Assigning part_payment_number:", nextPartPaymentNumber);

    // Insert payment record
    const { data: payment, error: paymentError } = await supabase
      .from("payments")
      .insert({
        student_id,
        session,
        term,
        amount: parseFloat(amount),
        payment_date,
        payment_method,
        reference_number: reference_number || null,
        description: description || null,
        entered_by: user.id,
        status: "pending",
        part_payment_number: nextPartPaymentNumber,
        created_at: new Date().toISOString()
      })
      .select()
      .single();

    if (paymentError) {
      console.error("[Finance] Error creating payment:", paymentError);
      return c.json({ success: false, error: paymentError.message }, 500);
    }

    console.log("[Finance] Payment created successfully:", payment.id, "Part", nextPartPaymentNumber);

    return c.json({
      success: true,
      message: `Payment entry created successfully (Part ${nextPartPaymentNumber})`,
      payment
    });
  } catch (error) {
    console.error("[Finance] Error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create payment"
    }, 500);
  }
});
```

## Key Changes:

1. **Auto-calculates `part_payment_number`**
   - Queries existing payments for same student/session/term
   - Gets MAX(part_payment_number) and adds 1
   - First payment = 1, second = 2, third = 3, etc.

2. **Uses correct table**: `payments` (not `fee_payments`)

3. **Uses correct columns**: 
   - `session` and `term` (strings from academic tables)
   - `amount` (instead of `amount_paid`)
   - `status` (instead of `approval_status`)
   - `entered_by` (already correct)

4. **Returns part payment info** in success message

## Testing:

```bash
# After updating the endpoint, test it:

# 1. Create first payment for a student
POST /finance/payments
{
  "student_id": "uuid-here",
  "session": "2024/2025",
  "term": "First Term",
  "amount": 20000,
  "payment_date": "2025-01-15",
  "payment_method": "Cash",
  "reference_number": "REC001",
  "description": "First installment"
}
# Should return: part_payment_number = 1

# 2. Create second payment for same student
POST /finance/payments
{
  "student_id": "same-uuid",
  "session": "2024/2025",
  "term": "First Term",
  "amount": 30000,
  "payment_date": "2025-02-15",
  "payment_method": "Bank Transfer",
  "reference_number": "REC002",
  "description": "Second installment"
}
# Should return: part_payment_number = 2
```

## Next: Update Director View

See file: `/components/finance/DirectorPaymentApprovalsTable.tsx` (to be created)

