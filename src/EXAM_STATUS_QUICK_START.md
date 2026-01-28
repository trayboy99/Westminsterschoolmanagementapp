# 🚀 Automatic Exam Status - Quick Start Guide

## 📝 What Changed?

**Before:** Admins manually selected exam status (draft/upcoming/active/completed)  
**After:** System automatically calculates status based on exam dates

---

## ⚡ Quick Setup (3 Steps)

### Step 1: Run Database Migrations

Copy and paste these SQL commands in your Supabase SQL Editor:

```sql
-- Migration 1: Remove draft status
UPDATE exams SET status = 'upcoming' WHERE status = 'draft';
ALTER TABLE exams DROP CONSTRAINT IF EXISTS exams_status_check;
ALTER TABLE exams ADD CONSTRAINT exams_status_check 
CHECK (status IN ('upcoming', 'active', 'completed'));

-- Migration 2: Add updated_at column
ALTER TABLE exams ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ;
UPDATE exams SET updated_at = created_at WHERE updated_at IS NULL;
ALTER TABLE exams ALTER COLUMN updated_at SET DEFAULT NOW();
```

### Step 2: Verify Setup

```sql
-- Should show only: upcoming, active, completed
SELECT DISTINCT status FROM exams;

-- Should show updated_at column exists
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'exams' AND column_name = 'updated_at';
```

### Step 3: Test in UI

1. **Navigate** to Exams Manager
2. **Click** "Create Exam"
3. **Notice** - No status dropdown! Just set dates
4. **Create** an exam with:
   - Start: Tomorrow
   - End: Next week
5. **Check** - Badge shows "Upcoming" 🔵 automatically

---

## 🎯 Status Rules (Automatic)

| Current Time | Status Badge | Color |
|-------------|--------------|-------|
| **Before start date** | 🔵 Upcoming | Blue |
| **Between start & end** | 🟢 Active | Green |
| **After end date** | 🟣 Completed | Purple |

---

## 💡 Key Points

✅ **Status is READ-ONLY** - Calculated from dates, not editable  
✅ **Auto-updates** - Status changes when you refresh the page  
✅ **No drafts** - All exams are upcoming by default  
✅ **Real-time** - Reflects actual exam timing  

---

## 🧪 Quick Test

### Create 3 Test Exams:

```javascript
// 1. Upcoming Exam
Name: "First Term Exam"
Start: [1 week from today]
End: [2 weeks from today]
Expected: 🔵 Upcoming

// 2. Active Exam  
Name: "Mock Test"
Start: [yesterday]
End: [tomorrow]
Expected: 🟢 Active

// 3. Completed Exam
Name: "Mid-Term Test"
Start: [2 weeks ago]
End: [1 week ago]
Expected: 🟣 Completed
```

---

## 🔍 Troubleshooting

### Issue: Exam shows wrong status
**Solution:** Refresh the page - status updates on every fetch

### Issue: Can't find status dropdown
**Solution:** That's correct! Status is now automatic

### Issue: "draft" constraint error
**Solution:** Run migration SQL again (Step 1)

---

## 📊 What You'll See

### Exams List View
```
┌─────────────────────────────────────────────────┐
│ Name           Session  Term  Status   Actions  │
├─────────────────────────────────────────────────┤
│ First Term     2024/25  1st   🔵 Upcoming  ✏️ 🗑️ │
│ Mock Test      2024/25  1st   🟢 Active    ✏️ 🗑️ │
│ Mid-Term       2024/25  1st   🟣 Completed ✏️ 🗑️ │
└─────────────────────────────────────────────────┘
```

### Statistics Cards
```
┌─────────┬──────────┬────────┬───────────┐
│  Total  │ Upcoming │ Active │ Completed │
├─────────┼──────────┼────────┼───────────┤
│   12    │    8     │   2    │     2     │
└─────────┴──────────┴────────┴───────────┘
```

### Create Form
```
┌──────────────────────────────────────┐
│ ✏️ Create Exam                       │
├──────────────────────────────────────┤
│ Exam Name: ________________________  │
│                                      │
│ ℹ️ Status automatically calculated   │
│    based on start and end dates      │
│                                      │
│ Start Date: [2025-01-15 09:00]       │
│ End Date:   [2025-01-30 15:00]       │
│                                      │
│          [Cancel]  [Create Exam]     │
└──────────────────────────────────────┘
```

---

## ✅ Success Checklist

After setup, verify:

- [ ] No "Status" dropdown in create/edit form
- [ ] Info message explains automatic status
- [ ] Stats show 4 cards (no "Draft" card)
- [ ] Filter has no "Draft" option
- [ ] Creating exam auto-assigns status
- [ ] Status badge matches exam dates
- [ ] Refreshing page updates outdated statuses

---

## 🎉 Done!

Your exam status system now automatically manages itself based on real dates and times. No more manual status updates needed!

**Questions?** Check `/AUTOMATIC_EXAM_STATUS_IMPLEMENTATION.md` for full details.
