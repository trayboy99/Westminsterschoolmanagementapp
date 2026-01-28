import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Clock, 
  BookOpen, 
  CheckCircle2, 
  PlayCircle, 
  AlertCircle,
  FileText,
  Calendar,
  Timer,
  Award,
  RefreshCw,
  Info
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { StudentCBTExamInterface } from './StudentCBTExamInterface';
import { CBTRulesAcknowledgment } from './CBTRulesAcknowledgment';

interface Exam {
  id: string;
  title: string;
  subject: string;
  class: string;
  session: string;
  term: string;
  instructions: string;
  exam_type: string;
  duration_minutes: number;
  total_marks: number;
  pass_mark: number;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  settings: any;
  hasAttempted: boolean;
  isCompleted: boolean;
  isInProgress: boolean;
  latestAttempt: any;
}

export function StudentCBTExams() {
  const { profile } = useAuth();
  const [exams, setExams] = useState<Exam[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeExam, setActiveExam] = useState<string | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [showRulesAcknowledgment, setShowRulesAcknowledgment] = useState(false);
  const [selectedExam, setSelectedExam] = useState<Exam | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (profile?.id) {
      fetchAvailableExams();
    }
  }, [profile]);

  const fetchAvailableExams = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/available-exams/${profile?.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();
      if (data.success) {
        // Debug: Log the first exam's scheduled times
        if (data.exams && data.exams.length > 0) {
          console.log('[StudentCBT] 📅 First exam schedule:', {
            title: data.exams[0].title,
            scheduled_start: data.exams[0].scheduled_start,
            scheduled_end: data.exams[0].scheduled_end,
            formatted_start: formatDate(data.exams[0].scheduled_start)
          });
        }
        
        // Filter out completed exams that don't allow retakes
        // Students should ONLY see exams if:
        // 1. Exam is not completed yet, OR
        // 2. Exam is completed BUT allow_retake is enabled
        const filteredExams = (data.exams || []).filter((exam: Exam) => {
          // If exam is not completed, always show it
          if (!exam.isCompleted) {
            return true;
          }
          
          // If exam is completed, only show if retakes are allowed
          return exam.settings?.allow_retake === true;
        });
        
        console.log('[StudentCBT] 📊 Filtering results:', {
          totalExams: data.exams?.length || 0,
          filteredExams: filteredExams.length,
          removedExams: (data.exams?.length || 0) - filteredExams.length
        });
        
        setExams(filteredExams);
      } else {
        toast.error(data.error || 'Failed to fetch exams');
      }
    } catch (error: any) {
      console.error('[StudentCBT] Error fetching exams:', error);
      toast.error('Failed to load exams');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExam = async (examId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      console.log('[StudentCBT] Starting exam:', examId);
      console.log('[StudentCBT] Student ID:', profile?.id);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/start-exam`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            examId,
            studentId: profile?.id,
          }),
        }
      );

      console.log('[StudentCBT] Response status:', res.status);
      console.log('[StudentCBT] Response ok:', res.ok);

      // Check if response is JSON
      const contentType = res.headers.get('content-type');
      console.log('[StudentCBT] Content-Type:', contentType);

      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text();
        console.error('[StudentCBT] Non-JSON response:', text);
        toast.error('Server returned an invalid response');
        return;
      }

      const data = await res.json();
      console.log('[StudentCBT] Response data:', data);

      if (data.success) {
        setAttemptId(data.attemptId);
        setActiveExam(examId);
        toast.success(data.message);
      } else {
        console.error('[StudentCBT] Start exam failed:', data);
        console.error('[StudentCBT] Full error response:', JSON.stringify(data, null, 2));
        toast.error(data.error || 'Failed to start exam');
      }
    } catch (error: any) {
      console.error('[StudentCBT] Error starting exam:', error);
      console.error('[StudentCBT] Error details:', {
        message: error.message,
        stack: error.stack,
        name: error.name
      });
      toast.error('Failed to start exam: ' + (error.message || 'Unknown error'));
    }
  };

  const handleExitExam = () => {
    setActiveExam(null);
    setAttemptId(null);
    fetchAvailableExams(); // Refresh the list
  };

  const formatDate = (dateString: string) => {
    // Use the same parsing logic to ensure consistency
    const date = parseLocalDateTime(dateString);
    
    return date.toLocaleDateString('en-US', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const parseLocalDateTime = (dateString: string): Date => {
    // Parse datetime string as LOCAL time (not UTC)
    const parts = dateString.replace('T', ' ').replace('Z', '').split(' ');
    const datePart = parts[0];
    const timePart = parts[1] || '00:00:00';
    
    const [year, month, day] = datePart.split('-').map(Number);
    const [hours, minutes, seconds] = timePart.split(':').map(Number);
    
    return new Date(year, month - 1, day, hours, minutes, seconds || 0);
  };

  const getTimeRemaining = (endDate: string) => {
    const now = new Date().getTime();
    const end = parseLocalDateTime(endDate).getTime();
    const diff = end - now;

    if (diff <= 0) return 'Expired';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days} day${days > 1 ? 's' : ''} left`;
    }
    if (hours > 0) {
      return `${hours}h ${minutes}m left`;
    }
    return `${minutes} min left`;
  };

  const getTimeUntilStart = (startDate: string) => {
    const now = new Date().getTime();
    const start = parseLocalDateTime(startDate).getTime();
    const diff = start - now;

    if (diff <= 0) return 'Started';

    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `Starts in ${days} day${days > 1 ? 's' : ''}`;
    }
    if (hours > 0) {
      return `Starts in ${hours}h ${minutes}m`;
    }
    return `Starts in ${minutes} min`;
  };

  const getStatusBadge = (exam: Exam) => {
    if (exam.isCompleted) {
      return <Badge className="bg-green-600">Completed</Badge>;
    }
    if (exam.isInProgress) {
      return <Badge className="bg-yellow-600">In Progress</Badge>;
    }
    
    // Use parseLocalDateTime for consistency
    const now = new Date();
    const start = parseLocalDateTime(exam.scheduled_start);
    const end = parseLocalDateTime(exam.scheduled_end);

    if (now < start) {
      return <Badge className="bg-blue-600">Upcoming</Badge>;
    }
    if (now > end) {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-600">Available Now</Badge>;
  };

  // If taking an exam, show exam interface
  if (activeExam && attemptId) {
    return (
      <StudentCBTExamInterface 
        attemptId={attemptId} 
        onExit={handleExitExam}
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Mobile Header with Gradient */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CBT Exams</h1>
              <p className="text-indigo-100 text-sm">Computer-Based Tests</p>
            </div>
          </div>
          <Button 
            onClick={fetchAvailableExams} 
            variant="ghost" 
            size="sm"
            className="text-white hover:bg-white/20 rounded-xl"
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Important Notice - App Style */}
      <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-blue-100 rounded-xl flex-shrink-0">
            <Info className="h-5 w-5 text-blue-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-semibold text-blue-900 mb-2">Exam Guidelines</h3>
            <ul className="space-y-1.5 text-sm text-blue-800">
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Ensure stable internet connection</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Do not switch tabs or exit fullscreen</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Answers are auto-saved automatically</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-blue-600 mt-0.5">•</span>
                <span>Once submitted, you cannot retake formal exams</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 animate-pulse">
              <div className="flex items-center justify-between mb-4">
                <div className="h-5 bg-gray-200 rounded-full w-20"></div>
                <div className="h-5 bg-gray-200 rounded-full w-16"></div>
              </div>
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2 mb-4"></div>
              <div className="space-y-2">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-5/6"></div>
              </div>
            </div>
          ))}
        </div>
      ) : exams.length === 0 ? (
        /* Empty State - App Style */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <BookOpen className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold text-lg mb-2">No Exams Available</p>
            <p className="text-gray-600 text-center text-sm">
              You don't have any scheduled exams at the moment. Check back later.
            </p>
          </div>
        </div>
      ) : (
        /* Exams Grid - App Style */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {exams.map((exam) => {
            const now = new Date();
            const start = parseLocalDateTime(exam.scheduled_start);
            const end = parseLocalDateTime(exam.scheduled_end);
            const isAvailable = now >= start && now <= end;
            const isExpired = now > end;

            return (
              <div 
                key={exam.id} 
                className={`bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden flex flex-col hover:shadow-md transition-shadow ${isExpired ? 'opacity-60' : ''}`}
              >
                {/* Card Header */}
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between mb-3">
                    <Badge variant="outline" className="text-xs rounded-full px-3">
                      {exam.exam_type}
                    </Badge>
                    {getStatusBadge(exam)}
                  </div>
                  <h3 className="text-lg font-semibold text-gray-900 line-clamp-2 mb-2">{exam.title}</h3>
                  <div className="flex items-center gap-1.5 text-gray-600 text-sm">
                    <BookOpen className="h-4 w-4" />
                    <span>{exam.subject}</span>
                  </div>
                </div>
                
                {/* Card Content */}
                <div className="flex-1 px-5 pb-5 space-y-3">
                  {/* Exam Details - Modern Icons */}
                  <div className="space-y-2.5">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <Calendar className="h-4 w-4 text-blue-600" />
                      </div>
                      <span className="text-sm text-gray-700">{formatDate(exam.scheduled_start)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <Timer className="h-4 w-4 text-purple-600" />
                      </div>
                      <span className="text-sm text-gray-700">{exam.duration_minutes} minutes</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-orange-50 rounded-lg">
                        <Award className="h-4 w-4 text-orange-600" />
                      </div>
                      <span className="text-sm text-gray-700">{exam.total_marks} marks</span>
                    </div>
                    {!isExpired && !isAvailable && !exam.isCompleted && (
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-green-50 rounded-lg">
                          <Clock className="h-4 w-4 text-green-600" />
                        </div>
                        <span className="text-sm font-medium text-green-700">{getTimeUntilStart(exam.scheduled_start)}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Message */}
                  {exam.isCompleted && exam.latestAttempt && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3">
                      <div className="flex items-center gap-2 text-green-800 mb-1">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="font-semibold text-sm">Completed</span>
                      </div>
                      <div className="text-sm text-green-700">
                        Score: {exam.latestAttempt.percentage?.toFixed(1)}% 
                        ({exam.latestAttempt.total_score}/{exam.total_marks})
                      </div>
                      {exam.latestAttempt.requires_manual_grading && !exam.latestAttempt.manual_grading_completed && (
                        <div className="text-xs text-yellow-700 mt-1 flex items-center gap-1">
                          <span>⏳</span>
                          <span>Awaiting manual grading</span>
                        </div>
                      )}
                    </div>
                  )}

                  {exam.isInProgress && (
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600 mt-0.5" />
                        <span className="text-yellow-800 text-sm">
                          You have an incomplete attempt. Click "Resume" to continue.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Action Button - App Style */}
                  <div className="pt-2">
                    {exam.isCompleted ? (
                      exam.settings?.allow_retake ? (
                        <Button 
                          className="w-full bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-700 hover:to-purple-800 h-11 rounded-xl text-base font-semibold shadow-md"
                          onClick={() => handleStartExam(exam.id)}
                          disabled={isExpired}
                        >
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Retake Exam
                        </Button>
                      ) : (
                        <div className="text-center text-sm text-gray-600 py-3 bg-gray-50 rounded-xl">
                          View results in CBT Results
                        </div>
                      )
                    ) : exam.isInProgress ? (
                      <Button 
                        className="w-full bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 h-11 rounded-xl text-base font-semibold shadow-md"
                        onClick={() => handleStartExam(exam.id)}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Resume Exam
                      </Button>
                    ) : isAvailable && !isExpired ? (
                      <Button 
                        className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 h-11 rounded-xl text-base font-semibold shadow-md"
                        onClick={() => {
                          setSelectedExam(exam);
                          setShowRulesAcknowledgment(true);
                        }}
                      >
                        <PlayCircle className="h-4 w-4 mr-2" />
                        Start Exam
                      </Button>
                    ) : (
                      <Button 
                        variant="outline" 
                        className="w-full h-11 rounded-xl"
                        disabled
                      >
                        {isExpired ? 'Expired' : 'Not Yet Available'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
      
      {/* CBTRulesAcknowledgment Modal */}
      {showRulesAcknowledgment && selectedExam && (
        <div className="fixed inset-0 z-50">
          <CBTRulesAcknowledgment
            examTitle={selectedExam.title}
            onAccept={() => {
              setShowRulesAcknowledgment(false);
              handleStartExam(selectedExam.id);
            }}
            onCancel={() => {
              setShowRulesAcknowledgment(false);
              setSelectedExam(null);
            }}
          />
        </div>
      )}
    </div>
  );
}