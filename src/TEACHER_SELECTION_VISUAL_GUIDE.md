# Teacher Selection Field - Visual Guide

## 🎨 What It Looks Like

### When Deadline is Expired (Admin View Only)

```
┌─────────────────────────────────────────────────────────────┐
│  ⚠️  Upload Deadline Expired                                │
│  Deadline has passed. As an admin, you can upload on        │
│  behalf of teachers. Please select the teacher below.       │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Upload Details                                              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ ┌─────────────────────────────────────────────────────────┐ │
│ │  📝 Uploading on behalf of Teacher *                   │ │
│ │                                                         │ │
│ │  ┌──────────────────────────────────────────────────┐  │ │
│ │  │ Select teacher                              ▼    │  │ │
│ │  └──────────────────────────────────────────────────┘  │ │
│ │                                                         │ │
│ │  ℹ️  This upload will be tracked under the selected    │ │
│ │     teacher's compliance but marked as                 │ │
│ │     "Uploaded by Principal"                            │ │
│ └─────────────────────────────────────────────────────────┘ │
│                                                             │
│  Title *                                                    │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Enter resource title                                 │  │
│  └──────────────────────────────────────────────────────┘  │
│                                                             │
│  ... (rest of form)                                         │
└─────────────────────────────────────────────────────────────┘
```

### Teacher Dropdown Options

```
┌──────────────────────────────────────────────────────────┐
│ Select teacher                                      ▼    │
└──────────────────────────────────────────────────────────┘
  ┌────────────────────────────────────────────────────────┐
  │ Dr. Ahmed Hassan (ahmed.hassan@school.edu)            │
  ├────────────────────────────────────────────────────────┤
  │ Ms. Sarah Wilson (sarah.wilson@school.edu)            │
  ├────────────────────────────────────────────────────────┤
  │ Mr. John Smith (john.smith@school.edu)                │
  ├────────────────────────────────────────────────────────┤
  │ Mrs. Mary Johnson (mary.johnson@school.edu)           │
  └────────────────────────────────────────────────────────┘
```

## 📋 Field Specifications

### Container Styling
- **Background**: Light yellow (#fef9c3 / yellow-50)
- **Border**: Yellow (#fde047 / yellow-200)
- **Padding**: 12px (p-3)
- **Rounded corners**: Yes

### Label
- **Text**: "Uploading on behalf of Teacher *"
- **Color**: Dark yellow (#713f12 / yellow-900)
- **Weight**: Semibold

### Dropdown
- **Background**: White
- **Margin-top**: 8px (mt-2)
- **Shows**: Teacher name and email
- **Format**: `{firstName} {middleName} {lastName} ({email})`

### Helper Text
- **Size**: Extra small (text-xs)
- **Color**: Dark yellow (#713f12 / yellow-700)
- **Margin-top**: 8px (mt-2)

## 🎯 When It Appears

### Shows When:
1. ✅ User role is "admin" or "principal"
2. ✅ Deadline is expired (`deadlineInfo.isExpired === true`)
3. ✅ OR `deadlineInfo.requiresTeacherSelection === true`

### Hidden When:
1. ❌ User is a teacher
2. ❌ Deadline has NOT expired
3. ❌ Admin is uploading normally before deadline

## 🔄 Data Flow

```
User Selects Teacher
       ↓
selectedTeacher state updated
       ↓
On Submit:
  - payload.on_behalf_of_teacher_id = selectedTeacher
  - payload.uploaded_by_admin = true
       ↓
Backend saves to database:
  - teacher_id = selectedTeacher (not current user!)
  - uploaded_by_admin = true
  - admin_id = current user ID
       ↓
Compliance tracking:
  - Shows under selected teacher
  - Marked "Uploaded by Principal"
```

## 🎨 Color Scheme Summary

| Element | Color | Purpose |
|---------|-------|---------|
| Container Background | Yellow-50 | Highlight special field |
| Container Border | Yellow-200 | Emphasize boundary |
| Label Text | Yellow-900 | Strong contrast |
| Helper Text | Yellow-700 | Readable explanation |
| Dropdown BG | White | Standard input feel |
| Purple Badge | Purple-100 | "Uploaded by Principal" |

## 📱 Responsive Behavior

### Mobile (< 640px)
- Full width
- Dropdown takes full width
- Text wraps appropriately
- Padding adjusts for touch

### Tablet (640px - 1024px)
- Maintains layout
- Comfortable tap targets
- Clear visual hierarchy

### Desktop (> 1024px)
- Optimal spacing
- Side-by-side with other fields
- Hover states visible

## 🎭 User Experience Flow

### Teacher Experience (After Deadline):
```
1. Opens upload form
2. Sees RED alert: "Deadline Expired - Contact admin"
3. Form disabled
4. NO teacher selection field visible
```

### Admin Experience (After Deadline):
```
1. Opens upload form
2. Sees ORANGE alert: "Can upload on behalf of teachers"
3. Sees YELLOW teacher selection field
4. Selects teacher
5. Fills rest of form normally
6. Submits
7. Success: "Upload saved for [Teacher Name]"
```

## 💡 Best Practices

### For Admins:
1. Always select the correct teacher
2. Double-check before submitting
3. Add clear title indicating it's remedial
4. Consider adding description explaining circumstances

### For System Design:
1. Field is visually distinct (yellow)
2. Required field indicator (*)
3. Helper text explains impact
4. Teacher info shown for verification
5. Email included prevents confusion

## 🐛 Troubleshooting

### Teacher Dropdown Empty?
- Check: Admin has proper role in database
- Check: Teachers exist in profiles table
- Check: Network request succeeded
- Check: Console for errors

### Field Not Showing?
- Verify: User is admin
- Verify: Deadline is actually expired
- Verify: deadlineInfo state populated
- Check: Console logs for deadline check

### Upload Goes to Wrong Teacher?
- Verify: Correct teacher selected
- Check: selectedTeacher state before submit
- Review: Database teacher_id value
- Audit: admin_id matches current user

## 🎉 Success Indicators

### You'll Know It's Working When:
1. ✅ Yellow field appears for admin after deadline
2. ✅ All teachers load in dropdown
3. ✅ Selected teacher name persists
4. ✅ Upload succeeds
5. ✅ Upload appears in selected teacher's compliance
6. ✅ Purple "Uploaded by Principal" badge shows
7. ✅ Admin ID recorded in database

This visual guide should help you understand exactly how the teacher selection feature looks and behaves!
