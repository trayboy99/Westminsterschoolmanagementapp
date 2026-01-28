import React, { useState, useEffect } from 'react';
import { ActivityLog } from './ActivityLog';
import { AdminChartsSection } from './AdminChartsSection';
import { TimetableModule } from './timetable/TimetableModule';
import { MarksModule } from './marks/MarksModule';
import { AttendanceViewer } from './admin/AttendanceViewer';
import { GateMonitoring } from './admin/GateMonitoring';
import { CBTAdminModule } from './admin/CBTAdminModule';
import { PrincipalLessonPlansReview } from './director/PrincipalLessonPlansReview';
import { LessonPlanFieldSettings } from './director/LessonPlanFieldSettings';
import { SchoolWideAttendance } from './admin/SchoolWideAttendance';
import { getFullName } from '../utils/supabase/database';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { WeekBadge } from './shared/WeekBadge';
import { UploadModule } from './uploads/UploadModule';
import { SubjectsClassesModule } from './academic/SubjectsClassesModule';
import { ExamsManager } from './academic/ExamsManager';
import { StudentsManagementModern } from './StudentsManagementModern';
import { TeachersManager } from './TeachersManager';
import { UsersManagement } from './UsersManagement';
import { GraduatedStudentsManager } from './GraduatedStudentsManager';
import { AdminResultManagement } from './results/AdminResultManagement';
import { PrincipalComments } from './results/PrincipalComments';
import { SettingsManagement } from './results/SettingsManagement';
import { PinManagement } from './PinManagement';
import { PromotionManagement } from './results/PromotionManagement';
import { DeadlineCountdown } from './uploads/DeadlineCountdown';
import { OverviewCards } from './OverviewCards';
import { PendingApprovals } from './PendingApprovals';
import { QuickActions } from './QuickActions';

interface DashboardContentProps {
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

export function DashboardContent({ activeSection, userProfile, onNavigate }: DashboardContentProps) {
  const [activeDeadlines, setActiveDeadlines] = useState<any[]>([]);
  const [schoolName, setSchoolName] = useState<string>('');
  const [currentSession, setCurrentSession] = useState('');
  const [currentTerm, setCurrentTerm] = useState('');

  // Check if user can view pending approvals (only IT admins)
  const canViewPendingApprovals = userProfile?.role === 'it_admin';

  // Fetch active deadlines and school name
  useEffect(() => {
    fetchActiveDeadlines();
    fetchSchoolName();
    fetchCurrentSessionAndTerm();
  }, []);

  const fetchCurrentSessionAndTerm = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      const data = await res.json();
      
      if (data.success && data.sessions && data.terms) {
        const activeSess = data.sessions.find((s: any) => s.is_current);
        const activeTerm = data.terms.find((t: any) => t.is_current);
        
        if (activeSess && activeTerm) {
          setCurrentSession(activeSess.session_name);
          setCurrentTerm(activeTerm.term_name);
        }
      }
    } catch (error) {
      console.error('Error fetching session/term:', error);
    }
  };

  const fetchActiveDeadlines = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-settings`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      const data = await res.json();
      
      if (data.success && data.settings?.deadlines) {
        const enabled = data.settings.deadlines.filter((d: any) => d.enabled);
        setActiveDeadlines(enabled);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  const fetchSchoolName = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/school-settings`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );
      const data = await res.json();
      if (data.success && data.settings?.school_name) {
        setSchoolName(data.settings.school_name);
      }
    } catch (error) {
      // Error handled silently
    }
  };

  // Handle Timetable section
  if (activeSection === 'timetable') {
    return (
      <div className="p-4 md:p-6">
        <TimetableModule 
          userRole="admin"
          userId={userProfile?.email || "admin"}
          userName={userProfile ? getFullName(userProfile) : "Admin User"}
        />
      </div>
    );
  }

  // Handle Marks Entry section
  if (activeSection === 'marks') {
    console.log('[DashboardContent] Marks section - userProfile.role:', userProfile?.role);
    return (
      <div className="p-4 md:p-6">
        <MarksModule 
          userRole={userProfile?.role as any || "principal"} 
          userId={userProfile?.email || "P001"} 
          userName={userProfile ? getFullName(userProfile) : "Admin User"}
        />
      </div>
    );
  }

  // Handle Uploads section
  if (activeSection === 'uploads') {
    return (
      <div className="p-4 md:p-6">
        <UploadModule 
          userRole="admin" 
          userId={userProfile?.email || "P001"} 
          userName={userProfile ? getFullName(userProfile) : "Admin User"}
        />
      </div>
    );
  }

  // Handle Subjects & Classes sections
  if (activeSection === 'subjects' || activeSection === 'classes') {
    if (!userProfile?.id) {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Authentication Required</h2>
            <p className="text-slate-600 text-sm md:text-base">Please log in to access this section.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <SubjectsClassesModule userProfile={userProfile} />
      </div>
    );
  }

  // Handle Exams section
  if (activeSection === 'exams') {
    if (!userProfile?.id) {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Authentication Required</h2>
            <p className="text-slate-600 text-sm md:text-base">Please log in to access this section.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <ExamsManager userRole={userProfile.role} />
      </div>
    );
  }

  // Handle Students section
  if (activeSection === 'students') {
    if (!userProfile?.id) {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Authentication Required</h2>
            <p className="text-slate-600 text-sm md:text-base">Please log in to access this section.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <StudentsManagementModern />
      </div>
    );
  }

  // Handle Teachers section
  if (activeSection === 'teachers') {
    if (!userProfile?.id) {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Authentication Required</h2>
            <p className="text-slate-600 text-sm md:text-base">Please log in to access this section.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <TeachersManager />
      </div>
    );
  }

  // Handle Users section (IT Admin only)
  if (activeSection === 'users') {
    if (!userProfile?.id) {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Authentication Required</h2>
            <p className="text-slate-600 text-sm md:text-base">Please log in to access this section.</p>
          </div>
        </div>
      );
    }

    // Only IT admins (it_admin role) can access this
    if (userProfile.role !== 'it_admin') {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Access Denied</h2>
            <p className="text-slate-600 text-sm md:text-base">This section is only accessible to IT Administrators.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <UsersManagement />
      </div>
    );
  }

  // Handle Graduated Students section (IT Admin only)
  if (activeSection === 'graduated-students') {
    if (!userProfile?.id) {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Authentication Required</h2>
            <p className="text-slate-600 text-sm md:text-base">Please log in to access this section.</p>
          </div>
        </div>
      );
    }

    // Only IT admins (it_admin role) can access this
    if (userProfile.role !== 'it_admin') {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Access Denied</h2>
            <p className="text-slate-600 text-sm md:text-base">This section is only accessible to IT Administrators.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <GraduatedStudentsManager />
      </div>
    );
  }

  // Handle Results section
  if (activeSection === 'results') {
    return (
      <div className="p-4 md:p-6">
        <AdminResultManagement />
      </div>
    );
  }

  // Handle Comments section
  if (activeSection === 'comments') {
    return (
      <div className="p-4 md:p-6">
        <PrincipalComments />
      </div>
    );
  }

  // Handle E-Lesson Plans Review section (Principal only)
  if (activeSection === 'lesson-plans-review') {
    // Only principals can access this
    if (userProfile?.role !== 'principal') {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Access Denied</h2>
            <p className="text-slate-600 text-sm md:text-base">This section is only accessible to Principals.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <PrincipalLessonPlansReview />
      </div>
    );
  }

  // Handle E-Lesson Plan Field Settings section (Principal only)
  if (activeSection === 'lesson-plan-settings') {
    // Only principals can access this
    if (userProfile?.role !== 'principal') {
      return (
        <div className="p-4 md:p-6">
          <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
            <h2 className="text-xl md:text-2xl mb-4">Access Denied</h2>
            <p className="text-slate-600 text-sm md:text-base">This section is only accessible to Principals.</p>
          </div>
        </div>
      );
    }

    return (
      <div className="p-4 md:p-6">
        <LessonPlanFieldSettings onClose={() => onNavigate?.('settings')} />
      </div>
    );
  }

  // Handle Settings section
  if (activeSection === 'settings') {
    return (
      <div className="p-4 md:p-6">
        <SettingsManagement />
      </div>
    );
  }

  // Handle PIN Management section
  if (activeSection === 'pin-management') {
    return (
      <div className="p-4 md:p-6">
        <PinManagement />
      </div>
    );
  }

  // Handle Attendance section
  if (activeSection === 'attendance') {
    return (
      <div className="p-4 md:p-6">
        <AttendanceViewer userRole={userProfile?.role || 'principal'} />
      </div>
    );
  }

  // Handle Gate Monitoring section
  if (activeSection === 'gate-monitoring') {
    return (
      <div className="p-4 md:p-6">
        <GateMonitoring />
      </div>
    );
  }

  // Handle CBT Exams section
  if (activeSection === 'cbt-exams') {
    return (
      <div className="p-4 md:p-6">
        <CBTAdminModule />
      </div>
    );
  }

  // Handle Promotions section
  if (activeSection === 'promotions') {
    return (
      <div className="p-4 md:p-6">
        <PromotionManagement />
      </div>
    );
  }

  if (activeSection !== 'overview') {
    return (
      <div className="p-4 md:p-6">
        <div className="bg-white rounded-lg border p-6 md:p-8 text-center">
          <h2 className="text-xl md:text-2xl mb-4">
            {activeSection.charAt(0).toUpperCase() + activeSection.slice(1)} Section
          </h2>
          <p className="text-slate-600 mb-4 text-sm md:text-base">
            This section is under development. The full {activeSection} management interface will be available here.
          </p>
          <div className="bg-slate-50 rounded-lg p-4 text-left max-w-md mx-auto">
            <h3 className="font-medium mb-2 text-sm md:text-base">Planned Features:</h3>
            <ul className="text-xs md:text-sm text-slate-600 space-y-1">
              {getPlannedFeatures(activeSection).map((feature, index) => (
                <li key={index}>• {feature}</li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6">
      <div className="pt-2 md:pt-0 space-y-2 md:space-y-3">
        <div className="flex items-start justify-between gap-4">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            {userProfile?.role === 'it_admin' ? 'IT Admin Dashboard' : 'Principal Dashboard'}
          </h1>
          {/* Colorful Week Badge */}
          <div className="flex-shrink-0">
            <WeekBadge variant="detailed" />
          </div>
        </div>
        <p className="text-xs sm:text-sm md:text-base text-slate-600">
          Welcome back, <span className="font-semibold text-slate-800">{userProfile ? getFullName(userProfile) : 'Dr. Sarah Johnson'}</span>. Here's what's happening at <span className="font-semibold text-slate-800">{schoolName || 'your school'}</span> today.
        </p>
      </div>

      {/* Active Deadlines - Show prominently at the top */}
      {activeDeadlines.length > 0 && (
        <DeadlineCountdown 
          deadlines={activeDeadlines} 
          userRole={userProfile?.role === 'teacher' ? 'teacher' : 'admin'} 
        />
      )}

      <OverviewCards />

      {/* Charts Section for Admins */}
      <AdminChartsSection />

      {/* School-Wide Attendance Dashboard */}
      {currentSession && currentTerm && (
        <SchoolWideAttendance 
          selectedSession={currentSession} 
          selectedTerm={currentTerm} 
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <div className="space-y-4 md:space-y-6">
          {canViewPendingApprovals && <PendingApprovals />}
          <QuickActions onNavigate={onNavigate} />
        </div>
      </div>
    </div>
  );
}

function getPlannedFeatures(section: string): string[] {
  const features: { [key: string]: string[] } = {
    teachers: [
      'Teacher roster management',
      'Performance tracking',
      'Subject assignment',
      'Schedule management',
      'Professional development tracking'
    ],
    students: [
      'Student enrollment',
      'Academic records',
      'Attendance tracking',
      'Parent contact information',
      'Disciplinary records'
    ],
    subjects: [
      'Class group management with teacher assignments',
      'Academic subject management with department organization',
      'Subject code standardization and teacher specializations',
      'Real-time statistics and overview dashboards',
      'Role-based access control for academic administration'
    ],
    timetable: [
      'Automated timetable generation',
      'Drag-and-drop schedule editor',
      'Teacher availability management',
      'Conflict detection and resolution',
      'Multi-format export (PDF, Excel)',
      'Role-based timetable views'
    ],
    exams: [
      'Exam scheduling',
      'Question paper management',
      'Invigilation assignments',
      'Grade boundaries',
      'Result processing'
    ],
    marks: [
      'Tabbed marks entry (Midterm/Terminal)',
      'Auto-fill terminal from midterm marks',
      'Multi-status approval workflow',
      'Progress tracking with visual indicators',
      'Comprehensive audit logging',
      'Role-based access control'
    ],
    results: [
      'Result publication',
      'Transcript generation',
      'Performance analytics',
      'Comparative analysis',
      'Export capabilities'
    ],
    comments: [
      'Behavioral assessments',
      'Teacher comments',
      'Progress notes',
      'Parent communications',
      'Recommendation letters'
    ],
    uploads: [
      'E-notes and exam questions upload',
      'Structured folder access (session/term/subject/week)',
      'Deadline management and compliance tracking',
      'Teacher submission monitoring',
      'Student file explorer with download/preview',
      'Upload settings and permissions control'
    ],
    promotions: [
      'Promotion criteria',
      'Student progression',
      'Grade advancement',
      'Academic requirements',
      'Promotion reports'
    ],
    pins: [
      'PIN generation',
      'Access control',
      'Security management',
      'Usage tracking',
      'Expiration management'
    ],
    finance: [
      'Fee structure',
      'Payment tracking',
      'Financial reports',
      'Outstanding balances',
      'Payment history'
    ],
    settings: [
      'System configuration',
      'User permissions',
      'Academic calendar',
      'Notification settings',
      'Data backup'
    ],
    audit: [
      'System logs',
      'User activity',
      'Data changes',
      'Security events',
      'Compliance reporting'
    ]
  };

  return features[section] || ['Feature planning in progress...'];
}