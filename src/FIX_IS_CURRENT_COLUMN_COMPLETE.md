# ✅ Fixed: Session/Term Detection Using Correct Column

## Issue Identified

The Uploads page was showing "**Term: First Term**" when the database actually had "**Second Term**" as the current term.

**Root Cause:** The `/available-filters` endpoint was querying using `is_active` instead of `is_current`.

---

## Database Schema

Based on your screenshot and the codebase, the tables use:

### `academic_sessions` table:
- Column: `is_current` (BOOLEAN) ← **Correct column name**
- NOT: `is_active` ❌

### `academic_terms` table:
- Column: `is_current` (BOOLEAN) ← **Correct column name**  
- NOT: `is_active` ❌

**The UI shows:** "Current Term" with "Active" badge, confirming the column is `is_current`.

---

## What Was Fixed

### 1. **`/supabase/functions/server/index.tsx`** - Line ~35307-35322

**BEFORE (WRONG):**
```typescript
// Get active session from academic_sessions
const { data: activeSessionData, error: activeSessionError } = await supabase
  .from('academic_sessions')
  .select('session_name')
  .eq('is_active', true)  // ❌ WRONG COLUMN
  .single();

// Get active term from academic_terms
const { data: activeTermData, error: activeTermError } = await supabase
  .from('academic_terms')
  .select('term_name')
  .eq('is_active', true)  // ❌ WRONG COLUMN
  .single();
```

**AFTER (CORRECT):**
```typescript
// Get active session from academic_sessions
const { data: activeSessionData, error: activeSessionError } = await supabase
  .from('academic_sessions')
  .select('session_name')
  .eq('is_current', true)  // ✅ CORRECT COLUMN
  .single();

// Get active term from academic_terms
const { data: activeTermData, error: activeTermError } = await supabase
  .from('academic_terms')
  .select('term_name')
  .eq('is_current', true)  // ✅ CORRECT COLUMN
  .single();
```

### 2. **`/supabase/functions/server/cbt-settings.tsx`** - Line ~290-299

**BEFORE (WRONG):**
```typescript
const { data: activeSessionData } = await supabase
  .from('academic_sessions')
  .select('session_name')
  .eq('is_active', true)  // ❌ WRONG COLUMN
  .single();

const { data: activeTermData } = await supabase
  .from('academic_terms')
  .select('term_name')
  .eq('is_active', true)  // ❌ WRONG COLUMN
  .single();
```

**AFTER (CORRECT):**
```typescript
const { data: activeSessionData } = await supabase
  .from('academic_sessions')
  .select('session_name')
  .eq('is_current', true)  // ✅ CORRECT COLUMN
  .single();

const { data: activeTermData } = await supabase
  .from('academic_terms')
  .select('term_name')
  .eq('is_current', true)  // ✅ CORRECT COLUMN
  .single();
```

---

## Verification

### The Rest of the Codebase Already Uses `is_current` Correctly ✅

I checked all 25 occurrences of `is_current` in the server code - they're all correct:

- ✅ Session Settings endpoints (line 21817, 21832, 21994, 22169, etc.)
- ✅ Student dashboard endpoints (line 18655, 18661)
- ✅ Gate monitoring (line 34845, 34851)
- ✅ Subject offering endpoints (line 22922, 33306)
- ✅ Academic calendar endpoints (line 2127)

**Only the 2 endpoints I just fixed were wrong.**

---

## Expected Behavior Now

### When You Refresh the Uploads Page:

**BEFORE:**
```
Active Session: 2025/2026  |  Term: First Term  ❌ WRONG
```

**AFTER:**
```
Active Session: 2025/2026  |  Term: Second Term  ✅ CORRECT
```

### What Will Update:
1. **Session/Term Badge** - Shows "Second Term"
2. **Statistics** - Filtered to Second Term data
3. **Recent Uploads** - Shows Second Term uploads only
4. **Compliance Tracker** - Shows Second Term compliance

---

## Testing Checklist

### ✅ Verify the Fix Works:

1. **Open Uploads Page**
   - Go to Admin Dashboard → Uploads
   - Check the blue badge at the top
   - Should now show: "Active Session: 2025/2026 | Term: **Second Term**"

2. **Check Browser Console**
   - Look for: `[Available Filters] Active session from DB:`
   - Should show: `{ session_name: '2025/2026' }`
   - Look for: `[Available Filters] Active term from DB:`
   - Should show: `{ term_name: 'Second Term' }`

3. **Check CBT Exams**
   - Go to CBT Management → Enable/Schedule Exams
   - Check console for: `[CBT Sessions] Active session: 2025/2026 Active term: Second Term`
   - Should show Second Term, not First Term

4. **Verify Database**
   Run this SQL to confirm what's marked as current:
   ```sql
   SELECT session_name, is_current FROM academic_sessions;
   SELECT term_name, is_current FROM academic_terms;
   ```
   
   Should show:
   ```
   session_name | is_current
   2025/2026    | true       ← This one should have is_current = true
   
   term_name    | is_current
   Second Term  | true       ← This one should have is_current = true
   First Term   | false
   Third Term   | false
   ```

---

## Why This Happened

The original code was likely written before the database schema was finalized. The developer probably assumed the column would be called `is_active` (which is a common naming convention), but the actual implementation used `is_current`.

Most of the codebase was updated to use `is_current`, but these two specific endpoints were missed during the update.

---

## Impact

### Affected Features (Now Fixed):

1. **Uploads Module:**
   - Session/Term indicator badge
   - Statistics cards (Total Uploads, Pending, Recent)
   - Recent uploads list
   - Compliance tracker

2. **CBT Exams Management:**
   - Available exams list
   - Exam scheduling

3. **Any component using `/available-filters` endpoint**

### Not Affected (Already Working):

- ✅ Gate Monitoring (was using `is_current` correctly in its own endpoint)
- ✅ Session Settings page
- ✅ Student Dashboard
- ✅ Results publication
- ✅ All other academic calendar features

---

## Console Logs to Verify

After the fix, you should see these logs:

```
[Available Filters] Active session from DB: { session_name: '2025/2026' }
[Available Filters] Active term from DB: { term_name: 'Second Term' }
[Available Filters] Sending response: {
  success: true,
  activeSession: '2025/2026',
  activeTerm: 'Second Term',
  allSessions: ['2025/2026', '2024/2025'],
  allTerms: ['First Term', 'Second Term', 'Third Term']
}
```

```
[UploadModule] Active session/term response: {
  success: true,
  activeSession: '2025/2026',
  activeTerm: 'Second Term'
}
```

```
[CBT Sessions] Active session: 2025/2026 Active term: Second Term
```

---

## Summary

✅ **Fixed** `/available-filters` endpoint - Changed `is_active` → `is_current`  
✅ **Fixed** `/cbt/sessions/available` endpoint - Changed `is_active` → `is_current`  
✅ **Verified** All other 23 uses of `is_current` are correct  

The Uploads page will now correctly show "**Term: Second Term**" and filter all data accordingly.

**Please refresh the Uploads page and verify the badge now shows the correct term!** 🎉
