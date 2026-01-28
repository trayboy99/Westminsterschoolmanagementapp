import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  ArrowLeft,
  CheckCircle,
  XCircle,
  Circle,
  AlertCircle,
  BookOpen,
  Calendar,
  Clock,
  Award,
  Eye,
  FileText,
  RefreshCw,
  Lightbulb
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';

interface Question {
  id: string;
  question_text: string;
  question_type: string;
  question_image_url: string | null;
  options: any;
  correct_answer: any;
  explanation: string | null;
  marks: number;
  student_answer: any;
  is_correct: boolean | null;
  marks_awarded: number;
  max_marks: number;
}

interface AttemptDetails {
  id: string;
  exam_id: string;
  start_time: string;
  end_time: string;
  time_taken_seconds: number;
  total_score: number;
  percentage: number;
  exam: {
    title: string;
    subject: string;
    session: string;
    term: string;
    total_marks: number;
    pass_mark: number;
  };
}

interface StudentCBTReviewProps {
  result: {
    id: string;
    time_taken_seconds: number;
    total_score: number;
    percentage: number;
    exam: {
      title: string;
      subject: string;
      session: string;
      term: string;
      total_marks: number;
      pass_mark: number;
    };
  };
  onClose: () => void;
}

export function StudentCBTReview({ result, onClose }: StudentCBTReviewProps) {
  const { profile } = useAuth();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState(0);
  const supabase = createClient();

  useEffect(() => {
    if (result?.id) {
      fetchReviewData();
    }
  }, [result?.id]);

  const fetchReviewData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/review/${result.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();
      if (data.success) {
        setQuestions(data.questions || []);
      } else {
        toast.error(data.error || 'Failed to fetch review data');
      }
    } catch (error: any) {
      console.error('[StudentCBTReview] Error:', error);
      toast.error('Failed to load review data');
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const renderOption = (option: any, index: number, isCorrect: boolean, isSelected: boolean) => {
    const optionLetter = option.label || String.fromCharCode(65 + index);
    
    // Clean option text - remove asterisks and fix merged options
    const cleanText = (text: string) => {
      if (!text) return '';
      
      // Remove asterisks
      text = text.replace(/\s*\*\s*/g, '').trim();
      
      // CRITICAL FIX: Extract only the first word/phrase before next option letter
      // Handle cases like "A B. An C. The" → extract "A"
      
      // First, check if text contains another option pattern like " B. " or " C. "
      const nextOptionPattern = /\s+[A-H]\.\s+/;
      if (nextOptionPattern.test(text)) {
        // Split at the next option and take only the first part
        const parts = text.split(nextOptionPattern);
        return parts[0].trim();
      }
      
      // Also handle when options are concatenated without space: "AB." or "AC."
      const mergedPattern = /^([A-H]+)\.\s*/;
      const mergedMatch = text.match(mergedPattern);
      if (mergedMatch && mergedMatch[1].length > 1) {
        // This is badly formatted like "AB. An" - remove the prefix
        text = text.replace(mergedPattern, '').trim();
        // Now check again for next option
        if (nextOptionPattern.test(text)) {
          const parts = text.split(nextOptionPattern);
          return parts[0].trim();
        }
      }
      
      return text;
    };
    
    let className = 'flex items-start gap-3 p-3 rounded-lg border-2 transition-colors';
    
    if (isCorrect) {
      className += ' bg-green-50 border-green-500';
    } else if (isSelected && !isCorrect) {
      className += ' bg-red-50 border-red-500';
    } else {
      className += ' border-gray-200';
    }

    return (
      <div key={index} className={className}>
        <div className="flex-shrink-0 mt-0.5">
          {isCorrect ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : isSelected ? (
            <XCircle className="w-5 h-5 text-red-600" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
        </div>
        <div className="flex-1">
          <span className="font-medium text-gray-700">{optionLetter}.</span>{' '}
          <span className={isCorrect ? 'text-green-900' : isSelected ? 'text-red-900' : 'text-gray-700'}>
            {typeof option === 'object' ? cleanText(option.text || JSON.stringify(option)) : cleanText(option)}
          </span>
          {isCorrect && (
            <Badge className="ml-2 bg-green-600">Correct Answer</Badge>
          )}
          {isSelected && !isCorrect && (
            <Badge className="ml-2 bg-red-600">Your Answer</Badge>
          )}
        </div>
      </div>
    );
  };

  const renderQuestion = (question: Question) => {
    const isCorrect = question.is_correct;
    const studentAnswer = question.student_answer;
    const correctAnswer = question.correct_answer;

    // Debug logging
    console.log('[Review Debug]', {
      question: question.question_text,
      studentAnswer,
      correctAnswer,
      type: question.question_type,
      options: question.options
    });

    return (
      <Card className="border-2">
        <CardHeader>
          <div className="flex items-start justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-gray-600">Question {selectedQuestion + 1} of {questions.length}</span>
              <Badge variant="outline" className="text-xs uppercase">
                {question.question_type.replace('_', ' ')}
              </Badge>
            </div>
            <div className="flex items-center gap-2">
              {isCorrect === true ? (
                <Badge className="bg-green-600">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Correct
                </Badge>
              ) : isCorrect === false ? (
                <Badge className="bg-red-600">
                  <XCircle className="w-3 h-3 mr-1" />
                  Incorrect
                </Badge>
              ) : (
                <Badge className="bg-yellow-600">
                  <AlertCircle className="w-3 h-3 mr-1" />
                  Manually Graded
                </Badge>
              )}
              <Badge variant="outline">
                {question.marks_awarded}/{question.max_marks} marks
              </Badge>
            </div>
          </div>
          
          <CardTitle className="text-lg leading-relaxed">
            {question.question_text}
          </CardTitle>

          {question.question_image_url && (
            <div className="mt-4">
              <img 
                src={question.question_image_url} 
                alt="Question" 
                className="max-w-full rounded-lg border border-gray-200"
              />
            </div>
          )}
        </CardHeader>

        <CardContent className="space-y-4">
          {/* MCQ Single Choice */}
          {(question.question_type === 'mcq_single' || question.question_type === 'MCQ_SINGLE' || question.question_type.toLowerCase() === 'mcq single') && (
            <div className="space-y-2">
              {question.options?.map((option: any, index: number) => {
                // Handle both label-based and index-based answers
                let isCorrectOption = false;
                let isSelectedOption = false;
                
                // Check if option has isCorrect property (from database)
                if (option.isCorrect !== undefined) {
                  isCorrectOption = option.isCorrect === true;
                }
                // Otherwise compare labels or indices
                else if (option.label) {
                  // correctAnswer might be an array like ["B"] or just "B"
                  const correctLabels = Array.isArray(correctAnswer) ? correctAnswer : [correctAnswer];
                  isCorrectOption = correctLabels.includes(option.label);
                } else {
                  // Fallback to index comparison
                  const correctIdx = Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer;
                  isCorrectOption = index === correctIdx || String.fromCharCode(65 + index) === correctIdx;
                }
                
                // Check student's answer
                if (studentAnswer !== null && studentAnswer !== undefined) {
                  if (option.label) {
                    // Compare with label
                    const studentLabels = Array.isArray(studentAnswer) ? studentAnswer : [studentAnswer];
                    isSelectedOption = studentLabels.includes(option.label);
                  } else {
                    // Compare with index
                    isSelectedOption = index === studentAnswer || String.fromCharCode(65 + index) === studentAnswer;
                  }
                }
                
                console.log(`Option ${index} (${option.label || index}):`, { 
                  isCorrectOption, 
                  isSelectedOption,
                  optionLabel: option.label,
                  correctAnswer,
                  studentAnswer
                });
                
                return renderOption(option, index, isCorrectOption, isSelectedOption);
              })}
            </div>
          )}

          {/* MCQ Multiple Choice */}
          {question.question_type === 'mcq_multiple' && (
            <div className="space-y-2">
              {question.options?.map((option: any, index: number) => {
                const correctAnswers = Array.isArray(correctAnswer) ? correctAnswer : [];
                const studentAnswers = Array.isArray(studentAnswer) ? studentAnswer : [];
                const isCorrectOption = correctAnswers.includes(index) || correctAnswers.includes(option);
                const isSelectedOption = studentAnswers.includes(index) || studentAnswers.includes(option);
                return renderOption(option, index, isCorrectOption, isSelectedOption);
              })}
              <p className="text-sm text-gray-600 mt-2">
                <strong>Note:</strong> Multiple answers are correct for this question
              </p>
            </div>
          )}

          {/* True/False */}
          {question.question_type === 'true_false' && (
            <div className="space-y-2">
              {['True', 'False'].map((option, index) => {
                const isCorrectOption = correctAnswer === option || correctAnswer === (index === 0);
                const isSelectedOption = studentAnswer === option || studentAnswer === (index === 0);
                return renderOption(option, index, isCorrectOption, isSelectedOption);
              })}
            </div>
          )}

          {/* Fill in the Blank */}
          {question.question_type === 'fill_blank' && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Your Answer:</p>
                <p className={`font-medium ${isCorrect ? 'text-green-900' : 'text-red-900'}`}>
                  {studentAnswer || '(No answer provided)'}
                </p>
              </div>
              <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                <p className="text-sm text-green-600 mb-2">Accepted Answers:</p>
                <div className="flex flex-wrap gap-2">
                  {Array.isArray(correctAnswer) ? (
                    correctAnswer.map((ans: any, idx: number) => (
                      <Badge key={idx} className="bg-green-600">{ans}</Badge>
                    ))
                  ) : (
                    <Badge className="bg-green-600">{correctAnswer}</Badge>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Essay */}
          {question.question_type === 'essay' && (
            <div className="space-y-3">
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Your Answer:</p>
                <p className="text-gray-900 whitespace-pre-wrap">
                  {studentAnswer || '(No answer provided)'}
                </p>
              </div>
              {question.explanation && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm text-blue-600 mb-2">
                    <Lightbulb className="w-4 h-4 inline mr-1" />
                    Model Answer / Guidelines:
                  </p>
                  <p className="text-blue-900 whitespace-pre-wrap">{question.explanation}</p>
                </div>
              )}
            </div>
          )}

          {/* Explanation */}
          {question.explanation && question.question_type !== 'essay' && (
            <Alert className="bg-blue-50 border-blue-200">
              <Lightbulb className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Explanation:</strong> {question.explanation}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <FileText className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-900 font-medium mb-2">No Review Data Available</p>
          <p className="text-gray-600 text-center">
            Unable to load review data for this exam attempt.
          </p>
        </CardContent>
      </Card>
    );
  }

  const correctAnswers = questions.filter(q => q.is_correct === true).length;
  const incorrectAnswers = questions.filter(q => q.is_correct === false).length;
  const unanswered = questions.filter(q => !q.student_answer).length;

  return (
    <div className="fixed inset-0 bg-slate-50 z-50 overflow-y-auto">
      {/* Mobile App Header - Gradient */}
      <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white px-4 pt-6 pb-6 sticky top-0 z-20 shadow-lg">
        <button 
          onClick={onClose}
          className="flex items-center gap-2 text-white/90 hover:text-white mb-4 active:scale-95 transition-transform"
        >
          <ArrowLeft className="h-5 w-5" />
          <span className="font-medium">Back to Result</span>
        </button>
        
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold mb-1">Exam Review</h1>
          <p className="text-white/90 text-sm line-clamp-1">{result.exam.title} - {result.exam.subject}</p>
        </div>
      </div>

      <div className="px-4 py-6 space-y-4 pb-24">
        {/* Summary Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Award className="h-5 w-5 text-gray-700" />
              <h2 className="font-semibold text-gray-900 text-sm">Exam Summary</h2>
            </div>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-600 mb-1">Score</p>
                <p className="text-2xl font-bold text-blue-900">{result.percentage.toFixed(1)}%</p>
              </div>
              <div className="bg-green-50 rounded-xl p-3">
                <p className="text-xs text-green-600 mb-1">Correct</p>
                <p className="text-2xl font-bold text-green-900">{correctAnswers}/{questions.length}</p>
              </div>
              <div className="bg-red-50 rounded-xl p-3">
                <p className="text-xs text-red-600 mb-1">Incorrect</p>
                <p className="text-2xl font-bold text-red-900">{incorrectAnswers}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3">
                <p className="text-xs text-purple-600 mb-1">Time Taken</p>
                <p className="text-2xl font-bold text-purple-900">{formatDuration(result.time_taken_seconds)}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1">
                <BookOpen className="w-3.5 h-3.5" />
                {result.exam.subject}
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" />
                {result.exam.session} - {result.exam.term}
              </span>
              <span>•</span>
              <span>Pass Mark: {result.exam.pass_mark}</span>
            </div>
          </div>
        </div>

        {/* Question Navigation */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 border-b border-gray-100">
            <h2 className="font-semibold text-gray-900 text-sm">Question Navigator</h2>
            <p className="text-xs text-gray-600 mt-0.5">Click on a question to review</p>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-5 gap-2">
              {questions.map((q, index) => (
                <button
                  key={q.id}
                  onClick={() => setSelectedQuestion(index)}
                  className={`
                    h-12 rounded-xl border-2 flex items-center justify-center font-semibold transition-all text-sm
                    ${selectedQuestion === index 
                      ? 'border-indigo-600 bg-indigo-600 text-white shadow-lg scale-105' 
                      : q.is_correct === true
                      ? 'border-green-500 bg-green-50 text-green-700 hover:bg-green-100 active:scale-95'
                      : q.is_correct === false
                      ? 'border-red-500 bg-red-50 text-red-700 hover:bg-red-100 active:scale-95'
                      : 'border-gray-300 bg-gray-50 text-gray-700 hover:bg-gray-100 active:scale-95'
                    }
                  `}
                >
                  {index + 1}
                </button>
              ))}
            </div>
            <div className="flex flex-wrap gap-4 mt-4 text-xs">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-green-500 bg-green-50"></div>
                <span className="text-gray-600">Correct</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-red-500 bg-red-50"></div>
                <span className="text-gray-600">Incorrect</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded border-2 border-indigo-600 bg-indigo-600"></div>
                <span className="text-gray-600">Current</span>
              </div>
            </div>
          </div>
        </div>

        {/* Current Question Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 border-b border-gray-100">
            <div className="flex items-start justify-between gap-3 mb-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-medium text-gray-600">Question {selectedQuestion + 1} of {questions.length}</span>
                <span className="px-2 py-0.5 bg-gray-200 text-gray-700 rounded-md text-xs font-medium uppercase">
                  {questions[selectedQuestion].question_type.replace('_', ' ')}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-2 justify-end">
                {questions[selectedQuestion].is_correct === true ? (
                  <span className="px-2 py-0.5 bg-green-500 text-white rounded-md text-xs font-bold flex items-center gap-1 flex-shrink-0">
                    <CheckCircle className="w-3 h-3" />
                    Correct
                  </span>
                ) : questions[selectedQuestion].is_correct === false ? (
                  <span className="px-2 py-0.5 bg-red-500 text-white rounded-md text-xs font-bold flex items-center gap-1 flex-shrink-0">
                    <XCircle className="w-3 h-3" />
                    Incorrect
                  </span>
                ) : (
                  <span className="px-2 py-0.5 bg-yellow-500 text-white rounded-md text-xs font-bold flex items-center gap-1 flex-shrink-0">
                    <AlertCircle className="w-3 h-3" />
                    Manual
                  </span>
                )}
                <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md text-xs font-medium flex-shrink-0">
                  {questions[selectedQuestion].marks_awarded}/{questions[selectedQuestion].max_marks} marks
                </span>
              </div>
            </div>
          </div>
          
          <div className="p-4">
            <h3 className="font-semibold text-gray-900 text-base leading-relaxed mb-4">
              {questions[selectedQuestion].question_text}
            </h3>

            {questions[selectedQuestion].question_image_url && (
              <div className="mb-4">
                <img 
                  src={questions[selectedQuestion].question_image_url} 
                  alt="Question" 
                  className="w-full rounded-xl border border-gray-200"
                />
              </div>
            )}

            <div className="space-y-3">
              {/* MCQ Single Choice */}
              {(questions[selectedQuestion].question_type === 'mcq_single' || 
                questions[selectedQuestion].question_type === 'MCQ_SINGLE' || 
                questions[selectedQuestion].question_type.toLowerCase() === 'mcq single') && (
                <div className="space-y-2">
                  {questions[selectedQuestion].options?.map((option: any, index: number) => {
                    let isCorrectOption = false;
                    let isSelectedOption = false;
                    
                    if (option.isCorrect !== undefined) {
                      isCorrectOption = option.isCorrect === true;
                    } else if (option.label) {
                      const correctLabels = Array.isArray(questions[selectedQuestion].correct_answer) 
                        ? questions[selectedQuestion].correct_answer 
                        : [questions[selectedQuestion].correct_answer];
                      isCorrectOption = correctLabels.includes(option.label);
                    } else {
                      const correctIdx = Array.isArray(questions[selectedQuestion].correct_answer) 
                        ? questions[selectedQuestion].correct_answer[0] 
                        : questions[selectedQuestion].correct_answer;
                      isCorrectOption = index === correctIdx || String.fromCharCode(65 + index) === correctIdx;
                    }
                    
                    if (questions[selectedQuestion].student_answer !== null && 
                        questions[selectedQuestion].student_answer !== undefined) {
                      if (option.label) {
                        const studentLabels = Array.isArray(questions[selectedQuestion].student_answer) 
                          ? questions[selectedQuestion].student_answer 
                          : [questions[selectedQuestion].student_answer];
                        isSelectedOption = studentLabels.includes(option.label);
                      } else {
                        isSelectedOption = index === questions[selectedQuestion].student_answer || 
                                         String.fromCharCode(65 + index) === questions[selectedQuestion].student_answer;
                      }
                    }
                    
                    return renderOption(option, index, isCorrectOption, isSelectedOption);
                  })}
                </div>
              )}

              {/* MCQ Multiple Choice */}
              {questions[selectedQuestion].question_type === 'mcq_multiple' && (
                <div className="space-y-2">
                  {questions[selectedQuestion].options?.map((option: any, index: number) => {
                    const correctAnswers = Array.isArray(questions[selectedQuestion].correct_answer) 
                      ? questions[selectedQuestion].correct_answer 
                      : [];
                    const studentAnswers = Array.isArray(questions[selectedQuestion].student_answer) 
                      ? questions[selectedQuestion].student_answer 
                      : [];
                    const isCorrectOption = correctAnswers.includes(index) || correctAnswers.includes(option);
                    const isSelectedOption = studentAnswers.includes(index) || studentAnswers.includes(option);
                    return renderOption(option, index, isCorrectOption, isSelectedOption);
                  })}
                  <p className="text-xs text-gray-600 mt-2 bg-gray-50 p-3 rounded-lg">
                    <strong>Note:</strong> Multiple answers are correct for this question
                  </p>
                </div>
              )}

              {/* True/False */}
              {questions[selectedQuestion].question_type === 'true_false' && (
                <div className="space-y-2">
                  {['True', 'False'].map((option, index) => {
                    const isCorrectOption = questions[selectedQuestion].correct_answer === option || 
                                          questions[selectedQuestion].correct_answer === (index === 0);
                    const isSelectedOption = questions[selectedQuestion].student_answer === option || 
                                           questions[selectedQuestion].student_answer === (index === 0);
                    return renderOption(option, index, isCorrectOption, isSelectedOption);
                  })}
                </div>
              )}

              {/* Fill in the Blank */}
              {questions[selectedQuestion].question_type === 'fill_blank' && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Your Answer:</p>
                    <p className={`font-medium text-sm ${questions[selectedQuestion].is_correct ? 'text-green-900' : 'text-red-900'}`}>
                      {questions[selectedQuestion].student_answer || '(No answer provided)'}
                    </p>
                  </div>
                  <div className="bg-green-50 rounded-xl p-4 border border-green-200">
                    <p className="text-xs text-green-600 mb-2 font-medium">Accepted Answers:</p>
                    <div className="flex flex-wrap gap-2">
                      {Array.isArray(questions[selectedQuestion].correct_answer) ? (
                        questions[selectedQuestion].correct_answer.map((ans: any, idx: number) => (
                          <span key={idx} className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-medium">
                            {ans}
                          </span>
                        ))
                      ) : (
                        <span className="px-2 py-1 bg-green-600 text-white rounded-lg text-xs font-medium">
                          {questions[selectedQuestion].correct_answer}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Essay */}
              {questions[selectedQuestion].question_type === 'essay' && (
                <div className="space-y-3">
                  <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                    <p className="text-xs text-gray-600 mb-2 font-medium">Your Answer:</p>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap leading-relaxed">
                      {questions[selectedQuestion].student_answer || '(No answer provided)'}
                    </p>
                  </div>
                  {questions[selectedQuestion].explanation && (
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-xs text-blue-600 mb-2 font-medium flex items-center gap-1">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Model Answer / Guidelines:
                      </p>
                      <p className="text-sm text-blue-900 whitespace-pre-wrap leading-relaxed">
                        {questions[selectedQuestion].explanation}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Explanation */}
              {questions[selectedQuestion].explanation && questions[selectedQuestion].question_type !== 'essay' && (
                <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 mb-2 font-medium flex items-center gap-1">
                    <Lightbulb className="w-3.5 h-3.5" />
                    Explanation:
                  </p>
                  <p className="text-sm text-blue-900 leading-relaxed">
                    {questions[selectedQuestion].explanation}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 px-4 py-4 shadow-lg">
        <div className="flex items-center justify-between gap-4">
          <button
            onClick={() => setSelectedQuestion(Math.max(0, selectedQuestion - 1))}
            disabled={selectedQuestion === 0}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
              selectedQuestion === 0
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-gray-100 to-gray-200 text-gray-900 hover:from-gray-200 hover:to-gray-300 active:scale-95'
            }`}
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Previous</span>
          </button>
          <span className="text-xs font-medium text-gray-600 whitespace-nowrap">
            {selectedQuestion + 1} / {questions.length}
          </span>
          <button
            onClick={() => setSelectedQuestion(Math.min(questions.length - 1, selectedQuestion + 1))}
            disabled={selectedQuestion === questions.length - 1}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold transition-all ${
              selectedQuestion === questions.length - 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white hover:from-indigo-700 hover:to-purple-700 active:scale-95'
            }`}
          >
            <span className="hidden sm:inline">Next</span>
            <ArrowLeft className="w-4 h-4 rotate-180" />
          </button>
        </div>
      </div>
    </div>
  );
}