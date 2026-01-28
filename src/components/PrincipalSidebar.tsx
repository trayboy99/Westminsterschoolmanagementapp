import { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  GraduationCap, 
  BookOpen, 
  Calendar, 
  ClipboardCheck, 
  FileText, 
  MessageSquare, 
  Upload, 
  TrendingUp, 
  Key, 
  DollarSign, 
  Settings, 
  FileSearch,
  Menu,
  X,
  Clock,
  LogOut,
  User,
  School,
  UserCog,
  DoorOpen,
  FileQuestion
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';
import { getFullName } from '../utils/supabase/database';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ProfileSettings } from './ProfileSettings';

interface SidebarProps {
  activeItem: string;
  onItemClick: (item: string) => void;
  userProfile?: {
    first_name: string;
    middle_name?: string;
    last_name: string;
    role: string;
    email: string;
  };
}

export function PrincipalSidebar({ activeItem, onItemClick, userProfile }: SidebarProps) {
  const { signOut, refreshProfile } = useAuth();
  // Get dashboard title based on role
  const getDashboardTitle = () => {
    switch (userProfile?.role) {
      case 'it_admin':
        return 'IT Admin Dashboard';
      case 'finance_admin':
        return 'Finance Admin Dashboard';
      case 'principal':
        return 'Principal Dashboard';
      default:
        return 'Principal Dashboard';
    }
  };

  // Define menu items based on user role
  const getMenuItems = () => {
    const baseMenuItems = [
      { id: 'overview', label: 'Overview', icon: Home },
      { id: 'teachers', label: 'Teachers', icon: Users },
      { id: 'students', label: 'Students', icon: GraduationCap },
      { id: 'subjects', label: 'Subjects & Classes', icon: BookOpen },
      { id: 'timetable', label: 'Timetable', icon: Clock },
      { id: 'exams', label: 'Exams', icon: Calendar },
      { id: 'marks', label: 'Marks Entry', icon: ClipboardCheck },
      { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
      { id: 'gate-monitoring', label: 'Gate Monitoring', icon: DoorOpen },
      { id: 'cbt-exams', label: 'CBT Exams', icon: FileQuestion },
      { id: 'results', label: 'Results', icon: TrendingUp },
      { id: 'comments', label: 'Comments', icon: MessageSquare },
      { id: 'uploads', label: 'Uploads', icon: Upload },
      { id: 'promotions', label: 'Promotions', icon: TrendingUp },
      { id: 'pin-management', label: 'PIN Management', icon: Key },
    ];

    // Add E-Lesson Plans menu for Principal ONLY
    if (userProfile?.role === 'principal') {
      baseMenuItems.push({ id: 'lesson-plans-review', label: 'E-Lesson Plans', icon: FileText });
    }

    // Add Users menu and Graduated Students for IT admins (it_admin role) only
    if (userProfile?.role === 'it_admin') {
      baseMenuItems.push({ id: 'users', label: 'Users Management', icon: UserCog });
      baseMenuItems.push({ id: 'graduated-students', label: 'Graduated Students', icon: GraduationCap });
    }

    baseMenuItems.push(
      { id: 'settings', label: 'Settings', icon: Settings },
      { id: 'audit', label: 'Audit Logs', icon: FileSearch }
    );

    return baseMenuItems;
  };

  const menuItems = getMenuItems();
  const [isOpen, setIsOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{ school_name?: string; logo_url?: string }>({});
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  
  useEffect(() => {
    fetchSchoolInfo();
    fetchProfilePhoto();
  }, []);

  const fetchSchoolInfo = async () => {
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
      if (data.success && data.settings) {
        setSchoolInfo({
          school_name: data.settings.school_name,
          logo_url: data.settings.logo_url,
        });
      }
    } catch (error) {
      console.error('[Sidebar] Failed to fetch school info:', error);
    }
  };

  const fetchProfilePhoto = async () => {
    try {
      const supabase = (await import('../utils/supabase/client')).createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/${user.id}`,
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
      console.error('[Sidebar] Failed to fetch profile photo:', error);
    }
  };

  const handleProfileUpdate = () => {
    // Refresh profile photo after update
    fetchProfilePhoto();
    refreshProfile();
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <>
      {/* Mobile menu button */}
      <Button
        variant="ghost"
        size="icon"
        className="absolute top-4 left-4 z-50 md:hidden bg-white shadow-lg border"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </Button>

      {/* Sidebar */}
      <div className={cn(
        "fixed inset-y-0 left-0 z-40 w-64 bg-slate-900 text-white transform transition-transform duration-300 ease-in-out md:translate-x-0 flex flex-col",
        isOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* Header - Fixed */}
        <div className="flex-shrink-0 p-4 border-b border-slate-700">
          {schoolInfo.logo_url || schoolInfo.school_name ? (
            <div className="flex items-center gap-3">
              {schoolInfo.logo_url ? (
                <div className="flex-shrink-0 w-12 h-12 bg-white rounded-lg p-1.5 flex items-center justify-center">
                  <ImageWithFallback
                    src={schoolInfo.logo_url}
                    alt="School Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
              ) : (
                <div className="flex-shrink-0 w-12 h-12 bg-blue-600 rounded-lg flex items-center justify-center">
                  <School className="h-6 w-6 text-white" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-base font-bold text-white leading-tight line-clamp-2">
                  {schoolInfo.school_name || 'School SMS'}
                </h1>
                <p className="text-xs text-slate-400 mt-0.5">
                  {getDashboardTitle()}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-blue-400">School SMS</h1>
              <p className="text-sm text-slate-400 mt-1">
                {getDashboardTitle()}
              </p>
            </div>
          )}
        </div>

        {/* Navigation - Scrollable */}
        <nav className="flex-1 overflow-y-auto py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => {
                  onItemClick(item.id);
                  setIsOpen(false);
                }}
                className={cn(
                  "w-full flex items-center gap-3 px-6 py-3 text-left text-sm transition-colors hover:bg-slate-800",
                  activeItem === item.id ? "bg-blue-600 border-r-2 border-blue-400" : ""
                )}
              >
                <Icon className="h-4 w-4" />
                {item.label}
              </button>
            );
          })}
        </nav>

        {/* Footer - Fixed */}
        <div className="flex-shrink-0 p-6 border-t border-slate-700">
          <div 
            className="p-3 bg-slate-800 rounded-lg mb-3 cursor-pointer hover:bg-slate-700 transition-colors"
            onClick={() => setShowProfileDialog(true)}
          >
            <div className="flex items-center gap-2 mb-2">
              <Avatar className="w-8 h-8">
                <AvatarImage src={profilePhotoUrl} alt="Profile" />
                <AvatarFallback className="bg-slate-600 text-slate-300 text-xs">
                  {userProfile ? `${userProfile.first_name?.[0] || ''}${userProfile.last_name?.[0] || ''}` : 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-400">Logged in as</p>
                <p className="text-sm truncate">{userProfile ? getFullName(userProfile) : 'User'}</p>
                <p className="text-xs text-blue-400 capitalize">{userProfile?.role || 'Admin'}</p>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">Click to edit profile</p>
          </div>
          
          <Button
            onClick={handleLogout}
            variant="outline"
            size="sm"
            className="w-full text-slate-300 border-slate-600 hover:bg-slate-800 hover:text-white"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Overlay for mobile - REMOVED to show dashboard content */}
      {/* Profile Settings Dialog */}
      <ProfileSettings 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog}
        onProfileUpdate={handleProfileUpdate}
      />
    </>
  );
}