import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  LayoutDashboard, 
  DollarSign, 
  Upload, 
  FileText, 
  BarChart3,
  CheckCircle,
  Settings,
  LogOut,
  Menu,
  X,
  GraduationCap
} from 'lucide-react';
import { Button } from './ui/button';
import { useAuth } from '../contexts/AuthContext';
import { Avatar, AvatarFallback } from './ui/avatar';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

export default function FinanceAdminSidebar() {
  const location = useLocation();
  const { signOut, user } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [schoolName, setSchoolName] = useState('Westminster College Lagos');
  const [schoolLogo, setSchoolLogo] = useState<string>('');
  const [userName, setUserName] = useState('Finance Admin');
  const supabase = createClient();

  useEffect(() => {
    fetchSchoolSettings();
    fetchUserProfile();
  }, []);

  const navigation = [
    { name: 'Dashboard', href: '/finance-admin/dashboard', icon: LayoutDashboard },
    { name: 'Payment Entry', href: '/finance-admin/payment-entry', icon: DollarSign },
    { name: 'Bulk Upload', href: '/finance-admin/bulk-upload', icon: Upload },
    { name: 'Manage Payments', href: '/finance-admin/payments', icon: FileText },
    { name: 'Clearance Report', href: '/finance-admin/clearance', icon: CheckCircle },
    { name: 'Statistics', href: '/finance-admin/statistics', icon: BarChart3 },
    { name: 'Settings', href: '/finance-admin/settings', icon: Settings },
  ];

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
      console.error('[FinanceAdminSidebar] Failed to fetch school settings:', error);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/${session.user.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await res.json();
      if (data.success && data.profile) {
        setUserName(`${data.profile.first_name || ''} ${data.profile.last_name || ''}`.trim() || 'Finance Admin');
      }
    } catch (error) {
      console.error('[FinanceAdminSidebar] Failed to fetch user profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

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
            <p className="text-xs text-slate-400 mt-0.5">Finance Admin Dashboard</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-700 h-px" />

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const Icon = item.icon;
          const isActive = location.pathname === item.href;

          return (
            <Link
              key={item.name}
              to={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors ${
                isActive
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'text-slate-300 hover:bg-slate-800 hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      {/* User Profile Footer */}
      <div className="flex-shrink-0 border-t border-slate-700">
        <div className="p-4 bg-slate-800/50">
          <div className="text-xs text-slate-400 mb-2">Logged in as</div>
          <div className="flex items-center gap-3 p-2 rounded-lg">
            <Avatar className="h-10 w-10 bg-blue-600 flex-shrink-0">
              <AvatarFallback className="bg-blue-600 text-white">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate text-sm text-white">{userName}</p>
              <p className="text-xs text-slate-400 truncate">Finance Admin</p>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-2">Click to edit profile</p>
        </div>

        {/* Logout Button */}
        <div className="p-4">
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
      {/* Mobile Menu Button */}
      <div className="lg:hidden fixed top-4 left-4 z-50">
        <Button
          variant="outline"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </Button>
      </div>

      {/* Mobile Sidebar */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/50"
          onClick={() => setMobileMenuOpen(false)}
        >
          <div
            className="fixed inset-y-0 left-0 w-64 shadow-xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            <SidebarContent />
          </div>
        </div>
      )}

      {/* Desktop Sidebar */}
      <div className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0">
        <SidebarContent />
      </div>
    </>
  );
}
