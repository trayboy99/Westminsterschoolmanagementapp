import { useState, useEffect, useCallback } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '../ui/sheet';
import { 
  Upload, 
  FileText, 
  Users, 
  BookOpen,
  Settings,
  Plus,
  AlertTriangle,
  CheckCircle,
  Clock,
  BarChart3,
  X,
  Send,
  XCircle
} from 'lucide-react';
import { UploadForm, UploadMetadata } from './UploadForm';
import { ComplianceTracker } from './ComplianceTracker';
import { StudentFileExplorer } from './StudentFileExplorer';
import { UploadSettings } from './UploadSettings';
import { DeadlineCountdown } from './DeadlineCountdown';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface UploadModuleProps {
  userRole: 'teacher' | 'admin' | 'student';
  userId: string;
  userName: string;
  userClass?: string;
  className?: string;
}

interface UploadStats {
  totalUploads: number;
  pendingApproval: number;
  recentUploads: number;
  storageUsed: number;
  storageLimit: number;
}

export function UploadModule({ 
  userRole, 
  userId, 
  userName, 
  userClass,
  className = '' 
}: UploadModuleProps) {
  const [activeTab, setActiveTab] = useState(() => {
    switch (userRole) {
      case 'student': return 'browse';
      case 'teacher': return 'upload';
      case 'admin': return 'compliance';
      default: return 'upload';
    }
  });
  
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [uploads, setUploads] = useState<any[]>([]);
  const [recentUploads, setRecentUploads] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeDeadlines, setActiveDeadlines] = useState<any[]>([]);
  const [complianceData, setComplianceData] = useState<any[]>([]);
  const [stats, setStats] = useState<UploadStats>({
    totalUploads: 0,
    pendingApproval: 0,
    recentUploads: 0,
    storageUsed: 0,
    storageLimit: 10
  });
  const [activeSession, setActiveSession] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const [showHistoricalData, setShowHistoricalData] = useState(false);
  const [selectedTeacherDetails, setSelectedTeacherDetails] = useState<any | null>(null);

  const supabase = createClient();

  // Helper function to calculate time ago
  const getTimeAgo = (date: Date) => {
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (seconds < 60) return 'Just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)} hours ago`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
    return date.toLocaleDateString();
  };

  // Fetch uploads and deadlines on mount
  useEffect(() => {
    fetchActiveSessionAndTerm();
  }, []);

  // Refetch data when session/term changes
  useEffect(() => {
    if (activeSession && activeTerm) {
      fetchUploads();
      fetchRecentUploads();
      fetchActiveDeadlines();
      fetchStatistics();
      if (userRole === 'admin') {
        fetchComplianceData();
      }
    }
  }, [activeSession, activeTerm, showHistoricalData]);

  const fetchActiveSessionAndTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/available-filters`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[UploadModule] Active session/term response:', data);
      
      if (data.success) {
        setActiveSession(data.activeSession || '');
        setActiveTerm(data.activeTerm || '');
      }
    } catch (error) {
      console.error('[UploadModule] Error fetching active session/term:', error);
    }
  };

  const fetchUploads = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Build query params with session and term filters (unless viewing historical data)
      const params = new URLSearchParams();
      if (!showHistoricalData && activeSession) {
        params.append('session', activeSession);
      }
      if (!showHistoricalData && activeTerm) {
        params.append('term', activeTerm);
      }

      const queryString = params.toString();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads${queryString ? `?${queryString}` : ''}`;
      
      console.log('[UploadModule] Fetching uploads:', { url, activeSession, activeTerm, showHistoricalData });

      const res = await fetch(url, { headers });
      const data = await res.json();
      if (data.success) {
        setUploads(data.uploads);
      }
    } catch (error) {
      console.error('Error fetching uploads:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchActiveDeadlines = async () => {
    try {
      console.log('[UploadModule] Fetching active deadlines...');
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
      console.log('[UploadModule] Upload settings response:', data);
      
      if (data.success && data.settings?.deadlines) {
        // Get only ACTIVE deadlines (enabled AND not expired)
        const now = new Date();
        const activeOnly = data.settings.deadlines.filter((d: any) => {
          const isEnabled = d.enabled;
          const deadlineDate = new Date(d.deadline);
          const isNotExpired = deadlineDate >= now;
          return isEnabled && isNotExpired;
        });
        console.log('[UploadModule] Active (not expired) deadlines:', activeOnly);
        console.log('[UploadModule] Total enabled deadlines:', data.settings.deadlines.filter((d: any) => d.enabled).length);
        setActiveDeadlines(activeOnly);
      } else {
        console.log('[UploadModule] No deadlines found in response');
      }
    } catch (error) {
      console.error('[UploadModule] Error fetching deadlines:', error);
    }
  };

  const fetchComplianceData = async () => {
    try {
      console.log('[UploadModule] Fetching compliance data...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Build query params with session and term filters
      const params = new URLSearchParams();
      if (!showHistoricalData && activeSession) {
        params.append('session', activeSession);
      }
      if (!showHistoricalData && activeTerm) {
        params.append('term', activeTerm);
      }

      const queryString = params.toString();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/compliance${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      
      if (!res.ok) {
        console.error('[UploadModule] HTTP error:', res.status, res.statusText);
        return;
      }

      const text = await res.text();
      console.log('[UploadModule] Raw response:', text);
      
      let data;
      try {
        data = JSON.parse(text);
      } catch (parseError) {
        console.error('[UploadModule] JSON parse error:', parseError);
        console.error('[UploadModule] Response was:', text);
        return;
      }
      
      console.log('[UploadModule] Compliance response:', data);
      
      if (data.success && data.complianceData) {
        setComplianceData(data.complianceData);
      }
    } catch (error) {
      console.error('[UploadModule] Error fetching compliance data:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      console.log('[UploadModule] Fetching statistics...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Build query params with session and term filters
      const params = new URLSearchParams();
      if (!showHistoricalData && activeSession) {
        params.append('session', activeSession);
      }
      if (!showHistoricalData && activeTerm) {
        params.append('term', activeTerm);
      }

      const queryString = params.toString();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/statistics${queryString ? `?${queryString}` : ''}`;

      console.log('[UploadModule] 📤 Fetching statistics with:', {
        activeSession,
        activeTerm,
        showHistoricalData,
        queryString,
        fullUrl: url
      });

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      console.log('[UploadModule] 📥 Statistics response:', data);
      
      if (data.success && data.statistics) {
        setStats({
          totalUploads: data.statistics.totalUploads || 0,
          pendingApproval: data.statistics.pendingApproval || 0,
          recentUploads: data.statistics.recentUploads || 0,
          storageUsed: parseFloat(data.statistics.storageUsed) || 0,
          storageLimit: data.statistics.storageLimit || 10
        });
      }
    } catch (error) {
      console.error('[UploadModule] Error fetching statistics:', error);
    }
  };

  const fetchRecentUploads = async () => {
    try {
      console.log('[UploadModule] Fetching recent uploads...');
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Build query params with session and term filters
      const params = new URLSearchParams();
      if (!showHistoricalData && activeSession) {
        params.append('session', activeSession);
      }
      if (!showHistoricalData && activeTerm) {
        params.append('term', activeTerm);
      }

      const queryString = params.toString();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/recent${queryString ? `?${queryString}` : ''}`;

      const res = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });
      const data = await res.json();
      console.log('[UploadModule] Recent uploads response:', data);
      
      if (data.success && data.uploads) {
        setRecentUploads(data.uploads);
      }
    } catch (error) {
      console.error('[UploadModule] Error fetching recent uploads:', error);
    }
  };

  const handleUploadSubmit = (metadata: UploadMetadata) => {
    setShowUploadForm(false);
    fetchUploads(); // Refresh the uploads list
    fetchRecentUploads(); // Refresh recent uploads
    fetchStatistics(); // Refresh statistics
    if (userRole === 'admin') {
      fetchComplianceData(); // Refresh compliance data
    }
  };

  const handleSaveDraft = (metadata: UploadMetadata) => {
    // In real app, save draft to backend
    console.log('Saving draft:', metadata);
    toast.success('Draft saved successfully!');
  };

  const handleSendReminder = async (teacherId: string, uploadId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to send reminders');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/send-upload-reminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({
            teacherId,
            uploadId
          })
        }
      );

      const data = await res.json();
      
      if (data.success) {
        toast.success('Reminder sent successfully!');
      } else {
        toast.error(data.error || 'Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Failed to send reminder');
    }
  };

  const handleExportReport = () => {
    // In real app, generate and download report
    console.log('Exporting compliance report');
    toast.success('Report exported successfully!');
  };

  const handleViewDetails = (teacherId: string) => {
    // Find teacher in compliance data
    const teacher = complianceData.find(t => t.teacherId === teacherId);
    if (teacher) {
      setSelectedTeacherDetails(teacher);
    } else {
      console.log('Teacher not found:', teacherId);
      toast.error('Teacher details not found');
    }
  };

  const handleDownload = (fileId: string) => {
    // In real app, initiate file download
    console.log('Downloading file:', fileId);
    toast.success('Download started!');
  };

  const handlePreview = (fileId: string) => {
    // In real app, show file preview
    console.log('Previewing file:', fileId);
    toast.success('Opening file preview...');
  };

  const handleCloseSettings = () => {
    setShowSettings(false);
    // Refresh deadlines after closing settings
    fetchActiveDeadlines();
  };

  const getTabs = () => {
    const tabs = [];
    
    if (userRole === 'teacher' || userRole === 'admin') {
      tabs.push({ value: 'upload', label: 'Upload Files', icon: Upload });
    }
    
    if (userRole === 'admin') {
      tabs.push({ value: 'compliance', label: 'Compliance Tracker', icon: Users });
    }
    
    if (userRole === 'student' || userRole === 'admin') {
      tabs.push({ value: 'browse', label: 'Browse Files', icon: BookOpen });
    }
    
    if (userRole === 'admin') {
      tabs.push({ value: 'settings', label: 'Settings', icon: Settings });
    }
    
    return tabs;
  };

  if (showUploadForm) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="mb-4">
          <Button variant="outline" onClick={() => setShowUploadForm(false)}>
            ← Back to Overview
          </Button>
        </div>
        <UploadForm
          onSubmit={handleUploadSubmit}
          onSaveDraft={handleSaveDraft}
          onCancel={() => setShowUploadForm(false)}
          userRole={userRole as 'teacher' | 'admin'}
          teacherId={userId}
          teacherName={userName}
        />
      </div>
    );
  }

  if (showSettings) {
    return (
      <div className={`p-6 ${className}`}>
        <div className="mb-4">
          <Button variant="outline" onClick={() => setShowSettings(false)}>
            ← Back to Overview
          </Button>
        </div>
        <UploadSettings
          onClose={handleCloseSettings}
        />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Session/Term Indicator */}
      {activeSession && activeTerm && (
        <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg">
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 bg-blue-600 rounded-full animate-pulse"></div>
            <span className="text-sm font-medium text-blue-900">Active Session:</span>
            <span className="text-sm font-bold text-blue-700">{activeSession}</span>
          </div>
          <div className="h-4 w-px bg-blue-300"></div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-medium text-blue-900">Term:</span>
            <span className="text-sm font-bold text-blue-700">{activeTerm}</span>
          </div>
          {showHistoricalData && (
            <>
              <div className="h-4 w-px bg-blue-300"></div>
              <Badge variant="secondary" className="text-xs">
                Viewing All Data
              </Badge>
            </>
          )}
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
            <Upload className="h-6 sm:h-8 w-6 sm:w-8" />
            Learning Resources
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            {userRole === 'teacher' && 'Upload and manage educational materials for your students'}
            {userRole === 'admin' && 'Manage uploads, monitor compliance, and configure settings'}
            {userRole === 'student' && `Access course materials and resources for ${userClass}`}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          {(userRole === 'teacher' || userRole === 'admin') && (
            <Button onClick={() => setShowUploadForm(true)} className="flex-1 sm:flex-none">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Upload Files</span>
              <span className="sm:hidden">Upload</span>
            </Button>
          )}
          {userRole === 'admin' && (
            <Button variant="outline" onClick={() => setShowSettings(true)} className="flex-1 sm:flex-none">
              <Settings className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Settings</span>
              <span className="sm:hidden">Settings</span>
            </Button>
          )}
        </div>
      </div>

      {/* Active Deadlines - Show for both admin and teacher */}
      {(userRole === 'teacher' || userRole === 'admin') && activeDeadlines.length > 0 && (
        <DeadlineCountdown deadlines={activeDeadlines} userRole={userRole} />
      )}

      {/* Quick Stats */}
      {(userRole === 'teacher' || userRole === 'admin') && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                  <FileText className="h-5 w-5 text-blue-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-slate-600 truncate">Total Uploads</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.totalUploads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                  <Clock className="h-5 w-5 text-orange-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-slate-600 truncate">Pending Approval</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.pendingApproval}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-100 rounded-lg flex-shrink-0">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-slate-600 truncate">Recent Uploads</p>
                  <p className="text-xl sm:text-2xl font-bold">{stats.recentUploads}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                  <BarChart3 className="h-5 w-5 text-purple-600" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm text-slate-600 truncate">Storage Used</p>
                  <p className="text-lg sm:text-xl font-bold">
                    {stats.storageUsed}GB
                    <span className="text-xs sm:text-sm text-slate-500 font-normal">
                      /{stats.storageLimit}GB
                    </span>
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <TabsList className="inline-flex w-auto sm:w-full sm:grid gap-1 p-1 h-auto" style={{ gridTemplateColumns: getTabs().length <= 3 ? `repeat(${getTabs().length}, minmax(0, 1fr))` : 'repeat(auto-fit, minmax(120px, 1fr))' }}>
            {getTabs().map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger 
                  key={tab.value} 
                  value={tab.value} 
                  className="flex items-center justify-center gap-1 sm:gap-2 px-2.5 sm:px-4 py-2 text-xs sm:text-sm whitespace-nowrap data-[state=active]:bg-white flex-shrink-0"
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                  <span className="text-xs sm:text-sm">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Upload Tab */}
        {(userRole === 'teacher' || userRole === 'admin') && (
          <TabsContent value="upload" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Quick Upload</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 sm:py-12 border-2 border-dashed border-slate-300 rounded-lg px-4">
                  <Upload className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">Upload Learning Materials</h3>
                  <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6 max-w-md mx-auto">
                    Share e-notes, exam questions, assignments, and other educational resources with your students
                  </p>
                  <Button onClick={() => setShowUploadForm(true)} size="lg" className="w-full sm:w-auto">
                    <Plus className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Start Upload
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Recent Uploads</CardTitle>
              </CardHeader>
              <CardContent>
                {recentUploads.length > 0 ? (
                  <div className="space-y-3">
                    {recentUploads.map((upload) => {
                      const timeAgo = upload.created_at ? getTimeAgo(new Date(upload.created_at)) : 'Unknown';
                      const subjectName = upload.subject?.name || 'General';
                      const uploaderName = upload.uploader 
                        ? `${upload.uploader.first_name || ''} ${upload.uploader.last_name || ''}`.trim() 
                        : 'Unknown';
                      
                      return (
                        <div key={upload.id} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3 min-w-0 flex-1">
                            <FileText className="h-5 w-5 text-slate-600 flex-shrink-0" />
                            <div className="min-w-0 flex-1">
                              <p className="font-medium truncate">{upload.title}</p>
                              <p className="text-xs sm:text-sm text-slate-600 truncate">
                                {subjectName} • {timeAgo}
                                {userRole === 'admin' && ` • ${uploaderName}`}
                              </p>
                            </div>
                          </div>
                          <Badge 
                            variant={upload.status === 'approved' ? 'default' : upload.status === 'pending' || upload.status === 'submitted' ? 'secondary' : 'destructive'} 
                            className="self-start sm:self-center"
                          >
                            {upload.status}
                          </Badge>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-500">
                    <FileText className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                    <p>No recent uploads yet</p>
                    <p className="text-sm mt-1">Start uploading learning materials for your students</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {/* Compliance Tracker Tab */}
        {userRole === 'admin' && (
          <TabsContent value="compliance" className="space-y-6 mt-6">
            <ComplianceTracker
              complianceData={complianceData}
              onSendReminder={handleSendReminder}
              onExportReport={handleExportReport}
              onViewDetails={handleViewDetails}
            />
          </TabsContent>
        )}

        {/* Browse Files Tab */}
        {(userRole === 'student' || userRole === 'admin') && (
          <TabsContent value="browse" className="space-y-6 mt-6">
            <StudentFileExplorer
              folderData={[]}
              onDownload={handleDownload}
              onPreview={handlePreview}
              studentClass={userClass || 'Grade 10-A'}
              studentId={userId}
              userRole={userRole === 'admin' ? 'admin' : 'student'}
            />
          </TabsContent>
        )}

        {/* Settings Tab */}
        {userRole === 'admin' && (
          <TabsContent value="settings" className="space-y-6 mt-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg sm:text-xl">Upload Configuration</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 sm:py-12 px-4">
                  <Settings className="h-12 w-12 sm:h-16 sm:w-16 text-slate-400 mx-auto mb-3 sm:mb-4" />
                  <h3 className="text-base sm:text-lg font-medium mb-2">Configure Upload Settings</h3>
                  <p className="text-sm sm:text-base text-slate-600 mb-4 sm:mb-6 max-w-md mx-auto">
                    Manage global settings, deadlines, and subject-specific configurations
                    {activeDeadlines.length > 0 && (
                      <span className="block mt-2 text-green-600 font-medium text-sm sm:text-base">
                        ✓ {activeDeadlines.length} deadline{activeDeadlines.length > 1 ? 's' : ''} currently active
                      </span>
                    )}
                  </p>
                  <Button onClick={() => setShowSettings(true)} size="lg" className="w-full sm:w-auto">
                    <Settings className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Open Settings
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>

      {/* Teacher Details Sheet */}
      <Sheet open={!!selectedTeacherDetails} onOpenChange={() => setSelectedTeacherDetails(null)}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
          {selectedTeacherDetails && (
            <>
              <SheetHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <SheetTitle className="text-xl font-bold">{selectedTeacherDetails.teacherName}</SheetTitle>
                    <SheetDescription className="mt-1">
                      {selectedTeacherDetails.email}
                    </SheetDescription>
                  </div>
                  <Badge 
                    variant={
                      selectedTeacherDetails.status === 'compliant' ? 'default' :
                      selectedTeacherDetails.status === 'partial' ? 'secondary' :
                      selectedTeacherDetails.status === 'overdue' ? 'destructive' : 'destructive'
                    }
                    className="ml-2"
                  >
                    {selectedTeacherDetails.status === 'compliant' && <CheckCircle className="h-3 w-3 mr-1" />}
                    {selectedTeacherDetails.status === 'overdue' && <AlertTriangle className="h-3 w-3 mr-1" />}
                    {selectedTeacherDetails.status === 'non-compliant' && <XCircle className="h-3 w-3 mr-1" />}
                    {selectedTeacherDetails.status.replace('-', ' ').toUpperCase()}
                  </Badge>
                </div>
              </SheetHeader>

              <div className="mt-6 space-y-6">
                {/* Compliance Overview */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-3">Compliance Overview</h3>
                  <div className="grid grid-cols-2 gap-3">
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-600">Submitted</p>
                        <p className="text-2xl font-bold text-green-600">{selectedTeacherDetails.submitted}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-600">Pending</p>
                        <p className="text-2xl font-bold text-orange-600">{selectedTeacherDetails.pending}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-600">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">{selectedTeacherDetails.overdue}</p>
                      </CardContent>
                    </Card>
                    <Card>
                      <CardContent className="p-3">
                        <p className="text-xs text-slate-600">Required</p>
                        <p className="text-2xl font-bold text-blue-600">{selectedTeacherDetails.totalRequired}</p>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <div className="mt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium">Compliance Rate</span>
                      <span className="text-sm font-bold">{selectedTeacherDetails.complianceRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          selectedTeacherDetails.complianceRate >= 90 ? 'bg-green-500' :
                          selectedTeacherDetails.complianceRate >= 50 ? 'bg-orange-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${selectedTeacherDetails.complianceRate}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Subjects */}
                {selectedTeacherDetails.subjects && selectedTeacherDetails.subjects.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Subjects</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedTeacherDetails.subjects.map((subject: string, index: number) => (
                        <Badge key={index} variant="outline">{subject}</Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Last Submission */}
                {selectedTeacherDetails.lastSubmission && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2">Last Submission</h3>
                    <p className="text-sm text-slate-600">
                      {new Date(selectedTeacherDetails.lastSubmission).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                )}

                {/* Recent Uploads */}
                {selectedTeacherDetails.uploads && selectedTeacherDetails.uploads.length > 0 && (
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-3">Recent Uploads</h3>
                    <div className="space-y-2">
                      {selectedTeacherDetails.uploads.slice(0, 5).map((upload: any) => (
                        <div key={upload.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50">
                          <FileText className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5" />
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{upload.title}</p>
                            <p className="text-xs text-slate-600">
                              {upload.subject} • Week {upload.week} • {upload.term} {upload.session}
                            </p>
                            {upload.submittedAt && (
                              <p className="text-xs text-slate-500 mt-1">
                                Submitted {new Date(upload.submittedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge 
                            variant={upload.status === 'submitted' ? 'default' : upload.status === 'overdue' ? 'destructive' : 'secondary'}
                            className="text-xs"
                          >
                            {upload.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div className="flex gap-2 pt-4 border-t">
                  <Button 
                    onClick={() => {
                      handleSendReminder(selectedTeacherDetails.teacherId);
                      setSelectedTeacherDetails(null);
                    }}
                    className="flex-1"
                    disabled={selectedTeacherDetails.status === 'compliant'}
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Send Reminder
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedTeacherDetails(null)}
                    className="flex-1"
                  >
                    Close
                  </Button>
                </div>
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}