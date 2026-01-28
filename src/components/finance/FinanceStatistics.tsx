import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { DollarSign, Clock, CheckCircle, XCircle, TrendingUp } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface FinanceStats {
  total_payments: number;
  pending_payments: number;
  approved_payments: number;
  rejected_payments: number;
  total_amount_pending: number;
  total_amount_approved: number;
  total_amount_rejected: number;
  by_payment_method: Record<string, number>;
}

interface FinanceStatisticsProps {
  academicYear?: string;
  term?: string;
}

export default function FinanceStatistics({ academicYear, term }: FinanceStatisticsProps) {
  const [stats, setStats] = useState<FinanceStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStatistics();
  }, [academicYear, term]);

  const fetchStatistics = async () => {
    try {
      setLoading(true);
      
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      let url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/statistics`;
      const params = new URLSearchParams();
      if (academicYear) params.append('academic_year', academicYear);
      if (term) params.append('term', term);
      if (params.toString()) url += `?${params.toString()}`;

      console.log('[FinanceStatistics] 📊 Fetching statistics for:', academicYear, term);
      console.log('[FinanceStatistics] 📊 URL:', url);

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const data = await response.json();
      console.log('[FinanceStatistics] 📊 Response:', data);
      
      if (data.success) {
        setStats(data.statistics);
      }
    } catch (error) {
      console.error('Error fetching statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[...Array(4)].map((_, i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <div className="h-4 w-24 bg-gray-200 rounded animate-pulse"></div>
            </CardHeader>
            <CardContent>
              <div className="h-8 w-32 bg-gray-200 rounded animate-pulse"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Main Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Payments</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total_payments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All payment records
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Approval</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{stats.pending_payments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.total_amount_pending)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Approved</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.approved_payments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.total_amount_approved)}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rejected</CardTitle>
            <XCircle className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{stats.rejected_payments}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(stats.total_amount_rejected)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Payment Methods Breakdown */}
      {Object.keys(stats.by_payment_method).length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Payment Methods Breakdown</CardTitle>
            <CardDescription>Approved payments by payment method</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Object.entries(stats.by_payment_method).map(([method, amount]) => (
                <div key={method} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    <span className="capitalize">{method}</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}