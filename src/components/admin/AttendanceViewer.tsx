import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Alert, AlertDescription } from '../ui/alert';
import { Calendar, Download, Filter, Users, TrendingUp, Info } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface AttendanceViewerProps {
  userRole: string;
}

export function AttendanceViewer({ userRole }: AttendanceViewerProps) {
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [stats, setStats] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchClasses();
    fetchActiveSessionAndTerm();
  }, []);

  // Debug: Log state changes
  useEffect(() => {
    console.log('[AttendanceViewer] ===== STATE UPDATE =====');
    console.log('[AttendanceViewer] selectedSession value:', selectedSession);
    console.log('[AttendanceViewer] sessions array:', sessions);
    console.log('[AttendanceViewer] sessions array length:', sessions.length);
    
    if (sessions.length > 0) {
      console.log('[AttendanceViewer] Available session values:', sessions.map(s => s.session_name));
      const matchFound = sessions.find(s => s.session_name === selectedSession);
      if (selectedSession && !matchFound) {
        console.error('[AttendanceViewer] ❌ MISMATCH: selectedSession value does not match any option!');
        console.error('[AttendanceViewer] Looking for:', selectedSession);
        console.error('[AttendanceViewer] Available:', sessions.map(s => s.session_name));
      } else if (matchFound) {
        console.log('[AttendanceViewer] ✅ MATCH FOUND: Selected session exists in options');
      }
    }
  }, [selectedSession, sessions]);

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success && data.classes) {
        setClasses(data.classes);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const fetchActiveSessionAndTerm = async () => {
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
      console.log('[AttendanceViewer] ===== SESSION SETTINGS DEBUG =====');
      console.log('[AttendanceViewer] Full response:', JSON.stringify(data, null, 2));
      console.log('[AttendanceViewer] data.success:', data.success);
      console.log('[AttendanceViewer] data.sessions:', data.sessions);
      console.log('[AttendanceViewer] data.sessions length:', data.sessions?.length);
      console.log('[AttendanceViewer] data.terms:', data.terms);
      
      if (data.success) {
        // Find the current session and term marked by admin FIRST
        const activeSession = data.sessions?.find((s: any) => s.is_current);
        const activeTerm = data.terms?.find((t: any) => t.is_current);
        
        console.log('[AttendanceViewer] Active session search result:', activeSession);
        console.log('[AttendanceViewer] Active term search result:', activeTerm);
        
        // Set sessions array for dropdown options
        if (data.sessions && data.sessions.length > 0) {
          console.log('[AttendanceViewer] Setting sessions array with', data.sessions.length, 'sessions');
          setSessions(data.sessions);
          
          // Set selected session if we found an active one
          if (activeSession?.session_name) {
            console.log('[AttendanceViewer] ✅ Setting selectedSession state to:', activeSession.session_name);
            setSelectedSession(activeSession.session_name);
          } else {
            console.warn('[AttendanceViewer] ⚠️ No active session found!');
            console.warn('[AttendanceViewer] ⚠️ All sessions:', data.sessions);
          }
        } else {
          console.error('[AttendanceViewer] ❌ CRITICAL: No sessions in KV store!');
          console.error('[AttendanceViewer] ❌ Please go to Settings → Session Settings and add sessions first!');
          toast.error('No academic sessions configured. Please add sessions in Settings first.');
          setSessions([]);
        }
        
        // Set selected term
        if (activeTerm?.term_name) {
          setSelectedTerm(activeTerm.term_name);
          console.log('[AttendanceViewer] ✅ Set term to:', activeTerm.term_name);
        } else {
          // Default to First Term if none is set
          console.warn('[AttendanceViewer] ⚠️ No active term found. Using default First Term.');
        }
      } else {
        console.error('[AttendanceViewer] Failed to fetch session settings:', data.error);
        toast.error('Failed to load session settings');
      }
    } catch (error) {
      console.error('[AttendanceViewer] Error fetching active session/term:', error);
      toast.error('Failed to load session settings');
    }
  };

  const fetchAttendanceStats = async () => {
    if (!selectedClass || !selectedSession || !selectedTerm) {
      toast.error('Please select class, session, and term');
      return;
    }

    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      console.log('[AttendanceViewer] ===== FETCHING ATTENDANCE =====');
      console.log('[AttendanceViewer] Query Parameters:', {
        class_id: selectedClass,
        session: selectedSession,
        term: selectedTerm
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/class-stats?class_id=${selectedClass}&session=${encodeURIComponent(selectedSession)}&term=${encodeURIComponent(selectedTerm)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[AttendanceViewer] ===== API RESPONSE =====');
      console.log('[AttendanceViewer] Full response:', data);
      console.log('[AttendanceViewer] Stats count:', data.stats?.length);
      console.log('[AttendanceViewer] Raw attendance count:', data.rawAttendance?.length);
      
      if (data.diagnostics) {
        console.log('[AttendanceViewer] ===== DIAGNOSTICS =====');
        console.log('[AttendanceViewer] Query params sent:', data.diagnostics.queryParams);
        console.log('[AttendanceViewer] Records found:', data.diagnostics.recordsFound);
        console.log('[AttendanceViewer] All sessions in DB:', data.diagnostics.allSessionsInDb);
        console.log('[AttendanceViewer] All terms in DB:', data.diagnostics.allTermsInDb);
        
        // Check for mismatches
        const sessionInDb = data.diagnostics.allSessionsInDb.includes(selectedSession);
        const termInDb = data.diagnostics.allTermsInDb.includes(selectedTerm);
        
        if (!sessionInDb && data.diagnostics.allSessionsInDb.length > 0) {
          console.error('[AttendanceViewer] ❌❌❌ SESSION MISMATCH DETECTED! ❌❌❌');
          console.error('[AttendanceViewer] You selected:', selectedSession);
          console.error('[AttendanceViewer] But database has:', data.diagnostics.allSessionsInDb);
          toast.error(`Session mismatch! Database has: ${data.diagnostics.allSessionsInDb.join(', ')}`);
        }
        
        if (!termInDb && data.diagnostics.allTermsInDb.length > 0) {
          console.error('[AttendanceViewer] ❌❌❌ TERM MISMATCH DETECTED! ❌❌❌');
          console.error('[AttendanceViewer] You selected:', selectedTerm);
          console.error('[AttendanceViewer] But database has:', data.diagnostics.allTermsInDb);
          toast.error(`Term mismatch! Database has: ${data.diagnostics.allTermsInDb.join(', ')}`);
        }
      }
      
      if (data.rawAttendance && data.rawAttendance.length > 0) {
        console.log('[AttendanceViewer] Sample attendance record:', data.rawAttendance[0]);
      }
      
      if (data.success) {
        setStats(data.stats || []);
        setShowResults(true);
        
        if (data.stats?.length === 0 && data.diagnostics?.allSessionsInDb?.length > 0) {
          console.error('[AttendanceViewer] ⚠️ WARNING: No matching records found but attendance exists in DB!');
          toast.warning(`No attendance found for selected session/term. Try: ${data.diagnostics.allSessionsInDb[0]}`);
        }
        
        // Success message with school calendar info
        if (data.totalSchoolDays) {
          console.log('[AttendanceViewer] ✅ Using school calendar:', data.totalSchoolDays, 'total school days');
          toast.success(`Loaded attendance for ${data.stats?.length || 0} students (${data.totalSchoolDays} school days configured)`);
        }
      } else {
        // Check if it's a calendar configuration error
        if (data.error?.includes('School calendar not configured')) {
          toast.error(data.error, { duration: 8000 });
        } else {
          toast.error(data.error || 'Failed to fetch attendance statistics');
        }
      }
    } catch (error) {
      console.error('Error fetching attendance stats:', error);
      toast.error('Failed to fetch attendance statistics');
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceRating = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'bg-green-100 text-green-800' };
    if (percentage >= 80) return { text: 'Good', color: 'bg-blue-100 text-blue-800' };
    if (percentage >= 70) return { text: 'Fair', color: 'bg-yellow-100 text-yellow-800' };
    return { text: 'Poor', color: 'bg-red-100 text-red-800' };
  };

  const calculateClassAverage = () => {
    if (stats.length === 0) return 0;
    const totalPercentage = stats.reduce((sum, s) => sum + s.percentage, 0);
    return Math.round(totalPercentage / stats.length);
  };

  const exportToCSV = () => {
    if (stats.length === 0) {
      toast.error('No data to export');
      return;
    }

    const headers = ['Student Name', 'Total School Days', 'Present', 'Absent', 'Late', 'Excused', 'Percentage'];
    const rows = stats.map(s => [
      s.studentName,
      s.totalDays,
      s.present,
      s.absent,
      s.late,
      s.excused,
      `${s.percentage}%`
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    
    const className = classes.find(c => c.id === selectedClass)?.name || 'class';
    a.download = `attendance-${className}-${selectedSession}-${selectedTerm}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Attendance report exported');
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div>
        <h2 className="text-2xl md:text-3xl">Attendance Management</h2>
        <p className="text-slate-600 mt-1 text-sm md:text-base">
          View and analyze student attendance by class, session, and term
        </p>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="w-5 h-5" />
            Select Class and Term
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm mb-2">Class</label>
              <select
                value={selectedClass}
                onChange={(e) => setSelectedClass(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg"
              >
                <option value="">Select Class</option>
                {classes.map(cls => (
                  <option key={cls.id} value={cls.id}>
                    {cls.display_name || cls.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2 flex items-center gap-2">
                Session
                {selectedSession && (
                  <Badge className="bg-green-100 text-green-800 border-0 text-xs">Auto-loaded</Badge>
                )}
                {!selectedSession && sessions.length > 0 && (
                  <Badge className="bg-yellow-100 text-yellow-800 border-0 text-xs">Please Select</Badge>
                )}
                {sessions.length === 0 && (
                  <Badge className="bg-red-100 text-red-800 border-0 text-xs">Not Configured</Badge>
                )}
              </label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${selectedSession ? 'border-green-300 bg-green-50' : sessions.length === 0 ? 'border-red-300 bg-red-50' : ''}`}
                disabled={sessions.length === 0}
              >
                <option value="">{sessions.length === 0 ? 'No sessions configured - Go to Settings' : 'Select Session'}</option>
                {sessions.map((session, index) => (
                  <option key={session.id || index} value={session.session_name}>
                    {session.session_name} {session.is_current ? '(Current)' : ''}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm mb-2 flex items-center gap-2">
                Term
                {selectedTerm && (
                  <Badge className="bg-green-100 text-green-800 border-0 text-xs">Auto-loaded</Badge>
                )}
              </label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className={`w-full px-3 py-2 border rounded-lg ${selectedTerm ? 'border-green-300 bg-green-50' : ''}`}
              >
                <option value="First Term">First Term</option>
                <option value="Second Term">Second Term</option>
                <option value="Third Term">Third Term</option>
              </select>
            </div>
          </div>

          <Button onClick={fetchAttendanceStats} disabled={loading} className="w-full md:w-auto">
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Loading...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                View Attendance
              </>
            )}
          </Button>
        </CardContent>
      </Card>

      {/* Attendance Calculation Info */}
      <Alert className="border-blue-200 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-sm">
          <strong>How attendance percentage works:</strong> The system uses "Total School Days" from 
          Attendance Settings as the denominator when calculating percentages. For example, if school 
          opened 67 days and a student was present 64 days, their attendance is 64/67 = 95.5%. 
          This ensures accurate attendance tracking regardless of how many days have been marked.
        </AlertDescription>
      </Alert>

      {/* Results */}
      {showResults && (
        <>
          {/* Class Summary */}
          {stats.length > 0 && (
            <Card className="border-2 border-blue-200 bg-blue-50">
              <CardContent className="pt-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <Users className="w-12 h-12 text-blue-600" />
                    <div>
                      <div className="text-2xl font-bold text-blue-900">
                        {calculateClassAverage()}%
                      </div>
                      <div className="text-sm text-blue-700">Class Average Attendance</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-blue-900">{stats.length}</div>
                    <div className="text-sm text-blue-700">Total Students</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Student Statistics */}
          <Card>
            <CardHeader>
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <CardTitle>Student Attendance Records</CardTitle>
                  <CardDescription>
                    {stats.length} students in {classes.find(c => c.id === selectedClass)?.name || 'class'}
                  </CardDescription>
                </div>
                <Button onClick={exportToCSV} variant="outline" disabled={stats.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Export CSV
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="space-y-2">
                  {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
                </div>
              ) : stats.length === 0 ? (
                <div className="text-center py-8">
                  <Calendar className="w-12 h-12 mx-auto text-slate-400 mb-4" />
                  <p className="text-slate-600">No attendance records found</p>
                  <p className="text-sm text-slate-500 mt-2">
                    The class teacher needs to mark attendance
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-3 px-4">#</th>
                        <th className="text-left py-3 px-4">Student Name</th>
                        <th className="text-center py-3 px-4">School Days</th>
                        <th className="text-center py-3 px-4">Present</th>
                        <th className="text-center py-3 px-4">Absent</th>
                        <th className="text-center py-3 px-4">Late</th>
                        <th className="text-center py-3 px-4">Excused</th>
                        <th className="text-center py-3 px-4">Percentage</th>
                        <th className="text-center py-3 px-4">Rating</th>
                      </tr>
                    </thead>
                    <tbody>
                      {stats.map((student, index) => {
                        const rating = getAttendanceRating(student.percentage);
                        return (
                          <tr key={student.studentId} className="border-b hover:bg-slate-50">
                            <td className="py-3 px-4">{index + 1}</td>
                            <td className="py-3 px-4 font-medium">{student.studentName}</td>
                            <td className="py-3 px-4 text-center font-medium text-slate-700">{student.totalDays}</td>
                            <td className="py-3 px-4 text-center text-green-600 font-medium">
                              {student.present}
                            </td>
                            <td className="py-3 px-4 text-center text-red-600 font-medium">
                              {student.absent}
                            </td>
                            <td className="py-3 px-4 text-center text-yellow-600 font-medium">
                              {student.late}
                            </td>
                            <td className="py-3 px-4 text-center text-blue-600 font-medium">
                              {student.excused}
                            </td>
                            <td className="py-3 px-4 text-center">
                              <div className="font-bold">{student.percentage}%</div>
                              <div className="text-xs text-slate-500">{student.present}/{student.totalDays}</div>
                            </td>
                            <td className="py-3 px-4 text-center">
                              <Badge className={`${rating.color} border-0`}>
                                {rating.text}
                              </Badge>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Distribution Summary */}
          {stats.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <Card className="bg-green-50 border-green-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-green-600">
                          {stats.filter(s => s.percentage >= 90).length}
                        </div>
                        <div className="text-sm text-slate-600">Excellent (90%+)</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-blue-600">
                          {stats.filter(s => s.percentage >= 80 && s.percentage < 90).length}
                        </div>
                        <div className="text-sm text-slate-600">Good (80-89%)</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-yellow-50 border-yellow-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-yellow-600">
                          {stats.filter(s => s.percentage >= 70 && s.percentage < 80).length}
                        </div>
                        <div className="text-sm text-slate-600">Fair (70-79%)</div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="bg-red-50 border-red-200">
                    <CardContent className="pt-6">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-red-600">
                          {stats.filter(s => s.percentage < 70).length}
                        </div>
                        <div className="text-sm text-slate-600">Poor (&lt;70%)</div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
