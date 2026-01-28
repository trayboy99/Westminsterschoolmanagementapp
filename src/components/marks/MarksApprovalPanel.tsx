import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Textarea } from '../ui/textarea';
import { Alert, AlertDescription } from '../ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { 
  CheckCircle, 
  XCircle, 
  Eye, 
  Clock, 
  AlertTriangle,
  FileText,
  User,
  Calendar,
  Filter,
  Search,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../ui/collapsible';

interface StudentMark {
  student_id: string;
  student_name: string;
  // Midterm fields (if type === 'midterm')
  midterm_ca1?: number;
  midterm_ca2?: number;
  midterm_exam?: number;
  midterm_total?: number;
  // Terminal fields (if type === 'terminal')
  terminal_ca1?: number;
  terminal_ca2?: number;
  terminal_exam?: number;
  terminal_total?: number;
}

interface PendingApproval {
  id: string; // exam_id_subject_id_class_id_type
  exam_id: string;
  subject_id: string;
  class_id: string;
  type: 'midterm' | 'terminal'; // 🔥 NEW FIELD
  subject: string;
  class: string;
  teacher: string;
  teacherId: string;
  academicYear: string;
  term: string;
  exam: string;
  submittedAt: Date;
  status: 'pending_approval';
  studentCount: number;
  studentMarks: StudentMark[]; // ✅ NEW: Detailed student marks
}

interface MarksApprovalPanelProps {
  onApprove: (submissionId: string, comment?: string) => void;
  onReject: (submissionId: string, comment: string) => void;
  userRole: 'principal' | 'super_admin' | 'director' | 'it_admin';
}

export function MarksApprovalPanel({
  onApprove,
  onReject,
  userRole,
}: MarksApprovalPanelProps) {
  const [pendingApprovals, setPendingApprovals] = useState<PendingApproval[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedApproval, setSelectedApproval] = useState<PendingApproval | null>(null);
  const [rejectionComment, setRejectionComment] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'midterm' | 'terminal'>('all');
  const [expandedApproval, setExpandedApproval] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      console.log('[MarksApprovalPanel] Fetching pending approvals...');

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/marks/pending-approvals`,
        { headers }
      );

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      
      if (data.success) {
        console.log('[MarksApprovalPanel] ✅ Fetched approvals:', data.approvals);
        setPendingApprovals(data.approvals);
      } else {
        console.error('[MarksApprovalPanel] ❌ Error:', data.error);
        toast.error(data.error || 'Failed to fetch pending approvals');
      }
    } catch (error) {
      console.error('[MarksApprovalPanel] Error:', error);
      toast.error('Failed to fetch pending approvals');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (approvalId: string) => {
    try {
      console.log('[MarksApprovalPanel] 🔥 Approving:', approvalId);
      onApprove(approvalId);
      
      // Refresh the list after approval
      setTimeout(() => {
        fetchPendingApprovals();
      }, 1000);
    } catch (error) {
      console.error('[MarksApprovalPanel] Approve error:', error);
      toast.error('Failed to approve marks');
    }
  };

  const handleReject = async (approvalId: string) => {
    if (!rejectionComment.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      console.log('[MarksApprovalPanel] 🔥 Rejecting:', approvalId);
      onReject(approvalId, rejectionComment);
      setRejectionComment('');
      setSelectedApproval(null);
      
      // Refresh the list after rejection
      setTimeout(() => {
        fetchPendingApprovals();
      }, 1000);
    } catch (error) {
      console.error('[MarksApprovalPanel] Reject error:', error);
      toast.error('Failed to reject marks');
    }
  };

  const filteredApprovals = pendingApprovals.filter(approval => {
    if (activeTab === 'all') return true;
    return approval.type === activeTab;
  });

  const midtermCount = pendingApprovals.filter(a => a.type === 'midterm').length;
  const terminalCount = pendingApprovals.filter(a => a.type === 'terminal').length;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Marks Approval</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPendingApprovals}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
          <TabsList className="grid w-full grid-cols-3 mb-4">
            <TabsTrigger value="all">
              All <Badge variant="secondary" className="ml-2">{pendingApprovals.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="midterm">
              Midterm <Badge variant="secondary" className="ml-2">{midtermCount}</Badge>
            </TabsTrigger>
            <TabsTrigger value="terminal">
              Terminal <Badge variant="secondary" className="ml-2">{terminalCount}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-4">
            {loading && (
              <div className="text-center py-8 text-muted-foreground">
                Loading pending approvals...
              </div>
            )}

            {!loading && filteredApprovals.length === 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>
                  No pending {activeTab !== 'all' ? activeTab : ''} marks approvals at this time.
                </AlertDescription>
              </Alert>
            )}

            {!loading && filteredApprovals.map((approval) => (
              <Collapsible 
                key={approval.id} 
                open={expandedApproval === approval.id}
                onOpenChange={(open) => setExpandedApproval(open ? approval.id : null)}
              >
                <Card className="border-2">
                  <CardContent className="p-4">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2">
                          <Badge variant={approval.type === 'midterm' ? 'default' : 'secondary'}>
                            {approval.type === 'midterm' ? '📝 Midterm' : '📊 Terminal'}
                          </Badge>
                          <Badge variant="outline">
                            <Clock className="mr-1 h-3 w-3" />
                            Pending
                          </Badge>
                        </div>

                        <h3 className="font-semibold">
                          {approval.type === 'midterm' ? 'Midterm' : 'Terminal'} Score Approval - {approval.subject}
                        </h3>

                        <div className="grid grid-cols-2 gap-2 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span>{approval.teacher}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{approval.class}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <span>{approval.term} - {approval.academicYear}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <FileText className="h-3 w-3" />
                            <span>{approval.studentCount} students</span>
                          </div>
                        </div>

                        <div className="text-xs text-muted-foreground">
                          Submitted: {new Date(approval.submittedAt).toLocaleString()}
                        </div>

                        {/* View Marks Button */}
                        <CollapsibleTrigger asChild>
                          <Button 
                            variant="outline" 
                            size="sm"
                            className="mt-2"
                          >
                            {expandedApproval === approval.id ? (
                              <>
                                <ChevronUp className="mr-2 h-4 w-4" />
                                Hide Student Marks
                              </>
                            ) : (
                              <>
                                <ChevronDown className="mr-2 h-4 w-4" />
                                View Student Marks ({approval.studentCount})
                              </>
                            )}
                          </Button>
                        </CollapsibleTrigger>
                      </div>

                      <div className="flex flex-col sm:flex-row lg:flex-col gap-2 w-full lg:w-auto">
                        <Button
                          size="sm"
                          variant="default"
                          onClick={() => handleApprove(approval.id)}
                          className="w-full sm:w-auto lg:w-full"
                        >
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Approve
                        </Button>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setSelectedApproval(approval)}
                            >
                              <XCircle className="mr-2 h-4 w-4" />
                              Reject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Reject {approval.type === 'midterm' ? 'Midterm' : 'Terminal'} Marks</DialogTitle>
                              <DialogDescription>
                                Please provide a reason for rejecting these marks. The teacher will be notified.
                              </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Subject</label>
                                <p className="text-sm text-muted-foreground">{approval.subject}</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Class</label>
                                <p className="text-sm text-muted-foreground">{approval.class}</p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Type</label>
                                <p className="text-sm text-muted-foreground">
                                  {approval.type === 'midterm' ? 'Midterm Assessment' : 'Terminal Assessment'}
                                </p>
                              </div>
                              <div className="space-y-2">
                                <label className="text-sm font-medium">Rejection Reason *</label>
                                <Textarea
                                  value={rejectionComment}
                                  onChange={(e) => setRejectionComment(e.target.value)}
                                  placeholder="Enter reason for rejection..."
                                  rows={4}
                                />
                              </div>
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedApproval(null);
                                    setRejectionComment('');
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button
                                  variant="destructive"
                                  onClick={() => handleReject(approval.id)}
                                >
                                  Confirm Rejection
                                </Button>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </div>

                    {/* Expandable Student Marks Table */}
                    <CollapsibleContent className="mt-4">
                      <div className="overflow-x-auto -mx-4 px-4 sm:-mx-6 sm:px-6 md:mx-0 md:px-0">
                        <div className="border rounded-lg overflow-hidden min-w-[600px]">
                          <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead className="w-[50px]">#</TableHead>
                              <TableHead>Student Name</TableHead>
                              {approval.type === 'midterm' ? (
                                <>
                                  <TableHead className="text-right">CA1 (10)</TableHead>
                                  <TableHead className="text-right">CA2 (10)</TableHead>
                                  <TableHead className="text-right">Exam (20)</TableHead>
                                  <TableHead className="text-right">Total (40)</TableHead>
                                </>
                              ) : (
                                <>
                                  <TableHead className="text-right">CA1 (20)</TableHead>
                                  <TableHead className="text-right">CA2 (20)</TableHead>
                                  <TableHead className="text-right">Exam (60)</TableHead>
                                  <TableHead className="text-right">Total (100)</TableHead>
                                </>
                              )}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {approval.studentMarks && approval.studentMarks.length > 0 ? (
                              approval.studentMarks.map((mark, index) => (
                                <TableRow key={mark.student_id}>
                                  <TableCell className="text-muted-foreground">{index + 1}</TableCell>
                                  <TableCell>{mark.student_name}</TableCell>
                                  {approval.type === 'midterm' ? (
                                    <>
                                      <TableCell className="text-right">{mark.midterm_ca1 ?? '-'}</TableCell>
                                      <TableCell className="text-right">{mark.midterm_ca2 ?? '-'}</TableCell>
                                      <TableCell className="text-right">{mark.midterm_exam ?? '-'}</TableCell>
                                      <TableCell className="text-right">{mark.midterm_total ?? '-'}</TableCell>
                                    </>
                                  ) : (
                                    <>
                                      <TableCell className="text-right">{mark.terminal_ca1 ?? '-'}</TableCell>
                                      <TableCell className="text-right">{mark.terminal_ca2 ?? '-'}</TableCell>
                                      <TableCell className="text-right">{mark.terminal_exam ?? '-'}</TableCell>
                                      <TableCell className="text-right">{mark.terminal_total ?? '-'}</TableCell>
                                    </>
                                  )}
                                </TableRow>
                              ))
                            ) : (
                              <TableRow>
                                <TableCell colSpan={6} className="text-center text-muted-foreground">
                                  No student marks data available
                                </TableCell>
                              </TableRow>
                            )}
                          </TableBody>
                        </Table>
                        </div>
                      </div>
                    </CollapsibleContent>
                  </CardContent>
                </Card>
              </Collapsible>
            ))}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}