import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { 
  Upload, 
  FileText, 
  X, 
  Plus,
  Loader2,
  CheckCircle,
  Clock,
  Calendar,
  BookOpen,
  AlertTriangle,
  Eye,
  Download
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { DeadlineCountdown } from '../uploads/DeadlineCountdown';
import { SecurePDFViewer } from './SecurePDFViewer';
import { SecureDocumentViewer } from './SecureDocumentViewer';

interface TeacherUploadsProps {
  teacherId: string;
  teacherName: string;
}

interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  file: File;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
}

interface Upload {
  id: string;
  subject_id?: string;
  subject?: { id: string; name: string } | string;
  type: string;
  week?: number;
  term: string;
  session: string;
  file_url: string;
  signed_url?: string;
  status?: string;
  created_at: string;
  teacher_id: string;
}

export function TeacherUploads({ teacherId, teacherName }: TeacherUploadsProps) {
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploads, setUploads] = useState<Upload[]>([]);
  const [activeDeadlines, setActiveDeadlines] = useState<any[]>([]);
  
  // Form state
  const [title, setTitle] = useState('');
  const [classId, setClassId] = useState(''); // NEW: Class selection
  const [subject, setSubject] = useState('');
  const [uploadType, setUploadType] = useState<'e-notes' | 'exam-questions' | 'assignment' | 'resource'>('e-notes');
  const [week, setWeek] = useState(1);
  const [term, setTerm] = useState('First Term');
  const [session, setSession] = useState('2024/2025');
  const [description, setDescription] = useState('');
  const [files, setFiles] = useState<FileUpload[]>([]);
  const [uploading, setUploading] = useState(false);

  const [classes, setClasses] = useState<any[]>([]); // NEW: Teacher's classes
  const [subjects, setSubjects] = useState<any[]>([]); // All subjects teacher can teach
  const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]); // NEW: Subjects filtered by class
  const [classSubjectPairs, setClassSubjectPairs] = useState<Array<{subject_id: string, class_id: string}>>([]); // NEW: Teacher's assignments
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);

  // Deadline checking state
  const [deadlineInfo, setDeadlineInfo] = useState<{ 
    allowed: boolean; 
    reason?: string; 
    deadline?: string; 
    isExpired?: boolean;
  } | null>(null);
  const [deadlineCheckLoading, setDeadlineCheckLoading] = useState(false);

  // View dialog state
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedUpload, setSelectedUpload] = useState<Upload | null>(null);
  const [loadingFile, setLoadingFile] = useState(false);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  // Admin settings for current term/session
  const [currentTerm, setCurrentTerm] = useState('');
  const [currentSession, setCurrentSession] = useState('');

  // Cleanup blob URLs when dialog closes
  useEffect(() => {
    return () => {
      if (fileContent && fileContent.startsWith('blob:')) {
        URL.revokeObjectURL(fileContent);
      }
    };
  }, [fileContent]);

  const supabase = createClient();

  useEffect(() => {
    fetchData();
    fetchDeadlines();
  }, []);

  // Check deadline when term, session, or upload type changes
  useEffect(() => {
    if (term && session && uploadType) {
      console.log('[TeacherUploads] Checking deadline for:', { term, session, type: uploadType });
      checkDeadline();
    }
  }, [term, session, uploadType]);

  // Filter subjects when class selection changes
  useEffect(() => {
    if (!classId) {
      // No class selected - show all subjects
      setFilteredSubjects(subjects);
      console.log('[TeacherUploads] No class selected, showing all subjects');
    } else {
      // Filter subjects to only those teacher teaches for this class
      const subjectsForClass = classSubjectPairs
        .filter(pair => pair.class_id === classId)
        .map(pair => subjects.find(s => s.id === pair.subject_id))
        .filter(Boolean);
      
      setFilteredSubjects(subjectsForClass);
      console.log('[TeacherUploads] Class selected:', classId, 'Filtered subjects:', subjectsForClass.length);
      
      // If current subject is not in filtered list, clear it
      if (subject && !subjectsForClass.find(s => s.id === subject)) {
        setSubject('');
      }
    }
  }, [classId, subjects, classSubjectPairs]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const headers = {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch teacher assignments (classes and subjects)
      const assignmentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-assignments`,
        { headers }
      );
      const assignmentsData = await assignmentsRes.json();
      if (assignmentsData.success) {
        setClasses(assignmentsData.classes || []);
        setSubjects(assignmentsData.subjects || []);
        setClassSubjectPairs(assignmentsData.assignments || []);
        setFilteredSubjects(assignmentsData.subjects || []); // Initially show all subjects
        
        console.log('[TeacherUploads] Loaded assignments:', {
          classes: assignmentsData.classes?.length || 0,
          subjects: assignmentsData.subjects?.length || 0,
          pairs: assignmentsData.assignments?.length || 0
        });
      }

      // Fetch sessions and terms
      const sessionSettingsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const sessionSettingsData = await sessionSettingsRes.json();
      if (sessionSettingsData.success) {
        setSessions(sessionSettingsData.sessions || []);
        setTerms(sessionSettingsData.terms || []);
        
        if (sessionSettingsData.sessions?.length > 0) {
          setSession(sessionSettingsData.sessions[0].session_name || sessionSettingsData.sessions[0].name);
        }
        if (sessionSettingsData.terms?.length > 0) {
          setTerm(sessionSettingsData.terms[0].term_name || sessionSettingsData.terms[0].name);
        }
        
        // Get current term and session from first items (most recent)
        if (sessionSettingsData.sessions?.length > 0) {
          const currentSessionName = sessionSettingsData.sessions[0].session_name || sessionSettingsData.sessions[0].name;
          setCurrentSession(currentSessionName);
        }
        if (sessionSettingsData.terms?.length > 0) {
          const currentTermName = sessionSettingsData.terms[0].term_name || sessionSettingsData.terms[0].name;
          setCurrentTerm(currentTermName);
        }
      }

      // Fetch uploads
      const uploadsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads`,
        { headers }
      );
      const uploadsData = await uploadsRes.json();
      if (uploadsData.success) {
        setUploads(uploadsData.uploads || []);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchDeadlines = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-settings`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await res.json();
      
      if (data.success && data.settings?.deadlines) {
        const enabled = data.settings.deadlines.filter((d: any) => d.enabled);
        setActiveDeadlines(enabled);
      }
    } catch (error) {
      console.error('Error fetching deadlines:', error);
    }
  };

  const checkDeadline = async () => {
    try {
      console.log('[TeacherUploads] checkDeadline called');
      setDeadlineCheckLoading(true);
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        console.log('[TeacherUploads] No session, skipping deadline check');
        setDeadlineCheckLoading(false);
        return;
      }

      // Convert upload type to backend format
      const TYPE_MAPPING: Record<string, string> = {
        'e-notes': 'e-notes',
        'exam-questions': 'exam_question',
        'assignment': 'assignment',
        'resource': 'other_resources'
      };

      const requestBody = {
        term,
        session,
        type: TYPE_MAPPING[uploadType] || uploadType
      };
      console.log('[TeacherUploads] Checking deadline with:', requestBody);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/check-upload-deadline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      const result = await response.json();
      console.log('[TeacherUploads] checkDeadline result:', result);
      
      if (result.success) {
        const newDeadlineInfo = {
          allowed: result.allowed,
          reason: result.reason,
          deadline: result.deadline,
          isExpired: result.isExpired || false
        };
        console.log('[TeacherUploads] Setting deadlineInfo to:', newDeadlineInfo);
        console.log('[TeacherUploads] Upload button will be:', newDeadlineInfo.allowed ? 'ENABLED' : 'DISABLED ❌');
        setDeadlineInfo(newDeadlineInfo);
      } else {
        console.log('[TeacherUploads] Deadline check failed or no deadline set:', result.error);
        // No deadline set = allowed to upload
        setDeadlineInfo({ allowed: true, isExpired: false });
      }
    } catch (error) {
      console.error('[TeacherUploads] Error checking deadline:', error);
      // On error, allow upload (fail open)
      setDeadlineInfo({ allowed: true, isExpired: false });
    } finally {
      setDeadlineCheckLoading(false);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    
    if (files.length + selectedFiles.length > 5) {
      toast.error('Maximum 5 files allowed per upload');
      return;
    }

    const newFiles: FileUpload[] = selectedFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      size: file.size,
      type: file.type,
      file,
      status: 'pending' as const,
      progress: 0
    }));

    setFiles([...files, ...newFiles]);
  };

  const removeFile = (fileId: string) => {
    setFiles(files.filter(f => f.id !== fileId));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    if (!classId) {
      toast.error('Please select a class');
      return;
    }

    if (!subject) {
      toast.error('Please select a subject');
      return;
    }

    if (files.length === 0) {
      toast.error('Please select at least one file');
      return;
    }

    setUploading(true);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        toast.error('Not authenticated');
        return;
      }

      // Convert upload type to backend format
      const backendType = uploadType === 'e-notes' ? 'enote' : 
                         uploadType === 'exam-questions' ? 'exam_question' : 
                         uploadType;

      // Process files - convert to base64
      const processedFiles = [];
      for (const fileUpload of files) {
        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id ? { ...f, status: 'uploading' as const, progress: 50 } : f
        ));

        // Read file as base64
        const reader = new FileReader();
        const base64Data = await new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(fileUpload.file);
        });

        processedFiles.push({
          name: fileUpload.name,
          size: fileUpload.size,
          type: fileUpload.type,
          data: base64Data
        });

        setFiles(prev => prev.map(f => 
          f.id === fileUpload.id ? { ...f, progress: 80 } : f
        ));
      }

      // Upload to server
      const payload = {
        subject_id: subject,
        class_id: classId, // NEW: Include class_id
        type: backendType,
        week: uploadType !== 'exam-questions' ? week : undefined,
        term,
        session,
        files: processedFiles
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        }
      );

      const data = await res.json();

      if (data.success) {
        // Mark all files as completed
        setFiles(prev => prev.map(f => ({ ...f, status: 'completed' as const, progress: 100 })));
        
        toast.success('Files uploaded successfully!');
        resetForm();
        setShowUploadForm(false);
        fetchData();
      } else {
        // Mark all files as error
        setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })));
        toast.error(data.error || 'Failed to upload files');
      }
    } catch (error) {
      console.error('Upload error:', error);
      // Mark all files as error
      setFiles(prev => prev.map(f => ({ ...f, status: 'error' as const })));
      toast.error(error instanceof Error ? error.message : 'Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setClassId(''); // Clear class selection
    setSubject(''); // Clear subject selection
    setDescription('');
    setFiles([]);
    setWeek(1);
    setUploadType('e-notes');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'uploaded': return 'outline';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'e-notes':
      case 'enote': return 'E-Notes';
      case 'exam-questions':
      case 'exam_question': return 'Exam Questions';
      case 'assignment': return 'Assignment';
      case 'resource': return 'Resource';
      default: return type;
    }
  };

  const handleViewUpload = async (upload: Upload) => {
    setSelectedUpload(upload);
    setViewDialogOpen(true);
    setLoadingFile(true);
    setFileContent(null);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        toast.error('Session expired. Please login again.');
        return;
      }

      // Fetch file as blob to create a clean blob URL (no tokens visible)
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/${upload.id}/file`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`
          }
        }
      );

      if (!response.ok) {
        toast.error('Failed to load file');
        setLoadingFile(false);
        return;
      }

      // Convert to blob and create object URL
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);
      
      setFileContent(blobUrl);
      setSelectedUpload({ ...upload, signed_url: blobUrl });
    } catch (error) {
      console.error('Error loading file:', error);
      toast.error('Failed to load file');
    } finally {
      setLoadingFile(false);
    }
  };

  const handleDeleteUpload = async () => {
    if (!selectedUpload) return;

    setDeleteLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        toast.error('Session expired. Please login again.');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/${selectedUpload.id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Upload deleted successfully');
        setUploads(uploads.filter(u => u.id !== selectedUpload.id));
        
        // Cleanup blob URL
        if (fileContent && fileContent.startsWith('blob:')) {
          URL.revokeObjectURL(fileContent);
        }
        
        setShowDeleteDialog(false);
        setViewDialogOpen(false);
        setSelectedUpload(null);
        setFileContent(null);
      } else {
        toast.error(data.error || 'Failed to delete upload');
      }
    } catch (error) {
      console.error('Error deleting upload:', error);
      toast.error('Failed to delete upload');
    } finally {
      setDeleteLoading(false);
    }
  };

  const getFileExtension = (url: string) => {
    const path = url.split('?')[0];
    return path.split('.').pop()?.toLowerCase() || '';
  };

  const renderFileViewer = () => {
    if (loadingFile) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] sm:h-[500px] space-y-4">
          <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
          <p className="text-slate-600">Loading file...</p>
        </div>
      );
    }

    if (!fileContent) {
      return (
        <div className="flex items-center justify-center h-[60vh] sm:h-[500px]">
          <p className="text-slate-500">No file available</p>
        </div>
      );
    }

    const fileExt = getFileExtension(selectedUpload?.file_url || '');
    const isPDF = fileExt === 'pdf';
    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'].includes(fileExt);
    const isDocument = ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(fileExt);
    const isText = ['txt', 'md', 'json', 'xml', 'csv'].includes(fileExt);

    if (isPDF) {
      return (
        <SecurePDFViewer 
          blobUrl={fileContent}
          className="w-full h-[60vh] sm:h-[500px] rounded overflow-hidden"
        />
      );
    }

    if (isImage) {
      return (
        <div className="flex items-center justify-center p-4 bg-slate-50 rounded min-h-[300px] relative">
          <img
            src={fileContent}
            alt="Upload preview"
            className="max-w-full max-h-[60vh] sm:max-h-[500px] object-contain rounded shadow-lg select-none"
            style={{ 
              display: 'block', 
              margin: '0 auto',
              pointerEvents: 'auto'
            }}
            onContextMenu={(e) => e.preventDefault()}
            draggable={false}
          />
        </div>
      );
    }

    if (isDocument) {
      // Office documents - use secure viewer with no URL exposure
      return (
        <SecureDocumentViewer
          blobUrl={fileContent}
          fileName={selectedUpload?.file_url?.split('/').pop()?.split('?')[0] || 'Document'}
          fileType={fileExt}
          className="w-full h-[60vh] sm:h-[500px]"
        />
      );
    }

    // Default: Secure download interface for other file types
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] sm:h-[500px] space-y-6 bg-gradient-to-br from-slate-50 to-slate-100 rounded p-8">
        <div className="relative">
          <div className="absolute inset-0 bg-slate-400 rounded-full blur-2xl opacity-20 animate-pulse" />
          <div className="relative bg-white rounded-full p-8 shadow-xl">
            <FileText className="h-20 w-20 text-slate-600" />
          </div>
        </div>
        
        <div className="text-center space-y-3 max-w-md">
          <p className="text-slate-800 truncate px-4 max-w-full">
            {selectedUpload?.file_url?.split('/').pop()?.split('?')[0] || 'File'}
          </p>
          <div className="flex items-center justify-center gap-2">
            <div className="h-1 w-1 rounded-full bg-slate-400" />
            <p className="text-sm text-slate-600">
              {fileExt.toUpperCase()} File
            </p>
            <div className="h-1 w-1 rounded-full bg-slate-400" />
          </div>
        </div>
        
        <Button 
          onClick={() => {
            const link = document.createElement('a');
            link.href = fileContent;
            link.download = selectedUpload?.file_url?.split('/').pop()?.split('?')[0] || 'file';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }} 
          size="lg"
          className="gap-2 shadow-lg hover:shadow-xl transition-shadow px-8"
        >
          <Download className="h-5 w-5" />
          Download File
        </Button>
        
        <p className="text-xs text-slate-500 text-center max-w-sm">
          Click to securely download this file. No file information or access credentials are exposed.
        </p>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-12 w-12 animate-spin text-blue-600" />
      </div>
    );
  }

  if (showUploadForm) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 pt-16 md:pt-0">
          <div>
            <h2 className="text-2xl font-bold">Upload Learning Materials</h2>
            <p className="text-slate-600 mt-1">
              Share e-notes, exam questions, assignments, and resources with students
            </p>
          </div>
          <Button variant="outline" onClick={() => setShowUploadForm(false)}>
            Cancel
          </Button>
        </div>

        {/* Deadline Status Alerts */}
        {deadlineCheckLoading && (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-800">
              Checking upload deadline...
            </AlertDescription>
          </Alert>
        )}

        {deadlineInfo && !deadlineInfo.allowed && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <strong>❌ Upload Deadline Expired:</strong> {deadlineInfo.reason}
              <div className="mt-2 text-xs font-mono bg-red-100 p-2 rounded">
                <div>Term: {term}</div>
                <div>Session: {session}</div>
                <div>Type: {uploadType}</div>
                <div className="font-bold text-red-900 mt-1">Button State: DISABLED ❌</div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {!deadlineCheckLoading && deadlineInfo && deadlineInfo.allowed && deadlineInfo.deadline && !deadlineInfo.isExpired && (
          <Alert className="border-blue-200 bg-blue-50">
            <Clock className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Upcoming Deadline:</strong> Uploads for {term}, {session} must be submitted before {new Date(deadlineInfo.deadline).toLocaleString()}
            </AlertDescription>
          </Alert>
        )}



        <Card>
          <CardContent className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <div>
                <Label>Title *</Label>
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Quadratic Equations - Chapter 5"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label>Class *</Label>
                  <Select value={classId} onValueChange={setClassId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.length > 0 ? (
                        classes.map(classItem => (
                          <SelectItem key={classItem.id} value={classItem.id}>
                            {classItem.display_name}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value="loading" disabled>Loading classes...</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {classId ? 'Subjects will be filtered for this class' : 'Select a class first'}
                  </p>
                </div>

                <div>
                  <Label>Subject *</Label>
                  <Select 
                    value={subject} 
                    onValueChange={setSubject}
                    disabled={!classId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder={classId ? "Select subject" : "Select class first"} />
                    </SelectTrigger>
                    <SelectContent>
                      {filteredSubjects.length > 0 ? (
                        filteredSubjects.map(s => (
                          <SelectItem key={s.id} value={s.id}>
                            {s.name}
                          </SelectItem>
                        ))
                      ) : classId ? (
                        <SelectItem value="none" disabled>No subjects assigned for this class</SelectItem>
                      ) : (
                        <SelectItem value="none" disabled>Select a class first</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-slate-500 mt-1">
                    {classId ? `${filteredSubjects.length} subject(s) available` : 'Choose class to see subjects'}
                  </p>
                </div>
              </div>

              <div>
                <Label>Upload Type *</Label>
                <Select value={uploadType} onValueChange={(v: any) => setUploadType(v)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="e-notes">E-Notes</SelectItem>
                    <SelectItem value="exam-questions">Exam Questions</SelectItem>
                    <SelectItem value="assignment">Assignment</SelectItem>
                    <SelectItem value="resource">Resource</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className={`grid grid-cols-1 gap-4 ${uploadType === 'exam-questions' ? 'md:grid-cols-2' : 'md:grid-cols-3'}`}>
                <div>
                  <Label>Session</Label>
                  <Select value={session} onValueChange={setSession}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {sessions.map((s, idx) => {
                        const sessionName = s.session_name || s.name || s;
                        return (
                          <SelectItem key={s.id || idx} value={sessionName}>
                            {sessionName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Term</Label>
                  <Select value={term} onValueChange={setTerm}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {terms.map((t, idx) => {
                        const termName = t.term_name || t.name || t;
                        return (
                          <SelectItem key={t.id || idx} value={termName}>
                            {termName}
                          </SelectItem>
                        );
                      })}
                    </SelectContent>
                  </Select>
                </div>

                {/* Hide week field for exam questions */}
                {uploadType !== 'exam-questions' && (
                  <div>
                    <Label>Week</Label>
                    <Select value={week.toString()} onValueChange={(v) => setWeek(parseInt(v))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 14 }, (_, i) => i + 1).map(w => (
                          <SelectItem key={w} value={w.toString()}>
                            Week {w}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              <div>
                <Label>Description (Optional)</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add any additional details about this upload..."
                  rows={3}
                />
              </div>
            </div>

            {/* File Upload */}
            <div className="space-y-4">
              <div>
                <Label>Files *</Label>
                <div className="mt-2">
                  <label className="flex items-center justify-center w-full h-32 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer hover:border-blue-500 transition-colors">
                    <div className="text-center">
                      <Upload className="h-10 w-10 text-slate-400 mx-auto mb-2" />
                      <p className="text-sm text-slate-600">
                        Click to select files or drag and drop
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        PDF, DOC, DOCX, PPT, PPTX, JPG, PNG (Max 50MB per file, 5 files max)
                      </p>
                    </div>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png"
                      onChange={handleFileSelect}
                      disabled={uploading}
                    />
                  </label>
                </div>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="space-y-2">
                  {files.map(file => (
                    <div
                      key={file.id}
                      className="flex items-center justify-between p-3 border rounded-lg gap-2"
                    >
                      <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
                        <FileText className="h-4 w-4 md:h-5 md:w-5 text-slate-600 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-xs md:text-sm font-medium truncate">{file.name}</p>
                          <p className="text-[10px] md:text-xs text-slate-500">{formatFileSize(file.size)}</p>
                        </div>
                      </div>
                      {file.status === 'uploading' && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                          <span className="text-sm text-blue-600">{file.progress}%</span>
                        </div>
                      )}
                      {file.status === 'completed' && (
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      )}
                      {file.status === 'pending' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFile(file.id)}
                          disabled={uploading}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSubmit} 
                disabled={uploading || deadlineCheckLoading || (deadlineInfo && !deadlineInfo.allowed)}
              >
                {uploading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Uploading...
                  </>
                ) : deadlineCheckLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Checking deadline...
                  </>
                ) : (
                  <>
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Files
                  </>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <BookOpen className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Uploads</h1>
              <p className="text-teal-100 text-sm md:text-base mt-1">
                Manage educational materials
              </p>
            </div>
          </div>
          <Button 
            onClick={() => setShowUploadForm(true)} 
            size="sm" 
            className="bg-white text-teal-600 hover:bg-teal-50"
          >
            <Plus className="h-4 w-4 md:mr-2" />
            <span className="hidden md:inline">Upload</span>
          </Button>
        </div>
      </div>

      {/* Active Deadlines */}
      {activeDeadlines.length > 0 && (
        <DeadlineCountdown deadlines={activeDeadlines} userRole="teacher" />
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <FileText className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Uploads</p>
                <p className="text-2xl font-bold">{uploads.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">
                  {currentTerm && currentSession ? `${currentTerm} - ${currentSession}` : 'This Term and Session'}
                </p>
                <p className="text-2xl font-bold">
                  {currentTerm && currentSession 
                    ? uploads.filter(u => u.term === currentTerm && u.session === currentSession).length
                    : uploads.filter(u => u.term === term && u.session === session).length
                  }
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Uploads */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers Uploads</CardTitle>
        </CardHeader>
        <CardContent>
          {uploads.length === 0 ? (
            <div className="text-center py-12">
              <Upload className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-600 mb-2">
                No uploads yet
              </h3>
              <p className="text-slate-500 mb-6">
                Start by uploading your first learning material
              </p>
              <Button onClick={() => setShowUploadForm(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Upload Files
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {uploads.map(upload => (
                <div
                  key={upload.id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 border rounded-lg hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-start sm:items-center gap-3 flex-1 min-w-0">
                    <FileText className="h-5 w-5 text-slate-600 flex-shrink-0 mt-0.5 sm:mt-0" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm sm:text-base truncate">
                        {(() => {
                          // Generate title from type and subject
                          const subjectName = typeof upload.subject === 'object' && upload.subject?.name 
                            ? upload.subject.name 
                            : subjects.find(s => s.id === upload.subject_id)?.name || 'Unknown';
                          const typeName = getTypeLabel(upload.type);
                          return `${subjectName} - ${typeName}`;
                        })()}
                      </p>
                      <div className="flex flex-wrap items-center gap-2 mt-1 text-xs sm:text-sm text-slate-600">
                        <span className="flex items-center gap-1">
                          <BookOpen className="h-3 w-3" />
                          <span className="hidden sm:inline">
                            {(() => {
                              // Handle if upload.subject is an object or string
                              if (typeof upload.subject === 'object' && upload.subject?.name) {
                                return upload.subject.name;
                              }
                              const foundSubject = subjects.find(s => s.id === upload.subject_id);
                              return foundSubject?.name || 'Unknown';
                            })()}
                          </span>
                        </span>
                        <span className="hidden sm:inline">•</span>
                        <span>{getTypeLabel(upload.type)}</span>
                        {upload.week && (
                          <>
                            <span>•</span>
                            <span>Week {upload.week}</span>
                          </>
                        )}
                        <span className="hidden sm:inline">•</span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {new Date(upload.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewUpload(upload)}
                      className="gap-1.5 text-xs sm:text-sm"
                    >
                      <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden xs:inline">View</span>
                    </Button>
                    <Badge 
                      variant={getStatusColor(upload.status || 'uploaded')}
                      className="text-xs"
                    >
                      {upload.status || 'uploaded'}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* View Upload Dialog */}
      <Dialog 
        open={viewDialogOpen} 
        onOpenChange={(open) => {
          if (!open && fileContent && fileContent.startsWith('blob:')) {
            // Cleanup blob URL when dialog closes
            URL.revokeObjectURL(fileContent);
            setFileContent(null);
          }
          setViewDialogOpen(open);
        }}
      >
        <DialogContent className="max-w-4xl max-h-[95vh] p-0 flex flex-col">
          <DialogHeader className="p-4 sm:p-6 pb-4 border-b flex-shrink-0">
            <DialogTitle>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-blue-600 flex-shrink-0" />
                    <span className="text-sm sm:text-base truncate">
                      {selectedUpload ? (() => {
                        const subjectName = typeof selectedUpload.subject === 'object' && selectedUpload.subject?.name 
                          ? selectedUpload.subject.name 
                          : subjects.find(s => s.id === selectedUpload.subject_id)?.name || 'Unknown';
                        const typeName = getTypeLabel(selectedUpload.type);
                        return `${subjectName} - ${typeName}`;
                      })() : 'View Upload'}
                    </span>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center gap-2 flex-shrink-0">
                  {fileContent && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        const link = document.createElement('a');
                        link.href = fileContent;
                        link.download = selectedUpload?.file_url?.split('/').pop()?.split('?')[0] || 'file';
                        link.target = '_blank';
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                      }}
                      className="gap-1.5"
                    >
                      <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Download</span>
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowDeleteDialog(true)}
                    className="gap-1.5 text-red-600 hover:text-red-700 hover:bg-red-50 border-red-200"
                  >
                    <X className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            </DialogTitle>
            <DialogDescription className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm text-slate-600">
              {selectedUpload ? (
                <>
                  <span>{selectedUpload.term}</span>
                  <span>•</span>
                  <span>{selectedUpload.session}</span>
                  {selectedUpload.week && (
                    <>
                      <span>•</span>
                      <span>Week {selectedUpload.week}</span>
                    </>
                  )}
                </>
              ) : (
                <span>File preview</span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="p-4 sm:p-6 overflow-auto flex-1">
            {renderFileViewer()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Upload
            </DialogTitle>
            <DialogDescription>
              Confirm deletion of this uploaded file
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Are you sure you want to delete this upload? This action cannot be undone.
            </p>
            {selectedUpload && (
              <div className="p-3 bg-slate-50 rounded border text-sm">
                <p className="font-medium">
                  {(() => {
                    const subjectName = typeof selectedUpload.subject === 'object' && selectedUpload.subject?.name 
                      ? selectedUpload.subject.name 
                      : subjects.find(s => s.id === selectedUpload.subject_id)?.name || 'Unknown';
                    const typeName = getTypeLabel(selectedUpload.type);
                    return `${subjectName} - ${typeName}`;
                  })()}
                </p>
                <p className="text-xs text-slate-600 mt-1">
                  {selectedUpload.term} • {selectedUpload.session}
                  {selectedUpload.week && ` • Week ${selectedUpload.week}`}
                </p>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
                disabled={deleteLoading}
                className="w-full sm:w-auto"
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleDeleteUpload}
                disabled={deleteLoading}
                className="w-full sm:w-auto"
              >
                {deleteLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Deleting...
                  </>
                ) : (
                  'Delete Upload'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}