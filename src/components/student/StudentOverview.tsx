import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { BookOpen, Clock, FileText, Users, Trophy, Calendar, ClipboardList, Award, LogIn, LogOut } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { PromotionBanner } from '../PromotionBanner';

interface OverviewData {
  studentInfo: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    email: string;
    class_name?: string;
    class_level?: string;
  };
  stats: {
    totalSubjects: number;
    upcomingExams: number;
    resultsAvailable: number;
    attendance: number;
  };
  recentActivities: {
    type: string;
    description: string;
    date: string;
    metadata?: any;
  }[];
  currentSession?: {
    session_name: string;
    id: string;
  } | null;
  currentTerm?: {
    term_name: string;
    id: string;
  } | null;
  schoolInfo?: {
    school_name?: string;
    logo_url?: string;
    motto?: string;
  };
}

export function StudentOverview() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  const supabase = createClient();

  useEffect(() => {
    fetchOverviewData();
  }, []);

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'cbt_exam':
        return { icon: ClipboardList, bgColor: 'bg-indigo-100', iconColor: 'text-indigo-600' };
      case 'result_published':
        return { icon: Award, bgColor: 'bg-emerald-100', iconColor: 'text-emerald-600' };
      case 'clock_in':
        return { icon: LogIn, bgColor: 'bg-blue-100', iconColor: 'text-blue-600' };
      case 'clock_out':
        return { icon: LogOut, bgColor: 'bg-slate-100', iconColor: 'text-slate-600' };
      case 'exam':
        return { icon: Calendar, bgColor: 'bg-orange-100', iconColor: 'text-orange-600' };
      case 'result':
        return { icon: Trophy, bgColor: 'bg-green-100', iconColor: 'text-green-600' };
      case 'upload':
        return { icon: FileText, bgColor: 'bg-purple-100', iconColor: 'text-purple-600' };
      default:
        return { icon: FileText, bgColor: 'bg-slate-100', iconColor: 'text-slate-600' };
    }
  };

  const fetchOverviewData = async () => {
    try {
      console.log('[StudentOverview] Starting fetch...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[StudentOverview] No session found');
        setLoading(false);
        return;
      }

      console.log('[StudentOverview] Session found, user ID:', session.user.id);
      
      // Set user ID for promotion banner
      setUserId(session.user.id);

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      console.log('[StudentOverview] Fetching overview data from server...');
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-overview`,
        { headers }
      );
      
      console.log('[StudentOverview] Response status:', res.status);
      
      if (!res.ok) {
        console.error('[StudentOverview] Response not OK:', res.status, res.statusText);
        const errorText = await res.text();
        console.error('[StudentOverview] Error response:', errorText);
        toast.error(`Failed to load overview: ${res.status} ${res.statusText}`);
        setLoading(false);
        return;
      }

      const result = await res.json();
      console.log('[StudentOverview] Result:', result);
      
      if (result.success) {
        console.log('[StudentOverview] ✅ Data loaded successfully:', result.data);
        setData(result.data);
      } else {
        console.error('[StudentOverview] ❌ Server returned error:', result.error);
        toast.error(result.error || 'Failed to load overview');
      }
    } catch (error) {
      console.error('[StudentOverview] ❌ Exception:', error);
      toast.error('Failed to load overview');
    } finally {
      setLoading(false);
      console.log('[StudentOverview] Fetch complete, loading set to false');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <p className="text-slate-600">Failed to load overview data</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Promotion Banner */}
      {userId && (
        <PromotionBanner userId={userId} userRole="student" />
      )}

      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        {data.schoolInfo?.school_name && (
          <div className="flex items-center gap-2 mb-3">
            {data.schoolInfo.logo_url && (
              <img 
                src={data.schoolInfo.logo_url} 
                alt="School Logo" 
                className="h-10 w-10 rounded-lg bg-white/10 p-1 object-contain"
              />
            )}
            <div>
              <p className="text-sm font-semibold">{data.schoolInfo.school_name}</p>
              {data.schoolInfo.motto && (
                <p className="text-xs text-blue-100 italic">{data.schoolInfo.motto}</p>
              )}
            </div>
          </div>
        )}
        <h1 className="text-2xl md:text-3xl font-bold">
          Welcome Back! 👋
        </h1>
        <p className="text-blue-100 mt-1 text-sm md:text-base font-medium">
          {data.studentInfo.first_name} {data.studentInfo.last_name}
        </p>
        {data.studentInfo.class_name && (
          <div className="mt-4 bg-white/20 backdrop-blur-sm rounded-2xl p-4 border border-white/30">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white rounded-xl shadow-sm">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <p className="text-xs text-blue-100">Your Class</p>
                <p className="text-lg font-semibold">
                  {data.studentInfo.class_name}
                  {data.studentInfo.class_level && ` - ${data.studentInfo.class_level}`}
                </p>
                {data.currentSession && data.currentTerm && (
                  <p className="text-xs text-blue-100 mt-1">
                    {data.currentSession.session_name} • {data.currentTerm.term_name}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats Grid - App Style Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.stats.totalSubjects}</p>
            <p className="text-xs text-gray-600 mt-1">My Subjects</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-orange-50 rounded-xl">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.stats.upcomingExams}</p>
            <p className="text-xs text-gray-600 mt-1">Upcoming Exams</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-green-50 rounded-xl">
                <Trophy className="h-5 w-5 text-green-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.stats.resultsAvailable}</p>
            <p className="text-xs text-gray-600 mt-1">Results Available</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Clock className="h-5 w-5 text-purple-600" />
              </div>
            </div>
            <p className="text-2xl font-bold text-gray-900">{data.stats.attendance}%</p>
            <p className="text-xs text-gray-600 mt-1">Attendance</p>
          </div>
        </div>
      </div>

      {/* Recent Activities - App Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <FileText className="h-5 w-5 text-gray-700" />
            Recent Activities
          </h2>
        </div>
        <div className="divide-y divide-gray-100">
          {data.recentActivities.length > 0 ? (
            data.recentActivities.map((activity, index) => {
              const { icon: ActivityIcon, bgColor, iconColor } = getActivityIcon(activity.type);
              return (
                <div key={index} className="flex items-start gap-3 p-4 hover:bg-gray-50 transition-colors">
                  <div className={`p-2.5 ${bgColor} rounded-xl flex-shrink-0`}>
                    <ActivityIcon className={`h-5 w-5 ${iconColor}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 break-words leading-relaxed">{activity.description}</p>
                    <p className="text-xs text-gray-500 mt-1.5">
                      {new Date(activity.date).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gray-50 rounded-full mb-3">
                <FileText className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No recent activities</p>
              <p className="text-gray-400 text-xs mt-1">Check back later for updates</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}