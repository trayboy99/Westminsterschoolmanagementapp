import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  Users, 
  Search, 
  BookOpen, 
  Calendar,
  AlertCircle,
  RefreshCw,
  GraduationCap,
  Trash2
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { toast } from 'sonner';
import { StudentResultsModal } from './StudentResultsModal';

interface ClassExam {
  class: string;
  className: string;
  subject: string;
  examCount: number;
  completedAttempts: number;
  totalStudents: number;
  averageScore: number;
  session: string;
  term: string;
}

export function CBTResults() {
  const { profile } = useAuth();
  const [classExams, setClassExams] = useState<ClassExam[]>([]);
  const [filteredExams, setFilteredExams] = useState<ClassExam[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const supabase = createClient();

  useEffect(() => {
    if (profile?.id) {
      fetchClassExams();
    }
  }, [profile]);

  useEffect(() => {
    filterExams();
  }, [searchTerm, classExams]);

  const fetchClassExams = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      console.log('[CBTResults] Fetching results for teacher:', profile?.id);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-teacher/class-results/${profile?.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();
      console.log('[CBTResults] Response:', data);
      
      if (data.success) {
        console.log('[CBTResults] Class exams:', data.classExams);
        setClassExams(data.classExams || []);
        setFilteredExams(data.classExams || []);
      } else {
        console.error('[CBTResults] Error:', data.error);
        toast.error(data.error || 'Failed to fetch results');
      }
    } catch (error: any) {
      console.error('[CBTResults] Error fetching class exams:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const filterExams = () => {
    if (!searchTerm.trim()) {
      setFilteredExams(classExams);
      return;
    }

    const filtered = classExams.filter(
      (exam) =>
        exam.className.toLowerCase().includes(searchTerm.toLowerCase()) ||
        exam.subject.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredExams(filtered);
  };

  const handleViewResults = (classId: string, subject: string) => {
    setSelectedClass(classId);
    setSelectedSubject(subject);
  };

  const handleCloseModal = () => {
    setSelectedClass(null);
    setSelectedSubject(null);
    fetchClassExams(); // Refresh data
  };

  const handleCleanupOrphanedExams = async () => {
    const confirmed = confirm(
      'This will delete all exam records and submissions for question banks that no longer exist.\n\nAre you sure you want to continue?'
    );

    if (!confirmed) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      toast.loading('Cleaning up orphaned exams...');

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/cleanup-orphaned-exams`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await res.json();
      toast.dismiss();

      if (data.success) {
        toast.success(data.message);
        fetchClassExams(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to cleanup orphaned exams');
      }
    } catch (error: any) {
      toast.dismiss();
      console.error('[CBTResults] Error cleaning up orphaned exams:', error);
      toast.error('Failed to cleanup orphaned exams');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-gray-900">Student Results</h2>
          <p className="text-gray-600 mt-1">
            View student submissions and scores by class
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCleanupOrphanedExams} variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
            <Trash2 className="h-4 w-4 mr-2" />
            Clean Up
          </Button>
          <Button onClick={fetchClassExams} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
        <Input
          placeholder="Search by class or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Loading State */}
      {loading ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="h-4 bg-gray-200 rounded"></div>
                  <div className="h-4 bg-gray-200 rounded w-5/6"></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredExams.length === 0 ? (
        /* Empty State */
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <GraduationCap className="h-12 w-12 text-gray-400 mb-4" />
            <p className="text-gray-900 font-medium mb-2">No Results Available</p>
            <p className="text-gray-600 text-center">
              {searchTerm
                ? 'No results match your search criteria'
                : 'No student submissions found for your subjects'}
            </p>
          </CardContent>
        </Card>
      ) : (
        /* Class Cards Grid */
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filteredExams.map((exam, index) => (
            <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between mb-2">
                  <Badge variant="outline" className="text-xs">
                    {exam.session} - {exam.term}
                  </Badge>
                  <Badge className="bg-blue-600">
                    {exam.completedAttempts} submissions
                  </Badge>
                </div>
                <CardTitle className="text-lg">{exam.className}</CardTitle>
                <CardDescription className="flex items-center gap-1">
                  <BookOpen className="h-3 w-3" />
                  {exam.subject}
                </CardDescription>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-blue-50 rounded-lg p-3">
                    <p className="text-xs text-blue-600 mb-1">Students</p>
                    <p className="font-medium text-blue-900">{exam.totalStudents}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-3">
                    <p className="text-xs text-green-600 mb-1">Avg Score</p>
                    <p className="font-medium text-green-900">
                      {exam.averageScore > 0 ? `${exam.averageScore.toFixed(1)}%` : 'N/A'}
                    </p>
                  </div>
                </div>

                <div className="bg-gray-50 rounded-lg p-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">Exams Created</span>
                    <span className="font-medium text-gray-900">{exam.examCount}</span>
                  </div>
                </div>

                {/* View Button */}
                <Button
                  className="w-full"
                  onClick={() => handleViewResults(exam.class, exam.subject)}
                >
                  <Users className="h-4 w-4 mr-2" />
                  View Submissions
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Student Results Modal */}
      {selectedClass && selectedSubject && (
        <StudentResultsModal
          classId={selectedClass}
          subject={selectedSubject}
          teacherId={profile?.id || ''}
          onClose={handleCloseModal}
        />
      )}
    </div>
  );
}