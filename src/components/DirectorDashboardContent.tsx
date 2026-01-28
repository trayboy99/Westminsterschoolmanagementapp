import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Loader2, Users, GraduationCap, BookOpen, DollarSign, CheckCircle, FileText, ClipboardCheck, Wallet, LogOut, User, Settings as SettingsIcon, ArrowLeft, Building, Bus, Calendar, TrendingUp, Clock, Award, DoorOpen, ChevronRight, Grid3x3, Eye, EyeOff, Info } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import FinanceAdminDashboard from './finance/FinanceAdminDashboard';
import { DirectorTeachersOverview } from './director/DirectorTeachersOverview';
import { StudentsManagementModern } from './StudentsManagementModern';
import { DirectorClassesOverview } from './director/DirectorClassesOverview';
import { DirectorComplianceView } from './director/DirectorComplianceView';
import { PrincipalLessonPlansReview } from './director/PrincipalLessonPlansReview';
import { LessonPlanFieldSettings } from './director/LessonPlanFieldSettings';
import { TimetableModule } from './timetable/TimetableModule';
import { AttendanceViewer } from './admin/AttendanceViewer';
import { GateMonitoring } from './admin/GateMonitoring';
import { AdminResultManagement } from './results/AdminResultManagement';
import FeeStructureManager from './finance/FeeStructureManager';
import DirectorPaymentApprovals from './finance/DirectorPaymentApprovals';
import DirectorTeacherSalaries from './finance/DirectorTeacherSalaries';
import StudentFeeAssignment from './finance/StudentFeeAssignment';
import FeeItemsManager from './finance/FeeItemsManager';
import { SalariesManagement } from './salaries/SalariesManagement';
import { TranscriptPinManagement } from './director/TranscriptPinManagement';
import { DirectorPasswordSettings } from './director/DirectorPasswordSettings';
import { ProfileSettings } from './ProfileSettings';
import { SchoolWideAttendance } from './admin/SchoolWideAttendance';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend } from 'recharts';
import { WeekBadge } from './shared/WeekBadge';

interface DirectorDashboardContentProps {
  activeSection: string;
  userProfile?: {
    id: string;
    first_name: string;
    middle_name?: string;
    last_name: string;
    role: string;
    email: string;
  };
  onNavigate?: (section: string) => void;
}

export function DirectorDashboardContent({ 
  activeSection, 
  userProfile, 
  onNavigate 
}: DirectorDashboardContentProps) {
  const [overviewStats, setOverviewStats] = useState({
    teachers: 0,
    students: 0,
    classes: 0,
    subjects: 0,
    loading: true
  });
  const [pendingPayments, setPendingPayments] = useState(0);
  const [totalPayments, setTotalPayments] = useState<number | null>(null);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [schoolSettings, setSchoolSettings] = useState<any>(null);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [studentChartData, setStudentChartData] = useState<any[]>([]);
  const [studentChartLoading, setStudentChartLoading] = useState(true);
  const [financeData, setFinanceData] = useState({
    totalExpected: 0,
    totalReceived: 0,
    academicYear: '',
    term: '',
    loading: true
  });
  const [showExpectedAmount, setShowExpectedAmount] = useState(true);
  const [showReceivedAmount, setShowReceivedAmount] = useState(true);
  const [salaryTotals, setSalaryTotals] = useState({
    teaching: 0,
    nonTeaching: 0,
    total: 0,
    teachingCount: 0,
    nonTeachingCount: 0,
    loading: true
  });
  const [currentSession, setCurrentSession] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');
  const supabase = createClient();

  useEffect(() => {
    if (activeSection === 'overview') {
      fetchOverviewStats();
      fetchPendingItems();
      fetchRecentActivity();
      fetchTotalPayments();
      fetchSchoolSettings();
      fetchStudentChartData();
      fetchSalaryTotals();
      fetchFinanceData();
    }
  }, [activeSection]);

  const fetchOverviewStats = async () => {
    try {
      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication session found');
        setOverviewStats(prev => ({ ...prev, loading: false }));
        return;
      }

      const [teachersRes, studentsRes, classesRes, subjectsRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users?role=teacher`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users?role=student`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subjects`, {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        })
      ]);

      const [teachersData, studentsData, classesData, subjectsData] = await Promise.all([
        teachersRes.json(),
        studentsRes.json(),
        classesRes.json(),
        subjectsRes.json()
      ]);

      console.log('Director Overview - Subjects data:', subjectsData);

      setOverviewStats({
        teachers: teachersData.success ? (teachersData.users?.length || 0) : 0,
        students: studentsData.success ? (studentsData.users?.length || 0) : 0,
        classes: classesData.success ? (classesData.classes?.length || 0) : 0,
        subjects: subjectsData.success ? (subjectsData.subjects?.length || 0) : 0,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching overview stats:', error);
      setOverviewStats(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchPendingItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch pending payments count
      const paymentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments?approval_status=pending`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const paymentsData = await paymentsRes.json();
      setPendingPayments(paymentsData.success ? (paymentsData.payments?.length || 0) : 0);
    } catch (error) {
      console.error('Error fetching pending items:', error);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch recent students (last 5)
      const studentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users?role=student`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const studentsData = await studentsRes.json();
      
      if (studentsData.success && studentsData.users) {
        const recent = studentsData.users
          .filter((user: any) => user.created_at) // Filter out users without created_at
          .sort((a: any, b: any) => {
            const dateA = new Date(a.created_at);
            const dateB = new Date(b.created_at);
            return dateB.getTime() - dateA.getTime();
          })
          .slice(0, 5)
          .map((user: any) => ({
            type: 'student_added',
            message: `${user.first_name} ${user.last_name} registered`,
            timestamp: user.created_at || new Date().toISOString() // Fallback to current date if null
          }));
        setRecentActivities(recent);
      }
    } catch (error) {
      console.error('Error fetching recent activity:', error);
    }
  };
  
  const fetchTotalPayments = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // First get active session and term
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const sessionData = await sessionRes.json();

      if (sessionData.success && sessionData.sessions && sessionData.terms) {
        const currentSession = sessionData.sessions.find((s: any) => s.is_current);
        const currentTerm = sessionData.terms.find((t: any) => t.is_current);

        if (currentSession && currentTerm) {
          // Fetch payments filtered by active session and term
          const paymentsRes = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments?approval_status=approved&academic_year=${encodeURIComponent(currentSession.session_name)}&term=${encodeURIComponent(currentTerm.term_name)}`,
            { headers: { 'Authorization': `Bearer ${session.access_token}` } }
          );
          const paymentsData = await paymentsRes.json();
          setTotalPayments(paymentsData.success ? (paymentsData.payments?.length || 0) : 0);
          return;
        }
      }

      // Fallback: fetch all approved payments if session/term not found
      const paymentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments?approval_status=approved`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const paymentsData = await paymentsRes.json();
      setTotalPayments(paymentsData.success ? (paymentsData.payments?.length || 0) : 0);
    } catch (error) {
      console.error('Error fetching total payments:', error);
    }
  };
  
  const fetchSchoolSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // Fetch school settings
      const settingsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/school-settings`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const settingsData = await settingsRes.json();
      console.log('[Finance Dashboard] School settings:', settingsData);
      setSchoolSettings(settingsData.success ? settingsData.settings : null);
    } catch (error) {
      console.error('Error fetching school settings:', error);
    }
  };

  const fetchStudentChartData = async () => {
    console.log('[StudentChart] Starting to fetch student chart data...');
    setStudentChartLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('[StudentChart] No session found');
        setStudentChartLoading(false);
        return;
      }

      console.log('[StudentChart] Fetching class statistics...');
      // Use the classes-stats endpoint which returns classes with student counts
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes-stats`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      );

      const data = await response.json();
      console.log('[StudentChart] Classes stats data:', data);

      if (data.success && data.classes) {
        const classes = data.classes || [];
        console.log('[StudentChart] Found', classes.length, 'classes with stats');

        // Helper function to extract base class name
        const getBaseClassName = (className: string | null | undefined): string => {
          if (!className) return 'Unknown';
          
          const normalized = className.toUpperCase().trim();
          
          // Match JSS1, JSS2, JSS3
          if (normalized.startsWith('JSS 1') || normalized.startsWith('JSS1')) return 'JSS 1';
          if (normalized.startsWith('JSS 2') || normalized.startsWith('JSS2')) return 'JSS 2';
          if (normalized.startsWith('JSS 3') || normalized.startsWith('JSS3')) return 'JSS 3';
          
          // Match SS1, SS2, SS3 (or SSS1, SSS2, SSS3)
          if (normalized.startsWith('SS 1') || normalized.startsWith('SS1') || normalized.startsWith('SSS 1') || normalized.startsWith('SSS1')) return 'SS 1';
          if (normalized.startsWith('SS 2') || normalized.startsWith('SS2') || normalized.startsWith('SSS 2') || normalized.startsWith('SSS2')) return 'SS 2';
          if (normalized.startsWith('SS 3') || normalized.startsWith('SS3') || normalized.startsWith('SSS 3') || normalized.startsWith('SSS3')) return 'SS 3';
          
          return className;
        };

        // Group by base class name and sum student counts
        const classGroups = new Map<string, number>();
        
        classes.forEach((cls: any) => {
          const baseClassName = getBaseClassName(cls.class_name);
          const currentCount = classGroups.get(baseClassName) || 0;
          classGroups.set(baseClassName, currentCount + (cls.student_count || 0));
        });

        console.log('[StudentChart] Class groups:', Array.from(classGroups.entries()));

        // If no students are enrolled, show message
        const totalStudents = Array.from(classGroups.values()).reduce((sum, count) => sum + count, 0);
        if (totalStudents === 0 && data.total_students > 0) {
          // Students exist but aren't assigned to classes
          classGroups.set('Unassigned', data.total_students);
        }

        // Convert to chart data format
        const chartData = Array.from(classGroups.entries())
          .filter(([_, count]) => count > 0) // Only show classes with students
          .map(([className, count]) => ({
            class: className,
            students: count
          }))
          .sort((a, b) => {
            // Custom sort order: JSS 1, JSS 2, JSS 3, SS 1, SS 2, SS 3, Unassigned
            const order = ['JSS 1', 'JSS 2', 'JSS 3', 'SS 1', 'SS 2', 'SS 3', 'Unassigned'];
            return order.indexOf(a.class) - order.indexOf(b.class);
          });

        console.log('[StudentChart] Final chart data:', chartData);
        setStudentChartData(chartData);
      } else {
        console.log('[StudentChart] API response not successful');
        setStudentChartData([]);
      }
    } catch (error) {
      console.error('[StudentChart] Error fetching student chart data:', error);
      setStudentChartData([]);
    } finally {
      setStudentChartLoading(false);
      console.log('[StudentChart] Finished loading');
    }
  };

  const fetchSalaryTotals = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setSalaryTotals(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get current session
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const sessionData = await sessionRes.json();
      
      if (!sessionData.success || !sessionData.sessions) {
        setSalaryTotals(prev => ({ ...prev, loading: false }));
        return;
      }

      const currentSession = sessionData.sessions.find((s: any) => s.is_current);
      if (!currentSession) {
        setSalaryTotals(prev => ({ ...prev, loading: false }));
        return;
      }

      // Get current month and year
      const now = new Date();
      const month = now.getMonth() + 1;
      const year = now.getFullYear();

      // Fetch salary totals
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/salaries/totals?month=${month}&year=${year}&session=${currentSession.session_name}`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );

      const data = await response.json();
      
      if (data.success && data.totals) {
        setSalaryTotals({
          teaching: data.totals.teaching,
          nonTeaching: data.totals.nonTeaching,
          total: data.totals.total,
          teachingCount: data.totals.teachingCount,
          nonTeachingCount: data.totals.nonTeachingCount,
          loading: false
        });
      } else {
        setSalaryTotals(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Error fetching salary totals:', error);
      setSalaryTotals(prev => ({ ...prev, loading: false }));
    }
  };

  const fetchFinanceData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      // First, get the active session and term
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const sessionData = await sessionRes.json();

      console.log('[Director Finance] Session settings:', sessionData);

      if (!sessionData.success) {
        setFinanceData(prev => ({ ...prev, loading: false }));
        return;
      }

      const currentSession = sessionData.sessions?.find((s: any) => s.is_current);
      const currentTerm = sessionData.terms?.find((t: any) => t.is_current);

      if (!currentSession || !currentTerm) {
        console.error('[Director Finance] No active session or term found');
        setFinanceData(prev => ({ ...prev, loading: false }));
        return;
      }

      const academicYear = currentSession.session_name;
      const term = currentTerm.term_name;

      // Store current session and term for School-Wide Attendance
      setCurrentSession(academicYear);
      setCurrentTerm(term);

      console.log('[Director Finance] Fetching finance data for:', { academicYear, term });

      // Fetch total term payments for active session/term
      const paymentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/total-term-payments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ academicYear, term })
        }
      );
      const paymentsData = await paymentsRes.json();

      console.log('[Director Finance] Payments response:', paymentsData);

      if (paymentsData.success) {
        // Fetch total expected fees from all students
        const feeRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/students-expected-fees?academic_year=${academicYear}&term=${term}`,
          {
            headers: { 'Authorization': `Bearer ${session.access_token}` }
          }
        );
        const feeData = await feeRes.json();

        console.log('[Director Finance] Expected fees response:', feeData);

        setFinanceData({
          totalExpected: feeData.success ? (feeData.total_expected || 0) : 0,
          totalReceived: paymentsData.totalPayments || 0,
          academicYear,
          term,
          loading: false
        });
      } else {
        console.error('[Director Finance] Error:', paymentsData.error);
        setFinanceData(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('[Director Finance] Error fetching finance data:', error);
      setFinanceData(prev => ({ ...prev, loading: false }));
    }
  };
  
  // Overview Dashboard
  if (activeSection === 'overview') {
    const isFinanceAdmin = userProfile?.role === 'finance_admin';
    
    return (
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {isFinanceAdmin ? (
          // Finance Admin Home Page
          <>
            {/* School Branding & Profile Header */}
            <div className="flex items-center justify-between">
              {/* Left: School Logo + Name */}
              <div className="flex items-center gap-3">
                {schoolSettings?.logo_url && (
                  <img 
                    src={schoolSettings.logo_url} 
                    alt="School Logo" 
                    className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                  />
                )}
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {schoolSettings?.school_name || 'School Management System'}
                  </h2>
                  <p className="text-xs text-slate-600">Finance Dashboard</p>
                </div>
              </div>

              {/* Right: Week Badge + Profile Dropdown */}
              <div className="flex items-center gap-2">
                <WeekBadge variant="compact" />
                
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center text-white font-semibold text-sm">
                      {userProfile?.first_name?.charAt(0)}{userProfile?.last_name?.charAt(0)}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userProfile?.first_name} {userProfile?.last_name}</p>
                      <p className="text-xs text-slate-500">{userProfile?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = '/';
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <p className="text-sm text-slate-600">
                Welcome back, {userProfile?.first_name}!
              </p>
            </div>

            {/* Hero Card - Finance Balance Display */}
            <div className="bg-gradient-to-br from-green-600 via-emerald-600 to-teal-600 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/10 rounded-full -ml-16 -mb-16"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <p className="text-green-100 text-xs mb-1">Finance Dashboard</p>
                    <h2 className="text-base sm:text-lg font-semibold">Financial Overview</h2>
                    <p className="text-xs text-green-100 mt-1 opacity-90">
                      {financeData.loading ? (
                        'Loading...'
                      ) : (
                        `${financeData.academicYear} • ${financeData.term}`
                      )}
                    </p>
                  </div>
                  <div className="bg-white/20 backdrop-blur-sm rounded-2xl p-2.5">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                
                {/* Expected & Received Payments Grid */}
                <div className="grid grid-cols-2 gap-4 mt-6">
                  {/* Expected Payment */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-green-100 text-xs">Expected Payment</p>
                      <button
                        onClick={() => setShowExpectedAmount(!showExpectedAmount)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        title={showExpectedAmount ? "Hide amount" : "Show amount"}
                      >
                        {showExpectedAmount ? (
                          <Eye className="h-3.5 w-3.5 text-green-200 hover:text-white" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-green-200 hover:text-white" />
                        )}
                      </button>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-1">
                      {financeData.loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        showExpectedAmount ? `₦${financeData.totalExpected.toLocaleString()}` : '₦******'
                      )}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-green-100 mt-1">
                      <CheckCircle className="h-3 w-3" />
                      <span>{financeData.term || 'Loading...'}</span>
                    </div>
                  </div>

                  {/* Total Received */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-green-100 text-xs">Total Received</p>
                      <button
                        onClick={() => setShowReceivedAmount(!showReceivedAmount)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        title={showReceivedAmount ? "Hide amount" : "Show amount"}
                      >
                        {showReceivedAmount ? (
                          <Eye className="h-3.5 w-3.5 text-green-200 hover:text-white" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-green-200 hover:text-white" />
                        )}
                      </button>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-1">
                      {financeData.loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        showReceivedAmount ? `₦${financeData.totalReceived.toLocaleString()}` : '₦******'
                      )}
                    </h3>
                    <div className="flex items-center gap-1 text-xs text-green-100 mt-1">
                      <span>{financeData.academicYear || '2025/2026'}</span>
                    </div>
                  </div>
                </div>

                {/* Collection Progress Bar */}
                <div className="mt-6 bg-white/20 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-white h-full transition-all duration-500 ease-out"
                    style={{ 
                      width: financeData.loading ? '0%' : `${financeData.totalExpected > 0 ? ((financeData.totalReceived / financeData.totalExpected) * 100).toFixed(0) : 0}%` 
                    }}
                  />
                </div>
                <div className="flex items-center justify-between mt-2">
                  <p className="text-xs text-green-100">Collection Progress</p>
                  <p className="text-xs font-semibold text-white">
                    {financeData.loading ? '0%' : `${financeData.totalExpected > 0 ? ((financeData.totalReceived / financeData.totalExpected) * 100).toFixed(0) : 0}%`}
                  </p>
                </div>
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="space-y-3">
              <h2 className="text-base font-semibold">Quick Actions</h2>
              
              {/* Action Cards Grid - 2 per row */}
              <div className="grid grid-cols-2 gap-3">
                {/* Payment Entry Card */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200"
                  onClick={() => onNavigate?.('finance')}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-2.5 rounded-full bg-emerald-500 text-white">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs">Payment Entry</h3>
                        <p className="text-[10px] text-emerald-700 mt-0.5">Record payments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Manage Payments Card */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
                  onClick={() => onNavigate?.('finance')}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-2.5 rounded-full bg-blue-500 text-white">
                        <FileText className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs">Manage</h3>
                        <p className="text-[10px] text-blue-700 mt-0.5">View & edit</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Clearance Card */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
                  onClick={() => onNavigate?.('finance')}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-2.5 rounded-full bg-purple-500 text-white">
                        <ClipboardCheck className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs">Clearance</h3>
                        <p className="text-[10px] text-purple-700 mt-0.5">Fee status</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Student Type Assignment Card */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200"
                  onClick={() => onNavigate?.('finance')}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-2.5 rounded-full bg-orange-500 text-white">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs">Student Type</h3>
                        <p className="text-[10px] text-orange-700 mt-0.5">Assign types</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Stats Cards - 2 columns, smaller */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <GraduationCap className="h-6 w-6 text-blue-600 flex-shrink-0" />
                    <div>
                      {overviewStats.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <p className="text-xl font-semibold">{overviewStats.students}</p>
                          <p className="text-[10px] text-slate-600">Students</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <DollarSign className="h-6 w-6 text-purple-600 flex-shrink-0" />
                    <div>
                      {totalPayments === null ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <>
                          <p className="text-xl font-semibold">{totalPayments}</p>
                          <p className="text-[10px] text-slate-600">Term Payments</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* System Info */}
            <Card className="bg-slate-50">
              <CardContent className="p-4">
                <h3 className="text-sm font-semibold mb-3">System Info</h3>
                <div className="space-y-2">
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-700">All payments require Director approval</p>
                  </div>
                  <div className="flex items-start gap-2 text-xs">
                    <CheckCircle className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <p className="text-slate-700">Cannot edit/delete approved payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Profile Settings Dialog */}
            <ProfileSettings 
              open={showProfileDialog} 
              onOpenChange={setShowProfileDialog}
              onProfileUpdate={() => {
                // Refresh data if needed
                fetchSchoolSettings();
              }}
            />
          </>
        ) : (
          // Director Overview - Mobile App UI with Black Theme
          <>
            {/* School Branding & Profile Header */}
            <div className="flex items-center justify-between">
              {/* Left: School Logo + Name */}
              <div className="flex items-center gap-3">
                {schoolSettings?.logo_url && (
                  <img 
                    src={schoolSettings.logo_url} 
                    alt="School Logo" 
                    className="h-10 w-10 sm:h-12 sm:w-12 object-contain"
                  />
                )}
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    {schoolSettings?.school_name || 'School Management System'}
                  </h2>
                  <div className="flex items-center gap-2">
                    <p className="text-xs text-slate-600">Director Dashboard</p>
                  </div>
                </div>
              </div>

              {/* Right: Week Badge + Profile Dropdown */}
              <div className="flex items-center gap-2">
                <WeekBadge variant="compact" />
                
                <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button className="flex items-center gap-2 p-2 hover:bg-slate-100 rounded-full transition-colors">
                    <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-full bg-gradient-to-br from-slate-700 to-slate-900 flex items-center justify-center text-white font-semibold text-sm">
                      {userProfile?.first_name?.charAt(0)}{userProfile?.last_name?.charAt(0)}
                    </div>
                  </button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium">{userProfile?.first_name} {userProfile?.last_name}</p>
                      <p className="text-xs text-slate-500">{userProfile?.email}</p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setShowProfileDialog(true)}>
                    <User className="mr-2 h-4 w-4" />
                    <span>Edit Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onNavigate?.('settings')}>
                    <SettingsIcon className="mr-2 h-4 w-4" />
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={async () => {
                      await supabase.auth.signOut();
                      window.location.href = '/';
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Logout</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              </div>
            </div>

            {/* Welcome Message */}
            <div>
              <p className="text-sm text-slate-600">
                Welcome back, {userProfile?.first_name}!
              </p>
            </div>

            {/* Hero Card - BLACK Gradient Finance Display */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
              <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-blue-500/10 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-slate-300 text-xs mb-1">Director Dashboard</p>
                    <h2 className="text-base sm:text-lg font-semibold">Financial Overview</h2>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
                    <Wallet className="h-5 w-5" />
                  </div>
                </div>
                
                {/* Expected & Total Payments */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-300 text-xs">Expected Payment</p>
                      <button
                        onClick={() => setShowExpectedAmount(!showExpectedAmount)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        title={showExpectedAmount ? "Hide amount" : "Show amount"}
                      >
                        {showExpectedAmount ? (
                          <Eye className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        )}
                      </button>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-1">
                      {financeData.loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        showExpectedAmount ? `₦${financeData.totalExpected.toLocaleString()}` : '₦******'
                      )}
                    </h3>
                    <div className="flex items-center gap-1 text-xs">
                      <TrendingUp className="h-3 w-3 text-green-400" />
                      <span className="text-green-400">{financeData.term || 'Loading...'}</span>
                    </div>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-slate-300 text-xs">Total Received</p>
                      <button
                        onClick={() => setShowReceivedAmount(!showReceivedAmount)}
                        className="p-1 hover:bg-white/10 rounded-lg transition-colors"
                        title={showReceivedAmount ? "Hide amount" : "Show amount"}
                      >
                        {showReceivedAmount ? (
                          <Eye className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        )}
                      </button>
                    </div>
                    <h3 className="text-2xl sm:text-3xl font-bold mb-1">
                      {financeData.loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        showReceivedAmount ? `₦${financeData.totalReceived.toLocaleString()}` : '₦******'
                      )}
                    </h3>
                    <div className="flex items-center gap-1 text-xs">
                      <CheckCircle className="h-3 w-3 text-blue-400" />
                      <span className="text-blue-400">{financeData.academicYear || 'Loading...'}</span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-300 mb-2">
                    <span>Collection Progress</span>
                    <span>
                      {financeData.loading ? '...' : `${financeData.totalExpected > 0 ? Math.round((financeData.totalReceived / financeData.totalExpected) * 100) : 0}%`}
                    </span>
                  </div>
                  <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-400 to-blue-600 rounded-full transition-all duration-500" 
                      style={{ width: `${financeData.totalExpected > 0 ? Math.round((financeData.totalReceived / financeData.totalExpected) * 100) : 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Student Statistics Chart */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Student Statistics</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Enrollment by class</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Users className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-64">
                  {studentChartLoading ? (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
                        <p className="text-xs text-slate-500">Loading student data...</p>
                      </div>
                    </div>
                  ) : studentChartData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={studentChartData}
                        margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis 
                          dataKey="class" 
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                        />
                        <YAxis 
                          tick={{ fontSize: 11 }}
                          stroke="#94a3b8"
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: '#1e293b', 
                            border: 'none', 
                            borderRadius: '8px',
                            color: 'white'
                          }}
                        />
                        <Bar 
                          dataKey="students" 
                          radius={[8, 8, 0, 0]}
                        >
                          {studentChartData.map((entry, index) => {
                            // Distinct colors for each class
                            const colors = [
                              '#3b82f6', // Blue for JSS 1
                              '#06b6d4', // Cyan for JSS 2
                              '#10b981', // Green for JSS 3
                              '#f59e0b', // Amber for SS 1
                              '#ef4444', // Red for SS 2
                              '#8b5cf6', // Purple for SS 3
                            ];
                            return (
                              <Cell 
                                key={`cell-${index}`} 
                                fill={colors[index % colors.length]}
                              />
                            );
                          })}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="h-full flex items-center justify-center">
                      <div className="text-center space-y-2">
                        <Users className="h-12 w-12 text-slate-300 mx-auto" />
                        <p className="text-sm text-slate-500 font-medium">No student data available</p>
                        <p className="text-xs text-slate-400">Students will appear here once enrolled</p>
                      </div>
                    </div>
                  )}
                </div>
                <div className="mt-4 pt-4 border-t">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-slate-600">Total Students</span>
                    <span className="font-semibold text-slate-900">{overviewStats.students}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Finance Donut Chart - Expected vs Received */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Payment Overview</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Expected vs Received</p>
                  </div>
                  <div className="p-2 bg-green-50 rounded-lg">
                    <DollarSign className="h-4 w-4 text-green-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: 'Received', value: financeData.totalReceived, color: '#10b981' },
                          { name: 'Outstanding', value: financeData.totalExpected - financeData.totalReceived, color: '#a78bfa' }
                        ]}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={90}
                        paddingAngle={5}
                        dataKey="value"
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#a78bfa" />
                      </Pie>
                      <Tooltip 
                        formatter={(value: any) => `₦${value.toLocaleString()}`}
                        contentStyle={{ 
                          backgroundColor: '#1e293b', 
                          border: 'none', 
                          borderRadius: '8px',
                          color: 'white'
                        }}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  
                  {/* Center Text */}
                  <div className="relative -mt-44 flex flex-col items-center justify-center pointer-events-none">
                    <p className="text-xs text-slate-500">Total Expected</p>
                    <p className="text-2xl font-bold text-slate-900">
                      ₦{(financeData.totalExpected / 1000).toFixed(0)}K
                    </p>
                  </div>
                </div>

                {/* Legend */}
                <div className="mt-4 pt-4 border-t space-y-2">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <span className="text-slate-600">Received</span>
                    </div>
                    <span className="font-semibold text-green-600">₦{financeData.totalReceived.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                      <span className="text-slate-600">Outstanding</span>
                    </div>
                    <span className="font-semibold text-purple-600">₦{(financeData.totalExpected - financeData.totalReceived).toLocaleString()}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Salary Overview Card */}
            <Card className="bg-white border-2 border-slate-200 rounded-3xl shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Salary Overview</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Teaching vs Non-Teaching Staff</p>
                  </div>
                  <div className="p-2 bg-blue-50 rounded-lg">
                    <Wallet className="h-4 w-4 text-blue-600" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {salaryTotals.loading ? (
                  <div className="h-72 flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
                  </div>
                ) : salaryTotals.total === 0 ? (
                  <div className="h-72 flex items-center justify-center text-center">
                    <div>
                      <Wallet className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                      <p className="text-sm text-slate-500">No salary data for this month</p>
                      <p className="text-xs text-slate-400 mt-1">Add salaries to see the breakdown</p>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="h-72">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={[
                              { name: 'Teaching', value: salaryTotals.teaching, color: '#3b82f6' },
                              { name: 'Non-Teaching', value: salaryTotals.nonTeaching, color: '#f97316' }
                            ]}
                            cx="50%"
                            cy="50%"
                            innerRadius={60}
                            outerRadius={90}
                            paddingAngle={5}
                            dataKey="value"
                          >
                            <Cell fill="#3b82f6" />
                            <Cell fill="#f97316" />
                          </Pie>
                          <Tooltip 
                            formatter={(value: any) => `₦${value.toLocaleString()}`}
                            contentStyle={{ 
                              backgroundColor: '#1e293b', 
                              border: 'none', 
                              borderRadius: '8px',
                              color: 'white'
                            }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                      
                      {/* Center Text */}
                      <div className="relative -mt-44 flex flex-col items-center justify-center pointer-events-none">
                        <p className="text-xs text-slate-500">Total Salaries</p>
                        <p className="text-2xl font-bold text-slate-900">
                          ₦{(salaryTotals.total / 1000).toFixed(0)}K
                        </p>
                      </div>
                    </div>

                    {/* Legend */}
                    <div className="mt-4 pt-4 border-t space-y-2">
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="text-slate-600">Teaching ({salaryTotals.teachingCount})</span>
                        </div>
                        <span className="font-semibold text-blue-600">₦{salaryTotals.teaching.toLocaleString()}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                          <span className="text-slate-600">Non-Teaching ({salaryTotals.nonTeachingCount})</span>
                        </div>
                        <span className="font-semibold text-orange-600">₦{salaryTotals.nonTeaching.toLocaleString()}</span>
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats Grid */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-blue-500 rounded-lg">
                      <Users className="h-4 w-4 text-white flex-shrink-0" />
                    </div>
                    <div>
                      {overviewStats.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <p className="text-lg font-semibold">{overviewStats.teachers}</p>
                          <p className="text-[10px] text-slate-600">Teachers</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-purple-500 rounded-lg">
                      <BookOpen className="h-4 w-4 text-white flex-shrink-0" />
                    </div>
                    <div>
                      {overviewStats.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <p className="text-lg font-semibold">{overviewStats.classes}</p>
                          <p className="text-[10px] text-slate-600">Classes</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100/50 border-green-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-green-500 rounded-lg">
                      <GraduationCap className="h-4 w-4 text-white flex-shrink-0" />
                    </div>
                    <div>
                      {overviewStats.loading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <p className="text-lg font-semibold">{overviewStats.students}</p>
                          <p className="text-[10px] text-slate-600">Students</p>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card 
                className="bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200 cursor-pointer hover:shadow-lg transition-all"
                onClick={() => onNavigate?.('lesson-plans-review')}
              >
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <div className="p-2 bg-orange-500 rounded-lg">
                      <FileText className="h-4 w-4 text-white flex-shrink-0" />
                    </div>
                    <div>
                      <p className="text-lg font-semibold">View</p>
                      <p className="text-[10px] text-slate-600">Lesson Plans</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* School-Wide Attendance Dashboard */}
            {currentSession && currentTerm && (
              <SchoolWideAttendance 
                selectedSession={currentSession} 
                selectedTerm={currentTerm} 
              />
            )}

            {/* Recent Activities */}
            <Card className="shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-sm font-semibold">Recent Activities</CardTitle>
                    <p className="text-xs text-slate-500 mt-1">Latest student registrations</p>
                  </div>
                  <Clock className="h-4 w-4 text-slate-400" />
                </div>
              </CardHeader>
              <CardContent>
                {recentActivities.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-sm text-slate-500">No recent activities</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {recentActivities.map((activity, index) => (
                      <div key={index} className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg hover:bg-slate-100 transition-colors">
                        <div className="p-2 bg-blue-100 rounded-full flex-shrink-0">
                          <GraduationCap className="h-3.5 w-3.5 text-blue-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">
                            {activity.message}
                          </p>
                          <p className="text-xs text-slate-500 mt-0.5">
                            {new Date(activity.timestamp).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Profile Settings Dialog */}
            <ProfileSettings 
              open={showProfileDialog} 
              onOpenChange={setShowProfileDialog}
              onProfileUpdate={() => {
                // Refresh data if needed
                fetchSchoolSettings();
              }}
            />
          </>
        )}
      </div>
    );
  }

  // Teachers Page
  if (activeSection === 'teachers') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <DirectorTeachersOverview />
      </div>
    );
  }

  // Students Page
  if (activeSection === 'students') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <StudentsManagementModern />
      </div>
    );
  }

  // Classes Page
  if (activeSection === 'classes') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <DirectorClassesOverview />
      </div>
    );
  }

  // Lesson Plans Review Page
  if (activeSection === 'lesson-plans-review') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <PrincipalLessonPlansReview />
      </div>
    );
  }

  // Compliance Record Page
  if (activeSection === 'compliance') {
    return (
      <div className="p-4 md:p-6 space-y-4 pb-24 md:pb-6">
        <div>
          <h1 className="text-2xl md:text-3xl">Compliance Record</h1>
          <p className="text-slate-600 mt-1">Monitor marks entry and uploads compliance</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-blue-200"
            onClick={() => onNavigate?.('marks-entry-compliance')}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-lg flex-shrink-0">
                  <ClipboardCheck className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Marks Entry Compliance</h3>
                  <p className="text-sm text-slate-600">Track teachers' marks entry progress</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card 
            className="cursor-pointer hover:shadow-lg transition-shadow border-2 hover:border-green-200"
            onClick={() => onNavigate?.('uploads-compliance')}
          >
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-green-100 rounded-lg flex-shrink-0">
                  <FileText className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold mb-1">Uploads Compliance</h3>
                  <p className="text-sm text-slate-600">Monitor learning materials uploads</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Marks Entry Compliance - Show marks only
  if (activeSection === 'marks-entry-compliance') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <DirectorComplianceView type="marks" onBack={() => onNavigate?.('compliance')} />
      </div>
    );
  }

  // Uploads Compliance - Show uploads only
  if (activeSection === 'uploads-compliance') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <DirectorComplianceView type="uploads" onBack={() => onNavigate?.('compliance')} />
      </div>
    );
  }

  // Timetable Page
  if (activeSection === 'timetable') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <TimetableModule 
          userRole="director" 
          userId={userProfile?.id || ''} 
          userName={`${userProfile?.first_name} ${userProfile?.last_name}`}
        />
      </div>
    );
  }

  // Attendance Page
  if (activeSection === 'attendance') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <AttendanceViewer userRole={userProfile?.role || 'director'} />
      </div>
    );
  }

  // Gate Monitoring Page
  if (activeSection === 'gate-monitoring') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <GateMonitoring />
      </div>
    );
  }

  // Results Check Page
  if (activeSection === 'results') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <AdminResultManagement 
          userProfile={userProfile}
          onNavigate={onNavigate}
        />
      </div>
    );
  }

  // Finance Page
  if (activeSection === 'finance') {
    const isFinanceAdmin = userProfile?.role === 'finance_admin';
    const isDirector = userProfile?.role === 'director';

    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        {isFinanceAdmin ? (
          <FinanceAdminDashboard onNavigate={onNavigate} />
        ) : isDirector ? (
          <div className="space-y-6">
            {/* Header */}
            <div>
              <h1 className="text-xl font-bold text-slate-900">Finance Management</h1>
              <p className="text-sm text-slate-600 mt-1">Manage fees and approvals</p>
            </div>

            {/* Main Financial Overview Card - Black Theme */}
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 rounded-3xl p-6 text-white shadow-2xl relative overflow-hidden">
              {/* Decorative Elements */}
              <div className="absolute top-0 right-0 w-40 h-40 bg-white/5 rounded-full -mr-20 -mt-20"></div>
              <div className="absolute bottom-0 left-0 w-32 h-32 bg-white/5 rounded-full -ml-16 -mb-16"></div>
              <div className="absolute top-1/2 right-1/4 w-24 h-24 bg-emerald-500/10 rounded-full blur-xl"></div>
              
              <div className="relative z-10">
                {/* Header Row */}
                <div className="flex justify-between items-start mb-6">
                  <div>
                    <p className="text-slate-300 text-xs mb-1">CASHFLOW</p>
                    <h2 className="text-lg font-semibold">Financial Overview</h2>
                    <p className="text-xs text-slate-400 mt-1">
                      {financeData.loading ? (
                        'Loading...'
                      ) : (
                        `${financeData.academicYear} • ${financeData.term}`
                      )}
                    </p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-2.5">
                    <DollarSign className="h-5 w-5" />
                  </div>
                </div>

                {/* Time Period Tabs */}
                <div className="flex gap-2 mb-6">
                  <button className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-medium">Daily</button>
                  <button className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-medium">Weekly</button>
                  <button className="px-3 py-1.5 bg-white/20 rounded-lg text-xs font-medium">Monthly</button>
                </div>

                {/* Income & Expense Cards */}
                <div className="grid grid-cols-2 gap-4 mb-6">
                  {/* Income */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-green-500/20 rounded-lg">
                          <TrendingUp className="h-3.5 w-3.5 text-green-400" />
                        </div>
                        <span className="text-xs text-slate-300">Income</span>
                      </div>
                      <button
                        onClick={() => setShowReceivedAmount(!showReceivedAmount)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title={showReceivedAmount ? "Hide amount" : "Show amount"}
                      >
                        {showReceivedAmount ? (
                          <Eye className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        )}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-green-400">
                      {financeData.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        showReceivedAmount ? `₦${(financeData.totalReceived / 1000).toFixed(1)}K` : '₦****'
                      )}
                    </p>
                  </div>

                  {/* Expected */}
                  <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-4 relative">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-1.5 bg-purple-500/20 rounded-lg">
                          <DollarSign className="h-3.5 w-3.5 text-purple-400" />
                        </div>
                        <span className="text-xs text-slate-300">Expected</span>
                      </div>
                      <button
                        onClick={() => setShowExpectedAmount(!showExpectedAmount)}
                        className="p-1.5 hover:bg-white/10 rounded-lg transition-colors"
                        title={showExpectedAmount ? "Hide amount" : "Show amount"}
                      >
                        {showExpectedAmount ? (
                          <Eye className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        ) : (
                          <EyeOff className="h-3.5 w-3.5 text-slate-400 hover:text-slate-200" />
                        )}
                      </button>
                    </div>
                    <p className="text-2xl font-bold text-purple-400">
                      {financeData.loading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        showExpectedAmount ? `₦${(financeData.totalExpected / 1000).toFixed(1)}K` : '₦****'
                      )}
                    </p>
                  </div>
                </div>

                {/* Total Cashflow - Donut Chart Visualization */}
                <div className="bg-white/5 backdrop-blur-sm rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <p className="text-sm text-slate-300">Collection Rate</p>
                    <select className="bg-white/10 text-white text-xs px-2 py-1 rounded-lg border-0 outline-none">
                      <option>This Month</option>
                    </select>
                  </div>
                  
                  <div className="relative h-48">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={[
                            { name: 'Received', value: financeData.totalReceived },
                            { name: 'Outstanding', value: financeData.totalExpected - financeData.totalReceived }
                          ]}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                          startAngle={90}
                          endAngle={450}
                        >
                          <Cell fill="#10b981" />
                          <Cell fill="#a78bfa" />
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <p className="text-xs text-slate-400">Total Expected</p>
                      <p className="text-2xl font-bold">
                        {financeData.loading ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          `${financeData.totalExpected > 0 ? ((financeData.totalReceived / financeData.totalExpected) * 100).toFixed(0) : 0}%`
                        )}
                      </p>
                      <p className="text-xs text-slate-400">Collected</p>
                    </div>
                  </div>

                  {/* Legend */}
                  <div className="grid grid-cols-2 gap-3 mt-4">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-green-500"></div>
                      <div>
                        <p className="text-xs text-slate-400">Received</p>
                        <p className="text-sm font-semibold">
                          {showReceivedAmount ? `₦${(financeData.totalReceived / 1000).toFixed(0)}K` : '₦****'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-purple-400"></div>
                      <div>
                        <p className="text-xs text-slate-400">Pending</p>
                        <p className="text-sm font-semibold">
                          {(showExpectedAmount && showReceivedAmount) 
                            ? `₦${((financeData.totalExpected - financeData.totalReceived) / 1000).toFixed(0)}K` 
                            : '₦****'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Section */}
            <div className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Quick Actions</h2>
              
              <div className="grid grid-cols-2 gap-3">
                {/* Fee Structures */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200"
                  onClick={() => onNavigate?.('fee-items')}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-3 bg-blue-500 rounded-2xl text-white">
                        <DollarSign className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs">Fee Structures</h3>
                        <p className="text-[10px] text-blue-700 mt-0.5">Configure fees</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Payment Approvals */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-green-50 to-green-100 border-green-200"
                  onClick={() => onNavigate?.('payment-approvals')}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-3 bg-green-500 rounded-2xl text-white relative">
                        <ClipboardCheck className="h-5 w-5" />
                        {pendingPayments > 0 && (
                          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[8px] font-bold rounded-full h-4 w-4 flex items-center justify-center">
                            {pendingPayments}
                          </span>
                        )}
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs">Approvals</h3>
                        <p className="text-[10px] text-green-700 mt-0.5">Review payments</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Teacher Salaries */}
                <Card 
                  className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200"
                  onClick={() => onNavigate?.('teacher-salaries')}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col items-center text-center gap-2">
                      <div className="p-3 bg-purple-500 rounded-2xl text-white">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-semibold text-xs">Salaries</h3>
                        <p className="text-[10px] text-purple-700 mt-0.5">Teacher pay</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>

            {/* Statistics Cards */}
            <div className="grid grid-cols-2 gap-3">
              <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 border-emerald-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-5 w-5 text-emerald-600 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">{((financeData.totalReceived / financeData.totalExpected) * 100).toFixed(1)}%</p>
                      <p className="text-[10px] text-slate-600">Collection Rate</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200">
                <CardContent className="p-4">
                  <div className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-amber-600 flex-shrink-0" />
                    <div>
                      <p className="text-lg font-semibold">{pendingPayments}</p>
                      <p className="text-[10px] text-slate-600">Pending Approvals</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle>Access Denied</CardTitle>
              <CardDescription>You don't have permission to access this module</CardDescription>
            </CardHeader>
          </Card>
        )}
      </div>
    );
  }

  // Fee Structures Page
  if (activeSection === 'fee-structures') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-900/40 to-purple-900/30 -mx-4 -mt-4 p-4 md:p-6 pb-24 md:pb-6">
        {/* Mobile App Header with Dark Gradient */}
        <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white rounded-3xl p-5 md:p-6 shadow-2xl mb-6 border border-slate-700/50">
          <div className="flex items-center gap-3">
            <button
              onClick={() => onNavigate?.('finance')}
              className="p-2.5 hover:bg-white/10 rounded-xl transition-all active:scale-95 backdrop-blur-sm border border-white/10"
              title="Back to Finance"
            >
              <ArrowLeft className="h-5 w-5 text-white" />
            </button>
            <div className="flex-1">
              <h1 className="text-2xl md:text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Fee Management
              </h1>
              <p className="text-slate-300 text-sm md:text-base mt-1">Choose your fee system</p>
            </div>
          </div>
        </div>

        {/* Fee System Selection Cards */}
        <div className="grid grid-cols-1 gap-5">
          {/* Fee Items - Recommended (NEW) */}
          <div 
            className="group cursor-pointer"
            onClick={() => onNavigate?.('fee-items')}
          >
            <div className="relative bg-gradient-to-br from-blue-600 via-blue-700 to-purple-700 rounded-3xl p-1 shadow-2xl hover:shadow-blue-500/30 transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]">
              <div className="bg-gradient-to-br from-slate-800 to-slate-900 rounded-[22px] p-5 md:p-6">
                <div className="flex items-start gap-4">
                  <div className="p-4 bg-gradient-to-br from-blue-500 to-purple-500 rounded-2xl flex-shrink-0 shadow-lg">
                    <DollarSign className="h-7 w-7 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-3">
                      <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white border-0 font-bold px-3 py-1 rounded-full">
                        ✨ Itemized System
                      </Badge>
                    </div>
                    <h3 className="text-xl md:text-2xl font-bold text-white mb-2 group-hover:text-blue-300 transition-colors">
                      Fee Items Management
                    </h3>
                    <p className="text-slate-300 text-sm md:text-base leading-relaxed mb-4">
                      Create itemized fees: Tuition, Boarding, Sports, etc.
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                        <span>Discount applies ONLY to Tuition</span>
                      </div>
                      <div className="flex items-center gap-2 text-green-400 text-sm">
                        <div className="w-5 h-5 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0">
                          <CheckCircle className="w-3 h-3" />
                        </div>
                        <span>Flexible per-student selection</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>


        </div>

        {/* Info Card at Bottom */}
        <div className="mt-6 bg-gradient-to-br from-blue-900/40 to-purple-900/30 backdrop-blur-sm border border-blue-500/30 rounded-3xl p-5">
          <div className="flex items-start gap-3">
            <Info className="h-5 w-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-slate-300 text-sm md:text-base">
                <strong className="text-blue-400">Tip:</strong> The itemized system gives you more control and transparency with individual fee items and student-specific discounts.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // New Itemized Fee Items Page
  if (activeSection === 'fee-items') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <FeeItemsManager onBack={() => onNavigate?.('finance')} />
      </div>
    );
  }

  // Old Fee Structure Page (legacy)
  if (activeSection === 'fee-structures-old') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <FeeStructureManager onBack={() => onNavigate?.('fee-structures')} />
      </div>
    );
  }

  // Payment Approvals Page
  if (activeSection === 'payment-approvals') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <DirectorPaymentApprovals onBack={() => onNavigate?.('finance')} />
      </div>
    );
  }

  // Teacher Salaries Page (Monthly Management)
  if (activeSection === 'teacher-salaries') {
    return <SalariesManagement onBack={() => onNavigate?.('finance')} />;
  }

  // Student Fee Assignment Page (Finance Admin)
  if (activeSection === 'student-fee-assignment') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <StudentFeeAssignment onBack={() => onNavigate?.('finance')} />
      </div>
    );
  }

  // Hostel Management Page
  if (activeSection === 'hostel') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              Hostel Management
            </CardTitle>
            <CardDescription>Manage hostel assignments, rooms, and student accommodations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Building className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium">Total Hostels</h3>
                  </div>
                  <p className="text-2xl">--</p>
                  <p className="text-sm text-slate-500 mt-1">Hostel buildings</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">Hostel Students</h3>
                  </div>
                  <p className="text-2xl">--</p>
                  <p className="text-sm text-slate-500 mt-1">Students in hostel</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <BookOpen className="h-5 w-5 text-purple-600" />
                    <h3 className="font-medium">Available Rooms</h3>
                  </div>
                  <p className="text-2xl">--</p>
                  <p className="text-sm text-slate-500 mt-1">Vacant rooms</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  Hostel management module coming soon. You will be able to assign students to hostels, 
                  manage room allocations, track hostel fees, and monitor hostel compliance.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Transport Management Page
  if (activeSection === 'transport') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bus className="h-5 w-5" />
              Transport Management
            </CardTitle>
            <CardDescription>Manage school buses, routes, and student transport assignments</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Bus className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium">Total Buses</h3>
                  </div>
                  <p className="text-2xl">--</p>
                  <p className="text-sm text-slate-500 mt-1">School buses</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Users className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium">Students Using Transport</h3>
                  </div>
                  <p className="text-2xl">--</p>
                  <p className="text-sm text-slate-500 mt-1">Active subscriptions</p>
                </div>
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-3 mb-2">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <h3 className="font-medium">Active Routes</h3>
                  </div>
                  <p className="text-2xl">--</p>
                  <p className="text-sm text-slate-500 mt-1">Transport routes</p>
                </div>
              </div>
              <div className="mt-6 p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-slate-700">
                  Transport management module coming soon. You will be able to manage bus routes, 
                  assign students to buses, track transport fees, and monitor driver schedules.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Issue Transcript PIN Page
  if (activeSection === 'transcript-pin') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <TranscriptPinManagement />
      </div>
    );
  }

  // Settings Page / More Menu
  if (activeSection === 'settings') {
    const isFinanceAdmin = userProfile?.role === 'finance_admin';
    
    // Finance Admin gets only password settings
    if (isFinanceAdmin) {
      return (
        <div className="p-4 md:p-6 pb-24 md:pb-6">
          <DirectorPasswordSettings />
        </div>
      );
    }
    
    // Director gets full "More" menu
    return (
      <div className="p-4 md:p-6 space-y-6 pb-24 md:pb-6">
        {/* Header */}
        <div>
          <h1 className="text-xl font-bold text-slate-900">More Options</h1>
          <p className="text-sm text-slate-600 mt-1">Additional features and settings</p>
        </div>

        {/* Academic Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Academic</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Classes */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-blue-50 to-blue-100/50 border-blue-200"
              onClick={() => onNavigate?.('classes')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-blue-500 rounded-2xl text-white">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Classes</h3>
                    <p className="text-[10px] text-blue-700 mt-0.5">Manage classes</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timetable */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-purple-50 to-purple-100/50 border-purple-200"
              onClick={() => onNavigate?.('timetable')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-purple-500 rounded-2xl text-white">
                    <Calendar className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Timetable</h3>
                    <p className="text-[10px] text-purple-700 mt-0.5">Class schedules</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Attendance */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-green-50 to-green-100/50 border-green-200"
              onClick={() => onNavigate?.('attendance')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-green-500 rounded-2xl text-white">
                    <ClipboardCheck className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Attendance</h3>
                    <p className="text-[10px] text-green-700 mt-0.5">View records</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Results Check */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-indigo-50 to-indigo-100/50 border-indigo-200"
              onClick={() => onNavigate?.('results')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-indigo-500 rounded-2xl text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Results</h3>
                    <p className="text-[10px] text-indigo-700 mt-0.5">Check results</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Monitoring Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Monitoring</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Gate Monitoring */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200"
              onClick={() => onNavigate?.('gate-monitoring')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-orange-500 rounded-2xl text-white">
                    <DoorOpen className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Gate</h3>
                    <p className="text-[10px] text-orange-700 mt-0.5">Clock-in/out</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transcript PIN */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-amber-50 to-amber-100/50 border-amber-200"
              onClick={() => onNavigate?.('transcript-pin')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-amber-500 rounded-2xl text-white">
                    <Award className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Transcript PIN</h3>
                    <p className="text-[10px] text-amber-700 mt-0.5">Issue PINs</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Management Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Management</h2>
          <div className="grid grid-cols-2 gap-3">
            {/* Hostel */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-teal-50 to-teal-100/50 border-teal-200"
              onClick={() => onNavigate?.('hostel')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-teal-500 rounded-2xl text-white">
                    <Building className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Hostel</h3>
                    <p className="text-[10px] text-teal-700 mt-0.5">Accommodations</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Transport */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border bg-gradient-to-br from-cyan-50 to-cyan-100/50 border-cyan-200"
              onClick={() => onNavigate?.('transport')}
            >
              <CardContent className="p-4">
                <div className="flex flex-col items-center text-center gap-2">
                  <div className="p-3 bg-cyan-500 rounded-2xl text-white">
                    <Bus className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs">Transport</h3>
                    <p className="text-[10px] text-cyan-700 mt-0.5">Buses & routes</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Settings Section */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">Settings</h2>
          <div className="grid grid-cols-1 gap-3">
            {/* E-Lesson Plan Settings */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-white"
              onClick={() => onNavigate?.('lesson-plan-settings')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-blue-600 rounded-2xl text-white">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">E-Lesson Plan Settings</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Configure lesson plan fields and requirements</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>

            {/* Password Settings */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-white"
              onClick={() => onNavigate?.('password-settings')}
            >
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-slate-900 rounded-2xl text-white">
                    <SettingsIcon className="h-5 w-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold text-sm">Password Settings</h3>
                    <p className="text-xs text-slate-600 mt-0.5">Change your password and security settings</p>
                  </div>
                  <ChevronRight className="h-5 w-5 text-slate-400" />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    );
  }

  // Lesson Plan Field Settings Page (from More menu)
  if (activeSection === 'lesson-plan-settings') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <LessonPlanFieldSettings onClose={() => onNavigate?.('settings')} />
      </div>
    );
  }

  // Password Settings Page (from More menu)
  if (activeSection === 'password-settings') {
    return (
      <div className="p-4 md:p-6 pb-24 md:pb-6">
        <DirectorPasswordSettings />
      </div>
    );
  }

  // Default fallback
  return (
    <div className="p-4 md:p-6">
      <Card>
        <CardHeader>
          <CardTitle>Page Not Found</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-600">This section is not yet implemented.</p>
        </CardContent>
      </Card>
    </div>
  );
}