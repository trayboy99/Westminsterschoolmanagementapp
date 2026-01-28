import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import {
  Eye,
  Loader2,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

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

interface FeeHistoryDialogProps {
  studentId: string;
  studentName: string;
  admissionNumber: string;
}

export function FeeHistoryDialog({
  studentId,
  studentName,
  admissionNumber,
}: FeeHistoryDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [feeHistory, setFeeHistory] = useState<FeeHistoryData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const supabase = createClient();

  const fetchFeeHistory = async () => {
    setLoading(true);
    setError(null);

    try {
      console.log('[FeeHistory] Fetching for student:', studentId);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Session expired. Please log in again.');
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/graduated-students/${studentId}/fee-history`;
      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || 'Failed to fetch'}`);
      }

      const data = await response.json();
      console.log('[FeeHistory] Response:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch fee history');
      }

      setFeeHistory(data);
    } catch (err) {
      console.error('[FeeHistory] Error:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch fee history';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !feeHistory) {
      fetchFeeHistory();
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
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm">
          <Eye className="h-4 w-4 mr-1" />
          View
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-green-600" />
            Fee Payment History
          </DialogTitle>
          <DialogDescription>
            Detailed fee payment history for {studentName} ({admissionNumber})
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600 mr-2" />
              <span className="text-slate-600">Loading fee history...</span>
            </div>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {!loading && feeHistory && (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg border bg-blue-50 border-blue-200">
                  <div className="text-sm text-blue-700 mb-1">Fee Period</div>
                  <div className="text-slate-900">
                    {feeHistory.firstRegisteredSession && feeHistory.firstRegisteredTerm ? (
                      <>
                        <strong>{feeHistory.firstRegisteredTerm}</strong>, {feeHistory.firstRegisteredSession}
                        <br />
                        <span className="text-sm">to Graduation</span>
                      </>
                    ) : (
                      <span className="text-sm text-slate-600">No records found</span>
                    )}
                  </div>
                </div>

                <div className="p-4 rounded-lg border bg-purple-50 border-purple-200">
                  <div className="text-sm text-purple-700 mb-1">Graduation Session</div>
                  <div className="text-slate-900">
                    <strong>{feeHistory.graduationSession}</strong>
                  </div>
                </div>

                <div className={`p-4 rounded-lg border ${feeHistory.isFullyCleared ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                  <div className={`text-sm mb-1 ${feeHistory.isFullyCleared ? 'text-green-700' : 'text-red-700'}`}>
                    Total Outstanding
                  </div>
                  <div className={`text-2xl ${feeHistory.isFullyCleared ? 'text-green-900' : 'text-red-900'}`}>
                    {formatCurrency(feeHistory.totalOutstanding)}
                  </div>
                  <div className="mt-2">
                    {feeHistory.isFullyCleared ? (
                      <Badge variant="outline" className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Fully Cleared
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                        <XCircle className="h-3 w-3 mr-1" />
                        Not Cleared
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Fee History Table */}
              {feeHistory.message ? (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{feeHistory.message}</AlertDescription>
                </Alert>
              ) : (
                <>
                  {!feeHistory.isFullyCleared && feeHistory.feeHistory.some(item => !item.isCleared) && (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="h-4 w-4 text-yellow-700" />
                      <AlertDescription className="text-yellow-800">
                        <strong>Outstanding Terms/Sessions:</strong>{' '}
                        {feeHistory.feeHistory
                          .filter(item => !item.isCleared)
                          .map(item => `${item.term}, ${item.session}`)
                          .join('; ')}
                      </AlertDescription>
                    </Alert>
                  )}

                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Session</TableHead>
                          <TableHead>Term</TableHead>
                          <TableHead className="text-right">Expected Fee</TableHead>
                          <TableHead className="text-right">Amount Paid</TableHead>
                          <TableHead className="text-right">Outstanding</TableHead>
                          <TableHead className="text-center">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {feeHistory.feeHistory.map((item, index) => (
                          <TableRow key={index} className={!item.isCleared ? 'bg-red-50' : ''}>
                            <TableCell>{item.session}</TableCell>
                            <TableCell>{item.term}</TableCell>
                            <TableCell className="text-right font-mono">
                              {formatCurrency(item.expectedFee)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-green-700">
                              {formatCurrency(item.totalPaid)}
                            </TableCell>
                            <TableCell className="text-right font-mono text-red-700">
                              {formatCurrency(item.outstanding)}
                            </TableCell>
                            <TableCell className="text-center">
                              {item.isCleared ? (
                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                                  <CheckCircle className="h-3 w-3 mr-1" />
                                  Cleared
                                </Badge>
                              ) : (
                                <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">
                                  <XCircle className="h-3 w-3 mr-1" />
                                  Owing
                                </Badge>
                              )}
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  {/* Summary Row */}
                  <div className="flex justify-end">
                    <div className="p-4 rounded-lg border bg-slate-50 w-full md:w-auto">
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <span className="text-slate-600">Total Expected:</span>
                          <div className="font-mono text-slate-900">
                            {formatCurrency(
                              feeHistory.feeHistory.reduce((sum, item) => sum + item.expectedFee, 0)
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-slate-600">Total Paid:</span>
                          <div className="font-mono text-green-700">
                            {formatCurrency(
                              feeHistory.feeHistory.reduce((sum, item) => sum + item.totalPaid, 0)
                            )}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-600">Total Outstanding:</span>
                          <div className="text-xl font-mono text-red-700">
                            {formatCurrency(feeHistory.totalOutstanding)}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
