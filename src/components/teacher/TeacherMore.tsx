import { useState, useEffect } from 'react';
import { 
  Users, 
  BookOpen, 
  Calendar, 
  ClipboardCheck, 
  MessageSquare, 
  Upload, 
  Settings, 
  LogOut,
  GraduationCap,
  DoorOpen,
  ChevronRight,
  Award,
  FileText
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { ProfileSettings } from '../ProfileSettings';

interface TeacherMoreProps {
  userProfile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    role: string;
  };
  onNavigate: (view: string) => void;
  isClassTeacher: boolean;
}

export function TeacherMore({ userProfile, onNavigate, isClassTeacher }: TeacherMoreProps) {
  const [profilePhotoUrl, setProfilePhotoUrl] = useState<string>('');
  const [showProfileDialog, setShowProfileDialog] = useState(false);
  const [schoolName, setSchoolName] = useState('Teacher Portal');
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
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/${userProfile.id}`,
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
      console.error('[TeacherMore] Failed to fetch profile photo:', error);
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
      if (data.success && data.settings?.school_name) {
        setSchoolName(data.settings.school_name);
      }
    } catch (error) {
      console.error('[TeacherMore] Failed to fetch school settings:', error);
    }
  };

  const handleProfileUpdate = () => {
    fetchProfilePhoto();
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
      toast.success('Logged out successfully');
      window.location.hash = 'login';
      window.location.reload();
    } catch (error: any) {
      console.error('Logout error:', error);
      if (error?.message?.includes('session missing')) {
        toast.success('Logged out successfully');
        window.location.hash = 'login';
        window.location.reload();
      } else {
        toast.error('Failed to logout');
      }
    }
  };

  const menuSections = [
    {
      title: 'Teaching',
      items: [
        { id: 'teachers', label: 'Teachers', icon: Users },
        { id: 'my-subjects', label: 'My Subjects', icon: BookOpen },
        { id: 'lesson-plans', label: 'E-Lesson Plans', icon: FileText },
        { id: 'timetable', label: 'Timetable', icon: Calendar },
        { id: 'marks', label: 'Marks', icon: ClipboardCheck },
      ],
    },
    ...(isClassTeacher ? [{
      title: 'Class Teacher',
      items: [
        { id: 'comments', label: 'Comments', icon: MessageSquare },
      ],
    }] : []),
    {
      title: 'Resources',
      items: [
        { id: 'uploads', label: 'Uploads', icon: Upload },
        { id: 'gate-duty', label: 'Gate Duty', icon: DoorOpen },
      ],
    },
    {
      title: 'Account',
      items: [
        { id: 'settings', label: 'Settings', icon: Settings },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 pb-20 md:pb-0">
      {/* Desktop Header */}
      <div className="hidden md:block bg-white border-b border-gray-200 p-6 mb-6 -mx-4 -mt-4 md:mx-0 md:mt-0">
        <h1 className="text-gray-900 text-2xl font-bold">More Options</h1>
        <p className="text-gray-600 mt-1">Additional menu items and settings</p>
      </div>

      <div className="max-w-4xl mx-auto px-4 space-y-6 md:px-0">
        {/* Teacher Portal Badge */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl shadow-md p-4 -mx-4 md:mx-0 md:rounded-xl">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-white font-semibold text-sm">Teacher Portal</h3>
              <p className="text-blue-100 text-xs">Quick access to all your teaching tools</p>
            </div>
          </div>
        </div>

        {/* Profile Card */}
        <div 
          className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 cursor-pointer hover:shadow-md transition-shadow active:scale-[0.99] md:hover:scale-[1.01]"
          onClick={() => setShowProfileDialog(true)}
        >
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 bg-blue-600 ring-4 ring-blue-100">
              <AvatarImage src={profilePhotoUrl} alt="Profile" />
              <AvatarFallback className="bg-blue-600 text-white text-lg">
                {userProfile.first_name?.[0]}{userProfile.last_name?.[0]}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <h2 className="font-semibold text-gray-900 text-lg truncate">
                {userProfile.first_name} {userProfile.last_name}
              </h2>
              <p className="text-sm text-gray-500 truncate">{userProfile.email}</p>
              <p className="text-xs text-blue-600 font-medium mt-1">Tap to edit profile</p>
            </div>
            <ChevronRight className="h-5 w-5 text-gray-400" />
          </div>
        </div>

        {/* Class Teacher Badge */}
        {isClassTeacher && (
          <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-2xl shadow-sm border border-purple-100 p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                <Award className="h-5 w-5 text-purple-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">Class Teacher</h3>
                <p className="text-xs text-gray-600 mt-0.5">You have additional class teacher responsibilities</p>
              </div>
            </div>
          </div>
        )}

        {/* Menu Sections */}
        {menuSections.map((section) => (
          <div key={section.title} className="space-y-2">
            <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-4 mb-3">
              {section.title}
            </h3>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              {section.items.map((item, index) => {
                const Icon = item.icon;
                return (
                  <div key={item.id}>
                    <button
                      onClick={() => onNavigate(item.id)}
                      className="w-full flex items-center gap-4 p-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <div className="flex-shrink-0 w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                        <Icon className="h-5 w-5 text-blue-600" />
                      </div>
                      <span className="flex-1 text-left font-medium text-gray-900">
                        {item.label}
                      </span>
                      <ChevronRight className="h-5 w-5 text-gray-400" />
                    </button>
                    {index < section.items.length - 1 && (
                      <div className="border-t border-gray-100 ml-16" />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Logout Button */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-4 p-4 hover:bg-red-50 active:bg-red-100 transition-colors"
          >
            <div className="flex-shrink-0 w-10 h-10 bg-red-50 rounded-xl flex items-center justify-center">
              <LogOut className="h-5 w-5 text-red-600" />
            </div>
            <span className="flex-1 text-left font-medium text-red-600">
              Logout
            </span>
            <ChevronRight className="h-5 w-5 text-red-400" />
          </button>
        </div>

        {/* App Version */}
        <div className="text-center text-xs text-gray-400 py-4">
          Version 1.0.0
        </div>
      </div>

      {/* Profile Settings Dialog */}
      {showProfileDialog && (
        <ProfileSettings
          open={showProfileDialog}
          onOpenChange={setShowProfileDialog}
          userId={userProfile.id}
          userEmail={userProfile.email}
          userName={`${userProfile.first_name} ${userProfile.last_name}`}
          onProfileUpdate={handleProfileUpdate}
        />
      )}
    </div>
  );
}