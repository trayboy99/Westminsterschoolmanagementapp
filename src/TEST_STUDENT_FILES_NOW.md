# 🧪 TEST STUDENT FILE VIEWER - Quick Guide

## ✅ What Was Fixed

1. **Subject Icons** - Files now show subject-specific emojis (🔢 for Math, 📚 for English, etc.)
2. **Download** - Students can now download files for their class
3. **Preview** - Students can now preview PDFs and documents
4. **Error Handling** - Better toast notifications for success/errors

## 🔧 Before Testing

Make sure you ran the SQL fix from earlier:
```sql
UPDATE uploads
SET session = '2025/2026'
WHERE (
    session LIKE '%access_token%' 
    OR LENGTH(session::text) > 50
);
```

## 📋 Testing Steps

### Step 1: Login as Student
- Username: Favour (or any student)
- Navigate to: **Notes → My Files** tab

### Step 2: Browse to Files
1. Click on a **Session** folder (e.g., "2025/2026")
2. Click on a **Term** folder (e.g., "First Term")
3. Click on a **Resource Type** (e.g., "Exam Questions")

### Step 3: Check File Display

**✅ You should see:**
- Large subject icon (🔢 🧪 📚 etc.) instead of pin
- Subject name badge below icon
- File title
- File name and size
- Upload date and teacher name
- Preview and Download buttons

**Example:**
```
┌─────────────────────┐
│        🧪           │  ← Chemistry icon
│   ┌─────────────┐   │
│   │ CHM101      │   │  ← Subject badge
│   └─────────────┘   │
│  Organic Chemistry  │
│  Week 4 Notes.pdf   │
│  2.5 MB • 12 DL     │
│  Mr. Johnson        │
│  Oct 25, 2025       │
│                     │
│ [👁️ Preview] [📥 Download] │
└─────────────────────┘
```

### Step 4: Test Preview

1. Click **Preview** button
2. **✅ Should:**
   - Show toast: "File loaded successfully"
   - Open dialog with PDF/document viewer
   - Display file content
3. **❌ Should NOT:**
   - Show "Access denied"
   - Show blank viewer
   - Give any errors

### Step 5: Test Download

1. Click **Download** button
2. **✅ Should:**
   - Show toast: "Downloading file..."
   - Download file to your computer
   - Show toast: "Downloaded [filename]"
3. **❌ Should NOT:**
   - Show "Access denied"
   - Show "Download failed"
   - Download nothing

## 🐛 If Something Doesn't Work

### Issue: Still showing pin icons instead of subjects

**Fix:**
1. Hard refresh browser: `Ctrl+Shift+R` (Windows) or `Cmd+Shift+R` (Mac)
2. Clear browser cache
3. Check if upload has subject_id in database

### Issue: Preview gives "Access denied"

**Check Backend Logs:**
```
[Signed URL] Access denied: {
  userRole: "student",
  userClassId: "xxx",
  uploadClassId: "yyy"  ← Should match!
}
```

**Fix:** Run this SQL to check class IDs:
```sql
-- Check student's class
SELECT id, first_name, last_name, class_id 
FROM profiles 
WHERE role = 'student';

-- Check upload's class
SELECT id, title, class_id, subject_id
FROM uploads;

-- They should match!
```

### Issue: Download gives "Access denied"

Same as preview - check that student's `class_id` matches upload's `class_id`.

### Issue: No subject name/icon showing

**Fix:** Run this SQL to add subject to uploads:
```sql
-- Check if uploads have subject_id
SELECT id, title, subject_id, class_id
FROM uploads;

-- If subject_id is NULL, you need to assign subjects when uploading
```

## 📊 Check Browser Console

Press `F12` and look for these logs:

**When clicking file:**
```
[StudentFileExplorer] 📥 FETCHING FILES
[StudentFileExplorer] Parameters: { session: "2025/2026", term: "First Term", resourceType: "Exam Questions" }
[StudentFileExplorer] ✅ Successfully loaded 1 files
```

**When clicking Preview:**
```
[StudentFileExplorer] 👁️ Fetching preview for file: xxx-xxx-xxx
[StudentFileExplorer] Preview response status: 200
[StudentFileExplorer] Preview response: { success: true, signedUrl: "..." }
```

**When clicking Download:**
```
[StudentFileExplorer] 📥 Downloading file: xxx-xxx-xxx
[StudentFileExplorer] Download response status: 200
[StudentFileExplorer] ✅ Download complete: exam-questions.pdf
```

## ✅ Success Criteria

All of these should work:

- [x] Files display with **subject-specific icons**
- [x] Subject name shows in **badge**
- [x] Subject code displays (if available)
- [x] **Preview** button works
- [x] Preview shows **PDF content**
- [x] Preview shows **DOCX content**
- [x] **Download** button works
- [x] File downloads with **correct filename**
- [x] **Toast notifications** appear
- [x] Can switch between **grid and list** views
- [x] Both views show **subject icons**

## 🎉 What Changed

### Before:
- ❌ Generic pin icons
- ❌ "Access denied" on preview
- ❌ "Access denied" on download
- ❌ No error feedback

### After:
- ✅ Subject-specific icons (🔢🧪📚⚛️)
- ✅ Preview works for students
- ✅ Download works for students
- ✅ Toast notifications
- ✅ Better error messages

## 💡 Tips

1. **First Time?** Refresh browser after code updates
2. **Not Loading?** Check that SQL fix was applied (session not corrupted)
3. **Wrong Class?** Verify student's class_id matches upload's class_id
4. **Missing Subject?** Upload needs subject_id - re-upload or update database

---

**Need Help?** Check `/STUDENT_FILES_COMPLETE_FIX.md` for full technical details.
