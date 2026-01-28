# 📚 Student CBT Module - Quick Reference Card

## 🎯 What Students Can Do

| Action | Description | Status |
|--------|-------------|--------|
| **View Exams** | See all available/scheduled exams for their class | ✅ |
| **Start Exam** | Begin taking an exam within scheduled time | ✅ |
| **Resume Exam** | Continue incomplete exam | ✅ |
| **Answer Questions** | MCQ, True/False, Fill Blank, Essay | ✅ |
| **Flag Questions** | Mark questions for review | ✅ |
| **Navigate** | Previous/Next or jump to specific question | ✅ |
| **Auto-Save** | Answers saved every 10 seconds | ✅ |
| **Submit Exam** | Submit before time expires | ✅ |
| **View Results** | See scores immediately (objective questions) | ✅ |

---

## 🎨 UI Components

### Main Exam List
```
Location: Student Dashboard → CBT Exams
Menu Icon: MonitorPlay (monitor with play button)
Features:
  - Grid of exam cards
  - Status badges (Available, Upcoming, In Progress, Completed, Expired)
  - Countdown timers
  - Refresh button
  - Important notice alert
```

### Exam Interface
```
Layout:
  ┌──────────────────────────────────────────┐
  │ Header: Title | Status | Timer            │
  │ Progress Bar                             │
  ├────────────────────────────┬─────────────┤
  │ Question Panel             │ Navigator   │
  │ - Question text            │ - Grid      │
  │ - Question image (if any)  │ - Legend    │
  │ - Answer options           │             │
  │ - Flag button              │             │
  │                            │             │
  │ [Previous] [Next/Submit]   │             │
  └────────────────────────────┴─────────────┘

Mobile: Navigator below question panel
```

---

## 🔌 API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/cbt-student/available-exams/:studentId` | GET | Fetch available exams |
| `/cbt-student/start-exam` | POST | Start new exam attempt |
| `/cbt-student/exam-data/:attemptId` | GET | Load exam questions |
| `/cbt-student/save-answer` | POST | Save/update answer |
| `/cbt-student/submit-exam` | POST | Submit exam |
| `/cbt-student/log-violation` | POST | Log cheating violation |
| `/cbt-student/results/:studentId` | GET | Fetch exam results |

---

## 📊 Database Flow

```
Start Exam
    ↓
cbt_student_attempts (create new record)
    ↓
cbt_student_answers (create records for all questions)
    ↓
Answer Questions
    ↓
cbt_student_answers (update student_answer, answered_at)
    ↓
Violations Detected
    ↓
cbt_violation_logs (insert violation records)
    ↓
Submit Exam
    ↓
Grade Objective Questions (server-side)
    ↓
cbt_student_answers (update is_correct, marks_awarded)
    ↓
cbt_student_attempts (update status, total_score, percentage)
```

---

## ⏱️ Timer Logic

```javascript
// Calculate end time
startTime = new Date(attempt.start_time)
durationMs = exam.duration_minutes * 60 * 1000
endTime = startTime + durationMs

// Remaining time
remaining = endTime - currentTime

// Auto-submit when time expires
if (remaining <= 0) {
  autoSubmitExam()
}

// Visual warning when < 5 minutes
if (remaining < 300) { // 300 seconds = 5 minutes
  showRedTimer()
}
```

---

## 🚨 Anti-Cheating Events

### Tab Switch
```javascript
Event: document.visibilitychange
Trigger: Student switches to another tab/window
Action:
  1. Log violation (type: 'tab_switch', severity: 'medium')
  2. Show warning toast
  3. Increment tab_switches counter
  4. Update violations_count
```

### Fullscreen Exit
```javascript
Event: document.fullscreenchange
Trigger: Student exits fullscreen mode
Action:
  1. Log violation (type: 'fullscreen_exit', severity: 'high')
  2. Show error toast
  3. Increment fullscreen_exits counter
  4. Update violations_count
```

---

## 🎓 Grading Logic

### MCQ Single Answer
```javascript
studentAnswer: ['A']
correctAnswer: ['A']
isCorrect: JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer)
marksAwarded: isCorrect ? fullMarks : 0
```

### MCQ Multiple Answer
```javascript
studentAnswer: ['A', 'C'].sort()
correctAnswer: ['A', 'C'].sort()
isCorrect: JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer)
marksAwarded: isCorrect ? fullMarks : 0
```

### True/False
```javascript
studentAnswer: ['True']
correctAnswer: ['True']
isCorrect: JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer)
marksAwarded: isCorrect ? fullMarks : 0
```

### Fill in the Blank
```javascript
studentAnswer: 'abuja' (lowercased, trimmed)
correctAnswer: ['Abuja', 'abuja', 'ABUJA']
isCorrect: correctAnswer.some(variant => 
  variant.toLowerCase().trim() === studentAnswer
)
marksAwarded: isCorrect ? fullMarks : 0
```

### Essay
```javascript
requiresManualGrading: true
marksAwarded: 0 (awaiting teacher review)
```

---

## 🎨 Status Badges

| Status | Color | Condition |
|--------|-------|-----------|
| **Available Now** | Green | `now >= start && now <= end && !completed` |
| **In Progress** | Yellow | `hasInProgressAttempt` |
| **Completed** | Green | `isCompleted` |
| **Upcoming** | Blue | `now < start` |
| **Expired** | Red | `now > end` |

---

## 💾 Auto-Save Logic

```javascript
// Every 10 seconds
setInterval(() => {
  const currentQuestion = questions[currentIndex]
  const currentAnswer = answers[currentQuestion.id]
  
  if (currentAnswer !== undefined) {
    saveAnswerToBackend(currentQuestion.id, currentAnswer)
  }
}, 10000)

// Also save when:
- Clicking Next
- Clicking Previous
- Jumping to another question
- Submitting exam
```

---

## 📱 Responsive Breakpoints

```css
Mobile (< 768px):
  - Single column exam cards
  - Question navigator below question
  - Stacked header items
  - Full-width buttons

Tablet (768px - 1024px):
  - 2 column exam cards
  - Side-by-side layout (3:1 ratio)
  - Compact header

Desktop (> 1024px):
  - 3 column exam cards
  - Side-by-side layout (3:1 ratio)
  - Full header with all info
```

---

## 🔑 Key Features

### Question Navigator
```
Visual States:
- Blue background: Current question
- Green background: Answered
- Gray background: Not answered
- Red flag icon: Flagged for review

Interactions:
- Click any number to jump to that question
- Visual feedback on hover
- Shows progress at a glance
```

### Progress Indicator
```
Formula:
progress = (answeredCount / totalQuestions) * 100

Display:
- Progress bar (0-100%)
- Text: "5 / 20 answered"
- Updates in real-time
```

### Countdown Timer
```
Format:
- Hours:Minutes:Seconds (if > 1 hour)
- Minutes:Seconds (if < 1 hour)

Colors:
- Blue: Normal (> 5 minutes)
- Red: Warning (< 5 minutes)

Features:
- Real-time countdown
- Auto-submit at 0:00
- Visible warning when low
```

---

## 🎯 Submit Flow

```
1. Student clicks "Submit Exam"
   ↓
2. Show confirmation dialog:
   - Total questions
   - Answered count
   - Warning if unanswered questions
   ↓
3. Student confirms
   ↓
4. Frontend:
   - Auto-save current answer
   - Disable submit button
   - Show loading state
   ↓
5. Backend:
   - Validate attempt exists and is in_progress
   - Fetch all answers
   - Grade objective questions
   - Calculate total score
   - Update attempt status to 'submitted'
   ↓
6. Response:
   - success: true
   - autoGradedScore: 42.5
   - totalMarks: 50
   - percentage: 85.00
   - requiresManualGrading: true/false
   ↓
7. Frontend:
   - Show success toast
   - Show score (if not manual grading)
   - Exit fullscreen
   - Return to exam list
```

---

## 🐛 Error Handling

```javascript
Common Errors & Solutions:

"Unauthorized"
  → Token expired, redirect to login

"Exam not found"
  → Exam deleted or invalid ID

"Exam is not available"
  → Outside scheduled time window

"You have already completed this exam"
  → Student already submitted (formal exam)

"Session expired. Please login again."
  → Refresh page and login

"Failed to load exam"
  → Check backend health, retry
```

---

## 📊 Data Structures

### Exam Object
```typescript
{
  id: string
  title: string
  subject: string
  class: string
  session: string
  term: string
  duration_minutes: number
  total_marks: number
  scheduled_start: string (ISO timestamp)
  scheduled_end: string (ISO timestamp)
  status: 'scheduled' | 'active' | 'completed'
  hasAttempted: boolean
  isCompleted: boolean
  isInProgress: boolean
  latestAttempt: { ... } | null
}
```

### Question Object
```typescript
{
  id: string
  question_id: string
  question_order: number
  marks: number
  section: string
  cbt_questions: {
    question_type: 'mcq_single' | 'mcq_multiple' | 'true_false' | 'fill_blank' | 'essay'
    question_text: string
    question_image_url: string | null
    options: Array<{label: string, text: string}> | null
    marks: number
  }
  studentAnswer: any | null
  isFlagged: boolean
}
```

### Answer Formats
```typescript
MCQ Single: ['A']
MCQ Multiple: ['A', 'C', 'D']
True/False: ['True'] or ['False']
Fill Blank: 'student typed answer'
Essay: { text: 'essay content', wordCount: 250 }
```

---

## 🚀 Performance Tips

```javascript
// Optimize rendering
- Use React.memo for question components
- Debounce auto-save calls
- Lazy load question images
- Virtualize long question lists

// Network optimization
- Batch violation logs (if many)
- Compress answer payloads
- Cache exam data locally
- Use service worker for offline support (future)
```

---

## 📞 Quick Troubleshooting

| Issue | Solution |
|-------|----------|
| Exams not showing | Check class, time window, exam status |
| Can't start exam | Verify within scheduled time |
| Timer not counting | Check Date() parsing, timezone |
| Auto-save failing | Check network, verify endpoint |
| Fullscreen not working | Browser security, HTTPS required |
| Violations not logging | Check event listeners attached |
| Grading incorrect | Verify answer format matches schema |
| Submit button disabled | Check if already submitted |

---

**Quick Reference Version 1.0 - Student CBT Module**
**Last Updated: December 2, 2024**
