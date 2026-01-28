# 📊 VISUAL SYSTEM OVERVIEW - Itemized Fee Structure

## 🎯 THE PROBLEM WE'RE SOLVING

### **BEFORE (Current System):**
```
┌─────────────────────────────────────┐
│ Fee Structure (KV Store)            │
├─────────────────────────────────────┤
│ Day Student    → ₦150,000  (Total) │
│ Boarding Student → ₦230,000 (Total) │
└─────────────────────────────────────┘
         ↓
┌─────────────────────────────────────┐
│ Discount applies to ENTIRE amount   │
│ 10% discount = ₦15,000 off total    │
└─────────────────────────────────────┘
```
**Problem:** 
- Cannot separate Tuition from other fees
- Discount affects everything (including non-tuition items)
- No flexibility for itemized billing

---

### **AFTER (New System):**
```
┌─────────────────────────────────────────────────────┐
│ FEE STRUCTURE TABLE (Master List)                   │
├─────────────────────────────────────────────────────┤
│ ✅ Tuition      → ₦150,000 [Compulsory] [Tuition]  │
│ ☐  Boarding     → ₦80,000  [Optional]   [Not Tuition]│
│ ☐  Sports       → ₦5,000   [Optional]   [Not Tuition]│
│ ☐  Lab Materials→ ₦10,000  [Optional]   [Not Tuition]│
└─────────────────────────────────────────────────────┘
         ↓ Finance Admin Selects Items
┌─────────────────────────────────────────────────────┐
│ STUDENT FEE ASSIGNMENT (John Doe)                   │
├─────────────────────────────────────────────────────┤
│ ✅ Tuition      → ₦150,000 - 10% = ₦135,000        │
│ ✅ Boarding     → ₦80,000  (no discount)            │
│ ☐  Sports       → Not selected                      │
│ ☐  Lab Materials→ Not selected                      │
├─────────────────────────────────────────────────────┤
│ TOTAL REQUIRED  → ₦215,000                          │
└─────────────────────────────────────────────────────┘
```
**Solution:**
- ✅ Itemized fee breakdown
- ✅ Discount ONLY on tuition
- ✅ Flexible selection per student
- ✅ Transparent billing

---

## 🏗️ SYSTEM ARCHITECTURE

```
┌──────────────────────────────────────────────────────────────────┐
│                         DIRECTOR                                  │
│                  (Fee Structure Manager)                          │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Creates Fee Items
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│                  DATABASE: fee_structure                          │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Row 1: Tuition    │ ₦150K │ is_tuition: true  │ JSS1   │   │
│  │ Row 2: Boarding   │ ₦80K  │ is_tuition: false │ JSS1   │   │
│  │ Row 3: Sports     │ ₦5K   │ is_tuition: false │ JSS1   │   │
│  │ Row 4: Lab        │ ₦10K  │ is_tuition: false │ JSS1   │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Finance Admin Selects Items
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│                  FINANCE ADMIN                                    │
│              (Payment Entry Form)                                 │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Student: John Doe (JSS1)                               │     │
│  │ ☑ Tuition ₦150K → Discount: 10% → ₦135K              │     │
│  │ ☑ Boarding ₦80K  (no discount)                         │     │
│  │ ☐ Sports ₦5K                                           │     │
│  │ ☐ Lab ₦10K                                             │     │
│  │ TOTAL: ₦215K                                           │     │
│  └────────────────────────────────────────────────────────┘     │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Saves Assignment
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│                  DATABASE: fees                                   │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Assignment 1: John → Tuition  │ ₦150K │ 10% → ₦135K    │   │
│  │ Assignment 2: John → Boarding │ ₦80K  │  0% → ₦80K     │   │
│  │                                                          │   │
│  │ TRIGGER AUTO-CALCULATES: discounted_amount = ₦135K      │   │
│  └──────────────────────────────────────────────────────────┘   │
└────────────────────────┬─────────────────────────────────────────┘
                         │
                         │ Used for Clearance
                         ↓
┌──────────────────────────────────────────────────────────────────┐
│              CLEARANCE CALCULATION                                │
│  ┌────────────────────────────────────────────────────────┐     │
│  │ Student: John Doe                                       │     │
│  │ Total Required: ₦215,000                               │     │
│  │ Total Paid:     ₦150,000                               │     │
│  │ Balance:        ₦65,000                                │     │
│  │ Status:         ⚠️ Partial Payment (69.8% paid)        │     │
│  └────────────────────────────────────────────────────────┘     │
└──────────────────────────────────────────────────────────────────┘
```

---

## 🔄 USER FLOW DIAGRAMS

### **DIRECTOR WORKFLOW: Creating Fee Items**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Director Dashboard → Finance → Fee Structure        │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: Create Tuition (Auto-created as default)            │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Item Name:    Tuition                                   │ │
│ │ Amount:       ₦150,000                                  │ │
│ │ Type:         ☑ Tuition ☑ Compulsory                   │ │
│ │ Session:      2024/2025                                 │ │
│ │ Term:         First Term                                │ │
│ │ Class:        ALL                                       │ │
│ │               [Save]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Add More Items (Click "+ Add Fee Item")             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Item Name:    Boarding                                  │ │
│ │ Amount:       ₦80,000                                   │ │
│ │ Type:         ☐ Tuition ☐ Compulsory                   │ │
│ │ Session:      2024/2025                                 │ │
│ │ Term:         First Term                                │ │
│ │ Class:        ALL                                       │ │
│ │               [Save]                                    │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: View All Fee Items                                  │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ✅ Tuition    - ₦150,000 [Compulsory] [Edit] [Delete] │ │
│ │ ☐  Boarding   - ₦80,000  [Optional]   [Edit] [Delete] │ │
│ │ ☐  Sports     - ₦5,000   [Optional]   [Edit] [Delete] │ │
│ │                                                         │ │
│ │ [+ Add Fee Item]                                        │ │
│ └─────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

### **FINANCE ADMIN WORKFLOW: Assigning Fees to Student**

```
┌─────────────────────────────────────────────────────────────┐
│ STEP 1: Select Student                                       │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Student: [John Doe ▼]                                   │ │
│ │ Session: 2024/2025                                      │ │
│ │ Term:    First Term                                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 2: System Loads Available Fee Items                    │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ Available Fee Items for JSS1:                           │ │
│ │ ☑ Tuition    - ₦150,000 [LOCKED - Compulsory]          │ │
│ │ ☐ Boarding   - ₦80,000  [Optional]                     │ │
│ │ ☐ Sports     - ₦5,000   [Optional]                     │ │
│ │ ☐ Lab        - ₦10,000  [Optional]                     │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 3: Finance Admin Selects Items                         │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ ☑ Tuition    - ₦150,000                                │ │
│ │   Discount:  [10]%  → ₦135,000                         │ │
│ │ ☑ Boarding   - ₦80,000  (no discount)                  │ │
│ │ ☐ Sports     - ₦5,000                                  │ │
│ │ ☐ Lab        - ₦10,000                                 │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 4: System Calculates Total                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │ BREAKDOWN:                                              │ │
│ │ Tuition (₦150K - 10%):      ₦135,000                  │ │
│ │ Boarding:                    ₦80,000                   │ │
│ │ ─────────────────────────────────────                  │ │
│ │ TOTAL REQUIRED:             ₦215,000                   │ │
│ │                                                         │ │
│ │ [Cancel] [Save Fee Assignment]                          │ │
│ └─────────────────────────────────────────────────────────┘ │
└──────────────────────┬──────────────────────────────────────┘
                       ↓
┌─────────────────────────────────────────────────────────────┐
│ STEP 5: Saved to Database                                   │
│ ✅ Fee items assigned to John Doe successfully              │
│ ✅ Total required: ₦215,000                                 │
│ ✅ Ready for payment tracking                               │
└─────────────────────────────────────────────────────────────┘
```

---

## 💰 DISCOUNT CALCULATION LOGIC

### **How Discount Works:**

```
┌────────────────────────────────────────────────────────────┐
│ SCENARIO: John Doe has 10% tuition discount                │
└────────────────────────────────────────────────────────────┘

Fee Items Selected:
┌──────────────────┬─────────────┬──────────┬──────────────┐
│ Item             │ Original    │ Discount │ Final Amount │
├──────────────────┼─────────────┼──────────┼──────────────┤
│ Tuition          │ ₦150,000   │   10%    │ ₦135,000    │ ← Discount applied
│ Boarding         │ ₦80,000    │    0%    │ ₦80,000     │ ← NO discount
│ Sports           │ ₦5,000     │    0%    │ ₦5,000      │ ← NO discount
├──────────────────┴─────────────┴──────────┼──────────────┤
│ TOTAL                                     │ ₦220,000    │
└───────────────────────────────────────────┴──────────────┘

Calculation:
Tuition:   ₦150,000 - (₦150,000 × 10/100) = ₦135,000 ✅
Boarding:  ₦80,000  - (₦80,000 × 0/100)    = ₦80,000  ✅
Sports:    ₦5,000   - (₦5,000 × 0/100)     = ₦5,000   ✅
          ──────────────────────────────────────────
TOTAL:                                       ₦220,000 ✅
```

### **Database Trigger Handles This Automatically:**
```sql
-- When Finance Admin saves fee assignment:
INSERT INTO fees (...) VALUES (...);

-- Trigger executes BEFORE INSERT:
CREATE TRIGGER auto_calculate_discounted_amount
  BEFORE INSERT OR UPDATE ON fees
  FOR EACH ROW
  EXECUTE FUNCTION auto_calculate_discounted_amount();

-- Function checks:
IF fee_item.is_tuition = true THEN
  discounted_amount = original_amount - (original_amount × discount / 100)
ELSE
  discounted_amount = original_amount  -- No discount for non-tuition
END IF
```

---

## 📊 DATABASE RELATIONSHIPS

```
┌─────────────────────────────────────┐
│      profiles (students)            │
│  ─────────────────────────────      │
│  id (PK)                            │
│  first_name, last_name              │
│  class_id (FK to classes)           │
│  role = 'student'                   │
└──────────────┬──────────────────────┘
               │
               │ One student has many fee assignments
               │
               ↓
┌─────────────────────────────────────┐
│      fees (student_fee_assignments) │
│  ─────────────────────────────      │
│  id (PK)                            │
│  student_id (FK) ──────────────┐   │
│  fee_item_id (FK) ─────────┐   │   │
│  original_amount            │   │   │
│  tuition_discount_%         │   │   │
│  discounted_amount          │   │   │
│  session, term              │   │   │
│  is_active                  │   │   │
└─────────────────────────────┼───┼───┘
                              │   │
               ┌──────────────┘   │
               │                  │
               ↓                  │
┌─────────────────────────────┐  │
│  fee_structure (fee_items)  │  │
│  ─────────────────────────  │  │
│  id (PK) ───────────────────┼──┘
│  item_name                  │
│  amount                     │
│  is_tuition                 │
│  is_compulsory              │
│  session, term              │
│  class_level                │
│  created_by (FK)            │
└─────────────────────────────┘
```

---

## 🎨 UI MOCKUPS

### **Director's Fee Structure Manager**
```
╔═══════════════════════════════════════════════════════════════╗
║ 💰 Fee Structure Configuration                                ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ Session: [2024/2025 ▼]  Term: [First Term ▼]                ║
║                                                               ║
║ Fee Items for All Classes:                                    ║
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ ✅ Tuition                                                │ ║
║ │    Amount: ₦150,000                                       │ ║
║ │    Type: Compulsory | Tuition                            │ ║
║ │    [Edit] [Delete]                                        │ ║
║ ├───────────────────────────────────────────────────────────┤ ║
║ │ ☐ Boarding                                                │ ║
║ │    Amount: ₦80,000                                        │ ║
║ │    Type: Optional                                         │ ║
║ │    [Edit] [Delete]                                        │ ║
║ ├───────────────────────────────────────────────────────────┤ ║
║ │ ☐ Sports                                                  │ ║
║ │    Amount: ₦5,000                                         │ ║
║ │    Type: Optional                                         │ ║
║ │    [Edit] [Delete]                                        │ ║
║ └───────────────────────────────────────────────────────────┘ ║
║                                                               ║
║ [+ Add Fee Item]                                              ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

### **Finance Admin's Payment Entry**
```
╔═══════════════════════════════════════════════════════════════╗
║ 💸 Assign Fees to Student                                     ║
╠═══════════════════════════════════════════════════════════════╣
║                                                               ║
║ Student: [John Doe - JSS1 ▼]                                 ║
║ Session: 2024/2025  Term: First Term                         ║
║                                                               ║
║ Fee Items:                                                    ║
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ ☑ Tuition - ₦150,000 [LOCKED - Compulsory]               │ ║
║ │   Discount: [10]% → Final: ₦135,000                      │ ║
║ ├───────────────────────────────────────────────────────────┤ ║
║ │ ☑ Boarding - ₦80,000                                      │ ║
║ ├───────────────────────────────────────────────────────────┤ ║
║ │ ☐ Sports - ₦5,000                                         │ ║
║ ├───────────────────────────────────────────────────────────┤ ║
║ │ ☐ Lab Materials - ₦10,000                                 │ ║
║ └───────────────────────────────────────────────────────────┘ ║
║                                                               ║
║ ┌───────────────────────────────────────────────────────────┐ ║
║ │ 📊 FEE BREAKDOWN                                          │ ║
║ │ Tuition (after 10% discount):            ₦135,000        │ ║
║ │ Boarding:                                 ₦80,000        │ ║
║ │ ───────────────────────────────────────────────────────  │ ║
║ │ TOTAL REQUIRED:                          ₦215,000        │ ║
║ └───────────────────────────────────────────────────────────┘ ║
║                                                               ║
║ [Cancel] [Save Fee Assignment]                                ║
║                                                               ║
╚═══════════════════════════════════════════════════════════════╝
```

---

## ✅ SUMMARY

### **Key Features:**
1. ✅ **Itemized Billing** - Separate Tuition from other fees
2. ✅ **Selective Discount** - Discount ONLY applies to Tuition
3. ✅ **Flexible Assignment** - Finance Admin selects items per student
4. ✅ **Auto-Calculation** - Database trigger handles math
5. ✅ **Transparent** - Clear breakdown for parents/students
6. ✅ **Compulsory/Optional** - Mark items accordingly
7. ✅ **Class-Specific** - Different fees for different classes

### **Benefits:**
- 🎯 **Accurate Billing** - No confusion about what fees cover
- 💰 **Fair Discounts** - Only tuition discounted, not extras
- 📊 **Better Reporting** - Track revenue by fee type
- 🔧 **Flexible** - Easy to add new fee items
- ✅ **Compliant** - Follows Nigerian school fee structure norms

**All systems ready to implement!**
