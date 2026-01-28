import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { 
  Users, 
  GraduationCap, 
  AlertCircle, 
  Calendar, 
  DollarSign, 
  Key, 
  Upload,
  Loader2
} from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface OverviewCardProps {
  title: string;
  value: string | number;
  icon: React.ComponentType<any>;
  trend?: {
    direction: 'up' | 'down';
    value: string;
  };
  status?: 'warning' | 'success' | 'error';
  description?: string;
  bgColor?: string;
}

function OverviewCard({ title, value, icon: Icon, trend, status, description, bgColor }: OverviewCardProps) {
  const getStatusColor = () => {
    // If bgColor is provided, use it (priority)
    if (bgColor) return bgColor;
    
    // Otherwise fall back to status colors
    switch (status) {
      case 'warning': return 'bg-yellow-50 border-yellow-200';
      case 'success': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      default: return 'bg-white border-slate-200';
    }
  };

  // Check if bgColor contains 'text-white' to determine text color
  const isWhiteText = bgColor?.includes('text-white');

  return (
    <Card className={`${getStatusColor()} hover:shadow-lg transition-all duration-300 border-0 shadow-md`}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className={`text-sm sm:text-base font-semibold truncate pr-2 ${isWhiteText ? 'text-white' : ''}`}>
          {title}
        </CardTitle>
        <Icon className={`h-5 w-5 sm:h-6 sm:w-6 flex-shrink-0 ${isWhiteText ? 'text-white opacity-90' : 'text-slate-600'}`} />
      </CardHeader>
      <CardContent>
        <div className={`text-3xl sm:text-4xl md:text-5xl font-bold ${isWhiteText ? 'text-white' : ''}`}>
          {value}
        </div>
        {description && (
          <p className={`text-xs sm:text-sm mt-1 line-clamp-2 ${isWhiteText ? 'text-white opacity-90' : 'text-slate-600'}`}>
            {description}
          </p>
        )}
        {trend && (
          <p className={`text-xs mt-1 ${trend.direction === 'up' ? 'text-green-600' : 'text-red-600'} truncate`}>
            {trend.direction === 'up' ? '↗' : '↘'} {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function OverviewCards() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalStudents: 0,
    totalTeachers: 0,
    pendingApprovals: 0,
    upcomingExams: 0,
    activePins: 0,
    uploadCompliance: 0
  });

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);

      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('[Overview] Not authenticated');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch students count from backend
      const studentsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students`,
        { headers }
      );
      const studentsData = await studentsResponse.json();
      const totalStudents = studentsData.success ? (studentsData.total_students || 0) : 0;

      // Fetch teachers count from backend
      const teachersResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers`,
        { headers }
      );
      const teachersData = await teachersResponse.json();
      const totalTeachers = teachersData.success ? (teachersData.total_teachers || 0) : 0;

      // Fetch current session and term from available-filters endpoint
      let currentSession = '';
      let currentTerm = '';
      try {
        const filtersResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/available-filters`,
          { headers }
        );
        const filtersData = await filtersResponse.json();
        if (filtersData.success) {
          currentSession = filtersData.activeSession || '';
          currentTerm = filtersData.activeTerm || '';
          console.log('[OverviewCards] Active session/term:', { currentSession, currentTerm });
        }
      } catch (err) {
        // Silent fail
      }

      // Fetch exams from backend - FILTER BY CURRENT SESSION ONLY
      const examsUrl = currentSession 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams?session=${encodeURIComponent(currentSession)}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams`;
      
      console.log('[OverviewCards] Fetching exams from:', examsUrl);
      const examsResponse = await fetch(examsUrl, { headers });
      const examsData = await examsResponse.json();
      console.log('[OverviewCards] Exams response:', examsData);
      
      const allExams = examsData.success ? (examsData.exams || []) : [];
      console.log('[OverviewCards] All exams:', allExams);
      
      // Count upcoming exams (status = 'upcoming' or 'active') for CURRENT SESSION ONLY
      // Also calculate status based on dates if status is missing or incorrect
      const now = new Date();
      const upcomingExams = allExams.filter((exam: any) => {
        // Check if exam has valid status from backend
        const hasValidStatus = exam.status === 'upcoming' || exam.status === 'active';
        
        // Also check dates to be extra safe
        let isUpcomingByDate = false;
        if (exam.start_datetime) {
          const startDate = new Date(exam.start_datetime);
          const endDate = exam.end_datetime ? new Date(exam.end_datetime) : startDate;
          
          // Exam is upcoming if it hasn't ended yet
          isUpcomingByDate = now < endDate;
        }
        
        const isUpcoming = hasValidStatus || isUpcomingByDate;
        console.log(`[OverviewCards] Exam "${exam.name}": status=${exam.status}, hasValidStatus=${hasValidStatus}, isUpcomingByDate=${isUpcomingByDate}, isUpcoming=${isUpcoming}`);
        
        return isUpcoming;
      }).length;
      
      console.log('[OverviewCards] Total upcoming/active exams:', upcomingExams);

      // Fetch active PINs count from backend
      let activePins = 0;
      try {
        const pinsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/pins/all`,
          { headers }
        );
        const pinsData = await pinsResponse.json();
        
        if (pinsData.success && pinsData.pins) {
          // Count active PINs (where active = true)
          activePins = pinsData.pins.filter((pin: any) => pin.active === true).length;
        }
      } catch (err) {
        // Silent fail
      }

      // Fetch upload compliance from backend - with session/term filters
      let uploadCompliancePercent = 0;
      try {
        const complianceParams = new URLSearchParams();
        if (currentSession) {
          complianceParams.append('session', currentSession);
        }
        if (currentTerm) {
          complianceParams.append('term', currentTerm);
        }

        const complianceQueryString = complianceParams.toString();
        const complianceUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/compliance${complianceQueryString ? `?${complianceQueryString}` : ''}`;

        console.log('[OverviewCards] Fetching compliance from:', complianceUrl);

        const complianceResponse = await fetch(complianceUrl, { headers });
        
        if (complianceResponse.ok) {
          const text = await complianceResponse.text();
          try {
            const complianceData = JSON.parse(text);
            if (complianceData.success && complianceData.complianceData) {
              // Calculate overall compliance from all teachers
              const totalCompliance = complianceData.complianceData.reduce(
                (sum: number, teacher: any) => sum + (teacher.complianceRate || 0),
                0
              );
              uploadCompliancePercent = complianceData.complianceData.length > 0
                ? Math.round(totalCompliance / complianceData.complianceData.length)
                : 0;
            }
          } catch (parseErr) {
            // Silent fail
          }
        }
      } catch (err) {
        // Silent fail
      }

      // Fetch pending result approvals from backend
      let pendingApprovals = 0;
      try {
        const approvalResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks/pending-approval-count`,
          { headers }
        );
        const approvalData = await approvalResponse.json();
        if (approvalData.success) {
          pendingApprovals = approvalData.count || 0;
        }
      } catch (err) {
        // Silent fail - default to 0
      }

      setStats({
        totalStudents,
        totalTeachers,
        pendingApprovals,
        upcomingExams,
        activePins,
        uploadCompliance: uploadCompliancePercent
      });
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-4 w-4 rounded" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-16 mb-2" />
              <Skeleton className="h-3 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const cards = [
    {
      title: 'Total Students',
      value: stats.totalStudents.toLocaleString(),
      icon: GraduationCap,
      description: 'Active enrollments',
      bgColor: 'bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-700 text-white'
    },
    {
      title: 'Total Teachers',
      value: stats.totalTeachers.toLocaleString(),
      icon: Users,
      description: 'Teaching staff',
      bgColor: 'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600 border-fuchsia-700 text-white'
    },
    {
      title: 'Pending Results Approvals',
      value: stats.pendingApprovals.toLocaleString(),
      icon: AlertCircle,
      status: stats.pendingApprovals > 0 ? 'warning' as const : undefined,
      description: stats.pendingApprovals > 0 ? 'Require immediate attention' : 'All caught up!',
      bgColor: stats.pendingApprovals > 0 
        ? 'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-700 text-white' 
        : 'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700 text-white'
    },
    {
      title: 'Upcoming Exams',
      value: stats.upcomingExams.toLocaleString(),
      icon: Calendar,
      description: 'Upcoming and active exams',
      bgColor: 'bg-gradient-to-br from-violet-500 to-violet-600 border-violet-700 text-white'
    },
    {
      title: 'Active PINs',
      value: stats.activePins.toLocaleString(),
      icon: Key,
      status: stats.activePins > 0 ? 'success' as const : undefined,
      description: 'Generated for result access',
      bgColor: 'bg-gradient-to-br from-rose-500 to-rose-600 border-rose-700 text-white'
    },
    {
      title: 'Teacher Upload Compliance',
      value: `${stats.uploadCompliance}%`,
      icon: Upload,
      status: stats.uploadCompliance >= 80 ? 'success' as const : stats.uploadCompliance >= 50 ? 'warning' as const : 'error' as const,
      description: 'Weekly materials uploaded',
      bgColor: stats.uploadCompliance >= 80 
        ? 'bg-gradient-to-br from-lime-500 to-lime-600 border-lime-700 text-white' 
        : stats.uploadCompliance >= 50 
          ? 'bg-gradient-to-br from-amber-500 to-amber-600 border-amber-700 text-white' 
          : 'bg-gradient-to-br from-slate-500 to-slate-600 border-slate-700 text-white'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 mb-6">
      {cards.map((card, index) => (
        <OverviewCard key={index} {...card} />
      ))}
    </div>
  );
}