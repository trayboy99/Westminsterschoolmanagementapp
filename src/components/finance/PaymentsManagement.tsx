import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from '../ui/CustomToast';
import { Edit, Trash2, Search, Download, Loader2 } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import PaymentEntryForm from './PaymentEntryForm';
import { createClient } from '../../utils/supabase/client';

interface Payment {
  id: string;
  student: {
    first_name: string;
    last_name: string;
  };
  academic_year: string;
  term: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  approval_status: string;
  notes: string;
  created_at: string;
  part_payment_number?: number;
  student_type?: string;
  total_paid?: number;
}

export default function PaymentsManagement() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterYear, setFilterYear] = useState('');
  const [filterTerm, setFilterTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [paymentToDelete, setPaymentToDelete] = useState<string | null>(null);
  const [editingPayment, setEditingPayment] = useState<Payment | null>(null);
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);

  const supabase = createClient();

  // Fetch active session and term on mount
  useEffect(() => {
    fetchActiveSessionAndTerm();
  }, []);

  useEffect(() => {
    if (filterYear && filterTerm) {
      fetchPayments();
    }
  }, [filterYear, filterTerm, filterStatus]);

  const fetchActiveSessionAndTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers: { 'Authorization': `Bearer ${session.access_token}` } }
      );
      const result = await res.json();

      console.log('[PaymentsManagement] Session settings:', result);

      if (result.success) {
        const currentSession = result.sessions?.find((s: any) => s.is_current);
        const currentTerm = result.terms?.find((t: any) => t.is_current);

        if (currentSession) {
          setFilterYear(currentSession.session_name);
        }
        if (currentTerm) {
          setFilterTerm(currentTerm.term_name);
        }

        // Get all available sessions for dropdown
        if (result.sessions) {
          const sessionNames = result.sessions.map((s: any) => s.session_name);
          setAvailableSessions(sessionNames);
        }
      }
    } catch (error) {
      console.error('[PaymentsManagement] Error fetching active session/term:', error);
    }
  };

  const fetchPayments = async () => {
    try {
      setLoading(true);
      
      // Try localStorage first, then sessionStorage, then Supabase auth
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        // Fall back to Supabase client auth
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        console.log('[PaymentsManagement] No auth token found');
        toast.error('Authentication required. Please log in again.');
        return;
      }

      let url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments`;
      const params = new URLSearchParams();
      
      // Only add filters if they have valid values (not "all")
      if (filterYear && filterYear !== 'all') params.append('academic_year', filterYear);
      if (filterTerm && filterTerm !== 'all') params.append('term', filterTerm);
      if (filterStatus && filterStatus !== 'all') params.append('approval_status', filterStatus);
      
      if (params.toString()) url += `?${params.toString()}`;

      console.log('[PaymentsManagement] Fetching payments from:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        console.error('[PaymentsManagement] HTTP Error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('[PaymentsManagement] Response:', data);
      
      if (data.success) {
        console.log('[PaymentsManagement] Found payments:', data.payments?.length || 0);
        
        // Log calculation details for first few payments
        data.payments?.slice(0, 3).forEach((payment: any) => {
          console.log(`[PaymentsManagement] Payment ${payment.id}:`, {
            student: `${payment.student?.first_name} ${payment.student?.last_name}`,
            status: payment.approval_status,
            amount_paid: payment.amount_paid,
            total_paid: payment.total_paid
          });
        });
        
        setPayments(data.payments || []);
      } else {
        console.error('[PaymentsManagement] Error:', data.error);
        toast.error(data.error || 'Failed to load payments');
      }
    } catch (error) {
      console.error('[PaymentsManagement] Error fetching payments:', error);
      toast.error('Failed to load payments. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!paymentToDelete) return;

    try {
      // Try localStorage first, then sessionStorage, then Supabase auth
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/${paymentToDelete}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Payment deleted successfully');
        fetchPayments();
      } else {
        toast.error(data.error || 'Failed to delete payment');
      }
    } catch (error) {
      console.error('Error deleting payment:', error);
      toast.error('An error occurred');
    } finally {
      setDeleteDialogOpen(false);
      setPaymentToDelete(null);
    }
  };

  const handleExport = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      let url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/export`;
      const params = new URLSearchParams();
      if (filterYear) params.append('academic_year', filterYear);
      if (filterTerm) params.append('term', filterTerm);
      if (filterStatus) params.append('approval_status', filterStatus);
      if (params.toString()) url += `?${params.toString()}`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const result = await response.json();

      if (result.success) {
        // Convert to CSV
        const headers = Object.keys(result.data[0] || {});
        const csv = [
          headers.join(','),
          ...result.data.map((row: any) =>
            headers.map(header => {
              const value = row[header];
              return typeof value === 'string' && value.includes(',') 
                ? `"${value}"` 
                : value;
            }).join(',')
          )
        ].join('\n');

        // Download
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `payments_export_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        toast.success('Payments exported successfully');
      }
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export payments');
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      pending: 'default',
      approved: 'default',
      rejected: 'destructive',
    };

    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };

    return (
      <Badge className={colors[status] || ''}>
        {status}
      </Badge>
    );
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const filteredPayments = payments.filter(payment => {
    const searchLower = searchTerm.toLowerCase();
    const studentName = `${payment.student?.first_name} ${payment.student?.last_name}`.toLowerCase();
    const receiptNumber = payment.receipt_number?.toLowerCase() || '';
    
    return studentName.includes(searchLower) || receiptNumber.includes(searchLower);
  });

  if (editingPayment) {
    return (
      <PaymentEntryForm
        existingPayment={editingPayment}
        onSuccess={() => {
          setEditingPayment(null);
          fetchPayments();
        }}
        onCancel={() => setEditingPayment(null)}
      />
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments Management</CardTitle>
        <CardDescription>View, edit, and manage payment records</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or receipt..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Select value={filterYear} onValueChange={setFilterYear}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {availableSessions.map(session => (
                <SelectItem key={session} value={session}>{session}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTerm} onValueChange={setFilterTerm}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Terms" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Terms</SelectItem>
              <SelectItem value="First Term">First Term</SelectItem>
              <SelectItem value="Second Term">Second Term</SelectItem>
              <SelectItem value="Third Term">Third Term</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="approved">Approved</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>

          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Part #</TableHead>
                  <TableHead>Year/Term</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Receipt</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPayments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={12} className="text-center py-8 text-muted-foreground">
                      No payments found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPayments.map((payment) => (
                    <TableRow key={payment.id}>
                      <TableCell>
                        {payment.student?.first_name} {payment.student?.last_name}
                      </TableCell>
                      <TableCell>
                        <Badge variant={payment.student_type === 'boarding' ? 'default' : 'secondary'}>
                          {payment.student_type === 'boarding' ? 'Boarding' : 'Day'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {payment.part_payment_number ? (
                          <Badge variant="outline">{payment.part_payment_number}{payment.part_payment_number === 1 ? 'st' : payment.part_payment_number === 2 ? 'nd' : payment.part_payment_number === 3 ? 'rd' : 'th'}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{payment.academic_year}</div>
                          <div className="text-muted-foreground">{payment.term}</div>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(payment.amount_paid)}
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {formatCurrency(payment.total_paid || 0)}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className={`text-sm font-semibold ${(payment.balance || 0) > 0 ? 'text-red-600' : (payment.balance || 0) < 0 ? 'text-green-600' : 'text-gray-600'}`}>
                          {payment.balance !== undefined ? formatCurrency(Math.abs(payment.balance)) : '-'}
                          {payment.balance && payment.balance < 0 && ' (Overpaid)'}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(payment.payment_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell className="capitalize">
                        {payment.payment_method.replace('_', ' ')}
                      </TableCell>
                      <TableCell>{payment.receipt_number || '-'}</TableCell>
                      <TableCell>{getStatusBadge(payment.approval_status)}</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingPayment(payment)}
                            disabled={payment.approval_status === 'approved'}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setPaymentToDelete(payment.id);
                              setDeleteDialogOpen(true);
                            }}
                            disabled={payment.approval_status === 'approved'}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Payment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this payment record? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}