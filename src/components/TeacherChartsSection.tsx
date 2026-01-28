import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, ClipboardCheck, Trophy } from 'lucide-react';
import { Badge } from './ui/badge';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

// Color palette for student rankings - vibrant and distinguishable colors
const STUDENT_COLORS = [
  '#fbbf24', // Gold (1st place)
  '#94a3b8', // Silver (2nd place)
  '#c2410c', // Bronze (3rd place)
  '#8b5cf6', // Purple (4th)
  '#3b82f6', // Blue (5th)
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
];

export function TeacherChartsSection() {
  const [loading, setLoading] = useState(true);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [topStudents, setTopStudents] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Check if teacher is a class teacher
      const classTeacherRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-class-info`,
        { headers }
      );
      const classTeacherData = await classTeacherRes.json();

      if (classTeacherData.success && classTeacherData.isClassTeacher) {
        setIsClassTeacher(true);

        // Fetch students in the assigned class with complete profiles from KV store
        if (classTeacherData.assignedClass?.class_id) {
          const studentsRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students-with-profiles?class_id=${classTeacherData.assignedClass.class_id}`,
            { headers }
          );
          const studentsData = await studentsRes.json();

          if (studentsData.success && studentsData.students) {
            const students = studentsData.students;

            // Gender breakdown
            const maleCount = students.filter((s: any) => s.gender?.toLowerCase() === 'male').length;
            const femaleCount = students.filter((s: any) => s.gender?.toLowerCase() === 'female').length;

            setGenderData([
              { name: 'Male', students: maleCount, fill: '#3b82f6' },
              { name: 'Female', students: femaleCount, fill: '#ec4899' }
            ]);

            // Fetch attendance data for the class
            const currentSession = await getCurrentSession(headers);
            const currentTerm = await getCurrentTerm(headers);

            if (currentSession && currentTerm) {
              const attendanceRes = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/summary/class?` +
                `class_id=${classTeacherData.assignedClass.class_id}&session=${encodeURIComponent(currentSession)}&term=${encodeURIComponent(currentTerm)}`,
                { headers }
              );
              const attendanceDataRes = await attendanceRes.json();

              if (attendanceDataRes.success && attendanceDataRes.summary) {
                // Create attendance chart data
                const summary = attendanceDataRes.summary;
                setAttendanceData([
                  { name: 'Present', count: summary.total_present || 0, fill: '#10b981' },
                  { name: 'Absent', count: summary.total_absent || 0, fill: '#ef4444' },
                  { name: 'Late', count: summary.total_late || 0, fill: '#f59e0b' }
                ]);
              }
            }
          }
        }
      }

      // Fetch top students for subjects taught by this teacher
      await fetchTopStudents(headers);

    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  const getCurrentSession = async (headers: any) => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const data = await res.json();
      if (data.success && data.sessions) {
        const current = data.sessions.find((s: any) => s.is_current);
        return current?.session_name || null;
      }
    } catch (error) {
      return null;
    }
  };

  const getCurrentTerm = async (headers: any) => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const data = await res.json();
      if (data.success && data.terms) {
        const current = data.terms.find((t: any) => t.is_current);
        return current?.term_name || null;
      }
    } catch (error) {
      return null;
    }
  };

  const fetchTopStudents = async (headers: any) => {
    try {
      // Fetch subjects taught by this teacher
      const subjectsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-subjects`,
        { headers }
      );
      const subjectsData = await subjectsRes.json();

      if (subjectsData.success && subjectsData.subjects && subjectsData.subjects.length > 0) {
        const currentSession = await getCurrentSession(headers);
        const currentTerm = await getCurrentTerm(headers);

        if (!currentSession || !currentTerm) return;

        // Get current active exam
        const examsRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams?session=${encodeURIComponent(currentSession)}`,
          { headers }
        );
        const examsData = await examsRes.json();

        if (examsData.success && examsData.exams && examsData.exams.length > 0) {
          const currentExam = examsData.exams.find((e: any) => e.term === currentTerm && e.status === 'active') || examsData.exams[0];

          // Fetch marks for each subject taught
          const topStudentsList: any[] = [];

          for (const subject of subjectsData.subjects) {
            const marksRes = await fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks?` +
              `session=${encodeURIComponent(currentSession)}&term=${encodeURIComponent(currentTerm)}&` +
              `exam=${encodeURIComponent(currentExam.exam_name)}&subject_id=${subject.subject_id}&class_id=${subject.class_id}`,
              { headers }
            );
            const marksData = await marksRes.json();

            if (marksData.success && marksData.marks && marksData.marks.length > 0) {
              // Find student with highest total
              const topStudent = marksData.marks.reduce((prev: any, current: any) => {
                const prevTotal = (prev.ca1 || 0) + (prev.ca2 || 0) + (prev.exam || 0);
                const currentTotal = (current.ca1 || 0) + (current.ca2 || 0) + (current.exam || 0);
                return currentTotal > prevTotal ? current : prev;
              });

              topStudentsList.push({
                student_name: topStudent.student_name || 'Unknown',
                subject_name: subject.subject_name || 'Unknown Subject',
                class_name: subject.class_name || 'Unknown Class',
                total: (topStudent.ca1 || 0) + (topStudent.ca2 || 0) + (topStudent.exam || 0)
              });
            }
          }

          // Sort by total and take top 5
          topStudentsList.sort((a, b) => b.total - a.total);
          setTopStudents(topStudentsList.slice(0, 5));
        }
      }
    } catch (error) {
      // Error handled silently
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {isClassTeacher && genderData.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
          {/* Gender Distribution for My Class */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                My Class - Gender Distribution
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={genderData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="students" fill="#3b82f6" radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 flex justify-center gap-6 text-sm">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                  <span className="text-slate-600">Male: <span className="font-bold">{genderData[0]?.students || 0}</span></span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-pink-500"></div>
                  <span className="text-slate-600">Female: <span className="font-bold">{genderData[1]?.students || 0}</span></span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Attendance Overview */}
          {attendanceData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5 text-green-600" />
                  My Class - Attendance Overview
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="count" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="mt-4 flex justify-center gap-4 text-xs flex-wrap">
                  {attendanceData.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="h-3 w-3 rounded-full" style={{ backgroundColor: item.fill }}></div>
                      <span className="text-slate-600">{item.name}: <span className="font-bold">{item.count}</span></span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      {/* Top Students by Subject */}
      {topStudents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5 text-yellow-600" />
              Top Performing Students by Subject
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topStudents.map((student, idx) => {
                const color = STUDENT_COLORS[idx % STUDENT_COLORS.length];
                const rankLabel = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `#${idx + 1}`;
                
                return (
                  <div 
                    key={idx} 
                    className="flex items-center justify-between p-3 rounded-lg border-2 transition-all hover:shadow-md"
                    style={{ 
                      borderColor: color,
                      backgroundColor: `${color}15` // 15% opacity
                    }}
                  >
                    <div className="flex items-center gap-3">
                      <Badge 
                        className="text-lg px-3 py-1 text-white" 
                        style={{ backgroundColor: color }}
                      >
                        {rankLabel}
                      </Badge>
                      <div>
                        <p className="font-medium text-slate-900">{student.student_name}</p>
                        <p className="text-xs text-slate-600">{student.subject_name} • {student.class_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold" style={{ color }}>{student.total}</p>
                      <p className="text-xs text-slate-500">Total Score</p>
                    </div>
                  </div>
                );
              })}
            </div>
            {topStudents.length === 0 && (
              <p className="text-sm text-slate-500 text-center py-8">
                No marks data available yet. Start entering marks to see top performers!
              </p>
            )}
          </CardContent>
        </Card>
      )}

      {!isClassTeacher && topStudents.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center">
            <p className="text-slate-500">
              Charts and analytics will appear here once you're assigned as a class teacher or have entered marks for your subjects.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
