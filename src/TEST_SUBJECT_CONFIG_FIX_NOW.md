# 🧪 Test Subject Configuration Fix - Quick Guide

## ✅ Quick Test (2 Minutes)

### Step 1: Configure a Subject
1. Go to **Timetable** → **Settings** → **Subjects** tab
2. Find any subject with status **"Not Configured"**
3. Click **Configure** button

### Step 2: Fill in Configuration
Fill all required fields:

**Step 1 - Classes:**
- ✅ Select at least 1 class (e.g., "JSS 1 A")

**Step 2 - Teachers:**
- ✅ Click **Add Teacher**
- ✅ Select a teacher from dropdown
- ✅ Keep "Full-Time" selected
- ✅ Select at least 1 class for this teacher

**Step 3 - Scheduling:**
- ✅ Min periods: 2
- ✅ Max periods: 5
- ✅ Allow double periods: ✓

**Step 4 - Level Selection:** (REQUIRED)
- ✅ Select **Junior Secondary** (if JSS subject)
- OR ✅ Select **Senior Secondary** (if SSS subject)
- OR ✅ Select **Both** (if subject is for both levels)

**Step 5 - Type & Department:**
- ✅ Type: Core or Elective
- ✅ Department: Science/Arts/Commercial (if SSS)

**Step 6 - Pairing:**
- For JSS: Check "Mark for Paired Subjects" if needed
- For SSS: Check "Mark for Departmental Grouping" if needed

### Step 3: Save and Verify
1. Click **Save Configuration** button
2. **WATCH FOR:**
   - ✅ Success toast: "Subject configuration saved successfully!"
   - ✅ Dialog closes
   - ✅ Subject card turns **green** with green border
   - ✅ Green **"Configured"** badge appears
   - ✅ Summary line shows: "1 class(es) • 1 teacher(s) • 2-5 periods/week"

3. **CHECK THE STATS** at the top:
   ```
   Total Subjects: X
   Configured: 1       ← Should be 1 (or increment by 1)
   Not Configured: X   ← Should decrease by 1
   ```

### Step 4: Verify Persistence (CRITICAL)
1. **Refresh the page** (F5 or Ctrl+R)
2. Go back to **Timetable → Settings → Subjects**
3. **CHECK:**
   - ✅ Subject still shows as **"Configured"** with green badge
   - ✅ Stats still show correct count
   - ✅ Click **Edit** - all your settings are still there

## ❌ What Was Broken Before

### Before Fix:
1. Save configuration → Success ✅
2. **Immediately resets to 0** ❌
3. Stats show "Configured: 0" ❌
4. Green badge disappears ❌
5. Configuration lost ❌

### After Fix:
1. Save configuration → Success ✅
2. **Stays saved** ✅
3. Stats correct: "Configured: 1" ✅
4. Green badge stays ✅
5. Configuration persists ✅

## 🔍 Console Logs to Check

Open **DevTools → Console** (F12)

### ✅ SHOULD SEE (After Save):
```
=== SAVING TO BACKEND ===
Sending configs to backend: [...]
Response status: 200
Backend save successful!
Updating local configs state with: [...]
✅ Save complete - configs persisted to backend and local state updated
```

### ❌ SHOULD NOT SEE:
```
Verifying save by fetching configs again...  ← This is GONE
```

## 🎯 Visual Checklist

### Before Save:
```
┌─────────────────────────────────────────┐
│ Mathematics                    MTH-001  │
│ JSS                                     │
│                                         │
│                      [Configure] [🗑️]   │
└─────────────────────────────────────────┘
Stats: Configured: 0
```

### After Save (FIXED):
```
┌──────────────────────────────────────────┐ ← Green border
│ Mathematics                     MTH-001  │
│ JSS  ✅ Configured                       │ ← Green badge
│ 2 class(es) • 1 teacher(s) • 2-5 periods/week │
│                       [Edit] [🗑️]        │
└──────────────────────────────────────────┘
Stats: Configured: 1  ← Increments
```

### After Page Reload (FIXED):
```
┌──────────────────────────────────────────┐ ← Still green
│ Mathematics                     MTH-001  │
│ JSS  ✅ Configured                       │ ← Still shows
│ 2 class(es) • 1 teacher(s) • 2-5 periods/week │
│                       [Edit] [🗑️]        │
└──────────────────────────────────────────┘
Stats: Configured: 1  ← Still shows 1
```

## 🚨 If It's Still Broken

If configurations still reset to 0:

1. **Check Browser Console** for errors
2. **Check Network Tab** in DevTools:
   - Find POST to `subject-configs`
   - Check Response: Should be `{success: true, savedCount: 1}`
3. **Clear browser cache** and reload
4. **Check Supabase logs** in Supabase Dashboard → Edge Functions

## ✅ Success Criteria

The fix is working if:
- ✅ Save shows success toast
- ✅ Subject card turns green with "Configured" badge
- ✅ Stats increment correctly
- ✅ **Configuration persists after page reload** ← MOST IMPORTANT
- ✅ Edit shows all saved settings
- ✅ Can configure multiple subjects without losing data

## 🎉 You're Done!

If all the above checks pass, the subject configuration persistence bug is **FIXED**! 

You can now:
- Configure all your subjects
- Assign teachers to subjects
- Set scheduling preferences
- Use these configs for timetable generation

The data will **persist reliably** across page reloads and sessions. 🚀
