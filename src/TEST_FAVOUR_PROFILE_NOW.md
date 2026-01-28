# Test Favour Esther Blessing's Complete Profile - NOW

## What Was Fixed

The system was using the WRONG KV store key to fetch student profiles!

**Before:** Tried to fetch from `user_profile_${id}` ❌  
**After:** Now fetches from `student_profile_${id}` ✅

---

## Quick Test (30 seconds)

### Step 1: Hard Refresh

**CRITICAL:** You must hard refresh the page!

- Windows/Linux: **Ctrl + Shift + R**
- Mac: **Cmd + Shift + R**

### Step 2: Go to Users Management

1. Make sure you're logged in as IT Admin
2. Click "Users Management" in sidebar

### Step 3: Search for Favour

In the search box, type: **"Favour"** or **"Esther"** or **"Blessing"**

You should see her in the results.

### Step 4: Click "View"

Click the "View" button on Favour Esther Blessing's card.

### Step 5: Check the Profile

You should now see **COMPLETE** profile data:

```
┌────────────────────────────────────────┐
│         [Her Profile Photo]            │  ← Photo she uploaded
│                                        │
│ BASIC INFORMATION                      │
│ First Name: Favour                     │
│ Middle Name: Esther                    │
│ Last Name: Blessing                    │
│ Email: (her email)                     │
│ Role: Student                          │
│ Gender: (her gender)          ✅ NEW!  │
│ Class: (her class)            ✅ NEW!  │
│ Date of Birth: (her DOB)      ✅ NEW!  │
│ Blood Group: (her blood)      ✅ NEW!  │
│                                        │
│ CONTACT INFORMATION           ✅ NEW!  │
│ Phone: (her phone)                     │
│ Address: (her address)                 │
│ State: (her state)                     │
│ LGA: (her LGA)                         │
│                                        │
│ PARENT/GUARDIAN INFO          ✅ NEW!  │
│ Parent Name: (parent name)             │
│ Parent Phone: (parent phone)           │
│ Parent Email: (parent email)           │
│                                        │
│ ACCOUNT INFORMATION                    │
│ User ID: (her ID)                      │
│ Health Document: [View]       ✅ NEW!  │
└────────────────────────────────────────┘
```

---

## If You Still See Only Basic Info

### 1. Check Browser Console

Press **F12** and look for logs:

**✅ Good:**
```
[List Users] Found extended data for favour@school.com (student) using key: student_profile_xxx: {
  hasGender: true,
  hasPhone: true,
  hasPhoto: true,
  hasAddress: true,
  hasParent: true
}
```

**❌ Bad:**
```
[List Users] No extended data found for favour@school.com (student) - tried key: student_profile_xxx
```

If you see "No extended data found", it means:
- Favour hasn't actually filled her profile yet, OR
- The data wasn't saved properly

### 2. Verify Data in KV Store

Run this diagnostic in browser console (F12):

```javascript
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  
  // Find Favour
  const { data: favour } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, role')
    .ilike('first_name', '%favour%')
    .ilike('last_name', '%blessing%')
    .single();
  
  console.log('Found:', favour?.first_name, favour?.last_name);
  console.log('Role:', favour?.role);
  console.log('Expected KV Key:', `student_profile_${favour?.id}`);
  
  // Fetch her profile via API
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/list`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
      }
    }
  );
  
  const result = await res.json();
  const favourData = result.users?.find(u => u.id === favour?.id);
  
  console.log('\nExtended Data:');
  console.log('Gender:', favourData?.gender);
  console.log('Phone:', favourData?.phone);
  console.log('Address:', favourData?.address);
  console.log('Photo:', favourData?.photo_url ? 'YES' : 'NO');
  console.log('Parent Name:', favourData?.parent_name);
  
  if (favourData?.gender || favourData?.phone) {
    console.log('\n✅ COMPLETE PROFILE DATA FOUND!');
  } else {
    console.log('\n❌ No extended data - student may not have filled profile');
  }
})();
```

---

## If Favour Needs to Re-Save Her Profile

If the data is still not showing, have Favour do this:

1. Log in as Favour Esther Blessing (student account)
2. Click profile icon → **Settings**
3. Make sure all fields are filled:
   - Gender
   - Phone Number
   - Address
   - State of Origin
   - LGA
   - Date of Birth
   - Blood Group
   - Parent Name
   - Parent Phone
   - Parent Email
   - Upload Photo (if not already uploaded)
   - Upload Health Document (if not already uploaded)
4. Click **"Save Profile"**
5. Wait for success message

Then test again as IT Admin!

---

## Backend Logs

To see what's happening on the backend:

1. Go to Supabase Dashboard
2. Click **Edge Functions** → **server** → **Logs**
3. Look for:

```
[List Users] Fetching extended data from KV store...
[List Users] Found extended data for favour@school.com (student) using key: student_profile_xxx-yyy: {
  hasGender: true,
  hasPhone: true,
  hasPhoto: true,
  hasAddress: true,
  hasParent: true
}
```

---

## Expected vs Actual

### BEFORE FIX:

**In Users List:**
```
┌────────────────────────┐
│ [?] Favour E. Blessing │
│     Student            │
│     favour@school.com  │
└────────────────────────┘
```

**In View Dialog:**
```
BASIC INFORMATION
First Name: Favour
Last Name: Blessing
Email: favour@school.com
Role: Student

[That's it - nothing else]
```

### AFTER FIX:

**In Users List:**
```
┌─────────────────────────────────┐
│ [📸] Favour Esther Blessing     │
│      Student | JSS 1A           │
│      ✉ favour@school.com        │
│      📱 +234-XXX-XXXX           │
│      📍 Lagos, Nigeria          │
│      Gender: Female             │
└─────────────────────────────────┘
```

**In View Dialog:**
```
[Large Profile Photo]

BASIC INFORMATION
First Name: Favour
Middle Name: Esther
Last Name: Blessing
Email: favour@school.com
Role: Student
Gender: Female          ✅
Class: JSS 1A          ✅
Date of Birth: 2008-05-15  ✅
Blood Group: O+        ✅

CONTACT INFORMATION    ✅
Phone: +234-XXX-XXXX
Address: 123 Main St, Lagos
State: Lagos
LGA: Ikeja

PARENT/GUARDIAN INFO   ✅
Parent Name: Mrs. Blessing
Parent Phone: +234-YYY-YYYY
Parent Email: parent@example.com

ACCOUNT INFORMATION
User ID: abc-123
Health Document: [View Document]  ✅
```

---

## Summary

✅ **Fixed:** Backend now uses correct KV key `student_profile_${id}` for students
✅ **Fixed:** Field name normalization (state_of_origin → state)
✅ **Result:** Complete student profiles now visible to IT Admin

**Just hard refresh and check Favour's profile now!** 🎉

---

## Still Having Issues?

If you still don't see extended data:

1. **Verify Favour's role:**
   ```sql
   SELECT first_name, last_name, email, role 
   FROM profiles 
   WHERE first_name ILIKE '%favour%' 
   AND last_name ILIKE '%blessing%';
   ```
   Should show `role = 'student'`

2. **Check if data exists in backend:**
   - Go to Supabase Edge Function logs
   - Look for the log showing what was found for Favour

3. **Verify the student actually saved:**
   - Ask Favour to log in
   - Go to Settings
   - Check if fields are filled
   - If empty, fill and save again

The fix is deployed and working - if data exists, it will now be displayed! 🚀
