import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '../ui/alert-dialog';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { toast } from 'sonner@2.0.3';
import { Search, Plus, Key, Calendar, User, Loader2, Award, Info, DollarSign, CheckCircle2, XCircle, AlertCircle, Copy, TrendingUp } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { FeeHistoryDialog } from '../FeeHistoryDialog';

const supabase = createClient();

interface GraduatedStudent {
  id: string;
  student_id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  graduation_session: string;
  graduation_class: string;
  date_of_birth?: string;
  email?: string;
  phone?: string;
  gender?: string;
  fees_clearance_remark?: string;
  fees_clearance_verified_by?: string;
  fees_clearance_verified_on?: string;
  graduated_by?: string;
}

interface TranscriptPin {
  id: string;
  pin_code: string;
  graduated_student_id: string;
  price: number;
  payment_reference?: string;
  is_used: boolean;
  used_at?: string;
  expires_at?: string;
  created_at: string;
  graduated_students?: GraduatedStudent;
}

interface TranscriptStats {
  total_alumni: number;
  active_alumni: number;
  alumni_fees_cleared: number;
  alumni_fees_pending: number;
  total_pins_generated: number;
  total_pins_used: number;
  total_transcripts_issued: number;
  total_revenue: number;
}

export function TranscriptPinManagement() {
  const [graduatedStudents, setGraduatedStudents] = useState<GraduatedStudent[]>([]);
  const [pins, setPins] = useState<TranscriptPin[]>([]);
  const [filteredPins, setFilteredPins] = useState<TranscriptPin[]>([]);
  const [stats, setStats] = useState<TranscriptStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'expired' | 'used'>('all');
  const [filterFeesStatus, setFilterFeesStatus] = useState<'all' | 'cleared' | 'pending'>('all');
  
  // Create PIN form states
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<string>('');
  const [pinPrice, setPinPrice] = useState('5000');
  const [paymentReference, setPaymentReference] = useState('');
  const [expiryDays, setExpiryDays] = useState('90');
  const [creating, setCreating] = useState(false);

  // Student details dialog
  const [showStudentDialog, setShowStudentDialog] = useState(false);
  const [selectedStudentDetails, setSelectedStudentDetails] = useState<GraduatedStudent | null>(null);

  // Generated PIN dialog
  const [showPinDialog, setShowPinDialog] = useState(false);
  const [generatedPin, setGeneratedPin] = useState<TranscriptPin | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    filterPins();
  }, [pins, searchTerm, filterStatus, filterFeesStatus]);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchGraduatedStudents(),
        fetchTranscriptPins(),
        fetchTranscriptStats()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchGraduatedStudents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/graduated-students`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();
      if (data.success && data.students) {
        setGraduatedStudents(data.students);
        console.log(`[TranscriptPins] Loaded ${data.students.length} graduated students`);
      } else {
        console.error('Failed to fetch graduated students:', data.error);
      }
    } catch (error) {
      console.error('Error fetching graduated students:', error);
    }
  };

  const fetchTranscriptPins = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transcript-pins`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();
      if (data.success && data.pins) {
        setPins(data.pins);
        console.log(`[TranscriptPins] Loaded ${data.pins.length} PINs`);
      } else {
        console.error('Failed to fetch transcript pins:', data.error);
      }
    } catch (error) {
      console.error('Error fetching transcript pins:', error);
    }
  };

  const fetchTranscriptStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.error('No session found');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transcript-stats`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await response.json();
      if (data.success && data.stats) {
        setStats(data.stats);
        console.log('[TranscriptPins] Stats:', data.stats);
      } else {
        console.error('Failed to fetch transcript stats:', data.error);
      }
    } catch (error) {
      console.error('Error fetching transcript stats:', error);
    }
  };

  const filterPins = () => {
    let filtered = pins;

    // Filter by PIN status
    if (filterStatus !== 'all') {
      filtered = filtered.filter(pin => {
        const isExpired = pin.expires_at && new Date(pin.expires_at) < new Date();
        
        if (filterStatus === 'used') return pin.is_used;
        if (filterStatus === 'expired') return isExpired && !pin.is_used;
        if (filterStatus === 'active') return !pin.is_used && !isExpired;
        return true;
      });
    }

    // Filter by fees clearance status
    if (filterFeesStatus !== 'all') {
      filtered = filtered.filter(pin => {
        const student = pin.graduated_students;
        if (!student) return false;
        
        if (filterFeesStatus === 'cleared') return !!student.fees_clearance_verified_on;
        if (filterFeesStatus === 'pending') return !student.fees_clearance_verified_on;
        return true;
      });
    }

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(pin => {
        const student = pin.graduated_students;
        if (!student) return false;

        const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase();
        return (
          fullName.includes(term) ||
          pin.pin_code.toLowerCase().includes(term) ||
          student.graduation_session.toLowerCase().includes(term)
        );
      });
    }

    setFilteredPins(filtered);
  };

  const handleCreatePin = async () => {
    if (!selectedStudent) {
      toast.error('Please select a graduated student');
      return;
    }

    const student = graduatedStudents.find(s => s.id === selectedStudent);
    if (!student) {
      toast.error('Student not found');
      return;
    }

    // Check fees clearance
    if (!student.fees_clearance_verified_on) {
      if (!confirm(
        `⚠️ FEES CLEARANCE WARNING\n\n` +
        `Student: ${student.first_name} ${student.last_name}\n` +
        `This student's fees clearance has not been verified.\n\n` +
        `Generate PIN anyway?`
      )) {
        return;
      }
    }

    setCreating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transcript-pins`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            graduated_student_id: selectedStudent,
            price: parseFloat(pinPrice),
            payment_reference: paymentReference || undefined,
            expires_in_days: parseInt(expiryDays)
          })
        }
      );

      const data = await response.json();
      
      if (data.success && data.pin) {
        toast.success('Transcript PIN generated successfully!');
        
        // Show the generated PIN in a dialog
        setGeneratedPin(data.pin);
        setShowPinDialog(true);
        
        // Refresh data
        await fetchTranscriptPins();
        await fetchTranscriptStats();
        
        // Reset form
        setShowCreateDialog(false);
        resetCreateForm();
      } else {
        toast.error(data.error || 'Failed to generate PIN');
      }
    } catch (error) {
      console.error('Error creating transcript PIN:', error);
      toast.error('Failed to generate PIN');
    } finally {
      setCreating(false);
    }
  };

  const resetCreateForm = () => {
    setSelectedStudent('');
    setPinPrice('5000');
    setPaymentReference('');
    setExpiryDays('90');
  };

  const handleViewStudent = (student: GraduatedStudent) => {
    setSelectedStudentDetails(student);
    setShowStudentDialog(true);
  };

  const copyToClipboard = async (text: string) => {
    try {
      // Try modern Clipboard API first
      await navigator.clipboard.writeText(text);
      toast.success('Copied to clipboard!');
    } catch (error) {
      // Fallback to legacy method if Clipboard API is blocked
      try {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          toast.success('Copied to clipboard!');
        } else {
          throw new Error('Copy command failed');
        }
      } catch (fallbackError) {
        console.error('[Clipboard] Error copying:', error);
        toast.error('Failed to copy to clipboard. Please copy manually.');
      }
    }
  };

  const getFullName = (student: GraduatedStudent) => {
    return `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim();
  };

  const isExpired = (expiresAt?: string) => {
    if (!expiresAt) return false;
    return new Date(expiresAt) < new Date();
  };

  const getPinStatus = (pin: TranscriptPin) => {
    if (pin.is_used) return 'used';
    if (isExpired(pin.expires_at)) return 'expired';
    return 'active';
  };

  const getPinStatusBadge = (pin: TranscriptPin) => {
    const status = getPinStatus(pin);
    
    if (status === 'used') {
      return <Badge variant="secondary" className="bg-gray-500 text-white">Used</Badge>;
    }
    if (status === 'expired') {
      return <Badge variant="destructive">Expired</Badge>;
    }
    return <Badge className="bg-green-600">Active</Badge>;
  };

  const getFeesStatusBadge = (student?: GraduatedStudent) => {
    if (!student) return null;
    
    if (!student.fees_clearance_required) {
      return <Badge variant="outline" className="border-blue-500 text-blue-700">No Clearance Required</Badge>;
    }
    
    if (student.fees_cleared) {
      return (
        <Badge className="bg-green-600 flex items-center gap-1">
          <CheckCircle2 className="h-3 w-3" />
          Cleared
        </Badge>
      );
    }
    
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <XCircle className="h-3 w-3" />
        ₦{student.outstanding_balance.toLocaleString()} Pending
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-medium text-blue-900">About Transcript PINs</h3>
            <p className="text-sm text-blue-700 mt-1">
              Transcript PINs allow graduated students (alumni) to access their complete academic records. 
              These are different from regular result PINs. Generated PINs are single-use and can have expiry dates.
            </p>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Alumni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl">{stats?.total_alumni || 0}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats?.active_alumni || 0} active
                </p>
              </div>
              <User className="h-8 w-8 text-blue-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Fees Clearance</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl text-green-600">{stats?.alumni_fees_cleared || 0}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats?.alumni_fees_pending || 0} pending
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">PINs Generated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl">{stats?.total_pins_generated || 0}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats?.total_pins_used || 0} used
                </p>
              </div>
              <Key className="h-8 w-8 text-purple-600 opacity-20" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-2xl">₦{(stats?.total_revenue || 0).toLocaleString()}</div>
                <p className="text-xs text-slate-500 mt-1">
                  {stats?.total_transcripts_issued || 0} transcripts issued
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600 opacity-20" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Actions */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"
              placeholder="Search by student name, PIN code, admission number, class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button onClick={() => setShowCreateDialog(true)} className="shrink-0">
            <Plus className="h-4 w-4 mr-2" />
            Generate New PIN
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="PIN Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All PINs</SelectItem>
              <SelectItem value="active">Active Only</SelectItem>
              <SelectItem value="used">Used Only</SelectItem>
              <SelectItem value="expired">Expired Only</SelectItem>
            </SelectContent>
          </Select>

          <Select value={filterFeesStatus} onValueChange={(value: any) => setFilterFeesStatus(value)}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Fees Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Students</SelectItem>
              <SelectItem value="cleared">Fees Cleared</SelectItem>
              <SelectItem value="pending">Fees Pending</SelectItem>
            </SelectContent>
          </Select>

          <div className="text-sm text-slate-600 flex items-center">
            Showing {filteredPins.length} of {pins.length} PINs
          </div>
        </div>
      </div>

      {/* Pins Table */}
      <Card>
        <CardHeader>
          <CardTitle>Transcript PINs</CardTitle>
          <CardDescription>
            Manage transcript access PINs for graduated students. Single-use PINs with optional expiry dates.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student</TableHead>
                  <TableHead className="hidden md:table-cell">Graduation</TableHead>
                  <TableHead>PIN Code</TableHead>
                  <TableHead className="hidden lg:table-cell">Price</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden xl:table-cell">Fees</TableHead>
                  <TableHead className="hidden lg:table-cell">Created</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPins.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center text-slate-500 py-8">
                      {pins.length === 0 
                        ? 'No transcript PINs generated yet' 
                        : 'No PINs match your filters'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredPins.map((pin) => {
                    const student = pin.graduated_students;
                    if (!student) return null;

                    return (
                      <TableRow key={pin.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{getFullName(student)}</p>
                            <p className="text-sm text-slate-500">
                              {student.admission_number || 'N/A'}
                            </p>
                            <p className="text-xs text-slate-500 md:hidden">
                              {student.graduation_class} • {student.graduation_session}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <div className="text-sm">
                            <div className="font-medium">{student.graduation_class}</div>
                            <div className="text-slate-500">{student.graduation_session}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <code className="text-xs bg-slate-100 px-2 py-1 rounded font-mono">
                              {pin.pin_code}
                            </code>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(pin.pin_code)}
                              className="h-6 w-6 p-0"
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-sm">₦{pin.price.toLocaleString()}</span>
                        </TableCell>
                        <TableCell>
                          {getPinStatusBadge(pin)}
                          {pin.is_used && pin.used_at && (
                            <div className="text-xs text-slate-500 mt-1">
                              {new Date(pin.used_at).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex items-center gap-2">
                            {getFeesStatusBadge(student)}
                            {student.fees_clearance_required && !student.fees_cleared && (
                              <FeeHistoryDialog
                                studentId={student.id}
                                studentName={getFullName(student)}
                                admissionNumber={student.admission_number || ''}
                              />
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="text-sm">
                            <div>{new Date(pin.created_at).toLocaleDateString()}</div>
                            {pin.expires_at && (
                              <div className="text-xs text-slate-500">
                                Expires: {new Date(pin.expires_at).toLocaleDateString()}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleViewStudent(student)}
                            >
                              View
                            </Button>
                            {student.fees_clearance_required && !student.fees_cleared && (
                              <FeeHistoryDialog
                                studentId={student.id}
                                studentName={getFullName(student)}
                                admissionNumber={student.admission_number || ''}
                              />
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Create PIN Dialog */}
      <AlertDialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <AlertDialogContent className="max-w-md max-h-[90vh] flex flex-col">
          <AlertDialogHeader>
            <AlertDialogTitle>Generate Transcript PIN</AlertDialogTitle>
            <AlertDialogDescription>
              Create a new transcript PIN for a graduated student. The PIN will be single-use and can have an expiry date.
            </AlertDialogDescription>
          </AlertDialogHeader>
          
          <div className="space-y-4 py-4 overflow-y-auto flex-1">
            <div>
              <label className="text-sm font-medium mb-2 block">
                Select Graduated Student <span className="text-red-500">*</span>
              </label>
              <Select value={selectedStudent} onValueChange={setSelectedStudent}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a graduated student" />
                </SelectTrigger>
                <SelectContent>
                  {graduatedStudents.length === 0 ? (
                    <div className="p-2 text-sm text-slate-500 text-center">
                      No graduated students found
                    </div>
                  ) : (
                    graduatedStudents.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        <div className="flex items-center justify-between gap-2">
                          <span>{getFullName(student)}</span>
                          {!student.fees_cleared && student.fees_clearance_required && (
                            <AlertCircle className="h-3 w-3 text-orange-500" />
                          )}
                        </div>
                        <div className="text-xs text-slate-500">
                          {student.graduation_class} • {student.graduation_session}
                        </div>
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              {selectedStudent && (() => {
                const student = graduatedStudents.find(s => s.id === selectedStudent);
                if (student && !student.fees_cleared && student.fees_clearance_required) {
                  return (
                    <div className="mt-2 p-2 bg-orange-50 border border-orange-200 rounded text-xs text-orange-700 flex items-start gap-2">
                      <AlertCircle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium">Fees Clearance Pending</p>
                        <p>Outstanding: ₦{student.outstanding_balance.toLocaleString()}</p>
                      </div>
                    </div>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                PIN Price (₦) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="100"
                value={pinPrice}
                onChange={(e) => setPinPrice(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Amount charged for this transcript PIN
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                Payment Reference (Optional)
              </label>
              <Input
                type="text"
                placeholder="e.g., PAY-2024-001"
                value={paymentReference}
                onChange={(e) => setPaymentReference(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Internal reference for payment tracking
              </p>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">
                PIN Validity (Days)
              </label>
              <Input
                type="number"
                min="1"
                max="365"
                value={expiryDays}
                onChange={(e) => setExpiryDays(e.target.value)}
              />
              <p className="text-xs text-slate-500 mt-1">
                Number of days before the PIN expires (recommended: 90 days)
              </p>
            </div>
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel disabled={creating} onClick={resetCreateForm}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleCreatePin();
              }}
              disabled={creating || !selectedStudent}
            >
              {creating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                'Generate PIN'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Generated PIN Dialog */}
      <Dialog open={showPinDialog} onOpenChange={setShowPinDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Award className="h-5 w-5 text-green-600" />
              PIN Generated Successfully!
            </DialogTitle>
            <DialogDescription>
              The transcript PIN has been generated. Please share this with the student.
            </DialogDescription>
          </DialogHeader>

          {generatedPin && (
            <div className="space-y-4 py-4">
              <div className="bg-green-50 border-2 border-green-500 rounded-lg p-4 text-center">
                <p className="text-sm text-green-700 mb-2">Transcript PIN</p>
                <code className="text-2xl font-mono font-bold text-green-900 tracking-wider">
                  {generatedPin.pin_code}
                </code>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(generatedPin.pin_code)}
                  className="mt-3"
                >
                  <Copy className="h-4 w-4 mr-2" />
                  Copy PIN
                </Button>
              </div>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Price:</span>
                  <span className="font-medium">₦{generatedPin.price.toLocaleString()}</span>
                </div>
                {generatedPin.payment_reference && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Payment Ref:</span>
                    <span className="font-medium">{generatedPin.payment_reference}</span>
                  </div>
                )}
                {generatedPin.expires_at && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Expires:</span>
                    <span className="font-medium">
                      {new Date(generatedPin.expires_at).toLocaleDateString()}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-600">Status:</span>
                  <Badge className="bg-green-600">Active</Badge>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded p-3 text-xs text-blue-700">
                <p className="font-medium mb-1">⚠️ Important:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>This PIN can only be used once</li>
                  <li>Valid for {generatedPin.expires_at ? `${expiryDays} days` : 'unlimited time'}</li>
                  <li>Student will need this to access their transcript</li>
                </ul>
              </div>
            </div>
          )}

          <div className="flex justify-end">
            <Button onClick={() => setShowPinDialog(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Student Details Dialog */}
      <Dialog open={showStudentDialog} onOpenChange={setShowStudentDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Graduated Student Details</DialogTitle>
            <DialogDescription>
              View complete information for this graduated student
            </DialogDescription>
          </DialogHeader>

          {selectedStudentDetails && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-500">Full Name</label>
                  <p className="font-medium">{getFullName(selectedStudentDetails)}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Admission Number</label>
                  <p className="font-medium">{selectedStudentDetails.admission_number || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Graduation Class</label>
                  <p className="font-medium">{selectedStudentDetails.graduation_class}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Graduation Session</label>
                  <p className="font-medium">{selectedStudentDetails.graduation_session}</p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Graduation Date</label>
                  <p className="font-medium">
                    {new Date(selectedStudentDetails.graduation_date).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-slate-500">Status</label>
                  <p>
                    {selectedStudentDetails.is_active ? (
                      <Badge variant="outline" className="border-green-500 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </p>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Contact Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-slate-500">Email</label>
                    <p className="font-medium">{selectedStudentDetails.email || 'Not provided'}</p>
                  </div>
                  <div>
                    <label className="text-xs text-slate-500">Phone</label>
                    <p className="font-medium">{selectedStudentDetails.phone || 'Not provided'}</p>
                  </div>
                </div>
              </div>

              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Fees Clearance Status</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-600">Clearance Required:</span>
                    <span className="font-medium">
                      {selectedStudentDetails.fees_clearance_required ? 'Yes' : 'No'}
                    </span>
                  </div>
                  {selectedStudentDetails.fees_clearance_required && (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-600">Status:</span>
                        {getFeesStatusBadge(selectedStudentDetails)}
                      </div>
                      {!selectedStudentDetails.fees_cleared && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-slate-600">Outstanding Balance:</span>
                          <span className="font-medium text-orange-600">
                            ₦{selectedStudentDetails.outstanding_balance.toLocaleString()}
                          </span>
                        </div>
                      )}
                    </>
                  )}
                  {selectedStudentDetails.fees_notes && (
                    <div>
                      <label className="text-xs text-slate-500">Notes:</label>
                      <p className="text-sm mt-1 p-2 bg-slate-50 rounded">
                        {selectedStudentDetails.fees_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* PINs for this student */}
              <div className="border-t pt-4">
                <h4 className="font-medium mb-3">Transcript PINs</h4>
                <div className="space-y-2">
                  {pins.filter(p => p.graduated_student_id === selectedStudentDetails.id).length === 0 ? (
                    <p className="text-sm text-slate-500 text-center py-4">
                      No PINs generated for this student yet
                    </p>
                  ) : (
                    pins
                      .filter(p => p.graduated_student_id === selectedStudentDetails.id)
                      .map(pin => (
                        <div key={pin.id} className="flex items-center justify-between p-2 bg-slate-50 rounded">
                          <div className="flex items-center gap-3">
                            <code className="text-sm font-mono">{pin.pin_code}</code>
                            {getPinStatusBadge(pin)}
                          </div>
                          <div className="text-sm text-slate-600">
                            {new Date(pin.created_at).toLocaleDateString()}
                          </div>
                        </div>
                      ))
                  )}
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowStudentDialog(false)}>
              Close
            </Button>
            {selectedStudentDetails && (
              <Button 
                onClick={() => {
                  setSelectedStudent(selectedStudentDetails.id);
                  setShowStudentDialog(false);
                  setShowCreateDialog(true);
                }}
              >
                <Plus className="h-4 w-4 mr-2" />
                Generate PIN
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}