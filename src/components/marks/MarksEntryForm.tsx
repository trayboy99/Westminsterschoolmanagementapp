import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { BookOpen, Users, Calendar, Clock, ArrowRight, AlertCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface MarksEntryFormProps {
  onSubmit: (formData: MarksFormData) => void;
  onCancel: () => void;
  userRole: string;
}

export interface MarksFormData {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  session: string;
  term: string;
  termId?: string;
  examId?: string;
  examName?: string;
}

export function MarksEntryForm({ onSubmit, onCancel, userRole }: MarksEntryFormProps) {
  const [formData, setFormData] = useState<Partial<MarksFormData>>({});
  const [subjects, setSubjects] = useState<any[]>([]);
  const [classes, setClasses] = useState<any[]>([]);
  const [allSubjects, setAllSubjects] = useState<any[]>([]); // Store all subjects
  const [allClasses, setAllClasses] = useState<any[]>([]); // Store all classes
  const [assignments, setAssignments] = useState<Array<{subject_id: string, class_id: string}>>([]); // Subject-class pairs
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchFormData();
  }, []);

  useEffect(() => {
    fetchExamsForSelection();
  }, [formData.session, formData.term]);

  const fetchFormData = async () => {
    setLoading(true);
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

      // Fetch teacher assignments (subjects and classes based on role)
      const assignmentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-assignments`,
        { headers }
      );
      const assignmentsData = await assignmentsRes.json();
      
      if (assignmentsData.success) {
        console.log('[Marks Entry Form] Fetched subjects:', assignmentsData.subjects);
        console.log('[Marks Entry Form] Fetched classes:', assignmentsData.classes);
        console.log('[Marks Entry Form] Fetched assignments:', assignmentsData.assignments);
        console.log('[Marks Entry Form] Is Admin:', assignmentsData.isAdmin);
        
        // Store all subjects and classes
        setAllSubjects(assignmentsData.subjects);
        setAllClasses(assignmentsData.classes);
        setAssignments(assignmentsData.assignments || []);
        
        // Initially show all subjects and classes
        setSubjects(assignmentsData.subjects);
        setClasses(assignmentsData.classes);
        setIsAdmin(assignmentsData.isAdmin);
      } else {
        console.error('[Marks Entry Form] Error fetching assignments:', assignmentsData.error);
        toast.error(assignmentsData.error || 'Failed to fetch assignments');
      }

      // Fetch academic sessions and terms from centralized settings
      const settingsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const settingsData = await settingsRes.json();
      
      if (settingsData.success) {
        setSessions(settingsData.sessions || []);
        setTerms(settingsData.terms || []);
        
        // Auto-select the current session if available
        const currentSession = settingsData.sessions?.find((s: any) => s.is_current);
        if (currentSession) {
          setFormData(prev => ({
            ...prev,
            session: currentSession.session_name
          }));
        } else if (settingsData.sessions?.length > 0) {
          // Otherwise select the first session
          setFormData(prev => ({
            ...prev,
            session: settingsData.sessions[0].session_name
          }));
        }

        // Auto-select the current term if available
        const currentTerm = settingsData.terms?.find((t: any) => t.is_current);
        if (currentTerm) {
          setFormData(prev => ({
            ...prev,
            term: currentTerm.term_name
          }));
        }
      } else {
        console.log('No academic sessions/terms configured in settings');
        toast.info('Please configure academic sessions and terms in Settings first');
      }

    } catch (error) {
      console.error('Error fetching form data:', error);
      toast.error('Failed to load form data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubjectChange = (subjectId: string) => {
    const subject = allSubjects.find(s => s.id === subjectId);
    if (subject) {
      console.log('[Marks Entry Form] Subject selected:', subject.name);
      
      // Filter classes to only those where this subject is taught
      const classesForSubject = assignments
        .filter(a => a.subject_id === subjectId)
        .map(a => a.class_id);
      
      const filteredClasses = allClasses.filter(c => 
        classesForSubject.includes(c.id)
      );
      
      console.log('[Marks Entry Form] Filtered classes for this subject:', filteredClasses.length);
      setClasses(filteredClasses);
      
      // Reset class selection if current class is not available for this subject
      if (formData.classId && !classesForSubject.includes(formData.classId)) {
        setFormData(prev => ({
          ...prev,
          subjectId: subject.id,
          subjectName: subject.name,
          classId: '',
          className: ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          subjectId: subject.id,
          subjectName: subject.name
        }));
      }
    }
  };

  const handleClassChange = (classId: string) => {
    const classData = allClasses.find(c => c.id === classId);
    if (classData) {
      console.log('[Marks Entry Form] Class selected:', classData.display_name || classData.name);
      
      // Filter subjects to only those taught in this class
      const subjectsInClass = assignments
        .filter(a => a.class_id === classId)
        .map(a => a.subject_id);
      
      const filteredSubjects = allSubjects.filter(s => 
        subjectsInClass.includes(s.id)
      );
      
      console.log('[Marks Entry Form] Filtered subjects for this class:', filteredSubjects.length);
      setSubjects(filteredSubjects);
      
      // Reset subject selection if current subject is not available for this class
      if (formData.subjectId && !subjectsInClass.includes(formData.subjectId)) {
        setFormData(prev => ({
          ...prev,
          classId: classData.id,
          className: classData.display_name || classData.name,
          subjectId: '',
          subjectName: ''
        }));
      } else {
        setFormData(prev => ({
          ...prev,
          classId: classData.id,
          className: classData.display_name || classData.name
        }));
      }
    }
  };

  const fetchTermsForSession = async (session: string, headers?: any) => {
    // Terms are now fetched together with sessions
    // This function is kept for compatibility but does nothing
    return;
  };

  const fetchExamsForSelection = async () => {
    // Only fetch exams if we have session and term (exams are not class-specific)
    if (!formData.session || !formData.term) {
      setExams([]);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Exams are filtered by session and term only (not class_id)
      const params = new URLSearchParams({
        session: formData.session,
        term: formData.term
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams?${params.toString()}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setExams(data.exams);
      } else {
        console.error('Failed to fetch exams:', data.error);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const handleSessionChange = (session: string) => {
    setFormData(prev => ({
      ...prev,
      session,
      term: '', // Reset term when session changes
      examId: '', // Reset exam when session changes
      examName: undefined
    }));
  };

  const handleExamChange = (examId: string) => {
    const exam = exams.find(e => e.id === examId);
    if (exam) {
      setFormData(prev => ({
        ...prev,
        examId: exam.id,
        examName: exam.name
      }));
    }
  };

  const handleSubmit = () => {
    // Validate form
    if (!formData.classId) {
      toast.error('Please select a class');
      return;
    }
    if (!formData.subjectId) {
      toast.error('Please select a subject');
      return;
    }
    if (!formData.session) {
      toast.error('Please select an academic session');
      return;
    }
    if (!formData.term) {
      toast.error('Please select a term');
      return;
    }
    if (!formData.examId) {
      toast.error('Please select an exam');
      return;
    }

    onSubmit(formData as MarksFormData);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading form data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6 max-w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-xl sm:text-2xl font-bold break-words mt-12 sm:mt-0">Enter Marks</h2>
          <p className="text-slate-600 mt-1 text-sm sm:text-base break-words">
            Select class, subject, and academic session to begin marks entry
          </p>
        </div>
        <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto flex-shrink-0">
          Cancel
        </Button>
      </div>

      {isAdmin && (
        <Alert>
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          <AlertDescription className="text-sm break-words">
            You have admin access and can enter marks for all classes and subjects.
          </AlertDescription>
        </Alert>
      )}

      {!isAdmin && allSubjects.length === 0 && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertCircle className="h-4 w-4 text-orange-600 flex-shrink-0" />
          <AlertDescription className="text-orange-800 text-sm break-words">
            No subjects assigned to you. Please contact the administrator to assign subjects through the Subjects Manager.
          </AlertDescription>
        </Alert>
      )}

      {!isAdmin && allSubjects.length > 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
          <AlertDescription className="text-blue-800 text-xs sm:text-sm break-words">
            You have access to <strong>{allSubjects.length}</strong> subject{allSubjects.length !== 1 ? 's' : ''} and <strong>{allClasses.length}</strong> class{allClasses.length !== 1 ? 'es' : ''} based on your assignments.
            {formData.classId && subjects.length < allSubjects.length && (
              <span className="block mt-1">
                Showing {subjects.length} subject{subjects.length !== 1 ? 's' : ''} available for the selected class.
              </span>
            )}
            {formData.subjectId && classes.length < allClasses.length && (
              <span className="block mt-1">
                Showing {classes.length} class{classes.length !== 1 ? 'es' : ''} where you teach this subject.
              </span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Card className="overflow-hidden">
        <CardHeader>
          <CardTitle className="text-base sm:text-lg">Marks Entry Details</CardTitle>
          <p className="text-xs sm:text-sm text-slate-600 mt-2 break-words">
            {!isAdmin && "Select a class or subject to see filtered options based on your teaching assignments."}
            {isAdmin && "As an admin, you can enter marks for any class-subject combination."}
          </p>
        </CardHeader>
        <CardContent className="space-y-4 sm:space-y-6 p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            {/* Class Selection */}
            <div className="space-y-2">
              <Label htmlFor="class" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Class *
              </Label>
              <Select 
                value={formData.classId} 
                onValueChange={handleClassChange}
                disabled={classes.length === 0}
              >
                <SelectTrigger id="class">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map(classData => (
                    <SelectItem key={classData.id} value={classData.id}>
                      {classData.display_name || classData.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {classes.length === 0 && !formData.subjectId && (
                <p className="text-sm text-slate-500">No classes available</p>
              )}
              {classes.length === 0 && formData.subjectId && (
                <p className="text-sm text-slate-500">No classes available for selected subject</p>
              )}
            </div>

            {/* Subject Selection */}
            <div className="space-y-2">
              <Label htmlFor="subject" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Subject *
              </Label>
              <Select 
                value={formData.subjectId} 
                onValueChange={handleSubjectChange}
                disabled={subjects.length === 0}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} {subject.code && `(${subject.code})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!isAdmin && subjects.length === 0 && !formData.classId && (
                <p className="text-sm text-slate-500">No subjects assigned to you</p>
              )}
              {!isAdmin && subjects.length === 0 && formData.classId && (
                <p className="text-sm text-slate-500">No subjects available for selected class</p>
              )}
            </div>

            {/* Academic Session (Year) */}
            <div className="space-y-2">
              <Label htmlFor="session" className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Academic Session *
              </Label>
              <Select 
                value={formData.session} 
                onValueChange={handleSessionChange}
                disabled={sessions.length === 0}
              >
                <SelectTrigger id="session">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id || session.session_name} value={session.session_name}>
                      {session.session_name}
                      {session.is_current && ' (Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sessions.length === 0 && (
                <p className="text-sm text-slate-500">No academic sessions configured</p>
              )}
            </div>

            {/* Term */}
            <div className="space-y-2">
              <Label htmlFor="term" className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Term *
              </Label>
              <Select 
                value={formData.term} 
                onValueChange={(value) => setFormData(prev => ({ ...prev, term: value }))}
                disabled={terms.length === 0}
              >
                <SelectTrigger id="term">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.id || term.term_name} value={term.term_name}>
                      {term.term_name}
                      {term.is_current && ' (Current)'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {terms.length === 0 && (
                <p className="text-sm text-slate-500">No terms configured</p>
              )}
            </div>

            {/* Exam Selection */}
            <div className="space-y-2">
              <Label htmlFor="exam" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Exam *
              </Label>
              <Select 
                value={formData.examId || undefined} 
                onValueChange={handleExamChange}
                disabled={!formData.classId || !formData.session || !formData.term}
              >
                <SelectTrigger id="exam">
                  <SelectValue placeholder="Select exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map(exam => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.name} ({exam.type})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {exams.length === 0 && formData.classId && formData.session && formData.term && (
                <p className="text-sm text-slate-500">No exams available for this selection</p>
              )}
              {(!formData.classId || !formData.session || !formData.term) && (
                <p className="text-sm text-slate-500">Select class, session, and term first</p>
              )}
            </div>
          </div>

          {/* Selection Summary */}
          {formData.classId && formData.subjectId && formData.session && formData.term && (
            <Alert className="border-blue-200 bg-blue-50">
              <AlertCircle className="h-4 w-4 text-blue-600 flex-shrink-0" />
              <AlertDescription className="text-blue-800 text-xs sm:text-sm break-words">
                <strong>Selected:</strong> {formData.className} • {formData.subjectName} • {formData.session} • {formData.term}
                {formData.examName && ` • ${formData.examName}`}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Buttons */}
          <div className="flex flex-col-reverse sm:flex-row justify-end gap-3">
            <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto">
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={!formData.classId || !formData.subjectId || !formData.session || !formData.term || !formData.examId}
              className="w-full sm:w-auto"
            >
              <span className="hidden sm:inline">Continue to Marks Entry</span>
              <span className="sm:hidden">Continue</span>
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
