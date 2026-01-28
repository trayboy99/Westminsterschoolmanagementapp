import { useState, useEffect } from 'react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { FeeHistoryDialog } from './FeeHistoryDialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import {
  GraduationCap,
  Calendar,
  Search,
  Download,
  Loader2,
  AlertTriangle,
  Hash,
  User,
  Mail,
  Phone,
  CheckCircle,
  XCircle,
} from 'lucide-react';

interface FeeHistoryItem {
  session: string;
  term: string;
  expectedFee: number;
  totalPaid: number;
  outstanding: number;
  isCleared: boolean;
}

interface FeeHistoryData {
  feeHistory: FeeHistoryItem[];
  firstRegisteredSession: string | null;
  firstRegisteredTerm: string | null;
  graduationSession: string;
  isFullyCleared: boolean;
  totalOutstanding: number;
  studentName: string;
  admissionNumber: string;
  message?: string;
}

interface GraduatedStudent {
  id: string;
  admission_number: string;
  graduation_number: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  graduation_session: string;
  graduation_date: string;
  graduation_class: string;
  graduation_class_name?: string;
  email?: string;
  phone?: string;
  gender?: string;
  date_of_birth?: string;
  fees_cleared?: boolean;
  outstanding_balance?: number;
}

export function GraduatedStudentsManager() {
  const [loading, setLoading] = useState(true);
  const [graduatedStudents, setGraduatedStudents] = useState<GraduatedStudent[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<GraduatedStudent[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sessionFilter, setSessionFilter] = useState('all');
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  // Extract unique sessions for filtering
  const uniqueSessions = Array.from(
    new Set(graduatedStudents.map((s) => s.graduation_session))
  ).sort((a, b) => b.localeCompare(a)); // Sort descending (newest first)

  useEffect(() => {
    fetchGraduatedStudents();
  }, []);

  useEffect(() => {
    filterStudents();
  }, [searchQuery, sessionFilter, graduatedStudents]);

  const fetchGraduatedStudents = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[Graduated Students] Fetching graduated students...');
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('[Graduated Students] No session found');
        toast.error('Session expired. Please log in again.');
        setError('Session expired. Please log in again.');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/graduated-students`;
      console.log('[Graduated Students] Fetching from:', url);

      const response = await fetch(url, { headers });
      console.log('[Graduated Students] Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Graduated Students] Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch'}`);
      }

      const data = await response.json();
      console.log('[Graduated Students] Response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Server returned unsuccessful response');
      }

      console.log('[Graduated Students] Fetched:', data.students?.length || 0);
      setGraduatedStudents(data.students || []);
      setFilteredStudents(data.students || []);
      toast.success(`Loaded ${data.students?.length || 0} graduated students`);
    } catch (err) {
      console.error('[Graduated Students] Error:', err);
      let errorMessage = 'Failed to fetch graduated students';
      
      if (err instanceof Error) {
        errorMessage = err.message || errorMessage;
      } else if (typeof err === 'string') {
        errorMessage = err;
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const filterStudents = () => {
    let filtered = [...graduatedStudents];

    // Apply session filter
    if (sessionFilter !== 'all') {
      filtered = filtered.filter((s) => s.graduation_session === sessionFilter);
    }

    // Apply search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.admission_number?.toLowerCase().includes(query) ||
          s.graduation_number?.toLowerCase().includes(query) ||
          s.first_name?.toLowerCase().includes(query) ||
          s.middle_name?.toLowerCase().includes(query) ||
          s.last_name?.toLowerCase().includes(query) ||
          `${s.first_name} ${s.last_name}`.toLowerCase().includes(query) ||
          s.graduation_class?.toLowerCase().includes(query)
      );
    }

    setFilteredStudents(filtered);
  };

  const exportToCSV = () => {
    if (filteredStudents.length === 0) {
      toast.error('No students to export');
      return;
    }

    // Create CSV content
    const headers = [
      'Admission Number',
      'Graduation Number',
      'First Name',
      'Middle Name',
      'Last Name',
      'Graduation Session',
      'Graduation Date',
      'Graduation Class',
      'Email',
      'Phone',
      'Gender',
      'Fees Cleared',
    ];

    const rows = filteredStudents.map((student) => [
      student.admission_number || '',
      student.graduation_number || '',
      student.first_name || '',
      student.middle_name || '',
      student.last_name || '',
      student.graduation_session || '',
      student.graduation_date ? new Date(student.graduation_date).toLocaleDateString() : '',
      student.graduation_class || '',
      student.email || '',
      student.phone || '',
      student.gender || '',
      student.fees_cleared ? 'Yes' : 'No',
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
    ].join('\n');

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `graduated_students_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    toast.success('CSV file downloaded successfully');
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateString;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-slate-900">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            Graduated Students
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            View and manage all graduated students (alumni)
          </p>
        </div>
        <Button
          onClick={exportToCSV}
          disabled={loading || filteredStudents.length === 0}
          className="bg-green-600 hover:bg-green-700"
        >
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Total Graduates</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <span className="text-2xl text-slate-900">{graduatedStudents.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Graduation Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-purple-600" />
              <span className="text-2xl text-slate-900">{uniqueSessions.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-slate-600">Filtered Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Search className="h-5 w-5 text-green-600" />
              <span className="text-2xl text-slate-900">{filteredStudents.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filter */}
      <Card>
        <CardHeader>
          <CardTitle>Search & Filter</CardTitle>
          <CardDescription>Find graduated students by name, admission number, or graduation number</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {/* Search Input */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="search"
                  type="text"
                  placeholder="Search by name, admission number, graduation number..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            {/* Session Filter */}
            <div className="space-y-2">
              <Label htmlFor="session-filter">Filter by Graduation Session</Label>
              <select
                id="session-filter"
                value={sessionFilter}
                onChange={(e) => setSessionFilter(e.target.value)}
                className="w-full h-10 px-3 rounded-md border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Sessions</option>
                {uniqueSessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Active Filters Display */}
          {(searchQuery || sessionFilter !== 'all') && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm text-slate-600">Active filters:</span>
              {searchQuery && (
                <Badge variant="secondary">
                  Search: "{searchQuery}"
                  <button
                    onClick={() => setSearchQuery('')}
                    className="ml-2 hover:text-slate-900"
                  >
                    ×
                  </button>
                </Badge>
              )}
              {sessionFilter !== 'all' && (
                <Badge variant="secondary">
                  Session: {sessionFilter}
                  <button
                    onClick={() => setSessionFilter('all')}
                    className="ml-2 hover:text-slate-900"
                  >
                    ×
                  </button>
                </Badge>
              )}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setSessionFilter('all');
                }}
              >
                Clear all
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Error Display */}
      {error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Graduated Students List</CardTitle>
          <CardDescription>
            Showing {filteredStudents.length} of {graduatedStudents.length} graduated students
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-3 text-slate-600">Loading graduated students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12">
              <GraduationCap className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600">
                {searchQuery || sessionFilter !== 'all'
                  ? 'No graduated students found matching your search'
                  : 'No graduated students found'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Hash className="h-4 w-4" />
                        Admission No.
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <GraduationCap className="h-4 w-4" />
                        Graduation No.
                      </div>
                    </TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        Student Name
                      </div>
                    </TableHead>
                    <TableHead>Graduation Session</TableHead>
                    <TableHead>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        Graduation Date
                      </div>
                    </TableHead>
                    <TableHead>Graduated Class</TableHead>
                    <TableHead className="text-center">Fees Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        <span className="font-mono text-sm">
                          {student.admission_number || 'N/A'}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          {student.graduation_number || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="text-slate-900">
                            {student.first_name} {student.middle_name && `${student.middle_name} `}
                            {student.last_name}
                          </div>
                          {(student.email || student.phone) && (
                            <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                              {student.email && (
                                <span className="flex items-center gap-1">
                                  <Mail className="h-3 w-3" />
                                  {student.email}
                                </span>
                              )}
                              {student.phone && (
                                <span className="flex items-center gap-1">
                                  <Phone className="h-3 w-3" />
                                  {student.phone}
                                </span>
                              )}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{student.graduation_session}</Badge>
                      </TableCell>
                      <TableCell className="text-slate-600">
                        {formatDate(student.graduation_date)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                          {student.graduation_class_name || student.graduation_class}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex flex-col items-center gap-2">
                          {student.fees_cleared ? (
                            <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Cleared
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-yellow-50 text-yellow-700 border-yellow-200">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                          <FeeHistoryDialog
                            studentId={student.id}
                            studentName={`${student.first_name} ${student.last_name}`}
                            admissionNumber={student.admission_number || ''}
                          />
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}