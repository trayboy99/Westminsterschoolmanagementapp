# Upload Deadline System - Duplicate Endpoint Fix ✅

## Problem Identified

The upload deadline system had **TWO duplicate endpoints** defined in `/supabase/functions/server/index.tsx`:

1. **First endpoint (Line ~7795)** - ✅ CORRECT
   - Properly checks for deadlines with `upload_type = type` OR `upload_type = 'all'`
   - Returns correct `allowed`, `isExpired`, `deadline` information
   - Has comprehensive logging

2. **Second endpoint (Line ~9428)** - ❌ DUPLICATE (NOW REMOVED)
   - Used `.single()` which fails if no exact match found
   - Only checked `upload_type = type` (missed catch-all deadlines)
   - Was overriding the first endpoint (last definition wins in Hono)

## The Bug

When a deadline was set with `upload_type = 'all'` (or any mismatch), the second endpoint would:
1. Query for exact match: `upload_type = 'e-notes'`
2. Find no match (because deadline was set as `'all'`)
3. Return "No deadline configured" 
4. Show green notification for teachers
5. Keep upload button ENABLED ❌

This allowed teachers to upload even when deadlines had expired!

## What Was Fixed

### Server Side (`/supabase/functions/server/index.tsx`)

**Removed the duplicate endpoint at line 9428** and replaced with a comment:

```typescript
// NOTE: The /check-upload-deadline endpoint is defined earlier in this file (around line 7795)
// This duplicate has been removed to prevent conflicts and ensure correct behavior
```

### Correct Endpoint Behavior (Line 7795)

The remaining endpoint properly:

1. **Checks for matching deadlines:**
   ```typescript
   const matchingDeadline = deadlines.find(d => 
     d.term === term && 
     d.session === session && 
     (d.upload_type === type || d.upload_type === 'all')  // ✅ Catches all deadlines
   );
   ```

2. **For Teachers with expired deadlines:**
   ```typescript
   if (userRole === 'teacher' && isExpired) {
     return c.json({
       success: true,
       allowed: false,        // ❌ BLOCKS UPLOAD
       reason: `Upload deadline expired on ${deadlineDate.toLocaleString()}`,
       deadline: matchingDeadline.deadline,
       isExpired: true,
     });
   }
   ```

3. **For Admins (even with expired deadlines):**
   ```typescript
   // Admins can always upload (on behalf of teachers)
   return c.json({
     success: true,
     allowed: true,          // ✅ ALLOWS UPLOAD
     isExpired: isExpired,
     requiresTeacherSelection: isExpired
   });
   ```

## Frontend Behavior

### For Teachers

**When deadline is expired:**
- Red alert shown: "❌ Upload Deadline Expired"
- Upload button: **DISABLED** ❌
- Clear message: "Upload Blocked"

**When no deadline set:**
- Green alert shown: "✅ No Deadline Set - Upload Anytime"
- Upload button: **ENABLED** ✅

**When deadline active (not expired):**
- Blue alert shown: "📅 Upload Deadline Set"
- Upload button: **ENABLED** ✅
- Shows deadline date/time

### For Admins

**When deadline is expired:**
- Orange alert shown: "⚠️ Deadline Expired"
- Upload button: **ENABLED** ✅ (Admin Override)
- Requires teacher selection for on-behalf uploads

**When no deadline set:**
- Green alert shown: "✅ No Deadline Set"
- Upload button: **ENABLED** ✅

## Testing Steps

### 1. Test with Expired Deadline (Teacher)

1. Log in as **teacher**
2. Navigate to Upload page
3. Select term, session, and type that has an **expired deadline**
4. **Expected Result:**
   - ❌ Red alert: "Upload Deadline Expired"
   - ❌ Upload button: **DISABLED**
   - Message shows: "Upload Button: DISABLED ❌"

### 2. Test with Active Deadline (Teacher)

1. Log in as **teacher**
2. Navigate to Upload page
3. Select term, session, and type that has a **future deadline**
4. **Expected Result:**
   - 📅 Blue alert: "Upload Deadline Set"
   - ✅ Upload button: **ENABLED**
   - Shows deadline date/time

### 3. Test with No Deadline (Teacher)

1. Log in as **teacher**
2. Navigate to Upload page
3. Select term, session, and type with **no deadline configured**
4. **Expected Result:**
   - ✅ Green alert: "No Deadline Set - Upload Anytime"
   - ✅ Upload button: **ENABLED**

### 4. Test with Expired Deadline (Admin)

1. Log in as **admin**
2. Navigate to Upload page
3. Select term, session, and type that has an **expired deadline**
4. **Expected Result:**
   - ⚠️ Orange alert: "Deadline Expired - Admin Override"
   - ✅ Upload button: **ENABLED**
   - Teacher selection dropdown appears

### 5. Test Upload Type = 'all' (Catch-All Deadline)

1. Create a deadline with `upload_type = 'all'`
2. Set deadline to **past date**
3. Log in as **teacher**
4. Try to upload any type (e-notes, assignments, etc.)
5. **Expected Result:**
   - ❌ Upload blocked for ALL types
   - Red alert shows for each type

## Database Query Verification

Run this to check current deadlines:

```sql
SELECT 
  id,
  term,
  session,
  upload_type,
  deadline,
  enabled,
  CASE 
    WHEN deadline > NOW() THEN 'ACTIVE ✅'
    ELSE 'EXPIRED ❌'
  END as status
FROM upload_deadlines
WHERE enabled = true
ORDER BY deadline DESC;
```

## Console Logs to Watch

When testing, check browser console for:

```
=== DEADLINE CHECK START ===
[Deadline Check] Request: {"term":"First Term","session":"2025/2026","type":"e-notes","userRole":"teacher"}
[Deadline Check] Found X active deadlines
[MATCH FOUND] Deadline: {...}
[Deadline Check] Is Expired: true/false
[Deadline Check] ❌ TEACHER + EXPIRED → DISABLED  (if expired)
[Deadline Check] ✅ ALLOWED → Button ENABLED       (if allowed)
```

## What Changed

### Files Modified
- ✅ `/supabase/functions/server/index.tsx` - Removed duplicate endpoint

### Files NOT Changed
- ℹ️ `/components/uploads/UploadForm.tsx` - Already correct
- ℹ️ Frontend logic was working correctly, just receiving wrong data from backend

## Key Points

1. **Only ONE endpoint** now handles deadline checks (line ~7795)
2. **Catch-all deadlines** (`upload_type = 'all'`) now work correctly
3. **Teachers blocked** when deadline expires ❌
4. **Admins allowed** even when deadline expires ✅
5. **Clear visual feedback** for all scenarios

## Quick Reference

| User Role | Deadline Status | Upload Button | Alert Color |
|-----------|----------------|---------------|-------------|
| Teacher   | Expired        | DISABLED ❌   | Red         |
| Teacher   | Active         | ENABLED ✅    | Blue        |
| Teacher   | None           | ENABLED ✅    | Green       |
| Admin     | Expired        | ENABLED ✅    | Orange      |
| Admin     | Active         | ENABLED ✅    | Blue        |
| Admin     | None           | ENABLED ✅    | Green       |

---

**Status:** ✅ FIXED - Duplicate endpoint removed, system now working correctly
**Date:** November 5, 2025
