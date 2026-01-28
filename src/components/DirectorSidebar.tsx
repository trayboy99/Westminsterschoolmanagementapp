import { useState, useEffect } from 'react';
import { 
  Home, 
  Users, 
  GraduationCap, 
  BookOpen, 
  ClipboardCheck, 
  Calendar, 
  FileText, 
  DollarSign, 
  Settings, 
  Menu,
  X,
  LogOut,
  School,
  UserPlus,
  Building,
  Bus,
  Award,
  DoorOpen
} from 'lucide-react';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { cn } from './ui/utils';
import { useAuth } from '../contexts/AuthContext';
import { getFullName } from '../utils/supabase/database';
import { ImageWithFallback } from './figma/ImageWithFallback';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { ProfileSettings } from './ProfileSettings';

interface DirectorSidebarProps {
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

export function DirectorSidebar({ activeItem, onItemClick, userProfile }: DirectorSidebarProps) {
  // Finance Admin gets limited menu access
  const isFinanceAdmin = userProfile?.role === 'finance_admin';
  
  const directorMenuItems = [
    { id: 'overview', label: 'Overview', icon: Home },
    { id: 'teachers', label: 'Teachers', icon: Users },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'classes', label: 'Classes', icon: BookOpen },
    { id: 'lesson-plans-review', label: 'Lesson Plans', icon: FileText },
    { id: 'timetable', label: 'Timetable', icon: Calendar },
    { id: 'attendance', label: 'Attendance', icon: ClipboardCheck },
    { id: 'gate-monitoring', label: 'Gate Monitoring', icon: DoorOpen },
    { id: 'results', label: 'Results Check', icon: FileText },
    { id: 'finance', label: 'Finance', icon: DollarSign },
    { id: 'hostel', label: 'Hostel Management', icon: Building },
    { id: 'transport', label: 'Transport Management', icon: Bus },
    { id: 'transcript-pin', label: 'Issue Transcript PIN', icon: Award },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const financeAdminMenuItems = [
    { id: 'overview', label: 'Dashboard', icon: Home },
    { id: 'finance', label: 'Finance Module', icon: DollarSign },
    { id: 'students', label: 'Students', icon: GraduationCap },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const menuItems = isFinanceAdmin ? financeAdminMenuItems : directorMenuItems;

  const [isOpen, setIsOpen] = useState(false);
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<{ school_name?: string; logo_url?: string }>({});
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const { signOut } = useAuth();

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
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      const data = await res.json();
      if (data.success && data.settings) {
        setSchoolInfo(data.settings);
      }
    } catch (error) {
      console.error('Error fetching school info:', error);
    }
  };

  const fetchProfilePhoto = async () => {
    if (!userProfile?.email) return;
    
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile-photo?email=${encodeURIComponent(userProfile.email)}`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      const data = await res.json();
      if (data.success && data.photo_url) {
        setProfilePhotoUrl(data.photo_url);
      }
    } catch (error) {
      console.error('Error fetching profile photo:', error);
    }
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
                  {isFinanceAdmin ? 'Finance Dashboard' : 'Director Dashboard'}
                </p>
              </div>
            </div>
          ) : (
            <div>
              <h1 className="text-xl font-bold text-blue-400">School SMS</h1>
              <p className="text-sm text-slate-400 mt-1">
                {isFinanceAdmin ? 'Finance Dashboard' : 'Director Dashboard'}
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
                  {userProfile ? `${userProfile.first_name?.[0] || ''}${userProfile.last_name?.[0] || ''}` : 'D'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate text-sm text-white">{userProfile ? getFullName(userProfile) : 'User'}</p>
                <p className="text-xs text-slate-400 truncate">
                  {isFinanceAdmin ? 'Finance Admin' : 'Director'}
                </p>
              </div>
            </div>
            <p className="text-xs text-slate-400 mt-2">Click to edit profile</p>
          </div>
          
          <div className="p-4">
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="w-full bg-white text-slate-700 hover:bg-slate-100 justify-start gap-2"
            >
              <LogOut className="h-5 w-5" />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Profile Settings Dialog */}
      {showProfileDialog && userProfile && (
        <ProfileSettings
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          userEmail={userProfile.email}
          userName={getFullName(userProfile)}
          userRole={userProfile.role}
        />
      )}

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  );
}
