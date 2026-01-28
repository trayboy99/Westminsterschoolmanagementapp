# Test Complete Profile Data - Quick Guide

## ✅ What Was Fixed

The Users Management system now fetches and displays **complete user profiles** by combining:
- Basic fields from `profiles` table (name, email, role)
- Extended fields from `KV Store` (photo, phone, address, gender, parent info, etc.)
- Class names from `classes` table (for students)

---

## Quick Test (2 minutes)

### Step 1: Open Users Management

1. Log in as IT Admin (role = `it_admin`)
2. Click "Users Management" in sidebar
3. Page should load successfully

### Step 2: Check Browser Console

Press **F12** and look for these logs:

**✅ Expected Success Logs:**
```
[UsersManagement] Fetching users...
[UsersManagement] Response status: 200
[UsersManagement] Loaded users: 25
[UsersManagement] Sample user data: { id: "...", first_name: "...", photo_url: "...", gender: "...", phone: "..." }
[UsersManagement] Users with extended data: 18
[UsersManagement] Sample extended data: {
  hasGender: true,
  hasPhone: true,
  hasAddress: true,
  hasPhoto: true,
  hasParentInfo: true
}
✅ Loaded 25 users successfully
```

**❌ If You See Errors:**
```
❌ Error: column profiles.created_at does not exist
```
→ Hard refresh: **Ctrl+Shift+R**

### Step 3: Check User Cards

In the users list, you should see:

**For users WITH extended data:**
```
┌─────────────────────────────────┐
│ [📸] John Paul Doe              │  ← Photo if uploaded
│      Student | JSS 1A           │  ← Class name
│      ✉ john@school.com          │
│      📱 +234-XXX-XXXX           │  ← Phone
│      📍 123 Main St, Lagos      │  ← Address
│      Gender: Male               │  ← Gender
│      [View] [Reset] [Delete]    │
└─────────────────────────────────┘
```

**For users WITHOUT extended data:**
```
┌─────────────────────────────────┐
│ [?] New User                    │  ← Generic avatar
│     Student                     │
│     new@school.com              │
│     [View] [Reset] [Delete]     │
└─────────────────────────────────┘
```

### Step 4: View Complete Profile

1. Click **"View"** on any user
2. Dialog should show:

```
┌────────────────────────────────────┐
│         [Profile Photo]            │  ← Large photo (if uploaded)
│                                    │
│ BASIC INFORMATION                  │
│ First Name: John                   │
│ Middle Name: Paul                  │
│ Last Name: Doe                     │
│ Email: john@school.com             │
│ Role: Student                      │
│ Gender: Male                       │
│ Class: JSS 1A                      │
│ Date of Birth: 2005-03-15          │
│ Blood Group: O+                    │
│                                    │
│ CONTACT INFORMATION                │
│ Phone: +234-XXX-XXXX               │
│ Address: 123 Main St, Lagos        │
│ State: Lagos                       │
│ LGA: Ikeja                         │
│                                    │
│ PARENT/GUARDIAN INFORMATION        │
│ Parent Name: Jane Doe              │
│ Parent Phone: +234-XXX-XXXX        │
│ Parent Email: jane@example.com     │
│                                    │
│ ACCOUNT INFORMATION                │
│ User ID: abc-123                   │
│ Health Document: [View Document]   │
└────────────────────────────────────┘
```

### Step 5: Check Backend Logs

1. Go to **Supabase Dashboard**
2. Click **Edge Functions** → **server** → **Logs**
3. Look for:

```
[List Users] Request received
[List Users] Access granted for IT admin
[List Users] Fetched profiles count: 25
[List Users] Fetching extended data from KV store...
[List Users] Found extended data for john@school.com: {
  hasGender: true,
  hasPhone: true,
  hasPhoto: true,
  hasAddress: true,
  hasParent: true
}
[List Users] No extended data found for newuser@school.com
[List Users] Total users: 25, With extended data: 18
```

---

## If Extended Data Is Missing

**Cause:** Users haven't filled in their profile settings yet.

**Solution:** Have users fill in their profiles:

### For Students/Teachers:
1. Log in
2. Click profile icon → **Settings**
3. Fill in:
   - Gender
   - Phone
   - Address
   - State/LGA
   - Date of Birth
   - Blood Group
   - **Upload Photo**
   - Parent Info (students)
   - Upload Health Document (students)
4. Click **Save Profile**

### For IT Admin to Test:
```javascript
// Run in browser console to add test data
const { data: { session } } = await supabase.auth.getSession();

// Get a user
const { data: user } = await supabase
  .from('profiles')
  .select('id, email')
  .eq('email', 'test@school.com')
  .single();

// Add extended data via server endpoint
await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile-settings`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${session.access_token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      gender: 'Male',
      phone: '+234-123-4567',
      address: '123 Test St, Lagos',
      state: 'Lagos',
      lga: 'Ikeja'
    })
  }
);

// Refresh Users Management
```

---

## Search Test

Extended data is now searchable!

**Try searching for:**
- ✅ First name: "John"
- ✅ Last name: "Doe"
- ✅ Email: "john@school.com"
- ✅ Phone number: "234-XXX" ← NEW!

All should work!

---

## Troubleshooting

### Issue: "created_at does not exist" Error

**Cause:** Browser cache  
**Fix:** Hard refresh - **Ctrl+Shift+R**

### Issue: No profile photos showing

**Possible causes:**
1. Users haven't uploaded photos yet
2. Photo URLs expired (Supabase Storage)

**Check:**
```javascript
// In browser console
const { data: users } = await fetch(
  `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/list`,
  { headers: { 'Authorization': `Bearer ${accessToken}` }}
).then(r => r.json());

console.log('Users with photos:', users.users.filter(u => u.photo_url).length);
console.log('Sample photo URL:', users.users.find(u => u.photo_url)?.photo_url);
```

### Issue: Extended data not showing

**Check if data exists in KV store:**
```javascript
// Get user ID
const { data: user } = await supabase
  .from('profiles')
  .select('id, email')
  .eq('email', 'test@school.com')
  .single();

// Check backend logs for this key
console.log('KV Store Key:', `user_profile_${user.id}`);
```

Then check Supabase Edge Function logs for:
```
[List Users] Found extended data for test@school.com: { ... }
```

or

```
[List Users] No extended data found for test@school.com
```

---

## Quick Diagnostic

Run this in browser console (F12):

```javascript
(async () => {
  console.log('=== COMPLETE PROFILE DATA DIAGNOSTIC ===\n');
  
  const { data: { session } } = await supabase.auth.getSession();
  
  const res = await fetch(
    `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users/list`,
    {
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const result = await res.json();
  
  if (result.success) {
    console.log('✅ Total Users:', result.users.length);
    
    const withExtended = result.users.filter(u => 
      u.gender || u.phone || u.address || u.photo_url
    );
    console.log('✅ Users with Extended Data:', withExtended.length);
    
    const withPhotos = result.users.filter(u => u.photo_url);
    console.log('✅ Users with Photos:', withPhotos.length);
    
    const withParentInfo = result.users.filter(u => u.parent_name);
    console.log('✅ Users with Parent Info:', withParentInfo.length);
    
    console.log('\nSample User (with extended data):');
    console.log(withExtended[0] || result.users[0]);
    
    console.log('\nExtended Fields Available:');
    const sample = withExtended[0] || result.users[0];
    console.log({
      hasGender: !!sample?.gender,
      hasPhone: !!sample?.phone,
      hasAddress: !!sample?.address,
      hasState: !!sample?.state,
      hasLGA: !!sample?.lga,
      hasPhoto: !!sample?.photo_url,
      hasDateOfBirth: !!sample?.date_of_birth,
      hasBloodGroup: !!sample?.blood_group,
      hasParentName: !!sample?.parent_name,
      hasParentPhone: !!sample?.parent_phone,
      hasHealthDoc: !!sample?.health_document_url,
      hasClassName: !!sample?.class_name
    });
    
    console.log('\n✅ DIAGNOSTIC COMPLETE!');
  } else {
    console.error('❌ Failed to fetch users:', result.error);
  }
})();
```

**Expected Output:**
```
=== COMPLETE PROFILE DATA DIAGNOSTIC ===

✅ Total Users: 25
✅ Users with Extended Data: 18
✅ Users with Photos: 12
✅ Users with Parent Info: 15

Sample User (with extended data):
{
  id: "abc-123",
  first_name: "John",
  middle_name: "Paul",
  last_name: "Doe",
  email: "john@school.com",
  role: "student",
  gender: "Male",
  phone: "+234-XXX-XXXX",
  address: "123 Main St, Lagos",
  state: "Lagos",
  lga: "Ikeja",
  photo_url: "https://...",
  parent_name: "Jane Doe",
  class_name: "JSS 1A"
}

Extended Fields Available:
{
  hasGender: true,
  hasPhone: true,
  hasAddress: true,
  hasState: true,
  hasLGA: true,
  hasPhoto: true,
  hasDateOfBirth: true,
  hasBloodGroup: true,
  hasParentName: true,
  hasParentPhone: true,
  hasHealthDoc: true,
  hasClassName: true
}

✅ DIAGNOSTIC COMPLETE!
```

---

## Summary

✅ **Backend:** Fetches from profiles table + KV store + classes table  
✅ **Frontend:** Displays all available data with photos  
✅ **Graceful:** Works even if extended data doesn't exist  
✅ **Complete:** All user profile fields available  

**The system is working! Users just need to fill in their profile settings to see extended data.** 🎉
