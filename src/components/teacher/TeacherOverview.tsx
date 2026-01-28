import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { BookOpen, Users, Calendar, ClipboardCheck, Clock, TrendingUp, X, GraduationCap } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { TeacherChartsSection } from '../TeacherChartsSection';
import { PromotionBanner } from '../PromotionBanner';
import { TeacherNotifications } from './TeacherNotifications';
import { useCurrentWeek } from '../../hooks/useCurrentWeek';

interface TeacherOverviewProps {
  userId: string;
  userName: string;
}

export function TeacherOverview({ userId, userName }: TeacherOverviewProps) {
  const [stats, setStats] = useState({
    totalSubjects: 0,
    totalClasses: 0,
    pendingMarks: 0,
    upcomingClasses: 0,
    isClassTeacher: false,
    className: '',
    studentCount: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [currentYear, setCurrentYear] = useState('');
  const [showWelcomeBanner, setShowWelcomeBanner] = useState(true);
  const [currentSession, setCurrentSession] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const [schoolInfo, setSchoolInfo] = useState<{
    school_name?: string;
    logo_url?: string;
    motto?: string;
  } | null>(null);

  const supabase = createClient();
  const { weekInfo } = useCurrentWeek();

  useEffect(() => {
    fetchOverviewData();
    // Set current academic year
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    // Academic year starts in September (month 8)
    const academicYear = currentMonth >= 8 ? `${currentYear}/${currentYear + 1}` : `${currentYear - 1}/${currentYear}`;
    setCurrentYear(academicYear);
  }, [userId]);

  const fetchOverviewData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch current session and term from settings
      try {
        const sessionResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
          { headers }
        );
        const sessionData = await sessionResponse.json();
        if (sessionData.success && sessionData.sessions) {
          const activeSession = sessionData.sessions.find((s: any) => s.is_current);
          if (activeSession) {
            setCurrentSession(activeSession.session_name);
          }
        }
        if (sessionData.success && sessionData.terms) {
          const activeTerm = sessionData.terms.find((t: any) => t.is_current);
          if (activeTerm) {
            setCurrentTerm(activeTerm.term_name);
          }
        }
      } catch (err) {
        console.log('[TeacherOverview] Could not fetch session/term:', err);
      }

      // Fetch teacher overview stats
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-overview`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setStats(data.stats);
        setRecentActivities(data.recentActivities || []);
        setSchoolInfo(data.schoolInfo || null);
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Mobile App View */}
      <div className="md:hidden">
        {/* Mobile Header with Gradient - App Style */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl shadow-lg">
          {schoolInfo?.school_name && (
            <div className="flex items-center gap-2 mb-3">
              {schoolInfo.logo_url && (
                <img 
                  src={schoolInfo.logo_url} 
                  alt="School Logo" 
                  className="h-10 w-10 rounded-lg bg-white/10 p-1 object-contain"
                />
              )}
              <div>
                <p className="text-sm font-semibold">{schoolInfo.school_name}</p>
                {schoolInfo.motto && (
                  <p className="text-xs text-blue-100 italic">{schoolInfo.motto}</p>
                )}
              </div>
            </div>
          )}
          <h1 className="text-2xl font-bold">
            Welcome Back! 👋
          </h1>
          <p className="text-blue-100 mt-1 text-sm font-medium">
            {userName}
          </p>
          <p className="text-blue-200 text-xs mt-2">
            Here's what's happening with your classes today.
          </p>
          {/* Session and Term Display */}
          {(currentSession || currentTerm) && (
            <div className="flex items-center gap-2 mt-3 pt-3 border-t border-blue-500/30">
              <div className="flex items-center gap-1.5 bg-indigo-500/30 border border-indigo-400/40 rounded-lg px-2.5 py-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-100" />
                <span className="text-xs font-medium text-white">
                  {currentSession || 'N/A'}
                </span>
              </div>
              {currentTerm && (
                <div className="flex items-center gap-1.5 bg-emerald-500/30 border border-emerald-400/40 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-medium text-white">
                    {currentTerm}
                  </span>
                </div>
              )}
              {weekInfo && (
                <div className="flex items-center gap-1.5 bg-amber-500/35 border border-amber-400/50 rounded-lg px-2.5 py-1.5">
                  <span className="text-xs font-semibold text-white">
                    Week {weekInfo.weekNumber}
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Cards - 2 Column Grid like Student */}
        <div className="grid grid-cols-2 gap-3 px-4 mt-6">
          {/* My Subjects Card */}
          <div className="bg-slate-100 rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-blue-100 rounded-xl">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalSubjects}</p>
              <p className="text-xs text-gray-600 mt-1">My Subjects</p>
            </div>
          </div>

          {/* Classes Teaching Card */}
          <div className="bg-slate-100 rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-green-100 rounded-xl">
                  <Users className="h-5 w-5 text-green-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.totalClasses}</p>
              <p className="text-xs text-gray-600 mt-1">Classes Teaching</p>
            </div>
          </div>

          {/* Pending Marks Card */}
          <div className="bg-slate-100 rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-orange-100 rounded-xl">
                  <ClipboardCheck className="h-5 w-5 text-orange-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.pendingMarks}</p>
              <p className="text-xs text-gray-600 mt-1">Pending Marks</p>
            </div>
          </div>

          {/* Today's Classes Card */}
          <div className="bg-slate-100 rounded-2xl shadow-sm border border-slate-200 p-4 hover:shadow-md transition-shadow">
            <div className="flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2.5 bg-purple-100 rounded-xl">
                  <Calendar className="h-5 w-5 text-purple-600" />
                </div>
              </div>
              <p className="text-3xl font-bold text-gray-900">{stats.upcomingClasses}</p>
              <p className="text-xs text-gray-600 mt-1">Today's Classes</p>
            </div>
          </div>
        </div>

        {/* Class Teacher Info Card */}
        {stats.isClassTeacher && (
          <div className="px-4 mt-6">
            <div className="bg-blue-50 rounded-2xl p-5 border border-blue-100 shadow-sm">
              <div className="flex items-center gap-3 mb-4">
                <div className="p-2.5 bg-blue-600 rounded-xl">
                  <GraduationCap className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 text-sm">Class Teacher</h3>
                  <p className="text-xs text-gray-600">You're assigned to a class</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 mt-3">
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Assigned Class</p>
                  <p className="text-lg font-bold text-gray-900">{stats.className}</p>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <p className="text-xs text-gray-500 mb-1 font-medium">Students</p>
                  <p className="text-lg font-bold text-gray-900">{stats.studentCount}</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Desktop View - Keep existing design */}
      <div className="hidden md:block space-y-6">
        {/* Teacher Welcome/Promotion Banner */}
        {userId && (
          <PromotionBanner userId={userId} userRole="teacher" />
        )}

        {/* Welcome Section */}
        <div>
          <h1 className="text-3xl font-bold">Welcome back, {userName}!</h1>
          <p className="text-slate-600 mt-2">Here's what's happening with your classes today.</p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">My Subjects</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalSubjects}</p>
                </div>
                <div className="p-3 bg-blue-100 rounded-lg">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Classes Teaching</p>
                  <p className="text-3xl font-bold mt-2">{stats.totalClasses}</p>
                </div>
                <div className="p-3 bg-green-100 rounded-lg">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Pending Marks</p>
                  <p className="text-3xl font-bold mt-2">{stats.pendingMarks}</p>
                </div>
                <div className="p-3 bg-orange-100 rounded-lg">
                  <ClipboardCheck className="h-6 w-6 text-orange-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-600">Today's Classes</p>
                  <p className="text-3xl font-bold mt-2">{stats.upcomingClasses}</p>
                </div>
                <div className="p-3 bg-purple-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Class Teacher Info */}
        {stats.isClassTeacher && (
          <Card className="border-blue-200 bg-blue-50">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-blue-600" />
                Class Teacher Information
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-slate-600">Assigned Class</p>
                  <p className="text-lg font-semibold text-blue-900">{stats.className}</p>
                </div>
                <div>
                  <p className="text-sm text-slate-600">Number of Students</p>
                  <p className="text-lg font-semibold text-blue-900">{stats.studentCount}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts and Analytics Section */}
        <TeacherChartsSection />

        {/* Recent Activities */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Activities
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentActivities.length > 0 ? (
              <div className="space-y-3">
                {recentActivities.map((activity, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <TrendingUp className="h-4 w-4 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">{activity.title}</p>
                      <p className="text-sm text-slate-600">{activity.description}</p>
                      <p className="text-xs text-slate-400 mt-1">{activity.time}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-slate-500 py-8">No recent activities</p>
            )}
          </CardContent>
        </Card>

        {/* Notifications */}
        <TeacherNotifications userId={userId} compact={true} />
      </div>
    </div>
  );
}