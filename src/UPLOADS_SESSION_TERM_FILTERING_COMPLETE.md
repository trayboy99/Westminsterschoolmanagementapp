# ✅ Uploads Module - Session/Term Filtering Complete

## What Was Fixed

The Uploads Management section now **properly filters all data by the current active academic session and term**, matching the behavior of Gate Monitoring.

---

## Changes Made

### 1. **Frontend** (`/components/uploads/UploadModule.tsx`)

#### Added State Variables:
- `activeSession` - stores the current active session (e.g., "2024/2025")
- `activeTerm` - stores the current active term (e.g., "Second Term")
- `showHistoricalData` - toggle for viewing all historical data (not implemented yet)

#### Added Session/Term Indicator Badge:
- Beautiful gradient badge at the top of the page showing:
  - Active Session with animated pulse indicator
  - Active Term
  - Visual separator
- Only shows when both session and term are loaded

#### Updated All Data Fetching Functions:
1. **`fetchActiveSessionAndTerm()`** - NEW
   - Calls `/available-filters` endpoint
   - Gets active session and term from database
   - Stores in state

2. **`fetchUploads()`** - UPDATED
   - Now passes `session` and `term` query parameters
   - Only filters when NOT viewing historical data
   - Example URL: `/uploads?session=2024/2025&term=Second Term`

3. **`fetchStatistics()`** - UPDATED
   - Now passes `session` and `term` query parameters
   - Statistics (Total Uploads, Pending Approval, Recent Uploads) now filtered by current term

4. **`fetchRecentUploads()`** - UPDATED
   - Now passes `session` and `term` query parameters
   - Recent uploads list only shows current term's uploads

5. **`fetchComplianceData()`** - UPDATED
   - Now passes `session` and `term` query parameters
   - Compliance tracker only shows current term's data

#### Updated useEffect Hooks:
- Fetches active session/term on component mount
- Refetches all data when session/term changes
- Automatic refresh when admin switches terms

---

### 2. **Backend** (`/supabase/functions/server/index.tsx`)

Updated three endpoints to support session/term filtering:

#### `/uploads/statistics` (Line ~12910)
**Before:**
```typescript
let query = supabase
  .from("uploads")
  .select("id, created_at, teacher_id");
```

**After:**
```typescript
const session = c.req.query("session");
const term = c.req.query("term");

let query = supabase
  .from("uploads")
  .select("id, created_at, teacher_id");

// Filter by session and term if provided
if (session) {
  query = query.eq("session", session);
}
if (term) {
  query = query.eq("term", term);
}
```

#### `/uploads/recent` (Line ~13023)
**Before:**
```typescript
let query = supabase
  .from("uploads")
  .select("id, title, file_name, type, created_at, teacher_id, subject_id")
  .order("created_at", { ascending: false })
  .limit(10);
```

**After:**
```typescript
const session = c.req.query("session");
const term = c.req.query("term");

let query = supabase
  .from("uploads")
  .select("id, title, file_name, type, created_at, teacher_id, subject_id")
  .order("created_at", { ascending: false })
  .limit(10);

// Filter by session and term if provided
if (session) {
  query = query.eq("session", session);
}
if (term) {
  query = query.eq("term", term);
}
```

#### `/uploads/compliance` (Line ~12327)
**Before:**
```typescript
const { data: uploads, error: uploadsError } =
  await supabase
    .from("uploads")
    .select("id, title, teacher_id, subject_id, type, week, term, session, created_at, uploaded_by_admin, admin_id");
```

**After:**
```typescript
const session = c.req.query("session");
const term = c.req.query("term");

let uploadsQuery = supabase
  .from("uploads")
  .select("id, title, teacher_id, subject_id, type, week, term, session, created_at, uploaded_by_admin, admin_id");

// Filter by session and term if provided
if (session) {
  uploadsQuery = uploadsQuery.eq("session", session);
}
if (term) {
  uploadsQuery = uploadsQuery.eq("term", term);
}

const { data: uploads, error: uploadsError } = await uploadsQuery;
```

---

## How It Works Now

### On Page Load:
1. Component mounts
2. Calls `/available-filters` to get active session/term
3. Once session/term is loaded, automatically fetches:
   - Statistics (filtered by session/term)
   - Recent uploads (filtered by session/term)
   - All uploads (filtered by session/term)
   - Compliance data (filtered by session/term - admin only)

### Visual Indicator:
```
┌─────────────────────────────────────────────────────────────────┐
│ ● Active Session: 2024/2025  |  Term: Second Term               │
└─────────────────────────────────────────────────────────────────┘
```

### When Admin Switches to New Term:
1. Admin goes to Settings → Session Settings
2. Activates "Third Term"
3. Returns to Uploads page
4. Page automatically detects new active term
5. Refreshes all data to show only Third Term uploads
6. Statistics update to reflect Third Term only
7. Session indicator updates to show "Third Term"

---

## What Gets Filtered

### ✅ All These Sections Now Filter by Active Session/Term:

1. **Statistics Cards:**
   - Total Uploads - shows count for current term only
   - Pending Approval - for current term
   - Recent Uploads - recent uploads from current term
   - Storage Used - based on current term's uploads

2. **Recent Uploads List:**
   - Only shows uploads from current active term
   - Sorted by most recent first

3. **Compliance Tracker (Admin Only):**
   - Teacher compliance calculated for current term only
   - Upload statistics per teacher for current term

4. **Browse Files:**
   - File explorer shows files from current term
   - Organized by subject/class for current term

---

## Database Schema (Already Exists)

The `uploads` table already has these columns:
```sql
CREATE TABLE uploads (
  id UUID PRIMARY KEY,
  title VARCHAR(255),
  file_name VARCHAR(255),
  file_url TEXT,
  type VARCHAR(50),
  subject_id UUID,
  class_id UUID,
  teacher_id UUID,
  session VARCHAR(50),  -- ✅ Already exists
  term VARCHAR(50),      -- ✅ Already exists
  week INTEGER,
  created_at TIMESTAMP,
  ...
);
```

---

## Console Logs for Debugging

All fetch functions now log their parameters:

```
[UploadModule] Active session/term response: { success: true, activeSession: '2024/2025', activeTerm: 'Second Term' }
[UploadModule] Fetching uploads: { url: '/uploads?session=2024/2025&term=Second Term', activeSession: '2024/2025', activeTerm: 'Second Term' }
[Statistics] Filters: { session: '2024/2025', term: 'Second Term' }
[Recent Uploads] Filters: { session: '2024/2025', term: 'Second Term' }
[Compliance] Filters: { session: '2024/2025', term: 'Second Term' }
```

---

## Testing Checklist

### ✅ To Verify It's Working:

1. **Open Browser Console**
   - Go to Admin Dashboard → Uploads
   - Check for: `[UploadModule] Active session/term response:`
   - Verify it shows your current active session/term

2. **Check Session/Term Badge**
   - You should see a blue gradient badge at the top
   - It should show: "Active Session: 2024/2025 | Term: Second Term"
   - The dot should be animated (pulsing)

3. **Check Statistics**
   - Total Uploads should show count ONLY for current term
   - Not the total across all terms
   - If you see "4" and you're in Second Term, verify you have 4 uploads in Second Term

4. **Switch Terms**
   - Go to Settings → Session Settings
   - Activate a different term
   - Return to Uploads page
   - Badge should update to show new term
   - Statistics should update to show new term's data

5. **Check Console Logs**
   - Look for lines with `session=` and `term=`
   - Verify they match your active session/term
   - Example: `/uploads?session=2024/2025&term=Second Term`

---

## What If I See Wrong Data?

### Issue: Statistics show data from all terms

**Solution:** Check console logs:
```
[Statistics] Filters: { session: '2024/2025', term: 'Second Term' }
[Statistics] Result: { totalUploads: 4, recentUploads: 2, session: '2024/2025', term: 'Second Term' }
```

If filters show `null` or `undefined`:
1. Check if you have an active session/term set
2. Go to Settings → Session Settings
3. Make sure one session has "is_active = true"
4. Make sure one term has "is_active = true"

### Issue: No session/term badge showing

**Cause:** Active session/term not loaded yet or doesn't exist

**Solution:**
1. Check console for errors
2. Verify database has active session/term
3. Run this SQL:
```sql
SELECT * FROM academic_sessions WHERE is_active = true;
SELECT * FROM academic_terms WHERE is_active = true;
```

---

## Future Enhancement (Optional)

### Add Historical Data Toggle:

Similar to Gate Monitoring, you can add a toggle to view all historical data:

```tsx
<div className="flex items-center gap-2">
  <Switch 
    checked={showHistoricalData}
    onCheckedChange={setShowHistoricalData}
  />
  <span className="text-sm">View All Historical Data</span>
</div>
```

When enabled:
- Don't pass session/term parameters
- Badge shows "Viewing All Data"
- Statistics show totals across all terms

---

## Summary

✅ **Session/Term Indicator Badge** - Shows active session and term at the top  
✅ **Statistics Filtering** - Total Uploads, Pending Approval, Recent Uploads filtered by current term  
✅ **Recent Uploads Filtering** - Only shows current term's uploads  
✅ **Compliance Filtering** - Teacher compliance calculated for current term only  
✅ **Backend Support** - All three endpoints support session/term query parameters  
✅ **Automatic Refresh** - Data updates when admin switches terms  
✅ **Console Logging** - Easy debugging with detailed logs  

**Everything now filters by the active session and term!** 🎉

When you switch to a new term in Session Settings, all the data on the Uploads page will automatically update to show only that term's data.
