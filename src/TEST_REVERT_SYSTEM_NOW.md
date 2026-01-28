# 🧪 Test Revert System - Quick Guide

## ⚡ 5-Minute Test

### Step 1: Run the SQL (1 minute)
```sql
-- In Supabase SQL Editor
-- Run this to add is_reverted column if not exists:

ALTER TABLE promotions 
ADD COLUMN IF NOT EXISTS is_reverted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS reverted_by UUID REFERENCES profiles(id),
ADD COLUMN IF NOT EXISTS reverted_at TIMESTAMPTZ;
```

### Step 2: Promote a Class (1 minute)
1. Go to: **Settings → Promotion Management**
2. Find a class with students (e.g., JSS1 A with 5 students)
3. Select destination class from dropdown
4. Click **[Promote]**
5. ✅ Should see: "✅ 5 students promoted..."

### Step 3: Check Recent Promotions (30 seconds)
1. Scroll down to **"Recent Promotions"** section
2. Should see your promotion listed:
   ```
   JSS1 A → JSS2 A
   5 students • 2025/2026
   Just now • By: Your Name    [Revert]
   ```

### Step 4: Test Revert (1 minute)
1. Click the **[Revert]** button
2. Read the confirmation dialog:
   ```
   ⚠️ REVERT PROMOTION
   
   This will move 5 students back:
   FROM: JSS2 A
   TO: JSS1 A
   ...
   ```
3. Click **OK**
4. ✅ Should see: "✅ 5 students returned to JSS1 A!"

### Step 5: Verify (1.5 minutes)
1. Check class counts updated:
   - JSS1 A: Should show original count
   - JSS2 A: Should show reduced count
2. Check Recent Promotions section:
   - Promotion should show **[Reverted]** badge
   - Should be grayed out
   - **[Revert]** button should be gone
3. Try to revert again:
   - Button should not appear (already reverted)

### ✅ Total Time: ~5 minutes

---

## 🎯 Detailed Test Scenarios

### Test 1: Basic Revert
**Goal:** Verify revert works correctly

```
Steps:
1. Note initial student counts
   JSS1 A: 25 students
   JSS2 A: 30 students

2. Promote JSS1 A → JSS2 A
   Expected: 
   - JSS1 A: 0 students
   - JSS2 A: 55 students
   - Recent Promotions shows: "JSS1 A → JSS2 A, 25 students"

3. Click [Revert]
   Expected:
   - Confirmation dialog appears
   - Shows "move 25 students back"

4. Confirm revert
   Expected:
   - JSS1 A: 25 students ✅
   - JSS2 A: 30 students ✅
   - Promotion shows [Reverted] badge ✅
```

**Pass Criteria:**
- [ ] Student counts match original
- [ ] Promotion marked as reverted
- [ ] Cannot revert again
- [ ] Success toast appears

---

### Test 2: Graduation Revert
**Goal:** Verify reverting graduation works

```
Steps:
1. Note SS3 A student count: 30 students

2. Graduate SS3 A
   Expected:
   - Students have class_id = NULL
   - Recent Promotions shows "SS3 A → Graduated"

3. Revert graduation
   Expected:
   - Students back in SS3 A
   - class_id = SS3_A (not NULL)

4. Check student dashboards
   Expected:
   - Students can see SS3 A dashboard
   - Can access SS3 results
   - Timetable shows SS3 schedule
```

**Pass Criteria:**
- [ ] Students returned to SS3 A
- [ ] Student dashboards work
- [ ] No longer see "graduated" status
- [ ] Can promote again if needed

---

### Test 3: Multiple Reverts
**Goal:** Test reverting multiple promotions

```
Steps:
1. Promote 3 classes:
   - JSS1 A → JSS2 A (25 students)
   - JSS2 A → JSS3 A (30 students)
   - JSS3 A → SS1 A (28 students)

2. Recent Promotions should show all 3

3. Revert JSS3 A → SS1 A
   Expected:
   - 28 students back in JSS3 A
   - Other 2 promotions still active

4. Revert JSS2 A → JSS3 A
   Expected:
   - 30 students back in JSS2 A
   - JSS3 A now has: 28 students (not 58!)

5. Revert JSS1 A → JSS2 A
   Expected:
   - 25 students back in JSS1 A
   - JSS2 A now has: 30 students
```

**Pass Criteria:**
- [ ] Each revert independent
- [ ] Student counts correct
- [ ] All 3 show [Reverted]
- [ ] Can promote again

---

### Test 4: Cannot Double Revert
**Goal:** Verify cannot revert twice

```
Steps:
1. Promote JSS1 A → JSS2 A

2. Revert once
   Expected:
   - Shows [Reverted] badge
   - [Revert] button disappears

3. Try to revert again
   Expected:
   - No [Revert] button
   - Card is grayed out
   - Cannot interact with it

4. Check database
   Expected:
   - is_reverted = true
   - Backend prevents double revert
```

**Pass Criteria:**
- [ ] Button hidden after revert
- [ ] Card grayed out
- [ ] Backend validation works
- [ ] Database consistent

---

### Test 5: Revert and Re-promote
**Goal:** Test fixing mistakes

```
Steps:
1. Accidentally promote JSS1 A → JSS2 A
   (Should have been JSS2 B)

2. Revert the promotion
   Expected:
   - Students back in JSS1 A

3. Change dropdown to JSS2 B

4. Promote again
   Expected:
   - Students now in JSS2 B
   - New promotion in Recent Promotions
   - Old promotion still shows [Reverted]
```

**Pass Criteria:**
- [ ] Can re-promote after revert
- [ ] Students in correct class
- [ ] Both promotions in history
- [ ] Old one marked reverted

---

### Test 6: Session Tracking
**Goal:** Verify sessions recorded correctly

```
Steps:
1. Set current session: 2024/2025
2. Set new session: 2025/2026

3. Promote JSS1 A → JSS2 A

4. Check Recent Promotions
   Expected:
   - Shows "2024/2025 → 2025/2026"

5. Revert promotion

6. Check database
   Expected:
   SQL:
   SELECT current_session, new_session, is_reverted
   FROM promotions
   WHERE id = 'promotion_id';
   
   Result:
   current_session | new_session | is_reverted
   2024/2025      | 2025/2026   | true
```

**Pass Criteria:**
- [ ] Sessions displayed correctly
- [ ] Revert dialog shows sessions
- [ ] Database has correct sessions
- [ ] Audit trail complete

---

### Test 7: Permission Checking
**Goal:** Verify only admins can revert

```
Test as Admin (Principal/Director/IT Admin):
1. Login as admin
2. Go to Promotion Management
3. See Recent Promotions section ✅
4. Can click [Revert] button ✅

Test as Teacher:
1. Login as teacher
2. Go to dashboard
3. Cannot access Promotion Management ✅

Test as Student:
1. Login as student
2. Go to dashboard
3. Cannot access Promotion Management ✅
```

**Pass Criteria:**
- [ ] Only admins see revert button
- [ ] Backend validates permissions
- [ ] Teachers cannot access
- [ ] Students cannot access

---

### Test 8: Performance Test
**Goal:** Verify system handles large numbers

```
Steps:
1. Promote class with 100 students

2. Time the revert operation
   Expected: < 1 second

3. Check Recent Promotions loads fast
   Expected: < 200ms

4. Promote 10 classes
   Expected: All 10 in Recent Promotions

5. Revert all 10
   Expected: All complete < 5 seconds total
```

**Pass Criteria:**
- [ ] Single revert < 1 second
- [ ] Load time < 200ms
- [ ] Handles 100+ students
- [ ] UI responsive

---

### Test 9: Error Handling
**Goal:** Verify errors handled gracefully

```
Test 1: Network Error
1. Disconnect internet
2. Try to revert
   Expected: "Failed to revert promotion" error

Test 2: Invalid Promotion ID
1. Manually call API with fake ID
   Expected: "Promotion record not found"

Test 3: Already Reverted
1. Try to revert same promotion twice
   Expected: Button hidden, cannot proceed

Test 4: Session Expired
1. Wait for session timeout
2. Try to revert
   Expected: "Not authenticated" error
```

**Pass Criteria:**
- [ ] Error messages clear
- [ ] No data corruption
- [ ] Can retry after fixing
- [ ] User informed of issue

---

### Test 10: Audit Trail
**Goal:** Verify complete tracking

```
Steps:
1. Promote as Admin 1
   - Check promoted_by recorded

2. Revert as Admin 2
   - Check reverted_by recorded

3. Query database:
   SELECT 
     promoted_by,
     promoted_at,
     reverted_by,
     reverted_at,
     is_reverted
   FROM promotions
   WHERE id = 'promotion_id';

4. Verify all fields populated
   Expected:
   - promoted_by: Admin 1 UUID
   - promoted_at: Timestamp
   - reverted_by: Admin 2 UUID
   - reverted_at: Timestamp
   - is_reverted: true
```

**Pass Criteria:**
- [ ] Who promoted recorded
- [ ] When promoted recorded
- [ ] Who reverted recorded
- [ ] When reverted recorded
- [ ] Full audit trail

---

## 📋 Quick Checklist

### Functionality:
- [ ] Can see recent promotions
- [ ] Can click revert button
- [ ] Confirmation dialog appears
- [ ] Students moved back correctly
- [ ] Student counts updated
- [ ] Promotion marked as reverted
- [ ] Cannot revert twice
- [ ] Can re-promote after revert

### UI/UX:
- [ ] Recent Promotions section visible
- [ ] Class names displayed correctly
- [ ] Student counts accurate
- [ ] Timestamps formatted nicely
- [ ] [Revert] button styled correctly
- [ ] [Reverted] badge shows properly
- [ ] Loading states work
- [ ] Success/error toasts appear

### Security:
- [ ] Only admins can access
- [ ] Session validation works
- [ ] Permissions checked
- [ ] No unauthorized access

### Performance:
- [ ] Loads quickly (< 200ms)
- [ ] Reverts quickly (< 1s)
- [ ] Handles 100+ students
- [ ] UI responsive

---

## 🐛 Common Issues & Fixes

### Issue 1: "Promotion not found"
**Fix:** Run SQL to create promotions table with is_reverted column

### Issue 2: Revert button not showing
**Fix:** Check user role is admin (principal/director/it_admin)

### Issue 3: Student counts wrong
**Fix:** Refresh page to update counts from backend

### Issue 4: Cannot revert graduation
**Fix:** Check to_class_id is NULL in database for graduated students

### Issue 5: Recent Promotions empty
**Fix:** Perform a promotion first to populate the list

---

## ✅ Success Indicators

You'll know the system works when:

✅ **Recent Promotions section appears** after promoting  
✅ **[Revert] button is red and clickable**  
✅ **Confirmation dialog shows correct details**  
✅ **Students return to original class**  
✅ **[Reverted] badge appears after reverting**  
✅ **Cannot revert the same promotion twice**  
✅ **Can re-promote after reverting**  

---

## 🎉 Final Verification

Run this SQL to verify everything worked:

```sql
-- Check a recent promotion and its revert
SELECT 
  p.id,
  c1.name as from_class,
  c2.name as to_class,
  p.current_session,
  p.new_session,
  p.is_reverted,
  p.promoted_at,
  p.reverted_at,
  prof1.first_name || ' ' || prof1.last_name as promoted_by,
  prof2.first_name || ' ' || prof2.last_name as reverted_by
FROM promotions p
LEFT JOIN classes c1 ON p.from_class_id = c1.id
LEFT JOIN classes c2 ON p.to_class_id = c2.id
LEFT JOIN profiles prof1 ON p.promoted_by = prof1.id
LEFT JOIN profiles prof2 ON p.reverted_by = prof2.id
WHERE p.promoted_at > NOW() - INTERVAL '1 day'
ORDER BY p.promoted_at DESC
LIMIT 10;
```

Expected Output:
```
from_class | to_class | is_reverted | promoted_by | reverted_by
-----------|----------|-------------|-------------|------------
JSS1 A     | JSS2 A   | true        | John Admin  | Jane Admin
JSS2 A     | JSS3 A   | false       | John Admin  | NULL
```

If you see records with `is_reverted = true` and both `promoted_by` and `reverted_by` populated, **the system is working perfectly!** 🎉

---

## 🚀 Ready to Use!

After passing these tests, your revert system is ready for production use. Administrators can now confidently promote students knowing they can easily undo any mistakes! 🎊
