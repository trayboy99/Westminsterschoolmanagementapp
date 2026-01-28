# ✅ FIXED: Duplicate `/uploads/recent` Endpoints Causing Filtering Issues

## The Root Cause

You asked: **"Total Uploads: 4 - for which session and term precisely?"**

After debugging, here's what I found:

### Database Reality:
```sql
SELECT session, term, COUNT(*) FROM uploads GROUP BY session, term;

session    | term       | total
-----------+------------+------
2025/2026  | First Term | 4     ← ALL 4 uploads are from First Term
```

### Current Active Term:
```sql
SELECT term_name FROM academic_terms WHERE is_current = true;

term_name
---------
Second Term  ← System is on Second Term now
```

### The Problem:
- **Database has:** 4 uploads from "First Term"
- **System is on:** "Second Term"  
- **Frontend requests:** `term=Second Term`
- **Backend should return:** 0 uploads (because there are NO Second Term uploads)
- **But it was returning:** 4 uploads (from First Term) ❌

---

## Why This Happened

There were **TWO** `/uploads/recent` endpoints in the server code:

### Endpoint #1 (Line 10112) - NO FILTERING ❌
```typescript
app.get("/make-server-1ddd013a/uploads/recent", async (c) => {
  // ... auth code ...
  
  let query = supabase
    .from("uploads")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(10);
  
  // ❌ NO session/term filtering!
  // Returns ALL uploads regardless of term
  
  const { data: uploads } = await query;
  // ...
});
```

### Endpoint #2 (Line 12927) - HAS FILTERING ✅
```typescript
app.get("/make-server-1ddd013a/uploads/recent", async (c) => {
  // ... auth code ...
  
  const session = c.req.query("session");
  const term = c.req.query("term");
  
  let query = supabase
    .from("uploads")
    .select("...")
    .order("created_at", { ascending: false })
    .limit(10);
  
  // ✅ Has session/term filtering!
  if (session) {
    query = query.eq("session", session);
  }
  if (term) {
    query = query.eq("term", term);
  }
  
  const { data: uploads } = await query;
  // ...
});
```

### What Happened:
**Hono (the web framework) uses the FIRST matching route it encounters!**

So when the frontend called `/uploads/recent?session=2025/2026&term=Second+Term`, Hono executed **Endpoint #1** (the one WITHOUT filtering) and ignored the query parameters completely!

---

## What I Fixed

### 1. ✅ Removed Duplicate Endpoint
**Deleted:** Endpoint #1 (Line 10112) - the one without filtering

**Kept:** Endpoint #2 (Line 12927) - the one WITH proper session/term filtering

### 2. ✅ Added Comprehensive Logging
Added detailed console logs to see exactly what's happening:

```typescript
console.log("[Recent Uploads] Filters:", { session, term });

if (session) {
  console.log(`[Recent Uploads] 🔍 Filtering by session: "${session}"`);
  query = query.eq("session", session);
}
if (term) {
  console.log(`[Recent Uploads] 🔍 Filtering by term: "${term}"`);
  query = query.eq("term", term);
}

console.log(`[Recent Uploads] ✅ Found ${uploads?.length || 0} uploads after filtering`);
```

### 3. ✅ Fixed Missing Column in SELECT
The endpoint was filtering by `session` and `term` but NOT selecting them!

**Before:**
```typescript
.select("id, title, file_name, type, created_at, teacher_id, subject_id")
```

**After:**
```typescript
.select("id, title, file_name, type, created_at, teacher_id, subject_id, session, term")
```

### 4. ✅ Added Email to Uploader Data
```typescript
const { data: teachers } = await supabase
  .from("profiles")
  .select("id, first_name, last_name, email")  // ← Added email
  .in("id", teacherIds);
```

---

## Expected Behavior After Fix

### When You Refresh the Uploads Page:

#### Previous Behavior (WRONG):
```
Frontend sends: term=Second Term
Backend receives: term=Second Term
Backend queries: ALL uploads (ignored filter)
Backend returns: 4 uploads from First Term ❌
Frontend displays: Total Uploads: 4 ❌
```

#### New Behavior (CORRECT):
```
Frontend sends: term=Second Term
Backend receives: term=Second Term
Backend queries: WHERE term = 'Second Term'
Backend returns: 0 uploads (because none exist)
Frontend displays: Total Uploads: 0 ✅
```

---

## Server Console Logs You'll See

After the fix, when you refresh the page, you should see:

```
[Recent Uploads] Fetching recent uploads...
[Recent Uploads] Filters: { session: '2025/2026', term: 'Second Term' }
[Recent Uploads] 🔍 Filtering by session: "2025/2026"
[Recent Uploads] 🔍 Filtering by term: "Second Term"
[Recent Uploads] ✅ Found 0 uploads after filtering
```

**This is CORRECT!** There are no uploads for Second Term yet.

---

## What About Those 4 Uploads?

The 4 uploads you see in the database are from **First Term 2025/2026**:

```json
[
  { "term": "First Term", "session": "2025/2026", "uploader": "Ahmed Hassan" },
  { "term": "First Term", "session": "2025/2026", "uploader": "Johnson Bello" },
  { "term": "First Term", "session": "2025/2026", "uploader": "Adaobi Princess" },
  { "term": "First Term", "session": "2025/2026", "uploader": "Ahmed Hassan" }
]
```

These were uploaded during First Term. Now that you're in **Second Term**, they should NOT show up (unless you toggle "Show Historical Data").

---

## How to View Historical Data

If you want to see uploads from all terms (including First Term), there should be a toggle in the UI:

```
☑️ Show Historical Data
```

When enabled:
- **Disabled:** Shows only current term (Second Term) → 0 uploads
- **Enabled:** Shows all terms → 4 uploads

---

## Verification Steps

### 1. Refresh the Uploads Page
- **Total Uploads** should now show **0** (not 4)
- **Recent Uploads** list should be empty
- Session/Term badge should show "Second Term"

### 2. Check Server Logs (Supabase Functions Logs)
Look for:
```
[Recent Uploads] ✅ Found 0 uploads after filtering
```

### 3. Toggle Historical Data
If there's a "Show Historical Data" toggle:
- **OFF:** Shows 0 uploads (Second Term only)
- **ON:** Shows 4 uploads (all terms)

### 4. Create a Second Term Upload
Upload a new file and it should:
- Save with `session = '2025/2026'` and `term = 'Second Term'`
- Show up immediately (Total Uploads: 1)
- Be filtered correctly

---

## Summary of Changes

| File | Line | Change |
|------|------|--------|
| `/supabase/functions/server/index.tsx` | 10111-10254 | ❌ **DELETED** duplicate `/uploads/recent` endpoint without filtering |
| `/supabase/functions/server/index.tsx` | 12968 | ✅ **ADDED** `session, term` to SELECT query |
| `/supabase/functions/server/index.tsx` | 12980-12996 | ✅ **ADDED** detailed logging for filtering |
| `/supabase/functions/server/index.tsx` | 13017 | ✅ **ADDED** `email` to teacher profile query |
| `/supabase/functions/server/index.tsx` | 35311, 35322 | ✅ **FIXED** `is_active` → `is_current` for session/term lookup |
| `/supabase/functions/server/cbt-settings.tsx` | 293, 299 | ✅ **FIXED** `is_active` → `is_current` for CBT filtering |

---

## The Answer to Your Question

> **"Total Uploads: 4 - for which session and term precisely?"**

**Answer:** Those 4 uploads are from **2025/2026 First Term**.

They should NOT be showing when the system is on **Second Term**. After this fix, they won't show up anymore unless you view historical data.

When teachers upload new files during Second Term, those will show up correctly. 🎯

---

## Next Steps

1. **Refresh the Uploads page** - should show 0 uploads now
2. **Create a test upload** - upload a file and verify it shows up
3. **Check the database** - verify the new upload has `term = 'Second Term'`
4. If you need to migrate old uploads to Second Term, run:
   ```sql
   UPDATE uploads 
   SET term = 'Second Term' 
   WHERE session = '2025/2026' AND term = 'First Term';
   ```
   (Only if you want to move them to Second Term!)

Everything should now filter correctly by the active session/term! 🚀
