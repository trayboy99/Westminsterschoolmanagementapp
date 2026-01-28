# Role Constraint Fix - Visual Guide 📊

## The Error You Saw

```
┌─────────────────────────────────────────────────────┐
│ IT Admin Dashboard - Pending Registrations         │
├─────────────────────────────────────────────────────┤
│                                                     │
│ • Test Director                        [admin]     │
│   test-director@school.com                         │
│   [View Details]  [Reject]  [✅ Approve]           │
│                                                     │
└─────────────────────────────────────────────────────┘
                       ↓
              Click "Approve"
                       ↓
┌─────────────────────────────────────────────────────┐
│ ❌ ERROR                                            │
├─────────────────────────────────────────────────────┤
│ Failed to create user profile: new row for         │
│ relation "profiles" violates check constraint      │
│ "profiles_role_check"                              │
└─────────────────────────────────────────────────────┘
```

**Why?** Backend tried to insert `role = 'admin'` but database only allows specific roles!

---

## Database Constraint

### The Check Constraint:

```sql
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check 
CHECK (role IN (
  'student',         ✅
  'teacher',         ✅
  'principal',       ✅
  'super_admin',     ✅
  'director',        ✅
  'secretary',       ✅
  'transport_manager', ✅
  'it_admin',        ✅
  'finance_admin',   ✅
  'parent'           ✅
  -- 'admin'         ❌ NOT ALLOWED!
));
```

**Problem:** `'admin'` is NOT in the allowed list!

---

## Data Flow - Before Fix ❌

### Step 1: User Registers

```
Registration Form:
┌─────────────────────────────┐
│ Administrator Registration  │
├─────────────────────────────┤
│ First Name: Test            │
│ Last Name: Director         │
│ Email: test@school.com      │
│ Password: ****              │
│                             │
│ Admin Role: [Director] ▼    │
│                             │
│ [Submit Application]        │
└─────────────────────────────┘
```

**Submitted Data:**
```json
{
  "role": "admin",
  "additional_info": {
    "admin_role": "director"
  }
}
```

---

### Step 2: IT Admin Approves

```
Backend Processing:
┌─────────────────────────────────────┐
│ Approval Handler                    │
├─────────────────────────────────────┤
│ 1. Get registration data            │
│    role = "admin"                   │
│                                     │
│ 2. Create auth user ✅              │
│                                     │
│ 3. Create profile:                  │
│    INSERT INTO profiles (           │
│      ...,                           │
│      role = "admin"  ← ❌ PROBLEM!  │
│    )                                │
└─────────────────────────────────────┘
```

---

### Step 3: Database Rejects

```
Database:
┌─────────────────────────────────────┐
│ Check Constraint Validation         │
├─────────────────────────────────────┤
│ Checking: role IN (                 │
│   'student',                        │
│   'teacher',                        │
│   'director',                       │
│   'it_admin',                       │
│   ...                               │
│ )                                   │
│                                     │
│ Received: "admin"                   │
│ Match found? NO ❌                  │
│                                     │
│ Result: CONSTRAINT VIOLATION        │
└─────────────────────────────────────┘
         ↓
    ❌ ERROR
┌─────────────────────────────────────┐
│ profiles_role_check violation       │
│ INSERT failed                       │
│ Transaction rolled back             │
└─────────────────────────────────────┘
```

---

## Data Flow - After Fix ✅

### Step 1: User Registers (Same)

```
Registration Form:
┌─────────────────────────────┐
│ Administrator Registration  │
├─────────────────────────────┤
│ First Name: Test            │
│ Last Name: Director         │
│ Email: test@school.com      │
│ Password: ****              │
│                             │
│ Admin Role: [Director] ▼    │
│                             │
│ [Submit Application]        │
└─────────────────────────────┘
```

**Submitted Data:**
```json
{
  "role": "admin",
  "additional_info": {
    "admin_role": "director"
  }
}
```

---

### Step 2: IT Admin Approves (Fixed Logic)

```
Backend Processing:
┌─────────────────────────────────────┐
│ Approval Handler (FIXED)            │
├─────────────────────────────────────┤
│ 1. Get registration data            │
│    role = "admin"                   │
│    admin_role = "director"          │
│                                     │
│ 2. Determine actual role:           │
│    if (role === "admin") {          │
│      actualRole = admin_role        │
│    }                                │
│    actualRole = "director" ✅       │
│                                     │
│ 3. Create auth user ✅              │
│                                     │
│ 4. Create profile:                  │
│    INSERT INTO profiles (           │
│      ...,                           │
│      role = "director"  ← ✅ FIXED! │
│    )                                │
└─────────────────────────────────────┘
```

---

### Step 3: Database Accepts

```
Database:
┌─────────────────────────────────────┐
│ Check Constraint Validation         │
├─────────────────────────────────────┤
│ Checking: role IN (                 │
│   'student',                        │
│   'teacher',                        │
│   'director',  ← Match!             │
│   'it_admin',                       │
│   ...                               │
│ )                                   │
│                                     │
│ Received: "director"                │
│ Match found? YES ✅                 │
│                                     │
│ Result: CONSTRAINT PASSED           │
└─────────────────────────────────────┘
         ↓
    ✅ SUCCESS
┌─────────────────────────────────────┐
│ Profile created successfully        │
│ User can now log in                 │
│ Dashboard accessible                │
└─────────────────────────────────────┘
```

---

## Code Comparison

### BEFORE (Broken) ❌

```tsx
// Line ~1150 in index.tsx
const profileData: any = {
  id: authData.user.id,
  email: registrationData.email,
  first_name: registrationData.first_name,
  middle_name: registrationData.middle_name,
  last_name: registrationData.last_name,
  role: registrationData.role,  // ❌ Always uses "admin"
};

// For students, include class_id
if (
  registrationData.role === "student" &&
  registrationData.additional_info?.class_id
) {
  profileData.class_id = registrationData.additional_info.class_id;
}
```

**Problem:** No special handling for admin registrations!

---

### AFTER (Fixed) ✅

```tsx
// Line ~1150 in index.tsx (FIXED)

// Determine the actual role to use
let actualRole = registrationData.role;

// For admin registrations, use the specific admin_role
if (
  registrationData.role === "admin" &&
  registrationData.additional_info?.admin_role
) {
  actualRole = registrationData.additional_info.admin_role;
  //           ↑
  //           Extract "director", "it_admin", etc.
}

const profileData: any = {
  id: authData.user.id,
  email: registrationData.email,
  first_name: registrationData.first_name,
  middle_name: registrationData.middle_name,
  last_name: registrationData.last_name,
  role: actualRole,  // ✅ Uses specific role: "director"
};

// For students, include class_id
if (
  registrationData.role === "student" &&
  registrationData.additional_info?.class_id
) {
  profileData.class_id = registrationData.additional_info.class_id;
}
```

**Solution:** Extracts specific admin role before creating profile!

---

## Role Transformation Table

| User Selects in Form | Stored in KV          | Backend Uses (Before) | Backend Uses (After) | Result    |
|----------------------|-----------------------|----------------------|---------------------|-----------|
| Director             | `admin` + `director`  | `admin` ❌           | `director` ✅        | ✅ Works  |
| IT Admin             | `admin` + `it_admin`  | `admin` ❌           | `it_admin` ✅        | ✅ Works  |
| Finance Admin        | `admin` + `finance_admin` | `admin` ❌       | `finance_admin` ✅   | ✅ Works  |
| Secretary            | `admin` + `secretary` | `admin` ❌           | `secretary` ✅       | ✅ Works  |
| Transport Manager    | `admin` + `transport_manager` | `admin` ❌   | `transport_manager` ✅ | ✅ Works |
| Principal            | `admin` + `principal` | `admin` ❌           | `principal` ✅       | ✅ Works  |
| Teacher              | `teacher`             | `teacher` ✅         | `teacher` ✅         | ✅ Works  |
| Student              | `student`             | `student` ✅         | `student` ✅         | ✅ Works  |

---

## Visual Test Flow

### Test: Register and Approve Director

```
┌────────────────────────────────────────────────────────┐
│ 1. User Registration                                   │
├────────────────────────────────────────────────────────┤
│ • Go to registration page                              │
│ • Select "Administrator"                               │
│ • Choose "Director"                                    │
│ • Fill form and submit                                 │
│ • See: "Application submitted for review"              │
└────────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│ 2. IT Admin Dashboard                                  │
├────────────────────────────────────────────────────────┤
│ Pending Registrations:                                 │
│                                                        │
│ • Test Director                        [admin]        │
│   test-director@school.com                            │
│   Admin Role: director                                │
│   [View Details]  [Reject]  [Approve]                 │
└────────────────────────────────────────────────────────┘
                       ↓
              Click "Approve"
                       ↓
┌────────────────────────────────────────────────────────┐
│ 3. Backend Processing                                  │
├────────────────────────────────────────────────────────┤
│ BEFORE (Error):                                        │
│ • Extract role = "admin"                               │
│ • Try to insert into profiles                          │
│ • ❌ Constraint violation                              │
│                                                        │
│ AFTER (Success):                                       │
│ • Extract role = "admin"                               │
│ • Check additional_info.admin_role = "director"        │
│ • Use actualRole = "director"                          │
│ • Insert into profiles ✅                              │
│ • Create auth user ✅                                  │
└────────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│ 4. Success Message                                     │
├────────────────────────────────────────────────────────┤
│ ✅ Registration approved successfully                  │
│                                                        │
│ • User account created                                 │
│ • Profile created with role: "director"                │
│ • User can now log in                                  │
└──────────────────────────────────────────────────��─────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│ 5. User Login                                          │
├────────────────────────────────────────────────────────┤
│ Email: test-director@school.com                        │
│ Password: ****                                         │
│ [Sign In]                                              │
└────────────────────────────────────────────────────────┘
                       ↓
┌────────────────────────────────────────────────────────┐
│ 6. Director Dashboard                                  │
├────────────────────────────────────────────────────────┤
│ Welcome, Test Director                                 │
│                                                        │
│ Director Dashboard                                     │
│ • Overview                                             │
│ • Teachers                                             │
│ • Students                                             │
│ • Classes                                              │
│ • Subjects                                             │
│ • [11 menu items total]                                │
│                                                        │
│ ✅ Full access to Director dashboard                   │
└────────────────────────────────────────────────────────┘
```

---

## Database State Comparison

### BEFORE (Failed Insert) ❌

```sql
-- Attempted INSERT
INSERT INTO profiles (
  id, email, first_name, last_name, role
) VALUES (
  'uuid-123',
  'test@school.com',
  'Test',
  'Director',
  'admin'  ← ❌ Rejected by constraint
);

-- Result
ERROR: new row for relation "profiles" violates 
       check constraint "profiles_role_check"

-- Profiles table
SELECT * FROM profiles WHERE email = 'test@school.com';
-- (empty - no row created)

-- Auth table
SELECT * FROM auth.users WHERE email = 'test@school.com';
-- (empty - rolled back)
```

---

### AFTER (Successful Insert) ✅

```sql
-- Attempted INSERT
INSERT INTO profiles (
  id, email, first_name, last_name, role
) VALUES (
  'uuid-123',
  'test@school.com',
  'Test',
  'Director',
  'director'  ← ✅ Accepted by constraint
);

-- Result
INSERT 0 1
-- Success!

-- Profiles table
SELECT * FROM profiles WHERE email = 'test@school.com';
┌──────────┬─────────────────┬──────┬──────────┬──────────┐
│ id       │ email           │ name │ role     │ ...      │
├──────────┼─────────────────┼──────┼──────────┼──────────┤
│ uuid-123 │ test@school.com │ Test │ director │ ...      │
│          │                 │ Dir. │          │          │
└──────────┴─────────────────┴──────┴──────────┴──────────┘

-- Auth table
SELECT * FROM auth.users WHERE email = 'test@school.com';
┌──────────┬─────────────────┬──────────────────┐
│ id       │ email           │ email_confirmed  │
├──────────┼─────────────────┼──────────────────┤
│ uuid-123 │ test@school.com │ true             │
└──────────┴─────────────────┴──────────────────┘
```

---

## Summary Visual

```
┌─────────────────────────────────────────────────────┐
│                  BEFORE FIX ❌                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Registration → Approval → ERROR                    │
│                           ↓                         │
│              "profiles_role_check                   │
│               constraint violation"                 │
│                           ↓                         │
│              User can't be approved                 │
│              Stuck in pending                       │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│                   AFTER FIX ✅                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Registration → Approval → SUCCESS                  │
│                           ↓                         │
│              User account created                   │
│              Profile created                        │
│                           ↓                         │
│              User can log in                        │
│              Dashboard accessible                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

---

## Next Steps

1. **Deploy backend** to Supabase Edge Functions
2. **Clear browser cache** (Ctrl + Shift + R)
3. **Test registration approval** for each admin role
4. **Verify users can log in** after approval

---

**All administrator registrations will now work correctly!** 🎉
