import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Switch } from '../ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  Settings, 
  Save, 
  Calendar, 
  Clock,
  FileText,
  Shield,
  AlertTriangle,
  CheckCircle,
  Plus,
  X,
  Info,
  Bug
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { supabase } from '../../utils/supabase/client';
import { DeadlineDebug } from './DeadlineDebug';

interface UploadDeadline {
  id: string;
  term: string;
  session: string;
  uploadType: 'enote' | 'exam_question' | 'all';
  deadline: string; // ISO string
  enabled: boolean;
  description?: string;
}

interface GlobalSettings {
  uploadsEnabled: boolean;
  maxFileSize: number; // in MB
  maxFilesPerUpload: number;
  allowedExtensions: string[];
  requireApproval: boolean;
  emailNotifications: boolean;
  autoDeleteOldFiles: boolean;
  fileRetentionDays: number;
}

interface UploadSettingsProps {
  onClose: () => void;
}

const defaultGlobalSettings: GlobalSettings = {
  uploadsEnabled: true,
  maxFileSize: 50,
  maxFilesPerUpload: 5,
  allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.png', '.mp4'],
  requireApproval: false,
  emailNotifications: true,
  autoDeleteOldFiles: false,
  fileRetentionDays: 365
};

const sessions = ['2023/2024', '2024/2025', '2025/2026'];
const terms = ['First Term', 'Second Term', 'Third Term'];
const uploadTypes = [
  { value: 'all', label: 'All Types' },
  { value: 'enote', label: 'E-Notes' },
  { value: 'exam_question', label: 'Exam Questions' },
  { value: 'assignment', label: 'Assignments' },
  { value: 'other_resources', label: 'Other Resources' }
];

export function UploadSettings({ onClose }: UploadSettingsProps) {
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(defaultGlobalSettings);
  const [deadlines, setDeadlines] = useState<UploadDeadline[]>([]);
  const [newExtension, setNewExtension] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [activeSession, setActiveSession] = useState<string>('2024/2025');
  const [activeTerm, setActiveTerm] = useState<string>('First Term');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  useEffect(() => {
    fetchActiveSessionAndTerm();
    fetchSettings();
  }, []);

  const fetchActiveSessionAndTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.sessions) {
          const currentSession = data.sessions.find((s: any) => s.is_current);
          if (currentSession?.session_name) {
            setActiveSession(currentSession.session_name);
          }
        }
        if (data.success && data.terms) {
          const currentTerm = data.terms.find((t: any) => t.is_current);
          if (currentTerm?.name) {
            setActiveTerm(currentTerm.name);
          }
        }
      }
    } catch (error) {
      console.error('[UploadSettings] Error fetching active session/term:', error);
    }
  };

  const fetchSettings = async () => {
    try {
      console.log('[UploadSettings] Fetching settings...');
      setLoading(true);
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-settings`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );

      console.log('[UploadSettings] Fetch response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('[UploadSettings] Fetched settings data:', data);
        
        if (data.success && data.settings) {
          console.log('[UploadSettings] Setting deadlines to:', data.settings.deadlines);
          setGlobalSettings(data.settings.global || defaultGlobalSettings);
          setDeadlines(data.settings.deadlines || []);
        }
      }
    } catch (error) {
      console.error('[UploadSettings] Error fetching settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDeadline = () => {
    const newDeadline: UploadDeadline = {
      id: Date.now().toString(),
      term: activeTerm, // Auto-populate with active term
      session: activeSession, // Auto-populate with active session
      uploadType: 'all',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
      enabled: true,
      description: ''
    };
    setDeadlines([...deadlines, newDeadline]);
    setHasUnsavedChanges(true);
    toast.success(`Deadline added for ${activeSession} - ${activeTerm}`);
  };

  const handleUpdateDeadline = (id: string, updates: Partial<UploadDeadline>) => {
    setDeadlines(deadlines.map(deadline => 
      deadline.id === id ? { ...deadline, ...updates } : deadline
    ));
    setHasUnsavedChanges(true);
  };

  const handleRemoveDeadline = (id: string) => {
    setDeadlines(deadlines.filter(deadline => deadline.id !== id));
    setHasUnsavedChanges(true);
  };

  const handleAddExtension = () => {
    if (newExtension.trim() && !globalSettings.allowedExtensions.includes(newExtension.trim())) {
      const extension = newExtension.trim().startsWith('.') ? newExtension.trim() : `.${newExtension.trim()}`;
      setGlobalSettings(prev => ({
        ...prev,
        allowedExtensions: [...prev.allowedExtensions, extension]
      }));
      setNewExtension('');
    }
  };

  const handleRemoveExtension = (extension: string) => {
    setGlobalSettings(prev => ({
      ...prev,
      allowedExtensions: prev.allowedExtensions.filter(ext => ext !== extension)
    }));
  };

  const handleSave = async () => {
    // Validate settings
    if (globalSettings.maxFileSize <= 0 || globalSettings.maxFileSize > 1000) {
      toast.error('File size must be between 1MB and 1000MB');
      return;
    }

    if (globalSettings.maxFilesPerUpload <= 0 || globalSettings.maxFilesPerUpload > 20) {
      toast.error('Max files per upload must be between 1 and 20');
      return;
    }

    if (globalSettings.allowedExtensions.length === 0) {
      toast.error('At least one file extension must be allowed');
      return;
    }

    try {
      setSaving(true);
      
      // Get the user's access token from the session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to save settings');
        return;
      }

      console.log('[UploadSettings] Saving settings with deadlines:', deadlines);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            global: globalSettings,
            deadlines
          })
        }
      );

      console.log('[UploadSettings] Save response status:', response.status);

      const data = await response.json();
      console.log('[UploadSettings] Save response data:', data);
      
      if (data.success) {
        // Show specific success message
        const deadlineCount = deadlines.length;
        const deadlineMessage = deadlineCount > 0 
          ? `${deadlineCount} deadline${deadlineCount > 1 ? 's' : ''} saved successfully!`
          : 'Upload settings saved successfully!';
        toast.success(deadlineMessage);
        
        // Show success banner
        setJustSaved(true);
        setTimeout(() => setJustSaved(false), 5000);
        
        // Clear unsaved changes flag
        setHasUnsavedChanges(false);
        
        // Refresh settings to show saved data
        console.log('[UploadSettings] Refreshing settings after save...');
        await fetchSettings();
      } else {
        throw new Error(data.error || 'Failed to save settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const getDeadlineStatus = (deadline: UploadDeadline) => {
    const now = new Date();
    const deadlineDate = new Date(deadline.deadline);
    if (!deadline.enabled) return 'disabled';
    if (deadlineDate < now) return 'expired';
    return 'active';
  };

  const getStatusBadge = (status: string) => {
    const config = {
      active: { variant: 'default' as const, color: 'text-green-600', icon: CheckCircle },
      expired: { variant: 'destructive' as const, color: 'text-red-600', icon: AlertTriangle },
      disabled: { variant: 'secondary' as const, color: 'text-slate-600', icon: Clock }
    };
    
    const statusConfig = config[status as keyof typeof config];
    const Icon = statusConfig.icon;
    
    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const formatDeadlineDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 md:h-6 md:w-6" />
            Upload Settings
          </h2>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            Configure upload permissions, deadlines, and file restrictions
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onClose} disabled={saving} className="w-full sm:w-auto text-sm" size="sm">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={saving} 
            className={`w-full sm:w-auto text-sm ${hasUnsavedChanges ? 'bg-orange-600 hover:bg-orange-700 animate-pulse' : ''}`}
            size="sm"
          >
            <Save className="h-4 w-4 sm:mr-2" />
            {saving ? 'Saving...' : (
              <>
                <span className="hidden sm:inline">{hasUnsavedChanges ? 'Save Changes' : 'Save Settings'}</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Unsaved Changes Warning */}
      {hasUnsavedChanges && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-900">
            <strong>Unsaved Changes:</strong> You have modified deadline settings. Click "Save Changes" above to apply your changes to the database.
          </AlertDescription>
        </Alert>
      )}

      {/* Success Banner */}
      {justSaved && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <span className="font-medium">Settings saved successfully!</span> Your upload configuration has been updated. 
            {deadlines.length > 0 && (
              <span> {deadlines.length} deadline{deadlines.length > 1 ? 's are' : ' is'} now active.</span>
            )}
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="deadlines" className="space-y-4 md:space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="deadlines" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Upload Deadlines</span>
            <span className="sm:hidden">Deadlines</span>
          </TabsTrigger>
          <TabsTrigger value="global" className="text-xs sm:text-sm">
            <span className="hidden sm:inline">Global Settings</span>
            <span className="sm:hidden">Settings</span>
          </TabsTrigger>
        </TabsList>

        {/* Deadlines Tab */}
        <TabsContent value="deadlines" className="space-y-4 md:space-y-6">
          <Alert>
            <Info className="h-4 w-4" />
            <AlertDescription className="text-sm">
              Upload deadlines restrict all teachers from uploading materials after the specified date and time. 
              Teachers will not be able to submit e-notes or exam questions once a deadline has passed.
            </AlertDescription>
          </Alert>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h3 className="text-base md:text-lg font-semibold">Upload Deadlines</h3>
            <Button onClick={handleAddDeadline} className="w-full sm:w-auto text-sm" size="sm">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Add Deadline</span>
              <span className="sm:hidden">Add</span>
            </Button>
          </div>

          <div className="space-y-3 md:space-y-4">
            {deadlines.map((deadline) => (
              <Card key={deadline.id}>
                <CardContent className="p-3 md:p-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 md:gap-4 items-end">
                    <div>
                      <Label>Session</Label>
                      <Select 
                        value={deadline.session} 
                        onValueChange={(value) => handleUpdateDeadline(deadline.id, { session: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sessions.map(session => (
                            <SelectItem key={session} value={session}>{session}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Term</Label>
                      <Select 
                        value={deadline.term} 
                        onValueChange={(value) => handleUpdateDeadline(deadline.id, { term: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {terms.map(term => (
                            <SelectItem key={term} value={term}>{term}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Upload Type</Label>
                      <Select 
                        value={deadline.uploadType} 
                        onValueChange={(value: any) => handleUpdateDeadline(deadline.id, { uploadType: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {uploadTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Deadline</Label>
                      <Input
                        type="datetime-local"
                        value={deadline.deadline ? (() => {
                          // Convert ISO string to local datetime format (YYYY-MM-DDTHH:mm)
                          const date = new Date(deadline.deadline);
                          const year = date.getFullYear();
                          const month = String(date.getMonth() + 1).padStart(2, '0');
                          const day = String(date.getDate()).padStart(2, '0');
                          const hours = String(date.getHours()).padStart(2, '0');
                          const minutes = String(date.getMinutes()).padStart(2, '0');
                          return `${year}-${month}-${day}T${hours}:${minutes}`;
                        })() : ''}
                        onChange={(e) => {
                          const value = e.target.value;
                          if (value) {
                            const dateObj = new Date(value);
                            if (!isNaN(dateObj.getTime())) {
                              handleUpdateDeadline(deadline.id, { 
                                deadline: dateObj.toISOString() 
                              });
                            }
                          }
                        }}
                        className="block w-full"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      {getStatusBadge(getDeadlineStatus(deadline))}
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRemoveDeadline(deadline.id)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={deadline.enabled}
                          onCheckedChange={(checked) => 
                            handleUpdateDeadline(deadline.id, { enabled: checked })
                          }
                        />
                        <Label>
                          {deadline.enabled ? 'Enabled' : 'Disabled'}
                          {hasUnsavedChanges && (
                            <span className="text-orange-600 ml-2 text-xs">(unsaved)</span>
                          )}
                        </Label>
                      </div>
                    </div>

                    <div>
                      <Label className="text-sm">Description (Optional)</Label>
                      <Input
                        placeholder="e.g., End of term upload deadline"
                        value={deadline.description || ''}
                        onChange={(e) => 
                          handleUpdateDeadline(deadline.id, { description: e.target.value })
                        }
                      />
                    </div>
                  </div>

                  {getDeadlineStatus(deadline) === 'active' && (
                    <Alert className="mt-4">
                      <Clock className="h-4 w-4" />
                      <AlertDescription>
                        All teachers will be blocked from uploading {deadline.uploadType === 'all' ? 'any materials' : deadline.uploadType === 'enote' ? 'e-notes' : 'exam questions'} for {deadline.term}, {deadline.session} after {formatDeadlineDate(deadline.deadline)}
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {deadlines.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <Calendar className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No Deadlines Set</h3>
                <p className="text-slate-500 mb-4">
                  Add upload deadlines to control when teachers can submit materials.
                </p>
                <Button onClick={handleAddDeadline}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Deadline
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Global Settings Tab */}
        <TabsContent value="global" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Basic Settings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label htmlFor="uploadsEnabled" className="text-base font-medium">
                      Enable Uploads
                    </Label>
                    <p className="text-sm text-slate-600">
                      Allow teachers to upload files globally
                    </p>
                  </div>
                  <Switch
                    id="uploadsEnabled"
                    checked={globalSettings.uploadsEnabled}
                    onCheckedChange={(checked) => 
                      setGlobalSettings(prev => ({ ...prev, uploadsEnabled: checked }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="maxFileSize">Maximum File Size (MB)</Label>
                  <Input
                    id="maxFileSize"
                    type="number"
                    min="1"
                    max="1000"
                    value={globalSettings.maxFileSize}
                    onChange={(e) => 
                      setGlobalSettings(prev => ({ 
                        ...prev, 
                        maxFileSize: parseInt(e.target.value) || 1 
                      }))
                    }
                  />
                </div>

                <div>
                  <Label htmlFor="maxFiles">Maximum Files per Upload</Label>
                  <Input
                    id="maxFiles"
                    type="number"
                    min="1"
                    max="20"
                    value={globalSettings.maxFilesPerUpload}
                    onChange={(e) => 
                      setGlobalSettings(prev => ({ 
                        ...prev, 
                        maxFilesPerUpload: parseInt(e.target.value) || 1 
                      }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Require Approval</Label>
                    <p className="text-sm text-slate-600">
                      All uploads must be approved before students can access
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings.requireApproval}
                    onCheckedChange={(checked) => 
                      setGlobalSettings(prev => ({ ...prev, requireApproval: checked }))
                    }
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Email Notifications</Label>
                    <p className="text-sm text-slate-600">
                      Send email notifications for upload events
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings.emailNotifications}
                    onCheckedChange={(checked) => 
                      setGlobalSettings(prev => ({ ...prev, emailNotifications: checked }))
                    }
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>File Management</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-base font-medium mb-3 block">Allowed File Extensions</Label>
                  <div className="flex gap-2 mb-3">
                    <Input
                      placeholder="e.g., .pdf or pdf"
                      value={newExtension}
                      onChange={(e) => setNewExtension(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleAddExtension()}
                    />
                    <Button onClick={handleAddExtension} size="sm">
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {globalSettings.allowedExtensions.map((ext) => (
                      <Badge key={ext} variant="outline" className="flex items-center gap-1">
                        {ext}
                        <X 
                          className="h-3 w-3 cursor-pointer" 
                          onClick={() => handleRemoveExtension(ext)}
                        />
                      </Badge>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-medium">Auto-delete Old Files</Label>
                    <p className="text-sm text-slate-600">
                      Automatically delete files older than specified days
                    </p>
                  </div>
                  <Switch
                    checked={globalSettings.autoDeleteOldFiles}
                    onCheckedChange={(checked) => 
                      setGlobalSettings(prev => ({ ...prev, autoDeleteOldFiles: checked }))
                    }
                  />
                </div>

                {globalSettings.autoDeleteOldFiles && (
                  <div>
                    <Label htmlFor="retentionDays">File Retention Period (Days)</Label>
                    <Input
                      id="retentionDays"
                      type="number"
                      min="1"
                      max="3650"
                      value={globalSettings.fileRetentionDays}
                      onChange={(e) => 
                        setGlobalSettings(prev => ({ 
                          ...prev, 
                          fileRetentionDays: parseInt(e.target.value) || 365 
                        }))
                      }
                    />
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Debug Tab */}
        <TabsContent value="debug" className="space-y-6">
          <DeadlineDebug />
        </TabsContent>
      </Tabs>
    </div>
  );
}