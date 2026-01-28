# 🧪 TEST PIN 3-USES FEATURE - QUICK GUIDE

## ⚡ QUICK 5-MINUTE TEST

### Prerequisites:
- Database migration run (columns added)
- 1 student account
- Published results available

---

## 📝 STEP-BY-STEP TEST

### STEP 1: Run Database Migration (1 minute)

**Run this SQL in Supabase SQL Editor:**

```sql
-- Add new columns
ALTER TABLE pins ADD COLUMN IF NOT EXISTS usage_count INTEGER DEFAULT 0;
ALTER TABLE pins ADD COLUMN IF NOT EXISTS last_used_at TIMESTAMP WITH TIME ZONE;

-- Initialize existing data
UPDATE pins SET usage_count = 0 WHERE usage_count IS NULL;
UPDATE pins SET usage_count = 3 WHERE active = false AND usage_count = 0;

-- Verify
SELECT 
  pin_code,
  active,
  usage_count,
  last_used_at,
  expires_at
FROM pins
ORDER BY created_at DESC
LIMIT 5;
```

**Expected:** Columns added, data initialized ✅

---

### STEP 2: Generate New PIN (1 minute)

1. **Login as Student**
2. **Go to:** Result PIN Viewer (or PIN section)
3. **Click:** "Generate New PIN"
4. **Observe:**
   - New PIN appears
   - Badge shows: **0 / 3 uses** (gray)
   - No "Last used" timestamp yet

**Expected:** Fresh PIN with 0 uses ✅

---

### STEP 3: Use PIN 1st Time (1 minute)

1. **Copy the PIN**
2. **Go to:** Results → View Results
3. **Enter PIN** when prompted
4. **Submit**
5. **Go back to PIN Viewer**
6. **Observe:**
   - Badge shows: **1 / 3 uses** (gray)
   - "Last used" timestamp appears
   - Status still: **Active**

**Expected:** Usage incremented to 1 ✅

---

### STEP 4: Use PIN 2nd Time (30 seconds)

1. **Go to:** Results again
2. **Enter same PIN**
3. **Submit** (should work!)
4. **Go back to PIN Viewer**
5. **Observe:**
   - Badge shows: **2 / 3 uses** (blue - warning!)
   - "Last used" timestamp updated
   - Status still: **Active**

**Expected:** Usage incremented to 2, badge turns blue ✅

---

### STEP 5: Use PIN 3rd Time (30 seconds)

1. **Go to:** Results again
2. **Enter same PIN**
3. **Submit** (should work!)
4. **Go back to PIN Viewer**
5. **Observe:**
   - Badge shows: **3 / 3 uses** (red!)
   - Status changes to: **Inactive**
   - "Last used" timestamp updated

**Expected:** Usage = 3, PIN inactive, badge red ✅

---

### STEP 6: Try 4th Time (30 seconds)

1. **Go to:** Results
2. **Enter same PIN**
3. **Submit**
4. **Observe:**
   - ❌ **Error message:** "PIN has been used maximum times (3). Please generate a new PIN."
   - Cannot access results

**Expected:** PIN rejected with clear error message ✅

---

### STEP 7: Check Admin Panel (1 minute)

1. **Login as Admin/Principal**
2. **Go to:** PIN Management
3. **Find the test student's PIN**
4. **Observe:**
   - **Usage column** shows: **3 / 3 uses** (red badge)
   - **Last used** timestamp visible
   - **Status:** Inactive

**Expected:** Admin can see usage tracking ✅

---

## ✅ PASS/FAIL CRITERIA

### Test PASSES If:

| Test | Expected Result | Status |
|------|----------------|--------|
| New PIN | 0 / 3 uses, gray badge | ✅ |
| 1st use | 1 / 3 uses, still active | ✅ |
| 2nd use | 2 / 3 uses, blue badge | ✅ |
| 3rd use | 3 / 3 uses, red badge, inactive | ✅ |
| 4th attempt | Error: max uses reached | ✅ |
| Admin view | Shows usage count and timestamp | ✅ |

### Test FAILS If:

| Issue | Cause | Fix |
|-------|-------|-----|
| PIN inactive after 1 use | Migration not run | Run SQL migration |
| No usage count shown | Column missing | Check database schema |
| Can use PIN 4+ times | Logic not deployed | Check server code |
| Badge always gray | Frontend not updated | Check component code |

---

## 🎯 VISUAL CHECKLIST

### Student PIN Viewer Should Show:

```
┌──────────────────────────────────────────────────┐
│  Result PIN Viewer                               │
│  [Generate New PIN]                              │
├──────────────────────────────────────────────────┤
│  ℹ️ Each PIN can be used 3 times...              │
├──────────────────────────────────────────────────┤
│  Your Result PINs                                │
│  ┌────────────────────────────────────────────┐  │
│  │ PIN: ABC12345 [👁️] [📋]                    │  │
│  │ Status: Active  │  2 / 3 uses (blue)      │  │
│  │ First Term - 2023/2024                     │  │
│  │ Created: Oct 27 • Expires: Nov 27          │  │
│  │ Last used: Oct 28                          │  │
│  └────────────────────────────────────────────┘  │
└──────────────────────────────────────────────────┘
```

### Admin PIN Management Should Show:

```
PIN Code  | Student    | Usage      | Status  | Expires
----------|------------|------------|---------|----------
ABC12345  | John Doe   | 2 / 3 uses | Active  | Nov 27
          |            | Last: Oct 28         |
XYZ98765  | Jane Smith | 3 / 3 uses | Inactive| Oct 15
          |            | Last: Oct 15         |
```

---

## 🔍 DATABASE VERIFICATION

### Check PIN After Each Use:

```sql
SELECT 
  pin_code,
  usage_count,
  active,
  last_used_at,
  expires_at
FROM pins
WHERE pin_code = 'YOUR_TEST_PIN'
ORDER BY created_at DESC
LIMIT 1;
```

**After 1st use:**
```
pin_code  | usage_count | active | last_used_at
----------|-------------|--------|-------------
ABC12345  | 1           | true   | 2025-10-28...
```

**After 2nd use:**
```
pin_code  | usage_count | active | last_used_at
----------|-------------|--------|-------------
ABC12345  | 2           | true   | 2025-10-28...
```

**After 3rd use:**
```
pin_code  | usage_count | active | last_used_at
----------|-------------|--------|-------------
ABC12345  | 3           | false  | 2025-10-28...
```

---

## 📊 CONSOLE LOGS TO CHECK

Open browser console during PIN verification:

```
[Verify Result PIN] Checking PIN usage...
[Verify Result PIN] Current usage: 2
[Verify Result PIN] Incrementing to: 3
[Verify Result PIN] Should deactivate: true
[Verify Result PIN] PIN updated successfully
```

**No errors should appear!**

---

## 🐛 TROUBLESHOOTING DURING TEST

### Issue: "Column usage_count does not exist"
**Fix:** Run the migration SQL first!

### Issue: PIN still works after 3 uses
**Check:**
1. Is usage_count incrementing? (Check database)
2. Is active changing to false? (Check database)
3. Are you using the same PIN? (Not generating new one)

### Issue: No usage count shown in UI
**Check:**
1. Did you refresh the page?
2. Is the column in the interface definition?
3. Are you viewing the correct PIN?

### Issue: Badge color not changing
**Check:**
1. Browser cache (hard refresh: Ctrl+Shift+R)
2. Badge logic in code
3. Component re-rendering

---

## 🎯 QUICK VERIFICATION QUERY

**Run this to see all test results:**

```sql
WITH pin_stats AS (
  SELECT 
    pin_code,
    usage_count,
    active,
    last_used_at,
    CASE 
      WHEN usage_count >= 3 THEN '🔴 Exhausted'
      WHEN usage_count = 2 THEN '🟡 Warning'
      WHEN usage_count = 1 THEN '🟢 Good'
      WHEN usage_count = 0 THEN '⚪ Fresh'
    END as status
  FROM pins
  WHERE created_at > NOW() - INTERVAL '1 hour'
)
SELECT * FROM pin_stats
ORDER BY usage_count DESC;
```

---

## ✅ SUCCESS INDICATORS

### You'll Know It's Working When:

1. **Student View:**
   - [x] New PIN shows 0/3
   - [x] Badge color changes (gray → blue → red)
   - [x] "Last used" appears after first use
   - [x] 4th attempt gets rejected

2. **Admin View:**
   - [x] Usage column shows counts
   - [x] Badge colors match usage
   - [x] Last used timestamps visible

3. **Database:**
   - [x] usage_count increments correctly
   - [x] last_used_at updates on each use
   - [x] active becomes false at 3 uses

4. **Error Handling:**
   - [x] Clear error message on 4th use
   - [x] No crashes or console errors
   - [x] Graceful handling of edge cases

---

## 📈 EXPECTED TEST TIMELINE

```
[0:00] Start - Run migration
[0:30] Migration complete
[1:00] Login as student
[1:30] Generate PIN (0/3)
[2:00] Use PIN 1st time (1/3)
[2:30] Use PIN 2nd time (2/3)
[3:00] Use PIN 3rd time (3/3 - inactive)
[3:30] Try 4th time - rejected ✅
[4:00] Check admin panel
[4:30] Verify database
[5:00] Complete! ✅
```

**Total Time: 5 minutes**

---

## 🎉 COMPLETION CHECKLIST

After successful test:

- [ ] Migration ran without errors
- [ ] New PIN created with 0/3 uses
- [ ] PIN worked 3 times
- [ ] Badge colors changed correctly (gray → blue → red)
- [ ] "Last used" timestamp appeared
- [ ] 4th attempt was rejected with clear error
- [ ] Admin can see usage counts
- [ ] Database shows correct usage_count
- [ ] No console errors
- [ ] System is ready for production

---

## 📞 WHAT TO REPORT

### ✅ If Test Passes:
```
✅ PIN 3-uses feature is working!
- New PINs start at 0/3 uses
- Usage increments correctly (1/3, 2/3, 3/3)
- Badge colors change appropriately
- PIN deactivates after 3 uses
- Admin can track usage
- Ready for production use
```

### ❌ If Test Fails:
```
❌ Issue found:
- Step that failed: [e.g., "Step 3: 1st use"]
- Expected: [e.g., "1/3 uses"]
- Got: [e.g., "PIN became inactive"]
- Error message: [paste error]
- Console logs: [paste logs]
- Database state: [paste query result]
```

---

## 🚀 NEXT STEPS AFTER SUCCESSFUL TEST

1. ✅ **Announce to users:**
   - "PINs can now be used 3 times!"
   - "Less PIN generation needed"

2. ✅ **Update user documentation:**
   - Student handbook
   - Parent guide
   - Admin manual

3. ✅ **Monitor usage:**
   - Track average uses per PIN
   - Check for issues
   - Gather feedback

4. ✅ **Consider future enhancements:**
   - Make max uses configurable (admin setting)
   - Send notification at 2/3 uses
   - PIN usage analytics

---

**RUN THIS TEST NOW TO VERIFY THE 3-USES FEATURE!** 🧪✨
