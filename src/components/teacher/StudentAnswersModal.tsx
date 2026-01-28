import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { CheckCircle2, XCircle, AlertCircle, FileText } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface StudentAnswer {
  question_id: string;
  question_text: string;
  question_type: string;
  marks: number;
  student_answer: string | string[];
  correct_answer: string | string[];
  is_correct: boolean;
  points_earned: number;
  options?: {
    A: string;
    B: string;
    C: string;
    D: string;
  };
}

interface AttemptDetails {
  student_name: string;
  exam_title: string;
  total_score: number;
  total_marks: number;
  percentage: number;
  submitted_at: string;
  answers: StudentAnswer[];
}

interface StudentAnswersModalProps {
  attemptId: string;
  onClose: () => void;
}

export function StudentAnswersModal({ attemptId, onClose }: StudentAnswersModalProps) {
  const [details, setDetails] = useState<AttemptDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchAttemptDetails();
  }, [attemptId]);

  const fetchAttemptDetails = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      console.log('[StudentAnswersModal] Fetching details for attempt:', attemptId);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-teacher/attempt-details/${attemptId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();
      console.log('[StudentAnswersModal] Response:', data);
      
      if (data.success) {
        console.log('[StudentAnswersModal] Details loaded, answers:', data.details?.answers?.length);
        if (data.details?.answers?.[0]) {
          console.log('[StudentAnswersModal] First answer options:', data.details.answers[0].options);
        }
        setDetails(data.details);
      } else {
        toast.error(data.error || 'Failed to fetch attempt details');
      }
    } catch (error: any) {
      console.error('[StudentAnswersModal] Error fetching details:', error);
      toast.error('Failed to load attempt details');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatAnswer = (answer: string | string[], questionType: string) => {
    if (!answer) return 'Not answered';
    if (Array.isArray(answer)) {
      return answer.join(', ');
    }
    return answer;
  };

  const getAnswerBadge = (isCorrect: boolean, studentAnswer: any) => {
    if (!studentAnswer) {
      return <Badge variant="outline">Unanswered</Badge>;
    }
    if (isCorrect) {
      return <Badge className="bg-green-600">Correct</Badge>;
    }
    return <Badge className="bg-red-600">Wrong</Badge>;
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Student Answers Review</DialogTitle>
          <DialogDescription>
            Detailed view of student's answers and correct answers
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-200 rounded animate-pulse" />
            ))}
          </div>
        ) : !details ? (
          <div className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-900 font-medium">Failed to load details</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Student Info */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">Student</p>
                  <p className="font-medium text-gray-900">{details.student_name}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Exam</p>
                  <p className="font-medium text-gray-900">{details.exam_title}</p>
                </div>
              </div>
              <div className="flex items-center justify-between pt-2 border-t">
                <div>
                  <p className="text-sm text-gray-600">Score</p>
                  <p className="font-medium text-gray-900">
                    {details.total_score}/{details.total_marks} ({details.percentage.toFixed(1)}%)
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Submitted</p>
                  <p className="font-medium text-gray-900">{formatDate(details.submitted_at)}</p>
                </div>
              </div>
            </div>

            {/* Questions & Answers */}
            <div className="space-y-4">
              {details.answers.map((answer, index) => (
                <div key={answer.question_id} className="border rounded-lg p-4 space-y-3">
                  {/* Question Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">Q{index + 1}.</span>
                        <Badge variant="outline" className="text-xs">
                          {answer.question_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {answer.marks} mark{answer.marks > 1 ? 's' : ''}
                        </Badge>
                        {getAnswerBadge(answer.is_correct, answer.student_answer)}
                      </div>
                      <p className="text-gray-900">{answer.question_text}</p>
                    </div>
                    <div className="ml-4">
                      {answer.is_correct ? (
                        <CheckCircle2 className="h-6 w-6 text-green-600" />
                      ) : answer.student_answer ? (
                        <XCircle className="h-6 w-6 text-red-600" />
                      ) : (
                        <AlertCircle className="h-6 w-6 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Options (for MCQ/Multiple) */}
                  {answer.options && (
                    <div className="bg-gray-50 rounded p-3 space-y-2">
                      <p className="text-xs text-gray-600 mb-2">Options:</p>
                      {(Array.isArray(answer.options) ? answer.options : Object.values(answer.options)).map((option: any, idx: number) => {
                        // Handle if option is an object with {text, label, isCorrect} structure
                        const optionLabel = typeof option === 'object' && option !== null && 'label' in option 
                          ? option.label 
                          : String.fromCharCode(65 + idx); // A, B, C, D...
                        
                        const optionText = typeof option === 'object' && option !== null && 'text' in option 
                          ? option.text 
                          : option;
                        
                        const isStudentAnswer = answer.student_answer === optionLabel || 
                          (Array.isArray(answer.student_answer) && answer.student_answer.includes(optionLabel));
                        const isCorrectAnswer = answer.correct_answer === optionLabel || 
                          (Array.isArray(answer.correct_answer) && answer.correct_answer.includes(optionLabel));
                        
                        return (
                          <div
                            key={idx}
                            className={`p-2 rounded text-sm ${
                              isCorrectAnswer
                                ? 'bg-green-100 border border-green-300'
                                : isStudentAnswer
                                ? 'bg-red-100 border border-red-300'
                                : 'bg-white'
                            }`}
                          >
                            <span className="font-medium mr-2">{optionLabel}.</span>
                            {optionText}
                            {isCorrectAnswer && (
                              <span className="ml-2 text-green-700 text-xs">✓ Correct</span>
                            )}
                            {isStudentAnswer && !isCorrectAnswer && (
                              <span className="ml-2 text-red-700 text-xs">✗ Your answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Student Answer */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-red-50 rounded p-3">
                      <p className="text-xs text-red-600 mb-1">Student's Answer</p>
                      <p className="font-medium text-red-900">
                        {formatAnswer(answer.student_answer, answer.question_type)}
                      </p>
                    </div>
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-xs text-green-600 mb-1">Correct Answer</p>
                      <p className="font-medium text-green-900">
                        {formatAnswer(answer.correct_answer, answer.question_type)}
                      </p>
                    </div>
                  </div>

                  {/* Points */}
                  <div className="text-sm text-gray-600">
                    Points earned: <span className="font-medium">{answer.points_earned}/{answer.marks}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}