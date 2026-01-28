# Director Dashboard - Quick Start Guide ⚡

## 3 Steps to Get Started

### Step 1: Run SQL (2 minutes)

1. Open Supabase Dashboard
2. Go to **SQL Editor**
3. Open file: `/ADD_DIRECTOR_ROLE.sql`
4. Copy all SQL code
5. Paste into SQL Editor
6. Click **"Run"**
7. Wait for success message

**Expected:**
```
✅ Director role successfully added
```

---

### Step 2: Create Director User (3 minutes)

**Option A: Create New Director User**

Run this in Supabase SQL Editor:

```sql
-- First, create the auth user (use Supabase Auth UI or this method)
-- Then insert into profiles table

INSERT INTO profiles (id, first_name, middle_name, last_name, role, email)
VALUES 
  (
    '{auth-user-id}', -- Replace with actual auth.users ID
    'John',
    NULL,
    'Director',
    'director',
    'director@school.com'
  );
```

**Option B: Update Existing User to Director**

If you already have a user, just change their role:

```sql
UPDATE profiles 
SET role = 'director' 
WHERE email = 'existing-user@school.com';
-- or
WHERE id = '{user-id}';
```

**Option C: Via Supabase Dashboard**

1. Go to **Table Editor** → **profiles** table
2. Find the user you want to make director
3. Click **Edit** on their row
4. Change **role** column to `director`
5. Click **Save**

---

### Step 3: Test the Dashboard (1 minute)

1. **Log in** with director credentials
2. **Check sidebar** - Should show:
   - Overview
   - Teachers
   - Students
   - Classes
   - Subjects
   - Compliance Record
   - Timetable
   - Results Check
   - Finance
   - Profile Creation
   - Settings

3. **Click "Teachers"** - Should show:
   - 7 tabs (Teachers, Students, Classes, Timetable, Uploads, Results, Finance)
   - Search bar
   - Teachers table with data

---

## What You'll See

### Mobile View (Phone)
```
┌─────────────────┐
│ [☰]             │ ← Hamburger menu
│   Space below   │
│                 │
│ Overview        │
│ ┌─────────────┐ │
│ │ Teachers    │ │ ← Stats cards
│ │    45       │ │   (stacked)
│ └─────────────┘ │
│ ┌─────────────┐ │
│ │ Students    │ │
│ │   250       │ │
│ └─────────────┘ │
└─────────────────┘
```

### Desktop View
```
┌──────┬─────────────────────────────────────┐
│      │ Overview                            │
│ Side │                                     │
│ bar  │ ┌────────┬────────┬────────┬──────┐│
│      │ │Teachers│Students│Classes │Compli││
│ Menu │ │   45   │  250   │   12   │ ancy ││
│      │ └────────┴────────┴────────┴──────┘│
│ -    │                                     │
│ Over │ Recent Activity    Pending Items    │
│ view │ [...]              [...]            │
└──────┴─────────────────────────────────────┘
```

---

## Menu Items Explained

### 1. **Overview**
Home page with quick stats and recent activity

### 2. **Teachers** ⭐
**Most detailed page - 7 tabs:**
- Teachers list (name, email, subjects, classes)
- Students list (name, email, class)
- Classes overview
- Timetable overview
- Uploads overview
- Results overview
- Finance overview

### 3. **Students**
Full student management (existing component)

### 4. **Classes**
Class management interface (placeholder)

### 5. **Subjects**
Subjects with class assignments (placeholder)

### 6. **Compliance Record**
Track marks entry and uploads compliance (placeholder)

### 7. **Timetable**
School timetable management (existing component)

### 8. **Results Check**
Verify and check report cards (existing component)

### 9. **Finance**
Financial overview and reports (placeholder)

### 10. **Profile Creation**
Create user profiles (placeholder)

### 11. **Settings**
System settings (existing component)

---

## Teachers Page - Deep Dive

### Tab 1: Teachers
Shows all teachers with:
- Full name
- Email (hidden on mobile)
- Subjects teaching (badges)
- Classes assigned (badges, hidden on mobile)

**Search works on:**
- Teacher name
- Email
- Subject names

### Tab 2: Students
Shows all students with:
- Full name
- Email (hidden on mobile)
- Assigned class (badge)

**Search works on:**
- Student name
- Email
- Class name

### Tabs 3-7: Placeholders
Ready for implementation

---

## Responsive Breakpoints

### Mobile: < 768px
- Hamburger menu
- 64px top padding
- 1-column layout
- Stacked cards
- Simplified tables

### Tablet: 768px - 1024px
- Sidebar visible
- 2-column cards
- Full tables (some columns hidden)

### Desktop: > 1024px
- Sidebar visible
- 4-column cards
- All table columns

---

## Common Issues & Fixes

### Issue: "Page not found" or blank screen

**Fix:** Hard refresh
- **Ctrl + Shift + R** (Windows/Linux)
- **Cmd + Shift + R** (Mac)

---

### Issue: Menu items not showing

**Fix:** Check role
1. Verify user role is 'director'
2. Check in KV store:
   ```sql
   SELECT * FROM kv_store_1ddd013a 
   WHERE key LIKE 'user:%:role' 
   AND value = '"director"';
   ```

---

### Issue: Teachers page empty

**Fix:** Check data exists
1. Verify teachers exist in system
2. Check users API endpoint
3. Look at browser console for errors

---

## Test Checklist

### ✅ Basic Tests (2 minutes)

1. **Log in as director**
   - [ ] Login successful
   - [ ] Redirects to dashboard

2. **Check sidebar**
   - [ ] School logo/name visible
   - [ ] 11 menu items present
   - [ ] Profile section at bottom

3. **Navigate pages**
   - [ ] Click Overview - loads
   - [ ] Click Teachers - loads with tabs
   - [ ] Click Students - loads
   - [ ] Click Settings - loads

4. **Test responsive**
   - [ ] Resize browser < 768px
   - [ ] Hamburger appears
   - [ ] Sidebar slides in/out
   - [ ] Content has padding

---

### ✅ Advanced Tests (5 minutes)

1. **Teachers page:**
   - [ ] Switch between 7 tabs
   - [ ] Search for teacher name
   - [ ] Search for subject
   - [ ] Check badges display

2. **Mobile view:**
   - [ ] Hamburger scrolls with page
   - [ ] Tables scroll horizontally
   - [ ] Email hidden on mobile
   - [ ] Cards stacked

3. **Desktop view:**
   - [ ] Sidebar always visible
   - [ ] 4 cards in row
   - [ ] Full tables
   - [ ] All columns visible

---

## Browser Console Check

Press **F12** and run:

```javascript
// Check if director dashboard loaded
const sidebar = document.querySelector('[class*="DirectorSidebar"]');
console.log('Director sidebar found:', !!sidebar);

// Check menu items count
const menuItems = document.querySelectorAll('nav button');
console.log('Menu items:', menuItems.length); // Should be 11

// Check active section
const activeItem = document.querySelector('[class*="bg-blue-600"]');
console.log('Active item:', activeItem?.textContent);
```

**Expected:**
```
Director sidebar found: true
Menu items: 11
Active item: Overview
```

---

## Data Flow

```
Login
  ↓
AuthContext checks role
  ↓
role === 'director'?
  ↓ Yes
DirectorSidebar loads
  ↓
DirectorDashboardContent loads
  ↓
User clicks "Teachers"
  ↓
DirectorTeachersOverview loads
  ↓
Fetches data:
  - Teachers (API)
  - Students (API)
  - Subjects (API)
  - Classes (API)
  ↓
Displays in tables with search
```

---

## Performance Tips

### 1. **Use Search**
Instead of scrolling through long tables, use search bar

### 2. **Tab Switching**
Only active tab content is rendered (saves resources)

### 3. **Mobile Optimization**
Fewer columns on mobile = faster rendering

---

## Next Steps After Setup

1. **Add real finance data** to Finance page
2. **Implement Classes page** with full class management
3. **Build Subjects page** showing class offerings
4. **Create Compliance tracker** with real-time data
5. **Enhance Profile Creation** with bulk import

---

## Summary

**Time to setup:** 6 minutes
- SQL: 2 min
- Create user: 3 min
- Test: 1 min

**Files to check:**
- `/ADD_DIRECTOR_ROLE.sql`
- `/components/DirectorSidebar.tsx`
- `/components/DirectorDashboardContent.tsx`
- `/components/director/DirectorTeachersOverview.tsx`

**What works now:**
- ✅ Full director dashboard
- ✅ 11 menu items
- ✅ Teachers page with 7 tabs
- ✅ Search functionality
- ✅ Fully responsive
- ✅ Mobile hamburger menu

**Ready to use!** 🚀

Just run the SQL, create a director user, and log in!
