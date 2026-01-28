import { useState, useEffect } from 'react';
import { createClient } from './utils/supabase/client';
import { projectId } from './utils/supabase/info';
import { Toaster } from './components/ui/sonner';
import { toast } from 'sonner@2.0.3';
import { Button } from './components/ui/button';
import { ArrowLeft, Loader2, Home, Wallet, Users, Settings } from 'lucide-react';
import { GraduationCap } from 'lucide-react';

// Auth
import { AuthProvider, useAuth } from './contexts/AuthContext';

// Pages
import { LoginForm } from './components/auth/LoginForm';
import { RegistrationPage } from './components/auth/RegistrationPage';
import { RegistrationStatusChecker } from './components/auth/RegistrationStatusChecker';
import { QuickUserCreator } from './components/auth/QuickUserCreator';
import { DatabaseSetup } from './components/auth/DatabaseSetup';
import { KVDebugViewer } from './components/debug/KVDebugViewer';
import { AlumniPortalHome } from './components/auth/AlumniPortalHome';
import { AlumniResultsChecker } from './components/auth/AlumniResultsChecker';
import { AlumniLoginPortal } from './components/auth/AlumniLoginPortal';
import { LandingPage } from './components/LandingPage';

// Student Components
import { StudentSidebar } from './components/StudentSidebar';
import { StudentBottomNav } from './components/StudentBottomNav';
import { StudentMore } from './components/student/StudentMore';
import { StudentOverview } from './components/student/StudentOverview';
import { StudentMyClass } from './components/student/StudentMyClass';
import { StudentMySubjects } from './components/student/StudentMySubjects';
import { StudentTimetable } from './components/student/StudentTimetable';
import { StudentCBTExams } from './components/student/StudentCBTExams';
import { StudentCBTResults } from './components/student/StudentCBTResults';
import { AttendanceOverview } from './components/student/AttendanceOverview';
import { StudentResultsWithPin } from './components/student/StudentResultsWithPin';
import { ResultPinViewer } from './components/student/ResultPinViewer';
import { StudentNotes } from './components/student/StudentNotes';
import { StudentSettings } from './components/student/StudentSettings';

// Teacher Components
import { TeacherSidebar } from './components/TeacherSidebar';
import { TeacherBottomNav } from './components/teacher/TeacherBottomNav';
import { TeacherMore } from './components/teacher/TeacherMore';
import { TeacherOverview } from './components/teacher/TeacherOverview';
import { MyClass } from './components/teacher/MyClass';
import { TeachersList } from './components/teacher/TeachersList';
import { MySubjects } from './components/teacher/MySubjects';
import { LessonPlanDashboard } from './components/teacher/LessonPlanDashboard';
import { TimetableModule } from './components/timetable/TimetableModule';
import { MarksModule } from './components/marks/MarksModule';
import { AttendanceMarking } from './components/teacher/AttendanceMarking';
import { Comments } from './components/teacher/Comments';
import { GateClockIn } from './components/teacher/GateClockIn';
import { TeacherCBT } from './components/teacher/TeacherCBT';
import { TeacherUploads } from './components/teacher/TeacherUploads';
import { TeacherSettings } from './components/teacher/TeacherSettings';

// Director Components
import { DirectorSidebar } from './components/DirectorSidebar';
import { DirectorDashboardContent } from './components/DirectorDashboardContent';
import { PrincipalLessonPlansReview } from './components/director/PrincipalLessonPlansReview';

// Transport Manager
import { TransportManagerDashboard } from './components/transport/TransportManagerDashboard';

// Principal Components
import { PrincipalSidebar } from './components/PrincipalSidebar';
import { DashboardContent } from './components/DashboardContent';

// Shared
import { Footer } from './components/Footer';
import { CustomToastContainer } from './components/ui/CustomToast';

function AuthenticatedApp() {
  const { user, profile, loading, databaseReady, checkingDatabase } = useAuth();
  const [activeSection, setActiveSection] = useState('overview');
  const [currentPage, setCurrentPage] = useState<'login' | 'register' | 'registration-status' | 'create-demo-users' | 'alumni' | 'alumni-results' | 'alumni-transcript' | 'kv-debug' | 'dashboard'>('login');
  const [alumniOption, setAlumniOption] = useState<'results' | 'transcript' | null>(null);
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [showDebug, setShowDebug] = useState(false);

  const supabase = createClient();

  // 🔥 Check if student is graduated and logout if needed (safety net)
  useEffect(() => {
    const checkGraduationStatus = async () => {
      if (profile?.role === 'student' && profile?.is_graduated === true) {
        console.log('[App] Student is graduated - logging out from student dashboard');
        await supabase.auth.signOut();
        // Don't redirect - let them stay on login page to see the message
        toast.error('You are no longer a student of this school. Please use the Alumni Portal.', { duration: 6000 });
      }
    };

    checkGraduationStatus();
  }, [profile?.role, profile?.is_graduated]);

  // Simple routing based on URL hash
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.substring(1);
      if (hash === 'register') {
        setCurrentPage('register');
      } else if (hash === 'registration-status') {
        setCurrentPage('registration-status');
      } else if (hash === 'create-demo-users') {
        setCurrentPage('create-demo-users');
      } else if (hash === 'kv-debug') {
        setCurrentPage('kv-debug');
      } else if (hash === 'alumni') {
        setCurrentPage('alumni');
        setAlumniOption(null);
      } else if (hash === 'alumni-results') {
        setCurrentPage('alumni-results');
      } else if (hash === 'alumni-transcript') {
        setCurrentPage('alumni-transcript');
      } else if (hash === 'login') {
        setCurrentPage('login');
      } else if (user && profile) {
        setCurrentPage('dashboard');
        window.location.hash = '';
      }
    };

    handleHashChange();
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [user, profile]);

  // Redirect to dashboard if user is logged in
  useEffect(() => {
    if (user && profile && (currentPage === 'login' || currentPage === 'register' || currentPage === 'registration-status' || currentPage === 'create-demo-users' || currentPage === 'alumni' || currentPage === 'alumni-results' || currentPage === 'alumni-transcript' || currentPage === 'kv-debug')) {
      setCurrentPage('dashboard');
      window.location.hash = '';
    }
  }, [user, profile, currentPage]);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timer = setTimeout(() => {
      if (loading || checkingDatabase) {
        setShowDebug(true);
      }
    }, 5000); // Show debug info after 5 seconds
    
    return () => clearTimeout(timer);
  }, [loading, checkingDatabase]);

  // Check if teacher is a class teacher
  useEffect(() => {
    const checkClassTeacher = async () => {
      if (profile?.role === 'teacher') {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) return;

          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-class-info`,
            {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
              },
            }
          );
          const data = await res.json();
          if (data.success && data.isClassTeacher) {
            setIsClassTeacher(true);
          }
        } catch (error) {
          console.error('Error checking class teacher status:', error);
        }
      }
    };

    checkClassTeacher();
  }, [profile?.role, profile?.id]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    window.location.hash = 'login';
    window.location.reload();
  };

  if (loading || checkingDatabase) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center max-w-md">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-blue-600" />
          <p className="text-slate-600 mb-4">
            {checkingDatabase ? 'Checking database...' : 'Loading...'}
          </p>
          
          {showDebug && (
            <div className="mt-4 p-4 bg-white rounded-lg border border-slate-200 text-left">
              <p className="text-sm font-medium mb-2">Debug Info:</p>
              <ul className="text-xs text-slate-600 space-y-1">
                <li>• Loading: {loading ? 'Yes' : 'No'}</li>
                <li>• Checking Database: {checkingDatabase ? 'Yes' : 'No'}</li>
                <li>• Database Ready: {databaseReady ? 'Yes' : 'No'}</li>
                <li>• User: {user ? 'Logged in' : 'Not logged in'}</li>
                <li>• Profile: {profile ? 'Loaded' : 'Not loaded'}</li>
              </ul>
              <Button 
                onClick={() => window.location.reload()} 
                className="mt-3 w-full"
                size="sm"
              >
                Refresh Page
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (!databaseReady) {
    return <DatabaseSetup />;
  }

  // Handle registration pages for non-authenticated users
  if (!user || !profile) {
    if (currentPage === 'register') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="container mx-auto px-4 py-8">
            <div className="mb-6">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setCurrentPage('login');
                  window.location.hash = 'login';
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </div>
            <RegistrationPage />
          </div>
        </div>
      );
    }

    if (currentPage === 'registration-status') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
          <div className="w-full max-w-md">
            <div className="mb-6 text-center">
              <Button 
                variant="ghost" 
                onClick={() => {
                  setCurrentPage('login');
                  window.location.hash = 'login';
                }}
                className="flex items-center gap-2"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Login
              </Button>
            </div>
            <RegistrationStatusChecker />
          </div>
        </div>
      );
    }

    if (currentPage === 'create-demo-users') {
      return <QuickUserCreator />;
    }

    if (currentPage === 'kv-debug') {
      return <KVDebugViewer />;
    }

    if (currentPage === 'alumni') {
      return (
        <AlumniPortalHome 
          onSelectOption={(option) => {
            setAlumniOption(option);
            if (option === 'results') {
              setCurrentPage('alumni-results');
              window.location.hash = 'alumni-results';
            } else {
              setCurrentPage('alumni-transcript');
              window.location.hash = 'alumni-transcript';
            }
          }}
          onBackToLogin={() => {
            setCurrentPage('login');
            window.location.hash = 'login';
          }}
        />
      );
    }

    if (currentPage === 'alumni-results') {
      return (
        <AlumniResultsChecker 
          onBack={() => {
            setCurrentPage('alumni');
            window.location.hash = 'alumni';
          }}
        />
      );
    }

    if (currentPage === 'alumni-transcript') {
      return (
        <AlumniLoginPortal 
          onBackToLogin={() => {
            setCurrentPage('alumni');
            window.location.hash = 'alumni';
          }}
        />
      );
    }

    // Show landing page if no specific page is set and no hash
    if (currentPage === 'login' && !window.location.hash) {
      return (
        <LandingPage
          onLoginClick={() => {
            setCurrentPage('login');
            window.location.hash = 'login';
          }}
          onRegisterClick={() => {
            setCurrentPage('register');
            window.location.hash = 'register';
          }}
          onAlumniClick={() => {
            setCurrentPage('alumni');
            window.location.hash = 'alumni';
          }}
        />
      );
    }

    return <LoginForm />;
  }

  // Student Dashboard
  if (profile?.role === 'student') {
    return (
      <div className="min-h-screen bg-slate-50">
        {/* Desktop Sidebar - Hidden on mobile */}
        <div className="hidden md:block">
          <StudentSidebar
            userProfile={profile}
            activeView={activeSection}
            onViewChange={setActiveSection}
          />
        </div>
        
        {/* Mobile Bottom Navigation */}
        <StudentBottomNav
          activeView={activeSection}
          onViewChange={setActiveSection}
        />
        
        <div className="md:ml-64 min-h-screen flex flex-col pb-16 md:pb-0">
          <div className="flex-1 pt-4 p-4 md:pt-6 md:p-6 max-w-7xl mx-auto w-full animate-in fade-in duration-300">
            {activeSection === 'overview' && <StudentOverview />}
            {activeSection === 'my-class' && <StudentMyClass />}
            {activeSection === 'my-subjects' && <StudentMySubjects />}
            {activeSection === 'timetable' && <StudentTimetable />}
            {activeSection === 'attendance' && <AttendanceOverview userProfile={profile} />}
            {activeSection === 'cbt-exams' && <StudentCBTExams />}
            {activeSection === 'cbt-results' && <StudentCBTResults />}
            {activeSection === 'results' && <StudentResultsWithPin />}
            {activeSection === 'result-pin' && <ResultPinViewer />}
            {activeSection === 'notes' && <StudentNotes />}
            {activeSection === 'more' && <StudentMore userProfile={profile} onNavigate={setActiveSection} />}
            {activeSection === 'settings-info' && <StudentSettings view="info" />}
            {activeSection === 'settings-password' && <StudentSettings view="password" />}
          </div>
          <Footer />
        </div>
      </div>
    );
  }

  // Teacher Dashboard
  if (profile?.role === 'teacher') {
    return (
      <div className="min-h-screen bg-slate-50 overflow-x-hidden">
        <TeacherSidebar
          activeView={activeSection}
          onViewChange={setActiveSection}
          userName={`${profile.first_name} ${profile.last_name}`}
          userEmail={profile.email}
          userId={profile.id}
          onLogout={handleLogout}
        />
        
        <div className="md:ml-64 min-h-screen flex flex-col overflow-x-hidden">
          <div className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full overflow-x-hidden pb-20 md:pb-0">
            {activeSection === 'overview' && (
              <TeacherOverview 
                userId={profile.id} 
                userName={`${profile.first_name} ${profile.last_name}`}
              />
            )}
            {activeSection === 'my-class' && <MyClass />}
            {activeSection === 'teachers' && <TeachersList />}
            {activeSection === 'my-subjects' && <MySubjects />}
            {activeSection === 'lesson-plans' && <LessonPlanDashboard />}
            {activeSection === 'timetable' && (
              <TimetableModule 
                userRole="teacher" 
                userId={profile.id}
                userName={`${profile.first_name} ${profile.last_name}`}
              />
            )}
            {activeSection === 'marks' && (
              <MarksModule 
                userRole="teacher" 
                userId={profile.id}
                userName={`${profile.first_name} ${profile.last_name}`}
              />
            )}
            {activeSection === 'attendance' && (
              <AttendanceMarking userProfile={profile} />
            )}
            {activeSection === 'comments' && <Comments />}
            {activeSection === 'gate-duty' && <GateClockIn />}
            {activeSection === 'cbt-questions' && <TeacherCBT />}
            {activeSection === 'uploads' && (
              <TeacherUploads 
                teacherId={profile.id}
                teacherName={`${profile.first_name} ${profile.last_name}`}
              />
            )}
            {activeSection === 'settings' && (
              <TeacherSettings 
                userId={profile.id}
                userEmail={profile.email}
                userName={`${profile.first_name} ${profile.last_name}`}
              />
            )}
            {activeSection === 'more' && (
              <TeacherMore 
                userProfile={profile}
                onNavigate={setActiveSection}
                isClassTeacher={isClassTeacher}
              />
            )}
          </div>
          <Footer />
          <TeacherBottomNav 
            activeView={activeSection}
            onViewChange={setActiveSection}
            isClassTeacher={isClassTeacher}
          />
        </div>
      </div>
    );
  }

  // Director Dashboard (includes Finance Admin)
  if (profile?.role === 'director' || profile?.role === 'finance_admin') {
    // Both Finance Admin and Director get mobile app UI with bottom navigation
    return (
      <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
        {/* Desktop Sidebar */}
        <div className="hidden md:block">
          <DirectorSidebar 
            activeItem={activeSection} 
            onItemClick={setActiveSection}
            userProfile={profile}
          />
        </div>
        
        {/* Main Content */}
        <div className="md:ml-64 flex flex-col min-h-screen relative">
          <div className="flex-1">
            <DirectorDashboardContent 
              activeSection={activeSection} 
              userProfile={profile}
              onNavigate={setActiveSection}
            />
          </div>
          
          {/* Mobile Bottom Navigation */}
          <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 md:hidden z-50">
            <div className="grid grid-cols-5 h-16">
              <button
                onClick={() => setActiveSection('overview')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeSection === 'overview' 
                    ? profile?.role === 'finance_admin' ? 'text-green-600' : 'text-slate-900' 
                    : 'text-gray-600'
                }`}
              >
                <Home className="h-5 w-5" />
                <span className="text-xs font-medium">Home</span>
              </button>
              <button
                onClick={() => setActiveSection('finance')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeSection === 'finance' 
                    ? profile?.role === 'finance_admin' ? 'text-green-600' : 'text-slate-900' 
                    : 'text-gray-600'
                }`}
              >
                <Wallet className="h-5 w-5" />
                <span className="text-xs font-medium">Finance</span>
              </button>
              <button
                onClick={() => setActiveSection('students')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeSection === 'students' 
                    ? profile?.role === 'finance_admin' ? 'text-green-600' : 'text-slate-900' 
                    : 'text-gray-600'
                }`}
              >
                <Users className="h-5 w-5" />
                <span className="text-xs font-medium">Students</span>
              </button>
              <button
                onClick={() => setActiveSection('teachers')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeSection === 'teachers' 
                    ? profile?.role === 'finance_admin' ? 'text-green-600' : 'text-slate-900' 
                    : 'text-gray-600'
                }`}
              >
                <GraduationCap className="h-5 w-5" />
                <span className="text-xs font-medium">Teachers</span>
              </button>
              <button
                onClick={() => setActiveSection('settings')}
                className={`flex flex-col items-center justify-center gap-1 transition-colors ${
                  activeSection === 'settings' 
                    ? profile?.role === 'finance_admin' ? 'text-green-600' : 'text-slate-900' 
                    : 'text-gray-600'
                }`}
              >
                <Settings className="h-5 w-5" />
                <span className="text-xs font-medium">More</span>
              </button>
            </div>
          </nav>
          
          <div className="hidden md:block">
            <Footer />
          </div>
        </div>
      </div>
    );
  }

  // Transport Manager Dashboard
  if (profile?.role === 'transport_manager') {
    return (
      <TransportManagerDashboard
        userId={profile.id}
        userName={`${profile.first_name} ${profile.last_name}`}
        userEmail={profile.email}
      />
    );
  }

  // Admin/Principal Dashboard
  return (
    <div className="min-h-screen bg-slate-50">
      <PrincipalSidebar 
        activeItem={activeSection} 
        onItemClick={setActiveSection}
        userProfile={profile}
      />
      
      <div className="md:ml-64 flex flex-col min-h-screen relative bg-slate-50">
        <div className="flex-1 pt-16 md:pt-0 bg-slate-50">
          <DashboardContent 
            activeSection={activeSection} 
            userProfile={profile}
            onNavigate={setActiveSection}
          />
        </div>
        <Footer />
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
      <Toaster 
        richColors 
        position="top-right" 
        expand={true}
        toastOptions={{
          duration: 4000,
        }}
      />
      <CustomToastContainer />
    </AuthProvider>
  );
}