import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { toast } from 'sonner';
import { StudentProfileSettings } from './StudentProfileSettings';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { WeekBadge } from './shared/WeekBadge';
import { useAuth } from '../contexts/AuthContext';
import { Button } from './ui/button';
import { Sheet, SheetContent, SheetTitle, SheetDescription } from './ui/sheet';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { 
  Home, 
  GraduationCap, 
  BookOpen, 
  Clock, 
  ClipboardCheck, 
  MonitorPlay, 
  Award, 
  FileText, 
  Key, 
  StickyNote, 
  Settings, 
  Lock, 
  LogOut, 
  Menu, 
  X,
  ChevronDown,
  ChevronRight
} from 'lucide-react';

interface StudentSidebarProps {
  userProfile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    role: string;
  };
  activeView: string;
  onViewChange: (view: string) => void;
}

export function StudentSidebar({ userProfile, activeView, onViewChange }: StudentSidebarProps) {
  const { refreshProfile } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('Westminster College Lagos');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    fetchProfilePhoto();
    fetchSchoolSettings();
  }, [userProfile.id]);

  const fetchProfilePhoto = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-profile/${userProfile.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (data.success && data.profile?.photo_url) {
        setProfilePhotoUrl(data.profile.photo_url);
      }
    } catch (error) {
      console.error('[StudentSidebar] Failed to fetch profile photo:', error);
    }
  };

  const fetchSchoolSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/school-settings`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (data.success && data.settings) {
        if (data.settings.school_name) {
          setSchoolName(data.settings.school_name);
        }
        if (data.settings.logo_url) {
          setSchoolLogo(data.settings.logo_url);
        }
      }
    } catch (error) {
      console.error('[StudentSidebar] Failed to fetch school settings:', error);
    }
  };

  const handleProfileUpdate = () => {
    // Refresh profile photo after update
    fetchProfilePhoto();
    refreshProfile();
  };

  const handleLogout = async () => {
    try {
      // Sign out - ignore session missing errors as user wants to logout anyway
      const { error } = await supabase.auth.signOut();
      
      // Only throw if it's not a session missing error
      if (error && error.message !== 'Auth session missing!') {
        throw error;
      }
      
      toast.success('Logged out successfully');
      // Navigate to login page
      window.location.hash = 'login';
      window.location.reload();
    } catch (error: any) {
      console.error('Logout error:', error);
      // If session is already missing, just redirect to login
      if (error?.message?.includes('session missing')) {
        toast.success('Logged out successfully');
        window.location.hash = 'login';
        window.location.reload();
      } else {
        toast.error('Failed to logout');
      }
    }
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'my-class', label: 'My Class', icon: GraduationCap },
    { id: 'my-subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'timetable', label: 'Timetable Schedule', icon: Clock },
    { id: 'attendance', label: 'My Attendance', icon: ClipboardCheck },
    { id: 'cbt-exams', label: 'CBT Exams', icon: MonitorPlay },
    { id: 'cbt-results', label: 'CBT Results', icon: Award },
    { id: 'results', label: 'Results', icon: FileText },
    { id: 'result-pin', label: 'Result PIN Viewer', icon: Key },
    { id: 'notes', label: 'Learning Materials', icon: StickyNote },
  ];

  const settingsItems = [
    { id: 'settings-password', label: 'Change Password', icon: Lock },
  ];

  const handleMenuItemClick = (viewId: string) => {
    onViewChange(viewId);
    setMobileMenuOpen(false); // Close mobile menu after selection
  };

  // Sidebar content component
  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white">
      {/* Header */}
      <div className="p-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          {schoolLogo ? (
            <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg p-1.5 flex items-center justify-center">
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-bold text-white leading-tight line-clamp-2">{schoolName}</h1>
            <p className="text-xs text-slate-400 mt-0.5">Student Dashboard</p>
          </div>
        </div>
      </div>

      <Separator className="bg-slate-700 flex-shrink-0" />

      {/* Navigation - Takes remaining space */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-3 py-4 space-y-1">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full justify-start gap-3 ${
                  isActive ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                onClick={() => handleMenuItemClick(item.id)}
              >
                <Icon className="h-5 w-5" />
                <span>{item.label}</span>
              </Button>
            );
          })}

          <Separator className="my-2 bg-slate-700" />

          {/* Settings Collapsible */}
          <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
            <CollapsibleTrigger asChild>
              <Button
                variant="ghost"
                className="w-full justify-start gap-3 text-slate-300 hover:bg-slate-800 hover:text-white"
              >
                <Settings className="h-5 w-5" />
                <span className="flex-1 text-left">Settings</span>
                {settingsOpen ? (
                  <ChevronDown className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </CollapsibleTrigger>
            <CollapsibleContent className="pl-4 space-y-1 mt-1">
              {settingsItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeView === item.id;
                
                return (
                  <Button
                    key={item.id}
                    variant={isActive ? 'secondary' : 'ghost'}
                    className={`w-full justify-start gap-3 ${
                      isActive ? 'bg-blue-600 text-white hover:bg-blue-700' : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                    }`}
                    onClick={() => handleMenuItemClick(item.id)}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Button>
                );
              })}
            </CollapsibleContent>
          </Collapsible>
        </div>
      </div>

      {/* User Profile Footer - Always visible at bottom */}
      <div className="flex-shrink-0 border-t border-slate-700">
        <div className="p-4 bg-slate-800/50">
          <div className="text-xs text-slate-400 mb-2">Logged in as</div>
          <div 
            className="flex items-center gap-3 cursor-pointer hover:bg-slate-700/50 p-2 rounded-lg transition-colors"
            onClick={() => setShowProfileDialog(true)}
          >
            <Avatar className="h-10 w-10 bg-blue-600 flex-shrink-0">
              <AvatarImage src={profilePhotoUrl} alt="Profile" />
              <AvatarFallback className="bg-blue-600 text-white">
                {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm text-white">
                {userProfile.first_name} {userProfile.last_name}
              </p>
              <p className="text-xs text-slate-400 truncate">Student</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Click to edit profile</p>
          <div className="mt-3">
            <WeekBadge variant="compact" className="w-full justify-center" />
          </div>
        </div>

        {/* Logout Button */}
        <div className="p-4 pt-0">
          <Button
            variant="ghost"
            className="w-full bg-white text-slate-700 hover:bg-slate-100 justify-start gap-2"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            <span>Sign Out</span>
          </Button>
        </div>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block md:w-64 border-r md:fixed md:h-screen md:overflow-y-auto">
        <SidebarContent />
      </div>

      {/* Mobile Hamburger Button - Scrolls with page */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 md:hidden bg-white shadow-lg border"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
      >
        {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Mobile Sidebar - Sheet */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="p-0 w-64">
          <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
          <SheetDescription className="sr-only">
            Student portal navigation menu
          </SheetDescription>
          <SidebarContent />
        </SheetContent>
      </Sheet>

      {/* Student Profile Settings Dialog */}
      <StudentProfileSettings 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog}
        onProfileUpdate={handleProfileUpdate}
        studentId={userProfile.id}
      />
    </>
  );
}