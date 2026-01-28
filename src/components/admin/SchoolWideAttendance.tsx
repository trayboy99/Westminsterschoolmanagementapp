import { useState, useEffect } from 'react';
import { Calendar } from '../ui/calendar';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { 
  CalendarDays, 
  Users, 
  UserCheck, 
  UserX, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  TrendingUp, 
  School,
  AlertCircle 
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { WeekBadge } from '../shared/WeekBadge';

interface SchoolWideAttendanceProps {
  selectedSession: string;
  selectedTerm: string;
}

interface AttendanceSummary {
  total_active_students?: number;
  total_students_marked: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percentage: number;
}

interface ClassSummary {
  className: string;
  total: number;
  present: number;
  absent: number;
  late: number;
  excused: number;
  attendance_percentage: string;
}

export function SchoolWideAttendance({ selectedSession, selectedTerm }: SchoolWideAttendanceProps) {
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [classSummary, setClassSummary] = useState<ClassSummary[]>([]);
  const [totalActiveStudents, setTotalActiveStudents] = useState(0);
  
  const supabase = createClient();

  useEffect(() => {
    fetchTotalActiveStudents();
  }, []);

  useEffect(() => {
    if (selectedDate && selectedSession && selectedTerm) {
      fetchSchoolWideAttendance();
    }
  }, [selectedDate, selectedSession, selectedTerm]);

  const fetchTotalActiveStudents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users?role=student`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success && result.users) {
        setTotalActiveStudents(result.users.length);
      }
    } catch (error) {
      console.error('Error fetching total active students:', error);
    }
  };

  const fetchSchoolWideAttendance = async () => {
    try {
      setLoading(true);
      // Clear previous data immediately when fetching new date
      setSummary(null);
      setClassSummary([]);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      // Format date in local timezone, not UTC
      const year = selectedDate.getFullYear();
      const month = String(selectedDate.getMonth() + 1).padStart(2, '0');
      const day = String(selectedDate.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;
      
      console.log('[SchoolWideAttendance] Fetching for date:', dateStr);
      
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/school-wide?` +
        `date=${dateStr}&session=${encodeURIComponent(selectedSession)}&term=${encodeURIComponent(selectedTerm)}`,
        { 
          headers,
          cache: 'no-store' // Prevent browser caching
        }
      );

      const result = await res.json();
      
      console.log('[SchoolWideAttendance] Response for', dateStr, ':', result);
      console.log('[SchoolWideAttendance] Summary data:', result.data?.summary);
      console.log('[SchoolWideAttendance] Attendance %:', result.data?.summary?.attendance_percentage);
      
      if (result.success) {
        setSummary(result.data.summary);
        setClassSummary(result.data.by_class);
      } else {
        console.error('Error fetching school-wide attendance:', result.error);
        // Don't show error toast if no data - might be a day with no attendance
        setSummary(null);
        setClassSummary([]);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to fetch school-wide attendance');
      setSummary(null);
      setClassSummary([]);
    } finally {
      setLoading(false);
    }
  };

  const getAttendanceGrade = (percentage: number) => {
    if (percentage >= 95) return { grade: 'Excellent', color: 'text-green-700 bg-green-100' };
    if (percentage >= 85) return { grade: 'Very Good', color: 'text-blue-700 bg-blue-100' };
    if (percentage >= 75) return { grade: 'Good', color: 'text-yellow-700 bg-yellow-100' };
    if (percentage >= 60) return { grade: 'Fair', color: 'text-orange-700 bg-orange-100' };
    return { grade: 'Poor', color: 'text-red-700 bg-red-100' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
              <School className="h-6 w-6 text-blue-600" />
              Total Students Count in School: {totalActiveStudents.toLocaleString()} Students
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              View aggregated attendance data across all classes for {selectedSession} • {selectedTerm}
            </p>
          </div>
          <WeekBadge variant="detailed" />
        </div>
        {/* Students Present Today Summary */}
        {summary && summary.present > 0 && (
          <div className="mt-2 inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-2">
            <UserCheck className="h-4 w-4 text-green-600" />
            <p className="text-sm font-semibold text-green-800">
              {summary.present} students out of {totalActiveStudents} are present today
            </p>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Calendar */}
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="h-4 w-4" />
              Select Date
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md border"
            />
            <div className="mt-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-xs font-medium text-blue-900">Selected Date</p>
              <p className="text-sm text-blue-700 font-semibold mt-1">
                {selectedDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Summary Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Daily Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex items-center justify-center h-48">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              </div>
            ) : summary ? (
              <div className="space-y-6">
                {/* Main Stats Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {/* Total Students */}
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-lg border-2 border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Users className="h-5 w-5 text-blue-600" />
                      <p className="text-xs font-medium text-blue-900">Total Marked</p>
                    </div>
                    <p className="text-3xl font-bold text-blue-900">{summary.total_students_marked}</p>
                  </div>

                  {/* Present */}
                  <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-lg border-2 border-green-200">
                    <div className="flex items-center gap-2 mb-2">
                      <UserCheck className="h-5 w-5 text-green-600" />
                      <p className="text-xs font-medium text-green-900">Present</p>
                    </div>
                    <p className="text-3xl font-bold text-green-900">{summary.present}</p>
                    <p className="text-xs text-green-700 mt-1">
                      {summary.total_students_marked > 0 
                        ? ((summary.present / summary.total_students_marked) * 100).toFixed(1)
                        : '0'}%
                    </p>
                  </div>

                  {/* Absent */}
                  <div className="bg-gradient-to-br from-red-50 to-red-100 p-4 rounded-lg border-2 border-red-200">
                    <div className="flex items-center gap-2 mb-2">
                      <UserX className="h-5 w-5 text-red-600" />
                      <p className="text-xs font-medium text-red-900">Absent</p>
                    </div>
                    <p className="text-3xl font-bold text-red-900">{summary.absent}</p>
                    <p className="text-xs text-red-700 mt-1">
                      {summary.total_students_marked > 0 
                        ? ((summary.absent / summary.total_students_marked) * 100).toFixed(1)
                        : '0'}%
                    </p>
                  </div>

                  {/* Late */}
                  {summary.late > 0 && (
                    <div className="bg-gradient-to-br from-orange-50 to-orange-100 p-4 rounded-lg border-2 border-orange-200">
                      <div className="flex items-center gap-2 mb-2">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <p className="text-xs font-medium text-orange-900">Late</p>
                      </div>
                      <p className="text-3xl font-bold text-orange-900">{summary.late}</p>
                    </div>
                  )}

                  {/* Excused */}
                  {summary.excused > 0 && (
                    <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-lg border-2 border-purple-200">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="h-5 w-5 text-purple-600" />
                        <p className="text-xs font-medium text-purple-900">Excused</p>
                      </div>
                      <p className="text-3xl font-bold text-purple-900">{summary.excused}</p>
                    </div>
                  )}
                </div>

                {/* Attendance Percentage */}
                <div className="bg-gradient-to-br from-indigo-50 to-indigo-100 p-6 rounded-lg border-2 border-indigo-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-indigo-900 mb-1">Overall Attendance Rate</p>
                      <p className="text-5xl font-bold text-indigo-900">{summary.attendance_percentage.toFixed(1)}%</p>
                    </div>
                    <Badge className={`${getAttendanceGrade(summary.attendance_percentage).color} text-base px-4 py-2`}>
                      {getAttendanceGrade(summary.attendance_percentage).grade}
                    </Badge>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-48 text-center">
                <AlertCircle className="h-12 w-12 text-slate-400 mb-3" />
                <p className="text-slate-600 font-medium">No attendance data for this date</p>
                <p className="text-sm text-slate-500 mt-1">Teachers may not have marked attendance yet</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Class Breakdown */}
      {classSummary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Attendance by Class
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b-2 border-slate-200">
                    <th className="text-left p-3 text-sm font-semibold text-slate-700">Class</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Total</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Present</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Absent</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Late</th>
                    {classSummary.some(c => c.excused > 0) && (
                      <th className="text-center p-3 text-sm font-semibold text-slate-700">Excused</th>
                    )}
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Attendance %</th>
                    <th className="text-center p-3 text-sm font-semibold text-slate-700">Grade</th>
                  </tr>
                </thead>
                <tbody>
                  {classSummary.map((cls, index) => {
                    const percentage = parseFloat(cls.attendance_percentage);
                    const gradeInfo = getAttendanceGrade(percentage);
                    
                    return (
                      <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                        <td className="p-3 font-medium text-slate-900">{cls.className}</td>
                        <td className="p-3 text-center text-slate-700">{cls.total}</td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-green-700">
                            <CheckCircle2 className="h-4 w-4" />
                            {cls.present}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-red-700">
                            <XCircle className="h-4 w-4" />
                            {cls.absent}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 text-orange-700">
                            <Clock className="h-4 w-4" />
                            {cls.late}
                          </span>
                        </td>
                        {classSummary.some(c => c.excused > 0) && (
                          <td className="p-3 text-center text-purple-700">{cls.excused}</td>
                        )}
                        <td className="p-3 text-center font-bold text-slate-900">{percentage.toFixed(1)}%</td>
                        <td className="p-3 text-center">
                          <Badge className={gradeInfo.color}>
                            {gradeInfo.grade}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}