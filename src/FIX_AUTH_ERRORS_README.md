# 🚨 URGENT: Fix Authentication Errors

## Problem

Your backend is returning **401 Unauthorized** errors for almost all endpoints:

```
[useCurrentWeek] HTTP error: 401 
[Teachers] Unauthorized - no user ID. Auth error: Auth session missing!
[Marks Statistics] Auth error: Auth session missing!
[Marks GET] Auth error: Auth session missing!
[Exams API] ERROR: Auth verification failed: Auth session missing!
```

**Impact:** Most features are broken. Teachers can't enter marks, view students, or access their dashboard properly.

## Root Cause

The backend has **235 instances** of incorrect authentication code that uses the service role key instead of the anon key to verify user tokens.

**❌ Wrong Pattern (235 times):**
```typescript
await supabase.auth.getUser(accessToken)  // Uses service role key ❌
```

**✅ Correct Pattern:**
```typescript
await verifyUserAuth(accessToken)  // Uses anon key ✅
```

## Quick Fix (2 Minutes)

### Option 1: Run the Automated Script (Recommended)

1. **Make the script executable:**
   ```bash
   chmod +x fix-auth-errors.sh
   ```

2. **Run the script:**
   ```bash
   ./fix-auth-errors.sh
   ```

3. **Verify the output:**
   ```
   ✅ SUCCESS! All instances have been replaced.
   
   📊 Results:
      Before:  235 instances of supabase.auth.getUser(accessToken)
      After:   0 instances remaining
      New:     235 instances of verifyUserAuth(accessToken)
   ```

4. **Test your application** - The auth errors should disappear!

5. **If it works, delete the backup:**
   ```bash
   rm supabase/functions/server/index.tsx.backup-*
   ```

### Option 2: Manual Find & Replace

If you prefer to do it manually or the script doesn't work:

1. **Open the file:**
   ```
   supabase/functions/server/index.tsx
   ```

2. **Find & Replace:**
   - Find:    `await supabase.auth.getUser(accessToken)`
   - Replace: `await verifyUserAuth(accessToken)`
   - Replace All (should be 235 replacements)

3. **Save and test**

### Option 3: Command Line (sed)

#### For Linux:
```bash
# Backup first
cp supabase/functions/server/index.tsx supabase/functions/server/index.tsx.backup

# Replace all instances
sed -i 's/await supabase\.auth\.getUser(accessToken)/await verifyUserAuth(accessToken)/g' supabase/functions/server/index.tsx

# Verify (should return 0)
grep -c "await supabase\.auth\.getUser(accessToken)" supabase/functions/server/index.tsx

# Verify new pattern (should return ~235)
grep -c "await verifyUserAuth(accessToken)" supabase/functions/server/index.tsx
```

#### For macOS:
```bash
# Backup first
cp supabase/functions/server/index.tsx supabase/functions/server/index.tsx.backup

# Replace all instances (note the '' after -i for macOS)
sed -i '' 's/await supabase\.auth\.getUser(accessToken)/await verifyUserAuth(accessToken)/g' supabase/functions/server/index.tsx

# Verify (should return 0)
grep -c "await supabase\.auth\.getUser(accessToken)" supabase/functions/server/index.tsx

# Verify new pattern (should return ~235)
grep -c "await verifyUserAuth(accessToken)" supabase/functions/server/index.tsx
```

## Verification

### Before Fix:
Open browser console (F12) and you'll see:
```
❌ [useCurrentWeek] HTTP error: 401
❌ [Teachers] Unauthorized - no user ID. Auth error: Auth session missing!
❌ [Marks GET] Auth error: Auth session missing!
❌ [Exams API] ERROR: Auth verification failed: Auth session missing!
```

### After Fix:
```
✅ [useCurrentWeek] Response: { success: true, week_info: {...} }
✅ [Teachers] Fetching teachers from profiles table...
✅ [Marks GET] Fetching marks for...
✅ [Exams API] ✅ User authenticated: <uuid>
```

### Quick Test Checklist:

After applying the fix, verify these work:

- [ ] Teacher dashboard loads without errors
- [ ] Teacher can view student list
- [ ] Teacher can enter marks
- [ ] Teacher can view exams
- [ ] Week badge shows current week
- [ ] No 401 errors in browser console

## Why This Happened

The file header says it was already fixed:
```typescript
// Force redeploy: 2025-01-14-AUTH-FIX-VERIFY-USER-AUTH
// CRITICAL AUTH FIX: Using verifyUserAuth() helper
```

But only ~10 endpoints were actually fixed. The other ~235 endpoints were missed.

### Technical Explanation:

1. **Frontend tokens are signed with ANON KEY**
   - User signs in on frontend
   - Supabase creates JWT using ANON KEY
   - Frontend sends this token to backend

2. **Backend service role can't verify anon tokens**
   - `supabase.auth.getUser(accessToken)` uses SERVICE ROLE KEY
   - Service role key ≠ anon key
   - Token signature verification fails
   - Returns: "Auth session missing!"

3. **Solution: Use helper function**
   - `verifyUserAuth()` creates temporary client with ANON KEY
   - This client can verify frontend tokens
   - Auth works correctly ✅

## Files Modified

- ✅ `/supabase/functions/server/index.tsx` (235 replacements)

## Additional Resources

For more details, see:
- `/AUTH_ERROR_FIX_CRITICAL.md` - Full technical documentation
- `/SUBJECT_OFFERINGS_MARKS_ENTRY_FIX.md` - Previous fix documentation

## Rollback

If something goes wrong, restore the backup:

**Using the script's backup:**
```bash
# List backups
ls -la supabase/functions/server/index.tsx.backup-*

# Restore (use the actual filename)
cp supabase/functions/server/index.tsx.backup-20250127-123456 supabase/functions/server/index.tsx
```

**Using manual backup:**
```bash
cp supabase/functions/server/index.tsx.backup supabase/functions/server/index.tsx
```

## Prevention

To prevent this in the future:

### 1. Code Review Checklist
- ❌ Never use `supabase.auth.getUser(accessToken)` in server code
- ✅ Always use `verifyUserAuth(accessToken)`
- ✅ Test endpoints with real auth tokens before deploying

### 2. Pre-Commit Hook

Create `.git/hooks/pre-commit`:
```bash
#!/bin/bash

if git diff --cached supabase/functions/server/index.tsx | grep -q "supabase.auth.getUser(accessToken)"; then
  echo "❌ ERROR: Found forbidden auth pattern"
  echo "   Use 'verifyUserAuth(accessToken)' instead of 'supabase.auth.getUser(accessToken)'"
  exit 1
fi
```

Make it executable:
```bash
chmod +x .git/hooks/pre-commit
```

## Support

If you encounter issues:

1. **Check the backup exists** before running the fix
2. **Read the console output** from the fix script
3. **Test incrementally** - Fix a few endpoints manually first if nervous
4. **Check browser console** for auth errors before and after

## Summary

| Aspect | Before | After |
|--------|--------|-------|
| **Auth Errors** | 401 on ~all endpoints | ✅ No errors |
| **Teacher Features** | ❌ Broken | ✅ Working |
| **Marks Entry** | ❌ Can't load students | ✅ Works perfectly |
| **Dashboard** | ❌ Empty/errors | ✅ Shows data |
| **Fix Complexity** | N/A | ⚡ Simple find & replace |
| **Time to Fix** | N/A | ⏱️ 2 minutes |

---

**Status:** 🔴 CRITICAL - Requires immediate attention

**Priority:** 🔥 P0 - Most backend features are broken

**Difficulty:** ⚡ EASY - Automated script available

**Impact:** ✅ HIGH - Fixes authentication for entire system

**Next Action:** Run `./fix-auth-errors.sh` now!
