import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { 
  Upload, 
  FileText, 
  X, 
  CheckCircle, 
  AlertTriangle,
  Calendar,
  Clock,
  FileUp,
  Save,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

export interface UploadMetadata {
  id?: string;
  title: string;
  subject: string;
  class?: string; // Class ID for the upload
  week: number;
  term: string;
  session: string;
  teacherId: string;
  teacherName: string;
  uploadType: 'e-notes' | 'exam-questions' | 'assignment' | 'other-resources';
  files: FileUpload[];
  version: number;
  description?: string;
  tags?: string[];
  uploadedAt?: Date;
  status: 'draft' | 'uploaded' | 'approved' | 'rejected';
  deadline?: Date;
  isLateSubmission?: boolean;
}

export interface FileUpload {
  id: string;
  name: string;
  size: number;
  type: string;
  file?: File;
  url?: string;
  uploadProgress?: number;
  status: 'pending' | 'uploading' | 'completed' | 'error';
}

interface UploadFormProps {
  onSubmit: (metadata: UploadMetadata) => void;
  onSaveDraft: (metadata: UploadMetadata) => void;
  onCancel: () => void;
  initialData?: Partial<UploadMetadata>;
  uploadSettings?: {
    maxFileSize: number;
    allowedExtensions: string[];
    maxFilesPerUpload: number;
    uploadEnabled: boolean;
    deadlineDate?: Date;
  };
  userRole: 'teacher' | 'admin';
  teacherId: string;
  teacherName: string;
}

const mockSubjects = [
  'Mathematics', 'English Language', 'Physics', 'Chemistry', 'Biology',
  'History', 'Geography', 'Economics', 'Government', 'Literature'
];

const weeks = Array.from({ length: 14 }, (_, i) => i + 1);

export function UploadForm({
  onSubmit,
  onSaveDraft,
  onCancel,
  initialData,
  uploadSettings = {
    maxFileSize: 50 * 1024 * 1024, // 50MB
    allowedExtensions: ['.pdf', '.doc', '.docx', '.ppt', '.pptx', '.jpg', '.png'],
    maxFilesPerUpload: 5,
    uploadEnabled: true
  },
  userRole,
  teacherId,
  teacherName
}: UploadFormProps) {
  // Map frontend upload types to database types (shared across all functions)
  const TYPE_MAPPING: Record<string, string> = {
    'e-notes': 'e-notes',
    'exam-questions': 'exam_question',
    'assignment': 'assignment',
    'other-resources': 'other_resources'
  };

  const [formData, setFormData] = useState<UploadMetadata>({
    title: initialData?.title || '',
    subject: initialData?.subject || '',
    class: initialData?.class || '',
    week: initialData?.week || 1,
    term: initialData?.term || 'First Term',
    session: initialData?.session || '2024/2025',
    teacherId,
    teacherName,
    uploadType: initialData?.uploadType || 'e-notes',
    files: initialData?.files || [],
    version: initialData?.version || 1,
    description: initialData?.description || '',
    status: 'draft',
    deadline: uploadSettings.deadlineDate
  });

  const [dragActive, setDragActive] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [classes, setClasses] = useState<any[]>([]); // Teacher's classes
  const [subjects, setSubjects] = useState<any[]>([]); // All subjects teacher can teach
  const [filteredSubjects, setFilteredSubjects] = useState<any[]>([]); // Subjects for selected class
  const [classSubjectPairs, setClassSubjectPairs] = useState<Array<{subject_id: string, class_id: string}>>([]); // Teacher's assignments
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [deadlineInfo, setDeadlineInfo] = useState<{ 
    allowed: boolean; 
    reason?: string; 
    deadline?: string; 
    isExpired?: boolean;
    requiresTeacherSelection?: boolean;
  } | null>(null);
  const [deadlineCheckLoading, setDeadlineCheckLoading] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<string>(teacherId);

  const supabase = createClient();

  // Fetch teacher assignments and settings on mount
  useEffect(() => {
    console.log('[UploadForm] Component mounted, userRole:', userRole);
    fetchTeacherAssignments(); // Fetch teacher's classes and subjects
    fetchSessionSettings();
    if (userRole === 'admin') {
      console.log('[UploadForm] Fetching teachers for admin...');
      fetchTeachers();
    }
  }, []);

  // Check deadline when term, session, or upload type changes
  // Use ref to track if we've already checked for these values
  const lastDeadlineCheck = useRef<string>('');
  
  useEffect(() => {
    if (formData.term && formData.session && formData.uploadType) {
      const checkKey = `${formData.term}-${formData.session}-${formData.uploadType}`;
      
      // Only check if this combination hasn't been checked yet
      if (lastDeadlineCheck.current !== checkKey) {
        console.log('[UploadForm] Checking deadline for:', { 
          term: formData.term, 
          session: formData.session, 
          type: formData.uploadType 
        });
        lastDeadlineCheck.current = checkKey;
        checkDeadline();
      }
    }
  }, [formData.term, formData.session, formData.uploadType]);

  // Debug deadline info
  useEffect(() => {
    console.log('[UploadForm] deadlineInfo updated:', deadlineInfo);
    console.log('[UploadForm] Should show teacher field?', {
      userRole,
      isAdmin: userRole === 'admin',
      isExpired: deadlineInfo?.isExpired,
      requiresSelection: deadlineInfo?.requiresTeacherSelection,
      shouldShow: userRole === 'admin' && (deadlineInfo?.isExpired || deadlineInfo?.requiresTeacherSelection)
    });
  }, [deadlineInfo, userRole]);

  // Filter subjects when class selection changes
  useEffect(() => {
    if (!formData.class) {
      // No class selected - show all subjects
      setFilteredSubjects(subjects);
      console.log('[UploadForm] No class selected, showing all subjects');
    } else {
      // Filter subjects to only those teacher teaches for this class
      const subjectsForClass = classSubjectPairs
        .filter(pair => pair.class_id === formData.class)
        .map(pair => subjects.find(s => s.id === pair.subject_id))
        .filter(Boolean);
      
      setFilteredSubjects(subjectsForClass);
      console.log('[UploadForm] Class selected:', formData.class, 'Filtered subjects:', subjectsForClass.length);
      
      // If current subject is not in filtered list, clear it
      if (formData.subject && !subjectsForClass.find(s => s.id === formData.subject)) {
        setFormData(prev => ({ ...prev, subject: '' }));
      }
    }
  }, [formData.class, subjects, classSubjectPairs]);

  const fetchTeacherAssignments = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      console.log('[UploadForm] Fetching teacher assignments...');

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-assignments`,
        { headers }
      );
      const data = await res.json();
      
      console.log('[UploadForm] Teacher assignments response:', data);
      
      if (data.success) {
        setClasses(data.classes || []);
        setSubjects(data.subjects || []);
        setClassSubjectPairs(data.assignments || []);
        
        // Initially show all subjects if no class selected
        setFilteredSubjects(data.subjects || []);
        
        console.log('[UploadForm] Loaded:', {
          classes: data.classes?.length || 0,
          subjects: data.subjects?.length || 0,
          pairs: data.assignments?.length || 0
        });
      }
    } catch (error) {
      console.error('[UploadForm] Error fetching teacher assignments:', error);
    }
  };

  const fetchSessionSettings = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const data = await res.json();
      if (data.success) {
        setSessions(data.sessions || []);
        setTerms(data.terms || []);

        // Auto-select current session and term
        const currentSession = data.sessions?.find((s: any) => s.is_current);
        const currentTerm = data.terms?.find((t: any) => t.is_current);
        
        if (currentSession || currentTerm) {
          setFormData(prev => ({
            ...prev,
            session: currentSession?.session_name || prev.session,
            term: currentTerm?.term_name || prev.term
          }));
        }
      }
    } catch (error) {
      console.error('Error fetching session settings:', error);
    }
  };

  const fetchTeachers = async () => {
    try {
      console.log('[UploadForm] Starting fetchTeachers...');
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        console.log('[UploadForm] No session found');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers-for-upload`,
        { headers }
      );
      const data = await res.json();
      console.log('[UploadForm] Teachers fetch response:', data);
      
      if (data.success) {
        setTeachers(data.teachers || []);
        console.log('[UploadForm] Teachers loaded:', data.teachers?.length);
      } else {
        console.error('[UploadForm] Teachers fetch failed:', data.error);
      }
    } catch (error) {
      console.error('[UploadForm] Error fetching teachers:', error);
    }
  };

  const checkDeadline = async () => {
    try {
      console.log('[UploadForm] checkDeadline called');
      setDeadlineCheckLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[UploadForm] No session, skipping deadline check');
        setDeadlineCheckLoading(false);
        return;
      }

      const requestBody = {
        term: formData.term,
        session: formData.session,
        type: TYPE_MAPPING[formData.uploadType] || formData.uploadType
      };
      console.log('[UploadForm] Checking deadline with:', requestBody);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/check-upload-deadline`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify(requestBody)
        }
      );

      const result = await response.json();
      console.log('[UploadForm] checkDeadline result:', result);
      
      if (result.success) {
        const newDeadlineInfo = {
          allowed: result.allowed,
          reason: result.reason,
          deadline: result.deadline,
          isExpired: result.isExpired || false,
          requiresTeacherSelection: result.requiresTeacherSelection || false
        };
        console.log('[UploadForm] Setting deadlineInfo to:', newDeadlineInfo);
        console.log('[UploadForm] Button will be:', newDeadlineInfo.allowed ? 'ENABLED' : 'DISABLED');
        setDeadlineInfo(newDeadlineInfo);
      } else {
        console.log('[UploadForm] Deadline check failed or no deadline set:', result.error);
        // No deadline set = allowed to upload
        setDeadlineInfo({ allowed: true, isExpired: false });
      }
    } catch (error) {
      console.error('[UploadForm] Error checking deadline:', error);
      // On error, allow upload (fail open)
      setDeadlineInfo({ allowed: true, isExpired: false });
    } finally {
      setDeadlineCheckLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const isValidFileType = (fileName: string) => {
    const extension = '.' + fileName.split('.').pop()?.toLowerCase();
    return uploadSettings.allowedExtensions.includes(extension);
  };

  const handleFileSelect = (files: FileList) => {
    const newFiles: FileUpload[] = [];
    
    for (let i = 0; i < files.length && i < uploadSettings.maxFilesPerUpload; i++) {
      const file = files[i];
      
      if (!isValidFileType(file.name)) {
        toast.error(`File type not allowed: ${file.name}`);
        continue;
      }
      
      if (file.size > uploadSettings.maxFileSize) {
        toast.error(`File too large: ${file.name} (Max: ${formatFileSize(uploadSettings.maxFileSize)})`);
        continue;
      }
      
      newFiles.push({
        id: Date.now().toString() + i,
        name: file.name,
        size: file.size,
        type: file.type,
        file,
        status: 'pending'
      });
    }
    
    if (formData.files.length + newFiles.length > uploadSettings.maxFilesPerUpload) {
      toast.error(`Maximum ${uploadSettings.maxFilesPerUpload} files allowed`);
      return;
    }
    
    setFormData(prev => ({
      ...prev,
      files: [...prev.files, ...newFiles]
    }));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    
    if (e.dataTransfer.files) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const removeFile = (fileId: string) => {
    setFormData(prev => ({
      ...prev,
      files: prev.files.filter(f => f.id !== fileId)
    }));
  };

  const validateForm = () => {
    if (!formData.title.trim()) {
      toast.error('Please enter a title');
      return false;
    }
    if (!formData.class) {
      toast.error('Please select a class');
      return false;
    }
    if (!formData.subject) {
      toast.error('Please select a subject');
      return false;
    }
    if (formData.files.length === 0) {
      toast.error('Please select at least one file');
      return false;
    }
    
    // CRITICAL: Validate session format (must be YYYY/YYYY, not auth token)
    if (!formData.session || typeof formData.session !== 'string') {
      toast.error('Please select an academic session');
      return false;
    }
    const sessionPattern = /^\d{4}\/\d{4}$/;
    if (!sessionPattern.test(formData.session)) {
      console.error('❌ INVALID SESSION FORMAT:', formData.session);
      toast.error('Invalid session format. Expected format: 2025/2026');
      return false;
    }
    
    // CRITICAL: Validate term
    if (!formData.term || typeof formData.term !== 'string') {
      toast.error('Please select a term');
      return false;
    }
    
    return true;
  };

  const handleSubmit = async () => {
    if (!validateForm()) return;
    
    setIsUploading(true);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to upload files');
        setIsUploading(false);
        return;
      }

      // Check deadline before uploading (SKIP for admins - they can override)
      if (userRole === 'teacher') {
        const deadlineCheck = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/check-upload-deadline`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({
              term: formData.term,
              session: formData.session,
              type: TYPE_MAPPING[formData.uploadType] || formData.uploadType
            })
          }
        );

        const deadlineResult = await deadlineCheck.json();
        
        if (deadlineResult.success && !deadlineResult.allowed) {
          console.log('[UploadForm] Teacher blocked by deadline:', deadlineResult.reason);
          toast.error(deadlineResult.reason || 'Upload deadline has passed');
          setIsUploading(false);
          return;
        }
      } else if (userRole === 'admin') {
        console.log('[UploadForm] Admin uploading - deadline check SKIPPED (admin override allowed)');
      }

      // Convert files to base64 for upload
      const filesData = [];
      const updatedFiles = [...formData.files];
      
      for (let i = 0; i < updatedFiles.length; i++) {
        updatedFiles[i] = { ...updatedFiles[i], status: 'uploading', uploadProgress: 0 };
        setFormData(prev => ({ ...prev, files: updatedFiles }));

        const file = updatedFiles[i].file;
        if (!file) continue;

        // Read file as base64
        const reader = new FileReader();
        const base64Promise = new Promise<string>((resolve, reject) => {
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const base64Data = await base64Promise;

        // Update progress
        updatedFiles[i] = { ...updatedFiles[i], uploadProgress: 50 };
        setFormData(prev => ({ ...prev, files: updatedFiles }));

        filesData.push({
          name: file.name,
          data: base64Data,
          type: file.type,
          size: file.size
        });

        updatedFiles[i] = { ...updatedFiles[i], uploadProgress: 100, status: 'completed' };
        setFormData(prev => ({ ...prev, files: updatedFiles }));
      }

      // Upload to backend
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // CRITICAL SAFETY CHECK: Ensure session is a string, not auth object
      const academicSession = typeof formData.session === 'string' && /^\d{4}\/\d{4}$/.test(formData.session)
        ? formData.session
        : '2025/2026'; // Fallback to current session
      
      if (academicSession !== formData.session) {
        console.error('⚠️ SESSION WAS CORRUPTED! Fixed:', formData.session, '→', academicSession);
      }

      const payload = {
        title: formData.title, // ✅ CRITICAL: Include title
        description: formData.description || null, // ✅ Include description
        subject_id: formData.subject,
        class_id: formData.class, // NEW: Include class_id
        type: TYPE_MAPPING[formData.uploadType] || formData.uploadType,
        week: formData.uploadType === 'e-notes' || formData.uploadType === 'assignment' ? formData.week : null,
        term: formData.term,
        session: academicSession, // Use validated session
        files: filesData,
        // For admin uploads on behalf of teachers
        on_behalf_of_teacher_id: userRole === 'admin' && selectedTeacher !== teacherId ? selectedTeacher : null,
        uploaded_by_admin: userRole === 'admin' && selectedTeacher !== teacherId
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(payload)
        }
      );

      const result = await res.json();
      
      if (result.success) {
        const submitData: UploadMetadata = {
          ...formData,
          id: result.upload.id,
          status: 'uploaded',
          uploadedAt: new Date(),
          isLateSubmission: formData.deadline ? new Date() > formData.deadline : false
        };
        
        onSubmit(submitData);
        toast.success('Files uploaded successfully!');
      } else {
        toast.error(result.error || 'Failed to upload files');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload files');
      
      // Mark files as error
      const updatedFiles = formData.files.map(f => ({ ...f, status: 'error' as const }));
      setFormData(prev => ({ ...prev, files: updatedFiles }));
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveDraft = () => {
    // For now, just use the callback
    onSaveDraft({ ...formData, status: 'draft' });
    toast.success('Draft saved successfully!');
  };

  // CRITICAL: Admins can upload even when deadline expired (override feature)
  // Teachers are blocked by deadlines
  const isUploadDisabled = !uploadSettings.uploadEnabled || isUploading || deadlineCheckLoading || 
    (userRole === 'teacher' && deadlineInfo && !deadlineInfo.allowed);
  const isOverdue = formData.deadline && new Date() > formData.deadline;

  // Debug button state
  useEffect(() => {
    console.log('[UploadForm] Button state calculation:', {
      userRole,
      uploadEnabled: uploadSettings.uploadEnabled,
      isUploading,
      deadlineCheckLoading,
      deadlineInfo,
      deadlineAllowed: deadlineInfo?.allowed,
      isUploadDisabled,
      formula: userRole === 'admin' 
        ? `ADMIN: !${uploadSettings.uploadEnabled} || ${isUploading} || ${deadlineCheckLoading} = ${isUploadDisabled} (deadline check SKIPPED)` 
        : `TEACHER: !${uploadSettings.uploadEnabled} || ${isUploading} || ${deadlineCheckLoading} || (${!!deadlineInfo} && !${deadlineInfo?.allowed}) = ${isUploadDisabled}`
    });
  }, [isUploadDisabled, deadlineInfo, uploadSettings.uploadEnabled, isUploading, deadlineCheckLoading, userRole]);

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Upload className="h-5 w-5 md:h-6 md:w-6" />
            Upload Learning Materials
          </h2>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            Upload e-notes, exam questions, assignments, and other resources
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          <Button variant="outline" onClick={onCancel} className="w-full sm:w-auto text-sm" size="sm">
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSaveDraft} disabled={isUploading} className="w-full sm:w-auto text-sm" size="sm">
            <Save className="h-4 w-4 sm:mr-2" />
            <span className="hidden sm:inline">Save Draft</span>
            <span className="sm:hidden">Save</span>
          </Button>
          <Button onClick={handleSubmit} disabled={isUploadDisabled} className="w-full sm:w-auto text-sm" size="sm">
            <FileUp className="h-4 w-4 sm:mr-2" />
            {isUploading ? 'Uploading...' : (
              <>
                <span className="hidden sm:inline">Upload Files</span>
                <span className="sm:hidden">Upload</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Upload Status Alerts */}
      {deadlineCheckLoading && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800">
            Checking upload deadline...
          </AlertDescription>
        </Alert>
      )}

      {!uploadSettings.uploadEnabled && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Uploads are currently disabled by the administrator.
          </AlertDescription>
        </Alert>
      )}

      {deadlineInfo && !deadlineInfo.allowed && userRole === 'teacher' && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="space-y-2">
              <div>
                <strong className="text-base">❌ Upload Deadline Expired</strong>
              </div>
              <div className="text-sm">
                The deadline for uploading has passed. You can no longer upload files for this term/session.
              </div>
              <div className="mt-3 p-3 bg-red-100 rounded border-2 border-red-400">
                <div className="text-sm font-semibold text-red-900">Upload Blocked:</div>
                <div className="text-xs text-red-900 mt-2 space-y-1">
                  <div>• Term: <strong>{formData.term}</strong></div>
                  <div>• Session: <strong>{formData.session}</strong></div>
                  <div>• Type: <strong>{formData.uploadType}</strong></div>
                  <div className="mt-2 pt-2 border-t border-red-300">
                    <strong className="text-red-700">Upload Button: DISABLED ❌</strong>
                  </div>
                </div>
              </div>
              <div className="text-xs text-red-700 mt-2">
                Please contact the administrator if you need to upload files after the deadline.
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {deadlineInfo && !deadlineInfo.allowed && deadlineInfo.isExpired && userRole === 'admin' && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>⚠️ Deadline Expired:</strong> Upload deadline has passed. As an admin, you can upload on behalf of teachers. Please select the teacher below.
            <div className="mt-2 text-xs font-mono bg-orange-100 p-2 rounded">
              <div>Term: {formData.term}</div>
              <div>Session: {formData.session}</div>
              <div>Type: {formData.uploadType}</div>
              <div>Button State: ENABLED ✅ (Admin Override Active)</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {deadlineInfo && deadlineInfo.allowed && deadlineInfo.deadline && !deadlineInfo.isExpired && userRole === 'teacher' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <div className="space-y-2">
              <div>
                <strong className="text-base">📅 Upload Deadline Set</strong>
              </div>
              <div className="text-sm">
                Deadline: <strong>{new Date(deadlineInfo.deadline).toLocaleString()}</strong>
              </div>
              <div className="text-sm">
                Term/Session: <strong>{formData.term}, {formData.session}</strong>
              </div>
              <div className="text-sm">
                Type: <strong>{formData.uploadType}</strong>
              </div>
              <div className="mt-3 p-2 bg-blue-100 rounded border border-blue-300">
                <div className="text-sm font-semibold text-blue-900">⚠️ Important:</div>
                <div className="text-xs text-blue-900 mt-1">
                  • The upload button will be <strong>automatically disabled</strong> after the deadline
                  <br />
                  • You must complete your upload before the deadline expires
                  <br />
                  • Current Status: <strong className="text-green-700">Upload Enabled ✅</strong>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {deadlineInfo && deadlineInfo.allowed && deadlineInfo.deadline && !deadlineInfo.isExpired && userRole === 'admin' && (
        <Alert className="border-blue-200 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Upcoming Deadline:</strong> Uploads for {formData.term}, {formData.session} must be submitted before {new Date(deadlineInfo.deadline).toLocaleString()}. As an admin, you can upload even after the deadline.
          </AlertDescription>
        </Alert>
      )}

      {!deadlineCheckLoading && deadlineInfo && deadlineInfo.allowed && !deadlineInfo.deadline && userRole === 'admin' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <strong>✅ No Deadline Set:</strong> You can upload at any time for {formData.term}, {formData.session} ({formData.uploadType}). No deadline has been configured for this upload type.
            <div className="mt-2 text-xs font-mono bg-green-100 p-2 rounded">
              <div>Button State: ENABLED ✅</div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {!deadlineCheckLoading && deadlineInfo && deadlineInfo.allowed && !deadlineInfo.deadline && userRole === 'teacher' && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            <div className="space-y-2">
              <div>
                <strong className="text-base">✅ No Deadline Set - Upload Anytime</strong>
              </div>
              <div className="text-sm">
                There is currently no deadline for uploading {formData.uploadType} for <strong>{formData.term}, {formData.session}</strong>.
              </div>
              <div className="mt-2 p-2 bg-green-100 rounded border border-green-300">
                <div className="text-xs text-green-900 space-y-1">
                  <div><strong>Current Status:</strong> Upload Enabled ✅</div>
                  <div className="mt-2 text-yellow-800 bg-yellow-50 p-2 rounded border border-yellow-200">
                    <strong>⚠️ Note:</strong> If a deadline is set later by the administrator, the upload button will be automatically disabled after that deadline expires.
                  </div>
                </div>
              </div>
            </div>
          </AlertDescription>
        </Alert>
      )}

      {isOverdue && (
        <Alert className="border-orange-200 bg-orange-50">
          <AlertTriangle className="h-4 w-4 text-orange-600" />
          <AlertDescription className="text-orange-800">
            <strong>Late Submission:</strong> The deadline for this upload has passed.
          </AlertDescription>
        </Alert>
      )}

      {formData.deadline && (
        <Alert>
          <Clock className="h-4 w-4" />
          <AlertDescription>
            <strong>Deadline:</strong> {formData.deadline.toLocaleDateString()} at {formData.deadline.toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        {/* Form Fields */}
        <Card>
          <CardHeader className="p-4 md:p-6">
            <CardTitle className="text-lg md:text-xl">Upload Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 md:space-y-4 p-4 md:p-6 pt-0">
            {/* Teacher Selection - ALWAYS visible for admins to help upload for teachers */}
            {userRole === 'admin' && (
              <div className={`p-3 rounded-lg ${
                deadlineInfo?.isExpired 
                  ? 'bg-yellow-50 border-2 border-yellow-300' 
                  : 'bg-purple-50 border border-purple-200'
              }`}>
                <Label htmlFor="teacher" className={`font-semibold ${
                  deadlineInfo?.isExpired ? 'text-yellow-900' : 'text-purple-900'
                }`}>
                  Upload for Teacher {deadlineInfo?.isExpired ? '*' : '(Optional)'}
                </Label>
                {deadlineInfo?.isExpired && (
                  <p className="text-xs text-yellow-700 mt-1 mb-2">
                    ⚠️ Deadline expired - You can upload for teachers who missed the deadline
                  </p>
                )}
                <Select value={selectedTeacher} onValueChange={setSelectedTeacher}>
                  <SelectTrigger className="mt-2 bg-white">
                    <SelectValue placeholder="Select teacher (or upload for yourself)" />
                  </SelectTrigger>
                  <SelectContent>
                    {teachers.length > 0 ? (
                      teachers.map(teacher => (
                        <SelectItem key={teacher.id} value={teacher.id}>
                          {teacher.name} ({teacher.email})
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="loading" disabled>Loading teachers...</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-purple-700 mt-2">
                  💡 {selectedTeacher === teacherId 
                    ? 'Upload will be tracked under your own account'
                    : 'Upload will be tracked under the selected teacher but marked as "Uploaded by Principal"'
                  }
                </p>
              </div>
            )}

            <div>
              <Label htmlFor="title">Title *</Label>
              <Input
                id="title"
                placeholder="Enter resource title"
                value={formData.title}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
              <div>
                <Label htmlFor="class" className="text-sm">Class *</Label>
                <Select value={formData.class} onValueChange={(value) => setFormData(prev => ({ ...prev, class: value }))}>
                  <SelectTrigger className="text-sm">
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
                  {formData.class ? 'Subjects filtered for class' : 'Select class first'}
                </p>
              </div>

              <div>
                <Label htmlFor="subject" className="text-sm">Subject *</Label>
                <Select 
                  value={formData.subject} 
                  onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}
                  disabled={!formData.class}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.class ? "Select subject" : "Select class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {filteredSubjects.length > 0 ? (
                      filteredSubjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))
                    ) : formData.class ? (
                      <SelectItem value="none" disabled>No subjects assigned for this class</SelectItem>
                    ) : (
                      <SelectItem value="none" disabled>Select a class first</SelectItem>
                    )}
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500 mt-1">
                  {formData.class ? `${filteredSubjects.length} subject(s) available` : 'Choose class to see subjects'}
                </p>
              </div>
            </div>

            <div>
              <Label htmlFor="uploadType">Upload Type</Label>
              <Select value={formData.uploadType} onValueChange={(value: any) => setFormData(prev => ({ ...prev, uploadType: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="e-notes">E-Notes</SelectItem>
                  <SelectItem value="exam-questions">Exam Questions</SelectItem>
                  <SelectItem value="assignment">Assignment</SelectItem>
                  <SelectItem value="other-resources">Other Resources</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={`grid gap-4 ${(formData.uploadType === 'e-notes' || formData.uploadType === 'assignment') ? 'grid-cols-3' : 'grid-cols-2'}`}>
              <div>
                <Label htmlFor="session">Session</Label>
                <Select value={formData.session} onValueChange={(value) => setFormData(prev => ({ ...prev, session: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.length > 0 ? (
                      sessions.map(session => (
                        <SelectItem key={session.id || session.session_name} value={session.session_name}>
                          {session.session_name}
                          {session.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No sessions configured</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="term">Term</Label>
                <Select value={formData.term} onValueChange={(value) => setFormData(prev => ({ ...prev, term: value }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.length > 0 ? (
                      terms.map(term => (
                        <SelectItem key={term.id || term.term_name} value={term.term_name}>
                          {term.term_name}
                          {term.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                        </SelectItem>
                      ))
                    ) : (
                      <SelectItem value="none" disabled>No terms configured</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              </div>

              {/* Show week field only for e-notes and assignment */}
              {(formData.uploadType === 'e-notes' || formData.uploadType === 'assignment') && (
                <div>
                  <Label htmlFor="week">Week</Label>
                  <Select value={formData.week.toString()} onValueChange={(value) => setFormData(prev => ({ ...prev, week: parseInt(value) }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {weeks.map(week => (
                        <SelectItem key={week} value={week.toString()}>Week {week}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                placeholder="Brief description of the uploaded materials"
                value={formData.description}
                onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                rows={3}
              />
            </div>

            <div>
              <Label>Version</Label>
              <div className="flex items-center gap-2">
                <Badge variant="outline">v{formData.version}</Badge>
                <span className="text-sm text-slate-600">
                  {initialData?.id ? 'Updating existing upload' : 'New upload'}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* File Upload */}
        <Card>
          <CardHeader>
            <CardTitle>Files</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* File Drop Zone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
                dragActive 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-slate-300 hover:border-slate-400'
              }`}
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
            >
              <Upload className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-lg font-medium mb-2">
                Drop files here or click to browse
              </p>
              <p className="text-sm text-slate-600 mb-4">
                Maximum {uploadSettings.maxFilesPerUpload} files, up to {formatFileSize(uploadSettings.maxFileSize)} each
              </p>
              <Input
                type="file"
                multiple
                accept={uploadSettings.allowedExtensions.join(',')}
                onChange={(e) => e.target.files && handleFileSelect(e.target.files)}
                className="hidden"
                id="file-upload"
              />
              <Button asChild variant="outline">
                <label htmlFor="file-upload" className="cursor-pointer">
                  Select Files
                </label>
              </Button>
            </div>

            {/* File List */}
            {formData.files.length > 0 && (
              <div className="space-y-2">
                <Label>Selected Files ({formData.files.length}/{uploadSettings.maxFilesPerUpload})</Label>
                {formData.files.map((file) => (
                  <div key={file.id} className="flex items-center gap-3 p-3 border rounded-lg">
                    <FileText className="h-5 w-5 text-slate-600" />
                    <div className="flex-1">
                      <p className="font-medium text-sm">{file.name}</p>
                      <p className="text-xs text-slate-600">{formatFileSize(file.size)}</p>
                      {file.status === 'uploading' && file.uploadProgress !== undefined && (
                        <Progress value={file.uploadProgress} className="mt-1 h-1" />
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      {file.status === 'completed' && <CheckCircle className="h-4 w-4 text-green-600" />}
                      {file.status === 'error' && <AlertTriangle className="h-4 w-4 text-red-600" />}
                      {file.status === 'pending' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeFile(file.id)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Upload Guidelines */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">Upload Guidelines</h4>
              <ul className="text-sm text-slate-600 space-y-1">
                <li>• Allowed formats: {uploadSettings.allowedExtensions.join(', ')}</li>
                <li>• Maximum file size: {formatFileSize(uploadSettings.maxFileSize)}</li>
                <li>• Maximum files per upload: {uploadSettings.maxFilesPerUpload}</li>
                <li>• Use descriptive file names</li>
                <li>• Ensure content is appropriate and relevant</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}