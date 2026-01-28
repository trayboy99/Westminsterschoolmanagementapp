# Finance Module - Complete Architecture

## 🏗️ System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                     FINANCE MODULE SYSTEM                        │
└─────────────────────────────────────────────────────────────────┘

┌──────────────────┐         ┌──────────────────┐
│  Finance Admin   │         │    Director      │
│   Dashboard      │         │   Dashboard      │
└────────┬─────────┘         └────────┬─────────┘
         │                            │
         │  Payment Entry             │  Approval
         │  Bulk Upload               │  Rejection
         │  Management                │  Review
         │  Reports                   │
         │                            │
         └────────────┬───────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Backend API Layer    │
         │   (10 Endpoints)       │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │   Database Layer       │
         │   (Supabase/Postgres)  │
         └────────────────────────┘
```

---

## 🗄️ Database Schema

```sql
┌──────────────────────────────────────┐
│         fee_payments                 │
├──────────────────────────────────────┤
│ id                UUID PK            │
│ student_id        UUID FK →profiles  │
│ academic_year     TEXT               │
│ term              TEXT               │
│ amount_paid       DECIMAL(10,2)      │
│ payment_date      DATE               │
│ payment_method    TEXT               │
│ receipt_number    TEXT               │
│ approval_status   TEXT               │ ← pending/approved/rejected
│ entered_by        UUID FK →profiles  │
│ approved_by       UUID FK →profiles  │
│ approved_at       TIMESTAMP          │
│ rejection_reason  TEXT               │
│ notes             TEXT               │
│ created_at        TIMESTAMP          │
│ updated_at        TIMESTAMP          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│      student_clearance               │
├──────────────────────────────────────┤
│ id                UUID PK            │
│ student_id        UUID FK →profiles  │
│ academic_year     TEXT               │
│ term              TEXT               │
│ required_amount   DECIMAL(10,2)      │
│ is_cleared        BOOLEAN            │
│ cleared_at        TIMESTAMP          │
│ cleared_by        UUID FK →profiles  │
│ notes             TEXT               │
│ created_at        TIMESTAMP          │
│ updated_at        TIMESTAMP          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│      payment_receipts                │
├──────────────────────────────────────┤
│ id                UUID PK            │
│ payment_id        UUID FK →payments  │
│ receipt_number    TEXT UNIQUE        │
│ receipt_url       TEXT               │
│ generated_at      TIMESTAMP          │
│ generated_by      UUID FK →profiles  │
└──────────────────────────────────────┘
```

---

## 🔌 Backend API Endpoints

### Payment CRUD Operations

```
1. POST   /finance/payments
   ├─ Role: finance_admin
   ├─ Input: student_id, academic_year, term, amount_paid, etc.
   ├─ Output: Created payment with status "pending"
   └─ Purpose: Manual payment entry

2. POST   /finance/payments/bulk
   ├─ Role: finance_admin
   ├─ Input: Array of payment objects
   ├─ Output: Count of created payments
   └─ Purpose: Bulk CSV/Excel upload

3. GET    /finance/payments
   ├─ Role: finance_admin, director
   ├─ Params: ?academic_year=&term=&approval_status=&student_id=
   ├─ Output: Filtered payments array with relations
   └─ Purpose: List and filter payments

4. PATCH  /finance/payments/:id
   ├─ Role: finance_admin
   ├─ Input: Updated payment fields
   ├─ Output: Updated payment object
   ├─ Constraint: Cannot edit approved payments
   └─ Purpose: Modify pending payment

5. DELETE /finance/payments/:id
   ├─ Role: finance_admin
   ├─ Output: Success message
   ├─ Constraint: Cannot delete approved payments
   └─ Purpose: Remove incorrect entry
```

### Approval & Workflow

```
6. POST   /finance/payments/:id/approve
   ├─ Role: director
   ├─ Input: { action: "approve" | "reject", rejection_reason? }
   ├─ Output: Updated payment with new status
   └─ Purpose: Director approval workflow
```

### Reports & Analytics

```
7. GET    /finance/clearance/:student_id
   ├─ Role: finance_admin, director
   ├─ Params: ?academic_year=&term=
   ├─ Output: Student clearance status + payments
   └─ Purpose: Individual student clearance check

8. GET    /finance/clearance/report
   ├─ Role: finance_admin, director
   ├─ Params: ?academic_year=&term=&class_id=
   ├─ Output: Full clearance report + summary
   └─ Purpose: Class-wide clearance tracking

9. GET    /finance/statistics
   ├─ Role: finance_admin, director
   ├─ Params: ?academic_year=&term=
   ├─ Output: Payment counts, amounts, breakdowns
   └─ Purpose: Dashboard statistics

10. GET   /finance/payments/export
    ├─ Role: finance_admin, director
    ├─ Params: ?academic_year=&term=&approval_status=
    ├─ Output: CSV-formatted payment data
    └─ Purpose: Export for accounting
```

---

## 🎨 Frontend Component Tree

```
App.tsx
└── DirectorDashboardContent
    └── Finance Section
        ├── isFinanceAdmin?
        │   └── FinanceAdminDashboard
        │       ├── FinanceStatistics
        │       ├── Tabs
        │       │   ├── Overview (Info cards)
        │       │   ├── PaymentEntryForm
        │       │   ├── BulkPaymentUpload
        │       │   ├── PaymentsManagement
        │       │   └── ClearanceReport
        │       └── Year/Term Filters
        │
        └── isDirector?
            └── DirectorPaymentApprovals
                ├── Pending Payments Table
                ├── Payment Details Modal
                ├── Approve Button
                └── Reject Dialog
```

### Component Details

```
┌──────────────────────────────────────┐
│   FinanceAdminDashboard              │
├──────────────────────────────────────┤
│ Purpose: Main dashboard container    │
│ Features:                            │
│  • Tab-based navigation              │
│  • Global year/term filters          │
│  • Statistics display                │
│  • Refresh mechanism                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   FinanceStatistics                  │
├──────────────────────────────────────┤
│ Purpose: Dashboard metrics cards     │
│ Displays:                            │
│  • Total Payments count              │
│  • Pending count + amount            │
│  • Approved count + amount           │
│  • Rejected count + amount           │
│  • Payment method breakdown          │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   PaymentEntryForm                   │
├──────────────────────────────────────┤
│ Purpose: Manual payment creation     │
│ Fields:                              │
│  • Student dropdown                  │
│  • Academic year selector            │
│  • Term selector                     │
│  • Amount input (₦)                  │
│  • Payment date picker               │
│  • Payment method selector           │
│  • Receipt number input              │
│  • Notes textarea                    │
│ Modes: Create | Edit                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   BulkPaymentUpload                  │
├──────────────────────────────────────┤
│ Purpose: CSV/Excel bulk import       │
│ Features:                            │
│  • Template download                 │
│  • Drag & drop upload                │
│  • CSV preview (first 5 rows)        │
│  • Batch processing                  │
│  • Error handling                    │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   PaymentsManagement                 │
├──────────────────────────────────────┤
│ Purpose: Payments CRUD interface     │
│ Features:                            │
│  • Search by name/receipt            │
│  • Filter by year/term/status        │
│  • Sortable table                    │
│  • Edit button (pending only)        │
│  • Delete button (pending only)      │
│  • Export to CSV                     │
│  • Pagination (future)               │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   DirectorPaymentApprovals           │
├──────────────────────────────────────┤
│ Purpose: Director review interface   │
│ Features:                            │
│  • Pending payments only             │
│  • View details modal                │
│  • One-click approve                 │
│  • Reject with reason                │
│  • Real-time refresh                 │
└──────────────────────────────────────┘

┌──────────────────────────────────────┐
│   ClearanceReport                    │
├──────────────────────────────────────┤
│ Purpose: Student clearance tracking  │
│ Displays:                            │
│  • Summary statistics                │
│  • Student clearance table           │
│  • Total paid vs required            │
│  • Balance calculation               │
│  • Status badges                     │
│  • Progress indicators               │
│  • Filter by class                   │
│  • Export to CSV                     │
└──────────────────────────────────────┘
```

---

## 🔐 Security & Permissions Matrix

```
┌────────────────┬───────────────┬────────────┬─────────────┐
│ Action         │ Finance Admin │ Director   │ Other Roles │
├────────────────┼───────────────┼────────────┼─────────────┤
│ View Dashboard │      ✅       │     ✅     │     ❌      │
│ Create Payment │      ✅       │     ❌     │     ❌      │
│ Edit Pending   │      ✅       │     ❌     │     ❌      │
│ Delete Pending │      ✅       │     ❌     │     ❌      │
│ Approve Payment│      ❌       │     ✅     │     ❌      │
│ Reject Payment │      ❌       │     ✅     │     ❌      │
│ Edit Approved  │      ❌       │     ❌     │     ❌      │
│ Delete Approved│      ❌       │     ❌     │     ❌      │
│ View Reports   │      ✅       │     ✅     │     ❌      │
│ Export Data    │      ✅       │     ✅     │     ❌      │
└────────────────┴───────────────┴────────────┴─────────────┘
```

---

## 🔄 Payment Workflow

```
┌─────────────────────────────────────────────────────────┐
│                  PAYMENT LIFECYCLE                      │
└─────────────────────────────────────────────────────────┘

Step 1: ENTRY (Finance Admin)
┌──────────────┐
│  Manual OR   │
│  Bulk Upload │
└──────┬───────┘
       │
       ▼
┌──────────────────┐
│ Status: PENDING  │ ← Payment created
│ entered_by: UUID │
│ created_at: now  │
└──────┬───────────┘
       │
       │ (Appears in Director's pending list)
       │
       ▼
Step 2: REVIEW (Director)
┌──────────────────┐
│  View Details    │
│  Check Amount    │
│  Verify Student  │
└──────┬───────────┘
       │
       ├──► APPROVE ───┐
       │               │
       └──► REJECT ────┤
                       │
                       ▼
Step 3: DECISION
┌─────────────────────────────┐
│  APPROVED                   │  REJECTED
│  approval_status: approved  │  approval_status: rejected
│  approved_by: UUID          │  approved_by: UUID
│  approved_at: now           │  approved_at: now
│  ✅ Counts in clearance     │  rejection_reason: TEXT
│  ✅ Cannot be edited        │  ❌ Does not count
│  ✅ Cannot be deleted       │  ✅ Can be deleted
└─────────────────────────────┘
```

---

## 📊 Data Flow Diagrams

### Payment Entry Flow

```
Finance Admin Dashboard
        ↓
[Create Payment] OR [Upload CSV]
        ↓
Frontend Validation
        ↓
POST /finance/payments
        ↓
Backend Auth Check
        ↓
Insert into fee_payments
        ↓
status = "pending"
        ↓
Return success + payment object
        ↓
Update UI (Toast + Refresh)
```

### Approval Flow

```
Director Dashboard
        ↓
GET /finance/payments?approval_status=pending
        ↓
Display Pending Table
        ↓
[Approve] Button Clicked
        ↓
POST /finance/payments/:id/approve
        ↓
Backend Checks:
  • User is director? ✅
  • Payment is pending? ✅
        ↓
UPDATE fee_payments
  SET approval_status = 'approved'
  SET approved_by = director_id
  SET approved_at = now()
        ↓
Return success
        ↓
Remove from pending list
Update statistics
```

### Clearance Calculation

```
GET /finance/clearance/report
        ↓
For each student:
  1. Get student details
  2. Get approved payments
     WHERE student_id = student.id
     AND approval_status = 'approved'
  3. SUM(amount_paid) as total_paid
  4. Get required_amount from student_clearance
  5. Calculate balance = required - paid
  6. Determine is_cleared
        ↓
Return array of clearance records
        ↓
Display in table with color coding
```

---

## 🎯 Key Design Decisions

### 1. Two-Tier Approval System
**Why**: Separation of duties prevents fraud
- Finance Admin: Data entry only
- Director: Approval authority only
- No single person can create and approve

### 2. Immutable Approved Payments
**Why**: Audit trail integrity
- Once approved, cannot be modified
- Prevents tampering with financial records
- All changes tracked via timestamps

### 3. Soft Delete for Rejected Payments
**Why**: Maintain history
- Rejected payments stay in database
- Can analyze reasons for rejections
- Finance Admin can review and fix

### 4. Session/Term Scoping
**Why**: Aligns with school calendar
- Payments tied to specific terms
- Reports generated per term
- Clearance tracked per term

### 5. Currency Formatting
**Why**: Nigerian context
- All amounts in ₦ (Naira)
- Decimal precision for kobo
- Localized number formatting

---

## 🚀 Performance Considerations

### Database Indexes

```sql
-- Fast lookups by student
CREATE INDEX idx_payments_student ON fee_payments(student_id);

-- Fast filtering by status
CREATE INDEX idx_payments_status ON fee_payments(approval_status);

-- Fast filtering by term
CREATE INDEX idx_payments_term ON fee_payments(academic_year, term);

-- Fast approval queries
CREATE INDEX idx_payments_approval ON fee_payments(approval_status, created_at);
```

### API Optimization

```
• Pagination for large payment lists (future)
• Caching statistics on backend (future)
• Lazy loading for student dropdown
• Debounced search inputs
• Batch queries for clearance report
```

---

## 📈 Future Enhancements

### Phase 5: Advanced Features

1. **Fee Structure**
   - Define required amounts per class
   - Support multiple fee types
   - Installment tracking

2. **Receipt Generation**
   - Auto-generate PDF receipts
   - Email to parents
   - QR code verification

3. **Payment Reminders**
   - Auto-send reminders
   - SMS/Email integration
   - Parent portal access

4. **Advanced Reports**
   - Income statements
   - Cash flow analysis
   - Defaulter lists
   - Revenue forecasting

5. **Integration**
   - Bank API integration
   - Mobile money support
   - Online payment gateway
   - Automated reconciliation

---

## 📝 Documentation Map

```
Finance Module Documentation
├── FINANCE_MODULE_PRD.md                    # Requirements
├── FINANCE_PHASE1_COMPLETE_SUMMARY.md       # Database setup
├── FINANCE_MODULE_PHASE2_AND_3_COMPLETE.md  # Backend + Frontend
├── FINANCE_MODULE_ARCHITECTURE.md           # This file
├── TEST_FINANCE_MODULE_NOW.md               # Testing guide
├── FINANCE_ADMIN_SETUP_VISUAL_GUIDE.md      # User setup
└── FINANCE_MODULE_PHASE1_MIGRATIONS.sql     # SQL scripts
```

---

## 🎓 Learning Resources

### For Developers
- Understand REST API design
- Learn role-based access control
- Study approval workflows
- Master React hooks
- Understand Supabase auth

### For Finance Admin
- How to enter payments
- Bulk upload process
- Generating reports
- Understanding clearance

### For Director
- Review workflow
- Approval process
- Rejection reasons
- Report interpretation

---

**Architecture Version**: 1.0  
**Last Updated**: November 6, 2024  
**Status**: Production Ready ✅
