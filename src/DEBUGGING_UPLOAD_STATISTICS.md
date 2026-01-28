# 🔍 Debugging Upload Statistics - Session/Term Filtering

## The Question

**"Total Uploads: 4 - for which session and term precisely?"**

This is the right question to ask! Let's find out exactly what those 4 uploads are and verify the filtering is working correctly.

---

## What I Just Added

I've added comprehensive console logging to help diagnose this. Here's what you'll now see:

### Frontend Logs (Browser Console):
```javascript
[UploadModule] 📤 Fetching statistics with: {
  activeSession: "2025/2026",
  activeTerm: "Second Term",
  showHistoricalData: false,
  queryString: "session=2025/2026&term=Second Term",
  fullUrl: "https://...uploads/statistics?session=2025/2026&term=Second Term"
}
```

### Backend Logs (Server Console):
```javascript
[Statistics] Filters: { session: '2025/2026', term: 'Second Term' }

[Statistics] 📊 DATABASE CHECK:
[Statistics] Total uploads: 4
[Statistics] Sample data: [
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2024/2025', term: 'First Term' },
  { session: null, term: null }
]

[Statistics] 🔍 Filtering by session: "2025/2026"
[Statistics] 🔍 Filtering by term: "Second Term"

[Statistics] ✅ After filtering: 2 matches
[Statistics] Filtered data: [
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' }
]
```

---

## What To Check Now

### Step 1: Open Browser Console
1. Go to **Admin Dashboard → Uploads**
2. Open **Developer Tools** (F12)
3. Go to **Console** tab
4. Refresh the page

### Step 2: Look for These Logs

#### ✅ Check Frontend Request:
```
[UploadModule] 📤 Fetching statistics with: ...
```
**What to verify:**
- Is `activeSession` showing the correct session? (e.g., "2025/2026")
- Is `activeTerm` showing "Second Term"?
- Is `queryString` properly formatted?

#### ✅ Check Backend Response:
```
[Statistics] 📊 DATABASE CHECK:
[Statistics] Total uploads: X
[Statistics] Sample data: [...]
```
**What to verify:**
- How many total uploads are in the database?
- Do they have `session` and `term` values?
- Are some uploads missing session/term (showing `null`)?

#### ✅ Check Filtering:
```
[Statistics] ✅ After filtering: X matches
```
**What to verify:**
- Does the filtered count match what you see on screen?
- Is it filtering correctly based on session/term?

---

## Possible Scenarios

### Scenario 1: All 4 Uploads Belong to Second Term ✅ CORRECT
```
[Statistics] Total uploads: 4
[Statistics] Sample data: [
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' }
]
[Statistics] ✅ After filtering: 4 matches
```
**Result:** Total Uploads: 4 ← **CORRECT!** All 4 are from Second Term.

---

### Scenario 2: Uploads Have NULL Session/Term ❌ PROBLEM
```
[Statistics] Total uploads: 4
[Statistics] Sample data: [
  { session: null, term: null },
  { session: null, term: null },
  { session: null, term: null },
  { session: null, term: null }
]
[Statistics] ✅ After filtering: 0 matches
```
**Result:** Total Uploads: 0 (but showing 4 on frontend) ← **BUG!**

**Why:** Uploads were created before session/term columns were added, or the upload form isn't saving session/term.

**Fix:** Update existing uploads with session/term values:
```sql
UPDATE uploads 
SET session = '2025/2026', term = 'Second Term' 
WHERE session IS NULL OR term IS NULL;
```

---

### Scenario 3: Uploads Are From Different Terms ⚠️ EXPECTED
```
[Statistics] Total uploads: 10
[Statistics] Sample data: [
  { session: '2025/2026', term: 'Second Term' },  // ✅ Matches
  { session: '2025/2026', term: 'Second Term' },  // ✅ Matches
  { session: '2025/2026', term: 'First Term' },   // ❌ Different term
  { session: '2024/2025', term: 'Third Term' },   // ❌ Different session
  { session: '2024/2025', term: 'Second Term' }   // ❌ Different session
]
[Statistics] ✅ After filtering: 2 matches
```
**Result:** Total Uploads: 2 ← **CORRECT!** Only 2 belong to current term.

---

### Scenario 4: Filter Parameters Not Being Sent ❌ PROBLEM
```
[Statistics] Filters: { session: undefined, term: undefined }
[Statistics] Total uploads: 10
[Statistics] ✅ After filtering: 10 matches  ← No filtering happened!
```
**Result:** Total Uploads: 10 ← **WRONG!** Should only show current term.

**Why:** Frontend isn't sending session/term parameters correctly.

**Fix:** Check that `activeSession` and `activeTerm` are loaded before calling the API.

---

## How to Verify Database Directly

### Check What's in Your Uploads Table:
```sql
-- See all uploads with their session/term
SELECT 
  id, 
  title, 
  session, 
  term, 
  created_at 
FROM uploads 
ORDER BY created_at DESC;
```

### Count by Session/Term:
```sql
-- Group uploads by session and term
SELECT 
  session, 
  term, 
  COUNT(*) as total 
FROM uploads 
GROUP BY session, term 
ORDER BY session DESC, term;
```

**Expected Output:**
```
session    | term        | total
-----------|-------------|------
2025/2026  | Second Term | 4      ← These are the 4 you see!
2025/2026  | First Term  | 3
2024/2025  | Third Term  | 2
NULL       | NULL        | 1      ← This one has no session/term!
```

### Count Only Current Term:
```sql
-- How many uploads for current term?
SELECT COUNT(*) FROM uploads 
WHERE session = '2025/2026' AND term = 'Second Term';
```

**This should match the "Total Uploads: 4" you see on the frontend!**

---

## What If Session/Term Are NULL?

If your uploads have `NULL` for session/term, they were created before this filtering system was implemented. You have two options:

### Option 1: Update Existing Records
```sql
-- Set all NULL uploads to current session/term
UPDATE uploads 
SET 
  session = '2025/2026', 
  term = 'Second Term' 
WHERE session IS NULL OR term IS NULL;
```

### Option 2: Default to Showing All If NULL
Update the backend to only filter when values are explicitly set:
```typescript
// Only filter if both session AND term have values
if (session && term) {
  query = query.eq("session", session).eq("term", term);
}
```

---

## Expected Console Output

When everything is working correctly, you should see:

```
[UploadModule] Active session/term response: {
  success: true,
  activeSession: '2025/2026',
  activeTerm: 'Second Term'
}

[UploadModule] 📤 Fetching statistics with: {
  activeSession: '2025/2026',
  activeTerm: 'Second Term',
  showHistoricalData: false,
  queryString: 'session=2025/2026&term=Second Term'
}

[Statistics] Filters: { session: '2025/2026', term: 'Second Term' }
[Statistics] 📊 DATABASE CHECK:
[Statistics] Total uploads: 10
[Statistics] Sample data: [
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'First Term' }
]

[Statistics] 🔍 Filtering by session: "2025/2026"
[Statistics] 🔍 Filtering by term: "Second Term"

[Statistics] ✅ After filtering: 4 matches
[Statistics] Filtered data: [
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' },
  { session: '2025/2026', term: 'Second Term' }
]

[UploadModule] 📥 Statistics response: {
  success: true,
  statistics: {
    totalUploads: 4,      ← These are ONLY from Second Term 2025/2026
    pendingApproval: 0,
    recentUploads: 2,
    storageUsed: 0.01,
    storageLimit: 10
  }
}
```

---

## Action Items

1. **Refresh the Uploads page** and check the browser console
2. **Copy the console logs** and check:
   - Are session/term parameters being sent?
   - What does the database check show?
   - How many uploads match after filtering?
3. **Run the SQL queries** above to verify the database
4. **Report back** what you see in the logs

---

## The Answer

After you refresh and check the console logs, you'll be able to answer:

**"Total Uploads: 4"** refers to:
- ✅ 4 uploads from **2025/2026 Second Term** (correct filtering)
- ❌ 4 uploads with **NULL** session/term (need to update database)
- ❌ 4 uploads from **all terms** (filtering not working)

The logs will tell us exactly which scenario you're experiencing! 🔍
