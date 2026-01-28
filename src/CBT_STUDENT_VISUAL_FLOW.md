# 🎬 Student CBT Module - Visual Flow Guide

## 📱 Complete User Journey

```
┌─────────────────────────────────────────────────────────────┐
│                     STUDENT LOGIN                           │
│                          ↓                                  │
│              Student Dashboard Loads                        │
│                          ↓                                  │
│            Sidebar Shows "CBT Exams" Menu                   │
│                   (MonitorPlay Icon)                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  CLICK "CBT EXAMS"                          │
│                          ↓                                  │
│               StudentCBTExams Component                     │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 🔄 Fetching available exams...                       │  │
│  │    GET /cbt-student/available-exams/:studentId       │  │
│  │                                                       │  │
│  │ Backend filters by:                                  │  │
│  │  ✓ Student's class                                   │  │
│  │  ✓ Current date/time within scheduled window        │  │
│  │  ✓ Status: 'scheduled' or 'active'                  │  │
│  │                                                       │  │
│  │ For each exam, check if student has:                │  │
│  │  - Already completed it                             │  │
│  │  - Has in-progress attempt                          │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│                  Display Exam Cards                         │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ EXAM 1   │  │ EXAM 2   │  │ EXAM 3   │                │
│  │ ────────│  │ ────────│  │ ────────│                │
│  │ [Quiz]   │  │ [Formal] │  │ [Mock]   │                │
│  │ Available│  │Completed │  │ Upcoming │                │
│  │          │  │          │  │          │                │
│  │Math Quiz │  │Bio Exam  │  │Eng Test  │                │
│  │⏱️ 30min  │  │⏱️ 60min  │  │⏱️ 45min  │                │
│  │🏆 20mk   │  │🏆 50mk   │  │🏆 30mk   │                │
│  │⏰ 2h left│  │✅ 85%    │  │Dec 5     │                │
│  │          │  │(42.5/50) │  │          │                │
│  │[Start]   │  │[Results] │  │[Locked]  │                │
│  └──────────┘  └──────────┘  └──────────┘                │
└─────────────────────────────────────────────────────────────┘
                          ↓
                   [Student Clicks "Start Exam"]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   START EXAM PROCESS                        │
│                          ↓                                  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ POST /cbt-student/start-exam                         │  │
│  │                                                       │  │
│  │ Backend checks:                                      │  │
│  │  ✓ Exam exists and is active                        │  │
│  │  ✓ Current time within scheduled window             │  │
│  │  ✓ Student's class matches exam class               │  │
│  │  ✓ Student hasn't completed (if formal exam)        │  │
│  │                                                       │  │
│  │ If all checks pass:                                  │  │
│  │  1. Create cbt_student_attempts record              │  │
│  │     - status: 'in_progress'                          │  │
│  │     - start_time: NOW                                │  │
│  │     - total_questions: 20                            │  │
│  │  2. Create cbt_student_answers records               │  │
│  │     - One for each question                          │  │
│  │     - Initially empty (student_answer: null)         │  │
│  │                                                       │  │
│  │ Returns:                                             │  │
│  │  { success: true, attemptId: 'uuid-...' }           │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│          Frontend receives attemptId                        │
│                          ↓                                  │
│       Show StudentCBTExamInterface Component                │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              EXAM INTERFACE INITIALIZATION                  │
│                                                             │
│  1. Enter Fullscreen Mode                                  │
│     document.documentElement.requestFullscreen()           │
│                                                             │
│  2. Fetch Exam Data                                        │
│     GET /cbt-student/exam-data/:attemptId                  │
│     Returns:                                               │
│      - Exam details (title, duration, etc.)                │
│      - All questions (without correct answers)             │
│      - Existing student answers (if any)                   │
│                                                             │
│  3. Setup Event Listeners                                  │
│     - visibilitychange → Tab switch detection             │
│     - fullscreenchange → Fullscreen exit detection        │
│                                                             │
│  4. Start Timers                                           │
│     - Countdown timer (updates every second)              │
│     - Auto-save timer (triggers every 10 seconds)         │
│                                                             │
│  5. Initialize State                                       │
│     - Load existing answers into state                    │
│     - Load flagged questions into state                   │
│     - Set current question index to 0                     │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  EXAM INTERFACE LOADED                      │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Mathematics Quiz 1          Q 1/20    ⏰ 29:45      │  │
│  │ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 5/20 (25%)        │  │
│  ├──────────────────────────────┬───────────────────────┤  │
│  │                              │  Question Navigator   │  │
│  │ [Question 1] [1 mark] [🚩]  │  ┌─┬─┬─┬─┬─┐         │  │
│  │                              │  │1│2│3│4│5│         │  │
│  │ What is the capital of       │  └─┴─┴─┴─┴─┘         │  │
│  │ Nigeria?                     │  ┌─┬─┬─┬─┬─┐         │  │
│  │                              │  │6│7│8│9│10│        │  │
│  │ ○ A. Lagos                   │  └─┴─┴─┴─┴─┘         │  │
│  │ ● B. Abuja    ← Selected     │  ...                  │  │
│  │ ○ C. Kano                    │                       │  │
│  │ ○ D. Port Harcourt           │  Legend:              │  │
│  │                              │  🔵 Current           │  │
│  │ [← Previous]     [Next →]    │  🟢 Answered          │  │
│  │                              │  ⚪ Unanswered         │  │
│  └──────────────────────────────┴───────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
              [Student Interacts with Exam]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   USER INTERACTIONS                         │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ SELECT ANSWER                       │                   │
│  │  ↓                                  │                   │
│  │ updateAnswers(questionId, ['B'])    │                   │
│  │  ↓                                  │                   │
│  │ State updated locally               │                   │
│  │  ↓                                  │                   │
│  │ Auto-save in 10 seconds...          │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ CLICK "NEXT" BUTTON                 │                   │
│  │  ↓                                  │                   │
│  │ Trigger auto-save for current Q     │                   │
│  │  ↓                                  │                   │
│  │ POST /cbt-student/save-answer       │                   │
│  │  {                                  │                   │
│  │    attemptId: 'uuid',               │                   │
│  │    questionId: 'uuid',              │                   │
│  │    answer: ['B'],                   │                   │
│  │    isFlagged: false                 │                   │
│  │  }                                  │                   │
│  │  ↓                                  │                   │
│  │ Move to next question               │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ FLAG QUESTION                       │                   │
│  │  ↓                                  │                   │
│  │ Toggle flag in state                │                   │
│  │  ↓                                  │                   │
│  │ Red flag appears in navigator       │                   │
│  │  ↓                                  │                   │
│  │ Saved on next auto-save/navigation  │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ JUMP TO QUESTION                    │                   │
│  │  ↓                                  │                   │
│  │ Click question number in navigator  │                   │
│  │  ↓                                  │                   │
│  │ Auto-save current question          │                   │
│  │  ↓                                  │                   │
│  │ Load selected question              │                   │
│  └─────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────┘
                          ↓
              [Auto-Save Every 10 Seconds]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                    AUTO-SAVE CYCLE                          │
│                                                             │
│  Every 10 seconds:                                         │
│                                                             │
│  setInterval(() => {                                       │
│    const currentQ = questions[currentIndex]                │
│    const answer = answers[currentQ.id]                     │
│                                                             │
│    if (answer !== undefined) {                             │
│      POST /cbt-student/save-answer                         │
│        {                                                    │
│          attemptId,                                        │
│          questionId: currentQ.id,                          │
│          answer,                                           │
│          isFlagged: flagged.has(currentQ.id)               │
│        }                                                    │
│                                                             │
│      Show "Saving..." badge briefly                        │
│    }                                                        │
│  }, 10000)                                                 │
│                                                             │
│  Backend:                                                  │
│   1. Validate attempt is still 'in_progress'               │
│   2. Upsert cbt_student_answers                            │
│   3. Update questions_answered count                       │
│   4. Return success                                        │
└─────────────────────────────────────────────────────────────┘
                          ↓
          [Anti-Cheating Detection Running]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              ANTI-CHEATING MONITORING                       │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ TAB SWITCH DETECTED                 │                   │
│  │                                     │                   │
│  │ Event: visibilitychange             │                   │
│  │  ↓                                  │                   │
│  │ if (document.hidden) {              │                   │
│  │   tabSwitches++                     │                   │
│  │   POST /cbt-student/log-violation   │                   │
│  │     {                               │                   │
│  │       attemptId,                    │                   │
│  │       violationType: 'tab_switch',  │                   │
│  │       severity: 'medium',           │                   │
│  │       details: { timestamp }        │                   │
│  │     }                               │                   │
│  │   toast.warning('Tab switch!')      │                   │
│  │ }                                   │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  ┌─────────────────────────────────────┐                   │
│  │ FULLSCREEN EXIT DETECTED            │                   │
│  │                                     │                   │
│  │ Event: fullscreenchange             │                   │
│  │  ↓                                  │                   │
│  │ if (!document.fullscreenElement) {  │                   │
│  │   fullscreenExits++                 │                   │
│  │   POST /cbt-student/log-violation   │                   │
│  │     {                               │                   │
│  │       attemptId,                    │                   │
│  │       violationType: 'fullscreen',  │                   │
│  │       severity: 'high',             │                   │
│  │       details: { timestamp }        │                   │
│  │     }                               │                   │
│  │   toast.error('Fullscreen exit!')   │                   │
│  │ }                                   │                   │
│  └─────────────────────────────────────┘                   │
│                                                             │
│  Both violations:                                          │
│   → Increment violation counter                            │
│   → Show warning alert banner                              │
│   → Teacher can review in monitoring dashboard             │
└─────────────────────────────────────────────────────────────┘
                          ↓
                [Timer Counting Down]
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                  COUNTDOWN TIMER                            │
│                                                             │
│  setInterval(() => {                                       │
│    timeRemaining--                                         │
│                                                             │
│    if (timeRemaining < 300) {  // 5 minutes                │
│      showRedTimer()                                        │
│      flashWarning()                                        │
│    }                                                        │
│                                                             │
│    if (timeRemaining <= 0) {                               │
│      autoSubmitExam()  ──────────────────────┐             │
│    }                                         │             │
│  }, 1000)                                    │             │
│                                              ↓             │
│                          [Student Clicks "Submit Exam"]    │
│                                              │             │
└──────────────────────────────────────────────┘             │
                          ↓                                  │
┌─────────────────────────────────────────────────────────────┘
│                 SUBMIT CONFIRMATION                         │
│                                                             │
│  ┌──────────────────────────────────────────────────────┐  │
│  │  ⚠️ Submit Exam?                                     │  │
│  │                                                       │  │
│  │  You have answered 18 out of 20 questions.           │  │
│  │                                                       │  │
│  │  ⚠️ Warning: You have 2 unanswered questions!        │  │
│  │                                                       │  │
│  │  Once submitted, you cannot make changes.            │  │
│  │                                                       │  │
│  │  [Cancel]                 [✓ Yes, Submit]            │  │
│  └──────────────────────────────────────────────────────┘  │
│                          ↓                                  │
│                 [Student Confirms]                          │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   EXAM SUBMISSION                           │
│                                                             │
│  Frontend:                                                 │
│   1. Auto-save current answer                              │
│   2. Disable submit button                                 │
│   3. Show loading spinner                                  │
│   4. POST /cbt-student/submit-exam                         │
│       { attemptId }                                        │
│                                                             │
│  Backend Processing:                                       │
│   ↓                                                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Validate attempt is 'in_progress'                 │  │
│  │                                                       │  │
│  │ 2. Fetch all cbt_student_answers                     │  │
│  │                                                       │  │
│  │ 3. Grade Each Question:                              │  │
│  │                                                       │  │
│  │    MCQ Single:                                       │  │
│  │    if (studentAns === correctAns)                    │  │
│  │      marks = fullMarks                               │  │
│  │                                                       │  │
│  │    MCQ Multiple:                                     │  │
│  │    if (studentAns.sort() === correctAns.sort())      │  │
│  │      marks = fullMarks                               │  │
│  │                                                       │  │
│  │    True/False:                                       │  │
│  │    if (studentAns === correctAns)                    │  │
│  │      marks = fullMarks                               │  │
│  │                                                       │  │
│  │    Fill Blank:                                       │  │
│  │    if (correctAns.includes(studentAns.lower()))      │  │
│  │      marks = fullMarks                               │  │
│  │                                                       │  │
│  │    Essay:                                            │  │
│  │    marks = 0 (manual grading required)               │  │
│  │    requiresManualGrading = true                      │  │
│  │                                                       │  │
│  │ 4. Calculate Totals:                                 │  │
│  │    autoGradedScore = sum of objective marks          │  │
│  │    percentage = (score / totalMarks) * 100           │  │
│  │                                                       │  │
│  │ 5. Update cbt_student_attempts:                      │  │
│  │    status = 'submitted'                              │  │
│  │    end_time = NOW                                    │  │
│  │    submitted_at = NOW                                │  │
│  │    auto_graded_score = calculated                    │  │
│  │    total_score = autoGradedScore                     │  │
│  │    percentage = calculated                           │  │
│  │    requires_manual_grading = hasEssays               │  │
│  │                                                       │  │
│  │ 6. Return Results:                                   │  │
│  │    {                                                 │  │
│  │      success: true,                                  │  │
│  │      autoGradedScore: 42.5,                          │  │
│  │      totalMarks: 50,                                 │  │
│  │      percentage: 85.00,                              │  │
│  │      requiresManualGrading: false                    │  │
│  │    }                                                 │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│                   RESULTS DISPLAY                           │
│                                                             │
│  Frontend receives response                                │
│   ↓                                                         │
│  Exit fullscreen                                           │
│   ↓                                                         │
│  Clear timers and event listeners                          │
│   ↓                                                         │
│  Show success toasts:                                      │
│                                                             │
│   If requiresManualGrading = false:                        │
│    ✅ "Exam submitted successfully!"                        │
│    ✅ "Your score: 85% (42.5/50)"                          │
│                                                             │
│   If requiresManualGrading = true:                         │
│    ✅ "Exam submitted successfully!"                        │
│    ℹ️ "Some questions require manual grading.              │
│        Results available after teacher review."            │
│   ↓                                                         │
│  Navigate back to exam list                                │
│   ↓                                                         │
│  Refresh exam list                                         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              EXAM LIST (AFTER SUBMISSION)                   │
│                                                             │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐                │
│  │ EXAM 1   │  │ EXAM 2   │  │ EXAM 3   │                │
│  │ ────────│  │ ────────│  │ ────────│                │
│  │[Completed│  │ [Formal] │  │ [Mock]   │                │
│  │  ✅      │  │Completed │  │ Upcoming │                │
│  │          │  │          │  │          │                │
│  │Math Quiz │  │Bio Exam  │  │Eng Test  │                │
│  │          │  │          │  │          │                │
│  │ Completed│  │✅ 85%    │  │Dec 5     │                │
│  │ 85%      │  │(42.5/50) │  │          │                │
│  │(17/20)   │  │          │  │          │                │
│  │          │  │ ⏳ Manual │  │          │                │
│  │[View     │  │ Grading  │  │[Locked]  │                │
│  │ Results] │  │          │  │          │                │
│  └──────────┘  └──────────┘  └──────────┘                │
│                                                             │
│  Student can now:                                          │
│   - See score on exam card                                 │
│   - Click "View Results" for details (future)              │
│   - Take other available exams                             │
│   - Cannot retake formal exams                             │
└─────────────────────────────────────────────────────────────┘
```

---

## 🎯 Key Decision Points

### Exam Availability Logic
```
┌─────────────────────────────────────┐
│ Is exam available to student?       │
│                                     │
│ 1. Student's class = exam class? ──→ NO → Don't show
│     ↓ YES                           │
│                                     │
│ 2. Current time >= scheduled_start? NO → Show "Upcoming"
│     ↓ YES                           │
│                                     │
│ 3. Current time <= scheduled_end? ──→ NO → Show "Expired"
│     ↓ YES                           │
│                                     │
│ 4. Has completed attempt? ──────────→ YES → Show "Completed"
│     ↓ NO                            │
│                                     │
│ 5. Has in-progress attempt? ────────→ YES → Show "Resume"
│     ↓ NO                            │
│                                     │
│ ✅ Show "Start Exam" button         │
└─────────────────────────────────────┘
```

### Grading Decision Tree
```
┌─────────────────────────────────────┐
│ Question Type?                      │
├─────────────────────────────────────┤
│                                     │
├→ MCQ Single ──────────────────────┐ │
│  Compare studentAns === correctAns│ │
│  Award: fullMarks or 0            │ │
│                                     │
├→ MCQ Multiple ────────────────────┐ │
│  Sort both arrays                 │ │
│  Compare sorted arrays            │ │
│  Award: fullMarks or 0            │ │
│                                     │
├→ True/False ──────────────────────┐ │
│  Compare studentAns === correctAns│ │
│  Award: fullMarks or 0            │ │
│                                     │
├→ Fill Blank ──────────────────────┐ │
│  Lowercase and trim student ans   │ │
│  Check if in accepted variants    │ │
│  Award: fullMarks or 0            │ │
│                                     │
├→ Essay ───────────────────────────┐ │
│  Set requiresManualGrading = true │ │
│  Award: 0 (awaiting teacher)      │ │
│                                     │
└─────────────────────────────────────┘
```

---

## 📊 State Management Flow

```
React Component State:

examData: {
  exam: { ... }
  attempt: { ... }
  questions: [ ... ]
}
                    ↓
answers: {
  'question-uuid-1': ['A'],
  'question-uuid-2': ['B', 'C'],
  'question-uuid-3': 'Abuja',
  'question-uuid-4': { text: 'Essay...', wordCount: 250 }
}
                    ↓
flaggedQuestions: Set([
  'question-uuid-2',
  'question-uuid-5'
])
                    ↓
currentQuestionIndex: number (0-19)
                    ↓
timeRemaining: number (seconds)
                    ↓
violations: {
  tabSwitches: number,
  fullscreenExits: number
}
```

---

## 🔄 Data Synchronization

```
Frontend State ←──auto-save──→ Database
     ↓                            ↓
   Local                    cbt_student_answers
   Answers                       ↓
     ↓                      Updated every 10s
  Display                         ↓
  Updates                    On navigation
                                  ↓
                            On submit
```

---

**Visual Flow Guide - Version 1.0**
**Complete Student CBT Journey from Login to Results**
