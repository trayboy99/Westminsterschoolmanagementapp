# 🎓 Alumni Login Portal - Testing Guide

## ✅ What Was Built

### Backend Endpoints (in `/supabase/functions/server/index.tsx`)
1. **POST `/alumni/login`** - Verify alumni by name + graduation session
2. **POST `/alumni/verify-pin`** - Verify transcript PIN and check fees clearance
3. **GET `/alumni/graduation-sessions`** - Get available graduation sessions for dropdown

### Frontend Components
1. **AlumniLoginPortal** (`/components/auth/AlumniLoginPortal.tsx`) - Complete 3-step portal
2. **LoginForm** - Updated with "Alumni Transcript Portal" link
3. **App.tsx** - Added alumni routing

---

## 🧪 How to Test

### Step 1: Access the Alumni Portal
1. Go to your login page
2. Click on **"Alumni Transcript Portal"** (green link at bottom)
3. You'll be redirected to the alumni portal

### Step 2: Test Alumni Login (First Step)
The portal will:
- Show a dropdown with available graduation sessions (fetched from database)
- Ask for first name and last name
- Verify the alumni exists in `graduated_students` table

**Test Data Needed:**
You need students who have been graduated through the promotion system. They should be in the `graduated_students` table.

### Step 3: Test Fees Clearance Check (Second Step)
After successful login:
- Shows alumni information (name, admission number, class)
- Displays fees clearance status
  - ✅ Green if `fees_cleared = true`
  - ⚠️ Yellow if `fees_cleared = false` with outstanding balance
- Asks for transcript PIN

### Step 4: Test PIN Verification (Third Step)
- Enter the 12-digit transcript PIN
- System checks:
  1. PIN exists and is active
  2. PIN belongs to this alumni
  3. PIN hasn't expired
  4. Fees are cleared (if required)
- Records the transcript request in `transcript_requests` table

### Step 5: View Transcript
- Shows success message
- Displays alumni details
- Placeholder for transcript content (to be implemented)
- Download button (placeholder)

---

## 📋 Prerequisites

Before testing, ensure you have:

### 1. Graduated Students in Database
Run the promotion system to graduate SS3 students, or manually insert:

```sql
INSERT INTO graduated_students (
  student_id,
  first_name,
  last_name,
  middle_name,
  admission_number,
  graduation_session,
  graduation_class,
  graduation_date,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  is_active
) VALUES (
  'some-student-uuid',
  'John',
  'Doe',
  'Michael',
  'ADM2024001',
  '2024/2025',
  'SS3',
  NOW(),
  true,
  true, -- Set to false to test fees clearance
  0,
  true
);
```

### 2. Transcript PINs
Generate a PIN for the alumni:

```sql
INSERT INTO transcript_pins (
  graduated_student_id,
  pin_code,
  generated_by,
  generated_at,
  expires_at,
  is_active,
  max_uses,
  current_uses
) VALUES (
  'graduated-student-uuid',
  'ABC123XYZ456', -- 12-digit PIN
  'admin-uuid',
  NOW(),
  NOW() + INTERVAL '1 year',
  true,
  3,
  0
);
```

---

## 🎯 Test Scenarios

### ✅ Scenario 1: Successful Login & PIN Verification
1. Alumni exists with fees cleared
2. Valid PIN
3. Should successfully access transcript

### ✅ Scenario 2: Alumni Not Found
1. Enter wrong name or graduation session
2. Should show error: "No matching alumni record found"

### ✅ Scenario 3: Fees Not Cleared
1. Alumni exists but `fees_cleared = false`
2. Enter valid PIN
3. Should show error: "Fees clearance required. Outstanding balance: ₦X"

### ✅ Scenario 4: Invalid PIN
1. Alumni exists with fees cleared
2. Enter wrong PIN
3. Should show error: "Invalid or inactive PIN"

### ✅ Scenario 5: Expired PIN
1. Alumni exists with fees cleared
2. PIN exists but `expires_at` is in the past
3. Should show error: "PIN has expired"

---

## 🎨 UI Features

### Three-Step Process
1. **Login** (Green gradient) - Enter name + graduation session
2. **PIN Entry** (Blue) - Enter transcript PIN, view fees status
3. **Transcript** (Green success) - View and download transcript

### Visual Indicators
- ✅ Green badges for success/cleared fees
- ⚠️ Yellow alerts for pending fees
- ❌ Red alerts for errors
- 🔄 Loading spinners during API calls

### User Experience
- Clear step-by-step flow
- Validation on all inputs
- Helpful error messages
- Back navigation at each step
- Toast notifications for feedback

---

## 🔧 Quick Debug Commands

### Check if Alumni Exists
```sql
SELECT * FROM graduated_students 
WHERE first_name ILIKE 'john' 
  AND last_name ILIKE 'doe' 
  AND graduation_session = '2024/2025'
  AND is_active = true;
```

### Check PIN for Alumni
```sql
SELECT * FROM transcript_pins 
WHERE graduated_student_id = 'your-alumni-uuid'
  AND is_active = true;
```

### View All Graduation Sessions
```sql
SELECT DISTINCT graduation_session 
FROM graduated_students 
WHERE is_active = true
ORDER BY graduation_session DESC;
```

### Check Transcript Requests
```sql
SELECT * FROM transcript_requests 
ORDER BY created_at DESC 
LIMIT 10;
```

---

## 🚀 Next Steps

The portal is ready for:
1. ✅ Alumni login verification
2. ✅ Fees clearance checking
3. ✅ PIN verification
4. ✅ Access logging

**To Complete:**
- [ ] Fetch actual academic records from marks table
- [ ] Generate formatted transcript PDF
- [ ] Implement download functionality
- [ ] Add email notification system

---

## 📝 Notes

- Alumni don't need a user account - they log in with name only
- System is secure with PIN verification
- Fees clearance is enforced before transcript access
- All access attempts are logged in `transcript_requests`
- PINs can have expiry dates and usage limits

---

## 🎉 Test It Now!

1. Navigate to login page
2. Click "Alumni Transcript Portal"
3. Select a graduation session
4. Enter alumni name
5. Enter PIN
6. Access transcript!

**The system is fully functional and ready for testing!** 🚀
