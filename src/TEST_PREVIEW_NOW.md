# ✅ TEST PREVIEW BUTTON - Quick Checklist

## 🚀 Before Testing

1. **Refresh Browser**
   - Windows: `Ctrl + Shift + R`
   - Mac: `Cmd + Shift + R`

2. **Open Browser Console** (F12)
   - Go to Console tab
   - Clear any old messages

## 📋 Test Steps

### Test 1: PDF Preview ✅

1. **Login** as student (e.g., Favour)
2. **Navigate** to: Notes → My Files
3. **Browse** to a PDF file
4. **Click** Preview button

**Expected Results:**
- [ ] Dialog opens immediately
- [ ] Loading spinner shows briefly
- [ ] PDF content appears
- [ ] Can see document text/content
- [ ] Toast shows: "File loaded successfully"
- [ ] Can scroll through PDF
- [ ] Close button works

**Console Should Show:**
```
[StudentFileExplorer] 👁️ Fetching preview for file: {...}
[StudentFileExplorer] Preview response status: 200
[StudentFileExplorer] ✅ Setting preview URL
```

### Test 2: DOCX Preview ✅

1. **Navigate** to a DOCX file
2. **Click** Preview button

**Expected Results:**
- [ ] Dialog opens
- [ ] Shows file icon
- [ ] Message: "Word documents cannot be previewed in the browser"
- [ ] Download button appears
- [ ] Click download → file downloads
- [ ] Close button works

### Test 3: Download Button ✅

1. **Navigate** to any file
2. **Click** Download button (not Preview)

**Expected Results:**
- [ ] Button shows loading spinner
- [ ] Toast: "Downloading file..."
- [ ] File downloads to computer
- [ ] Toast: "Downloaded [filename]"
- [ ] Button returns to normal

**Console Should Show:**
```
[StudentFileExplorer] 📥 Downloading file: ...
[StudentFileExplorer] Download response status: 200
[StudentFileExplorer] ✅ Download complete: filename.pdf
```

### Test 4: Error Handling ✅

**Test with invalid file (if available):**
1. **Click** Preview on corrupted/missing file
2. **Observe** error handling

**Expected Results:**
- [ ] Error message displays
- [ ] Toast shows error
- [ ] Console shows error details
- [ ] Suggests downloading instead

## 🔍 What to Check in Console

### Success Pattern:
```
✅ [StudentFileExplorer] 👁️ Fetching preview
✅ [StudentFileExplorer] Preview response status: 200
✅ [StudentFileExplorer] Preview response: {success: true, hasSignedUrl: true}
✅ [StudentFileExplorer] ✅ Setting preview URL
```

### Error Pattern (if something fails):
```
❌ [StudentFileExplorer] Preview response status: 403
❌ [StudentFileExplorer] Preview error response: Access denied
❌ Error fetching preview URL: ...
```

## 🐛 If Preview Doesn't Work

### Check 1: Browser Console
**Look for:**
- Red error messages
- 403/404 status codes
- "Access denied" messages

### Check 2: Network Tab (F12 → Network)
1. Click Preview button
2. Look for request to: `.../uploads/[id]/signed-url`
3. Check:
   - Status code (should be 200)
   - Response (should have `signedUrl`)

### Check 3: Backend Logs
Go to Supabase → Functions → Logs

**Look for:**
```
[Signed URL] 📥 Request for upload: ...
[Signed URL] ✅ Generated successfully
```

**Or errors:**
```
[Signed URL] Access denied: ...
Error creating signed URL: ...
```

## ✅ Quick Fixes

### Issue: "Failed to load preview"

**Fix 1:** Check student's class matches file's class
```sql
-- Student's class
SELECT class_id FROM profiles WHERE role = 'student' AND email = 'student@email.com';

-- File's class
SELECT class_id FROM uploads WHERE id = 'file-id';
```

**Fix 2:** Check file exists in storage
- Go to Supabase Dashboard
- Storage → `make-1ddd013a-uploads`
- Verify file is there

### Issue: Blank preview

**Fix:** File might be corrupted
1. Try downloading the file
2. Open downloaded file
3. If it opens, browser might have cache issue
4. Clear browser cache and try again

### Issue: Preview works but shows wrong content

**Fix:** Old cached version
1. Clear browser cache
2. Hard refresh: `Ctrl + Shift + R`

## 🎯 Success Criteria

All checkboxes should be ✅:

**PDF Files:**
- [ ] Preview opens in < 3 seconds
- [ ] PDF content is visible
- [ ] Can scroll through pages
- [ ] No errors in console

**DOCX Files:**
- [ ] Shows download prompt
- [ ] Clear message about browser limitation
- [ ] Download works

**Download:**
- [ ] Download button works
- [ ] File saves with correct name
- [ ] Loading state shows

**Error Handling:**
- [ ] Errors show user-friendly message
- [ ] Toast notifications work
- [ ] Console logs helpful info

## 📊 Test Results Template

Copy this and fill it out:

```
✅ Test 1: PDF Preview
   - Dialog opens: ✅/❌
   - Content shows: ✅/❌
   - Toast works: ✅/❌
   - Console clean: ✅/❌

✅ Test 2: DOCX Preview
   - Shows message: ✅/❌
   - Download works: ✅/❌
   
✅ Test 3: Download
   - Button works: ✅/❌
   - File downloads: ✅/❌
   - Toast shows: ✅/❌

✅ Test 4: Errors
   - Error displays: ✅/❌
   - Helpful message: ✅/❌

Overall Result: ✅ PASS / ❌ FAIL
```

## 🎉 When All Tests Pass

**You should see:**
- ✅ Subject-specific icons (🔢 🧪 📚)
- ✅ Preview button works for PDFs
- ✅ Download button works
- ✅ DOCX files show download option
- ✅ Toast notifications
- ✅ No console errors

**Students can:**
- View PDFs instantly in browser
- Download files when needed
- Get clear feedback
- Navigate easily

---

**Need Help?** Check:
- `/PREVIEW_BUTTON_FIX.md` - Technical details
- `/PREVIEW_FIX_VISUAL.md` - Visual comparison
- `/STUDENT_FILES_COMPLETE_FIX.md` - Full feature guide
