import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Calendar, Check, X, Clock, FileText, TrendingUp, AlertCircle } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface AttendanceOverviewProps {
  userProfile: {
    id: string;
    first_name: string;
    last_name: string;
  };
}

export function AttendanceOverview({ userProfile }: AttendanceOverviewProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<any>(null);
  const [currentSession, setCurrentSession] = useState('');
  const [currentTerm, setCurrentTerm] = useState('First Term');

  const supabase = createClient();

  useEffect(() => {
    fetchActiveSessionTerm();
  }, []);

  useEffect(() => {
    if (currentSession && currentTerm) {
      fetchAttendanceSummary();
    }
  }, [currentSession, currentTerm]);

  const fetchActiveSessionTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Use the session-settings endpoint which returns both sessions and terms
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
      console.log('[Student Attendance] Session settings response:', data);
      
      if (data.success) {
        // Find current session
        if (data.sessions) {
          const activeSessions = data.sessions.filter((s: any) => s.is_current);
          console.log('[Student Attendance] Active sessions:', activeSessions);
          if (activeSessions.length > 0) {
            setCurrentSession(activeSessions[0].session_name);
            console.log('[Student Attendance] Set current session:', activeSessions[0].session_name);
          }
        }
        
        // Find current term
        if (data.terms) {
          const activeTerms = data.terms.filter((t: any) => t.is_current);
          console.log('[Student Attendance] Active terms:', activeTerms);
          if (activeTerms.length > 0) {
            setCurrentTerm(activeTerms[0].term_name);
            console.log('[Student Attendance] Set current term:', activeTerms[0].term_name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching active session/term:', error);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Use the new attendance summary endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/summary/student?` +
        `student_id=${userProfile.id}&session=${encodeURIComponent(currentSession)}&term=${encodeURIComponent(currentTerm)}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[Student Attendance] Summary:', data);
      
      if (data.success && data.summary) {
        // Map the new API response to match the existing UI expectations
        const mappedSummary = {
          total: data.summary.total_school_days,
          present: data.summary.days_present,
          absent: data.summary.days_absent,
          late: data.summary.days_late,
          excused: data.summary.days_excused,
          percentage: data.summary.attendance_percentage,
          grade: data.summary.attendance_grade,
          remark: data.summary.attendance_remark,
          flagged: data.summary.flagged
        };
        setSummary(mappedSummary);
      } else {
        console.warn('[Student Attendance] No summary available:', data.error);
      }
    } catch (error) {
      console.error('Error fetching attendance summary:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    const icons: Record<string, any> = {
      present: { Icon: Check, color: 'text-green-600' },
      absent: { Icon: X, color: 'text-red-600' },
      late: { Icon: Clock, color: 'text-yellow-600' },
      excused: { Icon: FileText, color: 'text-blue-600' }
    };
    return icons[status] || icons.present;
  };

  const getAttendanceRating = (percentage: number) => {
    if (percentage >= 90) return { text: 'Excellent', color: 'text-green-600', bgColor: 'bg-green-100' };
    if (percentage >= 80) return { text: 'Good', color: 'text-blue-600', bgColor: 'bg-blue-100' };
    if (percentage >= 70) return { text: 'Fair', color: 'text-yellow-600', bgColor: 'bg-yellow-100' };
    return { text: 'Poor', color: 'text-red-600', bgColor: 'bg-red-100' };
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg animate-pulse">
          <div className="h-8 bg-white/20 rounded-xl w-1/2 mb-2"></div>
          <div className="h-4 bg-white/20 rounded-xl w-1/3"></div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 animate-pulse">
          <div className="h-32 bg-gray-200 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return (
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <Calendar className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">My Attendance</h1>
              <p className="text-purple-100 text-sm">{currentSession} - {currentTerm}</p>
            </div>
          </div>
        </div>
        
        {/* Empty State */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="p-4 bg-gray-50 rounded-full mb-4">
              <Calendar className="h-12 w-12 text-gray-400" />
            </div>
            <p className="text-gray-900 font-semibold text-lg mb-2">No Attendance Records</p>
            <p className="text-gray-600 text-center text-sm">
              Your class teacher will mark attendance regularly
            </p>
          </div>
        </div>
      </div>
    );
  }

  const rating = getAttendanceRating(summary.percentage);

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient */}
      <div className="bg-gradient-to-r from-purple-600 to-purple-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <Calendar className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Attendance</h1>
            <p className="text-purple-100 text-sm">{currentSession} - {currentTerm}</p>
          </div>
        </div>
        
        {/* Attendance Percentage - Hero Section */}
        <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-6 border border-white/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm mb-1">Attendance Rate</p>
              <div className="flex items-baseline gap-2">
                <span className="text-5xl font-bold">{summary.percentage}%</span>
                <Badge className={`${rating.bgColor} ${rating.color.replace('text-', 'bg-').replace('600', '500')} border-0 text-white`}>
                  {rating.text}
                </Badge>
              </div>
            </div>
            <div className="p-3 bg-white/20 rounded-full">
              <TrendingUp className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Stats Grid - App Style */}
      <div className="grid grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-green-50 rounded-xl">
              <Check className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-green-600 mb-1">{summary.present}</div>
          <div className="text-sm text-gray-600">Days Present</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-red-50 rounded-xl">
              <X className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-red-600 mb-1">{summary.absent}</div>
          <div className="text-sm text-gray-600">Days Absent</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-yellow-50 rounded-xl">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-yellow-600 mb-1">{summary.late}</div>
          <div className="text-sm text-gray-600">Days Late</div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2.5 bg-blue-50 rounded-xl">
              <FileText className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <div className="text-3xl font-bold text-blue-600 mb-1">{summary.excused}</div>
          <div className="text-sm text-gray-600">Days Excused</div>
        </div>
      </div>

      {/* Attendance Grade and Remark */}
      {summary.grade && summary.remark && (
        <div className={`rounded-2xl shadow-sm border-2 overflow-hidden ${ 
          summary.flagged 
            ? 'bg-amber-50 border-amber-300' 
            : 'bg-emerald-50 border-emerald-300'
        }`}>
          <div className="p-5">
            <div className="flex items-start gap-3">
              <div className={`p-2.5 rounded-xl flex-shrink-0 ${
                summary.flagged ? 'bg-amber-100' : 'bg-emerald-100'
              }`}>
                {summary.flagged ? (
                  <AlertCircle className="h-6 w-6 text-amber-600" />
                ) : (
                  <Check className="h-6 w-6 text-emerald-600" />
                )}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <h4 className="font-bold text-slate-900">Attendance Grade:</h4>
                  <Badge className={`${
                    summary.percentage >= 95 ? 'bg-green-100 text-green-800' :
                    summary.percentage >= 85 ? 'bg-blue-100 text-blue-800' :
                    summary.percentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  } text-sm px-3 py-1 rounded-full`}>
                    {summary.grade}
                  </Badge>
                </div>
                <p className={`text-sm italic leading-relaxed ${
                  summary.flagged ? 'text-amber-900' : 'text-emerald-900'
                }`}>
                  {summary.remark}
                </p>
                {summary.flagged && (
                  <div className="mt-3 bg-amber-100 border border-amber-200 rounded-xl p-3">
                    <p className="text-xs text-amber-800 font-medium flex items-start gap-2">
                      <span className="text-base">⚠️</span>
                      <span>Your attendance is below the required threshold. Please improve your attendance to meet school standards.</span>
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Total School Days - App Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-gray-50 rounded-xl">
              <Calendar className="h-5 w-5 text-gray-600" />
            </div>
            <div>
              <p className="text-sm text-gray-600">Total School Days</p>
              <p className="text-2xl font-bold text-gray-900">{summary.total}</p>
            </div>
          </div>
          <div className="text-sm text-gray-500">
            This term
          </div>
        </div>
      </div>
    </div>
  );
}