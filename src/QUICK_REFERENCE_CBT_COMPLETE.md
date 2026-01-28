# 🎯 CBT Module - Quick Reference Guide

## 📦 What's Complete

### ✅ Phase 1: Question Bank (COMPLETE)
- [x] Teacher question creation with CRUD operations
- [x] Session and Term tracking
- [x] Grouped card view (Subject + Class + Session + Term)
- [x] Mobile responsive design
- [x] Authentication and validation
- [x] Subject assignment verification
- [x] Question types: MCQ, True/False, Fill-in-Blank, Essay
- [x] Draft and Published status
- [x] Individual question timing removed
- [x] Overall exam timing to be set at exam level

---

## 🗂️ File Structure

```
/components/teacher/
├── CreateQuestionModal.tsx     ✅ Form to create questions
├── ViewQuestionsModal.tsx      ✅ Modal to view all questions in a bank
└── QuestionBank.tsx            ✅ Main view with grouped cards

/supabase/functions/server/
└── cbt-questions.tsx           ✅ Backend API for questions

/SQL Files/
└── SQL_CBT_ADD_SESSION_TERM.sql  ✅ Database migration

/Documentation/
├── CBT_GROUPED_VIEW_COMPLETE.md      ✅ Grouped view implementation
├── CBT_VISUAL_GUIDE.md               ✅ Visual layout guide
├── CBT_TIMING_CHANGES_COMPLETE.md    ✅ Timing changes explanation
└── QUICK_REFERENCE_CBT_COMPLETE.md   ✅ This file
```

---

## 🎨 Current Features

### **Question Bank Module**
- **View:** Card-based grouped layout
- **Filter:** Search, Subject, Class, Session, Term
- **Create:** Modal form with session/term fields
- **View Details:** Click card → see all questions
- **Delete:** Delete individual questions (if not used in exams)
- **Stats:** Total questions, published, drafts, question banks count

### **Question Creation**
- **Required Fields:**
  - Subject (dropdown - assigned subjects only)
  - Class (dropdown)
  - Session (text input, default: current year)
  - Term (dropdown: First/Second/Third)
  - Question Text (textarea)
  - Correct Answer (based on question type)

- **Optional Fields:**
  - Topic
  - Difficulty (Easy/Medium/Hard)
  - Question Image URL
  - Explanation
  - Marks (default: 1)
  - Status (Draft/Published)

- **Question Types:**
  1. Multiple Choice (Single Answer)
  2. Multiple Choice (Multiple Answers)
  3. True/False
  4. Fill in the Blank
  5. Essay

### **Grouping Logic**
Questions are grouped by:
```
Subject + Class + Session + Term = One Question Bank Card
```

Example:
```
Mathematics - SS1 - 2025/2026 - First Term (15 questions)
English - SS2 - 2025/2026 - First Term (12 questions)
```

---

## 📊 Database Schema

### `cbt_questions` Table Columns:
```sql
- id (UUID, primary key)
- teacher_id (UUID, foreign key to profiles)
- teacher_name (VARCHAR)
- subject (VARCHAR)
- class (VARCHAR)
- session (VARCHAR)           -- NEW
- term (VARCHAR)              -- NEW
- topic (VARCHAR, optional)
- difficulty (VARCHAR)
- question_type (VARCHAR)
- question_text (TEXT)
- question_image_url (VARCHAR, optional)
- options (JSONB, for MCQ)
- correct_answer (JSONB)
- explanation (TEXT, optional)
- marks (NUMERIC, default: 1)
- status (VARCHAR, default: 'draft')
- tags (JSONB, optional)
- usage_count (INTEGER, default: 0)
- created_at (TIMESTAMP)
- updated_at (TIMESTAMP)
```

**Note:** `time_weight` column removed (or unused if still in DB)

---

## 🔗 API Endpoints

### Backend: `/supabase/functions/server/cbt-questions.tsx`

1. **GET** `/cbt/questions` - Get all questions (filtered by teacher)
   - Query params: subject, class, session, term, status, topic, search

2. **GET** `/cbt/questions-grouped` - Get grouped question banks
   - Returns: Array of { subject, class, session, term, totalQuestions, totalMarks, publishedQuestions, draftQuestions }

3. **GET** `/cbt/questions/:id` - Get single question

4. **POST** `/cbt/questions` - Create new question
   - Validates teacher assignment to subject
   - Required: subject, class, question_type, question_text, correct_answer

5. **PUT** `/cbt/questions/:id` - Update question
   - Verifies ownership

6. **DELETE** `/cbt/questions/:id` - Delete question
   - Checks if question is used in exams (usage_count)

7. **GET** `/cbt/questions/stats/summary` - Get question statistics

---

## 🔐 Authentication & Authorization

### **Teacher:**
- Can only create questions for subjects they're assigned to
- Can only view/edit/delete their own questions
- Subject assignment verified via `subjects.main_teacher_id`

### **Admin/Principal/IT_admin:**
- Can view all questions
- Can create questions for any subject
- Can edit/delete any question

### **Students:**
- No access to Question Bank module
- Will access questions only through scheduled exams (Phase 2)

---

## 🧪 Testing Checklist

### ✅ Already Tested:
- [x] Teacher can create questions
- [x] Questions grouped by Subject/Class/Session/Term
- [x] Card view displays correctly
- [x] "View Questions" modal works
- [x] Filters work (Search, Subject, Class, Session, Term)
- [x] Session and Term saved to database
- [x] Mobile responsive layout
- [x] Backend validation for subject assignment
- [x] Save & Add Another functionality

### 🔜 To Test (Phase 2):
- [ ] Exam creation from Question Bank
- [ ] Setting overall exam duration
- [ ] Student exam interface
- [ ] Auto-grading system
- [ ] Integration with marks entry

---

## 🚀 Phase 2: Exam Creation (Upcoming)

### Components to Build:
1. **ExamBuilder.tsx** - Create exams from question bank
2. **ExamScheduler.tsx** - Schedule exams for classes
3. **ExamSettings.tsx** - Configure duration, passing marks
4. **StudentExamInterface.tsx** - Student exam-taking interface
5. **ExamGrading.tsx** - Auto-grading and manual grading

### Key Features:
- Select questions from Question Bank
- Set overall exam duration (e.g., 1hr 45mins)
- Schedule exam date/time
- Assign to specific classes
- Student countdown timer
- Question navigation (Previous/Next)
- Auto-submit when time expires
- Auto-grading for MCQ/True-False/Fill-in-Blank
- Manual grading for Essay questions
- Results sent to teacher for marks entry

---

## 📱 Mobile Responsive Breakpoints

```
Mobile (<640px):    1 column cards, 2 column filters
Tablet (640-1024px): 2 column cards, 2-4 column filters
Desktop (>1024px):   3-4 column cards, 4 column filters
```

---

## 🎓 User Workflow

```
1. Teacher Login
   ↓
2. Navigate to "CBT Questions"
   ↓
3. See Question Banks (Grouped Cards)
   ↓
4. Click "Create Question"
   ↓
5. Fill form with Session/Term
   ↓
6. Click "Save & Close" or "Save & Add Another"
   ↓
7. Question saved and grouped automatically
   ↓
8. Card updates with new question count
   ↓
9. Click "View Questions" to see all questions in that bank
```

---

## 💡 Tips

### For Teachers:
- Use "Save & Add Another" to quickly create multiple questions
- Questions auto-grouped by Subject/Class/Session/Term
- Draft questions won't show in exams (only Published ones)
- Can't delete questions already used in exams (usage_count > 0)

### For Admins:
- Can view all teachers' questions
- Can create questions for any subject
- Monitor question bank statistics

---

## 🔧 SQL to Run (If Not Done Yet)

```sql
-- Add session and term columns
ALTER TABLE cbt_questions 
ADD COLUMN IF NOT EXISTS session VARCHAR(20),
ADD COLUMN IF NOT EXISTS term VARCHAR(20);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_cbt_questions_grouping 
ON cbt_questions(teacher_id, subject, class, session, term);

-- Update existing questions
UPDATE cbt_questions 
SET session = '2025/2026', term = 'First Term' 
WHERE session IS NULL;

-- Optional: Remove time_weight if you want
-- ALTER TABLE cbt_questions DROP COLUMN IF EXISTS time_weight;
```

---

## ✅ Success Criteria Met

1. ✅ Teachers can create questions easily
2. ✅ Questions grouped logically (Subject/Class/Session/Term)
3. ✅ Mobile responsive design
4. ✅ Authentication and authorization working
5. ✅ Session and term tracking implemented
6. ✅ Individual question timing removed
7. ✅ Overall exam duration to be set at exam level
8. ✅ Card-based UI instead of table view
9. ✅ Advanced filtering capabilities
10. ✅ Save & Add Another for bulk creation

---

**🎉 Phase 1: Question Bank is COMPLETE and ready for Phase 2: Exam Creation!**
