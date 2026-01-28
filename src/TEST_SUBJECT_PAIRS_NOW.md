# Test Subject Pairs System - Step by Step

## Quick Start Testing

### Part 1: Configure Junior (JSS) Paired Subjects

#### Step 1: Mark Subjects as Paired
1. Navigate to: **Timetable** → **Settings**
2. Go to **"Subjects Config"** tab
3. Find a JSS subject (e.g., Chemistry)
4. Click **"Configure"** or **"Edit"**
5. In the dialog:
   - **Step 1**: Select JSS classes (e.g., JSS 1, JSS 2)
   - **Step 2**: Assign at least one teacher
   - **Step 3**: Set periods per week (e.g., 3-5)
   - **Step 4**: Select Level → **"Junior Secondary (JSS)"**
   - **Step 5**: ✅ Check **"This is a paired subject"**
6. Click **"Save Configuration"**
7. Repeat for Biology and Physics

#### Step 2: Create Pair Group
1. Click on **"Pairs"** tab (next to Subjects Config)
2. Should see **"Junior Secondary (JSS)"** tab selected
3. Click **"Create New Pair Group"**
4. Enter:
   - **Pair Name**: "Science Trio"
   - **Subjects Per Pair**: 3
5. Click **"Create Pair Group"**

#### Step 3: Assign Subjects Using Drag & Drop
1. You should now see:
   - **Top section**: "Available Subjects" with Chemistry, Biology, Physics
   - **Bottom section**: Your "Science Trio" pair with 3 empty slots
2. **Drag Chemistry** from available subjects → drop into "Subject 1" slot
3. **Drag Biology** → drop into "Subject 2" slot  
4. **Drag Physics** → drop into "Subject 3" slot
5. Watch the progress bar fill up to 100%
6. The card should turn **green** with a ✅ check icon
7. Click **"Save All Pairs"**

**Expected Result**: ✅ Science Trio pair complete with 3 subjects

---

### Part 2: Configure Senior (SSS) Departmental Subjects

#### Step 1: Mark Subjects as Departmental
1. Go back to **"Subjects Config"** tab
2. Find an SSS subject (e.g., Advanced Mathematics)
3. Click **"Configure"** or **"Edit"**
4. In the dialog:
   - **Step 1**: Select SSS classes (e.g., SS 1, SS 2)
   - **Step 2**: Assign teacher(s)
   - **Step 3**: Set periods (e.g., 4-6)
   - **Step 4**: Select Level → **"Senior Secondary (SSS)"**
   - **Step 5**: 
     - Select Type → **"Core (Required - Higher Priority)"**
     - ✅ Check **"This is a departmental/major subject"**
     - **Note**: No department dropdown anymore!
5. Click **"Save Configuration"**
6. Repeat for Chemistry and Physics (mark as Core + Departmental)

#### Step 2: Create Departmental Group
1. Go to **"Pairs"** tab
2. Click **"Senior Secondary (SSS)"** tab at the top
3. Click **"Create New Pair Group"**
4. Enter:
   - **Pair Name**: "Science Core Subjects"
   - **Subjects Per Pair**: 3
5. Click **"Create Pair Group"**

#### Step 3: Assign Subjects
1. See available departmental subjects at top
2. **Drag Advanced Mathematics** → Subject 1
3. **Drag Chemistry** → Subject 2
4. **Drag Physics** → Subject 3
5. Alternatively, use the dropdown: "Or select manually"
6. Click **"Save All Pairs"**

**Expected Result**: ✅ Science Core Subjects group complete

---

## Visual Checklist

### What You Should See:

#### ✅ Subjects Config Tab
- [x] Step 4: "Select Level" dropdown
- [x] Step 5 for Junior: Checkbox for "paired subject"
- [x] Step 5 for Senior: Type dropdown + "departmental/major subject" checkbox
- [x] No department dropdown for Senior anymore
- [x] Message: "Configure pairs in the Pairs tab"

#### ✅ Pairs Tab - Junior
- [x] Two level tabs at top (Junior/Senior)
- [x] Blue info alert explaining paired subjects
- [x] "Available Subjects" card showing count
- [x] "Create New Pair Group" button
- [x] Drag & drop interface
- [x] Empty slots with "Drop subject here" message
- [x] Progress bars showing completion
- [x] Green border when pair complete

#### ✅ Pairs Tab - Senior  
- [x] Info alert mentions "priority for core subjects"
- [x] Same drag & drop interface
- [x] Groups show departmental subjects
- [x] "Save All Pairs" button at top

---

## Common Scenarios

### Scenario 1: No Available Subjects
**Problem**: "Available Subjects" shows 0 subjects

**Solution**:
1. Go to Subjects Config tab
2. Make sure subjects are configured with classes
3. Check the appropriate box:
   - Junior: "This is a paired subject"
   - Senior: "This is a departmental/major subject"
4. Save the configuration
5. Return to Pairs tab - subjects should now appear

### Scenario 2: Can't Drag Subject
**Problem**: Subject won't drag

**Solution**:
- Make sure you're clicking and holding on the subject card
- Try using the manual dropdown instead
- Check browser console for errors

### Scenario 3: Pair Slot Already Full
**Problem**: "This pair already has X subjects"

**Solution**:
- Each pair has a fixed number of slots
- Remove an existing subject first, or
- Create a new pair group with more slots

---

## Testing Different Configurations

### Test 1: Two-Subject Pair
- Create pair: "Math Duo"
- Subjects per pair: 2
- Add: Mathematics, Further Maths

### Test 2: Large Group
- Create pair: "Arts Department"  
- Subjects per pair: 5
- Add: Literature, History, Government, CRS, French

### Test 3: Mixed Levels
- Configure 3 JSS subjects as paired
- Configure 4 SSS subjects as departmental
- Create pairs for both levels
- Verify they appear in correct tabs

### Test 4: Remove and Reassign
- Create a pair with 3 subjects
- Remove one subject (click X)
- Drag a different subject into that slot
- Verify it updates correctly

### Test 5: Delete Pair Group
- Create a pair group
- Add some subjects
- Click trash icon on the group
- Confirm deletion
- Verify subjects return to available pool

---

## Expected Behavior Summary

| Action | Expected Result |
|--------|----------------|
| Mark subject as paired/departmental | Appears in available subjects in Pairs tab |
| Create pair group | New card appears with empty slots |
| Drag subject to slot | Subject fills the slot, count increases |
| Fill all slots | Card turns green, shows checkmark |
| Save all pairs | Toast: "Pair groups saved successfully!" |
| Switch levels | Shows pairs for that level only |
| Remove subject | Slot becomes empty, subject returns to available |
| Delete group | Group removed, subjects return to available |

---

## Troubleshooting

### Issue: Changes Not Saving
- Check browser console for errors
- Verify localStorage is enabled
- Try clearing cache and reloading

### Issue: Subjects Not Showing
- Confirm subject is configured in Subjects Config
- Check correct checkbox is ticked
- Verify correct level is selected
- Ensure subject isn't already assigned to another pair

### Issue: Drag & Drop Not Working
- Check browser compatibility (modern browsers only)
- Try using manual dropdown instead
- Refresh the page
- Check console for JavaScript errors

---

## Success Criteria

You've successfully tested the system when:

✅ You can mark JSS subjects as paired  
✅ You can mark SSS subjects as departmental  
✅ No department dropdown appears for SSS (removed)  
✅ Pairs tab shows two level options  
✅ You can create pair groups  
✅ You can drag & drop subjects into pairs  
✅ Progress bars update correctly  
✅ Complete pairs turn green  
✅ You can save all pairs  
✅ Subjects move between available and assigned correctly  
✅ Core subjects are noted for priority scheduling

---

## Next: Integration with Timetable Generation

Once pairs are configured, the timetable generation algorithm should:
1. Read pair groups from storage
2. Schedule paired subjects in same time slots
3. Give priority to core departmental subjects
4. Respect teacher availability and class constraints

This integration is the next phase of development.
