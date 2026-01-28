import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  GraduationCap, 
  User, 
  Calendar, 
  Key,
  AlertTriangle,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowLeft,
  FileText,
  DollarSign
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { AcademicTranscript } from './AcademicTranscript';

interface FeeHistoryItem {
  session: string;
  term: string;
  expectedFee: number;
  totalPaid: number;
  outstanding: number;
  isCleared: boolean;
}

interface AlumniLoginPortalProps {
  onBackToLogin?: () => void;
}

export function AlumniLoginPortal({ onBackToLogin }: AlumniLoginPortalProps) {
  const [step, setStep] = useState<'login' | 'pin' | 'transcript'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Login form state
  const [graduationSessions, setGraduationSessions] = useState<string[]>([]);
  const [loginData, setLoginData] = useState({
    first_name: '',
    last_name: '',
    graduation_session: ''
  });
  
  // Alumni data after successful login
  const [alumniData, setAlumniData] = useState<any>(null);
  
  // PIN form state
  const [pinCode, setPinCode] = useState('');
  
  // Transcript data
  const [transcriptData, setTranscriptData] = useState<any>(null);

  // Fee history dialog
  const [showFeeHistoryDialog, setShowFeeHistoryDialog] = useState(false);
  const [feeHistory, setFeeHistory] = useState<FeeHistoryItem[]>([]);
  const [feeHistoryLoading, setFeeHistoryLoading] = useState(false);
  const [feeHistoryData, setFeeHistoryData] = useState<any>(null);

  // Fetch available graduation sessions on mount
  useEffect(() => {
    fetchGraduationSessions();
  }, []);

  const fetchGraduationSessions = async () => {
    try {
      console.log('[Alumni] Fetching graduation sessions...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/alumni/graduation-sessions`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        console.error('[Alumni] Response not OK:', response.status, response.statusText);
        // Don't throw - just log and show user-friendly message
        toast.warning('Could not load graduation sessions. You can still try logging in.');
        return;
      }

      const data = await response.json();
      console.log('[Alumni] Graduation sessions response:', data);
      
      if (data.success && data.sessions) {
        if (data.sessions.length === 0) {
          console.warn('[Alumni] No graduation sessions found - graduated_students table may be empty');
          // Don't show toast - let the form handle empty dropdown gracefully
        }
        setGraduationSessions(data.sessions);
      } else {
        console.error('[Alumni] Invalid response format:', data);
        // Don't show error toast - let user continue
      }
    } catch (err) {
      console.error('[Alumni] Error fetching graduation sessions:', err);
      // Network error - but don't block the user, just log it
      console.warn('[Alumni] Network error, but continuing...');
    }
  };

  const handleAlumniLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/alumni/login`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        }
      );

      const data = await response.json();

      if (!data.success) {
        setError(data.error || 'Failed to verify alumni credentials');
        toast.error(data.error || 'Failed to verify alumni credentials');
        return;
      }

      setAlumniData(data.alumni);
      toast.success('Alumni verified successfully!');
      setStep('pin');

    } catch (err) {
      console.error('Alumni login error:', err);
      setError('Failed to verify alumni credentials. Please try again.');
      toast.error('Failed to verify alumni credentials');
    } finally {
      setLoading(false);
    }
  };

  const handlePinVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      console.log('[Alumni PIN Verification] Starting verification...', {
        alumni_id: alumniData?.id,
        pin_code: pinCode,
        pin_length: pinCode.length
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/alumni/verify-pin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            alumni_id: alumniData.id,
            pin_code: pinCode
          })
        }
      );

      console.log('[Alumni PIN Verification] Response status:', response.status);
      const data = await response.json();
      console.log('[Alumni PIN Verification] Response data:', data);

      if (!data.success) {
        // Check if it's a fees clearance issue
        if (data.fees_required) {
          setError(
            `Fees clearance required. Outstanding balance: ₦${data.outstanding_balance || 0}. Please contact the school to clear your fees before accessing your transcript.`
          );
          toast.error('Fees clearance required');
        } else {
          setError(data.error || 'Invalid PIN');
          toast.error(data.error || 'Invalid PIN');
        }
        return;
      }

      console.log('[Alumni PIN Verification] Success! Moving to transcript step');
      setTranscriptData(data);
      toast.success('PIN verified! Access granted to transcript');
      setStep('transcript');

    } catch (err) {
      console.error('[Alumni PIN Verification] Error:', err);
      setError('Failed to verify PIN. Please try again.');
      toast.error('Failed to verify PIN');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginStep = () => (
    <form onSubmit={handleAlumniLogin} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="first_name" className="text-sm font-medium text-slate-700">
          First Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="first_name"
            type="text"
            placeholder="Enter your first name"
            value={loginData.first_name}
            onChange={(e) => setLoginData({ ...loginData, first_name: e.target.value })}
            className="pl-10"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="last_name" className="text-sm font-medium text-slate-700">
          Last Name
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="last_name"
            type="text"
            placeholder="Enter your last name"
            value={loginData.last_name}
            onChange={(e) => setLoginData({ ...loginData, last_name: e.target.value })}
            className="pl-10"
            required
            disabled={loading}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="graduation_session" className="text-sm font-medium text-slate-700">
          Graduation Session
        </Label>
        <Select
          value={loginData.graduation_session}
          onValueChange={(value) => setLoginData({ ...loginData, graduation_session: value })}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Select graduation session" />
          </SelectTrigger>
          <SelectContent>
            {graduationSessions.length > 0 ? (
              graduationSessions.map((session) => (
                <SelectItem key={session} value={session}>
                  {session}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No graduation sessions available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <Button
        type="submit"
        className="w-full bg-green-600 hover:bg-green-700 text-white"
        disabled={!loginData.first_name || !loginData.last_name || !loginData.graduation_session || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Verifying...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Verify Alumni Status
          </>
        )}
      </Button>
    </form>
  );

  const renderPinStep = () => (
    <div className="space-y-6">
      {/* Alumni Info Card */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-green-900">Alumni Verified</h3>
            <p className="text-sm text-green-700 mt-1">
              {alumniData?.first_name} {alumniData?.middle_name} {alumniData?.last_name}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {alumniData?.admission_number && `Admission No: ${alumniData.admission_number} • `}
              {alumniData?.graduation_number && `Graduation No: ${alumniData.graduation_number} • `}
              Graduated Class: {alumniData?.graduation_class}
            </p>
          </div>
        </div>
      </div>

      {/* Fees Clearance Status */}
      {alumniData?.fees_clearance_required && (
        <div className={`border rounded-lg p-4 ${
          alumniData?.fees_cleared 
            ? 'bg-green-50 border-green-200' 
            : 'bg-yellow-50 border-yellow-200'
        }`}>
          <div className="flex items-start gap-3">
            <DollarSign className={`h-5 w-5 mt-0.5 ${
              alumniData?.fees_cleared ? 'text-green-600' : 'text-yellow-600'
            }`} />
            <div className="flex-1">
              <h3 className={`font-medium ${
                alumniData?.fees_cleared ? 'text-green-900' : 'text-yellow-900'
              }`}>
                Fees Clearance Status
              </h3>
              <p className={`text-sm mt-1 ${
                alumniData?.fees_cleared ? 'text-green-700' : 'text-yellow-700'
              }`}>
                {alumniData?.fees_cleared ? (
                  'All fees cleared ✓'
                ) : (
                  `Outstanding Balance: ₦${alumniData?.outstanding_balance || 0}`
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* PIN Entry Form */}
      <form onSubmit={handlePinVerification} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="pin_code" className="text-sm font-medium text-slate-700">
            Transcript PIN
          </Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="pin_code"
              type="text"
              placeholder="Enter your transcript PIN"
              value={pinCode}
              onChange={(e) => setPinCode(e.target.value.toUpperCase())}
              className="pl-10 font-mono tracking-wider"
              required
              disabled={loading}
              maxLength={14}
            />
          </div>
          <p className="text-xs text-slate-500">
            Enter the 14-character PIN provided to you by the school (e.g., C7GV-GEZG-UP99)
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!pinCode || pinCode.length < 10 || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying PIN...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              Access Transcript
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setStep('login');
            setAlumniData(null);
            setPinCode('');
            setError(null);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Alumni Login
        </Button>
      </form>
    </div>
  );

  const renderTranscriptStep = () => {
    // Check if we have academic records
    const hasRecords = transcriptData?.academic_records && transcriptData.academic_records.length > 0;

    return (
      <div className="space-y-6">
        {/* Success Message */}
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
            <div className="flex-1">
              <h3 className="font-medium text-green-900">Access Granted</h3>
              <p className="text-sm text-green-700 mt-1">
                Your transcript access has been verified and logged.
              </p>
            </div>
          </div>
        </div>

        {/* Transcript Content */}
        {hasRecords ? (
          <AcademicTranscript data={transcriptData} />
        ) : (
          <div className="border rounded-lg p-8 bg-slate-50">
            <div className="text-center space-y-4">
              <FileText className="h-16 w-16 text-slate-400 mx-auto" />
              <div>
                <h3 className="font-medium text-slate-900 text-lg">No Academic Records Found</h3>
                <p className="text-sm text-slate-600 mt-2 max-w-md mx-auto">
                  We couldn't find any academic records for your student profile. This could mean:
                </p>
                <ul className="text-sm text-slate-600 mt-3 space-y-1 text-left max-w-md mx-auto">
                  <li>• Your records haven't been uploaded to the system yet</li>
                  <li>• You may need to contact the school administration</li>
                  <li>• There might be a data migration issue</li>
                </ul>
                <p className="text-sm text-slate-700 font-medium mt-4">
                  Alumni Information Verified:
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm mt-2 text-left">
                  <div>
                    <p className="text-slate-500">Full Name</p>
                    <p className="font-medium text-slate-900">
                      {transcriptData?.alumni?.first_name} {transcriptData?.alumni?.middle_name} {transcriptData?.alumni?.last_name}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Admission Number</p>
                    <p className="font-medium text-slate-900">
                      {transcriptData?.alumni?.admission_number}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Graduation Class</p>
                    <p className="font-medium text-slate-900">
                      {transcriptData?.alumni?.graduation_class}
                    </p>
                  </div>
                  <div>
                    <p className="text-slate-500">Graduation Session</p>
                    <p className="font-medium text-slate-900">
                      {transcriptData?.alumni?.graduation_session}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* New Search Button */}
        <div className="flex justify-center">
          <Button
            variant="outline"
            onClick={() => {
              setStep('login');
              setAlumniData(null);
              setTranscriptData(null);
              setPinCode('');
              setLoginData({ first_name: '', last_name: '', graduation_session: '' });
              setError(null);
            }}
            className="min-w-[200px]"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            New Search
          </Button>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#7B9FCC] p-4 py-8">
      <Card className={`w-full shadow-2xl border-0 ${step === 'transcript' ? 'max-w-6xl' : 'max-w-md'}`}>
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <GraduationCap className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            Alumni Transcript Portal
          </CardTitle>
          <p className="text-slate-600 mt-2">
            {step === 'login' && 'Enter your details to access your transcript'}
            {step === 'pin' && 'Enter your PIN to access transcript'}
            {step === 'transcript' && 'Your Academic Transcript'}
          </p>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert className="mb-6 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {step === 'login' && renderLoginStep()}
          {step === 'pin' && renderPinStep()}
          {step === 'transcript' && renderTranscriptStep()}

          {step === 'login' && (
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={onBackToLogin}
                className="text-sm text-slate-600 hover:text-slate-900"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Alumni Portal
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}