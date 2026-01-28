import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Calendar, Check, X, Clock, FileText, AlertCircle, Save, Info, Edit2, Lock } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Switch } from '../ui/switch';

interface AttendanceMarkingProps {
  userProfile: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    role: string;
    class_id?: string;
  };
}

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}

interface AttendanceRecord {
  studentId: string;
  status: 'present' | 'absent' | 'late' | 'excused';
  notes?: string;
}

interface StudentAttendanceSummary {
  student_id: string;
  attendance_percentage: number;
  attendance_grade: string;
  days_present: number;
  days_absent: number;
  total_school_days: number;
  flagged: boolean;
}

export function AttendanceMarking({ userProfile }: AttendanceMarkingProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<Record<string, AttendanceRecord>>({});
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentSession, setCurrentSession] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const [weekNumber, setWeekNumber] = useState(1);
  const [classInfo, setClassInfo] = useState<any>(null);
  const [existingAttendance, setExistingAttendance] = useState<any[]>([]);
  const [studentSummaries, setStudentSummaries] = useState<Record<string, StudentAttendanceSummary>>({});
  const [loadingSummaries, setLoadingSummaries] = useState(false);
  const [calendarConfigured, setCalendarConfigured] = useState(true);
  const [manualWeekEdit, setManualWeekEdit] = useState(false);
  const [termStartDate, setTermStartDate] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    fetchClassAndStudents();
    fetchActiveSessionTerm();
  }, []);

  useEffect(() => {
    if (classInfo?.id && selectedDate && currentSession && currentTerm) {
      fetchExistingAttendance();
    }
  }, [selectedDate, currentSession, currentTerm, classInfo]);

  useEffect(() => {
    if (students.length > 0 && currentSession && currentTerm) {
      fetchStudentSummaries();
    }
  }, [students, currentSession, currentTerm]);

  // Auto-calculate week number when date or term changes
  useEffect(() => {
    if (selectedDate && currentTerm && currentSession && !manualWeekEdit) {
      calculateWeekNumber();
    }
  }, [selectedDate, currentTerm, currentSession, manualWeekEdit]);

  const calculateWeekNumber = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/current-week`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await response.json();
      
      if (result.success && result.week_info) {
        // Calculate week number based on selected date and term start date
        const termStart = new Date(result.week_info.term_start_date);
        const selected = new Date(selectedDate);
        
        // Calculate the difference in days
        const diffInMs = selected.getTime() - termStart.getTime();
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
        
        // Calculate week number (0-indexed, so add 1)
        const calculatedWeek = Math.floor(diffInDays / 7) + 1;
        
        // Ensure it's within valid range (1-15)
        const validWeek = Math.max(1, Math.min(15, calculatedWeek));
        setWeekNumber(validWeek);
        
        console.log('[Attendance] Auto-calculated week number:', validWeek, 'from date:', selectedDate);
      }
    } catch (error) {
      console.error('[Attendance] Error calculating week number:', error);
    }
  };

  const fetchActiveSessionTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch current session and term from admin settings (KV store)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[Attendance] Session settings response:', data);
      
      if (data.success) {
        // Find the current session and term marked by admin
        const activeSession = data.sessions?.find((s: any) => s.is_current);
        const activeTerm = data.terms?.find((t: any) => t.is_current);
        
        console.log('[Attendance] Found active session:', activeSession);
        console.log('[Attendance] Found active term:', activeTerm);
        
        if (activeSession?.session_name) {
          setCurrentSession(activeSession.session_name);
          console.log('[Attendance] ✅ Set session to:', activeSession.session_name);
        } else {
          console.warn('[Attendance] ⚠️ No active session found! Admin needs to set current session.');
          toast.error('⚠️ No active session set. Please contact admin.');
        }
        
        if (activeTerm?.term_name) {
          setCurrentTerm(activeTerm.term_name);
          console.log('[Attendance] ✅ Set term to:', activeTerm.term_name);
        } else {
          // Default to First Term if none is set
          setCurrentTerm('First Term');
          console.warn('[Attendance] ⚠️ No active term found. Defaulting to First Term.');
        }
      } else {
        console.error('[Attendance] Failed to fetch session settings:', data.error);
        toast.error('Failed to load session settings. Please refresh.');
      }
    } catch (error) {
      console.error('Error fetching active session/term:', error);
      toast.error('Failed to load session settings');
    }
  };

  const fetchClassAndStudents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to continue');
        return;
      }

      console.log('[Attendance] Fetching class assignment for teacher:', userProfile.id);

      // Get class assignment from backend (handles RLS properly)
      const diagResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/my-class-assignment`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const diagData = await diagResponse.json();
      console.log('[Attendance] Class assignment response:', diagData);

      if (!diagData.success) {
        console.error('[Attendance] Failed to fetch class assignment:', diagData);
        toast.error(diagData.error || 'Failed to load class assignment');
        setLoading(false);
        return;
      }

      if (!diagData.assigned_classes || diagData.assigned_classes.length === 0) {
        console.error('[Attendance] No class assigned. Teacher ID:', userProfile.id);
        toast.error('You are not assigned as a class teacher. Please contact the administrator.');
        setLoading(false);
        return;
      }

      // Take the first assigned class
      const assignedClass = diagData.assigned_classes[0];
      console.log('[Attendance] Found class:', assignedClass);
      setClassInfo(assignedClass);

      // Fetch students in the class
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/class-students?class_id=${assignedClass.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[Attendance] Students fetch result:', data);

      if (data.success && data.students) {
        setStudents(data.students);
        // Initialize attendance records with 'present' status
        const initialAttendance: Record<string, AttendanceRecord> = {};
        data.students.forEach((student: Student) => {
          initialAttendance[student.id] = {
            studentId: student.id,
            status: 'present',
            notes: ''
          };
        });
        setAttendance(initialAttendance);
      } else {
        console.error('[Attendance] Failed to fetch students:', data);
        if (data.debug) {
          console.error('[Attendance] Debug info:', data.debug);
        }
        toast.error(data.error || 'Failed to fetch students');
      }
    } catch (error) {
      console.error('Error fetching class and students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const fetchExistingAttendance = async () => {
    try {
      if (!classInfo?.id) return;

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance?class_id=${classInfo.id}&date=${selectedDate}&session=${currentSession}&term=${currentTerm}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success && data.attendance) {
        setExistingAttendance(data.attendance);
        
        // CRITICAL FIX: Only update attendance state if we have existing records
        // Otherwise, preserve the current state (which has the just-saved data)
        if (data.attendance.length > 0) {
          // Update attendance state with existing records
          const updatedAttendance = { ...attendance };
          data.attendance.forEach((record: any) => {
            updatedAttendance[record.student_id] = {
              studentId: record.student_id,
              status: record.status.toLowerCase(), // Normalize to lowercase
              notes: record.notes || ''
            };
          });
          setAttendance(updatedAttendance);
          
          // Update week number if it exists
          if (data.attendance[0].week_number) {
            setWeekNumber(data.attendance[0].week_number);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching existing attendance:', error);
    }
  };

  const fetchStudentSummaries = async () => {
    try {
      setLoadingSummaries(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const summaries: Record<string, StudentAttendanceSummary> = {};
      let calendarNotConfigured = false;

      console.log('[AttendanceMarking] Fetching summaries for', students.length, 'students');
      console.log('[AttendanceMarking] Using session:', currentSession, 'term:', currentTerm);

      // Fetch summaries for each student
      const summaryPromises = students.map(async (student) => {
        try {
          const response = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/summary/student?` +
            `student_id=${student.id}&session=${encodeURIComponent(currentSession)}&term=${encodeURIComponent(currentTerm)}`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              }
            }
          );

          const data = await response.json();
          
          if (data.success && data.summary) {
            summaries[student.id] = data.summary;
            console.log(`[AttendanceMarking] Summary for ${student.first_name}:`, {
              percentage: data.summary.attendance_percentage,
              present: data.summary.days_present,
              total: data.summary.total_school_days,
              grade: data.summary.attendance_grade
            });
          } else if (data.error && data.error.includes('School calendar not configured')) {
            // Calendar not configured - this is a system-wide issue
            calendarNotConfigured = true;
            console.warn('[AttendanceMarking] School calendar not configured for', currentSession, currentTerm);
          } else {
            console.error(`[AttendanceMarking] Error response for student ${student.id}:`, data.error);
          }
        } catch (error) {
          console.error(`[AttendanceMarking] Network error fetching summary for student ${student.id}:`, error);
        }
      });

      await Promise.all(summaryPromises);
      setStudentSummaries(summaries);
      
      console.log('[AttendanceMarking] Loaded', Object.keys(summaries).length, 'student summaries');
      
      // Update calendar configured status
      setCalendarConfigured(!calendarNotConfigured || Object.keys(summaries).length > 0);
      
      // Show warning if calendar not configured
      if (calendarNotConfigured && Object.keys(summaries).length === 0) {
        toast.warning(
          `School calendar not configured for ${currentSession} - ${currentTerm}. ` +
          `Please ask IT Admin to set total school days in Settings → Attendance Settings.`,
          { duration: 8000 }
        );
      }
    } catch (error) {
      console.error('[AttendanceMarking] Error fetching student summaries:', error);
      toast.error('Failed to load attendance summaries. Please try refreshing the page.');
    } finally {
      setLoadingSummaries(false);
    }
  };

  const updateAttendanceStatus = (studentId: string, status: 'present' | 'absent' | 'late' | 'excused') => {
    setAttendance(prev => ({
      ...prev,
      [studentId]: {
        ...prev[studentId],
        status
      }
    }));
  };

  const handleSaveAttendance = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in to continue');
        setSaving(false);
        return;
      }

      // DETAILED VALIDATION WITH SPECIFIC ERROR MESSAGES
      console.log('[Attendance] PRE-SAVE VALIDATION:');
      console.log('- currentSession:', currentSession);
      console.log('- currentTerm:', currentTerm);
      console.log('- classInfo:', classInfo);
      console.log('- selectedDate:', selectedDate);
      console.log('- attendance object size:', Object.keys(attendance).length);

      if (!currentSession || currentSession.trim() === '') {
        console.error('[Attendance] VALIDATION FAILED: No session set');
        toast.error('❌ Session is not set. Please contact admin to set current session.');
        setSaving(false);
        return;
      }

      if (!currentTerm || currentTerm.trim() === '') {
        console.error('[Attendance] VALIDATION FAILED: No term set');
        toast.error('❌ Term is not set. Please contact admin to set current term.');
        setSaving(false);
        return;
      }

      if (!classInfo?.id) {
        console.error('[Attendance] VALIDATION FAILED: No class info');
        toast.error('❌ Class information not loaded. Please refresh the page.');
        setSaving(false);
        return;
      }

      if (!selectedDate) {
        console.error('[Attendance] VALIDATION FAILED: No date selected');
        toast.error('❌ Please select a date.');
        setSaving(false);
        return;
      }

      if (Object.keys(attendance).length === 0) {
        console.error('[Attendance] VALIDATION FAILED: No students marked');
        toast.error('❌ No attendance marked. Please mark at least one student.');
        setSaving(false);
        return;
      }

      // Convert attendance object to array format expected by backend
      // IMPORTANT: Backend expects 'studentId' (camelCase), not 'student_id'
      const records = Object.entries(attendance).map(([studentId, record]) => ({
        studentId: studentId, // camelCase to match backend
        status: record.status.charAt(0).toUpperCase() + record.status.slice(1), // Capitalize: Present, Absent, Late, Excused
        notes: record.notes || null
      }));

      if (records.length === 0) {
        console.error('[Attendance] VALIDATION FAILED: records array is empty');
        toast.error('❌ No attendance records to save.');
        setSaving(false);
        return;
      }

      // CRITICAL: Field names MUST match backend expectations exactly:
      // - classId (not class_id)
      // - weekNumber (not week_number)
      // - records (not attendance_records)
      const requestBody = {
        classId: classInfo.id,  // Backend expects 'classId'
        date: selectedDate,
        session: currentSession,
        term: currentTerm,
        weekNumber: weekNumber,  // Backend expects 'weekNumber'
        records: records  // Backend expects 'records'
      };

      console.log('[Attendance] ===== SAVING ATTENDANCE =====');
      console.log('[Attendance] ✅ VALIDATION PASSED');
      console.log('[Attendance] Session being saved:', `"${requestBody.session}"`);
      console.log('[Attendance] Term being saved:', `"${requestBody.term}"`);
      console.log('[Attendance] Request body to send:', JSON.stringify(requestBody, null, 2));
      console.log('[Attendance] Field check:', {
        has_classId: !!requestBody.classId,
        classId_value: requestBody.classId,
        has_date: !!requestBody.date,
        date_value: requestBody.date,
        has_session: !!requestBody.session,
        session_value: requestBody.session,
        session_type: typeof requestBody.session,
        has_term: !!requestBody.term,
        term_value: requestBody.term,
        term_type: typeof requestBody.term,
        has_weekNumber: !!requestBody.weekNumber,
        weekNumber_value: requestBody.weekNumber,
        has_records: !!requestBody.records,
        is_array: Array.isArray(requestBody.records),
        record_count: requestBody.records?.length || 0
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/mark`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        }
      );

      const data = await response.json();
      console.log('[Attendance] Save response:', data);
      
      if (data.success) {
        toast.success(`Attendance saved successfully for ${records.length} students`);
        
        // Refresh attendance data and student summaries
        await fetchExistingAttendance();
        
        // CRITICAL: Refresh student summaries to show updated attendance percentages
        console.log('[Attendance] Refreshing student summaries after save...');
        await fetchStudentSummaries();
        console.log('[Attendance] Student summaries refreshed');
      } else {
        console.error('[Attendance] Save failed:', data);
        toast.error(data.error || 'Failed to save attendance');
      }
    } catch (error) {
      console.error('Error saving attendance:', error);
      toast.error('Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const markAllPresent = () => {
    const updated = { ...attendance };
    Object.keys(updated).forEach(studentId => {
      updated[studentId].status = 'present';
    });
    setAttendance(updated);
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { color: string; icon: any }> = {
      present: { color: 'bg-green-100 text-green-800', icon: Check },
      absent: { color: 'bg-red-100 text-red-800', icon: X },
      late: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      excused: { color: 'bg-blue-100 text-blue-800', icon: FileText }
    };

    const variant = variants[status] || variants.present;
    const Icon = variant.icon;

    return (
      <Badge className={`${variant.color} border-0`}>
        <Icon className="w-3 h-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getSummary = () => {
    const records = Object.values(attendance);
    return {
      total: records.length,
      present: records.filter(r => r.status === 'present').length,
      absent: records.filter(r => r.status === 'absent').length,
      late: records.filter(r => r.status === 'late').length,
      excused: records.filter(r => r.status === 'excused').length
    };
  };

  const summary = getSummary();

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!classInfo) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertCircle className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <p className="text-slate-600">You are not assigned as a class teacher</p>
            <p className="text-sm text-slate-500 mt-2">Please contact the administrator</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-green-600 to-emerald-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <Calendar className="h-6 w-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl md:text-3xl font-bold">Mark Attendance</h2>
            <p className="text-green-100 text-sm md:text-base mt-1">
              {classInfo ? `${classInfo.name}${classInfo.sections?.name ? ` ${classInfo.sections.name}` : ''}` : 'Your Class'}
            </p>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-0">
        <div className="p-5 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Attendance Controls
          </h3>
        </div>
        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700">Date</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500"
                max={new Date().toISOString().split('T')[0]}
              />
            </div>
            <div>
              <label className="block text-sm mb-2 font-medium text-gray-700 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  Week Number
                  {!manualWeekEdit && (
                    <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                      <Lock className="w-3 h-3 mr-1" />
                      Auto
                    </Badge>
                  )}
                </span>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500">Manual Edit</span>
                  <Switch
                    checked={manualWeekEdit}
                    onCheckedChange={(checked) => {
                      setManualWeekEdit(checked);
                      if (!checked) {
                        // Re-calculate when switching back to auto
                        calculateWeekNumber();
                      }
                    }}
                  />
                </div>
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="1"
                  max="15"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(parseInt(e.target.value) || 1)}
                  readOnly={!manualWeekEdit}
                  className={`w-full px-3 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${
                    !manualWeekEdit ? 'bg-slate-50 cursor-not-allowed' : ''
                  }`}
                />
                {!manualWeekEdit && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Edit2 className="w-4 h-4" />
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {manualWeekEdit ? 'Manual mode: You can enter any week number' : 'Auto-calculated from term start date'}
              </p>
            </div>
            <div>
              <label className="block text-sm mb-2 flex items-center gap-2 font-medium text-gray-700">
                Session
                {!currentSession && (
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">Not Set</Badge>
                )}
              </label>
              <input
                type="text"
                value={currentSession || 'No session set'}
                readOnly
                className={`w-full px-3 py-2 border rounded-xl ${!currentSession ? 'bg-red-50 border-red-300' : 'bg-slate-50 border-gray-200'}`}
              />
            </div>
            <div>
              <label className="block text-sm mb-2 flex items-center gap-2 font-medium text-gray-700">
                Term
                {!currentTerm && (
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">Not Set</Badge>
                )}
              </label>
              <select
                value={currentTerm || ''}
                onChange={(e) => setCurrentTerm(e.target.value)}
                className={`w-full px-3 py-2 border rounded-xl focus:outline-none focus:ring-2 focus:ring-green-500 ${!currentTerm ? 'border-red-300' : 'border-gray-200'}`}
              >
                <option value="">Select Term</option>
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={markAllPresent} variant="outline" size="sm" className="rounded-xl">
              Mark All Present
            </Button>
          </div>
        </div>
      </div>

      {/* Attendance Calculation Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          <strong>How attendance % works:</strong> The "Total School Days" from admin settings is used as the denominator when calculating attendance percentages. 
          For example, if school opened 67 days and a student was present 64 days, their attendance is 64/67 = 95.5%. 
          {!calendarConfigured && (
            <span className="block mt-2 text-amber-700 font-medium">
              ⚠️ Calendar not configured for {currentSession} - {currentTerm}. IT Admin must set total school days in Settings → Attendance Settings.
            </span>
          )}
        </AlertDescription>
      </Alert>

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl">{summary.total}</div>
              <div className="text-sm text-slate-600">Total</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl text-green-600">{summary.present}</div>
              <div className="text-sm text-slate-600">Present</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl text-red-600">{summary.absent}</div>
              <div className="text-sm text-slate-600">Absent</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl text-yellow-600">{summary.late}</div>
              <div className="text-sm text-slate-600">Late</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-2xl text-blue-600">{summary.excused}</div>
              <div className="text-sm text-slate-600">Excused</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Student List */}
      <Card>
        <CardHeader>
          <CardTitle>Student Attendance</CardTitle>
          <CardDescription>
            {students.length} students in your class
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 w-12">#</th>
                  <th className="text-left py-3 px-4 min-w-[200px]">Student Name</th>
                  <th className="text-center py-3 px-4 min-w-[140px]">Attendance %</th>
                  <th className="text-center py-3 px-4 min-w-[100px]">Status</th>
                  <th className="text-center py-3 px-4 min-w-[200px]">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student, index) => {
                  const record = attendance[student.id];
                  const summary = studentSummaries[student.id];
                  return (
                    <tr key={student.id} className={`border-b hover:bg-slate-50 ${summary?.flagged ? 'bg-amber-50/50' : ''}`}>
                      <td className="py-3 px-4">{index + 1}</td>
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium flex items-center gap-2">
                            {student.first_name} {student.middle_name || ''} {student.last_name}
                            {summary?.flagged && (
                              <Badge className="bg-amber-500 text-white text-[10px] px-1.5 py-0">
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Low
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-slate-500">{student.email}</div>
                        </div>
                      </td>
                      <td className="py-3 px-4 min-w-[140px]">
                        {loadingSummaries ? (
                          <div className="flex items-center justify-center">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                          </div>
                        ) : summary ? (
                          <div className="text-center">
                            <div className={`text-lg font-bold ${
                              summary.attendance_percentage >= 95 ? 'text-green-600' :
                              summary.attendance_percentage >= 85 ? 'text-blue-600' :
                              summary.attendance_percentage >= 75 ? 'text-yellow-600' :
                              'text-red-600'
                            }`}>
                              {summary.attendance_percentage}%
                            </div>
                            <div className="text-xs text-slate-500">
                              {summary.days_present}/{summary.total_school_days} days
                            </div>
                            <Badge className={`text-[10px] mt-1 ${
                              summary.attendance_percentage >= 95 ? 'bg-green-100 text-green-800' :
                              summary.attendance_percentage >= 85 ? 'bg-blue-100 text-blue-800' :
                              summary.attendance_percentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                              {summary.attendance_grade}
                            </Badge>
                          </div>
                        ) : (
                          <div className="text-center text-xs text-slate-400">
                            <div>-</div>
                            <div className="text-[10px] mt-1">No data yet</div>
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center min-w-[100px]">
                        {getStatusBadge(record?.status || 'present')}
                      </td>
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="flex justify-center gap-1 whitespace-nowrap">
                          <Button
                            size="sm"
                            variant={record?.status === 'present' ? 'default' : 'outline'}
                            onClick={() => updateAttendanceStatus(student.id, 'present')}
                            className="h-8 px-2"
                            title="Present"
                          >
                            <Check className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'absent' ? 'default' : 'outline'}
                            onClick={() => updateAttendanceStatus(student.id, 'absent')}
                            className="h-8 px-2"
                            title="Absent"
                          >
                            <X className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'late' ? 'default' : 'outline'}
                            onClick={() => updateAttendanceStatus(student.id, 'late')}
                            className="h-8 px-2"
                            title="Late"
                          >
                            <Clock className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant={record?.status === 'excused' ? 'default' : 'outline'}
                            onClick={() => updateAttendanceStatus(student.id, 'excused')}
                            className="h-8 px-2"
                            title="Excused"
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="mt-6 flex justify-end">
            <Button onClick={handleSaveAttendance} disabled={saving} size="lg">
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Attendance
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}