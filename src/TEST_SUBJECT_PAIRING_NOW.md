# 🧪 Test Subject Pairing System - Quick Guide

## ⚡ Quick Setup (5 minutes)

### Step 1: Run Database Migration
```sql
-- Copy and paste this into Supabase SQL Editor
-- File: /ALTER_SUBJECT_PAIRINGS_ADD_GROUP_SUPPORT.sql
```

### Step 2: Create Test Subjects (if needed)
Go to Admin Dashboard → Academic → Subjects and create:
- Biology
- Chemistry  
- Physics
- Literature
- CRS (Christian Religious Studies)

### Step 3: Configure Subjects for Pairing

**Navigate to:** Timetable Module → **Subjects Config** tab

#### For Biology:
- Select Biology
- **Classes**: SSS1, SSS2, SSS3
- **Min Periods**: 2, **Max Periods**: 4
- **Teachers**: Select science teachers
- ✅ Check **"This is a departmental/major subject"** (if SSS)
- Click **Save Configuration**

#### For Chemistry:
- Select Chemistry
- **Classes**: SSS1, SSS2, SSS3
- **Min Periods**: 2, **Max Periods**: 4
- **Teachers**: Select science teachers
- ✅ Check **"This is a departmental/major subject"**
- Click **Save Configuration**

#### For Physics:
- Select Physics
- **Classes**: SSS1, SSS2, SSS3
- **Min Periods**: 2, **Max Periods**: 3
- **Teachers**: Select science teachers
- ✅ Check **"This is a departmental/major subject"**
- Click **Save Configuration**

### Step 4: Create Pair Group

**Navigate to:** Timetable Module → **Pairs** tab

1. Switch to **"Senior Secondary (SSS)"** tab
2. You should see Biology, Chemistry, and Physics in "Available Subjects"
3. **Drag Biology onto Chemistry** → Creates pair "Biology / Chemistry"
4. **Drag Physics onto the created pair** → Updates to "Biology / Chemistry / Physics"
5. Click edit icon, rename to **"Sciences"**
6. Click **"Save All Pairs"**

**Expected Result:**
- ✅ Toast message: "Saved 1 pair group(s) to database!"
- ✅ Pair appears in "Created Pairs" section with green background
- ✅ Shows "3 subjects in this pair"

### Step 5: Verify Database Storage

**Run in Supabase SQL Editor:**
```sql
SELECT 
  pair_group_id,
  pair_group_name,
  subject_id,
  level
FROM subject_pairings
WHERE level = 'senior'
ORDER BY pair_group_id, subject_id;
```

**Expected Result:**
```
| pair_group_id    | pair_group_name | subject_id | level  |
|------------------|-----------------|------------|--------|
| pair_1234567890  | Sciences        | bio-uuid   | senior |
| pair_1234567890  | Sciences        | chem-uuid  | senior |
| pair_1234567890  | Sciences        | phys-uuid  | senior |
```

### Step 6: Generate Timetable

**Navigate to:** Timetable Module → **Generate** or **Settings** tab

1. Configure basic timetable settings (if not done already):
   - Days: Mon-Fri
   - Periods per day: 8
   - Period duration: 45 minutes
2. Click **"Generate Timetable"**
3. Open browser console (F12) and check for logs

**Expected Console Logs:**
```
[Generator] Phase 0: Fetching subject pair groups
[Generator] Loaded 1 pair groups with subjects: Sciences (3 subjects)
[Generator] 3 pair groups configured, 3 subjects in pairs
[Generator] 🔗 Biology is part of pair: Sciences
[Generator] 🔗 Found 3 subjects from pair in SSS1: Biology, Chemistry, Physics
[Generator] ✅ Paired 3 subjects at mon period 3
[Generator] ✅ Paired 3 subjects at tue period 2
[Generator] ✅ Paired 3 subjects at wed period 4
```

### Step 7: Verify Timetable Results

**Navigate to:** Timetable Module → **View Timetable** (Traditional View)

**Check for SSS1 class:**
- Find Biology in the timetable
- Note the day and period (e.g., Monday Period 3)
- Check the SAME day and period → Should also have Chemistry AND Physics

**Example Result:**
```
Monday Period 3:
├─ Biology (Mr. Adewale)
├─ Chemistry (Mrs. Ibrahim)
└─ Physics (Mr. Okafor)

All three subjects scheduled at THE SAME TIME!
Students choose one based on their department.
```

## ✅ Success Criteria

- [x] Pair saved to database (check SQL query result)
- [x] Console shows "Loaded N pair groups"
- [x] Console shows "🔗 Subject is part of pair"
- [x] Console shows "✅ Paired N subjects at..."
- [x] Timetable view shows all paired subjects in same time slot
- [x] Each subject has its own teacher assigned

## 🐛 Troubleshooting

### Problem: "No subjects available for pairing"
**Solution:** Go to Subjects Config tab and check "This is a departmental subject" for SSS subjects (or "paired subject" for JSS)

### Problem: Subjects not appearing after checking the box
**Solution:** Click "Save Configuration" button and wait for success toast

### Problem: Pair not saving to database
**Solution:** 
- Check browser console for errors
- Verify you're logged in
- Check database permissions in Supabase

### Problem: Paired subjects not scheduled together
**Solution:**
- Verify pair exists in database (run SQL query)
- Check browser console for pairing logs
- Ensure teachers are configured for all subjects in the pair

### Problem: "No teacher available for paired subject"
**Solution:**
- Go to Subjects Config tab
- Add qualified teachers for each subject in the pair
- Verify teachers have availability at the time slots

## 🎯 Advanced Testing

### Test 2-Subject Pair
1. Create pair with Literature + CRS
2. Generate timetable
3. Verify they appear together

### Test 4+ Subject Pair
1. Create pair with Biology + Chemistry + Physics + Agricultural Science
2. Generate timetable
3. Verify all 4 scheduled together

### Test Multiple Pairs
1. Create "Sciences" pair (Biology/Chemistry/Physics)
2. Create "Arts" pair (Literature/CRS/History)
3. Generate timetable
4. Verify each pair scheduled independently

## 📊 Expected Performance

- Pair creation: < 1 second
- Database save: < 2 seconds
- Timetable generation with pairs: 2-5 seconds (depends on complexity)

## 🎉 You're Done!

If all tests pass, the subject pairing system is working correctly. Paired subjects will always be scheduled at the same time, allowing students to choose between them based on their department.

---

**Need Help?** Check the full implementation guide: `/SUBJECT_PAIRING_TIMETABLE_INTEGRATION_COMPLETE.md`
