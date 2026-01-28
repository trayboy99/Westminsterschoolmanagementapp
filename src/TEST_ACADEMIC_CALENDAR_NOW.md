# Test Academic Calendar System - Quick Start ⚡

## 🎯 3 Steps to Test

### **STEP 1: Run SQL Script in Supabase**

1. Open Supabase Dashboard → SQL Editor
2. Copy and paste entire content of `/RESTRUCTURE_ACADEMIC_CALENDAR.sql`
3. Click **RUN**
4. Wait for success confirmation

**✅ What this does:**
- Creates `academic_sessions` table
- Creates `academic_terms` table with `number_of_weeks` column
- Creates `academic_calendar` table
- Adds database triggers for automatic current session/term management
- Inserts sample data (2024/2025, 2025/2026, 2026/2027 sessions)
- Inserts sample data (First, Second, Third terms)

---

### **STEP 2: Test SessionSettings.tsx Frontend**

1. Login to your School Management System as **IT Admin**
2. Navigate to: **Settings → Sessions & Terms**
3. You should see:
   - ✅ Sessions listed (2024/2025, 2025/2026, 2026/2027)
   - ✅ Terms listed with **Number of Weeks** field
   - ✅ "Current" badges on active session/term

4. **Test Editing:**
   - Change "First Term" number of weeks to **15**
   - Click **Save All Settings**
   - Reload page → Verify change persisted

5. **Test Setting Current:**
   - Click "Set Current" on a different session
   - Click **Save All Settings**
   - Reload page → Verify new session is current (has badge)

---

### **STEP 3: Verify Database Updates**

**Quick SQL Verification:**

```sql
-- Check current session (should be only ONE with is_current = true)
SELECT session_name, is_current, status 
FROM academic_sessions 
WHERE is_current = true;

-- Check current term (should be only ONE with is_current = true)
SELECT term_name, number_of_weeks, is_current, status 
FROM academic_terms 
WHERE is_current = true;

-- Check academic_calendar table (should have current session + term)
SELECT 
  s.session_name,
  t.term_name,
  t.number_of_weeks
FROM academic_calendar ac
JOIN academic_sessions s ON ac.session_id = s.id
JOIN academic_terms t ON ac.term_id = t.id;
```

**Expected Results:**
- ✅ Only ONE session with `is_current = true`
- ✅ Only ONE term with `is_current = true`
- ✅ `number_of_weeks` field populated (e.g., 14, 12, 12)
- ✅ `academic_calendar` table has one row linking current session + term

---

## 🔍 Visual Checks

### **Frontend UI Should Show:**

**Sessions Section:**
```
┌─────────────────────────────────────────────────────┐
│ 📅 Academic Sessions                                │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Session Name: 2025/2026                         │ │
│ │ Start Date: 2025-09-01   End Date: 2026-08-31  │ │
│ │ [Current] 🏷️                                    │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Session Name: 2024/2025                         │ │
│ │ Start Date: 2024-09-01   End Date: 2025-08-31  │ │
│ │ [Set Current]                                   │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

**Terms Section (with NEW number_of_weeks field):**
```
┌─────────────────────────────────────────────────────┐
│ 📅 Academic Terms                                   │
├─────────────────────────────────────────────────────┤
│ ┌─────────────────────────────────────────────────┐ │
│ │ Term Name: First Term   Number of Weeks: 14     │ │
│ │ Start: 2025-09-01  End: 2025-12-20              │ │
│ │ Next Term Begins: 2026-01-05                    │ │
│ │ [Current Term] 🟢 Active                        │ │
│ └─────────────────────────────────────────────────┘ │
│ ┌─────────────────────────────────────────────────┐ │
│ │ Term Name: Second Term   Number of Weeks: 12    │ │
│ │ Start: 2026-01-05  End: 2026-04-10              │ │
│ │ Next Term Begins: 2026-04-27                    │ │
│ │ [Set as Current]                                │ │
│ └─────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────┘
```

---

## 🧪 Test Backend Endpoints (Optional)

### **Using Browser Console:**

```javascript
// Get session settings
const session = await supabase.auth.getSession();
const response = await fetch(
  'https://YOUR_PROJECT.supabase.co/functions/v1/make-server-1ddd013a/session-settings',
  {
    headers: {
      'Authorization': `Bearer ${session.data.session.access_token}`
    }
  }
);
const data = await response.json();
console.log('Sessions:', data.sessions);
console.log('Terms:', data.terms);
```

### **Expected Console Output:**
```json
{
  "success": true,
  "sessions": [
    {
      "id": "uuid-here",
      "session_name": "2025/2026",
      "start_date": "2025-09-01",
      "end_date": "2026-08-31",
      "is_current": true,
      "status": "active"
    }
  ],
  "terms": [
    {
      "id": "uuid-here",
      "term_name": "First Term",
      "start_date": "2025-09-01",
      "end_date": "2025-12-20",
      "next_term_begins": "2026-01-05",
      "number_of_weeks": 14,
      "is_current": true,
      "status": "active"
    }
  ]
}
```

---

## ✅ Success Checklist

- [ ] SQL script ran without errors
- [ ] Sessions appear in SessionSettings.tsx
- [ ] Terms appear with **Number of Weeks** field
- [ ] Can edit number of weeks and save
- [ ] Can change current session
- [ ] Can change current term
- [ ] Database query shows only ONE current session
- [ ] Database query shows only ONE current term
- [ ] `academic_calendar` table has current session + term
- [ ] No console errors in frontend
- [ ] No errors in Supabase logs

---

## 🚨 Troubleshooting

### **"Column does not exist" error:**
→ You didn't run the SQL script yet. Go back to STEP 1.

### **Sessions/Terms don't load:**
→ Check browser console for errors
→ Check Supabase Edge Functions logs
→ Verify SQL script ran successfully

### **Can't save changes:**
→ Check if you're logged in as IT Admin
→ Check browser console for authorization errors
→ Verify backend endpoints are deployed

### **Multiple sessions/terms showing as current:**
→ This should be impossible due to database triggers
→ Re-run the SQL script to fix constraints

### **Number of weeks not saving:**
→ Check that you're using the updated SessionSettings.tsx
→ Verify `number_of_weeks` column exists in `academic_terms` table

---

## 📞 Quick Debug Commands

### **Check Table Structure:**
```sql
-- Verify number_of_weeks column exists
\d academic_terms;

-- Should show: number_of_weeks | integer | not null | default: 12
```

### **Check Triggers:**
```sql
-- List all triggers
SELECT trigger_name, event_manipulation, event_object_table
FROM information_schema.triggers
WHERE event_object_table IN ('academic_sessions', 'academic_terms');

-- Should show:
-- trigger_session_active_on_current
-- trigger_term_active_on_current
```

### **Reset to Default State:**
```sql
-- Set 2025/2026 as current session
UPDATE academic_sessions SET is_current = true WHERE session_name = '2025/2026';

-- Set First Term as current term
UPDATE academic_terms SET is_current = true WHERE term_name = 'First Term';

-- The triggers will automatically handle the rest!
```

---

## 🎯 What You're Testing

1. **Database Structure** - Tables created with correct columns
2. **Triggers** - Only ONE current session/term enforced
3. **Frontend UI** - Number of weeks field displays and works
4. **Backend API** - Endpoints fetch and save correctly
5. **Data Persistence** - Changes save to database permanently
6. **Historical Preservation** - Old sessions/terms never deleted

---

## 🎉 When All Tests Pass

**Your academic calendar system is now:**
- ✅ Properly normalized with separate tables
- ✅ Storing number of weeks for each term
- ✅ Enforcing only ONE current session/term
- ✅ Preserving historical sessions/terms forever
- ✅ Ready to support marks, comments, attendance with historical context
- ✅ Production-ready and future-proof!

**Next:** Test student promotion and verify old results still accessible! 🚀
