import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  ClipboardCheck, 
  Users, 
  CheckCircle, 
  AlertCircle,
  FileSearch,
  Plus,
  Filter,
  Download,
  TrendingUp,
  Edit,
  FileSpreadsheet
} from 'lucide-react';
import { MarksEntryTable, MarksEntryData } from './MarksEntryTable';
import { MarksApprovalPanel } from './MarksApprovalPanel';
import { MarksAuditLog } from './MarksAuditLog';
import { MarksEntryForm, MarksFormData } from './MarksEntryForm';
import { MarksEntryOverview } from './MarksEntryOverview';
import { TeacherBroadsheet } from './TeacherBroadsheet';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface MarksModuleProps {
  userRole: 'teacher' | 'principal' | 'super_admin' | 'director' | 'it_admin' | 'secretary' | 'transport';
  userId: string;
  userName: string;
  className?: string;
}

const mockMarksData: MarksEntryData = {
  id: 'ME001',
  subject: 'Mathematics',
  class: 'Grade 10-A',
  teacher: '',
  term: 'First',
  students: [],
  status: 'draft'
};

// Helper function to round marks (EXCEPT Terminal CA1 which is auto-calculated average)
const roundMarks = (students: any[]) => {
  console.log('[roundMarks] ===== ROUNDING MARKS =====');
  console.log('[roundMarks] Input students count:', students.length);
  
  const rounded = students.map((student, index) => {
    console.log(`[roundMarks] Student ${index + 1} BEFORE rounding:`, {
      name: student.studentName,
      midterm: student.midterm,
      terminal: student.terminal
    });
    
    const result = {
      ...student,
      midterm: {
        ca1: student.midterm.ca1 !== null ? Math.round(student.midterm.ca1) : null,
        ca2: student.midterm.ca2 !== null ? Math.round(student.midterm.ca2) : null,
        exam: student.midterm.exam !== null ? Math.round(student.midterm.exam) : null,
      },
      terminal: {
        // DO NOT ROUND Terminal CA1 - it's auto-calculated as (midterm total / 2) and can be decimal (e.g., 17.5)
        ca1: student.terminal.ca1,
        ca2: student.terminal.ca2 !== null ? Math.round(student.terminal.ca2) : null,
        exam: student.terminal.exam !== null ? Math.round(student.terminal.exam) : null,
      }
    };
    
    console.log(`[roundMarks] Student ${index + 1} AFTER rounding:`, {
      name: result.studentName,
      midterm: result.midterm,
      terminal: result.terminal
    });
    
    return result;
  });
  
  console.log('[roundMarks] ✅ Rounding complete');
  return rounded;
};

const mockSubjects = [
  { id: '1', name: 'Mathematics', class: 'Grade 10-A', teacher: 'Dr. Ahmed Hassan' },
  { id: '2', name: 'English Language', class: 'Grade 10-A', teacher: 'Ms. Sarah Wilson' },
  { id: '3', name: 'Physics', class: 'Grade 10-A', teacher: 'Dr. Maria Santos' },
  { id: '4', name: 'Chemistry', class: 'Grade 10-A', teacher: 'Dr. James Brown' }
];

export function MarksModule({ 
  userRole, 
  userId, 
  userName, 
  className = '' 
}: MarksModuleProps) {
  // Debug: Log the received role
  console.log('[MarksModule] Received userRole:', userRole, 'Type:', typeof userRole);
  
  // Determine default active tab based on user role
  const getDefaultTab = () => {
    if (['super_admin', 'director', 'it_admin'].includes(userRole)) return 'overview';
    if (['teacher', 'principal'].includes(userRole)) return 'entry';
    return 'entry';
  };
  
  const [activeTab, setActiveTab] = useState(getDefaultTab());
  const [selectedSubject, setSelectedSubject] = useState<string>('');
  const [marksData, setMarksData] = useState<MarksEntryData>(mockMarksData);
  const [showSelectionForm, setShowSelectionForm] = useState(false);
  const [showEntryForm, setShowEntryForm] = useState(false);
  const [selectedFormData, setSelectedFormData] = useState<MarksFormData | null>(null);
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [marksEntries, setMarksEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [assignedSubjects, setAssignedSubjects] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalSubmissions: 0,
    pendingApprovals: 0,
    completedClasses: 0,
    averageProgress: 0
  });
  
  // Session and Term filters for admin overview
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');
  const [showBroadsheet, setShowBroadsheet] = useState(false);

  const supabase = createClient();

  // Check access permissions
  const hasMarkEntryAccess = ['teacher', 'principal'].includes(userRole);
  const hasApprovalAccess = ['principal', 'super_admin', 'director', 'it_admin'].includes(userRole);
  const hasAuditAccess = ['principal', 'super_admin', 'director', 'it_admin'].includes(userRole);
  const hasOverviewAccess = ['principal', 'super_admin', 'director', 'it_admin'].includes(userRole); // Principal, IT Admin, Director
  
  console.log('[MarksModule] Access checks for role', userRole, ':', {
    hasMarkEntryAccess,
    hasApprovalAccess,
    hasAuditAccess,
    hasOverviewAccess
  });

  // Fetch subjects and classes on mount
  useEffect(() => {
    fetchSubjectsAndClasses();
    fetchMarksEntries();
    if (userRole === 'teacher') {
      fetchAssignedSubjects();
    }
    fetchStatistics();
    // Fetch sessions/terms for admin filters
    if (hasOverviewAccess) {
      fetchSessionsAndTerms();
    }
  }, []);

  const fetchSubjectsAndClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Fetch subjects
      const subjectsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subjects`,
        { headers }
      );
      const subjectsData = await subjectsRes.json();
      if (subjectsData.success) {
        setSubjects(subjectsData.subjects);
      }

      // Fetch classes (use unified endpoint with sections JOIN)
      const classesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
        { headers }
      );
      const classesData = await classesRes.json();
      if (classesData.success) {
        setClasses(classesData.classes);
      }
    } catch (error) {
      console.error('Error fetching subjects and classes:', error);
    }
  };

  const fetchMarksEntries = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setMarksEntries(data.marks);
      }
    } catch (error) {
      console.error('Error fetching marks entries:', error);
    }
  };

  const fetchAssignedSubjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Fetch subject assignments for the current teacher (not just main_teacher subjects)
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subject-assignments?teacher_id=${userId}`,
        { headers }
      );
      const data = await res.json();
      console.log('[MarksModule] Subject assignments response:', data);
      if (data.success && data.assignments) {
        // Extract unique subjects from assignments
        const uniqueSubjects = data.assignments.reduce((acc: any[], assignment: any) => {
          const subject = assignment.subject; // Note: backend returns 'subject', not 'subjects'
          if (subject && !acc.find(s => s.id === subject.id)) {
            acc.push(subject);
          }
          return acc;
        }, []);
        console.log('[MarksModule] Unique assigned subjects:', uniqueSubjects);
        setAssignedSubjects(uniqueSubjects);
      }
    } catch (error) {
      console.error('Error fetching assigned subjects:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks/statistics`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setStats({
          totalSubmissions: data.statistics.total_submissions || 0,
          pendingApprovals: data.statistics.pending_approvals || 0,
          completedClasses: data.statistics.completed_classes || 0,
          averageProgress: data.statistics.average_progress || 0
        });
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const fetchSessionsAndTerms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions || []);
        setTerms(data.terms || []);
        
        // Auto-select current session
        const currentSession = data.sessions?.find((s: any) => s.is_current);
        if (currentSession) {
          setSelectedSession(currentSession.session_name);
          setSelectedSessionId(currentSession.id);
        }
        
        // Auto-select current term
        const currentTerm = data.terms?.find((t: any) => t.is_current);
        if (currentTerm) {
          setSelectedTerm(currentTerm.term_name);
          setSelectedTermId(currentTerm.id);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions and terms:', error);
    }
  };



  // 🔥 NEW SEPARATE HANDLERS FOR MIDTERM
  const handleSaveMidtermMarks = async (data: MarksEntryData) => {
    setSubmitting(true);
    try {
      console.log('[handleSaveMidtermMarks] 🔥 Saving MIDTERM marks ONLY...');
      console.log('[handleSaveMidtermMarks] Students:', data.students);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to save marks');
        return;
      }

      if (!selectedFormData?.examId || !selectedFormData?.subjectId || !selectedFormData?.classId) {
        toast.error('Missing exam or subject information');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // 🔥 ONLY send MIDTERM marks (set terminal ca2/exam to null)
      const midtermOnlyStudents = data.students.map(s => ({
        ...s,
        midterm: {
          ca1: s.midterm.ca1 !== null ? Math.round(s.midterm.ca1) : null,
          ca2: s.midterm.ca2 !== null ? Math.round(s.midterm.ca2) : null,
          exam: s.midterm.exam !== null ? Math.round(s.midterm.exam) : null,
        },
        terminal: {
          ca1: null,  // Don't send terminal marks yet
          ca2: null,
          exam: null
        }
      }));

      console.log('[handleSaveMidtermMarks] 🔥 Sending ONLY midterm marks (terminal = null):', midtermOnlyStudents[0]);

      const payload = {
        exam_id: selectedFormData.examId,
        subject_id: selectedFormData.subjectId,
        class_id: selectedFormData.classId,
        session: selectedFormData.session,
        term: selectedFormData.term,
        students_marks: { students: midtermOnlyStudents },
        status: 'draft'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks`,
        { method: 'POST', headers, body: JSON.stringify(payload) }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[handleSaveMidtermMarks] HTTP error:', errorText);
        toast.error(`Failed to save midterm marks: ${res.statusText}`);
        return;
      }

      const result = await res.json();
      if (result.success) {
        console.log('[handleSaveMidtermMarks] ✅ Midterm marks saved successfully');
        toast.success('✅ Midterm marks saved as draft');
        await fetchMarksEntries();
      } else {
        toast.error(result.error || 'Failed to save midterm marks');
      }
    } catch (error) {
      console.error('[handleSaveMidtermMarks] Error:', error);
      toast.error(`Failed to save midterm marks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitMidtermMarks = async (data: MarksEntryData) => {
    setSubmitting(true);
    try {
      console.log('[handleSubmitMidtermMarks] 🔥 Submitting MIDTERM marks ONLY...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to submit marks');
        return;
      }

      if (!selectedFormData?.examId || !selectedFormData?.subjectId || !selectedFormData?.classId) {
        toast.error('Missing exam or subject information');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // 🔥 ONLY send MIDTERM marks
      const midtermOnlyStudents = data.students.map(s => ({
        ...s,
        midterm: {
          ca1: s.midterm.ca1 !== null ? Math.round(s.midterm.ca1) : null,
          ca2: s.midterm.ca2 !== null ? Math.round(s.midterm.ca2) : null,
          exam: s.midterm.exam !== null ? Math.round(s.midterm.exam) : null,
        },
        terminal: {
          ca1: null,
          ca2: null,
          exam: null
        }
      }));

      const payload = {
        exam_id: selectedFormData.examId,
        subject_id: selectedFormData.subjectId,
        class_id: selectedFormData.classId,
        session: selectedFormData.session,
        term: selectedFormData.term,
        students_marks: { students: midtermOnlyStudents },
        status: userRole === 'teacher' ? 'pending_approval' : 'approved'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks`,
        { method: 'POST', headers, body: JSON.stringify(payload) }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[handleSubmitMidtermMarks] HTTP error:', errorText);
        toast.error(`Failed to submit midterm marks: ${res.statusText}`);
        return;
      }

      const result = await res.json();
      if (result.success) {
        console.log('[handleSubmitMidtermMarks] ✅ Midterm marks submitted successfully');
        
        // ✅ FIRST: Show success toast with appropriate message based on user role
        const successMessage = userRole === 'teacher' 
          ? '🎉 Midterm marks submitted successfully and sent to Principal for approval!' 
          : '🎉 Midterm marks submitted and approved successfully!';
        
        toast.success(successMessage, {
          duration: 3000, // Show for 3 seconds
        });
        
        // THEN: Fetch updated data
        await fetchMarksEntries();
        await fetchStatistics();
        
        // FINALLY: Wait 2.5 seconds before redirecting to allow toast to be fully visible
        setTimeout(() => {
          setActiveTab('entry');
          setShowSelectionForm(true);
          setShowEntryForm(false);
        }, 2500);
      } else {
        toast.error(result.error || 'Failed to submit midterm marks');
      }
    } catch (error) {
      console.error('[handleSubmitMidtermMarks] Error:', error);
      toast.error('Failed to submit midterm marks');
    } finally {
      setSubmitting(false);
    }
  };

  // 🔥 NEW SEPARATE HANDLERS FOR TERMINAL
  const handleSaveTerminalMarks = async (data: MarksEntryData) => {
    setSubmitting(true);
    try {
      console.log('[handleSaveTerminalMarks] 🔥 Saving TERMINAL marks ONLY...');
      console.log('[handleSaveTerminalMarks] Students:', data.students);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to save marks');
        return;
      }

      if (!selectedFormData?.examId || !selectedFormData?.subjectId || !selectedFormData?.classId) {
        toast.error('Missing exam or subject information');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // 🔥 ONLY send TERMINAL marks (keep midterm as is, but send terminal)
      const terminalOnlyStudents = data.students.map(s => ({
        ...s,
        midterm: {
          ca1: null,  // Don't resend midterm
          ca2: null,
          exam: null,
        },
        terminal: {
          ca1: s.terminal.ca1,  // Auto-calculated, keep decimal
          ca2: s.terminal.ca2 !== null ? Math.round(s.terminal.ca2) : null,
          exam: s.terminal.exam !== null ? Math.round(s.terminal.exam) : null,
        }
      }));

      console.log('[handleSaveTerminalMarks] 🔥 Sending ONLY terminal marks (midterm = null):', terminalOnlyStudents[0]);

      const payload = {
        exam_id: selectedFormData.examId,
        subject_id: selectedFormData.subjectId,
        class_id: selectedFormData.classId,
        session: selectedFormData.session,
        term: selectedFormData.term,
        students_marks: { students: terminalOnlyStudents },
        status: 'draft'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks`,
        { method: 'POST', headers, body: JSON.stringify(payload) }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[handleSaveTerminalMarks] HTTP error:', errorText);
        toast.error(`Failed to save terminal marks: ${res.statusText}`);
        return;
      }

      const result = await res.json();
      if (result.success) {
        console.log('[handleSaveTerminalMarks] ✅ Terminal marks saved successfully');
        toast.success('✅ Terminal marks saved as draft');
        await fetchMarksEntries();
      } else {
        toast.error(result.error || 'Failed to save terminal marks');
      }
    } catch (error) {
      console.error('[handleSaveTerminalMarks] Error:', error);
      toast.error(`Failed to save terminal marks: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSubmitTerminalMarks = async (data: MarksEntryData) => {
    setSubmitting(true);
    try {
      console.log('[handleSubmitTerminalMarks] 🔥 Submitting TERMINAL marks ONLY...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to submit marks');
        return;
      }

      if (!selectedFormData?.examId || !selectedFormData?.subjectId || !selectedFormData?.classId) {
        toast.error('Missing exam or subject information');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // 🔥 ONLY send TERMINAL marks
      const terminalOnlyStudents = data.students.map(s => ({
        ...s,
        midterm: {
          ca1: null,
          ca2: null,
          exam: null,
        },
        terminal: {
          ca1: s.terminal.ca1,
          ca2: s.terminal.ca2 !== null ? Math.round(s.terminal.ca2) : null,
          exam: s.terminal.exam !== null ? Math.round(s.terminal.exam) : null,
        }
      }));

      const payload = {
        exam_id: selectedFormData.examId,
        subject_id: selectedFormData.subjectId,
        class_id: selectedFormData.classId,
        session: selectedFormData.session,
        term: selectedFormData.term,
        students_marks: { students: terminalOnlyStudents },
        status: userRole === 'teacher' ? 'pending_approval' : 'approved'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks`,
        { method: 'POST', headers, body: JSON.stringify(payload) }
      );

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[handleSubmitTerminalMarks] HTTP error:', errorText);
        toast.error(`Failed to submit terminal marks: ${res.statusText}`);
        return;
      }

      const result = await res.json();
      if (result.success) {
        console.log('[handleSubmitTerminalMarks] ✅ Terminal marks submitted successfully');
        
        // ✅ FIRST: Show success toast with appropriate message based on user role
        const successMessage = userRole === 'teacher' 
          ? '🎉 Terminal marks submitted successfully and sent to Principal for approval!' 
          : '🎉 Terminal marks submitted and approved successfully!';
        
        toast.success(successMessage, {
          duration: 3000, // Show for 3 seconds
        });
        
        // THEN: Fetch updated data
        await fetchMarksEntries();
        await fetchStatistics();
        
        // FINALLY: Wait 2.5 seconds before redirecting to allow toast to be fully visible
        setTimeout(() => {
          setActiveTab('entry');
          setShowSelectionForm(true);
          setShowEntryForm(false);
        }, 2500);
      } else {
        toast.error(result.error || 'Failed to submit terminal marks');
      }
    } catch (error) {
      console.error('[handleSubmitTerminalMarks] Error:', error);
      toast.error('Failed to submit terminal marks');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveMarks = async (submissionId: string, comment?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to approve marks');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks/review`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            marks_id: submissionId,
            action: 'approve',
            comment
          })
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success('✅ Marks approved successfully!');
        await fetchMarksEntries();
        await fetchStatistics();
      } else {
        console.error('[Approve Marks] Error:', result.error);
        toast.error(result.error || 'Failed to approve marks');
      }
    } catch (error) {
      console.error('[Approve Marks] Exception:', error);
      toast.error('Failed to approve marks. Please try again.');
    }
  };

  const handleRejectMarks = async (submissionId: string, comment: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to reject marks');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks/review`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            marks_id: submissionId,
            action: 'reject',
            comment
          })
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success('❌ Marks rejected and returned for revision');
        await fetchMarksEntries();
        await fetchStatistics();
      } else {
        console.error('[Reject Marks] Error:', result.error);
        toast.error(result.error || 'Failed to reject marks');
      }
    } catch (error) {
      console.error('[Reject Marks] Exception:', error);
      toast.error('Failed to reject marks. Please try again.');
    }
  };

  const handleUnlockMarks = async (marksId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks/review`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            marks_id: marksId,
            action: 'unlock'
          })
        }
      );

      const result = await res.json();

      if (result.success) {
        toast.success('✅ Marks unlocked successfully! Status changed to "submitted" - you can now edit.');
        await fetchMarksEntries(); // Refresh the list
        setShowEntryForm(false); // Go back to list
      } else {
        console.error('[Unlock Marks] Error:', result.error);
        toast.error(result.error || 'Failed to unlock marks');
      }
    } catch (error) {
      console.error('[Unlock Marks] Exception:', error);
      toast.error('Failed to unlock marks. Please try again.');
    }
  };

  const handleEditPendingMarks = async (entry: any) => {
    console.log('[MarksModule] Editing pending marks entry:', entry);
    
    try {
      // Pre-populate the form with the entry data
      const formData: MarksFormData = {
        classId: entry.class_id,
        className: entry.class_name || 'Unknown Class',
        subjectId: entry.subject_id,
        subjectName: entry.subject_name,
        session: entry.session,
        term: entry.term,
        examId: entry.exam_id,
        examName: entry.exam_name || 'Exam'
      };
      
      console.log('[MarksModule] Pre-populated form data:', formData);
      
      // Set the form data
      setSelectedFormData(formData);
      
      // Update marksData
      setMarksData({
        ...mockMarksData,
        id: entry.id || 'EDIT',
        subject: formData.subjectName,
        class: formData.className,
        teacher: userName,
        term: formData.term,
        students: []
      });
      
      // Fetch students and existing marks
      setLoading(true);
      await fetchStudentsForClass(formData.classId, formData);
      setLoading(false);
      
      // Show entry form
      setShowEntryForm(true);
      
      toast.info('📝 Editing pending marks - make your changes and resubmit for approval');
    } catch (error) {
      console.error('[MarksModule] Error loading marks for editing:', error);
      toast.error('Failed to load marks for editing');
    }
  };

  const handleFormSubmit = async (formData: MarksFormData) => {
    console.log('[MarksModule] handleFormSubmit called with:', formData);
    setSelectedFormData(formData);
    
    // Update marksData with selected information
    setMarksData({
      ...mockMarksData,
      id: 'NEW',
      subject: formData.subjectName,
      class: formData.className,
      teacher: userName, // Use actual logged-in user's name
      term: formData.term,
      students: [] // Will be loaded from backend
    });
    
    // Keep showing selection form with loading state
    setLoading(true);
    
    // Fetch students for the selected class - pass formData directly!
    console.log('[MarksModule] Fetching students...');
    await fetchStudentsForClass(formData.classId, formData);
    setLoading(false);
    
    // ALWAYS show the entry form - it will handle the "no students" case
    console.log('[MarksModule] Setting showEntryForm to true');
    setShowSelectionForm(false);
    setShowEntryForm(true);
  };

  const fetchStudentsForClass = async (classId: string, formData?: MarksFormData): Promise<boolean> => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return false;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      console.log('[MarksModule] Fetching students for class:', classId);
      console.log('[MarksModule] Form data:', formData);

      // Build SESSION-AWARE query with exam_id and subject_id for historical student retrieval
      const queryParams = new URLSearchParams({
        class_id: classId
      });
      
      // Add exam_id and subject_id if available - this enables fetching promoted students
      if (formData?.examId) {
        queryParams.append('exam_id', formData.examId);
        console.log('[MarksModule] Including exam_id for session-aware query:', formData.examId);
      }
      if (formData?.subjectId) {
        queryParams.append('subject_id', formData.subjectId);
        console.log('[MarksModule] Including subject_id for session-aware query:', formData.subjectId);
      }

      // Fetch students for the class (UNION: current + historical with marks)
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students-by-class?${queryParams.toString()}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        // Log breakdown of current vs promoted students
        if (data.breakdown) {
          console.log('[MarksModule] Student breakdown:', data.breakdown);
          if (data.breakdown.historical > 0) {
            console.log(`[MarksModule] ✅ Including ${data.breakdown.historical} promoted students with historical marks`);
            toast.info(`Found ${data.breakdown.current} current + ${data.breakdown.historical} promoted students with marks`);
          }
        }
        
        if (!data.students || data.students.length === 0) {
          console.log('[MarksModule] No students found in this class');
          toast.error('No students found in this class. The class may be empty.');
          return false;
        }
        
        console.log(`[MarksModule] Found ${data.students.length} students`);
        
        // Check if marks already exist for this exam and subject
        let existingMarks: any[] = [];
        if (formData?.examId && formData?.subjectId) {
          console.log(`[MarksModule] Checking for existing marks - Exam: ${formData.examId}, Subject: ${formData.subjectId}`);
          
          const marksRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks/exam/${formData.examId}/subject/${formData.subjectId}?t=${Date.now()}`,
            { 
              headers,
              cache: 'no-store' // Force fresh data, never use cache
            }
          );
          const marksData = await marksRes.json();
          
          console.log('[MarksModule] Marks response:', marksData);
          console.log('[MarksModule] Marks fetched at:', new Date().toISOString());
          
          if (marksData.success && marksData.marks) {
            existingMarks = marksData.marks;
            if (existingMarks.length > 0) {
              console.log(`[MarksModule] Found ${existingMarks.length} existing marks entries`);
              
              // Log sample mark to verify what was fetched
              const sampleMark = existingMarks[0];
              console.log('[MarksModule] Sample fetched mark:', {
                student_id: sampleMark.student_id,
                type: sampleMark.type,
                ca1: sampleMark.ca1,
                ca2: sampleMark.ca2,
                exam: sampleMark.exam,
                updated_at: sampleMark.updated_at
              });
              
              toast.info(`📝 Editing mode: ${existingMarks.length} existing entries loaded`);
            } else {
              console.log('[MarksModule] No existing marks found - new entry mode');
            }
          }
        } else {
          console.log('[MarksModule] No exam/subject ID provided, skipping marks fetch');
        }
        
        // Convert students to marks format
        const studentsMarks = data.students.map((student: any, index: number) => {
          // Find existing marks for this student
          const midtermMark = existingMarks.find(m => m.student_id === student.id && m.type === 'midterm');
          const terminalMark = existingMarks.find(m => m.student_id === student.id && m.type === 'terminal');
          
          console.log(`[MarksModule] Student ${student.first_name} ${student.last_name}:`, {
            midtermMark: midtermMark ? { 
              midterm_ca1: midtermMark.midterm_ca1, 
              midterm_ca2: midtermMark.midterm_ca2, 
              midterm_exam: midtermMark.midterm_exam 
            } : 'none',
            terminalMark: terminalMark ? { 
              terminal_ca1: terminalMark.terminal_ca1, 
              terminal_ca2: terminalMark.terminal_ca2, 
              terminal_exam: terminalMark.terminal_exam 
            } : 'none'
          });
          
          // ✅ BACKWARDS COMPATIBLE: Works with BOTH old and new table structures
          // OLD: ca1, ca2, exam
          // NEW: midterm_ca1, midterm_ca2, midterm_exam, terminal_ca1, terminal_ca2, terminal_exam
          
          // Get midterm values (try new columns first, fallback to old)
          const midtermCA1 = midtermMark?.midterm_ca1 ?? midtermMark?.ca1 ?? null;
          const midtermCA2 = midtermMark?.midterm_ca2 ?? midtermMark?.ca2 ?? null;
          const midtermExam = midtermMark?.midterm_exam ?? midtermMark?.exam ?? null;
          
          // Get terminal values (try new columns first, fallback to old)
          const terminalCA2 = terminalMark?.terminal_ca2 ?? terminalMark?.ca2 ?? null;
          const terminalExam = terminalMark?.terminal_exam ?? terminalMark?.exam ?? null;
          
          // Calculate Terminal CA1
          let terminalCA1 = null;
          
          if (terminalMark?.terminal_ca1 !== null && terminalMark?.terminal_ca1 !== undefined) {
            // Use terminal_ca1 from NEW database structure
            terminalCA1 = terminalMark.terminal_ca1;
            console.log(`[MarksModule] ✅ Loaded Terminal CA1 from database (NEW structure) for ${student.first_name}: ${terminalCA1}`);
          } else if (midtermCA1 !== null && midtermCA2 !== null && midtermExam !== null) {
            // Auto-calculate from midterm: (CA1 + CA2 + Exam) / 2
            const midtermTotal = midtermCA1 + midtermCA2 + midtermExam;
            terminalCA1 = midtermTotal / 2;
            console.log(`[MarksModule] ✅ Auto-calculated Terminal CA1 for ${student.first_name}: (${midtermCA1} + ${midtermCA2} + ${midtermExam}) / 2 = ${terminalCA1}`);
          } else {
            console.log(`[MarksModule] ⚠️ Cannot calculate Terminal CA1 for ${student.first_name} - missing midterm data`);
          }
          
          return {
            studentId: student.id,
            studentName: `${student.first_name} ${student.last_name}`,
            admissionNumber: student.admission_number || `STD${String(index + 1).padStart(3, '0')}`,
            midterm: {
              ca1: midtermCA1,
              ca2: midtermCA2,
              exam: midtermExam,
              total: null // Will be calculated
            },
            terminal: {
              ca1: terminalCA1,  // Auto-calculated or from DB
              ca2: terminalCA2,
              exam: terminalExam,
              total: null // Will be calculated
            },
            status: (midtermMark?.status || terminalMark?.status || 'draft') as const,
            lastModified: new Date()
          };
        });
        
        const isEditMode = existingMarks.length > 0;
        
        setMarksData(prev => ({
          ...prev,
          id: isEditMode ? `${formData?.examId}_${formData?.subjectId}` : 'NEW',
          students: studentsMarks,
          status: isEditMode ? (existingMarks[0]?.status || 'draft') : 'draft'
        }));
        
        const message = isEditMode
          ? `✏️ Edit Mode: Loaded ${studentsMarks.length} student(s) with existing marks`
          : `✨ New Entry: Loaded ${studentsMarks.length} student(s)`;
        toast.success(message);
        return true;
      } else {
        toast.error('No students found in this class. Please select a different class or add students to this class first.');
        return false;
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students. Please try again.');
      return false;
    }
  };

  const handleViewDetails = (classId: string, subjectId?: string) => {
    // Navigate to detailed view
    console.log('Viewing details:', classId, subjectId);
    setActiveTab('entry');
    setShowSelectionForm(true);
  };

  const handleSendReminder = (teacherId: string, subjectId: string) => {
    // Send reminder notification
    console.log('Sending reminder:', teacherId, subjectId);
    toast.success('Reminder sent to teacher');
  };

  const handleExportAuditLog = () => {
    // Export audit log
    console.log('Exporting audit log');
    toast.success('Audit log exported successfully');
  };

  // Format marks entries for approval panel
  const formatMarksSubmissions = () => {
    return marksEntries.map((entry: any) => {
      // Count unique students for this exam/subject combination
      const totalStudents = entry.student_count || 0;
      const completedStudents = totalStudents;
      
      // Normalize status to valid values
      let normalizedStatus = entry.status || 'pending';
      const validStatuses = ['submitted', 'reviewed', 'approved', 'rejected', 'pending', 'draft', 'pending_approval'];
      if (!validStatuses.includes(normalizedStatus)) {
        console.warn(`[MarksModule] Invalid status "${normalizedStatus}" for entry ${entry.id}, defaulting to "pending"`);
        normalizedStatus = 'pending';
      }
      
      // Map pending_approval to submitted for the approval panel display
      if (normalizedStatus === 'pending_approval') {
        normalizedStatus = 'submitted';
      }
      
      // Determine priority based on status and age
      let priority: 'high' | 'medium' | 'low' = 'medium';
      if (normalizedStatus === 'submitted') {
        const hoursOld = entry.created_at ? 
          Math.floor((new Date().getTime() - new Date(entry.created_at).getTime()) / (1000 * 60 * 60)) : 0;
        if (hoursOld > 48) priority = 'high';
        else if (hoursOld < 12) priority = 'low';
      }

      return {
        id: entry.id,
        subject: entry.subject_name || 'Unknown Subject',
        class: entry.class_name || 'Unknown Class',
        teacher: entry.submitted_by_name || entry.action_by || 'Unknown',
        teacherId: entry.submitted_by || '',
        academicYear: entry.session || '2024/2025',
        term: entry.term || 'First Term',
        submittedAt: entry.created_at ? new Date(entry.created_at) : new Date(),
        status: normalizedStatus,
        reviewedBy: entry.approved_by_name,
        reviewedAt: entry.updated_at ? new Date(entry.updated_at) : undefined,
        approvedBy: entry.approved_by_name,
        approvedAt: entry.approved_at ? new Date(entry.approved_at) : undefined,
        rejectionComment: entry.rejection_comment,
        totalStudents,
        completedStudents,
        averageMark: entry.average_mark || 0,
        priority
      };
    });
  };

  // Note: Progress tracking now uses the classProgresses state fetched from the server
  // This provides accurate, student-count-based progress with separate midterm/terminal tracking

  const getTabs = () => {
    const tabs = [];
    
    if (hasOverviewAccess) {
      tabs.push({ value: 'overview', label: 'Overview', icon: Users });
    }
    
    if (hasMarkEntryAccess) {
      tabs.push({ value: 'entry', label: 'Marks Entry', icon: ClipboardCheck });
    }
    
    if (hasApprovalAccess) {
      tabs.push({ value: 'approval', label: 'Approval Panel', icon: CheckCircle });
    }
    
    if (hasAuditAccess) {
      tabs.push({ value: 'audit', label: 'Audit Log', icon: FileSearch });
    }
    
    return tabs;
  };



  if (!hasMarkEntryAccess && !hasApprovalAccess && !hasAuditAccess && !hasOverviewAccess) {
    return (
      <div className={`p-6 ${className}`}>
        <Card>
          <CardContent className="p-8 text-center">
            <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">Access Restricted</h3>
            <p className="text-slate-500">
              You don't have permission to access the marks entry system.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  console.log('[MarksModule RENDER] showSelectionForm:', showSelectionForm, 'showEntryForm:', showEntryForm, 'loading:', loading, 'students:', marksData.students.length);

  if (showSelectionForm) {
    console.log('[MarksModule RENDER] Rendering selection form');
    return (
      <div className={`p-4 sm:p-6 max-w-full overflow-x-hidden ${className}`}>
        {loading ? (
          <Card>
            <CardContent className="p-8">
              <div className="flex items-center justify-center">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <p className="text-slate-600">Loading students...</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <MarksEntryForm
            onSubmit={handleFormSubmit}
            onCancel={() => setShowSelectionForm(false)}
            userRole={userRole}
          />
        )}
      </div>
    );
  }

  if (showEntryForm) {
    console.log('[MarksModule RENDER] Rendering entry form with', marksData.students.length, 'students');
    return (
      <div className={`p-4 sm:p-6 max-w-full overflow-x-hidden ${className}`}>
        <div className="mb-4 mt-12 sm:mt-0">
          <Button variant="outline" onClick={() => {
            setShowEntryForm(false);
            setShowSelectionForm(false);
            setSelectedFormData(null);
          }}>
            ← Back to Overview
          </Button>
        </div>
        {marksData.students.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">No Students Found</h3>
              <p className="text-slate-500 mb-4">
                No students were found in the selected class. Please select a different class or add students to this class first.
              </p>
              <Button onClick={() => {
                setShowEntryForm(false);
                setShowSelectionForm(true);
              }}>
                ← Back to Selection
              </Button>
            </CardContent>
          </Card>
        ) : (
          <MarksEntryTable
            marksData={marksData}
            onSaveMidterm={handleSaveMidtermMarks}
            onSaveTerminal={handleSaveTerminalMarks}
            onSubmitMidterm={handleSubmitMidtermMarks}
            onSubmitTerminal={handleSubmitTerminalMarks}
            userRole={userRole as 'teacher' | 'principal' | 'admin'}
            isSubmitting={submitting}
          />
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 md:space-y-6 ${className} max-w-full overflow-hidden`}>
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl flex-shrink-0">
              <ClipboardCheck className="h-6 w-6 text-white" />
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-2xl md:text-3xl font-bold truncate">Marks Entry</h1>
              <p className="text-green-100 text-sm md:text-base mt-1">
                {userRole === 'teacher' && 'Manage marks for your subjects'}
                {userRole === 'principal' && 'Oversee marks and approvals'}
                {userRole === 'super_admin' && 'Full marks management'}
                {userRole === 'director' && 'View marks progress'}
                {userRole === 'it_admin' && 'Full marks management'}
              </p>
            </div>
          </div>

          {hasMarkEntryAccess && (
            <Button 
              onClick={() => setShowSelectionForm(true)} 
              size="sm" 
              className="bg-white text-green-600 hover:bg-green-50 flex-shrink-0"
            >
              <Plus className="h-4 w-4 md:mr-2" />
              <span className="hidden md:inline">Enter</span>
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0 mb-6">
          <TabsList className="grid w-full md:min-w-0 min-w-max" style={{ gridTemplateColumns: `repeat(${getTabs().length}, minmax(0, 1fr))` }}>
            {getTabs().map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1.5 md:gap-2 whitespace-nowrap text-xs md:text-sm px-2 md:px-4">
                  <Icon className="h-3.5 w-3.5 md:h-4 md:w-4 flex-shrink-0" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Overview Tab - IT Admin Only */}
        {hasOverviewAccess && (
          <TabsContent value="overview" className="space-y-6">
            {/* Session and Term Filters */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Filter className="h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-700">Filter by:</span>
                  </div>
                  <div className="flex flex-1 gap-4">
                    <div className="flex-1 max-w-xs">
                      <Select 
                        value={selectedSession} 
                        onValueChange={(sessionName) => {
                          setSelectedSession(sessionName);
                          const session = sessions.find(s => s.session_name === sessionName);
                          if (session) setSelectedSessionId(session.id);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select session" />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map((sess) => (
                            <SelectItem key={sess.session_name} value={sess.session_name}>
                              {sess.session_name}
                              {sess.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-1 max-w-xs">
                      <Select 
                        value={selectedTerm} 
                        onValueChange={(termName) => {
                          setSelectedTerm(termName);
                          const term = terms.find(t => t.term_name === termName);
                          if (term) setSelectedTermId(term.id);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select term" />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map((term) => (
                            <SelectItem key={term.term_name} value={term.term_name}>
                              {term.term_name}
                              {term.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <MarksEntryOverview 
              sessionId={selectedSessionId}
              termId={selectedTermId}
              session={selectedSession} 
              term={selectedTerm} 
            />
          </TabsContent>
        )}

        {/* Marks Entry Tab */}
        {hasMarkEntryAccess && (
          <TabsContent value="entry" className="space-y-6">
            {/* Only show "Your Assigned Subjects" section for teachers */}
            {userRole === 'teacher' && (
              <Card>
                <CardHeader>
                  <CardTitle>Your Assigned Subjects</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {assignedSubjects.length === 0 ? (
                      <div className="col-span-full text-center py-12">
                        <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-slate-600 mb-2">No Subjects Assigned</h3>
                        <p className="text-slate-500 mb-4">
                          No subjects have been assigned to you yet. Please contact the administrator.
                        </p>
                      </div>
                    ) : (
                      assignedSubjects.map((subject) => {
                        const subjectEntry = marksEntries.find(m => m.subject_id === subject.id);
                        const isPendingApproval = subjectEntry && (subjectEntry.status === 'pending_approval' || subjectEntry.status === 'submitted');
                        const isDraft = subjectEntry && subjectEntry.status === 'draft';
                        const isApproved = subjectEntry && subjectEntry.status === 'approved';
                        
                        return (
                          <Card key={subject.id} className="hover:shadow-md transition-shadow">
                            <CardContent className="p-4">
                              <h3 className="font-medium mb-2">{subject.name}</h3>
                              <p className="text-sm text-slate-600 mb-2">
                                {subject.department ? `Department: ${subject.department}` : 'General Subject'}
                              </p>
                              <div className="flex items-center justify-between">
                                <Badge variant="outline">
                                  {isDraft 
                                    ? 'Draft' 
                                    : isPendingApproval
                                    ? 'Pending Approval'
                                    : isApproved
                                    ? 'Approved'
                                    : 'Not Started'}
                                </Badge>
                                <div className="flex gap-2">
                                  {(isPendingApproval || isApproved) && subjectEntry && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      className="gap-1"
                                      onClick={() => handleEditPendingMarks(subjectEntry)}
                                    >
                                      <Edit className="h-3 w-3" />
                                      Edit
                                    </Button>
                                  )}
                                  {!subjectEntry && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setShowSelectionForm(true)}
                                    >
                                      Enter Marks
                                    </Button>
                                  )}
                                  {isDraft && (
                                    <Button 
                                      size="sm" 
                                      variant="outline"
                                      onClick={() => setShowSelectionForm(true)}
                                    >
                                      Continue
                                    </Button>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Recent Marks Entries for Teachers */}
            {userRole === 'teacher' && marksEntries.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Marks Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {marksEntries.slice(0, 5).map((entry) => (
                      <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-slate-50">
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-medium">{entry.subject_name}</p>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {entry.class_name}
                            </Badge>
                            <Badge variant="outline" className="text-xs whitespace-nowrap">
                              {entry.exam_name}
                            </Badge>
                          </div>
                          <p className="text-sm text-slate-600">
                            {entry.session} - {entry.term}
                          </p>
                          {entry.updated_at && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              Last updated: {new Date(entry.updated_at).toLocaleDateString()}
                            </p>
                          )}
                          {/* ✅ Show rejection reason if rejected */}
                          {entry.status === 'rejected' && entry.rejection_comment && (
                            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm">
                              <p className="text-red-800 font-medium">Rejection Reason:</p>
                              <p className="text-red-700 mt-1">{entry.rejection_comment}</p>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-3 self-start sm:self-center flex-shrink-0">
                          <Badge variant={
                            entry.status === 'approved' ? 'default' : 
                            entry.status === 'rejected' ? 'destructive' :
                            entry.status === 'submitted' || entry.status === 'pending_approval' ? 'secondary' : 
                            'outline'
                          } className="whitespace-nowrap">
                            {entry.status === 'pending_approval' ? 'Pending' : entry.status}
                          </Badge>
                          {/* Only show Edit button if teacher is assigned (submitted_by === userId) AND status is NOT approved */}
                          {entry.submitted_by === userId && entry.status !== 'approved' && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-8 gap-1 whitespace-nowrap"
                              onClick={() => handleEditPendingMarks(entry)}
                            >
                              <Edit className="h-3 w-3" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* For admins, show recent marks entries instead */}
            {userRole !== 'teacher' && (
              <Card>
                <CardHeader>
                  <CardTitle>Recent Marks Entries</CardTitle>
                </CardHeader>
                <CardContent>
                  {marksEntries.length === 0 ? (
                    <div className="text-center py-12">
                      <AlertCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-slate-600 mb-2">No Marks Entries</h3>
                      <p className="text-slate-500 mb-4">
                        No marks have been entered yet. Click "Enter Marks" to get started.
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {marksEntries.slice(0, 5).map((entry) => (
                        <div key={entry.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-4 border rounded-lg hover:bg-slate-50">
                          <div className="flex-1 min-w-0">
                            <div className="flex flex-wrap items-center gap-2 mb-2">
                              <p className="font-medium">{entry.subject_name}</p>
                              <Badge variant="outline" className="text-xs whitespace-nowrap">
                                {entry.exam_name}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-600">
                              {entry.is_update 
                                ? `Updated by ${entry.action_by} (${entry.action_by_role})`
                                : `Entered by ${entry.action_by} (${entry.action_by_role})`
                              }
                            </p>
                            {entry.is_update && entry.original_creator_name && (
                              <p className="text-xs text-slate-500 mt-0.5">
                                Originally entered by {entry.original_creator_name} ({entry.original_creator_role})
                              </p>
                            )}
                            {entry.approved_by_name && (
                              <p className="text-xs text-green-600 mt-1">
                                Approved by {entry.approved_by_name} ({entry.approved_by_role})
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-3 self-start sm:self-center">
                            <Badge variant={
                              entry.status === 'approved' ? 'default' : 
                              entry.status === 'submitted' || entry.status === 'pending_approval' ? 'secondary' : 
                              'outline'
                            } className="whitespace-nowrap">
                              {entry.status === 'pending_approval' ? 'Pending Approval' : entry.status}
                            </Badge>
                            {userRole === 'teacher' && (entry.status === 'pending_approval' || entry.status === 'submitted' || entry.status === 'approved') && (
                              <Button 
                                size="sm" 
                                variant="ghost"
                                className="h-8 gap-1"
                                onClick={() => handleEditPendingMarks(entry)}
                              >
                                <Edit className="h-3 w-3" />
                                Edit
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Broadsheet Button - Only for Teachers */}
            {userRole === 'teacher' && (
              <Card className="border-2 border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
                <CardContent className="p-6">
                  <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 rounded-lg">
                        <FileSpreadsheet className="h-8 w-8 text-blue-600" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-lg text-slate-800">Teacher Broadsheet</h3>
                        <p className="text-sm text-slate-600 mt-1">
                          View comprehensive marks for all your classes and subjects
                        </p>
                      </div>
                    </div>
                    <Button
                      onClick={() => setShowBroadsheet(true)}
                      size="lg"
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white gap-2 shadow-lg"
                    >
                      <FileSpreadsheet className="h-5 w-5" />
                      View Broadsheet
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>
        )}

        {/* Approval Panel Tab */}
        {hasApprovalAccess && (
          <TabsContent value="approval" className="space-y-6">
            <MarksApprovalPanel
              onApprove={handleApproveMarks}
              onReject={handleRejectMarks}
              userRole={userRole as 'principal' | 'super_admin' | 'director' | 'it_admin'}
            />
          </TabsContent>
        )}

        {/* Audit Log Tab */}
        {hasAuditAccess && (
          <TabsContent value="audit" className="space-y-6">
            <MarksAuditLog
              auditLogs={[]}
              onExport={handleExportAuditLog}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Teacher Broadsheet Dialog */}
      {userRole === 'teacher' && (
        <TeacherBroadsheet
          open={showBroadsheet}
          onClose={() => setShowBroadsheet(false)}
          teacherId={userId}
          teacherName={userName}
        />
      )}
    </div>
  );
}