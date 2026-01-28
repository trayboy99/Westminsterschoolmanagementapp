import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  CheckCircle,
  XCircle,
  Clock,
  Users,
  TrendingUp,
  AlertCircle,
  Filter,
  Download,
  RefreshCw,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface TeacherMarksStatus {
  teacher_id: string;
  teacher_name: string;
  subject_name: string;
  class_name: string;
  exam_type: string;
  exam_name: string;
  exam_status: string;
  status: 'entered' | 'not_entered' | 'approved' | 'submitted';
  date_submitted?: string;
  student_count: number;
}

interface OverviewStats {
  totalTeachers: number;
  teachersWithMarks: number;
  teachersWithoutMarks: number;
  completionPercentage: number;
  totalSubmissions: number;
  midtermSubmissions: number;
  terminalSubmissions: number;
  approvedSubmissions: number;
  approvedMidterm: number;
  approvedTerminal: number;
  pendingSubmissions: number;
  pendingMidterm: number;
  pendingTerminal: number;
}

interface MarksEntryOverviewProps {
  sessionId?: string;
  termId?: string;
  session?: string;
  term?: string;
}

export function MarksEntryOverview({ sessionId, termId, session, term }: MarksEntryOverviewProps) {
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<OverviewStats>({
    totalTeachers: 0,
    teachersWithMarks: 0,
    teachersWithoutMarks: 0,
    completionPercentage: 0,
    totalSubmissions: 0,
    midtermSubmissions: 0,
    terminalSubmissions: 0,
    approvedSubmissions: 0,
    approvedMidterm: 0,
    approvedTerminal: 0,
    pendingSubmissions: 0,
    pendingMidterm: 0,
    pendingTerminal: 0,
  });
  const [teacherStatuses, setTeacherStatuses] = useState<TeacherMarksStatus[]>([]);
  const [filteredStatuses, setFilteredStatuses] = useState<TeacherMarksStatus[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterExam, setFilterExam] = useState<string>('all');
  const [filterExamStatus, setFilterExamStatus] = useState<string>('all');
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchOverviewData();
  }, [sessionId, termId, session, term]);

  useEffect(() => {
    applyFilters();
    setCurrentPage(1); // Reset to page 1 when filters change
  }, [filterStatus, filterExam, filterExamStatus, teacherStatuses]);

  const fetchOverviewData = async () => {
    setLoading(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        toast.error('Please sign in to view marks overview');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authSession.access_token}`
      };

      const url = new URL(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks-entry-overview`);
      if (sessionId) url.searchParams.append('session_id', sessionId);
      if (termId) url.searchParams.append('term_id', termId);
      if (session) url.searchParams.append('session', session);
      if (term) url.searchParams.append('term', term);

      console.log('[MarksEntryOverview] Fetching with URL:', url.toString());
      console.log('[MarksEntryOverview] Params:', { sessionId, termId, session, term });

      const response = await fetch(url.toString(), { headers });
      
      console.log('[MarksEntryOverview] Response status:', response.status);
      
      const data = await response.json();
      
      console.log('[MarksEntryOverview] Response data:', data);

      if (data.success) {
        console.log('[MarksEntryOverview] Stats received:', data.stats);
        console.log('[MarksEntryOverview] Teacher statuses count:', data.teacherStatuses?.length);
        setStats(data.stats);
        setTeacherStatuses(data.teacherStatuses);
        setFilteredStatuses(data.teacherStatuses);
      } else {
        console.error('[MarksEntryOverview] API error:', data.error);
        toast.error(data.error || 'Failed to load marks overview');
      }
    } catch (error) {
      console.error('[MarksEntryOverview] Error fetching overview:', error);
      toast.error('Error loading marks overview');
    } finally {
      setLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...teacherStatuses];

    if (filterStatus !== 'all') {
      filtered = filtered.filter(item => item.status === filterStatus);
    }

    if (filterExam !== 'all') {
      filtered = filtered.filter(item => item.exam_type === filterExam);
    }

    if (filterExamStatus !== 'all') {
      filtered = filtered.filter(item => item.exam_status === filterExamStatus);
    }

    setFilteredStatuses(filtered);
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-100 text-green-800 border-green-200">Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-100 text-blue-800 border-blue-200">Submitted</Badge>;
      case 'entered':
        return <Badge className="bg-orange-100 text-orange-800 border-orange-200">Draft</Badge>;
      case 'not_entered':
        return <Badge className="bg-red-100 text-red-800 border-red-200">Not Entered</Badge>;
      default:
        return <Badge className="bg-slate-100 text-slate-800">Unknown</Badge>;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'submitted':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'entered':
        return <AlertCircle className="h-4 w-4 text-orange-600" />;
      case 'not_entered':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return null;
    }
  };

  // Pagination calculations
  const totalPages = Math.ceil(filteredStatuses.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedStatuses = filteredStatuses.slice(startIndex, endIndex);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Loading marks overview...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards - Option C */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-200 rounded-lg">
                <Users className="h-5 w-5 text-blue-700" />
              </div>
              <div>
                <p className="text-sm text-blue-700">Total Teachers</p>
                <p className="text-2xl font-bold text-blue-900">{stats.totalTeachers}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-green-700 mb-1">With Marks</p>
                <p className="text-2xl font-bold text-green-900">{stats.teachersWithMarks}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-green-700">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-600"></div>
                    <span>M: {stats.midtermSubmissions}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-600"></div>
                    <span>T: {stats.terminalSubmissions}</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-green-200 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-red-700 mb-1">Without Marks</p>
                <p className="text-2xl font-bold text-red-900">{stats.teachersWithoutMarks}</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-red-700">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-600"></div>
                    <span>Missing entries</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-red-200 rounded-lg">
                <XCircle className="h-5 w-5 text-red-700" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-purple-700 mb-1">Completion</p>
                <p className="text-2xl font-bold text-purple-900">{stats.completionPercentage}%</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-purple-700">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-600"></div>
                    <span>M: {Math.round((stats.midtermSubmissions / stats.totalSubmissions) * 100) || 0}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-violet-600"></div>
                    <span>T: {Math.round((stats.terminalSubmissions / stats.totalSubmissions) * 100) || 0}%</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-purple-200 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-700" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Warning when no data */}
      {teacherStatuses.length === 0 && stats.totalTeachers > 0 && (
        <Card className="bg-yellow-50 border-yellow-200">
          <CardContent className="p-6">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="font-medium text-yellow-900">No Marks Data Found</p>
                <p className="text-sm text-yellow-700 mt-1">
                  There are no exams or marks entries for the selected session ({session || sessionId}) and term ({term || termId}).
                  Please ensure:
                </p>
                <ul className="text-sm text-yellow-700 mt-2 ml-4 list-disc space-y-1">
                  <li>Exams have been created for this session and term</li>
                  <li>Teachers have entered marks for their assigned classes</li>
                  <li>The session and term filters match existing data</li>
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Detailed Table - Option B */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <CardTitle>Teacher Marks Entry Status</CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={fetchOverviewData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  // Export functionality placeholder
                  toast.info('Export feature coming soon');
                }}
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            <div className="flex items-center gap-2 flex-shrink-0">
              <Filter className="h-4 w-4 text-slate-600" />
              <span className="text-sm text-slate-600">Filter by:</span>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="approved">Approved</SelectItem>
                  <SelectItem value="submitted">Submitted</SelectItem>
                  <SelectItem value="entered">Draft</SelectItem>
                  <SelectItem value="not_entered">Not Entered</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterExam} onValueChange={setFilterExam}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Exam Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Exams</SelectItem>
                  <SelectItem value="midterm">Midterm</SelectItem>
                  <SelectItem value="terminal">Terminal</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterExamStatus} onValueChange={setFilterExamStatus}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Exam Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="upcoming">Upcoming</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>

              {(filterStatus !== 'all' || filterExam !== 'all' || filterExamStatus !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterStatus('all');
                    setFilterExam('all');
                    setFilterExamStatus('all');
                  }}
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
            <div className="min-w-[900px] rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Status</TableHead>
                    <TableHead className="min-w-[150px]">Teacher</TableHead>
                    <TableHead className="min-w-[150px]">Subject</TableHead>
                    <TableHead className="min-w-[120px]">Class</TableHead>
                    <TableHead className="min-w-[140px]">Exam</TableHead>
                    <TableHead className="min-w-[80px]">Students</TableHead>
                    <TableHead className="min-w-[120px]">Date Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStatuses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500">
                        No records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    paginatedStatuses.map((item, index) => (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getStatusIcon(item.status)}
                            {getStatusBadge(item.status)}
                          </div>
                        </TableCell>
                        <TableCell className="font-medium whitespace-nowrap">{item.teacher_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.subject_name}</TableCell>
                        <TableCell className="whitespace-nowrap">{item.class_name}</TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge variant="outline" className="capitalize w-fit whitespace-nowrap">
                              {item.exam_name}
                            </Badge>
                            <span className="text-xs text-slate-600 capitalize whitespace-nowrap">
                              {item.exam_type}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>{item.student_count}</TableCell>
                        <TableCell>
                          {item.date_submitted ? (
                            <span className="text-sm whitespace-nowrap">
                              {new Date(item.date_submitted).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                year: 'numeric'
                              })}
                            </span>
                          ) : (
                            <span className="text-slate-400 text-sm">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>

          {/* Pagination Controls */}
          {filteredStatuses.length > itemsPerPage && (
            <div className="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="text-sm text-muted-foreground">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredStatuses.length)} of {filteredStatuses.length} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Button>
                <div className="text-sm">
                  Page {currentPage} of {totalPages}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}

          {/* Footer Summary */}
          {filteredStatuses.length <= itemsPerPage && (
            <div className="mt-4 text-sm text-slate-600">
              Showing {filteredStatuses.length} of {teacherStatuses.length} records
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}