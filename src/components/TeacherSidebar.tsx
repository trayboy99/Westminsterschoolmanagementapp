import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  GraduationCap, 
  Users, 
  BookOpen, 
  FileText, 
  Calendar, 
  ClipboardCheck, 
  FileQuestion, 
  MessageSquare, 
  DoorOpen, 
  Upload, 
  Settings, 
  ChevronRight, 
  ChevronLeft, 
  LogOut 
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Separator } from './ui/separator';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { ProfileSettings } from './ProfileSettings';
import { WeekBadge } from './shared/WeekBadge';
import { useAuth } from '../contexts/AuthContext';

interface TeacherSidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  userName: string;
  userEmail: string;
  userId: string;
  onLogout: () => void;
}

export function TeacherSidebar({
  activeView,
  onViewChange,
  userName,
  userEmail,
  userId,
  onLogout
}: TeacherSidebarProps) {
  const { refreshProfile } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [isClassTeacher, setIsClassTeacher] = useState(false);
  const [loading, setLoading] = useState(true);
  const [notificationCount, setNotificationCount] = useState(0);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('Teacher Portal');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  
  const supabase = createClient();

  useEffect(() => {
    checkIfClassTeacher();
    fetchProfilePhoto();
    fetchSchoolSettings();
  }, [userId]);

  const checkIfClassTeacher = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Check if this teacher is assigned as a class teacher
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-class-info`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success && data.isClassTeacher) {
        setIsClassTeacher(true);
      }
    } catch (error) {
      console.error('Error checking class teacher status:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchProfilePhoto = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/${userId}`,
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
      console.error('[TeacherSidebar] Failed to fetch profile photo:', error);
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
      console.error('[TeacherSidebar] Failed to fetch school settings:', error);
    }
  };

  const handleProfileUpdate = () => {
    // Refresh profile photo after update
    fetchProfilePhoto();
    refreshProfile();
  };

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    ...(isClassTeacher ? [{ id: 'my-class', label: 'My Class', icon: GraduationCap }] : []),
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'my-subjects', label: 'My Subjects', icon: BookOpen },
    { id: 'lesson-plans', label: 'E-Lesson Plans', icon: FileText },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'marks', label: 'Marks', icon: ClipboardCheck },
    { id: 'cbt-questions', label: 'CBT Questions', icon: FileQuestion },
    ...(isClassTeacher ? [{ id: 'attendance', label: 'Attendance', icon: ClipboardCheck }] : []),
    ...(isClassTeacher ? [{ id: 'comments', label: 'Comments', icon: MessageSquare }] : []),
    { id: 'gate-duty', label: 'Gate Duty', icon: DoorOpen },
    { id: 'uploads', label: 'Uploads', icon: Upload }
  ];

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleMenuItemClick = (viewId: string) => {
    onViewChange(viewId);
    setMobileMenuOpen(false);
  };

  // Sidebar content component
  const SidebarContent = ({ isMobile = false }: { isMobile?: boolean }) => (
    <div className={`bg-slate-900 text-white h-full flex flex-col ${!isMobile && 'transition-all duration-300'} ${!isMobile && (collapsed ? 'w-20' : 'w-64')}`}>
      {/* Header */}
      <div className="p-4 flex items-center justify-between flex-shrink-0">
        {(!collapsed || isMobile) && (
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
              <p className="text-xs text-slate-400 mt-0.5">Teacher Dashboard</p>
            </div>
          </div>
        )}
        {collapsed && !isMobile && (
          schoolLogo ? (
            <div className="flex-shrink-0 w-10 h-10 bg-white rounded-lg p-1 flex items-center justify-center mx-auto">
              <img src={schoolLogo} alt="School Logo" className="w-full h-full object-contain" />
            </div>
          ) : (
            <div className="flex-shrink-0 w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center mx-auto">
              <GraduationCap className="h-5 w-5 text-white" />
            </div>
          )
        )}
        {!isMobile && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCollapsed(!collapsed)}
            className="text-white hover:bg-slate-800 flex-shrink-0"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </Button>
        )}
      </div>

      <Separator className="bg-slate-700 flex-shrink-0" />

      {/* Menu Items - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <div className="px-3 py-4 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeView === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? 'secondary' : 'ghost'}
                className={`w-full ${collapsed && !isMobile ? 'justify-center px-2' : 'justify-start'} ${
                  isActive 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                onClick={() => handleMenuItemClick(item.id)}
              >
                <Icon className={`h-5 w-5 ${collapsed && !isMobile ? '' : 'mr-3'}`} />
                {(!collapsed || isMobile) && <span>{item.label}</span>}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Bottom Section - Settings, Profile, Logout */}
      <div className="flex-shrink-0 border-t border-slate-700">
        {/* Settings Button */}
        <div className="px-3 py-2">
          <Button
            variant={activeView === 'settings' ? 'secondary' : 'ghost'}
            className={`w-full ${collapsed && !isMobile ? 'justify-center px-2' : 'justify-start'} ${
              activeView === 'settings'
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
            onClick={() => handleMenuItemClick('settings')}
          >
            <Settings className={`h-5 w-5 ${collapsed && !isMobile ? '' : 'mr-3'}`} />
            {(!collapsed || isMobile) && <span>Settings</span>}
          </Button>
        </div>

        <Separator className="bg-slate-700" />

        {/* User Profile */}
        <div className="p-4 bg-slate-800/50">
          <div className="text-xs text-slate-400 mb-2">Logged in as</div>
          <div 
            className={`flex items-center gap-3 ${collapsed && !isMobile ? 'justify-center' : ''} cursor-pointer hover:bg-slate-700/50 p-2 rounded-lg transition-colors`}
            onClick={() => setShowProfileDialog(true)}
          >
            <Avatar className="h-10 w-10 bg-blue-600 flex-shrink-0">
              <AvatarImage src={profilePhotoUrl} alt="Profile" />
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            {(!collapsed || isMobile) && (
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm text-white">{userName}</p>
                <p className="text-xs text-slate-400 truncate">Teacher</p>
              </div>
            )}
          </div>
          {(!collapsed || isMobile) && (
            <>
              <p className="text-xs text-slate-400 mt-2">Click to edit profile</p>
              <div className="mt-3">
                <WeekBadge variant="compact" className="w-full justify-center" />
              </div>
            </>
          )}
        </div>

        {/* Logout */}
        <div className="p-4">
          <Button
            variant="ghost"
            className={`w-full bg-white text-slate-700 hover:bg-slate-100 ${
              collapsed && !isMobile ? 'justify-center px-2' : 'justify-start'
            }`}
            onClick={onLogout}
          >
            <LogOut className={`h-5 w-5 ${collapsed && !isMobile ? '' : 'mr-2'}`} />
            {(!collapsed || isMobile) && <span>Sign Out</span>}
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar - Hidden on mobile */}
      <div className="hidden md:block fixed left-0 top-0 h-screen">
        <SidebarContent isMobile={false} />
      </div>

      {/* Mobile: No hamburger menu needed - using bottom nav instead */}

      {/* Profile Settings Dialog */}
      <ProfileSettings 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog}
        onProfileUpdate={handleProfileUpdate}
      />
    </>
  );
}