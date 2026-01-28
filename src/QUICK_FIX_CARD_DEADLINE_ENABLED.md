# 🚨 QUICK FIX: Deadline Not Blocking Teachers

## Your Problem
✅ Green alert "No Deadline Set" + Button ENABLED
❌ You want: Red alert "Deadline Expired" + Button DISABLED

## Why It's Happening
```
Database: enabled = false ← THIS IS THE PROBLEM!
Backend: Searches for enabled = true
Result: No match found → "No deadline set"
```

## The Fix (Copy & Paste)
```sql
UPDATE upload_deadlines
SET enabled = true
WHERE term = 'First Term'
  AND session = '2025/2026'
  AND upload_type = 'exam_question';
```

## What `enabled` Means
| Value | Meaning | Effect |
|-------|---------|--------|
| `false` | Deadline OFF (disabled) | Button always ENABLED ✅ |
| `true` | Deadline ON (active) | Check expiry, may block ❌ |

## After Running Fix
1. First load: ❌ Red alert + Button DISABLED
2. System auto-sets: `enabled = false`
3. Next load: ✅ Green alert + Button ENABLED

## Test It
1. Run SQL above
2. Log in as teacher
3. Go to uploads → Select "Exam Questions"
4. Should see: RED alert + Button DISABLED ✅

---

**Quick Rule:** 
- Want to BLOCK? → `enabled = true`
- Want to ALLOW? → `enabled = false`
