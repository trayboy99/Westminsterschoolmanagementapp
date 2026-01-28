# Test Director Dashboard - Now! ⚡

## Quick 3-Minute Test

### ⏱️ Step 1: Run SQL (30 seconds)

1. Open **Supabase Dashboard**
2. Click **SQL Editor**
3. Copy this:

```sql
ALTER TABLE kv_store_1ddd013a 
DROP CONSTRAINT IF EXISTS kv_store_1ddd013a_key_check;

ALTER TABLE kv_store_1ddd013a 
ADD CONSTRAINT kv_store_1ddd013a_key_check 
CHECK (
  key LIKE 'user:%' OR 
  key LIKE 'student:%' OR 
  key LIKE 'teacher:%' OR 
  key LIKE 'class:%' OR 
  key LIKE 'subject:%' OR 
  key LIKE 'exam:%' OR 
  key LIKE 'mark:%' OR 
  key LIKE 'result:%' OR 
  key LIKE 'pin:%' OR 
  key LIKE 'upload:%' OR 
  key LIKE 'timetable:%' OR 
  key LIKE 'session:%' OR 
  key LIKE 'school:%' OR 
  key LIKE 'deadline:%' OR 
  key LIKE 'registration:%' OR
  key LIKE 'role:%' OR
  key LIKE 'profile:%' OR
  key LIKE 'director:%'
);
```

4. Click **"Run"**
5. Wait for green checkmark ✅

---

### ⏱️ Step 2: Create Director User (1 minute)

**Option A: Update Existing User (Fastest)**

Paste this in SQL Editor:

```sql
-- Change an existing user to director role
UPDATE profiles 
SET role = 'director' 
WHERE email = 'your-email@school.com'; -- Replace with your email
```

**Option B: Via Supabase Dashboard**

1. Go to **Table Editor**
2. Open **profiles** table
3. Find your user row
4. Edit the **role** column to `director`
5. Save

**Option C: Create New Director**

```sql
-- Insert a new director (requires auth user to exist first)
INSERT INTO profiles (id, first_name, last_name, role, email)
VALUES 
  (
    '{auth-user-id}', -- Your auth.users ID
    'Test',
    'Director',
    'director',
    'director@test.com'
  );
```

---

### ⏱️ Step 3: Test Login (30 seconds)

1. **Log out** if currently logged in
2. **Log in** with:
   - Email: `director@test.com`
   - Password: `director123`
3. **Should see:** Director Dashboard

---

## What to Check (1 minute)

### ✅ Sidebar Check:

**You should see 11 menu items:**
```
1. Overview
2. Teachers
3. Students
4. Classes
5. Subjects
6. Compliance Record
7. Timetable
8. Results Check
9. Finance
10. Profile Creation
11. Settings
```

**Verify:**
- [ ] School logo/name at top
- [ ] All 11 items visible
- [ ] "Overview" is active (highlighted)
- [ ] Your name at bottom
- [ ] "Sign Out" button

---

### ✅ Overview Page Check:

**You should see:**
```
┌────────────────────────────┐
│ Director Dashboard         │
│ Welcome back, Test!        │
│                            │
│ ┌────┬────┬────┬────┐     │
│ │ Te │ St │ Cl │ Co │     │
│ │ 👥 │ 🎓 │ 📚 │ ✅ │     │
│ └────┴────┴────┴────┘     │
│                            │
│ Recent Activity            │
│ Pending Items              │
└────────────────────────────┘
```

**Verify:**
- [ ] 4 stat cards visible
- [ ] Cards are clickable
- [ ] "Recent Activity" section
- [ ] "Pending Items" section

---

### ✅ Teachers Page Check:

1. **Click "Teachers" in sidebar**

**You should see:**
```
┌────────────────────────────┐
│ Teachers Overview          │
│                            │
│ [Stats Cards]              │
│                            │
│ [Search Bar]               │
│                            │
│ [7 Tabs]                   │
│ Teachers | Students | ...  │
│                            │
│ [Table with teachers]      │
└────────────────────────────┘
```

**Verify:**
- [ ] 4 stat cards (Teachers, Students, Subjects, Classes)
- [ ] Search bar present
- [ ] 7 tabs visible
- [ ] "Teachers" tab is active
- [ ] Table shows teachers (or "No teachers found")

2. **Click "Students" tab**

**Verify:**
- [ ] Tab switches
- [ ] Students table appears
- [ ] Shows student names, emails, classes

---

## Mobile Test (1 minute)

### Resize browser < 768px

**Or press F12 → Toggle device toolbar → Select "iPhone 12"**

**You should see:**
```
┌──────────────┐
│ [☰]          │ ← Hamburger menu
│              │
│   64px gap   │
│              │
├──────────────┤
│ Director     │
│ Dashboard    │
│              │
│ ┌──────────┐ │
│ │ Teachers │ │ ← Cards stack
│ │    45    │ │   vertically
│ └──────────┘ │
│ ┌──────────┐ │
│ │ Students │ │
│ │   250    │ │
│ └──────────┘ │
└──────────────┘
```

**Verify:**
- [ ] Hamburger (☰) in top-left
- [ ] 64px space below hamburger
- [ ] Cards stack in 1 column
- [ ] Content doesn't overlap hamburger

**Click hamburger:**
- [ ] Sidebar slides in from left
- [ ] Shows X button
- [ ] Background darkens
- [ ] Menu items visible

---

## Desktop Test (30 seconds)

### Resize browser > 1024px

**You should see:**
```
┌────┬─────────────────────┐
│    │ Director Dashboard  │
│ S  │                     │
│ i  │ ┌──┬──┬──┬──┐      │
│ d  │ │Te│St│Cl│Co│      │
│ e  │ │ 👥│🎓│📚│✅│      │
│ b  │ └──┴──┴──┴──┘      │
│ a  │                     │
│ r  │ Activity  Pending   │
│    │                     │
└────┴─────────────────────┘
```

**Verify:**
- [ ] Sidebar always visible (left side)
- [ ] No hamburger menu
- [ ] 4 cards in single row
- [ ] Wide content area

---

## Search Test (30 seconds)

1. **Go to Teachers page**
2. **Type in search:** "Math"

**Verify:**
- [ ] Table filters in real-time
- [ ] Shows only teachers with "Math" in subjects
- [ ] Shows count of filtered results

3. **Clear search**

**Verify:**
- [ ] All teachers appear again

---

## Browser Console Check

**Press F12, paste this:**

```javascript
// Quick verification
const checks = {
  directorSidebar: !!document.querySelector('nav'),
  menuItems: document.querySelectorAll('nav button').length,
  screenWidth: window.innerWidth,
  isMobile: window.innerWidth < 768,
  isTablet: window.innerWidth >= 768 && window.innerWidth < 1024,
  isDesktop: window.innerWidth >= 1024
};

console.table(checks);
console.log(
  checks.menuItems === 11 ? '✅ All 11 menu items present' : '❌ Menu items missing'
);
```

**Expected output:**
```
✓ directorSidebar: true
✓ menuItems: 11
✓ screenWidth: [your width]
✅ All 11 menu items present
```

---

## Quick Test Checklist

### Core Functionality:
- [ ] SQL ran successfully
- [ ] Director user created
- [ ] Login works
- [ ] Dashboard loads
- [ ] 11 menu items visible
- [ ] Overview page shows
- [ ] Teachers page loads
- [ ] 7 tabs present
- [ ] Search works

### Responsive:
- [ ] Mobile: Hamburger visible
- [ ] Mobile: Sidebar slides in
- [ ] Mobile: Cards stack
- [ ] Desktop: Sidebar always visible
- [ ] Desktop: 4-column grid
- [ ] Desktop: No hamburger

### Navigation:
- [ ] Click menu items → pages change
- [ ] Click tabs → content switches
- [ ] Click search → filters data
- [ ] Click cards → navigates (overview)
- [ ] Click profile → settings open
- [ ] Click logout → logs out

---

## Common Issues & Quick Fixes

### Issue: Can't log in as director

**Fix:**
```sql
-- Check if director user exists in profiles table
SELECT * FROM profiles 
WHERE role = 'director';

-- Check what role your user has
SELECT id, first_name, last_name, email, role 
FROM profiles 
WHERE email = 'your-email@school.com';

-- If wrong role, update it
UPDATE profiles 
SET role = 'director' 
WHERE email = 'your-email@school.com';
```

---

### Issue: Dashboard looks wrong

**Fix:**
1. Hard refresh: **Ctrl + Shift + R**
2. Clear cache
3. Reload page

---

### Issue: Hamburger not showing (mobile)

**Fix:**
1. Check screen width < 768px
2. Inspect element - look for hamburger button
3. Refresh page

---

### Issue: No teachers showing

**Fix:**
1. Check if teachers exist in system
2. Look at browser console for errors
3. Verify API endpoints working

---

## Visual Verification

### ✅ Correct Sidebar:
```
┌──────────────┐
│ School Name  │
│ Director     │
│──────────────│
│ > Overview   │ ← Blue highlight
│   Teachers   │
│   Students   │
│   Classes    │
│   Subjects   │
│   Compliance │
│   Timetable  │
│   Results    │
│   Finance    │
│   Profiles   │
│   Settings   │
│──────────────│
│ [Your Name]  │
│ [Sign Out]   │
└──────────────┘
```

### ❌ Wrong (Not Director):
```
┌──────────────┐
│ School Name  │
│ Principal    │ ← Should say Director
│──────────────│
│   Different  │
│   menu items │
└──────────────┘
```

---

## Success Indicators

### ✅ Everything Working If:

1. **Login successful** with director credentials
2. **Sidebar shows** "Director Dashboard"
3. **11 menu items** are visible
4. **Overview page** loads with 4 cards
5. **Teachers page** shows 7 tabs
6. **Search** filters data
7. **Mobile** shows hamburger menu
8. **Desktop** shows sidebar always
9. **No console errors**
10. **Footer** at bottom with "Ororho Brume Tracy"

---

## Performance Check

### Load Times:

**Expected:**
- Initial page load: < 2 seconds
- Menu navigation: Instant
- Tab switching: Instant
- Search filtering: Instant
- Data fetching: 1-2 seconds

**If slow:**
- Check network tab (F12)
- Look for failed requests
- Check console for errors

---

## Final Verification

**Run this complete test:**

```javascript
// Complete director dashboard verification
const test = async () => {
  console.log('🧪 Testing Director Dashboard...\n');
  
  // 1. Check sidebar
  const sidebar = document.querySelector('nav');
  console.log('✓ Sidebar:', sidebar ? 'Found' : 'Not found');
  
  // 2. Count menu items
  const menuItems = document.querySelectorAll('nav button');
  console.log('✓ Menu items:', menuItems.length, '(should be 11)');
  
  // 3. Check screen size
  const width = window.innerWidth;
  const view = width < 768 ? 'Mobile' : 
               width < 1024 ? 'Tablet' : 'Desktop';
  console.log('✓ Screen view:', view, `(${width}px)`);
  
  // 4. Check hamburger (mobile only)
  if (width < 768) {
    const hamburger = document.querySelector('[class*="md:hidden"]');
    console.log('✓ Hamburger:', hamburger ? 'Visible' : 'Hidden');
  }
  
  // 5. Check footer
  const footer = document.querySelector('footer');
  console.log('✓ Footer:', footer ? 'Present' : 'Missing');
  
  console.log('\n🎉 Test complete!');
};

test();
```

**Expected output:**
```
🧪 Testing Director Dashboard...

✓ Sidebar: Found
✓ Menu items: 11 (should be 11)
✓ Screen view: Desktop (1920px)
✓ Footer: Present

🎉 Test complete!
```

---

## Summary

**Total test time:** 3-4 minutes
**Steps:**
1. Run SQL (30 sec)
2. Create user (1 min)
3. Test login (30 sec)
4. Check features (1-2 min)

**If all ✅ above pass:**
→ **Director Dashboard is working perfectly!** 🎉

**If any ❌ fail:**
→ Check "Common Issues & Quick Fixes" section

---

**Ready to test? Go!** 🚀

Run the SQL, create the user, log in, and verify all 11 menu items are there!
