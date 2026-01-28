import { useState, useEffect } from 'react';
import { CheckCircle, XCircle, Loader2, Eye } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';

interface Payment {
  payment_id: string;
  student_id: string;
  student_name: string;
  student_type: 'Day' | 'Boarding';
  class_name: string;
  academic_session: string;
  academic_term: string;
  amount_paid: number;
  part_payment_number: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  notes: string;
  status: 'pending' | 'approved' | 'rejected';
  total_paid: number;
  is_cleared: boolean;
  entered_by_name: string;
  created_at: string;
}

export default function DirectorPaymentApprovalsTable() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [actionType, setActionType] = useState<'approve' | 'reject' | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments?status=pending`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setPayments(data.payments || []);
      } else {
        toast.error(data.error || 'Failed to fetch payments');
      }
    } catch (error) {
      console.error('Error fetching payments:', error);
      toast.error('Failed to load payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReject = async () => {
    if (!selectedPayment || !actionType) return;

    if (actionType === 'reject' && !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    setProcessing(true);

    try {
      const token = localStorage.getItem('auth_token');
      if (!token) {
        toast.error('No authentication token found');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/${selectedPayment.payment_id}/${actionType}`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            rejection_reason: actionType === 'reject' ? rejectionReason : undefined,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(
          actionType === 'approve' 
            ? 'Payment approved successfully' 
            : 'Payment rejected successfully'
        );
        fetchPayments(); // Refresh list
        setSelectedPayment(null);
        setActionType(null);
        setRejectionReason('');
      } else {
        toast.error(data.error || `Failed to ${actionType} payment`);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing payment:`, error);
      toast.error(`Failed to ${actionType} payment`);
    } finally {
      setProcessing(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-NG', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (payments.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        No pending payments for approval
      </div>
    );
  }

  return (
    <>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Student</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Session/Term</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Part #</TableHead>
              <TableHead>Total Paid</TableHead>
              <TableHead>Outstanding</TableHead>
              <TableHead>Clearance</TableHead>
              <TableHead>Date</TableHead>
              <TableHead>Method</TableHead>
              <TableHead>Entered By</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {payments.map((payment) => (
              <TableRow key={payment.payment_id}>
                <TableCell className="font-medium">
                  {payment.student_name}
                </TableCell>
                <TableCell>
                  <Badge variant={payment.student_type === 'Day' ? 'default' : 'secondary'}>
                    {payment.student_type}
                  </Badge>
                </TableCell>
                <TableCell>{payment.class_name || 'N/A'}</TableCell>
                <TableCell className="text-sm">
                  <div>{payment.academic_session}</div>
                  <div className="text-muted-foreground">{payment.academic_term}</div>
                </TableCell>
                <TableCell className="font-semibold">
                  {formatCurrency(payment.amount_paid)}
                </TableCell>
                <TableCell>
                  <Badge variant="outline">
                    Part {payment.part_payment_number}
                  </Badge>
                </TableCell>
                <TableCell>
                  {formatCurrency(payment.total_paid + payment.amount_paid)}
                </TableCell>
                <TableCell className="font-medium">
                  {formatCurrency(payment.outstanding_balance - payment.amount_paid)}
                </TableCell>
                <TableCell>
                  {payment.outstanding_balance - payment.amount_paid <= 0 ? (
                    <Badge className="bg-green-500">Cleared</Badge>
                  ) : (
                    <Badge variant="destructive">Not Cleared</Badge>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {formatDate(payment.payment_date)}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary">{payment.payment_method}</Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {payment.entered_by_name}
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button
                    size="sm"
                    variant="default"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setActionType('approve');
                    }}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Approve
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      setSelectedPayment(payment);
                      setActionType('reject');
                    }}
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Confirmation Dialog */}
      <Dialog 
        open={!!selectedPayment && !!actionType} 
        onOpenChange={(open) => {
          if (!open) {
            setSelectedPayment(null);
            setActionType(null);
            setRejectionReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </DialogTitle>
            <DialogDescription>
              {selectedPayment && (
                <div className="space-y-2 mt-4">
                  <div>
                    <span className="font-medium">Student:</span> {selectedPayment.student_name}
                  </div>
                  <div>
                    <span className="font-medium">Type:</span> {selectedPayment.student_type}
                  </div>
                  <div>
                    <span className="font-medium">Amount:</span> {formatCurrency(selectedPayment.amount_paid)}
                  </div>
                  <div>
                    <span className="font-medium">Part Payment:</span> Part {selectedPayment.part_payment_number}
                  </div>
                  <div>
                    <span className="font-medium">Session/Term:</span> {selectedPayment.academic_session} - {selectedPayment.academic_term}
                  </div>
                  <div>
                    <span className="font-medium">Method:</span> {selectedPayment.payment_method}
                  </div>
                  {selectedPayment.receipt_number && (
                    <div>
                      <span className="font-medium">Receipt:</span> {selectedPayment.receipt_number}
                    </div>
                  )}
                  {selectedPayment.notes && (
                    <div>
                      <span className="font-medium">Notes:</span> {selectedPayment.notes}
                    </div>
                  )}
                </div>
              )}
            </DialogDescription>
          </DialogHeader>

          {actionType === 'reject' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Rejection Reason <span className="text-red-500">*</span>
              </label>
              <Textarea
                placeholder="Please provide a reason for rejection..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={3}
              />
            </div>
          )}

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setSelectedPayment(null);
                setActionType(null);
                setRejectionReason('');
              }}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              onClick={handleApproveReject}
              disabled={processing}
              className={actionType === 'approve' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={actionType === 'reject' ? 'destructive' : 'default'}
            >
              {processing ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              {actionType === 'approve' ? 'Approve Payment' : 'Reject Payment'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
