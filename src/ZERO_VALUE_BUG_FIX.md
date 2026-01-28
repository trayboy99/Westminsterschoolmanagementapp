# 🐛 Critical Bug Fix: Zero Values Not Saving

## The Problem

When editing marks, **scores of 0 (zero) were not being saved** - they were being converted to `null`. This affected:
- Terminal CA2 scores
- Terminal Exam scores  
- Midterm CA1, CA2, and Exam scores (if someone entered 0)

### Why This Happened

**Location:** `/components/marks/MarksModule.tsx` lines 735-745

**The Bug:**
```typescript
terminal: {
  ca1: terminalMark?.ca1 || null, // ❌ BUG: 0 || null = null
  ca2: terminalMark?.ca2 || null, // ❌ BUG: 0 || null = null
  exam: terminalMark?.exam || null, // ❌ BUG: 0 || null = null
}
```

The `||` (OR) operator treats `0` as **falsy**, so:
- If `terminalMark.ca2 = 0`, the expression `0 || null` evaluates to `null`
- The zero value is lost and replaced with null
- When fetching marks from database, zeros become nulls in the UI

### The Fix

**Changed:** `||` to `??` (nullish coalescing operator)

```typescript
terminal: {
  ca1: terminalMark?.ca1 ?? null, // ✅ FIXED: 0 ?? null = 0
  ca2: terminalMark?.ca2 ?? null, // ✅ FIXED: 0 ?? null = 0
  exam: terminalMark?.exam ?? null, // ✅ FIXED: 0 ?? null = 0
}
```

The `??` operator only checks for `null` or `undefined`, not for falsy values:
- `0 ?? null = 0` ✅
- `null ?? null = null` ✅
- `undefined ?? null = null` ✅

## Files Changed

1. `/components/marks/MarksModule.tsx` - Lines 735-745 (fixed terminal marks)
2. `/components/marks/MarksModule.tsx` - Lines 734-739 (fixed midterm marks)

## Test This Fix

1. **Enter a zero score** for Terminal CA2 or Exam
2. **Save the marks**
3. **Refresh or reopen** the marks entry page
4. **Verify** the zero is still there (not converted to empty/null)

### Before Fix:
```
Enter: Terminal CA2 = 0
Save ✅
Reload page 🔄
Display: Terminal CA2 = "" (empty) ❌
```

### After Fix:
```
Enter: Terminal CA2 = 0
Save ✅
Reload page 🔄
Display: Terminal CA2 = 0 ✅
```

## Why It Looked Like Only CA2 Wasn't Working

You said "exam score for terminal is actually updating values but CA2 for terminal is not."

This was **likely because**:
- You were entering **non-zero values** for Terminal Exam (e.g., 30, 45, 50) → These saved fine ✅
- You were entering **zero or low values** for Terminal CA2 (e.g., 0, trying to test) → These became null ❌

The bug affects ALL fields, but only when the value is exactly `0`.

## Additional Context

### About the Unlock Feature

I also added an **"Unlock Approved Marks"** feature:
- **Principals** can unlock approved marks to make corrections
- **Teachers** see a message that only principals can unlock
- Unlocking changes status from "approved" → "submitted"
- After unlocking, marks can be edited and resubmitted

**How to unlock:**
1. Principal opens approved marks
2. Clicks "Unlock for Editing" button in the green alert
3. Confirms the action
4. Status changes to "submitted"
5. Make edits and save/resubmit

## JavaScript Gotcha: Falsy vs Nullish

**Falsy values in JavaScript:**
- `false`, `0`, `""` (empty string), `null`, `undefined`, `NaN`

**`||` checks for falsy:**
- `0 || 'default'` → `'default'` ❌ (0 is lost)
- `"" || 'default'` → `'default'` ❌ (empty string is lost)

**`??` checks only for null/undefined:**
- `0 ?? 'default'` → `0` ✅ (0 is preserved)
- `"" ?? 'default'` → `""` ✅ (empty string is preserved)
- `null ?? 'default'` → `'default'` ✅
- `undefined ?? 'default'` → `'default'` ✅

**Rule of thumb:** Use `??` when dealing with numbers that might be zero!
