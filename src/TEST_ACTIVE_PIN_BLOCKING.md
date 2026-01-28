# 🧪 TEST ACTIVE PIN BLOCKING - QUICK GUIDE

## ⚡ 3-MINUTE TEST

### Test Flow:
```
1. Login as student → Generate PIN → Success ✅
2. Try to generate again → BLOCKED ❌
3. Use PIN 3 times → Becomes inactive
4. Try to generate again → Success ✅
```

---

## 📝 DETAILED TEST STEPS

### STEP 1: Fresh Start (No Active PIN)

1. **Login as Student**
2. **Go to:** Result PIN Viewer
3. **Observe:**
   - ✅ "Generate New PIN" button is **ENABLED**
   - ✅ No green alert card
   - ✅ No helper text under button

4. **Click:** "Generate New PIN"
5. **Expected:**
   - ✅ Success toast: "Result PIN generated successfully!"
   - ✅ New PIN appears with **0/3 uses**
   - ✅ Status: **Active**

**Result:** First PIN generation works ✅

---

### STEP 2: Try to Generate Again (Has Active PIN)

1. **Stay on same page** (or refresh)
2. **Observe:**
   - ❌ "Generate New PIN" button is **DISABLED** (grayed out)
   - ✅ Green alert card appears:
     ```
     ✅ You have an active PIN!
     Your current PIN has 3 use(s) remaining 
     and expires on [date].
     ```
   - ✅ Helper text under button:
     ```
     You have an active PIN with 3 use(s) left 
     (expires [date])
     ```

3. **Try to click button**
4. **Expected:**
   - ❌ Button is not clickable (disabled)
   - ❌ No action happens

**Result:** Button correctly disabled ✅

---

### STEP 3: Force Click (Developer Tools)

1. **Right-click** on disabled button
2. **Inspect element**
3. **Remove** `disabled` attribute
4. **Click** button
5. **Expected:**
   - ❌ Error toast appears (8 seconds):
     ```
     You already have an active PIN!
     
     • Used: 0/3 times
     • Remaining uses: 3
     • Expires: [date]
     
     You can only generate a new PIN when your 
     current one expires or is fully used.
     ```

**Result:** Backend blocks generation ✅

---

### STEP 4: Use PIN Once

1. **Copy your active PIN**
2. **Go to:** Student Results
3. **Enter PIN** and verify
4. **Go back to:** Result PIN Viewer
5. **Observe:**
   - ❌ Button still **DISABLED**
   - ✅ Alert shows: "has **2 use(s)** remaining"
   - ✅ PIN shows: **1/3 uses**
   - ✅ "Last used" timestamp appears

**Result:** Still blocked after 1 use ✅

---

### STEP 5: Use PIN Second Time

1. **Go to:** Student Results again
2. **Enter same PIN**
3. **Go back to:** Result PIN Viewer
4. **Observe:**
   - ❌ Button still **DISABLED**
   - ✅ Alert shows: "has **1 use(s)** remaining" (blue badge warning!)
   - ✅ PIN shows: **2/3 uses**

**Result:** Still blocked after 2 uses ✅

---

### STEP 6: Use PIN Third Time (Final Use)

1. **Go to:** Student Results again
2. **Enter same PIN**
3. **Go back to:** Result PIN Viewer
4. **Observe:**
   - ✅ Button is now **ENABLED**!
   - ✅ No green alert card
   - ✅ No helper text
   - ✅ PIN shows: **3/3 uses** (red badge)
   - ✅ Status: **Inactive**

**Result:** Can generate new PIN after 3 uses ✅

---

### STEP 7: Generate New PIN

1. **Click:** "Generate New PIN"
2. **Expected:**
   - ✅ Success toast
   - ✅ New PIN created with **0/3 uses**
   - ✅ Old PIN remains in list (inactive)
   - ✅ New PIN is active

**Result:** Successfully generated new PIN ✅

---

## 🎯 VISUAL CHECKLIST

### When No Active PIN:
```
┌─────────────────────────────────────┐
│  [Generate New PIN] ← GREEN, ENABLED│
└─────────────────────────────────────┘
(No alert, no helper text)
```

### When Has Active PIN:
```
┌─────────────────────────────────────┐
│  [Generate New PIN] ← GRAY, DISABLED│
│  You have an active PIN with 2      │
│  use(s) left (expires Nov 15)       │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ ✅ You have an active PIN!          │
│ Your current PIN has 2 use(s)       │
│ remaining and expires on Nov 15.    │
└─────────────────────────────────────┘
```

---

## 🔍 WHAT TO CHECK

### Frontend Checks:
- [ ] Button disabled when active PIN exists
- [ ] Helper text shows remaining uses and expiry
- [ ] Green alert card appears with active PIN
- [ ] Button enabled when no active PIN
- [ ] Alerts disappear when no active PIN

### Backend Checks:
- [ ] API returns error when active PIN exists
- [ ] Error includes `hasActivePin: true`
- [ ] Error includes active PIN details
- [ ] API allows generation when no active PIN
- [ ] Validation checks expiry date
- [ ] Validation checks usage count

### Database Checks:
```sql
-- Should show only ONE active PIN per student/term
SELECT 
  pin_code,
  usage_count,
  active,
  expires_at
FROM pins
WHERE student_id = 'STUDENT_UUID'
  AND term = 'First Term'
  AND session = '2023/2024'
ORDER BY created_at DESC;
```

**Expected:** Only 1 PIN with `active=true` and valid expiry/usage

---

## ⚠️ COMMON ISSUES

### Issue: Button not disabling
**Check:**
1. Is there an active PIN in the list?
2. Is `hasValidActivePin()` working?
3. Console: `console.log(pins, hasValidActivePin())`

### Issue: Can still generate with active PIN
**Check:**
1. Backend validation running?
2. Check server logs
3. Test with API call directly

### Issue: Alert not showing
**Check:**
1. Active PIN actually active?
2. Not expired?
3. Less than 3 uses?

---

## 📊 BROWSER CONSOLE TESTS

**Paste this in browser console:**
```javascript
// Check active PIN detection
const pins = [...]; // Your pins array
const hasActive = pins.some(pin => {
  const notExpired = new Date(pin.expires_at) > new Date();
  const hasUsesRemaining = (pin.usage_count || 0) < 3;
  return pin.active && notExpired && hasUsesRemaining;
});

console.log('Has active PIN?', hasActive);

// Get active PIN info
const activePin = pins.find(pin => {
  const notExpired = new Date(pin.expires_at) > new Date();
  const hasUsesRemaining = (pin.usage_count || 0) < 3;
  return pin.active && notExpired && hasUsesRemaining;
});

console.log('Active PIN:', activePin);
console.log('Remaining uses:', activePin ? 3 - (activePin.usage_count || 0) : 'N/A');
```

---

## ✅ PASS CRITERIA

### Test PASSES if:

| Test | Expected | Result |
|------|----------|--------|
| No active PIN | Button enabled | ✅ |
| Fresh PIN (0/3) | Button disabled | ✅ |
| After 1 use (1/3) | Button disabled | ✅ |
| After 2 uses (2/3) | Button disabled | ✅ |
| After 3 uses (3/3) | Button enabled | ✅ |
| Force click with active | Backend blocks | ✅ |
| Error toast details | Shows usage/expiry | ✅ |
| Green alert card | Shows when active | ✅ |

### Test FAILS if:
- ❌ Can generate with active PIN (0-2 uses)
- ❌ Button not disabling
- ❌ No alert card shown
- ❌ Backend allows duplicate PIN
- ❌ Wrong usage count displayed

---

## 🚀 QUICK VERIFICATION

**Run this sequence:**
```
1. Generate PIN → ✅ Success
2. Try again → ❌ Blocked (button disabled)
3. Force click → ❌ Blocked (backend error)
4. Use PIN 3× → ✅ Can generate again
```

**Total time: 3 minutes**

---

## 📸 SCREENSHOTS TO VERIFY

### Before (No Active PIN):
- Enabled green button
- No alerts
- Clean interface

### After (Active PIN):
- Disabled gray button
- Green alert card
- Helper text below button
- PIN list shows active PIN

### Error Toast:
- Red error message
- Usage details
- Expiry date
- Clear instructions

---

## 🎯 SUCCESS MESSAGE

**When all tests pass:**
```
✅ Active PIN blocking is working perfectly!

Students cannot generate duplicate PINs when they 
have an active one. The system correctly:
- Disables the button visually
- Shows helpful alerts
- Blocks backend generation
- Allows generation after expiry/3 uses

Ready for production! 🚀
```

---

**TEST THIS NOW TO VERIFY THE BLOCKING FEATURE!** 🧪✨
