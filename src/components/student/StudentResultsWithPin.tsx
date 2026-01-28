import { useState, useEffect } from 'react';
import { Badge } from '../ui/badge';
import { ReportCard } from '../results/ReportCard';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { ReportCardWithPDF } from '../results/ReportCardWithPDF';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import { AlertCircle, FileText, Loader2, Lock, CheckCircle2, XCircle, Key, DollarSign } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

export function StudentResultsWithPin() {
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [pin, setPin] = useState('');
  const [resultType, setResultType] = useState<'midterm' | 'terminal'>('terminal');
  
  const [verified, setVerified] = useState(false);
  const [feeStatus, setFeeStatus] = useState<{ paid: boolean; message: string } | null>(null);
  const [studentId, setStudentId] = useState('');
  
  // Payment error modal state
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentError, setPaymentError] = useState<{
    message: string;
    details?: any;
  } | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchDropdownData();
    fetchStudentId();
  }, []);

  // Fetch exams when session and term are selected
  useEffect(() => {
    if (selectedSession && selectedTerm) {
      fetchExamsForSelection();
    } else {
      setExams([]);
      setSelectedExam('');
    }
  }, [selectedSession, selectedTerm]);

  const fetchStudentId = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      setStudentId(session.user.id);
    }
  };

  const fetchDropdownData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch sessions and terms
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const sessionData = await sessionRes.json();
      if (sessionData.success) {
        setSessions(sessionData.sessions || []);
        setTerms(sessionData.terms || []);
        
        // Auto-select current session and term
        const currentSession = sessionData.sessions?.find((s: any) => s.is_current);
        const currentTerm = sessionData.terms?.find((t: any) => t.is_current);
        if (currentSession) setSelectedSession(currentSession.session_name);
        if (currentTerm) setSelectedTerm(currentTerm.term_name);
      }

    } catch (error) {
      console.error('[StudentResultsWithPin] Error:', error);
    }
  };

  const fetchExamsForSelection = async () => {
    // Only fetch exams if we have session and term (exams are not class-specific)
    if (!selectedSession || !selectedTerm) {
      setExams([]);
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Exams are filtered by session and term only (not class_id)
      const params = new URLSearchParams({
        session: selectedSession,
        term: selectedTerm
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams?${params.toString()}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setExams(data.exams || []);
        // Auto-select first exam if available
        if (data.exams && data.exams.length > 0) {
          setSelectedExam(data.exams[0].name);
        }
      } else {
        console.error('Failed to fetch exams:', data.error);
        setExams([]);
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      setExams([]);
    }
  };

  const handleVerify = async () => {
    if (!selectedSession || !selectedTerm || !selectedExam || !pin) {
      toast.error('Please fill all fields');
      return;
    }

    try {
      setVerifying(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/verify-result-pin`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            pin,
            session: selectedSession,
            term: selectedTerm,
            exam_type: resultType // Pass the exam type (midterm or terminal)
          })
        }
      );
      const result = await res.json();
      
      if (result.success) {
        setFeeStatus(result.fee_status);
        if (result.fee_status.paid) {
          setVerified(true);
          toast.success('Verification successful! Loading your results...');
        } else {
          toast.error(result.fee_status.message);
        }
      } else {
        // Check if it's a payment insufficiency error
        if (result.payment_insufficient) {
          setPaymentError({
            message: 'Payment Required',
            details: result.error,
          });
          setShowPaymentModal(true);
        } else {
          toast.error(result.error || 'Invalid or expired PIN');
        }
      }
    } catch (error) {
      console.error('[StudentResultsWithPin] Verify error:', error);
      toast.error('Failed to verify PIN');
    } finally {
      setVerifying(false);
    }
  };

  if (verified && feeStatus?.paid) {
    return (
      <div className="space-y-4">
        {/* Mobile Header */}
        <div className="bg-gradient-to-r from-green-600 to-green-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold">Verified</h2>
                <p className="text-green-100 text-sm">Result access granted</p>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={() => {
              setVerified(false);
              setPin('');
            }}
            className="rounded-xl"
          >
            View Another Result
          </Button>
        </div>
        
        <ReportCardWithPDF
          studentId={studentId}
          sessionName={selectedSession}
          termName={selectedTerm}
          examName={selectedExam}
          resultType={resultType}
          userRole="student"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3 mb-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Results</h1>
            <p className="text-blue-100 text-sm">Enter PIN to view results</p>
          </div>
        </div>
      </div>

      {/* Info Cards - App Style */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0">
              <Key className="h-5 w-5 text-blue-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-1">Result PIN Required</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Enter your 8-digit result PIN to access your results. Generate PINs in the "Result PIN Viewer" section.
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex items-start gap-3">
            <div className="p-2.5 bg-purple-50 rounded-xl flex-shrink-0">
              <DollarSign className="h-5 w-5 text-purple-600" />
            </div>
            <div className="flex-1">
              <p className="font-semibold text-gray-900 mb-1">Fee Verification</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Your school fee status will be checked before results are displayed.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Verification Form - App Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 text-lg">Result Access Form</h2>
        </div>
        
        <div className="p-5 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Academic Session *</Label>
              <Select value={selectedSession} onValueChange={setSelectedSession}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map(session => (
                    <SelectItem key={session.id || session.session_name} value={session.session_name}>
                      {session.session_name}
                      {session.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Term *</Label>
              <Select value={selectedTerm} onValueChange={setSelectedTerm}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder="Select term" />
                </SelectTrigger>
                <SelectContent>
                  {terms.map(term => (
                    <SelectItem key={term.id || term.term_name} value={term.term_name}>
                      {term.term_name}
                      {term.is_current && <Badge className="ml-2 text-xs">Current</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Exam *</Label>
              <Select 
                value={selectedExam} 
                onValueChange={setSelectedExam}
                disabled={!selectedSession || !selectedTerm || exams.length === 0}
              >
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue placeholder={
                    !selectedSession || !selectedTerm 
                      ? "Select session & term first" 
                      : exams.length === 0 
                        ? "No exams available"
                        : "Select exam"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {exams.length > 0 ? (
                    exams.map(exam => (
                      <SelectItem key={exam.id} value={exam.name}>
                        {exam.name}
                      </SelectItem>
                    ))
                  ) : (
                    <SelectItem value="__no_exams__" disabled>
                      No exams found for selected session and term
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
              {selectedSession && selectedTerm && exams.length === 0 && (
                <p className="text-sm text-gray-500">No exams configured for the selected session and term</p>
              )}
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Result Type *</Label>
              <Select value={resultType} onValueChange={(v) => setResultType(v as 'midterm' | 'terminal')}>
                <SelectTrigger className="rounded-xl h-12">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="midterm">Midterm Result</SelectItem>
                  <SelectItem value="terminal">Terminal Result</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="pin" className="text-sm font-medium text-gray-700">Result PIN *</Label>
            <Input
              id="pin"
              value={pin}
              onChange={(e) => setPin(e.target.value.toUpperCase())}
              placeholder="Enter 8-digit PIN"
              maxLength={8}
              className="font-mono text-lg tracking-wider rounded-xl h-12 text-center"
            />
            <p className="text-xs text-gray-500 text-center">
              Enter your unique 8-character result access PIN
            </p>
          </div>

          {feeStatus && !feeStatus.paid && (
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-red-100 rounded-xl flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-red-900 mb-1">Fee Status Issue</p>
                  <p className="text-sm text-red-700 leading-relaxed">{feeStatus.message}</p>
                </div>
              </div>
            </div>
          )}

          <Button 
            onClick={handleVerify} 
            disabled={verifying} 
            className="w-full gap-2 h-12 rounded-xl text-base font-semibold shadow-lg hover:shadow-xl transition-shadow"
          >
            <Key className="h-5 w-5" />
            {verifying ? 'Verifying...' : 'Verify & View Results'}
          </Button>
        </div>
      </div>

      {/* Payment Error Modal */}
      <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
        <DialogContent className="sm:max-w-[500px] rounded-3xl">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 rounded-full bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <DialogTitle className="text-xl">Payment Required</DialogTitle>
                <DialogDescription className="mt-1">
                  School fee verification failed
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
              <p className="text-sm text-red-800 leading-relaxed">
                {paymentError?.details || 'You must pay the required percentage of your school fees to access your results.'}
              </p>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 space-y-2">
              <h4 className="font-medium text-sm text-slate-700">What to do next:</h4>
              <ul className="space-y-1 text-sm text-slate-600">
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Visit the Finance Department to make payment</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Wait for your payment to be approved by the Finance Officer</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-blue-600 mt-0.5">•</span>
                  <span>Return here and try accessing your results again</span>
                </li>
              </ul>
            </div>

            <div className="flex justify-end gap-2">
              <Button
                onClick={() => setShowPaymentModal(false)}
                className="w-full sm:w-auto"
              >
                I Understand
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}