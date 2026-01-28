import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { MessageSquare, Save, AlertCircle, Users, Loader2, CheckCircle, Send, Clock, XCircle, Edit2, Check, X } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from '../ui/alert';

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  admission_number?: string;
}

interface StudentComment {
  student_id: string;
  comment: string;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  submitted_at?: string;
  reviewed_at?: string;
  rejection_reason?: string;
}

export function Comments() {
  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedExamType, setSelectedExamType] = useState<'midterm' | 'terminal'>('midterm');
  
  const [comments, setComments] = useState<Record<string, StudentComment>>({});
  const [existingComments, setExistingComments] = useState<Record<string, StudentComment>>({});
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingComments, setLoadingComments] = useState(false);
  const [editingComments, setEditingComments] = useState<Set<string>>(new Set());
  const [editedComments, setEditedComments] = useState<Set<string>>(new Set());

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedSession && selectedTerm && selectedExam && selectedExamType && students.length > 0) {
      fetchComments();
    }
  }, [selectedSession, selectedTerm, selectedExam, selectedExamType]); // Removed 'students' dependency to prevent refetch while typing

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch class data
      const classRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/my-class`,
        { headers }
      );
      const classData = await classRes.json();
      
      if (classData.success) {
        setClassInfo(classData.classInfo);
        setStudents(classData.students || []);
      } else {
        toast.error(classData.error || 'Failed to load class data');
        setLoading(false);
        return;
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

  useEffect(() => {
    if (selectedSession && selectedTerm) {
      fetchExams();
    }
  }, [selectedSession, selectedTerm]);

  const fetchExams = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        const filtered = data.exams?.filter((e: any) => 
          e.session === selectedSession && e.term === selectedTerm
        ) || [];
        setExams(filtered);
        
        // Auto-select first exam
        if (filtered.length > 0 && !selectedExam) {
          setSelectedExam(filtered[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchComments = async () => {
    try {
      setLoadingComments(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-comments?` +
        `session=${selectedSession}&term=${selectedTerm}&exam=${selectedExam}&type=${selectedExamType}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        // Filter comments to only include CURRENT students in the class
        const currentStudentIds = new Set(students.map(s => s.id));
        const commentsMap: Record<string, StudentComment> = {};
        
        data.comments?.forEach((c: StudentComment) => {
          // Only include comment if student is currently in this class
          if (currentStudentIds.has(c.student_id)) {
            commentsMap[c.student_id] = c;
          }
        });
        
        setExistingComments(commentsMap);
        setComments(commentsMap);
      }
    } catch (error) {
      console.error('Error fetching comments:', error);
    } finally {
      setLoadingComments(false);
    }
  };

  const handleSaveDraft = async () => {
    if (!selectedSession || !selectedTerm || !selectedExam || !selectedExamType) {
      toast.error('Please select session, term, exam, and exam type');
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

      const commentsArray = Object.entries(comments)
        .filter(([_, comment]) => comment.comment && comment.comment.trim())
        .map(([student_id, comment]) => ({ 
          student_id, 
          comment: comment.comment.trim(),
          status: 'draft' as const
        }));

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/save-teacher-comments`,
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
        toast.success('Draft saved successfully! ✓');
        fetchComments(); // Refresh to get updated data
      } else {
        toast.error(data.error || 'Failed to save draft');
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!selectedSession || !selectedTerm || !selectedExam || !selectedExamType) {
      toast.error('Please select session, term, exam, and exam type');
      return;
    }

    // Check if all students have comments
    const commentsWithText = Object.values(comments).filter(c => c.comment && c.comment.trim());
    if (commentsWithText.length < students.length) {
      toast.error(`Please add comments for all ${students.length} students before submitting for approval`);
      return;
    }

    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // First, save all comments as draft
      const commentsArray = Object.entries(comments)
        .filter(([_, comment]) => comment.comment && comment.comment.trim())
        .map(([student_id, comment]) => ({ 
          student_id, 
          comment: comment.comment.trim(),
          status: 'draft' as const
        }));

      const saveRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/save-teacher-comments`,
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

      const saveData = await saveRes.json();
      
      if (!saveData.success) {
        toast.error(saveData.error || 'Failed to save comments before submission');
        setSubmitting(false);
        return;
      }

      // Then submit for approval
      const submitRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/submit-teacher-comments`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            session: selectedSession,
            term: selectedTerm,
            exam: selectedExam,
            type: selectedExamType
          })
        }
      );

      const submitData = await submitRes.json();
      
      if (submitData.success) {
        toast.success('Comments submitted for principal approval! 📤');
        fetchComments(); // Refresh to get updated status
      } else {
        toast.error(submitData.error || 'Failed to submit for approval');
      }
    } catch (error) {
      console.error('Error submitting for approval:', error);
      toast.error('Failed to submit for approval');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentChange = (studentId: string, value: string) => {
    setComments(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        student_id: studentId,
        comment: value,
        status: prev[studentId]?.status || 'draft'
      }
    }));
    
    // Mark as edited if in edit mode
    if (editingComments.has(studentId)) {
      setEditedComments(prev => new Set(prev).add(studentId));
    }
  };

  const toggleEditComment = (studentId: string) => {
    setEditingComments(prev => {
      const newSet = new Set(prev);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  };

  const isCommentEditable = (studentId: string) => {
    // If status is draft or rejected, always editable
    const status = existingComments[studentId]?.status;
    if (!status || status === 'draft' || status === 'rejected') {
      return true;
    }
    // For pending_approval or approved, only editable if in editing mode
    return editingComments.has(studentId);
  };

  const handleResubmitComments = async () => {
    if (!selectedSession || !selectedTerm || !selectedExam || !selectedExamType) {
      toast.error('Please select session, term, exam, and exam type');
      return;
    }

    if (editedComments.size === 0) {
      toast.error('No changes detected. Please edit comments before resubmitting.');
      return;
    }

    setSaving(true);
    setSubmitting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // First save the edits
      const commentsArray = Object.entries(comments)
        .filter(([_, comment]) => comment.comment && comment.comment.trim())
        .map(([student_id, comment]) => ({ 
          student_id, 
          comment: comment.comment.trim(),
          status: 'draft' as const
        }));

      const saveRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/save-teacher-comments`,
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

      const saveData = await saveRes.json();
      
      if (!saveData.success) {
        toast.error(saveData.error || 'Failed to save edits');
        return;
      }

      // Then submit for approval
      const submitRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/submit-teacher-comments`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            session: selectedSession,
            term: selectedTerm,
            exam: selectedExam,
            type: selectedExamType
          })
        }
      );

      const submitData = await submitRes.json();
      
      if (submitData.success) {
        toast.success(`Comments resubmitted with ${editedComments.size} edited ${editedComments.size === 1 ? 'entry' : 'entries'}! 📤`);
        setEditedComments(new Set());
        setEditingComments(new Set());
        fetchComments(); // Refresh to get updated status
      } else {
        toast.error(submitData.error || 'Failed to submit for approval');
      }
    } catch (error) {
      console.error('Error resubmitting comments:', error);
      toast.error('Failed to resubmit comments');
    } finally {
      setSaving(false);
      setSubmitting(false);
    }
  };

  const getStudentName = (student: Student) => {
    return `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-700 border-green-300"><CheckCircle className="h-3 w-3 mr-1" />Approved</Badge>;
      case 'pending_approval':
        return <Badge className="bg-amber-100 text-amber-700 border-amber-300"><Clock className="h-3 w-3 mr-1" />Pending Approval</Badge>;
      case 'rejected':
        return <Badge className="bg-red-100 text-red-700 border-red-300"><XCircle className="h-3 w-3 mr-1" />Rejected</Badge>;
      case 'draft':
        return <Badge variant="outline" className="border-slate-300 text-slate-600">Draft</Badge>;
      default:
        return null;
    }
  };

  const hasChanges = JSON.stringify(comments) !== JSON.stringify(existingComments);
  const allCommentStatuses = Object.values(existingComments).map(c => c.status);
  const isPendingApproval = allCommentStatuses.some(s => s === 'pending_approval');
  // Fixed: Only consider approved if ALL students have comments AND all are approved
  const isApproved = students.length > 0 && 
                     allCommentStatuses.length === students.length && 
                     allCommentStatuses.every(s => s === 'approved');
  const hasRejected = allCommentStatuses.some(s => s === 'rejected');
  const canSubmit = Object.values(comments).filter(c => c.comment && c.comment.trim()).length === students.length;
  const hasActiveEdits = editingComments.size > 0 || editedComments.size > 0;

  // Debug logging for button state
  console.log('[Comments] Button State Debug:', {
    canSubmit,
    commentsCount: Object.values(comments).filter(c => c.comment && c.comment.trim()).length,
    studentsLength: students.length,
    isPendingApproval,
    isApproved,
    loadingComments,
    submitting
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Not a Class Teacher</h3>
          <p className="text-slate-500">
            You are not currently assigned as a class teacher.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <MessageSquare className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Comments</h1>
            <p className="text-amber-100 text-sm md:text-base mt-1">
              Add comments for student exam results
            </p>
          </div>
        </div>
      </div>

      {/* Class Info */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600">Class</p>
              <p className="text-lg font-semibold text-blue-900">
                {classInfo.display_name || (classInfo.section_name ? `${classInfo.name} ${classInfo.section_name}` : classInfo.name)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Total Students</p>
              <p className="text-lg font-semibold text-blue-900">{students.length}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Status</p>
              <div className="mt-1">
                {isApproved && getStatusBadge('approved')}
                {isPendingApproval && getStatusBadge('pending_approval')}
                {hasRejected && getStatusBadge('rejected')}
                {!isApproved && !isPendingApproval && !hasRejected && <Badge variant="outline">Not Submitted</Badge>}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Selection Form */}
      <Card>
        <CardHeader>
          <CardTitle>Select Exam Period</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession} disabled={isPendingApproval || isApproved}>
                <SelectTrigger>
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
              <Label>Term</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm} disabled={isPendingApproval || isApproved}>
                <SelectTrigger>
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
              <Label>Exam</Label>
              <Select value={selectedExam} onValueChange={setSelectedExam} disabled={isPendingApproval || isApproved}>
                <SelectTrigger>
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
              <Label>Exam Type</Label>
              <Select value={selectedExamType} onValueChange={(val) => setSelectedExamType(val as 'midterm' | 'terminal')} disabled={isPendingApproval || isApproved}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midterm">Midterm (CA1 + CA2 + Midterm)</SelectItem>
                  <SelectItem value="terminal">Terminal (CA1 + CA2 + Terminal)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!selectedSession || !selectedTerm || !selectedExam ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Please select session, term, and exam to manage comments
              </AlertDescription>
            </Alert>
          ) : null}

          {isPendingApproval && !hasActiveEdits && (
            <Alert className="bg-amber-50 border-amber-300">
              <Clock className="h-4 w-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                Your comments are pending principal approval. You can still edit individual comments by clicking the "Edit" button.
              </AlertDescription>
            </Alert>
          )}

          {isApproved && !hasActiveEdits && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Your comments have been approved. You can still make changes by clicking the "Edit" button if needed.
              </AlertDescription>
            </Alert>
          )}

          {hasRejected && (
            <Alert className="bg-red-50 border-red-300">
              <XCircle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                Some comments were rejected. Please review the feedback and resubmit.
              </AlertDescription>
            </Alert>
          )}

          {hasActiveEdits && (
            <Alert className="bg-blue-50 border-blue-300">
              <Edit2 className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                <strong>Active Edits:</strong> You have {editedComments.size} edited comment{editedComments.size !== 1 ? 's' : ''}. 
                Click "Resubmit Changes" to save and resubmit for approval.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Comments Table */}
      {selectedSession && selectedTerm && selectedExam && (
        <Card>
          <CardHeader>
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <CardTitle className="text-lg md:text-xl">Student Comments - {selectedExamType === 'midterm' ? 'Midterm' : 'Terminal'}</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                {hasActiveEdits ? (
                  <>
                    <Button 
                      variant="outline"
                      onClick={() => {
                        setEditedComments(new Set());
                        setEditingComments(new Set());
                        setComments(existingComments);
                        toast.info('Changes discarded');
                      }}
                      disabled={submitting}
                      className="gap-2"
                    >
                      <X className="h-4 w-4" />
                      Discard Changes
                    </Button>
                    <Button 
                      onClick={handleResubmitComments} 
                      disabled={submitting || editedComments.size === 0}
                      className="gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Resubmitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Resubmit Changes
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button 
                      onClick={handleSaveDraft} 
                      disabled={saving || !hasChanges || loadingComments || isPendingApproval || isApproved}
                      variant="outline"
                      className="gap-2"
                    >
                      {saving ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Saving...
                        </>
                      ) : (
                        <>
                          <Save className="h-4 w-4" />
                          Save Draft
                        </>
                      )}
                    </Button>
                    <Button 
                      onClick={handleSubmitForApproval} 
                      disabled={submitting || !canSubmit || loadingComments || isPendingApproval || isApproved}
                      className="gap-2"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Send className="h-4 w-4" />
                          Submit for Approval
                        </>
                      )}
                    </Button>
                  </>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {loadingComments ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {students.map((student, index) => {
                  const commentData = existingComments[student.id];
                  const hasUnsavedChanges = comments[student.id]?.comment !== existingComments[student.id]?.comment;
                  const isEditing = isCommentEditable(student.id);
                  const hasBeenEdited = editedComments.has(student.id);
                  const canToggleEdit = (commentData?.status === 'pending_approval' || commentData?.status === 'approved');
                  
                  return (
                    <div key={student.id} className={`border rounded-lg p-3 md:p-4 space-y-3 hover:border-blue-300 transition-colors ${hasBeenEdited ? 'bg-yellow-50 border-yellow-300' : ''}`}>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                        <div className="flex items-center gap-2 md:gap-3">
                          <div className="flex items-center justify-center w-7 h-7 md:w-8 md:h-8 rounded-full bg-blue-100 text-blue-700 font-semibold text-xs md:text-sm flex-shrink-0">
                            {index + 1}
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-sm md:text-base truncate">{getStudentName(student)}</p>
                            {student.admission_number && (
                              <p className="text-xs text-slate-500">Adm. No: {student.admission_number}</p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center flex-wrap gap-2">
                          {hasBeenEdited && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">
                              Edited
                            </Badge>
                          )}
                          {hasUnsavedChanges && !hasBeenEdited && (
                            <Badge variant="outline" className="border-amber-500 text-amber-700">
                              Unsaved
                            </Badge>
                          )}
                          {getStatusBadge(commentData?.status)}
                          {canToggleEdit && (
                            <Button
                              size="sm"
                              variant={editingComments.has(student.id) ? "default" : "outline"}
                              onClick={() => toggleEditComment(student.id)}
                              className="h-8"
                            >
                              {editingComments.has(student.id) ? (
                                <>
                                  <Check className="h-3 w-3 mr-1" />
                                  Done
                                </>
                              ) : (
                                <>
                                  <Edit2 className="h-3 w-3 mr-1" />
                                  Edit
                                </>
                              )}
                            </Button>
                          )}
                        </div>
                      </div>
                      
                      <Textarea
                        placeholder={!isEditing ? "Click 'Edit' to modify this comment" : "Enter comment for this student's performance..."}
                        value={comments[student.id]?.comment || ''}
                        onChange={(e) => handleCommentChange(student.id, e.target.value)}
                        rows={3}
                        className="resize-none"
                        disabled={!isEditing}
                      />
                      
                      {commentData?.rejection_reason && (
                        <Alert className="bg-red-50 border-red-200">
                          <XCircle className="h-4 w-4 text-red-600" />
                          <AlertDescription className="text-red-800">
                            <strong>Rejection Reason:</strong> {commentData.rejection_reason}
                          </AlertDescription>
                        </Alert>
                      )}
                      
                      <p className="text-xs text-slate-500">
                        {(comments[student.id]?.comment || '').length} characters
                      </p>
                    </div>
                  );
                })}

                {students.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No students found in your class
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
