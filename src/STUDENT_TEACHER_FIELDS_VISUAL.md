# 📊 Student & Teacher Fields - Visual Guide

## 🎓 Student Registration Form

### Before ❌
```
┌─────────────────────────────────────┐
│  Student Registration               │
├─────────────────────────────────────┤
│  First Name: [________]             │
│  Last Name:  [________]             │
│  Email:      [________]             │
│  Password:   [________]             │
│  Class:      [Dropdown]             │
│  Parent Phone: [________]           │
└─────────────────────────────────────┘
```

### After ✅
```
┌─────────────────────────────────────┐
│  Student Registration               │
├─────────────────────────────────────┤
│  First Name: [________]             │
│  Last Name:  [________]             │
│  Email:      [________]             │
│  Password:   [________]             │
│                                     │
│  ┌── NEW FIELDS ──────────────┐    │
│  │ Gender: [Male/Female ▼] *  │    │
│  │ Date of Birth: [📅] *      │    │
│  │ Student Phone: [________]  │    │
│  └────────────────────────────┘    │
│                                     │
│  Class:        [Dropdown]           │
│  Parent Phone: [________]           │
│  Previous School: [________]        │
└─────────────────────────────────────┘

* = Required field
```

---

## 👨‍🏫 Teacher Registration Form

### Before ❌
```
┌─────────────────────────────────────┐
│  Teacher Registration               │
├─────────────────────────────────────┤
│  First Name: [________]             │
│  Last Name:  [________]             │
│  Email:      [________]             │
│  Password:   [________]             │
│  Qualifications: [________]         │
│  Subjects:   [________]             │
│  Experience: [Dropdown]             │
└─────────────────────────────────────┘
```

### After ✅
```
┌─────────────────────────────────────┐
│  Teacher Registration               │
├─────────────────────────────────────┤
│  First Name: [________]             │
│  Last Name:  [________]             │
│  Email:      [________]             │
│  Password:   [________]             │
│                                     │
│  ┌── NEW FIELDS ──────────────┐    │
│  │ Phone: [________]          │    │
│  │ Employment Type:           │    │
│  │ [Full-time/Part-time ▼] * │    │
│  └────────────────────────────┘    │
│                                     │
│  Qualifications: [________]         │
│  Subjects:   [________]             │
│  Experience: [Dropdown]             │
└─────────────────────────────────────┘

* = Required field
```

---

## 🗄️ Database Schema Changes

### profiles Table - Before
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  role TEXT,
  class_id UUID,
  is_part_time BOOLEAN,  -- Already exists! ✅
  ...
);
```

### profiles Table - After
```sql
CREATE TABLE profiles (
  id UUID PRIMARY KEY,
  first_name TEXT,
  middle_name TEXT,
  last_name TEXT,
  email TEXT UNIQUE,
  role TEXT,
  class_id UUID,
  
  -- ✨ NEW COLUMNS ✨
  admission_number TEXT UNIQUE,     -- Auto-generated: ADM2025001
  phone TEXT,                        -- For students & teachers
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  date_of_birth DATE,               -- For students
  
  -- Already existed
  is_part_time BOOLEAN,             -- For teachers ✅
  ...
);
```

---

## 🔄 Data Flow

### Student Registration → Database

```
Frontend Form
┌────────────────────────────┐
│ First Name: John           │
│ Last Name: Doe             │
│ Gender: Male               │  ← NEW!
│ Date of Birth: 2010-05-15  │  ← NEW!
│ Student Phone: 08012345678 │  ← NEW!
│ Class: JSS1 A              │
└────────────────────────────┘
         ↓
    JSON Payload
┌────────────────────────────┐
│ {                          │
│   first_name: "John",      │
│   last_name: "Doe",        │
│   role: "student",         │
│   additional_info: {       │
│     gender: "Male",        │  ← NEW!
│     date_of_birth:         │  ← NEW!
│       "2010-05-15",        │
│     phone: "08012345678",  │  ← NEW!
│     class_id: "uuid..."    │
│   }                        │
│ }                          │
└────────────────────────────┘
         ↓
   Backend Processing
┌────────────────────────────┐
│ 1. Store in KV (pending)   │
│ 2. IT Admin approves       │
│ 3. Generate admission #:   │
│    → ADM2025001            │  ← AUTO!
│ 4. Insert into profiles    │
└────────────────────────────┘
         ↓
    Database Row
┌────────────────────────────────────┐
│ first_name: John                   │
│ last_name: Doe                     │
│ admission_number: ADM2025001       │  ← AUTO-GENERATED!
│ gender: Male                       │  ← FROM FORM!
│ date_of_birth: 2010-05-15         │  ← FROM FORM!
│ phone: 08012345678                │  ← FROM FORM!
│ role: student                      │
│ class_id: uuid...                  │
└────────────────────────────────────┘
```

### Teacher Registration → Database

```
Frontend Form
┌────────────────────────────┐
│ First Name: Jane           │
│ Last Name: Smith           │
│ Phone: 08123456789         │  ← NEW!
│ Employment: Part-time      │  ← NEW!
│ Qualifications: B.Ed Math  │
└────────────────────────────┘
         ↓
    JSON Payload
┌────────────────────────────┐
│ {                          │
│   first_name: "Jane",      │
│   last_name: "Smith",      │
│   role: "teacher",         │
│   additional_info: {       │
│     phone: "08123456789",  │  ← NEW!
│     is_part_time: "true",  │  ← NEW! (string)
│     qualifications: "..."  │
│   }                        │
│ }                          │
└────────────────────────────┘
         ↓
   Backend Processing
┌────────────────────────────┐
│ 1. Store in KV (pending)   │
│ 2. IT Admin approves       │
│ 3. Convert is_part_time:   │
│    "true" → true           │  ← BOOLEAN CONVERSION!
│ 4. Insert into profiles    │
└────────────────────────────┘
         ↓
    Database Row
┌────────────────────────────────────┐
│ first_name: Jane                   │
│ last_name: Smith                   │
│ phone: 08123456789                │  ← FROM FORM!
│ is_part_time: TRUE                │  ← CONVERTED TO BOOLEAN!
│ role: teacher                      │
└────────────────────────────────────┘
```

---

## 🎯 Admission Number Generation

### Algorithm

```
Current Year: 2025
Existing Students: 0

Step 1: Count students in database → 0
Step 2: Add 1 → 1
Step 3: Pad to 3 digits → "001"
Step 4: Combine: "ADM" + "2025" + "001"
Result: ADM2025001
```

### Sequential Examples

| Student # | Count | Padded | Admission Number |
|-----------|-------|--------|------------------|
| 1st       | 0+1=1 | 001    | ADM2025001       |
| 2nd       | 1+1=2 | 002    | ADM2025002       |
| 10th      | 9+1=10| 010    | ADM2025010       |
| 100th     | 99+1  | 100    | ADM2025100       |
| 999th     | 998+1 | 999    | ADM2025999       |

### Format Breakdown

```
ADM    2025    001
 │      │      │
 │      │      └─── Sequential number (3 digits, zero-padded)
 │      └────────── Current year
 └───────────────── Prefix (Admission)
```

---

## ✅ Boolean Conversion (is_part_time)

### Frontend → Backend

```
User selects in form:
┌──────────────────────────┐
│ Employment Type:         │
│ ○ Full-time Teacher      │
│ ● Part-time Teacher      │  ← Selected
└──────────────────────────┘

Sent as JSON:
{
  is_part_time: "true"  ← STRING!
}

Backend receives and converts:
const isPartTime = value === "true" || value === true;
// "true" → true ✅

Stored in database:
is_part_time: TRUE  ← BOOLEAN!
```

### Possible Values

| Frontend Select | JSON Value | Backend Converts | Database Stores |
|----------------|------------|------------------|-----------------|
| Full-time      | "false"    | → false          | FALSE           |
| Part-time      | "true"     | → true           | TRUE            |

---

## 📋 Field Summary

### Student Fields
| Field | Type | Required | Auto-Generated | Example |
|-------|------|----------|----------------|---------|
| admission_number | TEXT | ✅ | ✅ | ADM2025001 |
| gender | TEXT | ✅ | ❌ | Male |
| date_of_birth | DATE | ✅ | ❌ | 2010-05-15 |
| phone | TEXT | ❌ | ❌ | 08012345678 |

### Teacher Fields
| Field | Type | Required | Auto-Generated | Example |
|-------|------|----------|----------------|---------|
| phone | TEXT | ❌ | ❌ | 08123456789 |
| is_part_time | BOOLEAN | ✅ | ❌ | TRUE |

---

## 🚦 Validation Rules

### Gender
```sql
CHECK (gender IN ('Male', 'Female'))
```
- ✅ Allowed: "Male", "Female"
- ❌ Rejected: "M", "F", "male", "female", null (for students)

### Admission Number
```sql
UNIQUE
```
- ✅ Each student gets unique number
- ❌ Cannot have duplicates
- ✅ Auto-generated, no conflicts

### Date of Birth
```sql
DATE type
```
- ✅ Format: YYYY-MM-DD (2010-05-15)
- ✅ Valid dates only
- ❌ Cannot be in the future (form validation)

### Phone
```sql
TEXT (no validation)
```
- ✅ Any format accepted
- ✅ Nigerian: 08012345678
- ✅ International: +2348012345678
- ✅ Optional for both students and teachers

---

## 🎉 Complete!

All fields added, tested, and documented!
