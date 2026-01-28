# 📅 Teacher Deadline Notifications - Visual Guide

## What Teachers See (No Deadline Input Fields!)

### ✅ IMPORTANT: Teachers CANNOT Set Deadlines
- Teachers only see **READ-ONLY NOTIFICATIONS**
- No input fields for deadline dates
- No ability to create/edit deadlines
- Must contact admin to change deadlines

### Deadline setting is **ADMIN-ONLY** via Upload Settings

---

## Scenario 1: No Deadline Set

### What Teacher Sees:
```
┌─────────────────────────────────────────────────────────────┐
│ ✅ No Deadline Set - Upload Anytime                         │
│                                                              │
│ There is currently no deadline for uploading e-notes for    │
│ First Term, 2025/2026.                                       │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Current Status: Upload Enabled ✅                       │  │
│ │                                                          │  │
│ │ ⚠️ Note: If a deadline is set later by the             │  │
│ │ administrator, the upload button will be automatically  │  │
│ │ disabled after that deadline expires.                   │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

[Upload Files] ← Button is ENABLED ✅
```

**Button State:** ✅ ENABLED
**Can Upload:** ✅ YES

---

## Scenario 2: Deadline Active (Not Expired)

### What Teacher Sees:
```
┌─────────────────────────────────────────────────────────────┐
│ 📅 Upload Deadline Set                                       │
│                                                              │
│ Deadline: December 15, 2025, 11:59:00 PM                    │
│ Term/Session: First Term, 2025/2026                          │
│ Type: e-notes                                                │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ ⚠️ Important:                                          │  │
│ │ • The upload button will be automatically disabled      │  │
│ │   after the deadline                                    │  │
│ │ • You must complete your upload before the deadline     │  │
│ │   expires                                               │  │
│ │ • Current Status: Upload Enabled ✅                     │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

[Upload Files] ← Button is ENABLED ✅
```

**Button State:** ✅ ENABLED
**Can Upload:** ✅ YES
**Warning:** Upload button will disable on Dec 15, 2025 at 11:59 PM

---

## Scenario 3: Deadline Expired ❌

### What Teacher Sees:
```
┌─────────────────────────────────────────────────────────────┐
│ ❌ Upload Deadline Expired                                   │
│                                                              │
│ The deadline for uploading has passed. You can no longer    │
│ upload files for this term/session.                         │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Upload Blocked:                                         │  │
│ │ • Term: First Term                                      │  │
│ │ • Session: 2025/2026                                    │  │
│ │ • Type: e-notes                                         │  │
│ │                                                          │  │
│ │ Upload Button: DISABLED ❌                              │  │
│ └────────────────────────────────────────────────────────┘  │
│                                                              │
│ Please contact the administrator if you need to upload      │
│ files after the deadline.                                   │
└─────────────────────────────────────────────────────────────┘

[Upload Files] ← Button is DISABLED ❌ (grayed out, cannot click)
```

**Button State:** ❌ DISABLED
**Can Upload:** ❌ NO
**Action Required:** Contact administrator

---

## What Admin Sees (Different from Teachers!)

### When Deadline is Expired (Admin Override):
```
┌─────────────────────────────────────────────────────────────┐
│ ⚠️ Deadline Expired                                         │
│                                                              │
│ Upload deadline has passed. As an admin, you can upload     │
│ on behalf of teachers. Please select the teacher below.     │
│                                                              │
│ ┌────────────────────────────────────────────────────────┐  │
│ │ Term: First Term                                        │  │
│ │ Session: 2025/2026                                      │  │
│ │ Type: e-notes                                           │  │
│ │ Button State: ENABLED ✅ (Admin Override Active)       │  │
│ └────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Upload for Teacher *                                         │
│ ⚠️ Deadline expired - You can upload for teachers who       │
│ missed the deadline                                         │
│                                                              │
│ [Select teacher (or upload for yourself)  ▼]                │
│                                                              │
│ 💡 Upload will be tracked under the selected teacher but    │
│ marked as "Uploaded by Principal"                           │
└─────────────────────────────────────────────────────────────┘

[Upload Files] ← Button is ENABLED ✅ (Admin can always upload)
```

**Admin Privilege:** Can upload even after deadline
**Special Feature:** Teacher selection dropdown appears
**Tracking:** Upload marked as "Uploaded by Principal"

---

## Form Fields (Teachers vs Admins)

### ❌ Teachers DO NOT See:
- ❌ Deadline date/time input field
- ❌ "Set Deadline" button
- ❌ Deadline creation form
- ❌ Teacher selection dropdown (only admins)

### ✅ Teachers ONLY See:
- ✅ Title field
- ✅ Class dropdown
- ✅ Subject dropdown
- ✅ Upload Type dropdown
- ✅ File upload area
- ✅ Description textarea
- ✅ **READ-ONLY** deadline notification banners

### 🔐 Admin-Only Features:
- Upload Settings menu (create/edit deadlines)
- Teacher selection dropdown (when deadline expired)
- Admin override (upload after deadline)

---

## Complete Upload Form Layout (Teacher View)

```
╔═══════════════════════════════════════════════════════════╗
║ Upload Learning Materials                    [Cancel][Save][Upload Files] ║
║ Share e-notes, exam questions, assignments, and resources  ║
╠═══════════════════════════════════════════════════════════╣
║                                                            ║
║ ┌──────────────────────────────────────────────────────┐  ║
║ │ 📅 DEADLINE NOTIFICATION BANNER (READ-ONLY)          │  ║
║ │ Shows deadline status and button state               │  ║
║ │ Color: Green (no deadline), Blue (active), Red (exp) │  ║
║ └──────────────────────────────────────────────────────┘  ║
║                                                            ║
║ ┌─────────────────────────────────────────────────────┐   ║
║ │ Upload Details                                      │   ║
║ ├─────────────────────────────────────────────────────┤   ║
║ │ Title *                                             │   ║
║ │ [e.g., Quadratic Equations - Chapter 5           ]  │   ║
║ │                                                     │   ║
║ │ Class *                                             │   ║
║ │ [Select class                               ▼]     │   ║
║ │                                                     │   ║
║ │ Subject *                                           │   ║
║ │ [Choose class to see subjects               ▼]     │   ║
║ │                                                     │   ║
║ │ Upload Type *                                       │   ║
║ │ [E-Notes                                    ▼]     │   ║
║ │                                                     │   ║
║ │ Description                                         │   ║
║ │ [Describe the content...                        ]  │   ║
║ └─────────────────────────────────────────────────────┘   ║
║                                                            ║
║ ┌─────────────────────────────────────────────────────┐   ║
║ │ File Upload                                         │   ║
║ ├─────────────────────────────────────────────────────┤   ║
║ │ [📁 Click to select files or drag and drop]        │   ║
║ │                                                     │   ║
║ │ Maximum 5 files, up to 50 MB each                  │   ║
║ └─────────────────────────────────────────────────────┘   ║
║                                                            ║
║ ⚠️ NO DEADLINE INPUT FIELDS - Teachers cannot set deadlines!  ║
║ ⚠️ Deadline setting is ADMIN-ONLY via Upload Settings menu   ║
╚═══════════════════════════════════════════════════════════╝
```

---

## How Deadline System Works

### Timeline Example:

```
Dec 1, 2025                Dec 15, 2025               Dec 20, 2025
    |                          |                          |
    |                          |                          |
    |                          |                          |
    v                          v                          v

┌─────────────────────────┐   │   ┌──────────────────────────┐
│ ✅ ENABLED               │   │   │ ❌ DISABLED               │
│                         │   │   │                          │
│ Teacher can upload      │   │   │ Teacher CANNOT upload    │
│                         │   │   │                          │
│ Blue banner shows:      │   │   │ Red banner shows:        │
│ "Deadline: Dec 15"      │   │   │ "Deadline Expired"       │
│ "Button: ENABLED ✅"    │   │   │ "Button: DISABLED ❌"    │
└─────────────────────────┘   │   └──────────────────────────┘
                             │
                        DEADLINE
                   (Automatic Switch)
```

### What Happens at Deadline:
1. **Before 11:59:59 PM on Dec 15:**
   - Banner: Blue "Deadline Active"
   - Button: ✅ ENABLED
   - Teacher can upload

2. **At 12:00:00 AM on Dec 16 (1 second after deadline):**
   - Banner changes to Red "Deadline Expired"
   - Button: ❌ DISABLED (automatically)
   - Teacher cannot upload
   - No manual refresh needed!

3. **Admin anytime:**
   - Banner: Orange "Deadline Expired - Admin Override"
   - Button: ✅ ENABLED (always)
   - Can upload on behalf of teachers

---

## Key Takeaways

### ✅ For Teachers:
1. **No deadline input fields** - Only notifications
2. **Automatic button disable** - When deadline expires
3. **Clear color-coded alerts** - Green/Blue/Red
4. **Contact admin** - To change deadlines

### ✅ For Admins:
1. **Full control** - Create/edit/delete deadlines via Upload Settings
2. **Override ability** - Upload after deadline
3. **On-behalf uploads** - Select teacher when deadline expired
4. **Compliance tracking** - See who met deadlines

### 🔐 Security:
- Teachers cannot bypass deadline restrictions
- Frontend + Backend validation
- Database constraints enforce uniqueness
- RLS policies protect deadline data

---

**Status:** ✅ Complete - Teachers see notifications only, cannot set deadlines
**Button Behavior:** ✅ Automatically disables when deadline expires
**Admin Override:** ✅ Admins can always upload, even after deadline
