# Find Your Deadline Issue - 3 Quick Steps 🔍

## The Problem

You see this in the image you provided:
```
✅ No Deadline Set
You can upload at any time for First Term, 2025/2026 (e-notes)
Button State: ENABLED ✅
```

But you KNOW there's an expired deadline in the database!

---

## Step 1: Check Database (30 seconds)

Run this in Supabase SQL Editor:

```sql
-- Find ALL deadlines
SELECT 
  id,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN deadline > NOW() THEN '✅ ACTIVE'
    WHEN deadline <= NOW() AND enabled = true THEN '❌ EXPIRED (should block)'
    WHEN deadline <= NOW() AND enabled = false THEN '⚪ EXPIRED (disabled)'
  END as status
FROM upload_deadlines
ORDER BY deadline DESC;
```

### What to Look For:

**If you see:**
```
term: "First Term"
session: "2025/2026"  
upload_type: "e-notes"
deadline: 2025-11-01 (past date)
enabled: true
status: ❌ EXPIRED (should block)
```

→ **This is correct!** The deadline exists. Move to Step 2.

**If you see:**
```
term: "First Term"
session: "2025/2026"
upload_type: "e-notes"  
enabled: false
```

→ **Already disabled!** That's why you see "No Deadline Set". Re-enable it:
```sql
UPDATE upload_deadlines SET enabled = true WHERE id = 'your-id';
```

**If you see:**
```
term: "First Term"
session: "2025-2026"  ← Notice the hyphen!
upload_type: "e-notes"
```

→ **Session format mismatch!** Fix it:
```sql
UPDATE upload_deadlines SET session = '2025/2026' WHERE session = '2025-2026';
```

**If you see:**
```
term: "Term 1"  ← Different name!
session: "2025/2026"
upload_type: "e-notes"
```

→ **Term name mismatch!** Either:
- Fix database: `UPDATE upload_deadlines SET term = 'First Term' WHERE term = 'Term 1';`
- Or select "Term 1" in the dropdown instead

---

## Step 2: Check Browser Console (30 seconds)

1. Open the upload page as a teacher
2. Open browser console (F12)
3. Look for these logs:

### ✅ If you see this (CORRECT):
```
=== DEADLINE CHECK START ===
[Deadline Check] Request: {"term":"First Term","session":"2025/2026","type":"e-notes","userRole":"teacher"}
[Deadline Check] Found 1 active deadlines
[MATCH FOUND] Deadline: {...}
[Deadline Check] Is Expired: true
[Deadline Check] ❌ TEACHER + EXPIRED → DISABLED
```

→ **System working!** You should see red alert and disabled button.

### ❌ If you see this (WRONG):
```
=== DEADLINE CHECK START ===
[Deadline Check] Request: {"term":"First Term","session":"2025/2026","type":"e-notes"}
[Deadline Check] Found 1 active deadlines
[NO MATCH] No deadline found for: {term: "First Term", session: "2025/2026", type: "e-notes"}
```

→ **Mismatch detected!** The values in the request don't match the database.

**Compare the request with your database:**

| Source | Term | Session | Type |
|--------|------|---------|------|
| Browser Console | ? | ? | ? |
| Database | ? | ? | ? |

Find the difference!

### Common Mismatches:

| Database Value | Frontend Sends | Fix |
|---------------|----------------|-----|
| `exam_question` | `exam-questions` | Update DB to match frontend |
| `Term 1` | `First Term` | Update DB to match frontend |
| `2025-2026` | `2025/2026` | Update DB to match frontend |
| `e_notes` | `e-notes` | Update DB to match frontend |

---

## Step 3: Run Auto-Disable (10 seconds)

If deadline exists with correct values, run this:

```sql
-- Disable all expired deadlines
UPDATE upload_deadlines
SET enabled = false
WHERE deadline <= NOW() 
  AND enabled = true;
```

Then refresh the upload page.

---

## Quick Test Script

Copy and paste this entire block into Supabase SQL Editor:

```sql
-- QUICK DIAGNOSTIC SCRIPT
-- Shows exactly what's wrong

-- 1. Show all deadlines
SELECT 
  '1️⃣ ALL DEADLINES IN DATABASE' as step,
  term,
  session,
  upload_type,
  deadline::text as deadline_date,
  enabled,
  CASE 
    WHEN deadline > NOW() THEN '✅ ACTIVE'
    WHEN deadline <= NOW() AND enabled = true THEN '❌ EXPIRED + ENABLED (blocks teachers)'
    WHEN deadline <= NOW() AND enabled = false THEN '⚪ EXPIRED + DISABLED (allows upload)'
  END as current_status
FROM upload_deadlines
ORDER BY deadline DESC;

-- 2. Check for common issues
SELECT 
  '2️⃣ POTENTIAL ISSUES' as step,
  *,
  ARRAY[
    CASE WHEN session LIKE '%-%' THEN '⚠️ Session has hyphen (should be /)' END,
    CASE WHEN term NOT IN ('First Term', 'Second Term', 'Third Term') THEN '⚠️ Unusual term name' END,
    CASE WHEN upload_type NOT IN ('e-notes', 'exam_question', 'assignment', 'other_resources', 'all') THEN '⚠️ Unknown upload type' END,
    CASE WHEN deadline <= NOW() AND enabled = true THEN '❌ Expired but still enabled' END
  ] as issues
FROM upload_deadlines
WHERE enabled = true;

-- 3. Show what teachers will experience
SELECT 
  '3️⃣ WHAT TEACHERS SEE' as step,
  term || ' / ' || session || ' / ' || upload_type as deadline_config,
  deadline::text as deadline_date,
  enabled,
  CASE 
    WHEN deadline > NOW() AND enabled = true THEN 
      '📅 Blue Alert: "Deadline: ' || deadline::date || '" + Button ENABLED'
    WHEN deadline <= NOW() AND enabled = true THEN 
      '🔴 Red Alert: "Deadline Expired" + Button DISABLED'
    WHEN enabled = false THEN 
      '🟢 Green Alert: "No Deadline Set" + Button ENABLED'
  END as teacher_sees
FROM upload_deadlines;

-- 4. Find exact match for First Term / 2025/2026 / e-notes
SELECT 
  '4️⃣ CHECKING YOUR SPECIFIC CASE' as step,
  CASE 
    WHEN COUNT(*) = 0 THEN '❌ NO DEADLINE FOUND - Create one!'
    WHEN COUNT(*) > 1 THEN '⚠️ MULTIPLE DEADLINES FOUND - Remove duplicates!'
    ELSE '✅ ONE DEADLINE FOUND'
  END as result,
  COUNT(*) as count
FROM upload_deadlines
WHERE term = 'First Term'
  AND session = '2025/2026'
  AND upload_type = 'e-notes'
  AND enabled = true;

-- 5. Show the actual deadline (if it exists)
SELECT 
  '5️⃣ YOUR DEADLINE DETAILS' as step,
  *
FROM upload_deadlines
WHERE term = 'First Term'
  AND session = '2025/2026'
  AND upload_type = 'e-notes';
```

This will show you EXACTLY what's wrong in 5 easy-to-read steps!

---

## Expected Results

### ✅ Correct Setup:
```
step: 1️⃣ ALL DEADLINES IN DATABASE
term: First Term
session: 2025/2026
upload_type: e-notes
deadline_date: 2025-11-01 23:59:59
enabled: true
current_status: ❌ EXPIRED + ENABLED (blocks teachers)
```

### ❌ Wrong (Why you see "No Deadline Set"):

**Scenario A: Already disabled**
```
enabled: false
current_status: ⚪ EXPIRED + DISABLED (allows upload)
```

**Scenario B: No match found**
```
step: 4️⃣ CHECKING YOUR SPECIFIC CASE
result: ❌ NO DEADLINE FOUND - Create one!
count: 0
```

**Scenario C: Type mismatch**
```
upload_type: exam_question  ← Missing 's' or hyphen!
```

---

## After Running Diagnostic

### If deadline exists and is expired + enabled:
```sql
-- This is correct! Just disable it:
UPDATE upload_deadlines
SET enabled = false
WHERE deadline <= NOW() AND enabled = true;
```

### If deadline doesn't exist:
```sql
-- Create one:
INSERT INTO upload_deadlines (term, session, upload_type, deadline, enabled)
VALUES ('First Term', '2025/2026', 'e-notes', '2025-11-01 23:59:59', false);
```

### If type mismatch:
```sql
-- Fix the type:
UPDATE upload_deadlines
SET upload_type = 'e-notes'  -- Match what frontend sends
WHERE upload_type = 'e_notes';  -- Wrong format
```

---

## Final Check

After fixing, you should see:

**Browser shows:**
```
✅ No Deadline Set
You can upload at any time for First Term, 2025/2026 (e-notes)
Button State: ENABLED ✅
```

**Database shows:**
```
enabled: false (deadline was disabled)
OR
No matching deadline found
```

**Both are correct!** Teachers can upload when:
- Deadline is disabled (`enabled = false`)
- OR no deadline exists

---

**Run the Quick Test Script above to find your exact issue!**
