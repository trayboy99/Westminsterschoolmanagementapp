# 💰 Teacher Salary Structure - Quick Reference Card

## 📍 Location
**Director Dashboard → Finance → Teacher Salaries**

---

## 🎯 Purpose
Manage teacher salaries with automatic calculation of:
- Gross Salary
- Total Deductions  
- Net Salary

---

## 💵 Salary Formula

### Gross Salary:
```
Basic Salary + Salary Increase + Allowances = GROSS
```

### Deductions:
```
(Gross × Tax%) + (Gross × Pension%) + Other = TOTAL DEDUCTIONS
```

### Net Salary:
```
Gross - Total Deductions = NET SALARY
```

---

## 📝 Form Fields

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| Teacher | Dropdown | ✅ Yes | Select from registered teachers |
| Basic Salary | Number (₦) | ✅ Yes | Base monthly salary |
| Salary Increase | Number (₦) | ⬜ No | Bonus or increment |
| Allowances | Number (₦) | ⬜ No | Housing, transport, etc. |
| Tax | Percentage | ⬜ No | Tax rate (e.g., 10 for 10%) |
| Pension | Percentage | ⬜ No | Pension contribution rate |
| Other Deductions | Number (₦) | ⬜ No | Loans, advances, etc. |
| Notes | Text | ⬜ No | Optional notes |

---

## 📊 Example Calculation

### Input:
```
Basic Salary:      ₦150,000
Salary Increase:   ₦ 10,000
Allowances:        ₦ 25,000
Tax:               10%
Pension:           8%
Other Deductions:  ₦  5,000
```

### Calculation:
```
Gross = 150,000 + 10,000 + 25,000 = ₦185,000

Tax = 185,000 × 0.10 = ₦18,500
Pension = 185,000 × 0.08 = ₦14,800
Other = ₦5,000

Total Deductions = 18,500 + 14,800 + 5,000 = ₦38,300

Net Salary = 185,000 - 38,300 = ₦146,700
```

---

## ✨ Features

- ✅ **Real-time Calculations** - Updates as you type
- ✅ **Currency Formatting** - Nigerian Naira (₦)
- ✅ **Auto-Save** - Creates or updates records
- ✅ **Edit Support** - Modify existing salaries
- ✅ **Delete Protection** - Confirmation dialog
- ✅ **Statistics Dashboard** - Total payroll & averages
- ✅ **Session-based** - Separate salaries per academic year
- ✅ **Unique Constraint** - One salary per teacher per session

---

## 🔢 Statistics Cards

| Card | Shows |
|------|-------|
| Total Teachers | Count of teachers with salary records |
| Total Payroll | Sum of all net salaries |
| Average Salary | Mean net salary |

---

## 🎨 Table Columns

| Column | Description |
|--------|-------------|
| Teacher | Name and email |
| Basic Salary | Base pay |
| Increase | Salary increment |
| Allowances | Additional allowances |
| Gross | Total before deductions (badge) |
| Deductions | Total amount deducted (red) |
| Net Salary | Take-home pay (green badge) |
| Actions | Edit / Delete buttons |

---

## ⚡ Quick Actions

### Add New Salary:
1. Select teacher
2. Enter basic salary
3. Add optional components
4. Click "Save Salary"

### Edit Salary:
1. Click pencil icon
2. Modify fields
3. Click "Update Salary"

### Delete Salary:
1. Click trash icon
2. Confirm deletion

---

## 🔐 Access Control

**Who can access:** Director only  
**Authorization:** Checked on backend  
**Session:** Tied to current academic session

---

## 💾 Database

**Table:** `teacher_salaries`  
**Key:** `(teacher_id, session)` UNIQUE  
**Calculations:** Generated columns (auto-computed)

---

## 🚀 Deployment

### Files Created:
1. `/CREATE_TEACHER_SALARIES_TABLE.sql`
2. `/components/finance/DirectorTeacherSalaries.tsx`

### Files Modified:
1. `/supabase/functions/server/index.tsx`
2. `/components/DirectorDashboardContent.tsx`

### Endpoints:
- `GET /teacher-salaries` - Fetch all
- `POST /teacher-salaries` - Create/Update
- `PUT /teacher-salaries/:id` - Update
- `DELETE /teacher-salaries/:id` - Delete

---

## 📱 Responsive Design

- ✅ Desktop: Full 3-column grid
- ✅ Tablet: 2-column responsive layout
- ✅ Mobile: Single column stacked

---

## 🎯 Validation Rules

1. ✅ Teacher must be selected
2. ✅ Basic salary must be > 0
3. ✅ Percentages must be 0-100
4. ✅ Session must exist
5. ✅ No duplicate teacher+session

---

## 🔔 Notifications

- ✅ Success toast on save
- ✅ Error toast on validation failure
- ✅ Confirmation dialog on delete

---

## 📈 Use Cases

1. **Initial Setup** - Set salaries for all teachers
2. **Annual Review** - Update for new session
3. **Salary Adjustment** - Edit individual salaries
4. **Payroll Report** - View total payroll costs
5. **Audit Trail** - Track who created salaries

---

## ⚠️ Important Notes

- Percentages are entered as whole numbers (10 = 10%, not 0.10)
- Currency is in Nigerian Naira (₦)
- Calculations happen automatically (generated columns)
- One salary record per teacher per session
- Changes are immediate (no approval needed)

---

## 🆘 Common Issues

**Can't see menu item:**
- Must be logged in as Director

**No teachers in dropdown:**
- Add teachers first in Teachers module

**Duplicate error:**
- Teacher already has salary for this session
- Edit existing record instead

**Wrong calculations:**
- Check percentages (should be 0-100)
- Verify all amounts are positive

---

## 📞 Support Info

**Module:** Finance  
**Submodule:** Teacher Salaries  
**User Role:** Director  
**Status:** ✅ Production Ready

---

**Last Updated:** November 11, 2025  
**Version:** 1.0.0
