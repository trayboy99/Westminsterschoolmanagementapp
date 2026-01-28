import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  Send,
  Download,
  Filter,
  Search,
  Calendar,
  FileText,
  TrendingUp
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface TeacherCompliance {
  teacherId: string;
  teacherName: string;
  email: string;
  subjects: string[];
  classes?: string[];
  totalRequired: number;
  submitted: number;
  pending: number;
  overdue: number;
  complianceRate: number;
  lastSubmission?: Date;
  status: 'compliant' | 'partial' | 'non-compliant' | 'overdue';
  uploads: UploadSummary[];
  uploadsByType?: Record<string, {
    required: number;
    submitted: number;
    overdue: number;
    pending: number;
  }>;
}

interface UploadSummary {
  id: string;
  title: string;
  subject: string;
  class?: string;
  week: number;
  term: string;
  session: string;
  uploadType: string;
  status: 'submitted' | 'pending' | 'overdue';
  submittedAt?: Date;
  deadline: Date;
  daysOverdue?: number;
  uploadedByAdmin?: boolean;
  adminId?: string | null;
}

interface ComplianceTrackerProps {
  complianceData: TeacherCompliance[];
  onSendReminder: (teacherId: string, uploadId?: string) => void;
  onExportReport: () => void;
  onViewDetails: (teacherId: string) => void;
  hideReminders?: boolean;
}

const mockComplianceData: TeacherCompliance[] = [
  {
    teacherId: 'T001',
    teacherName: 'Dr. Ahmed Hassan',
    email: 'ahmed.hassan@school.edu',
    subjects: ['Mathematics', 'Further Mathematics'],
    totalRequired: 12,
    submitted: 10,
    pending: 1,
    overdue: 1,
    complianceRate: 83,
    lastSubmission: new Date(2024, 8, 15),
    status: 'partial',
    uploads: [
      {
        id: 'U001',
        title: 'Quadratic Equations E-Notes',
        subject: 'Mathematics',
        week: 3,
        term: 'First Term',
        session: '2024/2025',
        uploadType: 'e-notes',
        status: 'submitted',
        submittedAt: new Date(2024, 8, 15),
        deadline: new Date(2024, 8, 18)
      },
      {
        id: 'U002',
        title: 'Integration Practice Questions',
        subject: 'Further Mathematics',
        week: 4,
        term: 'First Term',
        session: '2024/2025',
        uploadType: 'exam-questions',
        status: 'overdue',
        deadline: new Date(2024, 8, 12),
        daysOverdue: 6
      }
    ]
  },
  {
    teacherId: 'T002',
    teacherName: 'Ms. Sarah Wilson',
    email: 'sarah.wilson@school.edu',
    subjects: ['English Language', 'Literature'],
    totalRequired: 10,
    submitted: 10,
    pending: 0,
    overdue: 0,
    complianceRate: 100,
    lastSubmission: new Date(2024, 8, 17),
    status: 'compliant',
    uploads: []
  },
  {
    teacherId: 'T003',
    teacherName: 'Dr. Maria Santos',
    email: 'maria.santos@school.edu',
    subjects: ['Physics', 'Chemistry'],
    totalRequired: 14,
    submitted: 8,
    pending: 3,
    overdue: 3,
    complianceRate: 57,
    lastSubmission: new Date(2024, 8, 10),
    status: 'non-compliant',
    uploads: []
  },
  {
    teacherId: 'T004',
    teacherName: 'Mr. John Davis',
    email: 'john.davis@school.edu',
    subjects: ['History', 'Government'],
    totalRequired: 8,
    submitted: 6,
    pending: 0,
    overdue: 2,
    complianceRate: 75,
    lastSubmission: new Date(2024, 8, 8),
    status: 'overdue',
    uploads: []
  }
];

export function ComplianceTracker({
  complianceData = mockComplianceData,
  onSendReminder,
  onExportReport,
  onViewDetails,
  hideReminders = false
}: ComplianceTrackerProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [subjectFilter, setSubjectFilter] = useState<string>('all');
  const [classFilter, setClassFilter] = useState<string>('all');
  const [uploadTypeFilter, setUploadTypeFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('complianceRate');

  // Apply upload type filter to recalculate stats for each teacher
  const processedData = complianceData.map(teacher => {
    // If upload type filter is active, recalculate based on that type
    if (uploadTypeFilter !== 'all' && teacher.uploadsByType) {
      const typeData = teacher.uploadsByType[uploadTypeFilter] || { required: 0, submitted: 0, overdue: 0, pending: 0 };
      const totalRequired = typeData.required;
      const submitted = typeData.submitted;
      const overdue = typeData.overdue;
      const pending = typeData.pending;
      const complianceRate = totalRequired > 0 ? Math.round((submitted / totalRequired) * 100) : 100;
      
      // Determine status based on filtered type
      let status: 'compliant' | 'partial' | 'non-compliant' | 'overdue' = 'compliant';
      if (overdue > 0) {
        status = 'overdue';
      } else if (complianceRate < 50) {
        status = 'non-compliant';
      } else if (complianceRate < 100) {
        status = 'partial';
      }

      return {
        ...teacher,
        totalRequired,
        submitted,
        pending,
        overdue,
        complianceRate,
        status
      };
    }
    return teacher;
  });

  const filteredData = processedData
    .filter(teacher => {
      if (searchTerm && !teacher.teacherName.toLowerCase().includes(searchTerm.toLowerCase()) && 
          !teacher.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))) {
        return false;
      }
      if (statusFilter !== 'all' && teacher.status !== statusFilter) return false;
      if (subjectFilter !== 'all' && !teacher.subjects.includes(subjectFilter)) return false;
      if (classFilter !== 'all' && (!teacher.classes || !teacher.classes.includes(classFilter))) return false;
      return true;
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'complianceRate':
          return b.complianceRate - a.complianceRate;
        case 'name':
          return a.teacherName.localeCompare(b.teacherName);
        case 'overdue':
          return b.overdue - a.overdue;
        case 'lastSubmission':
          return (b.lastSubmission?.getTime() || 0) - (a.lastSubmission?.getTime() || 0);
        default:
          return 0;
      }
    });

  const getStatusBadge = (status: string) => {
    const config = {
      compliant: { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      partial: { variant: 'secondary' as const, color: 'bg-blue-100 text-blue-800', icon: Clock },
      'non-compliant': { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: XCircle },
      overdue: { variant: 'destructive' as const, color: 'bg-orange-100 text-orange-800', icon: AlertTriangle },
      submitted: { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      pending: { variant: 'secondary' as const, color: 'bg-yellow-100 text-yellow-800', icon: Clock },
      approved: { variant: 'default' as const, color: 'bg-green-100 text-green-800', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, color: 'bg-red-100 text-red-800', icon: XCircle }
    };
    
    const statusConfig = config[status as keyof typeof config] || {
      variant: 'secondary' as const,
      color: 'bg-gray-100 text-gray-800',
      icon: AlertTriangle
    };
    
    const Icon = statusConfig.icon;
    
    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getComplianceColor = (rate: number) => {
    if (rate >= 90) return 'bg-green-500';
    if (rate >= 70) return 'bg-blue-500';
    if (rate >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const overallStats = {
    totalTeachers: processedData.length,
    compliantTeachers: processedData.filter(t => t.status === 'compliant').length,
    overdueTeachers: processedData.filter(t => t.overdue > 0).length,
    averageCompliance: processedData.length > 0 ? Math.round(processedData.reduce((sum, t) => sum + t.complianceRate, 0) / processedData.length) : 0,
    totalOverdue: processedData.reduce((sum, t) => sum + t.overdue, 0)
  };

  const allSubjects = [...new Set(complianceData.flatMap(t => t.subjects))];
  const allClasses = [...new Set(complianceData.flatMap(t => t.classes || []))];

  const handleBulkReminder = () => {
    const nonCompliantTeachers = filteredData.filter(t => t.status !== 'compliant');
    
    if (nonCompliantTeachers.length === 0) {
      // All teachers are compliant
      toast.success('All teachers are compliant! No reminders needed. 🎉');
    } else {
      // Send reminders to non-compliant teachers
      nonCompliantTeachers.forEach(teacher => onSendReminder(teacher.teacherId));
      toast.success(`Reminders sent to ${nonCompliantTeachers.length} teacher${nonCompliantTeachers.length > 1 ? 's' : ''}`);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl md:text-2xl font-bold flex items-center gap-2">
            <Users className="h-5 w-5 md:h-6 md:w-6" />
            Teacher Compliance Tracker
          </h2>
          <p className="text-slate-600 mt-1 text-sm md:text-base">
            Monitor teacher upload compliance and submission deadlines
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
          {!hideReminders && (
            <Button variant="outline" onClick={handleBulkReminder} className="w-full sm:w-auto text-sm" size="sm">
              <Send className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">Send Reminders</span>
              <span className="sm:hidden">Remind</span>
            </Button>
          )}
          <Button variant="outline" onClick={onExportReport}>
            <Download className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Export Report</span>
            <span className="sm:hidden">Export</span>
          </Button>
        </div>
      </div>

      {/* Overall Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg flex-shrink-0">
                <Users className="h-5 w-5 text-blue-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-600 truncate">Total Teachers</p>
                <p className="text-xl sm:text-2xl font-bold">{overallStats.totalTeachers}</p>
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
                <p className="text-xs sm:text-sm text-slate-600 truncate">Compliant</p>
                <p className="text-xl sm:text-2xl font-bold">{overallStats.compliantTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-red-100 rounded-lg flex-shrink-0">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-600 truncate">With Overdue</p>
                <p className="text-xl sm:text-2xl font-bold">{overallStats.overdueTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-orange-100 rounded-lg flex-shrink-0">
                <XCircle className="h-5 w-5 text-orange-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-600 truncate">Total Overdue</p>
                <p className="text-xl sm:text-2xl font-bold">{overallStats.totalOverdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-100 rounded-lg flex-shrink-0">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-slate-600 truncate">Avg Compliance</p>
                <p className="text-xl sm:text-2xl font-bold">{overallStats.averageCompliance}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-[200px]">
              <Search className="h-4 w-4 text-slate-600 flex-shrink-0" />
              <Input
                placeholder="Search teachers or subjects..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="compliant">Compliant</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="non-compliant">Non-Compliant</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>

            <Select value={uploadTypeFilter} onValueChange={setUploadTypeFilter}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Upload Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="e-notes">E-Notes</SelectItem>
                <SelectItem value="exam-questions">Exam Questions</SelectItem>
                <SelectItem value="assignments">Assignments</SelectItem>
                <SelectItem value="other-resources">Other Resources</SelectItem>
              </SelectContent>
            </Select>

            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {allClasses.sort().map(cls => (
                  <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {allSubjects.map(subject => (
                  <SelectItem key={subject} value={subject}>{subject}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="complianceRate">Compliance Rate</SelectItem>
                <SelectItem value="name">Name</SelectItem>
                <SelectItem value="overdue">Overdue Count</SelectItem>
                <SelectItem value="lastSubmission">Last Submission</SelectItem>
              </SelectContent>
            </Select>

            <div className="text-sm text-slate-600 text-center sm:text-left">
              {filteredData.length} of {complianceData.length} teachers
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Compliance List */}
      <div className="space-y-4">
        {filteredData.map((teacher) => (
          <Card key={teacher.teacherId} className="hover:shadow-md transition-shadow">
            <CardContent className="p-4 sm:p-6">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 mb-3">
                    <h3 className="text-lg font-semibold truncate">{teacher.teacherName}</h3>
                    {getStatusBadge(teacher.status)}
                  </div>
                  
                  <div className="text-sm text-slate-600 mb-2">
                    <span className="font-medium">Subjects:</span> {teacher.subjects.join(', ')}
                  </div>
                  
                  {teacher.classes && teacher.classes.length > 0 && (
                    <div className="text-sm text-slate-600 mb-3">
                      <span className="font-medium">Classes:</span> {teacher.classes.join(', ')}
                    </div>
                  )}

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 mb-4">
                    <div className="text-center p-2 bg-green-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-green-600">{teacher.submitted}</div>
                      <div className="text-xs text-slate-600">Submitted</div>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-blue-600">{teacher.pending}</div>
                      <div className="text-xs text-slate-600">Pending</div>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-red-600">{teacher.overdue}</div>
                      <div className="text-xs text-slate-600">Overdue</div>
                    </div>
                    <div className="text-center p-2 bg-slate-50 rounded-lg">
                      <div className="text-xl sm:text-2xl font-bold text-slate-700">{teacher.totalRequired}</div>
                      <div className="text-xs text-slate-600">Required</div>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium">Compliance Rate</span>
                      <span className="text-sm font-medium">{teacher.complianceRate}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div 
                        className={`h-2 rounded-full ${getComplianceColor(teacher.complianceRate)} transition-all`}
                        style={{ width: `${teacher.complianceRate}%` }}
                      />
                    </div>
                  </div>

                  {teacher.lastSubmission && (
                    <div className="text-xs sm:text-sm text-slate-600 mb-2 break-words">
                      Last submission: {new Date(teacher.lastSubmission).toLocaleDateString()} at {new Date(teacher.lastSubmission).toLocaleTimeString()}
                    </div>
                  )}

                  {teacher.overdue > 0 && (
                    <Alert className="mt-3 border-red-200 bg-red-50">
                      <AlertTriangle className="h-4 w-4 text-red-600" />
                      <AlertDescription className="text-xs sm:text-sm text-red-800">
                        {teacher.overdue} uploads are overdue. Immediate attention required.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>

                <div className="flex flex-row lg:flex-col gap-2 lg:ml-4">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => onViewDetails(teacher.teacherId)}
                    className="flex-1 lg:flex-none"
                  >
                    <FileText className="h-4 w-4 lg:mr-1" />
                    <span className="hidden lg:inline">Details</span>
                  </Button>

                  {!hideReminders && teacher.status !== 'compliant' && (
                    <Button
                      size="sm"
                      onClick={() => onSendReminder(teacher.teacherId)}
                      className="flex-1 lg:flex-none"
                    >
                      <Send className="h-4 w-4 lg:mr-1" />
                      <span className="hidden lg:inline">Remind</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Recent Uploads Preview */}
              {teacher.uploads.length > 0 && (
                <div className="mt-4 pt-4 border-t">
                  <h4 className="font-medium mb-2">Recent Activity</h4>
                  <div className="space-y-2">
                    {teacher.uploads.slice(0, 3).map((upload) => (
                      <div key={upload.id} className="flex items-center justify-between text-sm flex-wrap gap-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <FileText className="h-4 w-4 text-slate-400" />
                          <span className="truncate">{upload.title}</span>
                          {upload.class && (
                            <Badge variant="outline" className="text-xs bg-blue-50">
                              {upload.class}
                            </Badge>
                          )}
                          <Badge variant="outline" className="text-xs">
                            {upload.subject}
                          </Badge>
                          {upload.uploadedByAdmin && (
                            <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-200">
                              Uploaded by Admin
                            </Badge>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {upload.status === 'overdue' && upload.daysOverdue && (
                            <Badge variant="destructive" className="text-xs">
                              {upload.daysOverdue} days overdue
                            </Badge>
                          )}
                          {getStatusBadge(upload.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredData.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Teachers Found</h3>
            <p className="text-slate-500">
              No teachers match your current filters.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}