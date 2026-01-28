# DIAGNOSTIC: Yoruba/Igbo Pairs Issue

## Step 1: Check if Yoruba/Igbo are in subject_pairings table

Run this in your Supabase SQL Editor:

```sql
-- Check subject pairings
SELECT 
  sp.pair_group_id,
  sp.pair_group_name,
  sp.level,
  s.id as subject_id,
  s.name as subject_name
FROM subject_pairings sp
JOIN subjects s ON s.id = sp.subject_id
WHERE s.name ILIKE '%yoruba%' OR s.name ILIKE '%igbo%'
ORDER BY sp.pair_group_id, s.name;
```

**Expected Result:** You should see Yoruba and Igbo with the SAME pair_group_id

---

## Step 2: Check if Yoruba/Igbo are configured for JSS2/JSS3

```sql
-- Check subject configs for Yoruba/Igbo
SELECT 
  sc.id as config_id,
  sc.subject_name,
  sc.class_ids,
  sc.max_periods_per_week,
  sc.min_periods_per_week,
  sc.teachers,
  c.name as class_name
FROM subject_configs sc
CROSS JOIN LATERAL unnest(sc.class_ids) AS class_id
LEFT JOIN classes c ON c.id = class_id
WHERE sc.subject_name ILIKE '%yoruba%' OR sc.subject_name ILIKE '%igbo%'
ORDER BY c.name, sc.subject_name;
```

**Expected Result:** 
- Yoruba should appear for JSS2, JSS3 (and other classes)
- Igbo should appear for JSS2, JSS3 (and other classes)
- Each should have `max_periods_per_week` = 2
- Each should have teachers configured with `availableDays: ["Tuesday", "Wednesday"]` (or similar)

---

## Step 3: Check teachers configuration

```sql
-- Check Yoruba/Igbo teacher settings
SELECT 
  sc.subject_name,
  sc.teachers::text
FROM subject_configs sc
WHERE sc.subject_name ILIKE '%yoruba%' OR sc.subject_name ILIKE '%igbo%';
```

**Expected Result:** 
- The `teachers` field should contain JSON with:
  - `isFullTime: false` (for part-time)
  - `availableDays: ["Tuesday", "Wednesday"]` (2 days only)

---

## Step 4: Regenerate and check browser console

After confirming the above data is correct:

1. Open browser DevTools (F12)
2. Go to Console tab
3. Clear console
4. Click "Generate Timetable"
5. Look for these logs:

```
🔗 ═══════════════════════════════════════
🔗 PAIR GROUPS DETECTED: X
🔗 ═══════════════════════════════════════
  🔗 Yoruba/Igbo: [yoruba-id, igbo-id]
```

If you DON'T see this, the pairs aren't in subject_pairings table!

Then look for:

```
📋 ═══════════════════════════════════════
📋 ASSIGNMENT DISTRIBUTION
📋 ═══════════════════════════════════════
  📌 Paired assignments: X groups
  
  🔗 PAIRED SUBJECTS BREAKDOWN:
     Group "yoruba-igbo-pair":
       - JSS2: Yoruba (2 periods, Teacher: xxx)
       - JSS2: Igbo (2 periods, Teacher: xxx)
       - JSS3: Yoruba (2 periods, Teacher: xxx)
       - JSS3: Igbo (2 periods, Teacher: xxx)
```

If you DON'T see JSS2/JSS3 here, they're not configured in subject_configs!

---

## Common Issues:

### Issue A: Pairs not in database
**Symptom:** "PAIR GROUPS DETECTED: 0"
**Fix:** Add Yoruba/Igbo to subject_pairings table

### Issue B: Subjects not configured for JSS2/JSS3
**Symptom:** Pairs detected but JSS2/JSS3 not in "PAIRED SUBJECTS BREAKDOWN"
**Fix:** In subject_configs, make sure Yoruba and Igbo have JSS2 and JSS3 in their `class_ids` array

### Issue C: Wrong teacher settings
**Symptom:** Pairs scheduled but on wrong days
**Fix:** Check teacher `availableDays` in subject_configs.teachers field

### Issue D: Only 1 period scheduled instead of 2
**Symptom:** Shows once on Tuesday but not on Wednesday  
**Fix:** Check that:
- `max_periods_per_week` = 2 (not 1)
- Teacher has BOTH Tuesday AND Wednesday in availableDays

---

## Quick Fix SQL (if needed):

If Yoruba/Igbo are missing from subject_pairings:

```sql
-- Get Yoruba and Igbo subject IDs
-- (Replace with actual IDs from your subjects table)

INSERT INTO subject_pairings (pair_group_id, pair_group_name, subject_id, level)
VALUES 
  ('yoruba-igbo-pair', 'Yoruba/Igbo', 'YOUR_YORUBA_SUBJECT_ID', 'junior'),
  ('yoruba-igbo-pair', 'Yoruba/Igbo', 'YOUR_IGBO_SUBJECT_ID', 'junior');
```
