import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AlertCircle, Clock, FileQuestion, Maximize, X, ChevronLeft, ChevronRight, Flag, Save, Send, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import html2canvas from 'html2canvas';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Alert, AlertDescription } from '../ui/alert';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Checkbox } from '../ui/checkbox';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '../ui/alert-dialog';

interface Question {
  id: string;
  question_id: string;
  question_order: number;
  marks: number;
  section: string;
  cbt_questions: {
    id: string;
    question_type: string;
    question_text: string;
    question_image_url: string;
    options: any;
    marks: number;
    time_weight: number;
  };
  studentAnswer: any;
  isFlagged: boolean;
  answeredAt: string;
}

interface ExamData {
  exam: any;
  attempt: any;
  questions: Question[];
}

interface Props {
  attemptId: string;
  onExit: () => void;
}

export function StudentCBTExamInterface({ attemptId, onExit }: Props) {
  const [examData, setExamData] = useState<ExamData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showRulesDialog, setShowRulesDialog] = useState(true);
  const [rulesText, setRulesText] = useState('');
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [flaggedQuestions, setFlaggedQuestions] = useState<Set<string>>(new Set());
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [autoSaving, setAutoSaving] = useState(false);
  const [tabSwitches, setTabSwitches] = useState(0);
  const [fullscreenExits, setFullscreenExits] = useState(0);
  const [showPenaltyAlert, setShowPenaltyAlert] = useState(false);
  const [pendingPenalty, setPendingPenalty] = useState<{message: string; seconds: number} | null>(null);
  const autoSaveTimerRef = useRef<any>(null);
  const timeTimerRef = useRef<any>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchExamData();
    setupFullscreenMode();
    setupVisibilityListeners();
    return () => {
      cleanupListeners();
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
      if (timeTimerRef.current) clearInterval(timeTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (examData) {
      // Calculate time remaining
      const startTime = new Date(examData.attempt.start_time).getTime();
      const duration = examData.exam.duration_minutes * 60 * 1000;
      const endTime = startTime + duration;
      const remaining = Math.max(0, endTime - Date.now());
      setTimeRemaining(Math.floor(remaining / 1000));

      // Initialize answers from existing data
      const initialAnswers: Record<string, any> = {};
      const initialFlags = new Set<string>();
      examData.questions.forEach((q) => {
        if (q.studentAnswer) {
          initialAnswers[q.question_id] = q.studentAnswer;
        }
        if (q.isFlagged) {
          initialFlags.add(q.question_id);
        }
      });
      setAnswers(initialAnswers);
      setFlaggedQuestions(initialFlags);

      // Start auto-save timer (every 10 seconds)
      autoSaveTimerRef.current = setInterval(() => {
        autoSaveAnswers();
      }, 10000);

      // Start countdown timer
      timeTimerRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleAutoSubmit();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  }, [examData]);

  const fetchExamData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please login again.');
        onExit();
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/exam-data/${attemptId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();
      if (data.success) {
        setExamData(data);
        setRulesText(data.examRules || 'No specific rules provided for this exam.');
      } else {
        toast.error(data.error || 'Failed to load exam');
        onExit();
      }
    } catch (error: any) {
      console.error('[CBT Exam] Error fetching exam data:', error);
      toast.error('Failed to load exam');
      onExit();
    } finally {
      setLoading(false);
    }
  };

  const setupFullscreenMode = () => {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch((err) => {
        // Fullscreen may be blocked by browser policy - this is not critical
        console.log('[CBT] Fullscreen not available (browser policy):', err.message);
      });
    }
  };

  const setupVisibilityListeners = () => {
    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
  };

  const cleanupListeners = () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    document.removeEventListener('fullscreenchange', handleFullscreenChange);
    if (document.fullscreenElement) {
      document.exitFullscreen();
    }
  };

  const handleVisibilityChange = () => {
    if (document.hidden) {
      setTabSwitches((prev) => prev + 1);
      captureScreenshotAndLogViolation('tab_switch', 'medium', { 
        timestamp: new Date().toISOString(),
        message: 'Student switched away from exam tab'
      });
      // Don't show toast here - student can't see it when they switch tabs
      // Penalty will be shown when they return via the penalty alert dialog
    }
  };

  const handleFullscreenChange = () => {
    const inFullscreen = !!document.fullscreenElement;
    setIsFullscreen(inFullscreen);
    if (!inFullscreen && examData) {
      setFullscreenExits((prev) => prev + 1);
      captureScreenshotAndLogViolation('fullscreen_exit', 'high', { 
        timestamp: new Date().toISOString(),
        message: 'Student exited fullscreen mode'
      });
      // Don't show toast - penalty alert dialog will show instead
    }
  };

  const captureScreenshotAndLogViolation = async (violationType: string, severity: string, details: any) => {
    // Skip screenshot capture - just log the violation directly
    // Screenshot capture with html2canvas is causing oklch color parsing errors
    // that cannot be reliably fixed across all browsers and CSS configurations
    console.log('[CBT Violation] Logging violation without screenshot:', violationType);
    logViolationWithoutScreenshot(violationType, severity, details);
  };

  const logViolationWithoutScreenshot = async (violationType: string, severity: string, details: any) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/log-violation`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            attemptId,
            violationType,
            severity,
            details,
          }),
        }
      );

      const result = await response.json();
      if (result.success) {
        console.log('[CBT Violation] Logged without screenshot:', result);
        
        // Apply time penalty if specified
        if (result.penaltySeconds > 0) {
          setTimeRemaining((prev) => Math.max(0, prev - result.penaltySeconds));
          setPendingPenalty({ message: result.penaltyMessage, seconds: result.penaltySeconds });
          setShowPenaltyAlert(true);
        }
        
        // Auto-submit if max violations exceeded
        if (result.shouldAutoSubmit) {
          toast.error(`🚨 Maximum violations (${result.maxViolations}) exceeded! Auto-submitting exam...`, {
            duration: 5000,
          });
          setTimeout(() => {
            handleAutoSubmit();
          }, 3000);
        }
      }
    } catch (error) {
      console.error('[CBT Exam] Error logging violation:', error);
    }
  };

  const autoSaveAnswers = async () => {
    if (!examData || autoSaving) return;

    try {
      setAutoSaving(true);
      const currentQuestion = examData.questions[currentQuestionIndex];
      const currentAnswer = answers[currentQuestion.question_id];

      if (currentAnswer !== undefined) {
        await saveAnswer(currentQuestion.question_id, currentAnswer, flaggedQuestions.has(currentQuestion.question_id));
      }
    } catch (error) {
      console.error('[CBT Exam] Auto-save error:', error);
    } finally {
      setAutoSaving(false);
    }
  };

  const saveAnswer = async (questionId: string, answer: any, isFlagged: boolean) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/save-answer`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            attemptId,
            questionId,
            answer,
            isFlagged,
          }),
        }
      );
    } catch (error) {
      console.error('[CBT Exam] Error saving answer:', error);
    }
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: answer,
    }));
  };

  const handleToggleFlag = (questionId: string) => {
    setFlaggedQuestions((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(questionId)) {
        newSet.delete(questionId);
      } else {
        newSet.add(questionId);
      }
      return newSet;
    });
  };

  const handlePrevious = async () => {
    if (currentQuestionIndex > 0) {
      await autoSaveAnswers();
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };

  const handleNext = async () => {
    if (examData && currentQuestionIndex < examData.questions.length - 1) {
      await autoSaveAnswers();
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };

  const handleJumpToQuestion = async (index: number) => {
    await autoSaveAnswers();
    setCurrentQuestionIndex(index);
  };

  const handleSubmit = async () => {
    try {
      setSubmitting(true);
      await autoSaveAnswers(); // Save current answer

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/submit-exam`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({ attemptId }),
        }
      );

      const data = await res.json();
      if (data.success) {
        toast.success('Exam submitted successfully!');
        if (data.requiresManualGrading) {
          toast.info('Some questions require manual grading. Results will be available after teacher review.');
        } else {
          toast.success(`Your score: ${data.percentage}% (${data.autoGradedScore}/${data.totalMarks})`);
        }
        onExit();
      } else {
        toast.error(data.error || 'Failed to submit exam');
      }
    } catch (error: any) {
      console.error('[CBT Exam] Error submitting exam:', error);
      toast.error('Failed to submit exam');
    } finally {
      setSubmitting(false);
      setShowSubmitDialog(false);
    }
  };

  const handleAutoSubmit = async () => {
    toast.warning('Time is up! Auto-submitting exam...');
    await handleSubmit();
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = (question: Question) => {
    const q = question.cbt_questions;
    const answer = answers[question.question_id];
    
    // Helper function to clean option text (remove asterisks, merged options, and extra numbering)
    const cleanOptionText = (text: string) => {
      if (!text) return '';
      
      // Remove asterisks
      text = text.replace(/\s*\*\s*/g, '').trim();
      
      // CRITICAL FIX: Extract only the first word/phrase before next option letter
      // Handle cases like "A B. An C. The" → extract "A"
      // or "AB. An C. The" → extract "An" (but this should be "A")
      
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

    switch (q.question_type) {
      case 'mcq_single':
      case 'true_false':
        return (
          <RadioGroup
            value={answer?.[0] || ''}
            onValueChange={(value) => handleAnswerChange(question.question_id, [value])}
          >
            <div className="space-y-3">
              {q.options?.map((option: any, idx: number) => (
                <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                  <RadioGroupItem value={option.label} id={`${question.id}-${idx}`} />
                  <Label 
                    htmlFor={`${question.id}-${idx}`} 
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium mr-2">{option.label}.</span>
                    {cleanOptionText(option.text)}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        );

      case 'mcq_multiple':
        return (
          <div className="space-y-3">
            {q.options?.map((option: any, idx: number) => {
              const checked = answer?.includes(option.label) || false;
              return (
                <div key={idx} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50">
                  <Checkbox
                    id={`${question.id}-${idx}`}
                    checked={checked}
                    onCheckedChange={(isChecked) => {
                      const currentAnswers = answer || [];
                      if (isChecked) {
                        handleAnswerChange(question.question_id, [...currentAnswers, option.label]);
                      } else {
                        handleAnswerChange(
                          question.question_id,
                          currentAnswers.filter((a: string) => a !== option.label)
                        );
                      }
                    }}
                  />
                  <Label 
                    htmlFor={`${question.id}-${idx}`} 
                    className="flex-1 cursor-pointer"
                  >
                    <span className="font-medium mr-2">{option.label}.</span>
                    {cleanOptionText(option.text)}
                  </Label>
                </div>
              );
            })}
            <p className="text-sm text-gray-600 mt-2">
              <Info className="h-4 w-4 inline mr-1" />
              Select all that apply
            </p>
          </div>
        );

      case 'fill_blank':
        return (
          <Input
            type="text"
            value={answer || ''}
            onChange={(e) => handleAnswerChange(question.question_id, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full"
          />
        );

      case 'essay':
        return (
          <div>
            <Textarea
              value={answer?.text || ''}
              onChange={(e) => handleAnswerChange(question.question_id, { text: e.target.value, wordCount: e.target.value.split(/\s+/).length })}
              placeholder="Type your essay here..."
              className="w-full min-h-[200px]"
            />
            <p className="text-sm text-gray-600 mt-2">
              Word count: {answer?.text ? answer.text.split(/\s+/).filter((w: string) => w).length : 0}
            </p>
          </div>
        );

      default:
        return <p className="text-gray-500">Unsupported question type</p>;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Card className="w-96">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading exam...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!examData) {
    return null;
  }

  const currentQuestion = examData.questions[currentQuestionIndex];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / examData.questions.length) * 100;
  const timeWarning = timeRemaining < 300; // 5 minutes

  return (
    <div className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h2 className="font-semibold text-gray-900">{examData.exam.title}</h2>
                <p className="text-sm text-gray-600">{examData.exam.subject}</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Badge variant="outline">
                    Question {currentQuestionIndex + 1} of {examData.questions.length}
                  </Badge>
                  {autoSaving && (
                    <Badge variant="outline" className="bg-green-50 text-green-700">
                      <Save className="h-3 w-3 mr-1" />
                      Saving...
                    </Badge>
                  )}
                </div>
                <div className={`flex items-center gap-2 px-3 py-1 rounded-lg ${timeWarning ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
                  <Clock className="h-4 w-4" />
                  <span className="font-mono font-semibold">{formatTime(timeRemaining)}</span>
                </div>
              </div>
            </div>
            {/* Progress Bar */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Progress</span>
                <span className="text-sm font-medium text-gray-900">
                  {answeredCount} / {examData.questions.length} answered
                </span>
              </div>
              <Progress value={progress} className="h-2" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warnings */}
      {(tabSwitches > 0 || fullscreenExits > 0) && (
        <div className="max-w-6xl mx-auto mb-4">
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Violations Detected:</strong> 
              {tabSwitches > 0 && ` ${tabSwitches} tab switch(es)`}
              {tabSwitches > 0 && fullscreenExits > 0 && ', '}
              {fullscreenExits > 0 && ` ${fullscreenExits} fullscreen exit(s)`}
              . These will be reported to your teacher.
            </AlertDescription>
          </Alert>
        </div>
      )}

      {/* Main Content */}
      <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Question Panel */}
        <div className="lg:col-span-3">
          <Card>
            <CardHeader className="pb-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge>Question {currentQuestion.question_order}</Badge>
                    {currentQuestion.section && (
                      <Badge variant="outline">{currentQuestion.section}</Badge>
                    )}
                    <Badge variant="outline">{currentQuestion.marks || currentQuestion.cbt_questions.marks} mark(s)</Badge>
                  </div>
                  <CardTitle className="text-lg">
                    {currentQuestion.cbt_questions.question_text}
                  </CardTitle>
                </div>
                <Button
                  variant={flaggedQuestions.has(currentQuestion.question_id) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => handleToggleFlag(currentQuestion.question_id)}
                >
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
              {currentQuestion.cbt_questions.question_image_url && (
                <img
                  src={currentQuestion.cbt_questions.question_image_url}
                  alt="Question"
                  className="mt-4 max-w-full rounded-lg border"
                />
              )}
            </CardHeader>
            <CardContent>
              {renderQuestion(currentQuestion)}
            </CardContent>
          </Card>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-4">
            <Button
              onClick={handlePrevious}
              disabled={currentQuestionIndex === 0}
              variant="outline"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            {currentQuestionIndex === examData.questions.length - 1 ? (
              <Button
                onClick={() => setShowSubmitDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                <Send className="h-4 w-4 mr-2" />
                Submit Exam
              </Button>
            ) : (
              <Button
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            )}
          </div>
        </div>

        {/* Question Navigator */}
        <div className="lg:col-span-1">
          <Card className="sticky top-4">
            <CardHeader>
              <CardTitle className="text-base">Question Navigator</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-5 gap-2">
                {examData.questions.map((q, idx) => {
                  const isAnswered = answers[q.question_id] !== undefined;
                  const isFlagged = flaggedQuestions.has(q.question_id);
                  const isCurrent = idx === currentQuestionIndex;

                  return (
                    <button
                      key={q.id}
                      onClick={() => handleJumpToQuestion(idx)}
                      className={`
                        aspect-square rounded-lg flex items-center justify-center text-sm font-medium transition-colors relative
                        ${isCurrent 
                          ? 'bg-blue-600 text-white' 
                          : isAnswered 
                            ? 'bg-green-100 text-green-800 hover:bg-green-200' 
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }
                      `}
                    >
                      {idx + 1}
                      {isFlagged && (
                        <Flag className="h-3 w-3 absolute -top-1 -right-1 text-red-600" fill="currentColor" />
                      )}
                    </button>
                  );
                })}
              </div>
              <div className="mt-4 space-y-2 text-xs text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-blue-600 rounded"></div>
                  <span>Current</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-green-100 border border-green-800 rounded"></div>
                  <span>Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 border border-gray-600 rounded"></div>
                  <span>Not Answered</span>
                </div>
                <div className="flex items-center gap-2">
                  <Flag className="h-4 w-4 text-red-600" fill="currentColor" />
                  <span>Flagged</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Submit Confirmation Dialog */}
      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Exam?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to submit this exam? You have answered{' '}
              <strong>{answeredCount} out of {examData.questions.length}</strong> questions.
              {answeredCount < examData.questions.length && (
                <span className="block mt-2 text-red-600">
                  <AlertCircle className="h-4 w-4 inline mr-1" />
                  Warning: You have unanswered questions!
                </span>
              )}
              <span className="block mt-2">
                Once submitted, you cannot make any changes.
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSubmit}
              disabled={submitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Submitting...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Yes, Submit
                </>
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Penalty Alert */}
      <AlertDialog open={showPenaltyAlert} onOpenChange={setShowPenaltyAlert}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <AlertDialogTitle className="text-xl text-red-900">Violation Penalty Applied!</AlertDialogTitle>
              </div>
            </div>
            <AlertDialogDescription>
              A violation has been detected and time has been deducted from your exam timer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-red-900 font-semibold mb-2">Time Deducted:</p>
              <p className="text-red-800 text-lg font-bold">{pendingPenalty?.message}</p>
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-gray-700 text-sm">
                <strong>Remaining Time:</strong> {formatTime(timeRemaining)}
              </p>
              <p className="text-gray-600 text-xs mt-2">
                Violations are tracked and will be reported to your teacher. Further violations may result in automatic exam submission.
              </p>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowPenaltyAlert(false)}
              className="w-full bg-red-600 hover:bg-red-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Rules Dialog */}
      <AlertDialog open={showRulesDialog} onOpenChange={setShowRulesDialog}>
        <AlertDialogContent className="max-w-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Exam Rules</AlertDialogTitle>
            <AlertDialogDescription>
              Please read and understand the rules before starting the exam.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 pt-4">
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <div className="text-gray-700 text-sm whitespace-pre-wrap">
                {rulesText}
              </div>
            </div>
          </div>
          
          <AlertDialogFooter>
            <AlertDialogAction
              onClick={() => setShowRulesDialog(false)}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="h-4 w-4 mr-2" />
              I Understand
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}