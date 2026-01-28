import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Sheet, SheetContent, SheetTrigger, SheetTitle, SheetDescription } from './ui/sheet';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { 
  Bus, 
  Route,
  Users, 
  UserCog,
  LayoutDashboard, 
  Settings, 
  Menu,
  LogOut,
  DollarSign,
  FileText,
  GraduationCap
} from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { ProfileSettings } from './ProfileSettings';

interface TransportSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onLogout: () => void;
  userName: string;
}

export function TransportSidebar({ 
  activeSection, 
  onSectionChange, 
  onLogout,
  userName 
}: TransportSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('Westminster College Lagos');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    fetchSchoolSettings();
    fetchProfilePhoto();
  }, []);

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
      console.error('[TransportSidebar] Failed to fetch school settings:', error);
    }
  };

  const fetchProfilePhoto = async () => {
    try {
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
      console.error('[TransportSidebar] Failed to fetch profile photo:', error);
    }
  };

  const handleProfileUpdate = () => {
    // Refresh profile photo after update
    fetchProfilePhoto();
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const menuItems = [
    { id: 'overview', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'buses', label: 'Buses', icon: Bus },
    { id: 'routes', label: 'Routes', icon: Route },
    { id: 'drivers', label: 'Drivers', icon: UserCog },
    { id: 'students', label: 'Students', icon: Users },
    { id: 'payments', label: 'Payments', icon: DollarSign },
    { id: 'reports', label: 'Reports', icon: FileText },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    setMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-900 text-white overflow-hidden">
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
            <p className="text-xs text-slate-400 mt-0.5">Transport Manager Dashboard</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-700 h-px flex-shrink-0" />

      {/* Navigation - Scrollable Area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <nav className="space-y-1 px-3 py-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            
            return (
              <Button
                key={item.id}
                variant={isActive ? 'default' : 'ghost'}
                className={`w-full justify-start gap-3 ${
                  isActive 
                    ? 'bg-blue-600 text-white hover:bg-blue-700' 
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                onClick={() => handleSectionChange(item.id)}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{item.label}</span>
              </Button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Footer - Always Visible */}
      <div className="flex-shrink-0 border-t border-slate-700">
        <div className="p-4 bg-slate-800/50">
          <div className="text-xs text-slate-400 mb-2">Logged in as</div>
          <div 
            className="flex items-center gap-3 p-2 rounded-lg cursor-pointer hover:bg-slate-700/50 transition-colors"
            onClick={() => setShowProfileDialog(true)}
          >
            <Avatar className="h-10 w-10 bg-blue-600 flex-shrink-0">
              <AvatarImage src={profilePhotoUrl} alt="Profile" />
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm text-white">{userName}</p>
              <p className="text-xs text-slate-400 truncate">Transport Manager</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Click to edit profile</p>
        </div>

        {/* Logout Button */}
        <div className="p-4">
          <Button
            variant="ghost"
            className="w-full bg-white text-slate-700 hover:bg-slate-100 justify-start gap-2"
            onClick={onLogout}
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
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="outline" size="icon" className="bg-white shadow-md">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0 w-64">
            <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
            <SheetDescription className="sr-only">
              Transport Manager Dashboard navigation menu
            </SheetDescription>
            <SidebarContent />
          </SheetContent>
        </Sheet>
      </div>

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <SidebarContent />
      </div>

      {/* Profile Settings Dialog */}
      <ProfileSettings 
        open={showProfileDialog} 
        onOpenChange={setShowProfileDialog}
        onProfileUpdate={handleProfileUpdate}
      />
    </>
  );
}
