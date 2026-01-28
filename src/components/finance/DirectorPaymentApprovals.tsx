import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { toast } from '../ui/CustomToast';
import { CheckCircle, XCircle, Loader2, Eye, FileText, Download, ExternalLink, ArrowLeft, TrendingUp, Users, CreditCard, AlertCircle, Clock, Calendar } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import DirectorStudentPaymentsTable from './DirectorStudentPaymentsTable';

interface Payment {
  id: string;
  student: {
    first_name: string;
    last_name: string;
    class_id?: string;
  };
  academic_year: string;
  term: string;
  amount_paid: number;
  payment_date: string;
  payment_method: string;
  receipt_number: string;
  notes: string;
  entered_by_profile: {
    first_name: string;
    last_name: string;
  };
  created_at: string;
  part_payment_number?: number;
  student_type?: string;
  total_paid?: number;
  proof_of_payment_url?: string;
  balance?: number;
}

interface DirectorPaymentApprovalsProps {
  onBack?: () => void;
}

export default function DirectorPaymentApprovals({ onBack }: DirectorPaymentApprovalsProps = {}) {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectDialog, setShowRejectDialog] = useState(false);
  const [activeTab, setActiveTab] = useState<'approvals' | 'tracking'>('approvals');

  useEffect(() => {
    fetchPendingPayments();
  }, []);

  const fetchPendingPayments = async () => {
    try {
      setLoading(true);
      
      // Try localStorage first, then sessionStorage, then Supabase auth
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        // Fall back to Supabase client auth
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        console.log('[DirectorPayments] No auth token found');
        return;
      }

      console.log('[DirectorPayments] Fetching pending payments...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments?approval_status=pending`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
          },
        }
      );

      const data = await response.json();
      console.log('[DirectorPayments] Response:', data);
      
      if (data.success) {
        console.log('[DirectorPayments] Found payments:', data.payments?.length || 0);
        
        // Log calculation details for each payment
        data.payments?.forEach((payment: any) => {
          const totalAfterApproval = (payment.total_paid || 0) + (payment.amount_paid || 0);
          const balanceAfterApproval = (payment.balance || 0) - (payment.amount_paid || 0);
          console.log(`[DirectorPayments] Payment ${payment.id}:`, {
            student: `${payment.student?.first_name} ${payment.student?.last_name}`,
            amount_paid: payment.amount_paid,
            total_paid_approved_only: payment.total_paid,
            total_after_this_approval: totalAfterApproval,
            total_paid: payment.total_paid,
            proof_of_payment_url: payment.proof_of_payment_url ? 'YES ✅' : 'NO ❌'
          });
        });
        
        setPayments(data.payments || []);
      } else {
        console.error('[DirectorPayments] Error:', data.error);
      }
    } catch (error) {
      console.error('[DirectorPayments] Error fetching payments:', error);
      toast.error('Failed to load pending payments');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (paymentId: string) => {
    try {
      setProcessingId(paymentId);
      
      // Get auth token using same method as fetchPendingPayments
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/${paymentId}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ action: 'approve' }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Payment approved successfully');
        fetchPendingPayments();
      } else {
        toast.error(data.error || 'Failed to approve payment');
      }
    } catch (error) {
      console.error('Error approving payment:', error);
      toast.error('An error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!selectedPayment || !rejectionReason.trim()) {
      toast.error('Please provide a rejection reason');
      return;
    }

    try {
      setProcessingId(selectedPayment.id);
      
      // Get auth token using same method
      let token = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!token) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        token = session?.access_token || null;
      }
      
      if (!token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/${selectedPayment.id}/approve`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            action: 'reject',
            rejection_reason: rejectionReason,
          }),
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Payment rejected');
        setShowRejectDialog(false);
        setSelectedPayment(null);
        setRejectionReason('');
        fetchPendingPayments();
      } else {
        toast.error(data.error || 'Failed to reject payment');
      }
    } catch (error) {
      console.error('Error rejecting payment:', error);
      toast.error('An error occurred');
    } finally {
      setProcessingId(null);
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

  return (
    <>
      {/* Mobile App-Style Container */}
      <div className="min-h-screen bg-slate-50 pb-6 -mx-4 md:mx-0">
        {/* Back Button */}
        {onBack && (
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-4 py-3 shadow-sm">
            <Button variant="ghost" onClick={onBack} className="gap-2 hover:bg-slate-100">
              <ArrowLeft className="h-4 w-4" />
              <span className="font-medium">Back</span>
            </Button>
          </div>
        )}

        {/* Custom Tab Navigation */}
        <div className="px-4 pt-4 pb-2 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => setActiveTab('approvals')}
              className={`relative px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border ${
                activeTab === 'approvals'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <AlertCircle className="h-4 w-4" />
                <span>Pending Approvals</span>
                {payments.length > 0 && (
                  <Badge className="ml-1 bg-rose-600 hover:bg-rose-700 text-white px-1.5 py-0.5 text-xs">
                    {payments.length}
                  </Badge>
                )}
              </div>
            </button>
            
            <button
              onClick={() => setActiveTab('tracking')}
              className={`relative px-4 py-3 rounded-lg font-semibold text-sm transition-all duration-200 border ${
                activeTab === 'tracking'
                  ? 'bg-slate-900 text-white border-slate-900 shadow-sm'
                  : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-center gap-2">
                <TrendingUp className="h-4 w-4" />
                <span>Payment Tracking</span>
              </div>
            </button>
          </div>
        </div>

        {/* Pending Approvals Tab */}
        {activeTab === 'approvals' && (
          <div className="px-4 space-y-4">
            {loading ? (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-10 w-10 animate-spin text-slate-600" />
              </div>
            ) : payments.length === 0 ? (
              <Card className="mt-4 border border-slate-200 shadow-sm">
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-2">All Clear!</h3>
                  <p className="text-slate-500">No pending payments to review</p>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Summary Stats */}
                <div className="grid grid-cols-2 gap-3 mt-2">
                  <Card className="border border-indigo-200 shadow-sm bg-indigo-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-indigo-100 flex items-center justify-center">
                          <CreditCard className="h-5 w-5 text-indigo-700" />
                        </div>
                        <div>
                          <p className="text-xs text-indigo-700 font-medium">Total Pending</p>
                          <p className="text-xl font-bold text-indigo-900">
                            {formatCurrency(payments.reduce((sum, p) => sum + p.amount_paid, 0))}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="border border-slate-200 shadow-sm bg-slate-50">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-slate-200 flex items-center justify-center">
                          <Clock className="h-5 w-5 text-slate-700" />
                        </div>
                        <div>
                          <p className="text-xs text-slate-700 font-medium">Awaiting Review</p>
                          <p className="text-xl font-bold text-slate-900">{payments.length}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Payment Cards */}
                <div className="space-y-3">
                  {payments.map((payment) => (
                    <Card 
                      key={payment.id} 
                      className="border border-slate-200 shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden"
                    >
                      <CardContent className="p-0">
                        {/* Card Header */}
                        <div className="bg-slate-800 p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div className="flex-1">
                              <h3 className="font-semibold text-white text-base">
                                {payment.student?.first_name} {payment.student?.last_name}
                              </h3>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge 
                                  variant="secondary"
                                  className="text-xs bg-white/20 text-white border-0 hover:bg-white/30"
                                >
                                  {payment.student_type === 'boarding' ? 'Boarding' : 'Day'}
                                </Badge>
                                {payment.part_payment_number && (
                                  <Badge variant="secondary" className="text-xs bg-white/20 text-white border-0 hover:bg-white/30">
                                    {payment.part_payment_number}
                                    {payment.part_payment_number === 1 ? 'st' : payment.part_payment_number === 2 ? 'nd' : payment.part_payment_number === 3 ? 'rd' : 'th'} Part
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-white">
                                {formatCurrency(payment.amount_paid)}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-4 space-y-3 bg-white">
                          {/* Details Grid */}
                          <div className="grid grid-cols-2 gap-3">
                            <div className="space-y-1">
                              <p className="text-xs text-slate-600 font-medium">Academic Period</p>
                              <p className="text-sm font-semibold text-slate-900">{payment.academic_year}</p>
                              <p className="text-xs text-slate-600">{payment.term}</p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-600 font-medium">Payment Date</p>
                              <div className="flex items-center gap-1.5">
                                <Calendar className="h-3.5 w-3.5 text-slate-400" />
                                <p className="text-sm font-semibold text-slate-900">
                                  {new Date(payment.payment_date).toLocaleDateString('en-US', { 
                                    month: 'short', 
                                    day: 'numeric',
                                    year: 'numeric'
                                  })}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Payment Info */}
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
                            <div className="space-y-1">
                              <p className="text-xs text-slate-600 font-medium">Method</p>
                              <p className="text-sm font-semibold text-slate-900 capitalize">
                                {payment.payment_method.replace('_', ' ')}
                              </p>
                            </div>
                            <div className="space-y-1">
                              <p className="text-xs text-slate-600 font-medium">Total After Approval</p>
                              <p className="text-sm font-bold text-emerald-700">
                                {formatCurrency((payment.total_paid || 0) + (payment.amount_paid || 0))}
                              </p>
                            </div>
                          </div>

                          {/* Balance Info */}
                          {payment.balance !== undefined && (
                            <div className="rounded-lg bg-slate-50 border border-slate-200 p-3">
                              <div className="flex items-center justify-between">
                                <span className="text-xs font-medium text-slate-700">Balance After</span>
                                <span className={`text-sm font-bold ${
                                  ((payment.balance || 0) - (payment.amount_paid || 0)) > 0 
                                    ? 'text-rose-700' 
                                    : 'text-emerald-700'
                                }`}>
                                  {formatCurrency(Math.abs((payment.balance || 0) - (payment.amount_paid || 0)))}
                                  {((payment.balance || 0) - (payment.amount_paid || 0)) < 0 && ' (Overpaid)'}
                                </span>
                              </div>
                            </div>
                          )}

                          {/* Proof of Payment */}
                          {payment.proof_of_payment_url && (
                            <div className="pt-2">
                              <div className="flex items-center gap-2 text-xs text-slate-600 mb-2">
                                <FileText className="h-3.5 w-3.5" />
                                <span className="font-medium">Proof Attached</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => window.open(payment.proof_of_payment_url, '_blank')}
                                  className="flex-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                  <Eye className="h-3 w-3 mr-1" />
                                  View
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const link = document.createElement('a');
                                    link.href = payment.proof_of_payment_url!;
                                    link.download = `payment_proof_${payment.id}.png`;
                                    link.click();
                                  }}
                                  className="flex-1 text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                                >
                                  <Download className="h-3 w-3 mr-1" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          )}

                          {/* Entered By */}
                          <div className="text-xs text-slate-500 pt-2 border-t border-slate-100">
                            Entered by: <span className="font-medium text-slate-700">
                              {payment.entered_by_profile?.first_name} {payment.entered_by_profile?.last_name}
                            </span>
                          </div>

                          {/* Action Buttons */}
                          <div className="grid grid-cols-3 gap-2 pt-3">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setSelectedPayment(payment)}
                              className="text-xs border-slate-200 text-slate-700 hover:bg-slate-50"
                              disabled={processingId === payment.id}
                            >
                              <Eye className="h-3.5 w-3.5 mr-1" />
                              Details
                            </Button>
                            <Button
                              size="sm"
                              onClick={() => handleApprove(payment.id)}
                              disabled={processingId === payment.id}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs shadow-sm"
                            >
                              {processingId === payment.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <>
                                  <CheckCircle className="h-3.5 w-3.5 mr-1" />
                                  Approve
                                </>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => {
                                setSelectedPayment(payment);
                                setShowRejectDialog(true);
                              }}
                              disabled={processingId === payment.id}
                              className="text-xs shadow-sm bg-rose-600 hover:bg-rose-700"
                            >
                              <XCircle className="h-3.5 w-3.5 mr-1" />
                              Reject
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Student Payment Tracking Tab */}
        {activeTab === 'tracking' && (
          <div className="px-4">
            <DirectorStudentPaymentsTable />
          </div>
        )}
      </div>

      {/* Payment Details Dialog */}
      <Dialog open={!!selectedPayment && !showRejectDialog} onOpenChange={() => setSelectedPayment(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
            <DialogDescription>Review complete payment information</DialogDescription>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Student</p>
                  <p className="text-sm font-semibold">{selectedPayment.student?.first_name} {selectedPayment.student?.last_name}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Amount</p>
                  <p className="text-sm font-semibold">{formatCurrency(selectedPayment.amount_paid)}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Academic Year</p>
                  <p className="text-sm font-semibold">{selectedPayment.academic_year}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Term</p>
                  <p className="text-sm font-semibold">{selectedPayment.term}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Payment Date</p>
                  <p className="text-sm font-semibold">{new Date(selectedPayment.payment_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Payment Method</p>
                  <p className="text-sm font-semibold capitalize">{selectedPayment.payment_method.replace('_', ' ')}</p>
                </div>
              </div>
              
              {selectedPayment.receipt_number && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Receipt Number</p>
                  <p className="text-sm font-semibold">{selectedPayment.receipt_number}</p>
                </div>
              )}
              
              {selectedPayment.notes && (
                <div>
                  <p className="text-xs font-medium text-slate-500 mb-1">Notes</p>
                  <p className="text-sm text-slate-700">{selectedPayment.notes}</p>
                </div>
              )}
              
              <div>
                <p className="text-xs font-medium text-slate-500 mb-1">Entered By</p>
                <p className="text-sm font-semibold">{selectedPayment.entered_by_profile?.first_name} {selectedPayment.entered_by_profile?.last_name}</p>
              </div>
              
              {/* Proof of Payment Section */}
              {selectedPayment.proof_of_payment_url && (
                <div className="border-t pt-4">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-semibold">Proof of Payment</p>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(selectedPayment.proof_of_payment_url, '_blank')}
                      >
                        <ExternalLink className="h-4 w-4 mr-1" />
                        Open
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const link = document.createElement('a');
                          link.href = selectedPayment.proof_of_payment_url!;
                          link.download = `payment_proof_${selectedPayment.id}.png`;
                          link.click();
                        }}
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </Button>
                    </div>
                  </div>
                  <div className="border rounded-lg overflow-hidden bg-slate-50">
                    <img 
                      src={selectedPayment.proof_of_payment_url} 
                      alt="Proof of Payment"
                      className="w-full h-auto object-contain max-h-96"
                      onError={(e) => {
                        const target = e.target as HTMLImageElement;
                        target.style.display = 'none';
                        const parent = target.parentElement;
                        if (parent) {
                          parent.innerHTML = '<div class="p-8 text-center text-slate-500"><svg class="h-12 w-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg><p>Unable to load image preview</p><p class="text-xs mt-1">Click "Open" to view in new tab</p></div>';
                        }
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Rejection Dialog */}
      <Dialog open={showRejectDialog} onOpenChange={setShowRejectDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Payment</DialogTitle>
            <DialogDescription>
              Please provide a reason for rejecting this payment
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Textarea
              placeholder="Enter rejection reason..."
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              rows={4}
            />
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => {
                  setShowRejectDialog(false);
                  setRejectionReason('');
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim() || !!processingId}
                className="bg-rose-600 hover:bg-rose-700"
              >
                {processingId ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Rejecting...
                  </>
                ) : (
                  'Reject Payment'
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
