import { useState, useEffect } from 'react';
import { X, Edit2, Trash2, CheckCircle, Clock, FileText, AlertCircle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface ViewQuestionsModalProps {
  questionBank: {
    subject: string;
    class: string;
    session: string;
    term: string;
    totalQuestions?: number;
  };
  onClose: () => void;
  onEdit?: (questionId: string) => void;
  onDelete?: (questionId: string) => void;
  onRefresh?: () => void;
}

// Helper function to extract question number from text (e.g., "1. What is..." → "1")
const extractQuestionNumber = (questionText: string): string | null => {
  // Match patterns like "1.", "2)", "Q1.", "Question 1:", etc.
  const match = questionText.match(/^(?:Q|Question)?\s*(\d+)[\.):\s]/i);
  return match ? match[1] : null;
};

export function ViewQuestionsModal({ questionBank, onClose, onEdit, onDelete, onRefresh }: ViewQuestionsModalProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError('');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Authentication required');
        return;
      }

      const params = new URLSearchParams({
        subject: questionBank.subject,
        class: questionBank.class,
      });

      // Add session and term if they exist
      if (questionBank.session && questionBank.session !== 'No Session') {
        params.append('session', questionBank.session);
      }
      if (questionBank.term && questionBank.term !== 'No Term') {
        params.append('term', questionBank.term);
      }

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
      } else {
        setError(data.error || 'Failed to fetch questions');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (questionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions/${questionId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        // Remove from local state
        setQuestions(questions.filter(q => q.id !== questionId));
        setDeleteConfirm(null);
        if (onRefresh) onRefresh();
      } else {
        alert(data.error || 'Failed to delete question');
      }
    } catch (err) {
      console.error('Error deleting question:', err);
      alert('Failed to delete question');
    }
  };

  const getQuestionTypeLabel = (type: string) => {
    const types: Record<string, string> = {
      mcq_single: 'Multiple Choice (Single)',
      mcq_multiple: 'Multiple Choice (Multiple)',
      true_false: 'True/False',
      fill_blank: 'Fill in the Blank',
      essay: 'Essay',
    };
    return types[type] || type;
  };

  const getDifficultyColor = (difficulty: string) => {
    const colors: Record<string, string> = {
      easy: 'bg-green-100 text-green-700',
      medium: 'bg-yellow-100 text-yellow-700',
      hard: 'bg-red-100 text-red-700',
    };
    return colors[difficulty] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-6xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 sm:px-6 py-4 flex items-center justify-between z-10">
          <div className="flex-1 min-w-0">
            <h2 className="text-gray-900 mb-1 truncate">
              {questionBank.subject} - {questionBank.class}
            </h2>
            <p className="text-gray-500 text-sm">
              {questionBank.session} • {questionBank.term}
            </p>
          </div>
          <button
            onClick={onClose}
            className="ml-4 p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors flex-shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Questions List */}
        <div className="p-4 sm:p-6 space-y-4">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto"></div>
              <p className="text-gray-500 mt-4">Loading questions...</p>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
              <p className="text-red-600">{error}</p>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">No questions found</p>
            </div>
          ) : (
            questions.map((q, index) => {
              // Remove number prefix from question text (e.g., "40. Which..." → "Which...")
              const cleanQuestionText = q.question_text.replace(/^\d+\.\s*/, '');
              
              return (
              <div key={q.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                {/* Question Header */}
                <div className="flex items-start justify-between mb-3 gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <span className="text-gray-900 font-medium flex-shrink-0">Q{index + 1}.</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded whitespace-nowrap">
                        {getQuestionTypeLabel(q.question_type)}
                      </span>
                      <span className={`px-2 py-1 text-xs rounded whitespace-nowrap ${
                        q.status === 'published' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {q.status}
                      </span>
                      {q.difficulty && (
                        <span className={`px-2 py-1 text-xs rounded capitalize whitespace-nowrap ${getDifficultyColor(q.difficulty)}`}>
                          {q.difficulty}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-800 break-words">{cleanQuestionText}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {onEdit && (
                      <button
                        onClick={() => onEdit(q.id)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {onDelete && (
                      <button
                        onClick={() => setDeleteConfirm(q.id)}
                        className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Question Image */}
                {q.question_image_url && (
                  <div className="mb-3 ml-0 sm:ml-8">
                    <img 
                      src={q.question_image_url} 
                      alt="Question" 
                      className="max-w-full h-auto rounded border border-gray-200"
                      style={{ maxHeight: '300px' }}
                    />
                  </div>
                )}

                {/* Options for MCQ */}
                {(q.question_type === 'mcq_single' || q.question_type === 'mcq_multiple') && q.options && (
                  <div className="space-y-2 mt-3 ml-0 sm:ml-8">
                    {q.options.map((opt: any, optIndex: number) => (
                      <div key={optIndex} className="flex items-start gap-2">
                        {opt.isCorrect && <CheckCircle className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />}
                        <span className={`${opt.isCorrect ? 'text-green-700 font-medium' : 'text-gray-600'} break-words`}>
                          {opt.label}. {opt.text}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* True/False Answer */}
                {q.question_type === 'true_false' && q.correct_answer && (
                  <div className="mt-3 ml-0 sm:ml-8">
                    <p className="text-green-700 font-medium flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 flex-shrink-0" />
                      <span className="break-words">
                        Correct Answer: {Array.isArray(q.correct_answer) ? q.correct_answer[0] : q.correct_answer}
                      </span>
                    </p>
                  </div>
                )}

                {/* Fill in the Blank Answers */}
                {q.question_type === 'fill_blank' && q.correct_answer && (
                  <div className="mt-3 ml-0 sm:ml-8">
                    <p className="text-sm text-gray-700 mb-1">Accepted Answers:</p>
                    <div className="flex flex-wrap gap-2">
                      {(Array.isArray(q.correct_answer) ? q.correct_answer : [q.correct_answer]).map((ans: string, i: number) => (
                        <span key={i} className="px-2 py-1 bg-green-100 text-green-700 text-sm rounded break-words">
                          {ans}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Meta Info */}
                <div className="flex items-center gap-4 mt-3 ml-0 sm:ml-8 text-sm text-gray-500 flex-wrap">
                  {q.marks && <span className="whitespace-nowrap">Marks: {q.marks}</span>}
                  {q.topic && <span className="break-words">Topic: {q.topic}</span>}
                </div>

                {/* Explanation */}
                {q.explanation && (
                  <div className="mt-3 ml-0 sm:ml-8 p-3 bg-blue-50 border border-blue-200 rounded">
                    <p className="text-sm text-blue-800 break-words"><strong>Explanation:</strong> {q.explanation}</p>
                  </div>
                )}

                {/* Delete Confirmation */}
                {deleteConfirm === q.id && (
                  <div className="mt-3 ml-0 sm:ml-8 p-3 bg-red-50 border border-red-200 rounded">
                    <p className="text-sm text-red-800 mb-2">Are you sure you want to delete this question?</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDelete(q.id)}
                        className="px-3 py-1 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                      >
                        Yes, Delete
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 text-sm rounded hover:bg-gray-300 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
            })
          )}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-200 px-4 sm:px-6 py-4">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <p className="text-sm text-gray-600">
              Total: <span className="font-medium">{questions.length}</span> question{questions.length !== 1 ? 's' : ''}
            </p>
            <button
              onClick={onClose}
              className="px-6 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}