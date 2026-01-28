import { useState, useEffect } from 'react';
import { Loader2, Info, ArrowLeft, User, Wallet, TrendingDown, CheckCircle2, Clock, XCircle, Filter, DollarSign, Users, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { projectId } from '../../utils/supabase/info';
import { toast } from '../ui/CustomToast';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid } from 'recharts';

interface PaymentPart {
  part_number: number;
  amount: number;
  payment_date: string;
  status: 'pending' | 'approved' | 'rejected';
  payment_id: string;
  receipt_number?: string;
  payment_method?: string;
}

interface StudentPaymentRecord {
  student_id: string;
  student_name: string;
  student_type: 'Day' | 'Boarding';
  class_name: string;
  academic_year: string;
  term: string;
  original_fee: number;
  discount_percentage: number;
  required_fee: number;
  total_paid: number;
  balance: number;
  payment_parts: PaymentPart[];
  clearance_status: 'cleared' | 'partial' | 'unpaid';
}

interface Props {
  onBack?: () => void;
}

export default function DirectorStudentPaymentsTable({ onBack }: Props) {
  const [records, setRecords] = useState<StudentPaymentRecord[]>([]);
  const [allStudentsExpected, setAllStudentsExpected] = useState(0); // Total expected from ALL students
  const [totalStudentCount, setTotalStudentCount] = useState(0); // Total count of ALL students
  const [loading, setLoading] = useState(true);
  const [selectedSession, setSelectedSession] = useState('2025/2026');
  const [selectedTerm, setSelectedTerm] = useState('First Term');
  const [sessions, setSessions] = useState<string[]>([]);
  const [terms] = useState(['First Term', 'Second Term', 'Third Term']);
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [statusFilter, setStatusFilter] = useState<'all' | 'cleared' | 'partial' | 'unpaid'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const recordsPerPage = 10;

  useEffect(() => {
    fetchStudentPayments();
    fetchAllStudentsExpected();
    fetchSessions();
  }, [selectedSession, selectedTerm]);

  // Fetch current term on component mount
  useEffect(() => {
    fetchCurrentTerm();
  }, []);

  const fetchCurrentTerm = async () => {
    try {
      // Get auth token
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        console.log('[Director Payments] No auth token found');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const result = await res.json();

      console.log('[Director Payments] Full API Response:', result);

      if (result.success) {
        // Get active session
        const currentSession = result.sessions?.find((s: any) => s.is_current);
        console.log('[Director Payments] Current session from DB:', currentSession);
        
        // Get active term
        const currentTerm = result.terms?.find((t: any) => t.is_current);
        console.log('[Director Payments] Current term from DB:', currentTerm);

        if (currentSession) {
          setSelectedSession(currentSession.session_name);
        }

        if (currentTerm) {
          setSelectedTerm(currentTerm.term_name);
        }
      }
    } catch (error) {
      console.error('[Director Payments] Error fetching active session/term:', error);
    }
  };

  const fetchAllStudentsExpected = async () => {
    try {
      // Get auth token
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        console.log('[DirectorStudentPayments] No auth token found');
        return;
      }

      console.log('[DirectorStudentPayments] Fetching all students expected fees...');

      // Fetch all students with their expected fees
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/students-expected-fees?academic_year=${selectedSession}&term=${selectedTerm}`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log('[DirectorStudentPayments] All students expected:', data);
      
      if (data.success) {
        setAllStudentsExpected(data.total_expected || 0);
        setTotalStudentCount(data.student_count || 0); // Set total student count
      }
    } catch (error) {
      console.error('[DirectorStudentPayments] Error fetching expected fees:', error);
    }
  };

  const fetchStudentPayments = async () => {
    try {
      setLoading(true);
      
      // Get auth token
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        console.log('[DirectorStudentPayments] No auth token found');
        return;
      }

      console.log('[DirectorStudentPayments] Fetching all payments...');

      // Fetch ONLY APPROVED payments for the selected session/term
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments?academic_year=${selectedSession}&term=${selectedTerm}&approval_status=approved`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log('[DirectorStudentPayments] Response:', data);
      
      if (data.success && data.payments) {
        // First, get clearance records for all students
        const clearanceResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/clearance/bulk?academic_year=${selectedSession}&term=${selectedTerm}`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          }
        );

        const clearanceData = await clearanceResponse.json();
        console.log('[DirectorStudentPayments] Clearance data:', clearanceData);

        // Create a map of student clearance by student_id
        const clearanceMap = new Map<string, any>();
        if (clearanceData.success && clearanceData.clearances) {
          clearanceData.clearances.forEach((clearance: any) => {
            clearanceMap.set(clearance.student_id, clearance);
          });
        }

        // Group payments by student
        const studentMap = new Map<string, StudentPaymentRecord>();
        
        data.payments.forEach((payment: any) => {
          const studentId = payment.student_id;
          
          if (!studentMap.has(studentId)) {
            // Get clearance info for this student
            const clearance = clearanceMap.get(studentId);
            const requiredFee = clearance?.required_amount || 0;
            const totalPaid = clearance?.total_paid || 0;
            
            // Create new student record
            studentMap.set(studentId, {
              student_id: studentId,
              student_name: `${payment.student?.first_name || ''} ${payment.student?.last_name || ''}`.trim(),
              student_type: (payment.student_type || 'day').charAt(0).toUpperCase() + (payment.student_type || 'day').slice(1) as 'Day' | 'Boarding',
              class_name: payment.student?.class_name || 'N/A',
              academic_year: payment.academic_year,
              term: payment.term,
              original_fee: clearance?.original_amount || requiredFee,
              discount_percentage: clearance?.discount_percentage || 0,
              required_fee: requiredFee,
              total_paid: totalPaid,
              balance: requiredFee - totalPaid,
              payment_parts: [],
              clearance_status: (requiredFee - totalPaid) <= 0 ? 'cleared' : totalPaid > 0 ? 'partial' : 'unpaid',
            });
          }
          
          // Add payment part
          const record = studentMap.get(studentId)!;
          record.payment_parts.push({
            part_number: payment.part_payment_number || 1,
            amount: payment.amount_paid || 0,
            payment_date: payment.payment_date || payment.created_at,
            status: payment.approval_status || 'pending',
            payment_id: payment.id,
            receipt_number: payment.receipt_number,
            payment_method: payment.payment_method,
          });
        });
        
        // Convert map to array and sort
        const studentRecords = Array.from(studentMap.values()).sort((a, b) => 
          a.student_name.localeCompare(b.student_name)
        );
        
        // Sort payment parts by part number for each student
        studentRecords.forEach(record => {
          record.payment_parts.sort((a, b) => a.part_number - b.part_number);
          
          // IMPORTANT: Recalculate total_paid, balance, and clearance_status
          // Sum only APPROVED payment parts
          const approvedTotal = record.payment_parts
            .filter(part => part.status === 'approved')
            .reduce((sum, part) => sum + part.amount, 0);
          
          record.total_paid = approvedTotal;
          record.balance = record.required_fee - approvedTotal;
          
          // Update clearance status based on actual balance
          if (record.balance <= 0) {
            record.clearance_status = 'cleared';
          } else if (approvedTotal > 0) {
            record.clearance_status = 'partial';
          } else {
            record.clearance_status = 'unpaid';
          }
        });
        
        console.log('[DirectorStudentPayments] Student records:', studentRecords);
        setRecords(studentRecords);
      }
    } catch (error) {
      console.error('[DirectorStudentPayments] Error:', error);
      toast.error('Failed to load student payments');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      // Get auth token
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        console.log('[DirectorStudentPayments] No auth token found');
        // Set default session if no token
        setSessions(['2025/2026']);
        return;
      }

      console.log('[DirectorStudentPayments] Fetching sessions...');

      // Fetch all sessions
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/sessions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log('[DirectorStudentPayments] Sessions:', data);
      
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      } else {
        // Set default session if API fails
        console.warn('[DirectorStudentPayments] Failed to fetch sessions, using default');
        setSessions(['2025/2026']);
      }
    } catch (error) {
      console.error('[DirectorStudentPayments] Error fetching sessions:', error);
      // Set default session on error
      setSessions(['2025/2026']);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      month: 'short',
      day: 'numeric',
    });
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'approved': return 'default';
      case 'pending': return 'secondary';
      case 'rejected': return 'destructive';
      default: return 'outline';
    }
  };

  const getClearanceBadge = (status: string) => {
    switch (status) {
      case 'cleared':
        return <Badge className="bg-emerald-600 hover:bg-emerald-700 text-white">Cleared</Badge>;
      case 'partial':
        return <Badge className="bg-slate-600 hover:bg-slate-700 text-white">Partial</Badge>;
      case 'unpaid':
        return <Badge className="bg-rose-600 hover:bg-rose-700 text-white">Unpaid</Badge>;
      default:
        return <Badge variant="outline">Unknown</Badge>;
    }
  };

  const filteredRecords = statusFilter === 'all' 
    ? records 
    : records.filter(r => r.clearance_status === statusFilter);

  // Calculate max payment parts to create columns
  const maxPaymentParts = records.reduce((max, record) => 
    Math.max(max, record.payment_parts.length), 0
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-slate-600" />
      </div>
    );
  }

  if (records.length === 0) {
    return (
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Info className="h-10 w-10 text-slate-400" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 mb-2">No Payment Records</h3>
          <p className="text-slate-500">No payment records found for {selectedSession} - {selectedTerm}</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate totals
  const totalCollected = records.reduce((sum, r) => sum + r.total_paid, 0);
  const totalOutstanding = allStudentsExpected - totalCollected;

  // Calculate clearance counts
  const clearedCount = records.filter(r => r.clearance_status === 'cleared').length;
  const partialCount = records.filter(r => r.clearance_status === 'partial').length;
  
  // Unpaid students are those who haven't made ANY payment
  // Total students - (students who made payments)
  const unpaidCount = totalStudentCount - records.length;

  // Chart data for pie chart
  const pieChartData = [
    { name: 'Collected', value: totalCollected, color: '#10b981' },
    { name: 'Outstanding', value: Math.max(0, totalOutstanding), color: '#ef4444' },
  ];

  // Chart data for bar chart
  const barChartData = [
    {
      name: 'Cleared',
      count: clearedCount,
      color: '#10b981'
    },
    {
      name: 'Partial',
      count: partialCount,
      color: '#f59e0b'
    },
    {
      name: 'Unpaid',
      count: unpaidCount,
      color: '#ef4444'
    },
  ];

  // Pagination
  const indexOfLastRecord = currentPage * recordsPerPage;
  const indexOfFirstRecord = indexOfLastRecord - recordsPerPage;
  const currentRecords = filteredRecords.slice(indexOfFirstRecord, indexOfLastRecord);
  const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);

  return (
    <div className="space-y-4">
      {/* Current Term Context Banner */}
      {selectedSession && selectedTerm && (
        <div className="bg-gradient-to-r from-purple-50 to-pink-50 border-2 border-purple-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-purple-500 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Viewing Payment Data For:</p>
                <p className="font-bold text-slate-900">
                  {selectedSession} - {selectedTerm}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Session and Term Filters */}
      <Card className="border border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block">Academic Session</label>
              <select
                value={selectedSession}
                onChange={(e) => {
                  setSelectedSession(e.target.value);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {sessions.map((session) => (
                  <option key={session} value={session}>
                    {session}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-medium text-slate-700 mb-1.5 block">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  setCurrentPage(1); // Reset to first page on filter change
                }}
                className="w-full px-3 py-2 text-sm border border-slate-300 rounded-lg bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-400"
              >
                {terms.map((term) => (
                  <option key={term} value={term}>
                    {term}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-slate-200 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                <Users className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-600 font-medium">Total Students</p>
                <p className="text-xl font-bold text-slate-900 truncate">{totalStudentCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0">
                <CheckCircle2 className="h-5 w-5 text-emerald-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-emerald-700 font-medium">Cleared</p>
                <p className="text-xl font-bold text-emerald-900">{clearedCount}</p>
                <p className="text-xs text-emerald-600">
                  {totalStudentCount > 0 ? `${((clearedCount / totalStudentCount) * 100).toFixed(0)}%` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-slate-200 shadow-sm bg-slate-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center flex-shrink-0">
                <Clock className="h-5 w-5 text-slate-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-700 font-medium">Partial</p>
                <p className="text-xl font-bold text-slate-900">{partialCount}</p>
                <p className="text-xs text-slate-600">
                  {totalStudentCount > 0 ? `${((partialCount / totalStudentCount) * 100).toFixed(0)}%` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-rose-200 shadow-sm bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-rose-100 flex items-center justify-center flex-shrink-0">
                <XCircle className="h-5 w-5 text-rose-700" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-rose-700 font-medium">Unpaid</p>
                <p className="text-xl font-bold text-rose-900">{unpaidCount}</p>
                <p className="text-xs text-rose-600">
                  {totalStudentCount > 0 ? `${((unpaidCount / totalStudentCount) * 100).toFixed(0)}%` : '0%'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-slate-600 font-medium">Total Expected</p>
              <DollarSign className="h-4 w-4 text-slate-400" />
            </div>
            <p className="text-2xl font-bold text-slate-900">{formatCurrency(allStudentsExpected)}</p>
            <p className="text-xs text-slate-500 mt-1">All students (with discounts)</p>
          </CardContent>
        </Card>

        <Card className="border border-emerald-200 shadow-sm bg-emerald-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-emerald-700 font-medium">Total Collected</p>
              <TrendingDown className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold text-emerald-900">{formatCurrency(totalCollected)}</p>
            <p className="text-xs text-emerald-600 mt-1">
              {allStudentsExpected > 0 ? `${((totalCollected / allStudentsExpected) * 100).toFixed(1)}% collected` : '0%'}
            </p>
          </CardContent>
        </Card>

        <Card className="border border-rose-200 shadow-sm bg-rose-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-xs text-rose-700 font-medium">Outstanding</p>
              <Wallet className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-2xl font-bold text-rose-900">{formatCurrency(Math.max(0, totalOutstanding))}</p>
            <p className="text-xs text-rose-600 mt-1">
              {allStudentsExpected > 0 ? `${((totalOutstanding / allStudentsExpected) * 100).toFixed(1)}% pending` : '0%'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Buttons */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        <Button
          size="sm"
          variant={statusFilter === 'all' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('all')}
          className={`whitespace-nowrap ${statusFilter === 'all' ? 'bg-slate-900 hover:bg-slate-800' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
        >
          All ({records.length})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'cleared' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('cleared')}
          className={`whitespace-nowrap ${statusFilter === 'cleared' ? 'bg-emerald-600 hover:bg-emerald-700' : 'border-emerald-300 text-emerald-700 hover:bg-emerald-50'}`}
        >
          Cleared ({clearedCount})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'partial' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('partial')}
          className={`whitespace-nowrap ${statusFilter === 'partial' ? 'bg-slate-600 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50'}`}
        >
          Partial ({partialCount})
        </Button>
        <Button
          size="sm"
          variant={statusFilter === 'unpaid' ? 'default' : 'outline'}
          onClick={() => setStatusFilter('unpaid')}
          className={`whitespace-nowrap ${statusFilter === 'unpaid' ? 'bg-rose-600 hover:bg-rose-700' : 'border-rose-300 text-rose-700 hover:bg-rose-50'}`}
        >
          Unpaid ({unpaidCount})
        </Button>
      </div>

      {/* Student Payment Cards */}
      <div className="space-y-3">
        {currentRecords.map((record) => (
          <Card 
            key={record.student_id} 
            className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200"
          >
            <CardContent className="p-0">
              {/* Card Header */}
              <div className={`p-4 ${
                record.clearance_status === 'cleared' 
                  ? 'bg-emerald-600' 
                  : record.clearance_status === 'partial'
                  ? 'bg-slate-700'
                  : 'bg-rose-600'
              }`}>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <h3 className="font-semibold text-white text-base flex items-center gap-2">
                      <User className="h-4 w-4" />
                      {record.student_name}
                    </h3>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge 
                        variant="secondary"
                        className="text-xs bg-white/20 text-white border-0 hover:bg-white/30"
                      >
                        {record.student_type}
                      </Badge>
                      <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                        {record.class_name}
                      </Badge>
                      {getClearanceBadge(record.clearance_status)}
                    </div>
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 space-y-3 bg-white">
                {/* Discount Info */}
                {record.discount_percentage > 0 && (
                  <div className="rounded-lg bg-indigo-50 border border-indigo-200 p-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-medium text-indigo-900">
                          {record.discount_percentage}% Discount Applied
                        </p>
                        <p className="text-xs text-indigo-700 mt-0.5">
                          Original: {formatCurrency(record.original_fee)}
                        </p>
                      </div>
                      <Badge className="bg-indigo-600 hover:bg-indigo-700 text-white">
                        Saved {formatCurrency(record.original_fee - record.required_fee)}
                      </Badge>
                    </div>
                  </div>
                )}

                {/* Payment Summary */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                    <p className="text-xs text-slate-600 font-medium mb-1">Required</p>
                    <p className="text-sm font-bold text-slate-900">{formatCurrency(record.required_fee)}</p>
                  </div>
                  <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
                    <p className="text-xs text-emerald-700 font-medium mb-1">Paid</p>
                    <p className="text-sm font-bold text-emerald-900">{formatCurrency(record.total_paid)}</p>
                  </div>
                  <div className={`rounded-lg border p-3 ${record.balance > 0 ? 'bg-rose-50 border-rose-200' : 'bg-emerald-50 border-emerald-200'}`}>
                    <p className={`text-xs font-medium mb-1 ${record.balance > 0 ? 'text-rose-700' : 'text-emerald-700'}`}>
                      Balance
                    </p>
                    <p className={`text-sm font-bold ${record.balance > 0 ? 'text-rose-900' : 'text-emerald-900'}`}>
                      {formatCurrency(Math.max(0, record.balance))}
                    </p>
                  </div>
                </div>

                {/* Payment Parts */}
                {record.payment_parts.length > 0 && (
                  <div className="pt-2 border-t border-slate-200">
                    <p className="text-xs font-medium text-slate-700 mb-2">Payment History</p>
                    <div className="space-y-2">
                      {record.payment_parts.map((part, index) => (
                        <div key={part.payment_id} className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-lg p-2">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-xs font-bold text-indigo-700">{part.part_number}</span>
                            </div>
                            <div>
                              <p className="text-sm font-semibold text-slate-900">{formatCurrency(part.amount)}</p>
                              <p className="text-xs text-slate-500">{formatDate(part.payment_date)}</p>
                            </div>
                          </div>
                          <Badge 
                            variant={getStatusBadgeVariant(part.status)}
                            className="text-xs"
                          >
                            {part.status}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Empty State for Filter */}
      {filteredRecords.length === 0 && statusFilter !== 'all' && (
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Filter className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="text-base font-semibold text-slate-900 mb-1">No {statusFilter} students</h3>
            <p className="text-sm text-slate-500">Try a different filter</p>
          </CardContent>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Card className="border border-slate-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="text-sm text-slate-600">
                Showing {indexOfFirstRecord + 1} to {Math.min(indexOfLastRecord, filteredRecords.length)} of {filteredRecords.length} records
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </Button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          size="sm"
                          variant={page === currentPage ? 'default' : 'outline'}
                          onClick={() => setCurrentPage(page)}
                          className={`w-9 h-9 p-0 ${
                            page === currentPage
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : 'border-slate-300 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          {page}
                        </Button>
                      );
                    } else if (page === currentPage - 2 || page === currentPage + 2) {
                      return (
                        <span key={page} className="text-slate-400 px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  })}
                </div>

                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="border-slate-300 text-slate-700 hover:bg-slate-50"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}