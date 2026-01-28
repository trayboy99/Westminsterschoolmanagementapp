# 🚨 CRITICAL FIX: Duplicate Endpoints Removed

## ❌ The Problem

You saved sessions/terms and got a success message, but the data didn't save to the `academic_sessions` and `academic_terms` tables.

### **Root Cause:**
There were **TWO duplicate endpoints** with the same path `/update-session-settings`:

1. **Line 11463** (OLD) - Saved to KV store ❌
2. **Line 12148** (NEW) - Saves to database tables ✅

**In Hono/Express, the first endpoint wins!** So your data was being saved to the old KV store instead of the new database tables.

---

## ✅ What Was Fixed

### **Removed Duplicate OLD Endpoints:**
- ❌ Deleted OLD `GET /session-settings` at line ~11433
- ❌ Deleted OLD `POST /update-session-settings` at line ~11463

### **Kept NEW Database Endpoints:**
- ✅ NEW `GET /session-settings` at line 12038 (queries `academic_sessions` & `academic_terms` tables)
- ✅ NEW `POST /update-session-settings` at line 12090 (saves to database tables)

---

## 🔄 What You Need to Do Now

### **STEP 1: Run the SQL Script (If Not Done Already)**

1. Open **Supabase Dashboard** → **SQL Editor**
2. Copy/paste entire content of `/RESTRUCTURE_ACADEMIC_CALENDAR.sql`
3. Click **RUN**
4. Wait for success confirmation

**This creates the `academic_sessions` and `academic_terms` tables that the backend needs.**

---

### **STEP 2: Deploy the Updated Backend**

The backend code has been updated. You need to redeploy:

#### **Option A: Automatic Redeploy (if you have auto-deploy enabled)**
- Just save any file and it should trigger a redeploy
- OR wait a few minutes for the changes to propagate

#### **Option B: Manual Redeploy via Supabase CLI**
```bash
supabase functions deploy make-server-1ddd013a
```

#### **Option C: Check if it auto-deployed**
- Go to **Supabase Dashboard** → **Edge Functions** → **make-server-1ddd013a**
- Check the "Last Deployed" timestamp
- If it's recent (within the last few minutes), you're good!

---

### **STEP 3: Clear Browser Cache & Test**

1. **Hard refresh** your browser:
   - Chrome/Edge: `Ctrl + Shift + R` (Windows) or `Cmd + Shift + R` (Mac)
   - Firefox: `Ctrl + F5` or `Cmd + Shift + R`

2. **Login as IT Admin**

3. Go to **Settings → Sessions & Terms**

4. **Add a new session:**
   - Session Name: `2027/2028`
   - Start Date: `2027-09-01`
   - End Date: `2028-08-31`
   - Click "Set Current" button
   - Click **Save All Settings**

5. **Open Browser Console** (F12)
   - Check for errors
   - You should see success message

6. **Verify in Supabase Database:**
   ```sql
   SELECT * FROM academic_sessions;
   SELECT * FROM academic_terms;
   ```
   
   You should see your new session in the `academic_sessions` table!

---

## 🔍 How to Verify It's Working

### **Backend Logs:**
Check Supabase Edge Functions logs:
```
[Session Settings] Fetching from academic_sessions and academic_terms tables...
[Session Settings] Found: X sessions, Y terms
[Update Session Settings] Updating sessions and terms...
[Update Session Settings] Sessions: X
[Update Session Settings] Terms: Y
[Update Session Settings] Successfully updated all settings
```

### **Database Check:**
```sql
-- Should return your sessions
SELECT id, session_name, is_current, status FROM academic_sessions;

-- Should return your terms with number_of_weeks
SELECT id, term_name, number_of_weeks, is_current, status FROM academic_terms;

-- Should show current session + term
SELECT 
  s.session_name,
  t.term_name,
  t.number_of_weeks
FROM academic_calendar ac
JOIN academic_sessions s ON ac.session_id = s.id
JOIN academic_terms t ON ac.term_id = t.id;
```

---

## 🚨 Troubleshooting

### **Issue: Still getting saved to KV store**
→ Backend hasn't redeployed yet. Wait a few minutes or manually redeploy.

### **Issue: "Table 'academic_sessions' does not exist"**
→ You didn't run the SQL script yet. Go back to STEP 1.

### **Issue: "Multiple rows returned" error**
→ Multiple sessions or terms are marked as `is_current = true`. Run:
```sql
-- Fix sessions (set only one as current)
UPDATE academic_sessions SET is_current = false;
UPDATE academic_sessions SET is_current = true WHERE session_name = '2025/2026';

-- Fix terms (set only one as current)
UPDATE academic_terms SET is_current = false;
UPDATE academic_terms SET is_current = true WHERE term_name = 'First Term';
```

### **Issue: Success message but no data in database**
→ Check backend logs for errors. Likely a foreign key constraint issue or missing fields.

---

## ✅ Success Indicators

You'll know it's working when:

1. ✅ No errors in browser console
2. ✅ Success toast appears
3. ✅ Data appears in `academic_sessions` table
4. ✅ Data appears in `academic_terms` table
5. ✅ `academic_calendar` table has current session + term
6. ✅ Backend logs show "Fetching from academic_sessions and academic_terms tables"
7. ✅ Reload page → Sessions and terms still there (persisted to database)

---

## 📊 Before vs After

### **BEFORE (Wrong):**
```
Frontend → POST /update-session-settings
           ↓
Backend (Line 11463) → Saves to KV store ❌
           ↓
Success message ✅ but data not in database ❌
```

### **AFTER (Correct):**
```
Frontend → POST /update-session-settings
           ↓
Backend (Line 12090) → Saves to academic_sessions & academic_terms tables ✅
           ↓
Success message ✅ AND data in database ✅
```

---

## 🎯 Summary

**The Fix:**
- ✅ Removed duplicate OLD KV store endpoints
- ✅ Kept NEW database table endpoints
- ✅ Your data will now save to `academic_sessions` and `academic_terms` tables

**What You Need to Do:**
1. ✅ Run SQL script (if not done)
2. ✅ Deploy backend (or wait for auto-deploy)
3. ✅ Test saving sessions/terms again
4. ✅ Verify data in database

**Once this is done, your academic calendar system will be fully functional!** 🎉
