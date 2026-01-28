# 🧪 Test Student CBT Module - Quick Start Guide

## ✅ What Was Built

A complete student-facing CBT (Computer-Based Testing) module with:
- Exam listing with status indicators
- Full exam-taking interface with timer
- Auto-save and auto-submit
- Anti-cheating detection (tab switch, fullscreen exit)
- Automatic grading for objective questions
- Mobile responsive design

---

## 🚀 Quick Start - Test in 5 Minutes

### Step 1: Login as Teacher
1. Login as a teacher
2. Go to "CBT Question Bank"
3. Create at least 5 questions (mix of MCQ, True/False, Fill in Blank)
4. Save questions with correct answers

### Step 2: Setup Exam (Principal/IT Admin)
1. Login as Principal or IT_admin
2. Go to "CBT Management"
3. Click "Schedule New Exam"
4. Fill in:
   - Title: "Sample Math Quiz"
   - Subject: "Mathematics"
   - Class: "JSS 1" (or any class)
   - Session: "2024/2025"
   - Term: "First Term"
   - Duration: 15 minutes
   - Total Marks: 10
   - **Scheduled Start**: Set to current time (or 5 mins ago)
   - **Scheduled End**: Set to 2 hours from now
   - Add questions created in Step 1
5. Click "Schedule Exam"

### Step 3: Test as Student
1. Logout and login as a student (in the class you selected)
2. Click **"CBT Exams"** in the sidebar (new menu item with monitor icon)
3. You should see the exam card with:
   - ✅ "Available Now" badge
   - Countdown timer
   - Exam details (duration, marks, date)
4. Click **"Start Exam"**
5. System should:
   - ✅ Enter fullscreen mode
   - ✅ Show first question
   - ✅ Show countdown timer
   - ✅ Show progress bar

### Step 4: Test Features

**Test Question Navigation:**
- [ ] Answer current question
- [ ] Click "Next" button
- [ ] See next question
- [ ] Click question number in navigator sidebar
- [ ] Jump to specific question

**Test Flag Feature:**
- [ ] Click flag icon on a question
- [ ] See red flag in question navigator
- [ ] Click flag again to unflag

**Test Auto-Save:**
- [ ] Answer a question
- [ ] Wait 10 seconds
- [ ] See "Saving..." badge appear briefly

**Test Anti-Cheating:**
- [ ] Press `Cmd/Ctrl + T` to open new tab
- [ ] See warning toast: "Tab switch detected"
- [ ] See violation counter increase
- [ ] Press `ESC` to exit fullscreen
- [ ] See error toast: "You exited fullscreen"
- [ ] See violation counter increase again

**Test Timer:**
- [ ] Watch timer countdown
- [ ] See timer turn red when < 5 minutes left

**Test Question Types:**
- [ ] MCQ Single Answer - Select one option
- [ ] True/False - Select true or false
- [ ] Fill in Blank - Type answer in text box
- [ ] Essay - Type in textarea (if you added essay questions)

**Test Submit:**
- [ ] Navigate to last question
- [ ] Click "Submit Exam" button
- [ ] See confirmation dialog with:
   - Number of answered questions
   - Warning if unanswered questions exist
- [ ] Click "Yes, Submit"
- [ ] See success toast with score
- [ ] Exit to exam list
- [ ] See exam card now shows "Completed" badge
- [ ] See score displayed on card

---

## 🎯 What to Look For

### ✅ SUCCESS Indicators

**On Exam List:**
- Exams show with correct status badges
- Countdown timers update
- Can click "Start Exam" on available exams

**During Exam:**
- Fullscreen mode activates
- Timer counts down
- Questions display correctly
- Can select/type answers
- Auto-save works (see "Saving..." badge)
- Navigation works (Previous/Next/Jump to question)
- Flag questions works
- Tab switch violations logged
- Fullscreen exit violations logged

**After Submit:**
- Success toast shows
- Score displayed correctly
- Exam marked as "Completed"
- Cannot retake formal exam

---

## 🐛 Common Issues & Solutions

### Issue: "No exams available"
**Solution:**
- Check exam scheduled_start is in the past
- Check exam scheduled_end is in the future
- Check exam class matches student's class
- Check exam status is "scheduled" or "active"

### Issue: "Cannot start exam"
**Solution:**
- Check current time is between scheduled_start and scheduled_end
- Check student hasn't already completed the exam (for formal exams)
- Check exam has questions assigned to it

### Issue: Fullscreen doesn't activate
**Solution:**
- Browser may block fullscreen on HTTP (needs HTTPS)
- User may have denied fullscreen permission
- Some browsers require user gesture first

### Issue: Auto-save not working
**Solution:**
- Check browser console for errors
- Check network tab for API calls
- Verify backend endpoint `/cbt-student/save-answer` is working

### Issue: Grading incorrect
**Solution:**
- Check correct_answer format in database matches expected format
- For MCQ: Should be array like ["A"]
- For Fill Blank: Should be array of accepted variants ["answer", "Answer", "ANSWER"]
- Check marks calculation logic in backend

---

## 📊 Backend Verification

### Check Database After Test

**After Starting Exam:**
```sql
-- Should see new attempt record
SELECT * FROM cbt_student_attempts 
WHERE student_id = 'your-student-id'
ORDER BY created_at DESC LIMIT 1;

-- Should see answer records
SELECT * FROM cbt_student_answers 
WHERE attempt_id = 'attempt-id-from-above';
```

**After Answering Questions:**
```sql
-- Should see student_answer populated
SELECT question_id, student_answer, answered_at 
FROM cbt_student_answers 
WHERE attempt_id = 'your-attempt-id';
```

**After Violations:**
```sql
-- Should see violation logs
SELECT * FROM cbt_violation_logs 
WHERE attempt_id = 'your-attempt-id';
```

**After Submission:**
```sql
-- Should see attempt marked as submitted with scores
SELECT status, auto_graded_score, total_score, percentage, 
       requires_manual_grading, submitted_at
FROM cbt_student_attempts 
WHERE id = 'your-attempt-id';

-- Should see answers graded
SELECT question_id, is_correct, marks_awarded, max_marks
FROM cbt_student_answers 
WHERE attempt_id = 'your-attempt-id';
```

---

## 🔍 Debugging

### Enable Console Logging

Open browser console (F12) and watch for:

```
[StudentCBT] Fetching exams...
[StudentCBT] Starting exam...
[CBT Exam] Loading exam data...
[CBT Exam] Auto-saving answers...
[CBT Exam] Logging violation: tab_switch
[CBT Exam] Submitting exam...
```

### Check Network Tab

Watch for these API calls:
- `GET /cbt-student/available-exams/:studentId`
- `POST /cbt-student/start-exam`
- `GET /cbt-student/exam-data/:attemptId`
- `POST /cbt-student/save-answer` (every 10 seconds)
- `POST /cbt-student/log-violation` (when violations occur)
- `POST /cbt-student/submit-exam`

All should return status `200` with `success: true`

---

## 📱 Mobile Testing

### Test on Mobile Device

1. **Responsive Layout:**
   - Exam cards stack vertically
   - Timer visible at top
   - Question navigator accessible
   - Buttons touch-friendly

2. **Touch Interactions:**
   - Tap to select MCQ options
   - Tap to navigate questions
   - Tap to flag questions
   - Tap to submit

3. **Fullscreen on Mobile:**
   - May behave differently per browser
   - iOS Safari: Fullscreen limited
   - Android Chrome: Full fullscreen support

---

## ✅ Test Checklist

Run through this checklist:

**Setup:**
- [ ] Backend server running
- [ ] CBT database tables exist
- [ ] Teacher created questions
- [ ] Admin scheduled exam
- [ ] Exam time window is current

**Student Can:**
- [ ] Login successfully
- [ ] See "CBT Exams" in sidebar
- [ ] View exam card with correct details
- [ ] See status badge (Available/Upcoming/etc.)
- [ ] See countdown timer
- [ ] Click "Start Exam"

**During Exam:**
- [ ] Fullscreen activates
- [ ] First question displays
- [ ] Timer counts down correctly
- [ ] Can select/type answer
- [ ] Can click "Next" to go forward
- [ ] Can click "Previous" to go back
- [ ] Can click question numbers to jump
- [ ] Can flag questions
- [ ] Auto-save works (every 10 seconds)
- [ ] Tab switch detected and logged
- [ ] Fullscreen exit detected and logged
- [ ] Question navigator shows status correctly

**Submit Exam:**
- [ ] Can click "Submit Exam"
- [ ] Confirmation dialog shows
- [ ] Shows answered vs unanswered count
- [ ] Can cancel or confirm
- [ ] After submit: Success toast shows
- [ ] Score displayed in toast
- [ ] Returns to exam list
- [ ] Exam shows "Completed" status
- [ ] Score visible on exam card

**Grading:**
- [ ] Objective questions graded correctly
- [ ] Score calculation accurate
- [ ] Percentage correct
- [ ] Essay questions flagged for manual grading

---

## 🎉 Success Criteria

Your Student CBT Module is working correctly if:

✅ Students can see available exams
✅ Students can start exams
✅ Exam interface loads with timer
✅ Can answer all question types
✅ Auto-save works
✅ Violations tracked
✅ Can submit exam
✅ Scores calculated correctly
✅ Results displayed

---

## 📞 Need Help?

If tests fail, check:

1. **Browser Console** - Any JavaScript errors?
2. **Network Tab** - Are API calls succeeding?
3. **Backend Logs** - Any server errors?
4. **Database** - Do tables have data?
5. **Exam Timing** - Is current time within exam window?

---

**Status: Ready to Test! 🚀**

Start with Step 1 above and work your way through all test scenarios.
