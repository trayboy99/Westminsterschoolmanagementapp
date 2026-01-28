# ⚡ 30-Second Tab Switching Test

## Quick Test (30 seconds)

### Step 1: Open Console (5 seconds)
- Press **F12**
- Click **Console** tab

### Step 2: Configure Subject (10 seconds)
1. Go to **Timetable → Settings → Subjects**
2. Click **Configure** on any subject
3. Quick fill:
   - Step 1: Pick 1 class
   - Step 2: Pick 1 teacher, select class
   - Step 3: Leave defaults (2-5 periods)
   - Step 4: Pick Junior or Senior
   - Step 5: Pick Core
   - Step 6: Skip
4. Click **Save Configuration**

### Step 3: Check Console (3 seconds)
Look for:
```
✅ Updated refs: hasValidData=true, lastCount=1
```

### Step 4: Switch Tabs (10 seconds)
1. Click **Pairs** tab
2. Click **Subjects** tab
3. Click **Basic** tab  
4. Click **Subjects** tab

### Step 5: Check Console Again (2 seconds)
You should see (multiple times):
```
⏭️ Skipping fetch - already have valid data
   Current configs: 1, Last known: 1
```

## ✅ PASS if:
- Configuration still shows (green border)
- Console says "Skipping fetch"
- Stats show "Configured: 1"

## ❌ FAIL if:
- Configuration disappeared
- Stats show "Configured: 0"
- No "Skipping fetch" message

## 🎯 What "Skipping fetch" Means

**This is the key fix!**

Before: Every tab switch → fetched from backend → might get empty data → lost config  
After: Tab switch → checks "do I have data?" → YES → skip fetch → keep config ✅

If you see "Skipping fetch", the fix is **WORKING**!

## 🚨 If Still Failing

Share the EXACT console output after Step 4.  
The logs will tell us exactly what's wrong.
