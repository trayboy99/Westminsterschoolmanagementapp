import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Eye, EyeOff, Calendar, CheckCircle, XCircle, AlertTriangle, Loader2, BookOpen, Lock } from 'lucide-react';
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
import { Alert, AlertDescription } from '../ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

interface PublishingConfig {
  session_name: string;
  term_name: string;
  type: 'midterm' | 'terminal';
  is_published: boolean;
}

interface ClassMarkInfo {
  has_marks: boolean;
  count: number;
  status: 'complete' | 'pending' | 'partial' | 'not_started';
  total_students: number;
  students_with_marks: number;
  students_with_approved: number;
  entry_rate: number;
  approval_rate: number;
}

interface SubjectCompletion {
  id: string;
  name: string;
  code: string;
  level: string;
  teacher_name: string;
  class_marks: Record<string, ClassMarkInfo>;
}

export function ResultPublishingSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [publishingConfigs, setPublishingConfigs] = useState<PublishingConfig[]>([]);
  const [currentSession, setCurrentSession] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'midterm' | 'terminal'>('midterm');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [subjectCompletion, setSubjectCompletion] = useState<SubjectCompletion[]>([]);
  const [loadingCompletion, setLoadingCompletion] = useState(false);
  const [allComplete, setAllComplete] = useState(false);
  const [marksExist, setMarksExist] = useState(false);
  const [cleaningUp, setCleaningUp] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    if (selectedSession && selectedTerm && selectedType) {
      fetchMarksCompletion();
    }
  }, [selectedSession, selectedTerm, selectedType]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch sessions and terms
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const sessionData = await sessionRes.json();
      
      if (sessionData.success) {
        if (sessionData.sessions) {
          setSessions(sessionData.sessions);
          const current = sessionData.sessions.find((s: any) => s.is_current);
          if (current) {
            setCurrentSession(current.session_name);
            setSelectedSession(current.session_name);
          }
        }
        if (sessionData.terms) {
          setTerms(sessionData.terms);
          const current = sessionData.terms.find((t: any) => t.is_current);
          if (current) {
            setCurrentTerm(current.term_name);
            setSelectedTerm(current.term_name);
          }
        }
      }

      // Fetch publishing configs (now includes type)
      const pubRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/publishing-settings`,
        { headers }
      );
      const pubData = await pubRes.json();
      
      if (pubData.success && pubData.configs) {
        setPublishingConfigs(pubData.configs);
      }
    } catch (error) {
      console.error('[ResultPublishingSettings] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMarksCompletion = async () => {
    try {
      setLoadingCompletion(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // ✅ NEW: Include type parameter
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks-completion?session=${selectedSession}&term=${selectedTerm}&type=${selectedType}`,
        { headers }
      );
      const data = await res.json();
      
      console.log('[ResultPublishingSettings] Marks completion response:', {
        success: data.success,
        type: selectedType,
        marksExist: data.marks_exist,
        subjectsCount: data.subjects?.length || 0,
        allComplete: data.all_complete,
        totalChecks: data.total_checks,
        completedChecks: data.completed_checks
      });
      
      // ✅ NEW: Log detailed subject-class breakdown
      if (data.subjects && data.subjects.length > 0) {
        console.log('[ResultPublishingSettings] Subject-Class Details:');
        data.subjects.forEach((subject: SubjectCompletion) => {
          Object.entries(subject.class_marks).forEach(([className, mark]) => {
            console.log(`  ${subject.name} - ${className}:`, {
              status: mark.status,
              total_students: mark.total_students,
              students_with_approved: mark.students_with_approved,
              approval_rate: mark.approval_rate,
              entry_rate: mark.entry_rate
            });
          });
        });
      }
      
      if (data.success) {
        setSubjectCompletion(data.subjects || []);
        setAllComplete(data.all_complete || false);
        setMarksExist(data.marks_exist || false); // ✅ Track if ANY marks exist
      } else {
        console.error('[ResultPublishingSettings] Failed to fetch marks completion:', data.error);
        setSubjectCompletion([]);
        setAllComplete(false);
        setMarksExist(false);
      }
    } catch (error) {
      console.error('[ResultPublishingSettings] Marks completion error:', error);
      setSubjectCompletion([]);
      setAllComplete(false);
      setMarksExist(false);
    } finally {
      setLoadingCompletion(false);
    }
  };

  const togglePublishing = async (sessionName: string, termName: string, type: 'midterm' | 'terminal') => {
    const published = isPublished(sessionName, termName, type);
    
    // If trying to publish, check if marks exist first
    if (!published) {
      // Refetch completion for this specific session/term/type
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };

        const res = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks-completion?session=${sessionName}&term=${termName}&type=${type}`,
          { headers }
        );
        const data = await res.json();
        
        // ✅ Check if marks exist
        if (!data.success || !data.marks_exist) {
          toast.error(`Cannot publish ${type} results. No marks have been entered yet.`);
          return;
        }
        
        // ✅ Check if marks are complete
        if (!data.all_complete) {
          toast.error(`Cannot publish ${type} results. Not all teachers have entered marks for all classes yet.`);
          return;
        }
      } catch (error) {
        toast.error('Failed to verify marks completion.');
        return;
      }
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/toggle-result-publishing`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ session_name: sessionName, term_name: termName, type }) // ✅ Include type
        }
      );
      const result = await res.json();
      
      if (result.success) {
        toast.success(result.is_published 
          ? `${type === 'midterm' ? 'Midterm' : 'Terminal'} results published successfully! ✅` 
          : `${type === 'midterm' ? 'Midterm' : 'Terminal'} results unpublished`
        );
        await fetchSettings();
        await fetchMarksCompletion(); // Refresh marks status
      } else {
        toast.error(result.error || 'Failed to toggle publishing');
      }
    } catch (error) {
      console.error('[ResultPublishingSettings] Toggle error:', error);
      toast.error('Failed to toggle publishing');
    } finally {
      setSaving(false);
    }
  };

  const cleanupOrphanedRecords = async () => {
    try {
      setCleaningUp(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cleanup-orphaned-assignments`,
        {
          method: 'POST',
          headers
        }
      );
      const result = await res.json();
      
      if (result.success) {
        if (result.deleted_count > 0) {
          toast.success(`✅ Cleaned up ${result.deleted_count} orphaned student assignment(s)!`);
          // Refresh marks completion to show updated counts
          await fetchMarksCompletion();
        } else {
          toast.info('No orphaned records found. Database is clean! ✨');
        }
      } else {
        toast.error(result.error || 'Failed to cleanup orphaned records');
      }
    } catch (error) {
      console.error('[ResultPublishingSettings] Cleanup error:', error);
      toast.error('Failed to cleanup orphaned records');
    } finally {
      setCleaningUp(false);
    }
  };

  const isPublished = (sessionName: string, termName: string, type: 'midterm' | 'terminal') => {
    const config = publishingConfigs.find(
      c => c.session_name === sessionName && c.term_name === termName && c.type === type
    );
    return config?.is_published || false;
  };

  const juniorSubjects = subjectCompletion.filter(s => s.level === 'junior');
  const seniorSubjects = subjectCompletion.filter(s => s.level === 'senior');
  
  // Extract ALL unique class names from the data (including sections)
  const juniorClassNames = new Set<string>();
  const seniorClassNames = new Set<string>();
  
  juniorSubjects.forEach(subject => {
    Object.keys(subject.class_marks).forEach(className => {
      juniorClassNames.add(className);
    });
  });
  
  seniorSubjects.forEach(subject => {
    Object.keys(subject.class_marks).forEach(className => {
      seniorClassNames.add(className);
    });
  });
  
  // Sort class names: JS1, JS1 Diamond, JS2, JS2 Gold, JS3, JS3 Diamond, etc.
  const sortClassNames = (a: string, b: string) => {
    const extractNumber = (str: string) => {
      const match = str.match(/\d+/);
      return match ? parseInt(match[0]) : 0;
    };
    const numA = extractNumber(a);
    const numB = extractNumber(b);
    if (numA !== numB) return numA - numB;
    // Same number, sort alphabetically (base class first, then sections)
    return a.localeCompare(b);
  };
  
  const sortedJuniorClasses = Array.from(juniorClassNames).sort(sortClassNames);
  const sortedSeniorClasses = Array.from(seniorClassNames).sort(sortClassNames);
  
  const calculateCompletion = (subjects: SubjectCompletion[]) => {
    let totalStudents = 0;
    let studentsWithApprovedMarks = 0;
    subjects.forEach(subject => {
      Object.values(subject.class_marks).forEach(mark => {
        totalStudents += mark.total_students;
        studentsWithApprovedMarks += mark.students_with_approved;
      });
    });
    return { 
      total: totalStudents, 
      complete: studentsWithApprovedMarks, 
      percentage: totalStudents > 0 ? Math.round((studentsWithApprovedMarks / totalStudents) * 100) : 0 
    };
  };

  const getStatusIcon = (mark: ClassMarkInfo | undefined) => {
    if (!mark) {
      return (
        <div className="flex flex-col items-center py-2">
          <span className="text-xs text-slate-400">N/A</span>
        </div>
      );
    }

    const { status, entry_rate, approval_rate, total_students, students_with_approved } = mark;

    switch (status) {
      case 'complete':
        return (
          <div className="flex flex-col items-center py-2 group relative cursor-help">
            <CheckCircle className="h-6 w-6 text-green-600" />
            <div className="flex items-center gap-1 mt-1">
              <div className="w-12 h-1.5 bg-green-600 rounded-full" />
            </div>
            <span className="text-xs font-medium text-green-700 mt-0.5">100%</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              ✅ Complete: {students_with_approved}/{total_students} students approved
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        );

      case 'pending':
        return (
          <div className="flex flex-col items-center py-2 group relative cursor-help">
            <Loader2 className="h-6 w-6 text-blue-600 animate-spin" />
            <div className="flex items-center gap-1 mt-1">
              <div className="w-12 h-1.5 bg-blue-200 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600" style={{ width: `${approval_rate}%` }} />
              </div>
            </div>
            <span className="text-xs font-medium text-blue-700 mt-0.5">{approval_rate}%</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              🔄 Pending: {students_with_approved}/{total_students} approved<br/>
              All marks entered, awaiting approval
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        );

      case 'partial':
        return (
          <div className="flex flex-col items-center py-2 group relative cursor-help">
            <AlertTriangle className="h-6 w-6 text-amber-600" />
            <div className="flex items-center gap-1 mt-1">
              <div className="w-12 h-1.5 bg-amber-200 rounded-full overflow-hidden">
                <div className="h-full bg-amber-600" style={{ width: `${approval_rate}%` }} />
              </div>
            </div>
            <span className="text-xs font-medium text-amber-700 mt-0.5">{approval_rate}%</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              ⚠️ Partial: {students_with_approved}/{total_students} approved<br/>
              Entry: {entry_rate}% | Approval: {approval_rate}%
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        );

      case 'not_started':
      default:
        return (
          <div className="flex flex-col items-center py-2 group relative cursor-help">
            <XCircle className="h-6 w-6 text-red-600" />
            <div className="flex items-center gap-1 mt-1">
              <div className="w-12 h-1.5 bg-red-200 rounded-full" />
            </div>
            <span className="text-xs font-medium text-red-700 mt-0.5">0%</span>
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-10 pointer-events-none">
              ❌ Not Started: 0/{total_students} students<br/>
              No marks entered yet
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        );
    }
  };

  const juniorCompletion = calculateCompletion(juniorSubjects);
  const seniorCompletion = calculateCompletion(seniorSubjects);
  const overallCompletion = calculateCompletion(subjectCompletion);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ✅ NEW: Type Selector at the top */}
      <Card className="border-2 border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-lg">Select Assessment Type</CardTitle>
          <CardDescription>
            Choose whether to manage Midterm or Terminal result publishing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Select value={selectedType} onValueChange={(val: 'midterm' | 'terminal') => setSelectedType(val)}>
            <SelectTrigger className="h-11 text-base font-medium bg-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="midterm">📝 Midterm Assessment</SelectItem>
              <SelectItem value="terminal">📄 Terminal Assessment</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Publishing Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5" />
            Result Publishing Control
          </CardTitle>
          <CardDescription>
            Manage which {selectedType === 'midterm' ? 'midterm' : 'terminal'} results are visible to students
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              <strong>Important:</strong> {selectedType === 'midterm' ? 'Midterm' : 'Terminal'} results can only be published when marks exist and ALL teachers have entered marks for ALL classes.
            </AlertDescription>
          </Alert>

          {/* Current Session & Term Info */}
          {currentSession && currentTerm && (
            <div className="p-3 sm:p-4 border rounded-lg bg-gradient-to-r from-blue-50 to-purple-50">
              <div className="flex items-center justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <p className="text-xs sm:text-sm text-slate-600 mb-1">Current Active Period</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="default" className="text-xs">{currentSession}</Badge>
                    <Badge variant="secondary" className="text-xs">{currentTerm}</Badge>
                    <Badge variant="outline" className="text-xs bg-white">
                      {selectedType === 'midterm' ? '📝 Midterm' : '📄 Terminal'}
                    </Badge>
                  </div>
                </div>
                <Calendar className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 shrink-0" />
              </div>
            </div>
          )}

          {/* Publishing Controls */}
          <div className="space-y-3 sm:space-y-4">
            <h3 className="font-semibold text-sm sm:text-base">
              Publish {selectedType === 'midterm' ? 'Midterm' : 'Terminal'} Results by Session and Term
            </h3>
            {sessions.length > 0 && terms.length > 0 ? (
              sessions.map(session => (
                <div key={session.session_name} className="border rounded-lg p-3 sm:p-4 space-y-3">
                  <h4 className="font-medium text-sm sm:text-base flex items-center gap-2 flex-wrap">
                    {session.session_name}
                    {session.session_name === currentSession && (
                      <Badge variant="default" className="text-xs">Current</Badge>
                    )}
                  </h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                    {terms.map(term => {
                      const published = isPublished(session.session_name, term.term_name, selectedType);
                      const isCurrent = session.session_name === currentSession && term.term_name === currentTerm;
                      
                      // ✅ Check if this specific session/term/type has marks and is complete
                      const canPublish = isCurrent ? (marksExist && allComplete) : false;
                      
                      return (
                        <div
                          key={`${session.session_name}-${term.term_name}`}
                          className={`p-3 sm:p-4 border-2 rounded-lg transition-all ${
                            isCurrent 
                              ? 'bg-gradient-to-br from-blue-50 to-purple-50 border-blue-300 shadow-md sm:scale-105' 
                              : 'bg-slate-50 border-slate-200 opacity-60 blur-[0.5px] hover:opacity-100 hover:blur-0'
                          }`}
                        >
                          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                            <span className={`font-medium ${isCurrent ? 'text-sm sm:text-base' : 'text-xs sm:text-sm'}`}>
                              {term.term_name} - {selectedType === 'midterm' ? 'Midterm' : 'Terminal'}
                            </span>
                            {isCurrent && (
                              <Badge variant="default" className="text-xs">Active Now</Badge>
                            )}
                          </div>
                          <Button
                            variant={published ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => togglePublishing(session.session_name, term.term_name, selectedType)}
                            disabled={saving || (isCurrent && !published && !canPublish)}
                            className={`w-full gap-2 text-xs sm:text-sm h-8 sm:h-9 ${
                              published 
                                ? 'bg-green-600 hover:bg-green-700' 
                                : isCurrent && !canPublish
                                ? 'opacity-50 cursor-not-allowed'
                                : ''
                            }`}
                          >
                            {published ? (
                              <>
                                <Eye className="h-4 w-4" />
                                Published
                              </>
                            ) : (
                              <>
                                {isCurrent && !canPublish ? (
                                  <>
                                    <Lock className="h-4 w-4" />
                                    {!marksExist ? 'No Marks' : 'Incomplete'}
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="h-4 w-4" />
                                    Publish
                                  </>
                                )}
                              </>
                            )}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))
            ) : (
              <Alert>
                <AlertDescription>
                  No sessions or terms configured. Please configure sessions and terms in the Session Settings tab.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Marks Completion Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            {selectedType === 'midterm' ? 'Midterm' : 'Terminal'} Marks Entry Completion Status
          </CardTitle>
          <CardDescription>
            Track which classes have {selectedType} marks entered for each subject
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Session & Term Selector */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Session</label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.session_name} value={session.session_name}>
                      {session.session_name}
                      {session.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs sm:text-sm font-medium">Term</label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="h-9 text-sm">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.term_name} value={term.term_name}>
                      {term.term_name}
                      {term.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {loadingCompletion ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : !marksExist ? (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>No {selectedType} marks found</strong> for {selectedSession} - {selectedTerm}.<br/>
                Teachers need to enter {selectedType} marks before results can be published.
              </AlertDescription>
            </Alert>
          ) : subjectCompletion.length > 0 ? (
            <>
              {/* Completion Summary */}
              <div className={`p-3 sm:p-4 rounded-lg border-2 ${allComplete ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-base sm:text-lg">Overall Completion</span>
                  <span className="text-xl sm:text-2xl font-bold">{overallCompletion.percentage}%</span>
                </div>
                <div className="w-full bg-white rounded-full h-2 sm:h-3 overflow-hidden">
                  <div
                    className={`h-full ${allComplete ? 'bg-green-600' : 'bg-amber-600'}`}
                    style={{ width: `${overallCompletion.percentage}%` }}
                  />
                </div>
                <p className="text-xs sm:text-sm text-slate-600 mt-2">
                  {overallCompletion.complete} of {overallCompletion.total} subject enrollments have {selectedType} marks approved
                </p>
              </div>

              {/* ✅ NEW: Cleanup Button */}
              {!allComplete && (
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertTriangle className="h-4 w-4 text-orange-600" />
                  <AlertDescription className="flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <strong>Incomplete marks detected.</strong><br/>
                      Some students may have graduated or been deleted. Click to clean up orphaned records.
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={cleanupOrphanedRecords}
                      disabled={cleaningUp}
                      className="shrink-0"
                    >
                      {cleaningUp ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Cleaning...
                        </>
                      ) : (
                        <>
                          🧹 Cleanup Database
                        </>
                      )}
                    </Button>
                  </AlertDescription>
                </Alert>
              )}

              {/* Junior Section */}
              {juniorSubjects.length > 0 && sortedJuniorClasses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm sm:text-base">Junior Classes</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">
                        {juniorCompletion.complete}/{juniorCompletion.total} students
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {juniorCompletion.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Subject</TableHead>
                          <TableHead className="min-w-[120px]">Teacher</TableHead>
                          {sortedJuniorClasses.map(className => (
                            <TableHead key={className} className="text-center min-w-[80px]">
                              {className}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {juniorSubjects.map(subject => (
                          <TableRow key={subject.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {subject.name}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {subject.teacher_name || '-'}
                            </TableCell>
                            {sortedJuniorClasses.map(className => (
                              <TableCell key={className} className="text-center">
                                {getStatusIcon(subject.class_marks[className])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}

              {/* Senior Section */}
              {seniorSubjects.length > 0 && sortedSeniorClasses.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="font-semibold text-sm sm:text-base">Senior Classes</h4>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-600">
                        {seniorCompletion.complete}/{seniorCompletion.total} students
                      </span>
                      <Badge variant="secondary" className="text-xs">
                        {seniorCompletion.percentage}%
                      </Badge>
                    </div>
                  </div>
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[150px]">Subject</TableHead>
                          <TableHead className="min-w-[120px]">Teacher</TableHead>
                          {sortedSeniorClasses.map(className => (
                            <TableHead key={className} className="text-center min-w-[80px]">
                              {className}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {seniorSubjects.map(subject => (
                          <TableRow key={subject.id}>
                            <TableCell className="font-medium text-xs sm:text-sm">
                              {subject.name}
                            </TableCell>
                            <TableCell className="text-xs sm:text-sm">
                              {subject.teacher_name || '-'}
                            </TableCell>
                            {sortedSeniorClasses.map(className => (
                              <TableCell key={className} className="text-center">
                                {getStatusIcon(subject.class_marks[className])}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              )}
            </>
          ) : (
            <Alert>
              <AlertDescription>
                Select a session and term to view {selectedType} marks completion status.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}