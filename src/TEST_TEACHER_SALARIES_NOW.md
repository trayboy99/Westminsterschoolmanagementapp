# 🧪 Test Teacher Salary Structure - Quick Guide

## Step 1: Run Database Migration ⚡

Copy and paste this into your **Supabase SQL Editor**:

```sql
-- =====================================================
-- TEACHER SALARIES TABLE
-- =====================================================

CREATE TABLE IF NOT EXISTS teacher_salaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Salary Components
  basic_salary DECIMAL(12, 2) NOT NULL DEFAULT 0,
  salary_increase DECIMAL(12, 2) DEFAULT 0,
  allowances DECIMAL(12, 2) DEFAULT 0,
  
  -- Deductions
  tax_percentage DECIMAL(5, 2) DEFAULT 0,
  pension_percentage DECIMAL(5, 2) DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,
  
  -- Calculated Fields (AUTO-CALCULATED)
  gross_salary DECIMAL(12, 2) GENERATED ALWAYS AS (basic_salary + salary_increase + allowances) STORED,
  total_deductions DECIMAL(12, 2) GENERATED ALWAYS AS (
    (basic_salary + salary_increase + allowances) * (tax_percentage / 100) +
    (basic_salary + salary_increase + allowances) * (pension_percentage / 100) +
    other_deductions
  ) STORED,
  net_salary DECIMAL(12, 2) GENERATED ALWAYS AS (
    (basic_salary + salary_increase + allowances) -
    (
      (basic_salary + salary_increase + allowances) * (tax_percentage / 100) +
      (basic_salary + salary_increase + allowances) * (pension_percentage / 100) +
      other_deductions
    )
  ) STORED,
  
  -- Metadata
  session TEXT NOT NULL,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_by UUID REFERENCES profiles(id),
  
  -- Constraints
  UNIQUE(teacher_id, session)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_teacher_id ON teacher_salaries(teacher_id);
CREATE INDEX IF NOT EXISTS idx_teacher_salaries_session ON teacher_salaries(session);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_teacher_salaries_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER teacher_salaries_updated_at_trigger
BEFORE UPDATE ON teacher_salaries
FOR EACH ROW
EXECUTE FUNCTION update_teacher_salaries_updated_at();
```

✅ Click **RUN** in Supabase

---

## Step 2: Test the Feature 🎯

### Access the Module:
1. **Login** as Director
2. Click **Finance** in sidebar
3. Click **Teacher Salaries** card (purple, with Users icon)

---

## Step 3: Add Your First Salary 💰

### Fill the Form:
1. **Select Teacher:** Choose any teacher from dropdown
2. **Basic Salary:** Enter `150000`
3. **Salary Increase:** Enter `10000` (optional)
4. **Allowances:** Enter `25000` (optional)
5. **Tax (%):** Enter `10`
6. **Pension (%):** Enter `8`
7. **Other Deductions:** Enter `5000` (optional)

### Watch the Magic! ✨
You'll see the **blue calculation box** update in real-time:
- **Gross Salary:** ₦185,000.00
- **Total Deductions:** -₦38,300.00
- **Net Salary:** ₦146,700.00

### Save It:
Click **Save Salary** button

---

## Step 4: Verify the Table 📋

You should now see the salary record in the table below with:
- ✅ Teacher name and email
- ✅ All salary components
- ✅ Calculated gross, deductions, and net salary
- ✅ Edit and Delete buttons

---

## Step 5: Test Editing ✏️

1. Click the **pencil icon** (Edit button)
2. Form fills with existing values
3. Change **Basic Salary** to `160000`
4. Watch calculations update automatically
5. Click **Update Salary**
6. Table refreshes with new values

---

## Step 6: Test Statistics 📊

Look at the top 3 cards:
- **Total Teachers:** Should show `1`
- **Total Payroll:** Sum of all net salaries
- **Average Salary:** Mean net salary

Add more teachers and watch these update!

---

## Step 7: Test Delete 🗑️

1. Click the **trash icon** (Delete button)
2. Confirm deletion in dialog
3. Record disappears from table
4. Statistics update automatically

---

## 🎯 What to Look For

### ✅ Correct Calculations:
```
Basic (₦150,000) + Increase (₦10,000) + Allowances (₦25,000) = Gross (₦185,000)
Gross × 10% Tax = ₦18,500
Gross × 8% Pension = ₦14,800
Other = ₦5,000
Total Deductions = ₦38,300
Net Salary = ₦185,000 - ₦38,300 = ₦146,700 ✓
```

### ✅ Real-time Updates:
- Change any field → Calculation updates immediately
- No page refresh needed

### ✅ Currency Formatting:
- Displays as: **₦150,000.00** (Nigerian Naira format)

### ✅ Validation:
- Try saving without selecting teacher → Error toast
- Try saving without basic salary → Error toast

### ✅ Unique Constraint:
- Try adding same teacher twice for same session → Error message

---

## 🐛 Troubleshooting

### "Table already exists" error:
✅ Already created! You're good to go.

### Can't see Teacher Salaries card:
- Make sure you're logged in as **Director** (not finance_admin)
- Check you're in the **Finance** section

### No teachers in dropdown:
- You need at least one teacher registered in the system
- Go to Teachers section and add a teacher first

### Calculations seem wrong:
- Remember: Tax and Pension are **percentages** (10 = 10%)
- Other Deductions is a **fixed amount** in Naira

---

## 🎉 Success Indicators

You'll know it's working when:
1. ✅ Table created without errors
2. ✅ Teacher Salaries card appears in Finance module
3. ✅ Form loads with teacher dropdown
4. ✅ Real-time calculations show correct amounts
5. ✅ Salary saves successfully with toast notification
6. ✅ Table displays saved salary with proper formatting
7. ✅ Edit and Delete buttons work
8. ✅ Statistics cards show correct totals

---

## 📸 Expected UI

### Top Section (Statistics):
```
┌─────────────────┬─────────────────┬─────────────────┐
│ Total Teachers  │ Total Payroll   │ Average Salary  │
│ 👥 5           │ 💰 ₦733,500.00 │ 📈 ₦146,700.00 │
└─────────────────┴─────────────────┴─────────────────┘
```

### Form Section:
```
┌─────────────────────────────────────────────────────┐
│ ➕ Add Teacher Salary                               │
├─────────────────────────────────────────────────────┤
│ Select Teacher: [John Doe - john@school.com    ▼]  │
│                                                      │
│ Basic Salary: [150000.00]  Increase: [10000.00]    │
│ Allowances:   [25000.00]                            │
│                                                      │
│ Tax %:        [10.00]      Pension %: [8.00]       │
│ Other Deductions: [5000.00]                         │
│                                                      │
│ ┌────────────────────────────────────────────┐     │
│ │ 🧮 Gross Salary:      ₦185,000.00         │     │
│ │    Total Deductions:  -₦38,300.00          │     │
│ │    Net Salary:        ₦146,700.00          │     │
│ └────────────────────────────────────────────┘     │
│                                                      │
│ Notes: [Optional notes...]                          │
│                                                      │
│ [💾 Save Salary]                                    │
└─────────────────────────────────────────────────────┘
```

### Table Section:
```
┌──────────────────────────────────────────────────────┐
│ Teacher Salaries                                      │
├──────────────────────────────────────────────────────┤
│ Teacher     Basic    +Inc   +Allow  =Gross  -Ded   Net│
│ John Doe   ₦150K   ₦10K    ₦25K   ₦185K  ₦38K  ₦147K│
│           📧 john@school.com               [✏️] [🗑️] │
└──────────────────────────────────────────────────────┘
```

---

## ⏱️ Estimated Test Time

- **Database Setup:** 1 minute
- **Basic Testing:** 5 minutes
- **Full Feature Test:** 10 minutes

---

**Ready to test? Copy the SQL above and run it now! 🚀**
