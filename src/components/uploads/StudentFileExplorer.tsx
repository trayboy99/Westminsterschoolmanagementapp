import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../ui/breadcrumb';
import { 
  Folder, 
  FileText, 
  Download, 
  Search, 
  Calendar,
  BookOpen,
  User,
  Eye,
  ArrowLeft,
  Grid,
  List,
  RefreshCw,
  FileQuestion,
  Loader2,
  X
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { SecurePDFViewer } from '../teacher/SecurePDFViewer';
import { SecureDocumentViewer } from '../teacher/SecureDocumentViewer';
import { toast } from 'sonner@2.0.3';

export interface FileResource {
  id: string;
  title: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  uploadedAt: Date | string;
  downloadCount: number;
  description?: string;
  version: number;
  url: string;
  subjectName?: string;
  subjectCode?: string;
  className?: string;
}

interface FolderStructure {
  sessions: string[];
  terms: string[];
  organized: any;
}

interface StudentFileExplorerProps {
  studentClass?: string;
  studentId?: string;
  folderData?: any;
  onDownload?: (file: any) => void;
  onPreview?: (file: any) => void;
  userRole?: 'student' | 'admin';
}

// Helper function to safely format dates
const formatDate = (date: Date | string): string => {
  if (!date) return 'N/A';
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  return dateObj.toLocaleDateString();
};

export function StudentFileExplorer({ studentClass, studentId, userRole = 'student' }: StudentFileExplorerProps) {
  const [currentPath, setCurrentPath] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sessions, setSessions] = useState<string[]>([]);
  const [sessionTerms, setSessionTerms] = useState<Record<string, string[]>>({});
  const [files, setFiles] = useState<FileResource[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [previewFile, setPreviewFile] = useState<FileResource | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const supabase = createClient();

  // Check backend health on mount
  useEffect(() => {
    checkBackendHealth();
    fetchSessionsAndTerms();
  }, []);

  const checkBackendHealth = async () => {
    try {
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/health`,
        { method: 'GET' }
      );
      const data = await res.json();
      console.log('[StudentFileExplorer] ✅ Backend health check:', data);
    } catch (error) {
      console.error('[StudentFileExplorer] ❌ Backend health check FAILED:', error);
      console.error('[StudentFileExplorer] ⚠️ The Supabase Edge Function may not be deployed or running!');
      toast.error('Backend server is not responding. Please contact support.');
    }
  };

  const fetchSessionsAndTerms = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/sessions-terms`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );
      const data = await res.json();
      
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[StudentFileExplorer] 📊 SESSIONS & TERMS FROM ACADEMIC CALENDAR');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      
      if (data.success) {
        setSessions(data.sessions || []);
        setSessionTerms(data.sessionTerms || {});
        
        console.log(`[StudentFileExplorer] ✅ Sessions: ${data.sessions?.length || 0}`, data.sessions);
        console.log('[StudentFileExplorer] ✅ Session-Terms mapping:', data.sessionTerms);
      } else {
        console.error('[StudentFileExplorer] ❌ Failed to load sessions/terms:', data);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      console.error('[StudentFileExplorer] Error fetching sessions/terms:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileIcon = (fileType: string) => {
    const icons: Record<string, string> = {
      pdf: '📄',
      doc: '📝',
      docx: '📝',
      ppt: '📊',
      pptx: '📊',
      jpg: '🖼️',
      png: '🖼️',
      mp4: '🎥',
      mp3: '🎵'
    };
    return icons[fileType.toLowerCase()] || '📎';
  };

  const getSubjectIcon = (subjectName: string) => {
    const name = subjectName.toLowerCase();
    if (name.includes('math')) return '🔢';
    if (name.includes('english')) return '📚';
    if (name.includes('physics')) return '⚛️';
    if (name.includes('chemistry')) return '🧪';
    if (name.includes('biology')) return '🧬';
    if (name.includes('history')) return '📜';
    if (name.includes('geography')) return '🌍';
    if (name.includes('economics')) return '💰';
    if (name.includes('government')) return '🏛️';
    if (name.includes('literature')) return '📖';
    if (name.includes('computer')) return '💻';
    if (name.includes('art')) return '🎨';
    if (name.includes('music')) return '🎵';
    if (name.includes('physical education') || name.includes('p.e')) return '⚽';
    if (name.includes('religious')) return '✝️';
    if (name.includes('french') || name.includes('spanish')) return '🌐';
    return '📘'; // Default book icon
  };

  const navigateToPath = (newPath: string[]) => {
    setCurrentPath(newPath);
    setSearchTerm(''); // Clear search when navigating
    
    // For E-Notes, Assignments: Level 4 shows files (after selecting week)
    // For Exam Questions, Other Resources: Level 3 shows files directly (NO weeks)
    const [session, term, resourceType, week] = newPath;
    
    const weekBasedTypes = ['E-Notes', 'Assignments'];
    
    if (weekBasedTypes.includes(resourceType) && newPath.length === 4) {
      // E-Notes, Assignments with week selected
      fetchFiles(session, term, resourceType, week);
    } else if (!weekBasedTypes.includes(resourceType) && newPath.length === 3) {
      // Exam Questions and Other Resources (no weeks)
      fetchFiles(session, term, resourceType);
    } else {
      // Clear files when navigating to other levels
      setFiles([]);
    }
  };

  const goBack = () => {
    if (currentPath.length > 0) {
      setCurrentPath(currentPath.slice(0, -1));
    }
  };

  // Fetch files when user navigates to resource type level (or week level for E-Notes)
  const fetchFiles = async (session: string, term: string, resourceType: string, week?: string) => {
    try {
      setLoadingFiles(true);
      setFiles([]); // Clear existing files
      
      const { data: { session: authSession }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[StudentFileExplorer] ❌ Session error:', sessionError);
        return;
      }
      
      if (!authSession) {
        console.error('[StudentFileExplorer] ❌ No auth session found');
        return;
      }

      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[StudentFileExplorer] 📥 FETCHING FILES');
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      console.log('[StudentFileExplorer] Parameters (RAW):', { session, term, resourceType, week });
      console.log('[StudentFileExplorer] Student Profile:', {
        id: studentId,
        class: studentClass,
        role: 'student'
      });
      
      // CRITICAL: Log the exact values being sent
      console.log('━━━ CHECKING EXACT MATCH ━━━');
      console.log('Session sent:', JSON.stringify(session));
      console.log('Term sent:', JSON.stringify(term));
      console.log('Class ID:', JSON.stringify(studentClass));

      // Extract week number from "Week 1" format if provided
      // Use regex to extract digits only (handles "Week 1", "Week1", "1", etc.)
      let weekNumber: number | undefined = undefined;
      if (week) {
        const match = week.match(/\d+/);
        if (match) {
          weekNumber = parseInt(match[0]);
          console.log(`[StudentFileExplorer] 📅 Week extraction: "${week}" → ${weekNumber}`);
        } else {
          console.warn(`[StudentFileExplorer] ⚠️ Could not extract week number from: "${week}"`);
        }
      }
      
      console.log('[StudentFileExplorer] 📤 Sending to backend:', { 
        session, 
        term, 
        resourceType, 
        week: weekNumber 
      });
      
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/files`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${authSession.access_token}`
          },
          body: JSON.stringify({ session, term, resourceType, week: weekNumber })
        }
      );

      console.log('[StudentFileExplorer] Response status:', res.status);
      
      const data = await res.json();
      console.log('[StudentFileExplorer] 📬 Response data:', data);

      if (data.success) {
        const filesReceived = data.files || [];
        
        console.log('[StudentFileExplorer] 📄 Files received:');
        
        // Auto-fix missing titles by using filename
        const filesFixed = filesReceived.map((file: any) => {
          if (!file.title || file.title.trim() === '') {
            // Use filename without extension as title
            const fileNameWithoutExt = file.fileName.replace(/\.[^/.]+$/, '');
            return { ...file, title: fileNameWithoutExt };
          }
          return file;
        });
        
        filesFixed.forEach((file: any, idx: number) => {
          console.log(`  ${idx + 1}. Title: "${file.title}" | File: ${file.fileName} | Subject: ${file.subjectName || 'N/A'}`);
        });
        
        setFiles(filesFixed);
        
        console.log('━━━ FRONTEND RESULTS ━━━');
        console.log(`[StudentFileExplorer] ✅ Successfully loaded ${filesFixed.length} files`);
        
        // Check for missing titles
        const filesWithoutTitles = filesFixed.filter((f: any) => !f.title || f.title.trim() === '');
        if (filesWithoutTitles.length > 0) {
          console.warn(`[StudentFileExplorer] ⚠️ WARNING: ${filesWithoutTitles.length} file(s) missing titles!`);
          filesWithoutTitles.forEach((f: any) => {
            console.warn(`  - File: ${f.fileName} (ID: ${f.id})`);
          });
        }
        console.log('━━━━━━━━━━━━━━━━━━━━━');
      } else {
        console.error('━━━ FRONTEND ERROR ━━━');
        console.error('[StudentFileExplorer] ❌ Backend returned error:', data.error);
        console.error('━━━━━━━━━━━━━━━━━━━━━');
        setFiles([]);
      }
      console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } catch (error) {
      console.error('[StudentFileExplorer] ❌ Exception during fetch:', error);
      setFiles([]);
    } finally {
      setLoadingFiles(false);
    }
  };

  const getCurrentContent = () => {
    // Level 0: Show Sessions (from academic_calendar)
    if (currentPath.length === 0) {
      const sortedSessions = [...sessions].sort().reverse(); // Latest first
      console.log('[StudentFileExplorer] 📅 Showing sessions from academic_calendar:', sortedSessions);
      return {
        type: 'sessions',
        data: sortedSessions
      };
    }

    // Level 1: Show ALL Terms for selected session
    if (currentPath.length === 1) {
      const session = currentPath[0];
      const termsForSession = sessionTerms[session] || [];
      
      console.log(`[StudentFileExplorer] 📁 Showing terms for session "${session}":`, termsForSession);
      
      // Sort terms in order: First Term, Second Term, Third Term
      const termOrder = ['First Term', 'Second Term', 'Third Term'];
      const sortedTerms = [...termsForSession].sort((a, b) => {
        const indexA = termOrder.indexOf(a);
        const indexB = termOrder.indexOf(b);
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      });
      
      return {
        type: 'terms',
        data: sortedTerms
      };
    }

    // Level 2: Show Resource Types
    if (currentPath.length === 2) {
      // Admin sees all 4 resource types, students see only 3 (no Exam Questions)
      const resourceTypes = userRole === 'admin' 
        ? [
            'E-Notes',
            'Exam Questions',
            'Assignments',
            'Other Resources'
          ]
        : [
            'E-Notes',
            'Assignments',
            'Other Resources'
          ];
      
      console.log(`[StudentFileExplorer] 📁 Resource types for ${userRole}:`, resourceTypes);
      
      return {
        type: 'resource-types',
        data: resourceTypes
      };
    }

    // Level 3: For E-Notes and Assignments, show Weeks (1-12). For Exam Questions and Other Resources, show Files directly
    if (currentPath.length === 3) {
      const [session, term, resourceType] = currentPath;
      
      if (resourceType === 'E-Notes' || resourceType === 'Assignments') {
        // Show all 12 weeks for E-Notes and Assignments ONLY
        const weeks = Array.from({ length: 12 }, (_, i) => `Week ${i + 1}`);
        console.log(`[StudentFileExplorer] 📅 Showing weeks for ${resourceType}:`, weeks);
        
        return {
          type: 'weeks',
          data: weeks
        };
      } else {
        // For Exam Questions and Other Resources, show files directly (NO weeks)
        // Files are fetched by handleFolderClick, not here
        return {
          type: 'files',
          data: filterFiles(files)
        };
      }
    }

    // Level 4: Show Files for E-Notes and Assignments (after selecting week)
    if (currentPath.length === 4) {
      const [session, term, resourceType, week] = currentPath;
      
      if (resourceType === 'E-Notes' || resourceType === 'Assignments') {
        // Files are fetched by handleFolderClick, not here
        return {
          type: 'files',
          data: filterFiles(files)
        };
      }
    }

    return { type: 'unknown', data: [] };
  };

  const filterFiles = (files: FileResource[]) => {
    if (!searchTerm) return files;
    return files.filter(file => 
      file.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.fileName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      file.uploadedBy.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handlePreview = async (file: FileResource) => {
    try {
      setPreviewFile(file);
      setPreviewUrl(null); // Reset preview URL
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to preview files');
        setPreviewFile(null);
        return;
      }

      console.log('[StudentFileExplorer] 👁️ Fetching preview for file:', {
        id: file.id,
        fileName: file.fileName,
        fileType: file.fileType
      });

      // Fetch signed URL from backend
      console.log('[StudentFileExplorer] Fetching from URL:', `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/${file.id}/signed-url`);
      
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/${file.id}/signed-url`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );
      
      console.log('[StudentFileExplorer] Preview response status:', res.status);
      console.log('[StudentFileExplorer] Preview response headers:', Object.fromEntries(res.headers.entries()));
      
      const data = await res.json();
      
      if (!res.ok || !data.success) {
        console.error('[StudentFileExplorer] Preview error response:', data);
        throw new Error(data.error || 'Failed to fetch preview URL');
      }
      console.log('[StudentFileExplorer] Preview response:', {
        success: data.success,
        hasSignedUrl: !!data.signedUrl,
        error: data.error
      });
      
      if (data.success && data.signedUrl) {
        console.log('[StudentFileExplorer] ✅ Setting preview URL');
        setPreviewUrl(data.signedUrl);
        toast.success('File loaded successfully');
      } else {
        console.error('[StudentFileExplorer] Preview failed:', data.error);
        toast.error(data.error || 'Failed to load preview');
        setPreviewFile(null);
      }
    } catch (error) {
      console.error('[StudentFileExplorer] Error fetching preview URL:', error);
      console.error('[StudentFileExplorer] Error name:', error instanceof Error ? error.name : 'Unknown');
      console.error('[StudentFileExplorer] Error message:', error instanceof Error ? error.message : String(error));
      console.error('[StudentFileExplorer] Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      
      if (error instanceof TypeError && error.message === 'Failed to fetch') {
        console.error('❌ NETWORK ERROR: The backend server may not be running or there is a network issue');
        toast.error('Cannot connect to server. Please check your network connection.');
      } else {
        toast.error('Failed to load file preview. Please try again.');
      }
      setPreviewFile(null);
    }
  };

  const handleDownload = async (file: FileResource) => {
    try {
      setDownloadingId(file.id);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to download files');
        setDownloadingId(null);
        return;
      }

      console.log('[StudentFileExplorer] 📥 Downloading file:', file.id);
      console.log('[StudentFileExplorer] Fetching from URL:', `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/${file.id}/file`);
      toast.info('Downloading file...');

      // Fetch file through proxy endpoint
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/${file.id}/file`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      console.log('[StudentFileExplorer] Download response status:', res.status);

      // Check if response is JSON (error) or blob (success)
      const contentType = res.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        // Error response
        const data = await res.json();
        console.error('[StudentFileExplorer] Download error:', data);
        throw new Error(data.error || 'Download failed');
      }

      // Success - get blob
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success(`Downloaded ${file.fileName}`);
      console.log('[StudentFileExplorer] ✅ Download complete:', file.fileName);
    } catch (error) {
      console.error('[StudentFileExplorer] Error downloading file:', error);
      toast.error('Failed to download file. Please try again.');
    } finally {
      setDownloadingId(null);
    }
  };

  const closePreview = () => {
    setPreviewFile(null);
    setPreviewUrl(null);
  };

  const renderBreadcrumb = () => {
    return (
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink onClick={() => navigateToPath([])} className="cursor-pointer flex items-center gap-1">
              <BookOpen className="h-4 w-4" />
              Home
            </BreadcrumbLink>
          </BreadcrumbItem>
          {currentPath.map((path, index) => (
            <div key={index} className="flex items-center gap-1">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {index === currentPath.length - 1 ? (
                  <BreadcrumbPage className="font-medium">
                    {path}
                  </BreadcrumbPage>
                ) : (
                  <BreadcrumbLink 
                    onClick={() => navigateToPath(currentPath.slice(0, index + 1))}
                    className="cursor-pointer hover:text-blue-600"
                  >
                    {path}
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    );
  };

  const getFolderIcon = (type: string) => {
    switch (type) {
      case 'sessions':
        return <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-blue-500" />;
      case 'terms':
        return <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-green-500" />;
      case 'resource-types':
        return <FileQuestion className="h-10 w-10 sm:h-12 sm:w-12 text-pink-500" />;
      case 'weeks':
        return <Calendar className="h-10 w-10 sm:h-12 sm:w-12 text-purple-500" />;
      default:
        return <Folder className="h-10 w-10 sm:h-12 sm:w-12 text-slate-500" />;
    }
  };

  const renderFolderGrid = (items: any[], type: string) => {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {items.map((item, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-all cursor-pointer hover:border-blue-400"
            onClick={() => navigateToPath([...currentPath, item.toString()])}
          >
            <CardContent className="p-4 sm:p-6 text-center">
              <div className="mb-3">
                {getFolderIcon(type)}
              </div>
              <h3 className="font-medium text-sm sm:text-base truncate">
                {item}
              </h3>
              {type === 'sessions' && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Academic Session</p>
              )}
              {type === 'terms' && (
                <p className="text-xs sm:text-sm text-slate-600 mt-1">Term</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const renderFileGrid = (files: FileResource[]) => {
    if (viewMode === 'list') {
      return (
        <div className="space-y-2">
          {files.map((file) => (
            <Card key={file.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    {/* Show subject icon instead of file type */}
                    <div className="text-3xl flex-shrink-0">
                      {file.subjectName ? getSubjectIcon(file.subjectName) : getFileIcon(file.fileType)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        {/* Show "Title:" label for files without subject */}
                        {!file.subjectName && (
                          <span className="text-xs font-medium text-slate-600">Title:</span>
                        )}
                        <h3 className="font-semibold text-base truncate">
                          {file.title || file.subjectName || 'Untitled'}
                        </h3>
                        {file.subjectName && (
                          <Badge variant="secondary" className="text-xs">
                            {file.subjectCode || file.subjectName}
                          </Badge>
                        )}
                        {file.className && (
                          <Badge variant="outline" className="text-xs">
                            {file.className}
                          </Badge>
                        )}
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-500 mt-1">
                        <span className="truncate text-xs">{file.fileName}</span>
                        <span>{formatFileSize(file.fileSize)}</span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {file.uploadedBy}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(file.uploadedAt)}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <Badge variant="outline">{file.downloadCount} downloads</Badge>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      onClick={(e) => { e.stopPropagation(); handlePreview(file); }}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="sm" 
                      onClick={(e) => { e.stopPropagation(); handleDownload(file); }}
                      disabled={downloadingId === file.id}
                    >
                      {downloadingId === file.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {files.map((file) => (
          <Card key={file.id} className="hover:shadow-lg transition-all hover:border-blue-400">
            <CardContent className="p-4">
              <div className="text-center mb-4">
                {/* Show subject icon instead of file type */}
                <div className="text-5xl mb-3">
                  {file.subjectName ? getSubjectIcon(file.subjectName) : getFileIcon(file.fileType)}
                </div>
                
                {/* Show subject name as badge if available */}
                {file.subjectName && (
                  <Badge variant="secondary" className="mb-2">
                    {file.subjectCode ? `${file.subjectCode} - ${file.subjectName}` : file.subjectName}
                  </Badge>
                )}
                
                {/* Show class name under subject if available */}
                {file.className && (
                  <div className="text-xs text-slate-600 mb-2">{file.className}</div>
                )}
                
                {/* Show "Title:" label for files without subject (Other Resources) */}
                {!file.subjectName && (
                  <div className="text-xs font-medium text-slate-600 mb-1">Title:</div>
                )}
                
                <h3 className="font-semibold text-base mb-1 line-clamp-2 min-h-[2.5rem]">
                  {file.title || file.subjectName || 'Untitled'}
                </h3>
                <p className="text-xs text-slate-500 mb-2 truncate">{file.fileName}</p>
                <div className="flex justify-center gap-4 text-xs text-slate-600 mb-3">
                  <span>{formatFileSize(file.fileSize)}</span>
                  <span>{file.downloadCount} downloads</span>
                </div>
              </div>
              
              {file.description && (
                <p className="text-xs text-slate-600 mb-3 line-clamp-2">{file.description}</p>
              )}
              
              <div className="flex items-center gap-1 text-xs text-slate-600 mb-2">
                <User className="h-3 w-3" />
                <span className="truncate">{file.uploadedBy}</span>
              </div>
              
              <div className="flex items-center gap-1 text-xs text-slate-600 mb-4">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(file.uploadedAt)}</span>
              </div>
              
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="flex-1" 
                  onClick={() => handlePreview(file)}
                >
                  <Eye className="h-3 w-3 mr-1" />
                  Preview
                </Button>
                <Button 
                  size="sm" 
                  className="flex-1" 
                  onClick={() => handleDownload(file)}
                  disabled={downloadingId === file.id}
                >
                  {downloadingId === file.id ? (
                    <>
                      <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                      Downloading...
                    </>
                  ) : (
                    <>
                      <Download className="h-3 w-3 mr-1" />
                      Download
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const currentContent = getCurrentContent();
  
  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="min-w-0 flex-1">
          <h2 className="text-xl md:text-2xl flex items-center gap-2">
            <BookOpen className="h-5 md:h-6 w-5 md:w-6 flex-shrink-0" />
            <span className="truncate">Learning Resources</span>
          </h2>
          <p className="text-sm md:text-base text-slate-600 mt-1 truncate">
            Browse course materials organized by session and term
          </p>
        </div>
        <div className="flex gap-2">
          {currentPath.length > 0 ? (
            <Button variant="outline" onClick={goBack} className="flex-1 sm:flex-none">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          ) : (
            <Button variant="outline" onClick={fetchSessionsAndTerms} disabled={loading} className="flex-1 sm:flex-none">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          )}
        </div>
      </div>

      {/* Navigation */}
      {renderBreadcrumb()}

      {/* Search and View Controls - Only for files view */}
      {currentContent.type === 'files' && (
        <Card>
          <CardContent className="p-3 sm:p-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
              <div className="flex items-center gap-2 flex-1">
                <Search className="h-4 w-4 text-slate-600 flex-shrink-0" />
                <Input
                  placeholder="Search files..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <Button
                  size="sm"
                  variant={viewMode === 'grid' ? 'default' : 'outline'}
                  onClick={() => setViewMode('grid')}
                  className="flex-1 sm:flex-none"
                >
                  <Grid className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant={viewMode === 'list' ? 'default' : 'outline'}
                  onClick={() => setViewMode('list')}
                  className="flex-1 sm:flex-none"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Content */}
      <div>
        {(loading || (loadingFiles && currentPath.length === 3)) ? (
          <Card>
            <CardContent className="p-12 text-center">
              <RefreshCw className="h-12 w-12 text-slate-400 mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-medium text-slate-600">Loading...</h3>
              <p className="text-slate-500 mt-2">
                {loading ? 'Fetching sessions and terms...' : 'Loading files...'}
              </p>
            </CardContent>
          </Card>
        ) : currentContent.type === 'files' ? (
          currentContent.data.length > 0 ? (
            renderFileGrid(currentContent.data as FileResource[])
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <FileText className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No Files Found</h3>
                <p className="text-slate-500">
                  {searchTerm 
                    ? 'No files match your current search.' 
                    : 'No learning materials have been uploaded yet.'}
                </p>
              </CardContent>
            </Card>
          )
        ) : (
          currentContent.data.length > 0 ? (
            renderFolderGrid(currentContent.data, currentContent.type)
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <Folder className="h-12 w-12 text-slate-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-slate-600 mb-2">No Content Available</h3>
                <p className="text-slate-500">
                  {currentContent.type === 'sessions' && 'No academic sessions have been set up yet.'}
                  {currentContent.type === 'terms' && 'No terms have been configured for this session yet.'}
                  {currentContent.type === 'resource-types' && 'No resource types are available.'}
                  {currentContent.type === 'weeks' && 'No weeks are available for this resource type.'}
                  {!['sessions', 'terms', 'resource-types', 'weeks'].includes(currentContent.type) && 
                    `No ${currentContent.type} are available at this level.`}
                </p>
              </CardContent>
            </Card>
          )
        )}
      </div>

      {/* Preview Dialog */}
      {previewFile && (
        <Dialog open={!!previewFile} onOpenChange={() => closePreview()}>
          <DialogContent className="max-w-4xl h-[85vh] flex flex-col">
            <DialogHeader className="flex-shrink-0">
              <div className="flex items-center justify-between">
                <div>
                  <DialogTitle>{previewFile.title}</DialogTitle>
                  <DialogDescription className="text-sm mt-1">
                    {previewFile.fileName} • {formatFileSize(previewFile.fileSize)}
                  </DialogDescription>
                </div>
                <Button variant="ghost" size="sm" onClick={closePreview}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </DialogHeader>
            <div className="flex-1 overflow-hidden min-h-0">
              {previewUrl ? (
                (() => {
                  const fileType = previewFile.fileType.toLowerCase();
                  const imageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'];
                  const videoTypes = ['mp4', 'webm', 'ogg'];
                  const audioTypes = ['mp3', 'wav', 'ogg', 'm4a'];
                  const textTypes = ['txt', 'md', 'json', 'xml', 'csv', 'log'];

                  // PDF Preview
                  if (fileType === 'pdf') {
                    return (
                      <SecurePDFViewer 
                        blobUrl={previewUrl} 
                        className="w-full h-full"
                      />
                    );
                  }
                  
                  // Word Documents (DOCX/DOC) - Download only
                  if (fileType === 'docx' || fileType === 'doc') {
                    return (
                      <SecureDocumentViewer 
                        blobUrl={previewUrl} 
                        fileName={previewFile.fileName}
                        fileType={previewFile.fileType}
                        className="w-full h-full"
                      />
                    );
                  }
                  
                  // Image Preview
                  if (imageTypes.includes(fileType)) {
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-slate-100 p-4 overflow-auto">
                        <img 
                          src={previewUrl} 
                          alt={previewFile.fileName}
                          className="max-w-full max-h-full object-contain rounded shadow-lg"
                          onError={(e) => {
                            e.currentTarget.src = '';
                            e.currentTarget.alt = 'Failed to load image';
                          }}
                        />
                      </div>
                    );
                  }
                  
                  // Video Preview
                  if (videoTypes.includes(fileType)) {
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-black p-4">
                        <video 
                          src={previewUrl} 
                          controls 
                          className="max-w-full max-h-full rounded"
                          controlsList="nodownload"
                        >
                          Your browser does not support video playback.
                        </video>
                      </div>
                    );
                  }
                  
                  // Audio Preview
                  if (audioTypes.includes(fileType)) {
                    return (
                      <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                        <div className="bg-white rounded-lg shadow-lg p-8 max-w-md w-full">
                          <div className="text-center mb-6">
                            <div className="inline-flex items-center justify-center w-20 h-20 bg-blue-100 rounded-full mb-4">
                              <span className="text-4xl">🎵</span>
                            </div>
                            <h3 className="font-medium text-lg mb-2">{previewFile.title}</h3>
                            <p className="text-sm text-slate-600">{previewFile.fileName}</p>
                          </div>
                          <audio 
                            src={previewUrl} 
                            controls 
                            className="w-full"
                            controlsList="nodownload"
                          >
                            Your browser does not support audio playback.
                          </audio>
                        </div>
                      </div>
                    );
                  }
                  
                  // Text File Preview
                  if (textTypes.includes(fileType)) {
                    return (
                      <div className="w-full h-full bg-white overflow-auto">
                        <iframe 
                          src={previewUrl} 
                          className="w-full h-full border-0"
                          title="Text File Viewer"
                          sandbox="allow-same-origin"
                        />
                      </div>
                    );
                  }
                  
                  // PowerPoint/Excel - Download only
                  if (['ppt', 'pptx', 'xls', 'xlsx'].includes(fileType)) {
                    return (
                      <div className="w-full h-full flex items-center justify-center bg-slate-50 p-8">
                        <div className="text-center max-w-md">
                          <div className="inline-flex items-center justify-center w-16 h-16 bg-orange-100 rounded-full mb-4">
                            <FileText className="h-8 w-8 text-orange-600" />
                          </div>
                          <h3 className="text-lg font-medium text-slate-900 mb-2">
                            {previewFile.fileName}
                          </h3>
                          <p className="text-sm text-slate-600 mb-4">
                            {fileType.toUpperCase()} files cannot be previewed in the browser.
                          </p>
                          <Button onClick={() => handleDownload(previewFile)}>
                            <Download className="h-4 w-4 mr-2" />
                            Download File
                          </Button>
                        </div>
                      </div>
                    );
                  }
                  
                  // Unsupported file type
                  return (
                    <div className="w-full h-full flex items-center justify-center bg-slate-50 p-8">
                      <div className="text-center max-w-md">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-slate-200 rounded-full mb-4">
                          <FileText className="h-8 w-8 text-slate-600" />
                        </div>
                        <h3 className="text-lg font-medium text-slate-900 mb-2">
                          Preview Not Available
                        </h3>
                        <p className="text-sm text-slate-600 mb-1">
                          {previewFile.fileName}
                        </p>
                        <p className="text-sm text-slate-500 mb-4">
                          This file type (.{fileType}) cannot be previewed in the browser.
                        </p>
                        <Button onClick={() => handleDownload(previewFile)}>
                          <Download className="h-4 w-4 mr-2" />
                          Download to View
                        </Button>
                      </div>
                    </div>
                  );
                })()
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}