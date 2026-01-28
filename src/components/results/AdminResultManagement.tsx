import { Badge } from '../ui/badge';
import { ReportCard } from './ReportCard';
import { ReportCardWithPDF } from './ReportCardWithPDF';
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { FileText, Users, Eye } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  email: string;
}

export function AdminResultManagement() {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState(''); // Stores exam ID
  const [selectedExamName, setSelectedExamName] = useState(''); // Stores exam name for ReportCard
  
  const [viewingResult, setViewingResult] = useState<{
    student: Student;
    resultType: 'midterm' | 'terminal';
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchDropdownData();
  }, []);

  // Fetch exams when session and term are selected
  useEffect(() => {
    if (selectedSession && selectedTerm) {
      fetchExams();
    } else {
      setExams([]);
      setSelectedExam(''); // Reset exam ID when filters change
      setSelectedExamName(''); // Also reset exam name
    }
  }, [selectedSession, selectedTerm]);

  const fetchDropdownData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch classes
      const classRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
        { headers }
      );
      const classData = await classRes.json();
      if (classData.success) setClasses(classData.classes || []);

      // Fetch sessions and terms
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSessions(sessionData.sessions || []);
        setTerms(sessionData.terms || []);
      }

    } catch (error) {
      console.error('[AdminResultManagement] Error:', error);
    }
  };

  const fetchExams = async () => {
    if (!selectedSession || !selectedTerm) {
      setExams([]);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[AdminResultManagement] No session found');
        toast.error('Please log in to continue');
        return;
      }

      console.log('[AdminResultManagement] Fetching exams with auth token:', session.access_token?.substring(0, 20) + '...');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Exams are filtered by session and term only (not class_id)
      const params = new URLSearchParams({
        session: selectedSession,
        term: selectedTerm
      });

      console.log('[AdminResultManagement] Fetching exams with params:', {
        session: selectedSession,
        term: selectedTerm,
        hasToken: !!session.access_token
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams?${params.toString()}`,
        { headers }
      );
      
      console.log('[AdminResultManagement] Exams response status:', res.status);
      
      const data = await res.json();
      
      console.log('[AdminResultManagement] Exams response data:', data);
      
      if (data.success) {
        setExams(data.exams || []);
      } else {
        console.error('Failed to fetch exams:', data.error);
        toast.error(data.error || 'Failed to fetch exams');
        setExams([]);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Network error while fetching exams');
      setExams([]);
    }
  };

  const handleViewStudents = async () => {
    if (!selectedClass || !selectedSession || !selectedTerm || !selectedExam) {
      toast.error('Please select all filters');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Validate that selectedExam is a UUID, not a name
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(selectedExam);
      if (!isUUID) {
        console.error('[AdminResultManagement] ERROR: selectedExam is not a UUID:', selectedExam);
        toast.error('Invalid exam selection. Please reselect the exam.');
        return;
      }

      // Build SESSION-AWARE query with session, term, and exam_id for historical student retrieval
      const queryParams = new URLSearchParams({
        class_id: selectedClass,
        session: selectedSession,
        term: selectedTerm,
        exam_id: selectedExam
      });

      console.log('[AdminResultManagement] Fetching students with session-aware query:', {
        class: selectedClass,
        session: selectedSession,
        term: selectedTerm,
        exam: selectedExam,
        examName: selectedExamName,
        isValidUUID: isUUID
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students-for-results?${queryParams.toString()}`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success) {
        // Log breakdown of current vs promoted students
        if (result.breakdown) {
          console.log('[AdminResultManagement] Student breakdown:', result.breakdown);
          if (result.breakdown.historical > 0) {
            console.log(`[AdminResultManagement] ✅ Including ${result.breakdown.historical} promoted students with historical marks`);
            toast.info(`Found ${result.breakdown.current} current + ${result.breakdown.historical} promoted students with results`);
          }
        }
        
        setStudents(result.students || []);
        if (result.students?.length === 0) {
          toast.info('No students found in this class');
        }
      } else {
        toast.error(result.error || 'Failed to load students');
      }
    } catch (error) {
      console.error('[AdminResultManagement] Error:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  if (viewingResult) {
    return (
      <div className="space-y-4">
        <Button
          variant="outline"
          onClick={() => setViewingResult(null)}
        >
          ← Back to Student List
        </Button>
        <ReportCardWithPDF
          studentId={viewingResult.student.id}
          sessionName={selectedSession}
          termName={selectedTerm}
          examName={selectedExamName}
          resultType={viewingResult.resultType}
          userRole="admin"
        />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <FileText className="h-8 w-8" />
          Result Management
        </h1>
        <p className="text-slate-600 mt-2">View and manage student results</p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Select Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Class *</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(cls => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.display_name || cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Session *</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id || session.session_name} value={session.session_name}>
                      {session.session_name}
                      {session.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Term *</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger>
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.id || term.term_name} value={term.term_name}>
                      {term.term_name}
                      {term.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Exam *</Label>
              <Select 
                value={selectedExam} 
                onValueChange={(value) => {
                  setSelectedExam(value);
                  // Also store the exam name for ReportCard
                  const exam = exams.find(e => e.id === value);
                  setSelectedExamName(exam?.name || '');
                }}
                disabled={!selectedSession || !selectedTerm || exams.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    !selectedSession || !selectedTerm 
                      ? "Select session & term first" 
                      : exams.length === 0 
                        ? "No exams available"
                        : "Select exam"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {exams.length > 0 ? (
                    exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_exams__" disabled>
                      No exams found for selected filters
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedSession && selectedTerm && exams.length === 0 && (
                <p className="text-sm text-slate-500">No exams configured for the selected session and term</p>
              )}
            </div>
          </div>

          <Button onClick={handleViewStudents} disabled={loading} className="gap-2">
            <Users className="h-4 w-4" />
            {loading ? 'Loading...' : 'View Students'}
          </Button>
        </CardContent>
      </Card>

      {/* Students List */}
      {students.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Students in Selected Class</CardTitle>
              <Badge variant="secondary">{students.length} Students</Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {students.map(student => (
                <div key={student.id} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white font-semibold flex-shrink-0">
                        {student.first_name?.[0]}{student.last_name?.[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-medium truncate">
                          {student.first_name} {student.middle_name ? student.middle_name + ' ' : ''}{student.last_name}
                        </p>
                        <p className="text-sm text-slate-500 truncate">{student.email}</p>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2 sm:flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        className="gap-2 w-full sm:w-auto whitespace-nowrap"
                        onClick={() => setViewingResult({ student, resultType: 'midterm' })}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Midterm Result</span>
                        <span className="sm:hidden">Midterm</span>
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="gap-2 w-full sm:w-auto whitespace-nowrap"
                        onClick={() => setViewingResult({ student, resultType: 'terminal' })}
                      >
                        <Eye className="h-4 w-4" />
                        <span className="hidden sm:inline">Terminal Result</span>
                        <span className="sm:hidden">Terminal</span>
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}