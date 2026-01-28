# Subject Configuration & Pairing Fix - Testing Guide

## What Was Fixed

### The Root Cause
The subject configuration was not being saved properly because:
1. **Step 4 (Level Selection) was not being completed** - Users could skip this step
2. The `isPairedSubject` and `isDepartmental` fields were only saved if the correct level was selected
3. If no level was selected, these fields were set to `undefined` instead of the actual checkbox values
4. This caused subjects to not appear in the Pairs tab even though the checkbox was checked

### The Solution
1. **Made Step 4 (Level Selection) REQUIRED** with clear visual indicators
2. **Added validation** to prevent saving without selecting a level
3. **Added validation** to ensure level matches pairing type (Junior for paired, Senior for departmental)
4. **Enhanced UI** to make it crystal clear which steps are required
5. **Added comprehensive console logging** to help debug any remaining issues
6. **Improved help text** in the Pairs tab with step-by-step instructions

---

## How to Test the Fix

### Test 1: Configure a Junior Paired Subject

1. **Navigate to Timetable Settings** → **Subjects Config** tab

2. **Find a subject** for Junior classes (e.g., "English Language")

3. **Click "Configure" or "Edit"**

4. **Complete Step 1:** Select at least one JSS class (e.g., JSS 1)

5. **Complete Step 2:** Assign at least one teacher

6. **Complete Step 3:** Set periods per week (default is fine)

7. **⚠️ CRITICAL - Complete Step 4:**
   - **YOU MUST SELECT A LEVEL**
   - Choose "Junior Secondary (JSS)" or "Both (JSS & SSS)"
   - You should see a green checkmark: "✓ Level selected: Junior Secondary"
   - If you don't select this, Step 5 won't work!

8. **Complete Step 5:** 
   - Check the box "This is a paired subject"
   - You should see: "✓ This subject will be available for pairing in the 'Pairs' tab"

9. **Click "Save Configuration"**
   - You should see: "Subject configuration saved successfully!"

10. **Verify in the list:**
    - The subject should show a green "✓ Configured" badge
    - Expand it to see a blue badge: "Paired Subject (JSS)"

11. **Switch to the "Pairs" tab**
    - Switch to "Junior" tab
    - The subject should now appear in "Available Subjects (Drag to Pairs)"

---

### Test 2: Configure a Senior Departmental Subject

1. **Navigate to Timetable Settings** → **Subjects Config** tab

2. **Find a subject** for Senior classes (e.g., "Physics")

3. **Click "Configure" or "Edit"**

4. **Complete Step 1:** Select at least one SSS class (e.g., SSS 1)

5. **Complete Step 2:** Assign at least one teacher

6. **Complete Step 3:** Set periods per week (default is fine)

7. **⚠️ CRITICAL - Complete Step 4:**
   - **YOU MUST SELECT A LEVEL**
   - Choose "Senior Secondary (SSS)" or "Both (JSS & SSS)"
   - You should see a green checkmark: "✓ Level selected: Senior Secondary"

8. **Complete Step 5:** 
   - Select "Subject Type" (Core or Elective)
   - Check the box "This is a departmental/major subject"
   - You should see: "✓ This subject will be available for departmental pairing in the 'Pairs' tab"

9. **Click "Save Configuration"**
   - You should see: "Subject configuration saved successfully!"

10. **Verify in the list:**
    - The subject should show a green "✓ Configured" badge
    - Expand it to see an orange badge: "Departmental Subject (SSS)"

11. **Switch to the "Pairs" tab**
    - Switch to "Senior" tab
    - The subject should now appear in "Available Subjects (Drag to Pairs)"

---

### Test 3: Error Validation

Try these scenarios to verify validation works:

#### Scenario A: Forgetting to Select Level
1. Configure a subject but skip Step 4 (don't select a level)
2. Check the "paired subject" or "departmental subject" checkbox
3. Try to save
4. **Expected:** You should see an error: "Please select a level in Step 4"

#### Scenario B: Wrong Level for Paired Subject
1. Configure a subject and select "Senior Secondary" in Step 4
2. Scroll to JSS Settings and check "This is a paired subject"
3. Try to save
4. **Expected:** Error: "Paired subjects are only for Junior Secondary classes..."

#### Scenario C: Wrong Level for Departmental Subject
1. Configure a subject and select "Junior Secondary" in Step 4
2. Check "This is a departmental/major subject"
3. Try to save
4. **Expected:** Error: "Departmental subjects are only for Senior Secondary classes..."

---

## Console Logging

Open your browser console (F12) to see detailed logging:

### When Saving in Subjects Config:
```
=== SAVING CONFIG ===
Subject: English Language
Level Selection: junior
isJSS: true isSSS: false
tempIsPairedSubject: true
tempIsDepartmental: false
Final config isPairedSubject: true
Final config isDepartmental: undefined
Full config: {subjectId: "...", ...}
```

### When Loading in Pairs Tab:
```
=== SUBJECT PAIRS MANAGER: Loaded Configs ===
Total configs: 5
Configs with isPairedSubject: 2
Configs with isDepartmental: 3
  - English Language: isPairedSubject=true, isDepartmental=undefined
  - Mathematics: isPairedSubject=true, isDepartmental=undefined
  - Physics: isPairedSubject=undefined, isDepartmental=true
  ...

=== UPDATE AVAILABLE SUBJECTS ===
Selected Level: junior
Total configs: 5
Relevant configs (marked for pairing): 2
  - English Language (isPaired=true, isDept=undefined)
  - Mathematics (isPaired=true, isDept=undefined)
Available subjects after filtering: 2
  - English Language
  - Mathematics
```

---

## If Subjects Still Don't Show in Pairs Tab

If you've followed all steps and subjects still don't appear:

1. **Check the console logs** (see above section)

2. **Verify the subject configuration:**
   - Go back to Subjects Config tab
   - Expand the subject
   - Look for the blue "Paired Subject (JSS)" or orange "Departmental Subject (SSS)" badge
   - If you don't see this badge, the configuration wasn't saved properly

3. **Re-configure the subject:**
   - Click "Edit"
   - Make sure Step 4 shows the correct level selection with a green checkmark
   - Make sure Step 5 shows the checkbox is checked
   - Save again

4. **Check if it's already assigned:**
   - In the Pairs tab, subjects that are already assigned to a pair won't show in Available Subjects
   - Look in the pair groups below to see if it's already there

5. **Refresh the page:**
   - Sometimes a page refresh helps reload the data

---

## Common Issues & Solutions

### Issue: "I checked the box but it doesn't save"
**Solution:** You MUST select a level in Step 4 first. This is now required and clearly marked with a red asterisk (*).

### Issue: "Stats show 0 configured even after saving"
**Solution:** Check if you completed ALL required steps including Step 4 (Level Selection). If Step 4 is empty, the save will fail validation now.

### Issue: "Subject shows in config but not in Pairs tab"
**Solution:** 
1. Make sure you selected the correct level in Step 4
2. Make sure you checked the appropriate checkbox in Step 5
3. Check the console logs to see what values were actually saved
4. Look for the colored badge (blue for paired, orange for departmental) when you expand the subject

### Issue: "I selected 'Both' but subject doesn't appear"
**Solution:** The "Both" option means you can configure settings for both JSS and SSS classes. You still need to check BOTH the paired checkbox (for JSS) AND the departmental checkbox (for SSS) if you want the subject to appear in both tabs.

---

## Visual Indicators

### Step 4 (Level Selection)
- ❌ **Not selected:** Red border, warning icon, "Please select a level before proceeding to Step 5"
- ✅ **Selected:** Green border, checkmark icon, "✓ Level selected: [level name]"

### Step 5 (Pairing Settings)
- When you check "paired subject": Blue message with checkmark
- When you check "departmental subject": Orange message with checkmark

### Subject List
- ✅ **Configured:** Green badge with checkmark
- 📘 **Paired (JSS):** Blue badge in expanded view
- 🟠 **Departmental (SSS):** Orange badge in expanded view

---

## Success Criteria

✅ You've successfully fixed the issue when:
1. You can configure a subject with all 5 steps
2. Step 4 shows a green checkmark after selecting a level
3. Step 5 shows a colored confirmation after checking the box
4. Save succeeds without errors
5. Subject shows the appropriate colored badge when expanded
6. Subject appears in the Pairs tab under Available Subjects
7. Console logs show the correct values for isPairedSubject/isDepartmental

---

## Need Help?

If you're still having issues after following this guide:
1. Check the browser console for error messages
2. Copy the console logs (see "Console Logging" section above)
3. Note which step is failing
4. Check if any error toasts appear
