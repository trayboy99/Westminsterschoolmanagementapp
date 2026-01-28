import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { Download, Search, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface ClearanceRecord {
  student_id: string;
  student_name: string;
  class_name: string;
  total_paid: number;
  is_cleared: boolean;
  clearance_date: string | null;
}

interface ClearanceReportProps {
  academicYear?: string;
  term?: string;
}

export default function ClearanceReport({ academicYear, term }: ClearanceReportProps) {
  const [report, setReport] = useState<ClearanceRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [summary, setSummary] = useState({
    total_students: 0,
    cleared_students: 0,
    pending_students: 0,
    total_collected: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchReport();
  }, [academicYear, term, filterClass]);

  const fetchReport = async () => {
    try {
      setLoading(true);
      
      // Get auth token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('[ClearanceReport] No session token found');
        return;
      }

      let url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/clearance/report`;
      const params = new URLSearchParams();
      if (academicYear) params.append('academic_year', academicYear);
      if (term) params.append('term', term);
      if (filterClass) params.append('class_id', filterClass);
      if (params.toString()) url += `?${params.toString()}`;

      console.log('[ClearanceReport] Fetching report:', { academicYear, term, filterClass });

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        },
      });

      const data = await response.json();
      console.log('[ClearanceReport] Response:', data);
      
      if (data.success) {
        setReport(data.report || []);
        setSummary(data.summary || {
          total_students: 0,
          cleared_students: 0,
          pending_students: 0,
          total_collected: 0,
        });
      } else {
        console.error('[ClearanceReport] Error:', data.error);
        toast.error(data.error || 'Failed to load clearance report');
      }
    } catch (error) {
      console.error('[ClearanceReport] Error fetching report:', error);
      toast.error('Failed to load clearance report');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    try {
      const headers = ['Student Name', 'Class', 'Total Paid', 'Status', 'Clearance Date'];
      const csv = [
        headers.join(','),
        ...filteredReport.map(record => [
          record.student_name,
          record.class_name,
          record.total_paid,
          record.is_cleared ? 'Cleared' : 'Pending',
          record.clearance_date || 'N/A'
        ].join(','))
      ].join('\n');

      const blob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clearance_report_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);

      toast.success('Report exported successfully');
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export report');
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const filteredReport = report.filter(record => {
    const searchLower = searchTerm.toLowerCase();
    return (
      record.student_name.toLowerCase().includes(searchLower) ||
      record.class_name.toLowerCase().includes(searchLower)
    );
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Student Clearance Report</CardTitle>
        <CardDescription>
          Track payment status and clearance for students
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Cards */}
        <div className="grid gap-4 md:grid-cols-4">
          <div className="p-4 border rounded-lg">
            <div className="text-sm text-muted-foreground">Total Students</div>
            <div className="text-2xl font-bold mt-1">{summary.total_students}</div>
          </div>
          <div className="p-4 border rounded-lg bg-green-50">
            <div className="text-sm text-green-700">Cleared</div>
            <div className="text-2xl font-bold text-green-700 mt-1">
              {summary.cleared_students}
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-yellow-50">
            <div className="text-sm text-yellow-700">Pending</div>
            <div className="text-2xl font-bold text-yellow-700 mt-1">
              {summary.pending_students}
            </div>
          </div>
          <div className="p-4 border rounded-lg bg-blue-50">
            <div className="text-sm text-blue-700">Total Collected</div>
            <div className="text-2xl font-bold text-blue-700 mt-1">
              {formatCurrency(summary.total_collected)}
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by student name or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <Button onClick={handleExport} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>

        {/* Report Table */}
        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Total Paid</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Clearance Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredReport.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      No records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredReport.map((record) => {
                    return (
                      <TableRow key={record.student_id}>
                        <TableCell className="font-medium">
                          {record.student_name}
                        </TableCell>
                        <TableCell>{record.class_name}</TableCell>
                        <TableCell>{formatCurrency(record.total_paid)}</TableCell>
                        <TableCell>
                          {record.is_cleared ? (
                            <Badge className="bg-green-100 text-green-800">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Cleared
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="border-yellow-600 text-yellow-600">
                              <XCircle className="h-3 w-3 mr-1" />
                              Pending
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {record.clearance_date 
                            ? new Date(record.clearance_date).toLocaleDateString()
                            : '-'}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}