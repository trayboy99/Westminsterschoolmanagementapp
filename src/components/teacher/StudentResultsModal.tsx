import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Eye,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  Calendar,
  Award,
  FileText,
  AlertCircle,
  Download
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { StudentAnswersModal } from './StudentAnswersModal';

interface StudentAttempt {
  id: string;
  student_id: string;
  student_name: string;
  exam_title: string;
  exam_id: string;
  total_score: number;
  total_marks: number;
  percentage: number;
  status: string;
  submitted_at: string;
  time_taken_seconds: number;
  questions_answered: number;
}

interface StudentResultsModalProps {
  classId: string;
  subject: string;
  teacherId: string;
  onClose: () => void;
}

export function StudentResultsModal({
  classId,
  subject,
  teacherId,
  onClose,
}: StudentResultsModalProps) {
  const [attempts, setAttempts] = useState<StudentAttempt[]>([]);
  const [filteredAttempts, setFilteredAttempts] = useState<StudentAttempt[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAttempt, setSelectedAttempt] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchStudentAttempts();
  }, [classId, subject]);

  useEffect(() => {
    filterAttempts();
  }, [searchTerm, attempts]);

  const fetchStudentAttempts = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      console.log('[StudentResultsModal] Fetching attempts for:', { classId, subject });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-teacher/student-attempts`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            classId,
            subject,
            teacherId,
          }),
        }
      );

      const data = await res.json();
      console.log('[StudentResultsModal] Response:', data);
      
      if (data.success) {
        console.log('[StudentResultsModal] Attempts loaded:', data.attempts?.length || 0);
        setAttempts(data.attempts || []);
        setFilteredAttempts(data.attempts || []);
      } else {
        toast.error(data.error || 'Failed to fetch student attempts');
      }
    } catch (error: any) {
      console.error('[StudentResultsModal] Error fetching attempts:', error);
      toast.error('Failed to load student attempts');
    } finally {
      setLoading(false);
    }
  };

  const filterAttempts = () => {
    if (!searchTerm.trim()) {
      setFilteredAttempts(attempts);
      return;
    }

    const filtered = attempts.filter(
      (attempt) =>
        attempt.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        attempt.exam_title.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredAttempts(filtered);
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'submitted':
        return <Badge className="bg-green-600">Submitted</Badge>;
      case 'auto_submitted':
        return <Badge className="bg-orange-600">Auto-Submitted</Badge>;
      case 'in_progress':
        return <Badge className="bg-yellow-600">In Progress</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl">Student Submissions - {subject}</DialogTitle>
            <DialogDescription className="text-sm">
              View all student attempts and their answers
            </DialogDescription>
          </DialogHeader>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by student name or exam..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 text-sm"
            />
          </div>

          {/* Loading State */}
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-20 bg-gray-200 rounded animate-pulse" />
              ))}
            </div>
          ) : filteredAttempts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12">
              <FileText className="h-12 w-12 text-gray-400 mb-4" />
              <p className="text-gray-900 font-medium mb-2">No Submissions Found</p>
              <p className="text-gray-600 text-center">
                {searchTerm
                  ? 'No submissions match your search criteria'
                  : 'No students have submitted exams yet'}
              </p>
            </div>
          ) : (
            /* Results Table */
            <div className="border rounded-lg overflow-hidden">
              {console.log('[StudentResultsModal] Rendering table with', filteredAttempts.length, 'attempts')}
              {console.log('[StudentResultsModal] First attempt:', filteredAttempts[0])}
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Student
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Exam
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Score
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Status
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Submitted
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredAttempts.map((attempt) => {
                      console.log('[StudentResultsModal] Rendering row for attempt:', attempt.id, attempt.student_name);
                      return (
                      <tr key={attempt.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="font-medium text-gray-900">
                            {attempt.student_name}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-900">{attempt.exam_title}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="space-y-1">
                            <div className={`font-medium ${getScoreColor(attempt.percentage)}`}>
                              {attempt.percentage.toFixed(1)}%
                            </div>
                            <div className="text-xs text-gray-600">
                              {attempt.total_score}/{attempt.total_marks} marks
                            </div>
                            <div className="text-xs text-gray-500">
                              ✓ {attempt.questions_answered}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          {getStatusBadge(attempt.status)}
                        </td>
                        <td className="px-4 py-3">
                          <div className="text-sm text-gray-600">
                            {formatDate(attempt.submitted_at)}
                          </div>
                          <div className="text-xs text-gray-500 flex items-center gap-1 mt-1">
                            <Clock className="h-3 w-3" />
                            {Math.round(attempt.time_taken_seconds / 60)} min
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              console.log('[StudentResultsModal] View Answers clicked for:', attempt.id);
                              setSelectedAttempt(attempt.id);
                            }}
                            className="bg-blue-600 text-white hover:bg-blue-700 border-blue-600"
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            View Answers
                          </Button>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Summary Stats */}
          {!loading && filteredAttempts.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-4 border-t">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-xs text-blue-600 mb-1">Total Submissions</p>
                <p className="text-lg sm:text-xl font-medium text-blue-900">{filteredAttempts.length}</p>
              </div>
              <div className="bg-green-50 rounded-lg p-3">
                <p className="text-xs text-green-600 mb-1">Average Score</p>
                <p className="text-lg sm:text-xl font-medium text-green-900">
                  {(
                    filteredAttempts.reduce((sum, a) => sum + a.percentage, 0) /
                    filteredAttempts.length
                  ).toFixed(1)}
                  %
                </p>
              </div>
              <div className="bg-orange-50 rounded-lg p-3">
                <p className="text-xs text-orange-600 mb-1">Highest Score</p>
                <p className="text-lg sm:text-xl font-medium text-orange-900">
                  {Math.max(...filteredAttempts.map((a) => a.percentage)).toFixed(1)}%
                </p>
              </div>
              <div className="bg-red-50 rounded-lg p-3">
                <p className="text-xs text-red-600 mb-1">Lowest Score</p>
                <p className="text-lg sm:text-xl font-medium text-red-900">
                  {Math.min(...filteredAttempts.map((a) => a.percentage)).toFixed(1)}%
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Student Answers Modal */}
      {selectedAttempt && (
        <StudentAnswersModal
          attemptId={selectedAttempt}
          onClose={() => setSelectedAttempt(null)}
        />
      )}
    </>
  );
}