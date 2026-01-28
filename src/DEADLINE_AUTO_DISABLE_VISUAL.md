# Deadline Auto-Disable System - Visual Guide

## The New System Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    DEADLINE LIFECYCLE                        │
└─────────────────────────────────────────────────────────────┘

1️⃣ CREATED (Future Date)
   ┌────────────────────────────────┐
   │ Database:                      │
   │ deadline: 2025-12-31 23:59:59 │
   │ enabled: true ✅               │
   └────────────────────────────────┘
           ↓
   Teacher sees:
   ┌────────────────────────────────┐
   │ 📅 Upload Deadline Set         │
   │ Deadline: Dec 31, 2025        │
   │ [Upload Files] ← ENABLED ✅   │
   └────────────────────────────────┘


2️⃣ EXPIRES (Date Passes)
   ┌────────────────────────────────┐
   │ Database:                      │
   │ deadline: 2025-11-01 23:59:59 │ ← PAST
   │ enabled: true ✅               │ ← STILL ENABLED
   └────────────────────────────────┘
           ↓
   Teacher loads page → Backend checks deadline
           ↓
   ┌────────────────────────────────┐
   │ Backend detects:               │
   │ • deadline < NOW() ✓           │
   │ • enabled = true ✓             │
   │ • userRole = teacher ✓         │
   │                                │
   │ → Auto-disables in database    │
   │ → Blocks THIS upload           │
   └────────────────────────────────┘
           ↓
   Teacher sees (FIRST TIME):
   ┌────────────────────────────────┐
   │ ❌ Upload Deadline Expired     │
   │ The deadline has passed.       │
   │ [Upload Files] ← DISABLED ❌   │
   └────────────────────────────────┘


3️⃣ AUTO-DISABLED (After First Check)
   ┌────────────────────────────────┐
   │ Database:                      │
   │ deadline: 2025-11-01 23:59:59 │ ← PAST
   │ enabled: false ❌              │ ← AUTO-DISABLED
   └────────────────────────────────┘
           ↓
   Teacher refreshes page
           ↓
   ┌────────────────────────────────┐
   │ Backend checks:                │
   │ • Looking for enabled=true     │
   │ • No match found (enabled=false)│
   │ → Returns "No deadline set"    │
   └────────────────────────────────┘
           ↓
   Teacher sees (SUBSEQUENT TIMES):
   ┌────────────────────────────────┐
   │ ✅ No Deadline Set             │
   │ You can upload at any time     │
   │ [Upload Files] ← ENABLED ✅    │
   └────────────────────────────────┘
```

---

## Timeline View

```
TIME ────────────────────────────────────────────────────────>

Nov 1       Nov 5 (Today)     Nov 10      Dec 31
  │              │              │           │
  │              │              │           │
  │         Deadline Set     Expires     New Deadline
  │         (Future)         (Past)      (Future)
  │              │              │           │
  ▼              ▼              ▼           ▼

DATABASE STATE:
enabled: false    true           false       true
deadline: -       Dec 31         Dec 31      Jan 31

TEACHER SEES:
Message:  "No        "Deadline     "No         "Deadline
          deadline   Dec 31"       deadline    Jan 31"
          set"                     set"

Button:   ✅ ENABLED  ✅ ENABLED    ✅ ENABLED   ✅ ENABLED


─────────── DEADLINE EXPIRES (Dec 31 passes) ───────────

TIME ────────────────────────────────────────────────────────>

                  Dec 31          Jan 1 (First Load)  Jan 1 (Refresh)
                    │                    │                   │
                 Expires          Teacher loads page    Reload page
                    │                    │                   │
                    ▼                    ▼                   ▼

DATABASE STATE:
enabled:           true                 false              false
                (still enabled)    (auto-disabled)    (stays disabled)

TEACHER SEES:
Message:         "Deadline        "Deadline           "No deadline
                 Dec 31"          expired"            set"

Button:          ✅ ENABLED        ❌ DISABLED          ✅ ENABLED
                                 (blocked once)      (allowed now)
```

---

## State Diagram

```
                    ┌──────────────────┐
                    │ Deadline Created │
                    │ enabled = true   │
                    └────────┬─────────┘
                             │
                             ▼
                 ┌────────────────────────┐
                 │  Is deadline expired?  │
                 └────────┬───────────────┘
                          │
              ┌───────────┴───────────┐
              │                       │
           NO │                       │ YES
              │                       │
              ▼                       ▼
    ┌─────────────────┐    ┌─────────────────────┐
    │ Show Deadline   │    │ Is user a teacher?  │
    │ Date + Time     │    └──────────┬──────────┘
    │                 │               │
    │ Button:         │    ┌──────────┴──────────┐
    │ ✅ ENABLED      │    │                     │
    └─────────────────┘ YES │                     │ NO (Admin)
                            │                     │
                            ▼                     ▼
              ┌──────────────────────┐  ┌─────────────────┐
              │ 1. Auto-disable in   │  │ Allow upload    │
              │    database          │  │ (admin override)│
              │ 2. Block this upload │  │                 │
              │    (RED alert)       │  │ Button:         │
              │                      │  │ ✅ ENABLED      │
              │ Button:              │  └─────────────────┘
              │ ❌ DISABLED          │
              └──────────┬───────────┘
                         │
                         │ Next page load
                         ▼
              ┌──────────────────────┐
              │ enabled = false now  │
              │ No deadline found    │
              │ (GREEN alert)        │
              │                      │
              │ Button:              │
              │ ✅ ENABLED           │
              └──────────────────────┘
```

---

## Database Changes

### Before Auto-Disable Feature:
```sql
-- Deadlines stay enabled forever
SELECT * FROM upload_deadlines;

 id | term       | session   | upload_type | deadline            | enabled
----|------------|-----------|-------------|---------------------|--------
 1  | First Term | 2025/2026 | e-notes     | 2025-11-01 23:59:59 | true ✅
                                             ↑ PAST DATE BUT STILL ENABLED
```

**Problem:** Teachers see "No deadline set" even though deadline exists!

### After Auto-Disable Feature:
```sql
-- First time teacher loads page after expiry:
SELECT * FROM upload_deadlines;

 id | term       | session   | upload_type | deadline            | enabled
----|------------|-----------|-------------|---------------------|--------
 1  | First Term | 2025/2026 | e-notes     | 2025-11-01 23:59:59 | true ✅
                                             ↑ Backend detects expired

-- Backend runs:
UPDATE upload_deadlines SET enabled = false WHERE id = 1;

-- Database after auto-disable:
 id | term       | session   | upload_type | deadline            | enabled
----|------------|-----------|-------------|---------------------|--------
 1  | First Term | 2025/2026 | e-notes     | 2025-11-01 23:59:59 | false ❌
                                             ↑ PAST DATE, NOW DISABLED
```

**Result:** Next load shows "No deadline set" + button enabled ✅

---

## Admin vs Teacher Experience

### Teacher Journey:
```
Day 1 (Before Deadline):
├─ Load page
├─ Backend finds: enabled=true, deadline=Dec 31 (future)
├─ Show: "Deadline Dec 31" + Button ENABLED ✅
└─ Can upload ✅

Day 60 (After Deadline Expires):
├─ Load page (First time)
├─ Backend finds: enabled=true, deadline=Dec 31 (PAST)
├─ Backend auto-disables: enabled=false
├─ Show: "Deadline Expired" + Button DISABLED ❌
└─ Cannot upload ❌

Day 60 (Refresh page):
├─ Load page again
├─ Backend finds: enabled=false (no active deadline)
├─ Show: "No Deadline Set" + Button ENABLED ✅
└─ Can upload ✅
```

### Admin Journey:
```
Day 60 (After Deadline Expires):
├─ Load page
├─ Backend finds: enabled=true, deadline=Dec 31 (PAST)
├─ Backend auto-disables: enabled=false
├─ BUT Admin override: Show "Deadline Expired (Admin Override)"
├─ Button stays ENABLED ✅
├─ Show teacher selection dropdown
└─ Can upload on behalf of teachers ✅
```

---

## Backend Logic (Simplified)

```typescript
// Check deadline endpoint
async function checkDeadline(term, session, type, userRole) {
  // Find deadline
  const deadline = await db.findDeadline({
    term, 
    session, 
    type, 
    enabled: true  // ← Only find enabled deadlines
  });
  
  if (!deadline) {
    return {
      allowed: true,
      message: "No deadline set" // ← Shows green alert
    };
  }
  
  const isExpired = deadline.date < now();
  
  if (isExpired && deadline.enabled) {
    // Auto-disable in database
    await db.update({ id: deadline.id, enabled: false });
  }
  
  if (userRole === 'teacher' && isExpired) {
    return {
      allowed: false,  // ← Button DISABLED
      message: "Deadline expired" // ← Shows red alert
    };
  }
  
  return {
    allowed: true,
    message: deadline.date
  };
}
```

---

## Testing Scenarios

### Scenario 1: Expired Deadline (First Time)
```
DATABASE:
enabled: true
deadline: 2025-11-01 (PAST)

TEACHER LOADS PAGE:
→ Backend finds deadline
→ Detects expired
→ Auto-disables: enabled=false
→ Blocks teacher THIS TIME

TEACHER SEES:
┌────────────────────────────┐
│ ❌ Upload Deadline Expired │
│ [Upload Files] ← DISABLED  │
└────────────────────────────┘
```

### Scenario 2: Expired Deadline (Refresh)
```
DATABASE:
enabled: false (auto-disabled from scenario 1)
deadline: 2025-11-01 (PAST)

TEACHER RELOADS PAGE:
→ Backend looks for enabled=true
→ No match found (enabled=false)
→ Returns "No deadline set"

TEACHER SEES:
┌────────────────────────────┐
│ ✅ No Deadline Set         │
│ [Upload Files] ← ENABLED   │
└────────────────────────────┘
```

### Scenario 3: Active Deadline
```
DATABASE:
enabled: true
deadline: 2025-12-31 (FUTURE)

TEACHER LOADS PAGE:
→ Backend finds deadline
→ Not expired
→ Shows deadline info

TEACHER SEES:
┌────────────────────────────┐
│ 📅 Upload Deadline Set     │
│ Deadline: Dec 31, 2025    │
│ [Upload Files] ← ENABLED   │
└────────────────────────────┘
```

---

## Quick Reference

| Database State | Teacher Sees | Button | Alert Color |
|---------------|--------------|--------|-------------|
| enabled=true, deadline=future | "Deadline: [date]" | ✅ ENABLED | 🔵 Blue |
| enabled=true, deadline=past (first load) | "Deadline expired" | ❌ DISABLED | 🔴 Red |
| enabled=false, deadline=past (after auto-disable) | "No deadline set" | ✅ ENABLED | 🟢 Green |
| No deadline exists | "No deadline set" | ✅ ENABLED | 🟢 Green |

---

**Status:** ✅ Auto-disable feature implemented
**Test:** Create expired deadline, load page as teacher, should block once then allow
