# CBT Question Bank - Grouped View Implementation Plan

## Overview
Redesign the Question Bank to group questions by Subject + Class + Session + Term instead of showing individual questions in a table.

---

## Step 1: Database Migration (SQL)

Run this SQL in your Supabase SQL Editor:

```sql
-- Add session and term columns to cbt_questions table
ALTER TABLE cbt_questions 
ADD COLUMN IF NOT EXISTS session VARCHAR(20),
ADD COLUMN IF NOT EXISTS term VARCHAR(20);

-- Create index for faster grouping queries
CREATE INDEX IF NOT EXISTS idx_cbt_questions_grouping 
ON cbt_questions(teacher_id, subject, class, session, term);

-- Update existing questions with default session/term (optional - for existing data)
UPDATE cbt_questions 
SET session = '2024/2025', term = 'First Term' 
WHERE session IS NULL;
```

---

## Step 2: Backend API - Add Grouped Questions Endpoint

File: `/supabase/functions/server/cbt-questions.tsx`

Add this new endpoint after the existing question endpoints:

```typescript
// ================================================
// GET GROUPED QUESTIONS (by subject, class, session, term)
// ================================================
app.get('/make-server-1ddd013a/cbt/questions-grouped', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    // Get profile to check role
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabase
      .from('cbt_questions')
      .select('subject, class, session, term, status, marks');

    // Teachers see only their questions, admins see all
    if (profile.role === 'teacher') {
      query = query.eq('teacher_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      return c.json({ error: 'Failed to fetch questions', details: error.message }, 500);
    }

    // Group questions by subject, class, session, term
    const grouped = {};
    
    (data || []).forEach(q => {
      const key = `${q.subject}|${q.class}|${q.session}|${q.term}`;
      if (!grouped[key]) {
        grouped[key] = {
          subject: q.subject,
          class: q.class,
          session: q.session,
          term: q.term,
          totalQuestions: 0,
          totalMarks: 0,
          publishedQuestions: 0,
          draftQuestions: 0,
        };
      }
      
      grouped[key].totalQuestions += 1;
      grouped[key].totalMarks += parseFloat(q.marks) || 0;
      
      if (q.status === 'published') {
        grouped[key].publishedQuestions += 1;
      } else if (q.status === 'draft') {
        grouped[key].draftQuestions += 1;
      }
    });

    const questionBanks = Object.values(grouped);

    return c.json({ questionBanks, count: questionBanks.length });
  } catch (error) {
    console.error('Error in GET /cbt/questions-grouped:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});
```

---

## Step 3: Frontend - Update Create Question Modal

✅ COMPLETED - Session and Term fields added to the form
✅ COMPLETED - Default values set (current year, First Term)
✅ COMPLETED - Data sent to backend in questionData object

---

## Step 4: Frontend - Create ViewQuestionsModal Component

File: `/components/teacher/ViewQuestionsModal.tsx`

This modal will show all questions for a specific Subject + Class + Session + Term group when "View Questions" is clicked.

```typescript
import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, CheckCircle, Clock } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface ViewQuestionsModalProps {
  questionBank: {
    subject: string;
    class: string;
    session: string;
    term: string;
  };
  onClose: () => void;
  onEdit?: (questionId: string) => void;
  onDelete?: (questionId: string) => void;
}

export function ViewQuestionsModal({ questionBank, onClose, onEdit, onDelete }: ViewQuestionsModalProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        subject: questionBank.subject,
        class: questionBank.class,
        session: questionBank.session,
        term: questionBank.term,
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.questions) {
        setQuestions(data.questions);
      }
    } catch (error) {
      console.error('Error fetching questions:', error);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const types = {
      mcq_single: 'Multiple Choice (Single)',
      mcq_multiple: 'Multiple Choice (Multiple)',
      true_false: 'True/False',
      fill_blank: 'Fill in the Blank',
      essay: 'Essay',
    };
    return types[type] || type;
  };

  return (
    <div className=\"fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4\">
      <div className=\"bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto\">
        {/* Header */}
        <div className=\"sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10\">
          <div>
            <h2 className=\"text-gray-900 mb-1\">
              {questionBank.subject} - {questionBank.class}
            </h2>
            <p className=\"text-gray-500 text-sm\">
              {questionBank.session} • {questionBank.term}
            </p>
          </div>
          <button
            onClick={onClose}
            className=\"p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors\"
          >
            <X className=\"w-5 h-5\" />
          </button>
        </div>

        {/* Questions List */}
        <div className=\"p-6 space-y-4\">
          {loading ? (
            <div className=\"text-center py-12\">
              <div className=\"animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto\"></div>
              <p className=\"text-gray-500 mt-4\">Loading questions...</p>
            </div>
          ) : questions.length === 0 ? (
            <div className=\"text-center py-12\">
              <p className=\"text-gray-500\">No questions found</p>
            </div>
          ) : (
            questions.map((q, index) => (
              <div key={q.id} className=\"border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors\">
                {/* Question Header */}
                <div className=\"flex items-start justify-between mb-3\">
                  <div className=\"flex-1\">
                    <div className=\"flex items-center gap-3 mb-2\">
                      <span className=\"text-gray-900 font-medium\">Q{index + 1}.</span>
                      <span className=\"px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded\">{getQuestionTypeLabel(q.question_type)}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        q.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {q.status}
                      </span>
                      {q.difficulty && (
                        <span className=\"px-2 py-1 bg-gray-100 text-gray-700 text-xs rounded capitalize\">{q.difficulty}</span>
                      )}
                    </div>
                    <p className=\"text-gray-800\">{q.question_text}</p>
                  </div>
                  <div className=\"flex items-center gap-2 ml-4\">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(q.id)}
                        className=\"p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors\"
                        title=\"Edit\"
                      >
                        <Edit2 className=\"w-4 h-4\" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => onDelete(q.id)}
                        className=\"p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors\"
                        title=\"Delete\"
                      >
                        <Trash2 className=\"w-4 h-4\" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Options for MCQ */}
                {(q.question_type === 'mcq_single' || q.question_type === 'mcq_multiple') && q.options && (
                  <div className=\"space-y-2 mt-3 ml-8\">
                    {q.options.map((opt: any, optIndex: number) => (
                      <div key={optIndex} className=\"flex items-center gap-2\">
                        {opt.isCorrect && <CheckCircle className=\"w-4 h-4 text-green-600\" />}
                        <span className={opt.isCorrect ? 'text-green-700 font-medium' : 'text-gray-600'}>
                          {opt.label}. {opt.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* True/False Answer */}
                {q.question_type === 'true_false' && q.correct_answer && (
                  <div className=\"mt-3 ml-8\">
                    <p className=\"text-green-700 font-medium flex items-center gap-2\">
                      <CheckCircle className=\"w-4 h-4\" />
                      Correct Answer: {Array.isArray(q.correct_answer) ? q.correct_answer[0] : q.correct_answer}
                    </p>
                  </div>
                )}

                {/* Fill in the Blank Answers */}
                {q.question_type === 'fill_blank' && q.correct_answer && (
                  <div className=\"mt-3 ml-8\">
                    <p className=\"text-sm text-gray-700 mb-1\">Accepted Answers:</p>
                    <div className=\"flex flex-wrap gap-2\">
                      {(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).map((ans: string, i: number) => (
                        <span key={i} className=\"px-2 py-1 bg-green-100 text-green-700 text-sm rounded\">
                          {ans}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta Info */}
                <div className=\"flex items-center gap-4 mt-3 ml-8 text-sm text-gray-500\">
                  {q.marks && <span>Marks: {q.marks}</span>}
                  {q.time_weight && (
                    <span className=\"flex items-center gap-1\">
                      <Clock className=\"w-3 h-3\" />
                      {q.time_weight}s
                    </span>
                  )}
                  {q.topic && <span>Topic: {q.topic}</span>}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className=\"mt-3 ml-8 p-3 bg-blue-50 border border-blue-200 rounded\">
                    <p className=\"text-sm text-blue-800\"><strong>Explanation:</strong> {q.explanation}</p>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className=\"sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4\">
          <button
            onClick={onClose}
            className=\"px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors\"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
```

---

## Step 5: Frontend - Completely Redesign QuestionBankModule

The QuestionBankModule should now:
1. Fetch grouped question banks (not individual questions)
2. Display as cards/folders showing Subject, Class, Session, Term, Question count
3. Have "View Questions" button that opens ViewQuestionsModal
4. Be mobile responsive

File: `/components/teacher/QuestionBankModule.tsx`

I'll create this in the next response due to length limits.

---

## Implementation Status:

✅ Step 1: SQL Migration (provided above - run this first)
✅ Step 2: Backend API endpoint (add to cbt-questions.tsx)
✅ Step 3: CreateQuestionModal updated with Session/Term
⏳ Step 4: ViewQuestionsModal component (code provided above - create this file)
⏳ Step 5: QuestionBankModule redesign (next step)

---

## Next Steps:

1. Run the SQL migration
2. Add the grouped endpoint to the backend
3. Create the ViewQuestionsModal component
4. Redesign the QuestionBankModule to use card view

Would you like me to proceed with Step 5 (redesigning the QuestionBankModule)?
