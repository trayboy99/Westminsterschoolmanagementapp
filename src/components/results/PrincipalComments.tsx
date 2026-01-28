import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MessageSquare, Save, AlertCircle, Loader2, CheckCircle, TrendingUp, Award, ThumbsUp, ThumbsDown, Eye } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../ui/dialog';

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  average_score?: number;
  percentage_score?: number;
  overall_grade?: string;
  overall_remark?: string;
}

interface ClassStudent {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
}

interface TeacherComment {
  student_id: string;
  comment: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

interface PrincipalComment {
  student_id: string;
  comment: string;
}

export function PrincipalComments() {
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [classStudents, setClassStudents] = useState<ClassStudent[]>([]);
  
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedExamType, setSelectedExamType] = useState<'midterm' | 'terminal'>('midterm');
  
  const [principalComments, setPrincipalComments] = useState<Record<string, string>>({});
  const [existingPrincipalComments, setExistingPrincipalComments] = useState<Record<string, string>>({});
  const [teacherComments, setTeacherComments] = useState<Record<string, TeacherComment>>({});
  const [teacherInfo, setTeacherInfo] = useState<{ name: string; id: string } | null>(null);
  
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingResults, setLoadingResults] = useState(false);
  const [processingApproval, setProcessingApproval] = useState(false);
  
  const [rejectionDialog, setRejectionDialog] = useState<{ open: boolean; studentId: string; studentName: string }>({
    open: false,
    studentId: '',
    studentName: ''
  });
  const [rejectionReason, setRejectionReason] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSession && selectedTerm) {
      console.log('[PrincipalComments] useEffect triggered - fetching exams for:', { selectedSession, selectedTerm });
      fetchExams();
    } else {
      console.log('[PrincipalComments] useEffect - missing session or term:', { selectedSession, selectedTerm });
    }
  }, [selectedSession, selectedTerm]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    }
  }, [selectedClass]);

  useEffect(() => {
    if (selectedClass && selectedSession && selectedTerm && selectedExam && selectedExamType) {
      fetchStudentsWithResults();
      fetchComments();
      fetchTeacherInfo();
    }
  }, [selectedClass, selectedSession, selectedTerm, selectedExam, selectedExamType]);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
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
      if (classData.success) {
        setClasses(classData.classes || []);
      }

      // Fetch sessions and terms
      const settingsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const settingsData = await settingsRes.json();
      
      if (settingsData.success) {
        setSessions(settingsData.sessions || []);
        setTerms(settingsData.terms || []);
        
        // Set current session/term as default
        const currentSession = settingsData.sessions?.find((s: any) => s.is_current);
        const currentTerm = settingsData.terms?.find((t: any) => t.is_current);
        
        if (currentSession) setSelectedSession(currentSession.session_name);
        if (currentTerm) setSelectedTerm(currentTerm.term_name);
      }

      setLoading(false);
    } catch (error) {
      console.error('Error fetching initial data:', error);
      toast.error('Failed to load data');
      setLoading(false);
    }
  };

  const fetchExams = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Build query params with session and term filters
      const params = new URLSearchParams();
      if (selectedSession) params.append('session', selectedSession);
      if (selectedTerm) params.append('term', selectedTerm);
      
      const queryString = params.toString();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams${queryString ? `?${queryString}` : ''}`;
      
      console.log('[PrincipalComments] Fetching exams with filters:', { selectedSession, selectedTerm, url });

      const res = await fetch(url, { headers });
      const data = await res.json();
      
      console.log('[PrincipalComments] Exams response:', data);
      
      if (data.success) {
        setExams(data.exams || []);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchClassStudents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-students?class_id=${selectedClass}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setClassStudents(data.students || []);
        console.log('Fetched class students:', data.students?.length);
      } else {
        console.error('Failed to fetch class students:', data.error);
        setClassStudents([]);
      }
    } catch (error) {
      console.error('Error fetching class students:', error);
      setClassStudents([]);
    }
  };

  const fetchTeacherInfo = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-teacher-info?class_id=${selectedClass}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success && data.teacher) {
        setTeacherInfo(data.teacher);
      } else {
        setTeacherInfo(null);
      }
    } catch (error) {
      console.error('Error fetching teacher info:', error);
      setTeacherInfo(null);
    }
  };

  const fetchStudentsWithResults = async () => {
    try {
      setLoadingResults(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students-with-results?` +
        `class_id=${selectedClass}&session=${selectedSession}&term=${selectedTerm}&exam=${selectedExam}&type=${selectedExamType}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setStudents(data.students || []);
      } else {
        setStudents([]);
        console.error('Failed to fetch students:', data.error);
      }
    } catch (error) {
      console.error('Error fetching students with results:', error);
      setStudents([]);
    } finally {
      setLoadingResults(false);
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      console.log('[Principal Comments] Fetching comments for:', {
        class: selectedClass,
        session: selectedSession,
        term: selectedTerm,
        exam: selectedExam,
        type: selectedExamType
      });
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch principal comments
      const principalRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/principal-comments?` +
        `session=${selectedSession}&term=${selectedTerm}&exam=${selectedExam}&type=${selectedExamType}`,
        { headers }
      );
      const principalData = await principalRes.json();
      
      if (principalData.success) {
        const commentsMap: Record<string, string> = {};
        // Handle both array and object formats
        if (Array.isArray(principalData.comments)) {
          principalData.comments.forEach((c: PrincipalComment) => {
            commentsMap[c.student_id] = c.comment;
          });
        } else if (principalData.comments && typeof principalData.comments === 'object') {
          // If comments is an object, iterate over its entries
          Object.entries(principalData.comments).forEach(([studentId, comment]) => {
            if (typeof comment === 'string') {
              commentsMap[studentId] = comment;
            } else if (comment && typeof comment === 'object' && 'comment' in comment) {
              commentsMap[studentId] = (comment as any).comment;
            }
          });
        }
        setExistingPrincipalComments(commentsMap);
        setPrincipalComments(commentsMap);
      }

      // Fetch teacher comments for this class
      const teacherRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-comments-for-class?` +
        `class_id=${selectedClass}&session=${selectedSession}&term=${selectedTerm}&exam=${selectedExam}&type=${selectedExamType}`,
        { headers }
      );
      const teacherData = await teacherRes.json();
      
      if (teacherData.success) {
        console.log('[Principal Comments] Fetched teacher comments:', teacherData.comments?.length || 0);
        if (teacherData.comments && teacherData.comments.length > 0) {
          console.log('[Principal Comments] Sample comment:', teacherData.comments[0]);
        }
        const teacherCommentsMap: Record<string, TeacherComment> = {};
        // Handle both array and object formats
        if (Array.isArray(teacherData.comments)) {
          teacherData.comments.forEach((c: TeacherComment) => {
            teacherCommentsMap[c.student_id] = c;
          });
        } else if (teacherData.comments && typeof teacherData.comments === 'object') {
          Object.entries(teacherData.comments).forEach(([studentId, comment]) => {
            if (comment && typeof comment === 'object') {
              teacherCommentsMap[studentId] = comment as TeacherComment;
            }
          });
        }
        setTeacherComments(teacherCommentsMap);
        console.log('[Principal Comments] Teacher comments map size:', Object.keys(teacherCommentsMap).length);
      } else {
        console.error('[Principal Comments] Failed to fetch teacher comments:', teacherData.error);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
      toast.error('Failed to load comments. Please try again.');
    } finally {
      setLoadingComments(false);
    }
  };

  const handleApproveComment = async (studentId: string) => {
    setProcessingApproval(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/approve-teacher-comment`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            class_id: selectedClass,
            session: selectedSession,
            term: selectedTerm,
            exam: selectedExam,
            type: selectedExamType,
            student_id: studentId
          })
        }
      );

      const data = await res.json();
      
      if (data.success) {
        toast.success('Comment approved! ✓');
        fetchComments(); // Refresh
      } else {
        toast.error(data.error || 'Failed to approve comment');
      }
    } catch (error) {
      console.error('Error approving comment:', error);
      toast.error('Failed to approve comment');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectComment = async () => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    setProcessingApproval(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/reject-teacher-comment`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            class_id: selectedClass,
            session: selectedSession,
            term: selectedTerm,
            exam: selectedExam,
            type: selectedExamType,
            student_id: rejectionDialog.studentId,
            reason: rejectionReason.trim()
          })
        }
      );

      const data = await res.json();
      
      if (data.success) {
        toast.success('Comment rejected with feedback');
        setRejectionDialog({ open: false, studentId: '', studentName: '' });
        setRejectionReason('');
        fetchComments(); // Refresh
      } else {
        toast.error(data.error || 'Failed to reject comment');
      }
    } catch (error) {
      console.error('Error rejecting comment:', error);
      toast.error('Failed to reject comment');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleSavePrincipalComments = async () => {
    if (!selectedClass || !selectedSession || !selectedTerm || !selectedExam || !selectedExamType) {
      toast.error('Please select all required fields');
      return;
    }

    setSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const commentsArray = Object.entries(principalComments)
        .filter(([_, comment]) => comment && comment.trim())
        .map(([student_id, comment]) => ({ student_id, comment: comment.trim() }));

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/save-principal-comments`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            session: selectedSession,
            term: selectedTerm,
            exam: selectedExam,
            type: selectedExamType,
            comments: commentsArray
          })
        }
      );

      const data = await res.json();
      
      if (data.success) {
        toast.success('Principal comments saved successfully! ✓');
        setExistingPrincipalComments(principalComments);
      } else {
        toast.error(data.error || 'Failed to save comments');
      }
    } catch (error) {
      console.error('Error saving comments:', error);
      toast.error('Failed to save comments');
    } finally {
      setSaving(false);
    }
  };

  const handlePrincipalCommentChange = (studentId: string, value: string) => {
    setPrincipalComments(prev => ({
      ...prev,
      [studentId]: value
    }));
  };

  const getStudentName = (student: Student | ClassStudent) => {
    return `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();
  };

  const getPerformanceColor = (percentage?: number) => {
    if (!percentage) return 'text-slate-500';
    if (percentage >= 70) return 'text-green-600';
    if (percentage >= 50) return 'text-blue-600';
    if (percentage >= 40) return 'text-amber-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (percentage?: number) => {
    if (!percentage) return null;
    if (percentage >= 70) return <Badge className="bg-green-100 text-green-700">Excellent</Badge>;
    if (percentage >= 50) return <Badge className="bg-blue-100 text-blue-700">Good</Badge>;
    if (percentage >= 40) return <Badge className="bg-amber-100 text-amber-700">Average</Badge>;
    return <Badge className="bg-red-100 text-red-700">Needs Improvement</Badge>;
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300">Approved</Badge>;
      case 'pending_approval':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300">Pending Review</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300">Rejected</Badge>;
      default:
        return <Badge variant="outline">No Comment</Badge>;
    }
  };

  const hasChanges = JSON.stringify(principalComments) !== JSON.stringify(existingPrincipalComments);
  
  // Only count comments for students displayed on the page
  const displayedStudentIds = new Set(students.map(s => s.id));
  const savedCount = Object.entries(existingPrincipalComments)
    .filter(([studentId, comment]) => displayedStudentIds.has(studentId) && comment && comment.trim())
    .length;
  const pendingTeacherComments = Object.entries(teacherComments)
    .filter(([studentId, comment]) => displayedStudentIds.has(studentId) && comment.status === 'pending_approval')
    .length;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <MessageSquare className="h-6 w-6 md:h-8 md:w-8" />
          <span className="hidden sm:inline">Principal Comments & Review</span>
          <span className="sm:hidden">Comments & Review</span>
        </h1>
        <p className="text-slate-600 mt-2 text-sm md:text-base">
          Review teacher comments and add principal comments for student exam results
        </p>
      </div>

      {/* Summary Card */}
      {selectedClass && students.length > 0 && (
        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-3 md:p-4">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
              <div>
                <p className="text-xs md:text-sm text-slate-600">Selected Class</p>
                <p className="text-sm md:text-lg font-semibold text-purple-900">
                  {(() => {
                    const cls = classes.find(c => c.id === selectedClass);
                    if (!cls) return 'N/A';
                    return cls.display_name || (cls.section_name ? `${cls.name} ${cls.section_name}` : cls.name);
                  })()}
                </p>
                {teacherInfo && (
                  <p className="text-xs text-purple-700 mt-1">Teacher: {teacherInfo.name}</p>
                )}
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-600">Total Students</p>
                <p className="text-sm md:text-lg font-semibold text-purple-900">{students.length}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-600">Principal Comments</p>
                <p className="text-sm md:text-lg font-semibold text-purple-900">{savedCount} / {students.length}</p>
              </div>
              <div>
                <p className="text-xs md:text-sm text-slate-600">Pending Reviews</p>
                <p className="text-sm md:text-lg font-semibold text-purple-900">{pendingTeacherComments}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Form */}
      <Card>
        <CardHeader className="p-4 md:p-6">
          <CardTitle className="text-lg md:text-xl">Select Class and Exam Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 p-4 md:p-6 pt-0">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4">
            <div className="space-y-2">
              <Label className="text-sm">Class</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.display_name || (c.section_name ? `${c.name} ${c.section_name}` : c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.session_name} value={s.session_name}>
                      {s.session_name} {s.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map((t) => (
                    <SelectItem key={t.term_name} value={t.term_name}>
                      {t.term_name} {t.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Exam</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger className="text-sm">
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((e) => (
                    <SelectItem key={e.id} value={e.name}>
                      {e.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm">Exam Type</Label>
              <Select value={selectedExamType} onValueChange={(val) => setSelectedExamType(val as 'midterm' | 'terminal')}>
                <SelectTrigger className="text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="terminal">Terminal</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedClass || !selectedSession || !selectedTerm || !selectedExam ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-sm">
                Please select class, session, term, and exam to view student results and manage comments
              </AlertDescription>
            </Alert>
          ) : null}

          {pendingTeacherComments > 0 && (
            <Alert className="bg-amber-50 border-amber-300">
              <AlertCircle className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                You have {pendingTeacherComments} teacher comment{pendingTeacherComments > 1 ? 's' : ''} pending review in the "Teacher Comments" tab
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Tabbed Interface */}
      {selectedClass && selectedSession && selectedTerm && selectedExam && (
        <Tabs defaultValue="principal" className="space-y-4">
          <TabsList className="grid w-full grid-cols-2 h-auto">
            <TabsTrigger value="principal" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Principal Comments</span>
              <span className="sm:hidden">Principal</span>
            </TabsTrigger>
            <TabsTrigger value="teacher" className="text-xs sm:text-sm py-2">
              <span className="hidden sm:inline">Teacher Comments</span>
              <span className="sm:hidden">Teacher</span>
              {pendingTeacherComments > 0 && (
                <Badge className="ml-1 sm:ml-2 bg-amber-500 text-xs px-1.5">{pendingTeacherComments}</Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Principal Comments Tab */}
          <TabsContent value="principal">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Award className="h-4 w-4 md:h-5 md:w-5 flex-shrink-0" />
                    <span>Student Performance & Principal Comments</span>
                  </CardTitle>
                  <Button 
                    onClick={handleSavePrincipalComments} 
                    disabled={saving || !hasChanges || loadingComments || loadingResults}
                    className="gap-2 w-full sm:w-auto text-sm"
                    size="sm"
                  >
                    {saving ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span className="hidden sm:inline">Save Principal Comments</span>
                        <span className="sm:hidden">Save</span>
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {loadingComments || loadingResults ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {students.map((student, index) => {
                      const hasUnsavedChanges = principalComments[student.id] !== existingPrincipalComments[student.id];
                      const teacherComment = teacherComments[student.id];
                      
                      return (
                        <div key={student.id} className="border rounded-lg p-3 md:p-4 space-y-3 hover:border-purple-300 transition-colors">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                              <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-purple-100 text-purple-700 font-semibold text-xs md:text-sm flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                                  <p className="font-medium text-sm md:text-base truncate">{getStudentName(student)}</p>
                                  {hasUnsavedChanges && (
                                    <Badge variant="outline" className="text-amber-600 border-amber-300 w-fit text-xs">
                                      Unsaved
                                    </Badge>
                                  )}
                                </div>
                                
                                <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 text-xs md:text-sm">
                                  {student.average_score !== undefined && (
                                    <div>
                                      <span className="text-slate-600">Average: </span>
                                      <span className={`font-semibold ${getPerformanceColor(student.percentage_score)}`}>
                                        {student.average_score.toFixed(2)}%
                                      </span>
                                    </div>
                                  )}
                                  {student.overall_grade && (
                                    <div>
                                      <span className="text-slate-600">Grade: </span>
                                      <span className="font-semibold">{student.overall_grade}</span>
                                    </div>
                                  )}
                                </div>

                                {teacherComment && (
                                  <div className="mt-2 p-2 bg-blue-50 border border-blue-200 rounded text-xs md:text-sm">
                                    <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-2 mb-1">
                                      <span className="font-medium text-blue-900">Class Teacher:</span>
                                      {getStatusBadge(teacherComment.status)}
                                    </div>
                                    <p className="text-blue-800 italic break-words">&quot;{teacherComment.comment}&quot;</p>
                                    {teacherComment.rejection_reason && (
                                      <p className="text-red-700 text-xs mt-1">
                                        <strong>Rejection reason:</strong> {teacherComment.rejection_reason}
                                      </p>
                                    )}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex sm:flex-col gap-2 sm:gap-1">
                              {getPerformanceBadge(student.percentage_score)}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`principal-comment-${student.id}`} className="text-sm">
                              Principal&apos;s Comment
                            </Label>
                            <Textarea
                              id={`principal-comment-${student.id}`}
                              placeholder="Enter your comment for this student..."
                              value={principalComments[student.id] || ''}
                              onChange={(e) => handlePrincipalCommentChange(student.id, e.target.value)}
                              rows={2}
                              className="resize-none text-sm"
                            />
                          </div>
                        </div>
                      );
                    })}

                    {students.length === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          No students found with results for this exam period
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Teacher Comments Review Tab */}
          <TabsContent value="teacher">
            <Card>
              <CardHeader className="p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                  <Eye className="h-4 w-4 md:h-5 md:w-5" />
                  Review Teacher Comments
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 pt-0">
                {loadingComments ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                  </div>
                ) : (
                  <div className="space-y-3 md:space-y-4">
                    {Object.entries(teacherComments).map(([studentId, comment], index) => {
                      const student = students.find(s => s.id === studentId) || classStudents.find(s => s.id === studentId);
                      if (!student) return null;

                      return (
                        <div key={studentId} className="border rounded-lg p-3 md:p-4 space-y-3">
                          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="flex items-start gap-2 md:gap-3 flex-1 min-w-0">
                              <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs md:text-sm flex-shrink-0">
                                {index + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 mb-2">
                                  <p className="font-medium text-sm md:text-base truncate">{getStudentName(student)}</p>
                                  {getStatusBadge(comment.status)}
                                </div>
                                
                                <div className="p-2 md:p-3 bg-slate-50 border border-slate-200 rounded">
                                  <p className="text-slate-700 text-sm md:text-base break-words">{comment.comment}</p>
                                  {comment.submitted_at && (
                                    <p className="text-xs text-slate-500 mt-1">
                                      Submitted: {new Date(comment.submitted_at).toLocaleString()}
                                    </p>
                                  )}
                                  {comment.rejection_reason && (
                                    <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded">
                                      <p className="text-red-700 text-xs md:text-sm">
                                        <strong>Rejection reason:</strong> {comment.rejection_reason}
                                      </p>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {comment.status === 'pending_approval' && (
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Button
                                size="sm"
                                onClick={() => handleApproveComment(studentId)}
                                disabled={processingApproval}
                                className="gap-2 bg-green-600 hover:bg-green-700 w-full sm:w-auto text-sm"
                              >
                                <ThumbsUp className="h-4 w-4" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setRejectionDialog({ open: true, studentId, studentName: getStudentName(student) })}
                                disabled={processingApproval}
                                className="gap-2 border-red-300 text-red-700 hover:bg-red-50 w-full sm:w-auto text-sm"
                              >
                                <ThumbsDown className="h-4 w-4" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </div>
                      );
                    })}

                    {Object.keys(teacherComments).length === 0 && (
                      <Alert>
                        <AlertCircle className="h-4 w-4" />
                        <AlertDescription className="text-sm">
                          No teacher comments found for this exam period
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Rejection Dialog */}
      <Dialog open={rejectionDialog.open} onOpenChange={(open) => !open && setRejectionDialog({ open: false, studentId: '', studentName: '' })}>
        <DialogContent className="sm:max-w-md mx-4">
          <DialogHeader>
            <DialogTitle className="text-base md:text-lg">Reject Comment</DialogTitle>
            <DialogDescription className="text-sm">
              Provide feedback for {rejectionDialog.studentName}&apos;s comment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason" className="text-sm">
                Reason for Rejection
              </Label>
              <Textarea
                id="rejection-reason"
                placeholder="Explain why this comment needs revision..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={4}
                className="text-sm"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setRejectionDialog({ open: false, studentId: '', studentName: '' });
                setRejectionReason('');
              }}
              className="w-full sm:w-auto text-sm"
              size="sm"
            >
              Cancel
            </Button>
            <Button
              onClick={handleRejectComment}
              disabled={processingApproval || !rejectionReason.trim()}
              className="gap-2 bg-red-600 hover:bg-red-700 w-full sm:w-auto text-sm"
              size="sm"
            >
              {processingApproval ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <ThumbsDown className="h-4 w-4" />
              )}
              Reject Comment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}