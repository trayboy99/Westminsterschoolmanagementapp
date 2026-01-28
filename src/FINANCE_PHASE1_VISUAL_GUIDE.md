# 🎨 Finance Module Phase 1 - Visual Database Architecture

## 📊 Database Schema Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    FINANCE MODULE DATABASE                          │
│                         Phase 1                                     │
└─────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                        PAYMENTS TABLE                            │
├──────────────────────────────────────────────────────────────────┤
│  id                    UUID (PK)                                 │
│  ─────────────────────────────────────────────────────           │
│  student_id            UUID (FK → profiles)                      │
│  session               VARCHAR(9)    "2024/2025"                 │
│  term                  VARCHAR(20)   "First Term"                │
│  ─────────────────────────────────────────────────────           │
│  amount                DECIMAL(12,2) ₦50,000.00                  │
│  payment_date          DATE          2024-10-15                  │
│  payment_method        VARCHAR(50)   "Bank Transfer"             │
│  reference_number      VARCHAR(100)  "TRF12345"                  │
│  description           TEXT          "School fees"               │
│  category              VARCHAR(50)   "School Fees"               │
│  ─────────────────────────────────────────────────────           │
│  status                VARCHAR(20)   pending/approved/rejected   │
│  director_id           UUID (FK → profiles)                      │
│  approval_date         TIMESTAMP                                 │
│  rejection_reason      TEXT                                      │
│  ─────────────────────────────────────────────────────────       │
│  entered_by            UUID (FK → profiles)                      │
│  entry_method          VARCHAR(20)   manual/bulk_upload          │
│  bulk_upload_batch_id  UUID (FK → batches)                       │
│  ─────────────────────────────────────────────────────           │
│  created_at            TIMESTAMP                                 │
│  updated_at            TIMESTAMP                                 │
└──────────────────────────────────────────────────────────────────┘
                              │
                              │ References
                              ↓
┌──────────────────────────────────────────────────────────────────┐
│                  PAYMENT_UPLOAD_BATCHES TABLE                    │
├──────────────────────────────────────────────────────────────────┤
│  id                    UUID (PK)                                 │
│  ─────────────────────────────────────────────────────           │
│  filename              VARCHAR(255)  "fees_oct_2024.xlsx"        │
│  total_rows            INTEGER       150                         │
│  successful_rows       INTEGER       148                         │
│  failed_rows           INTEGER       2                           │
│  ─────────────────────────────────────────────────────           │
│  session               VARCHAR(9)    "2024/2025"                 │
│  term                  VARCHAR(20)   "First Term"                │
│  ─────────────────────────────────────────────────────           │
│  uploaded_by           UUID (FK → profiles)                      │
│  uploaded_at           TIMESTAMP                                 │
│  ─────────────────────────────────────────────────────────       │
│  status                VARCHAR(20)   processing/completed/failed │
│  error_log             TEXT (JSON)                               │
│  ─────────────────────────────────────────────────────           │
│  pending_count         INTEGER       50                          │
│  approved_count        INTEGER       90                          │
│  rejected_count        INTEGER       8                           │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔐 Row Level Security (RLS) Policies

```
┌─────────────────────────────────────────────────────────────┐
│                    PAYMENTS TABLE RLS                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Finance Admin:                                             │
│  ┌─────────────────────────────────────────────────┐       │
│  │ ✅ SELECT   - View all payments                 │       │
│  │ ✅ INSERT   - Create new payments               │       │
│  │ ✅ UPDATE   - Edit pending payments only        │       │
│  │ ✅ DELETE   - Delete pending payments only      │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Director:                                                  │
│  ┌─────────────────────────────────────────────────┐       │
│  │ ✅ SELECT   - View all payments                 │       │
│  │ ✅ UPDATE   - Approve/reject any payment        │       │
│  │ ❌ INSERT   - Cannot create payments            │       │
│  │ ❌ DELETE   - Cannot delete payments            │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  IT Admin:                                                  │
│  ┌─────────────────────────────────────────────────┐       │
│  │ ✅ SELECT   - View all payments (read-only)     │       │
│  │ ❌ INSERT   - Cannot create                     │       │
│  │ ❌ UPDATE   - Cannot modify                     │       │
│  │ ❌ DELETE   - Cannot delete                     │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
│  Student:                                                   │
│  ┌─────────────────────────────────────────────────┐       │
│  │ ✅ SELECT   - View own APPROVED payments only   │       │
│  │ ❌ INSERT   - Cannot create                     │       │
│  │ ❌ UPDATE   - Cannot modify                     │       │
│  │ ❌ DELETE   - Cannot delete                     │       │
│  └─────────────────────────────────────────────────┘       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔄 Payment Lifecycle Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                      PAYMENT LIFECYCLE                           │
└──────────────────────────────────────────────────────────────────┘

STEP 1: Payment Entry (Finance Admin)
┌─────────────────────────────────────────┐
│  Finance Admin enters payment           │
│  ───────────────────────────────────    │
│  • Student: John Doe                    │
│  • Amount: ₦50,000                      │
│  • Method: Bank Transfer                │
│  • Reference: TRF12345                  │
│                                         │
│  → Status: PENDING                      │
└─────────────────────────────────────────┘
              │
              ↓
STEP 2: Stored in Database
┌─────────────────────────────────────────┐
│  payments table                         │
│  ───────────────────────────────────    │
│  id: abc-123                            │
│  student_id: student-uuid               │
│  amount: 50000.00                       │
│  status: pending                        │
│  entered_by: finance-admin-uuid         │
│  entry_method: manual                   │
│  created_at: 2024-11-06 10:30:00       │
└─────────────────────────────────────────┘
              │
              ↓
STEP 3: Director Review
┌─────────────────────────────────────────┐
│  Director sees in approval queue        │
│  ───────────────────────────────────    │
│  • Student: John Doe (JSS 2A)          │
│  • Amount: ₦50,000                      │
│  • Date: 15-Oct-2024                    │
│  • Reference: TRF12345                  │
│                                         │
│  [Approve]  [Reject]                    │
└─────────────────────────────────────────┘
         │              │
         ↓              ↓
    APPROVED        REJECTED
         │              │
         ↓              ↓
┌──────────────┐  ┌──────────────┐
│ Status:      │  │ Status:      │
│ approved     │  │ rejected     │
│              │  │              │
│ director_id  │  │ director_id  │
│ set          │  │ set          │
│              │  │              │
│ approval_    │  │ approval_    │
│ date set     │  │ date set     │
│              │  │              │
│ Student can  │  │ rejection_   │
│ now see      │  │ reason set   │
└──────────────┘  └──────────────┘
```

---

## 📊 Helper Views

### View 1: payment_summary

```
┌────────────────────────────────────────────────────────────────┐
│  PAYMENT_SUMMARY VIEW                                          │
│  Groups payments by student, session, term                     │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SELECT * FROM payment_summary                                 │
│  WHERE session = '2024/2025' AND term = 'First Term';         │
│                                                                │
│  Result:                                                       │
│  ┌─────────┬──────────┬─────────┬──────────┬──────────┬────┐ │
│  │ Student │ Class    │ Session │ Approved │ Pending  │... │ │
│  ├─────────┼──────────┼─────────┼──────────┼──────────┼────┤ │
│  │ John    │ JSS 2A   │2024/2025│ ₦50,000  │ ₦0       │    │ │
│  │ Mary    │ JSS 2A   │2024/2025│ ₦45,000  │ ₦5,000   │    │ │
│  │ Peter   │ JSS 2B   │2024/2025│ ₦0       │ ₦50,000  │    │ │
│  └─────────┴──────────┴─────────┴──────────┴──────────┴────┘ │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

### View 2: pending_payment_approvals

```
┌────────────────────────────────────────────────────────────────┐
│  PENDING_PAYMENT_APPROVALS VIEW                                │
│  Lists all payments awaiting Director approval                 │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  SELECT * FROM pending_payment_approvals;                      │
│                                                                │
│  Result (Director sees):                                       │
│  ┌─────────┬────────┬──────────┬────────┬──────────────┐      │
│  │ Student │ Class  │ Amount   │ Date   │ Entered By   │      │
│  ├─────────┼────────┼──────────┼────────┼──────────────┤      │
│  │ John    │ JSS 2A │ ₦50,000  │ Oct 15 │ Vivian E.    │      │
│  │ Mary    │ JSS 2A │ ₦45,000  │ Oct 16 │ Vivian E.    │      │
│  │ Peter   │ JSS 2B │ ₦50,000  │ Oct 17 │ Vivian E.    │      │
│  └─────────┴────────┴──────────┴────────┴──────────────┘      │
│                                                                │
│  [Bulk Approve All]  [Review Individually]                     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## ⚙️ Helper Functions

### Function 1: get_student_clearance_status()

```
┌──────────────────────────────────────────────────────────────┐
│  GET_STUDENT_CLEARANCE_STATUS()                              │
│  Check if student has paid fees                              │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Usage:                                                      │
│  SELECT * FROM get_student_clearance_status(                │
│    'student-uuid',                                           │
│    '2024/2025',                                              │
│    'First Term'                                              │
│  );                                                          │
│                                                              │
│  Returns:                                                    │
│  ┌────────────────┬───────────────┬────────────────┐        │
│  │ total_approved │ total_pending │ is_cleared     │        │
│  ├────────────────┼───────────────┼────────────────┤        │
│  │ ₦50,000.00     │ ₦0.00         │ TRUE           │        │
│  └────────────────┴───────────────┴────────────────┘        │
│                                                              │
│  Used for:                                                   │
│  • Transcript PIN eligibility check                          │
│  • Result access verification                                │
│  • Student clearance reports                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Function 2: approve_payment()

```
┌──────────────────────────────────────────────────────────────┐
│  APPROVE_PAYMENT()                                           │
│  Director approves a payment                                 │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Usage:                                                      │
│  SELECT approve_payment(                                     │
│    'payment-uuid',                                           │
│    'director-uuid'                                           │
│  );                                                          │
│                                                              │
│  What happens:                                               │
│  1. ✅ Verifies director role                                │
│  2. ✅ Updates status to 'approved'                          │
│  3. ✅ Sets director_id                                      │
│  4. ✅ Sets approval_date                                    │
│  5. ✅ Clears rejection_reason                               │
│                                                              │
│  Returns: TRUE if successful                                 │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### Function 3: reject_payment()

```
┌──────────────────────────────────────────────────────────────┐
│  REJECT_PAYMENT()                                            │
│  Director rejects a payment with reason                      │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  Usage:                                                      │
│  SELECT reject_payment(                                      │
│    'payment-uuid',                                           │
│    'director-uuid',                                          │
│    'Invalid bank teller number'                              │
│  );                                                          │
│                                                              │
│  What happens:                                               │
│  1. ✅ Verifies director role                                │
│  2. ✅ Updates status to 'rejected'                          │
│  3. ✅ Sets director_id                                      │
│  4. ✅ Sets approval_date                                    │
│  5. ✅ Stores rejection_reason                               │
│                                                              │
│  Finance Admin can then:                                     │
│  • View rejection reason                                     │
│  • Correct the issue                                         │
│  • Re-enter as new payment                                   │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

---

## 🎯 Payment Status States

```
┌──────────────────────────────────────────────────────────────┐
│                    PAYMENT STATUS FLOW                       │
└──────────────────────────────────────────────────────────────┘

           ┌─────────────┐
           │   PENDING   │ ← Initial state when Finance Admin enters
           │             │
           │ Can be:     │
           │ • Edited    │
           │ • Deleted   │
           └──────┬──────┘
                  │
          ┌───────┴────────┐
          │                │
          ↓                ↓
    ┌──────────┐    ┌──────────┐
    │ APPROVED │    │ REJECTED │
    │          │    │          │
    │ Cannot:  │    │ Cannot:  │
    │ • Edit   │    │ • Edit   │
    │ • Delete │    │ • Delete │
    └──────────┘    └──────────┘
          │                │
          │                │
    Student can      Finance Admin
    see payment      sees rejection
    in portal        reason
```

---

## 📈 Indexes for Performance

```
┌────────────────────────────────────────────────────────────────┐
│                      PERFORMANCE INDEXES                       │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Single-Column Indexes:                                        │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ idx_payments_student_id      - Fast student lookup  │     │
│  │ idx_payments_status          - Fast status filter   │     │
│  │ idx_payments_entered_by      - Finance Admin query  │     │
│  │ idx_payments_director_id     - Director audit       │     │
│  │ idx_payments_payment_date    - Date range queries   │     │
│  │ idx_payments_bulk_batch      - Batch tracking       │     │
│  │ idx_payments_created_at      - Recent payments      │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
│  Composite Indexes:                                            │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ idx_payments_session_term    - Term-based queries   │     │
│  │ idx_payments_student_session_term - Student fees    │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
│  Performance Benefits:                                         │
│  ✅ Fast Director approval queue (status='pending')            │
│  ✅ Fast student payment lookup by session/term                │
│  ✅ Fast Finance Admin payment history                         │
│  ✅ Fast bulk upload batch tracking                            │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

## 🔄 Integration Points

```
┌────────────────────────────────────────────────────────────────┐
│              FINANCE MODULE INTEGRATION POINTS                 │
└────────────────────────────────────────────────────────────────┘

1. Transcript PIN System Integration
   ┌─────────────────────────────────────────┐
   │  Before issuing transcript PIN:         │
   │                                         │
   │  SELECT * FROM                          │
   │  get_student_clearance_status(...)      │
   │                                         │
   │  IF is_cleared = TRUE THEN              │
   │    → Issue PIN                          │
   │  ELSE                                   │
   │    → Show "Payment required" message    │
   │  END IF                                 │
   └─────────────────────────────────────────┘

2. Graduated Students Module
   ┌─────────────────────────────────────────┐
   │  When promoting to graduated:           │
   │                                         │
   │  Check all terms paid:                  │
   │  • First Term: is_cleared?              │
   │  • Second Term: is_cleared?             │
   │  • Third Term: is_cleared?              │
   │                                         │
   │  IF all cleared THEN                    │
   │    → Allow graduation                   │
   │  ELSE                                   │
   │    → Block until fees paid              │
   │  END IF                                 │
   └─────────────────────────────────────────┘

3. Student Dashboard
   ┌─────────────────────────────────────────┐
   │  Show payment status badge:             │
   │                                         │
   │  ✅ "Fees Paid - All Clear"             │
   │  ⏳ "Payment Pending Approval"          │
   │  ❌ "No Payment Record"                 │
   └─────────────────────────────────────────┘
```

---

## ✨ What This Enables

```
┌────────────────────────────────────────────────────────────────┐
│                   CAPABILITIES ENABLED                         │
├────────────────────────────────────────────────────────────────┤
│                                                                │
│  Finance Admin Dashboard:                                      │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ • Enter individual payments                          │     │
│  │ • Upload Excel file with bulk payments               │     │
│  │ • View payment history                               │     │
│  │ • Track pending approvals                            │     │
│  │ • See rejection reasons from Director                │     │
│  │ • Generate payment reports                           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
│  Director Dashboard:                                           │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ • View all pending payments                          │     │
│  │ • Approve payments individually or in bulk           │     │
│  │ • Reject payments with reason                        │     │
│  │ • View payment approval history                      │     │
│  │ • Monitor school revenue                             │     │
│  │ • Track Finance Admin activity                       │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
│  Student Portal:                                               │
│  ┌──────────────────────────────────────────────────────┐     │
│  │ • View approved payment history                      │     │
│  │ • See payment receipts                               │     │
│  │ • Check clearance status                             │     │
│  │ • Download payment summary                           │     │
│  └──────────────────────────────────────────────────────┘     │
│                                                                │
└────────────────────────────────────────────────────────────────┘
```

---

**Last Updated:** November 6, 2025  
**Version:** 1.0  
**Status:** Ready for Phase 1 deployment ✅
