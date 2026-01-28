import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  ClipboardList,
  User,
  Calendar,
  Key,
  AlertTriangle,
  Loader2,
  ArrowLeft,
  CheckCircle,
  FileText
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

interface AlumniResultsCheckerProps {
  onBack?: () => void;
}

export function AlumniResultsChecker({ onBack }: AlumniResultsCheckerProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'search' | 'pin' | 'results'>('search');
  
  // Search form state
  const [searchData, setSearchData] = useState({
    admission_number: '',
    graduation_number: '', // New field for graduation number search
    session: '',
    term: '',
    exam_type: '' // 'midterm' or 'terminal'
  });
  
  // Available sessions and terms
  const [sessions, setSessions] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  
  // Student data
  const [studentData, setStudentData] = useState<any>(null);
  
  // PIN state
  const [resultPin, setResultPin] = useState('');
  
  // Results data
  const [resultsData, setResultsData] = useState<any>(null);

  // Fetch sessions and terms on mount
  useEffect(() => {
    fetchSessionsAndTerms();
  }, []);

  const fetchSessionsAndTerms = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      
      if (data.success) {
        // Extract session_name from session objects
        const sessionNames = data.sessions?.map((s: any) => 
          typeof s === 'string' ? s : s.session_name
        ) || [];
        setSessions(sessionNames);
        setTerms(data.terms?.map((t: any) => t.term_name) || []);
      }
    } catch (err) {
      console.error('Error fetching sessions/terms:', err);
    }
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // This is a placeholder - you'll need to implement the backend endpoint
      // For now, we'll show a message
      toast.info('Student search functionality will be implemented');
      
      // Simulated response for demo
      setTimeout(() => {
        setStudentData({
          admission_number: searchData.admission_number || 'ADM2024001',
          graduation_number: searchData.graduation_number || 'GRAD2025001',
          name: 'Demo Student',
          class: 'SS2',
          graduated_class: 'SS3',
          session: searchData.session,
          term: searchData.term,
          exam_type: searchData.exam_type
        });
        setStep('pin');
        setLoading(false);
      }, 1000);

    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to find student. Please check your admission number.');
      toast.error('Failed to find student');
      setLoading(false);
    }
  };

  const handlePinVerification = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // Call the backend PIN verification endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/verify-result-pin`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            pin: resultPin,
            session: searchData.session,
            term: searchData.term,
            exam_type: searchData.exam_type
          })
        }
      );

      const data = await response.json();

      if (!data.success) {
        // Check if it's a payment insufficiency error
        if (data.payment_insufficient) {
          setError(data.error);
          toast.error('Payment Required', {
            description: data.error,
            duration: 8000,
          });
        } else {
          setError(data.error || 'PIN verification failed');
          toast.error(data.error || 'Invalid PIN');
        }
        setLoading(false);
        return;
      }

      // PIN verified and payment is sufficient, load results
      toast.success('PIN verified! Loading results...');
      
      // TODO: Fetch actual results from backend
      // For now, simulated response for demo
      setTimeout(() => {
        setResultsData({
          student: studentData,
          subjects: [
            { name: 'Mathematics', ca1: 15, ca2: 18, exam: 55, total: 88, grade: 'A1' },
            { name: 'English Language', ca1: 14, ca2: 16, exam: 52, total: 82, grade: 'A1' },
            { name: 'Physics', ca1: 13, ca2: 15, exam: 48, total: 76, grade: 'B2' }
          ]
        });
        setStep('results');
        setLoading(false);
      }, 1000);

    } catch (err) {
      console.error('PIN verification error:', err);
      setError('Failed to verify PIN. Please try again.');
      toast.error('Network error. Please check your connection.');
      setLoading(false);
    }
  };

  const renderSearchStep = () => (
    <form onSubmit={handleSearch} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="admission_number" className="text-sm font-medium text-slate-700">
          Admission Number
        </Label>
        <div className="relative">
          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="admission_number"
            type="text"
            placeholder="Enter your admission number (e.g., ADM2024001)"
            value={searchData.admission_number}
            onChange={(e) => setSearchData({ ...searchData, admission_number: e.target.value })}
            className="pl-10"
            required={!searchData.graduation_number}
            disabled={loading}
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-slate-500">
        <div className="flex-1 border-t border-slate-200"></div>
        <span>OR</span>
        <div className="flex-1 border-t border-slate-200"></div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="graduation_number" className="text-sm font-medium text-slate-700">
          Graduation Number (Optional)
        </Label>
        <div className="relative">
          <FileText className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input
            id="graduation_number"
            type="text"
            placeholder="Enter your graduation number (e.g., GRAD2025001)"
            value={searchData.graduation_number}
            onChange={(e) => setSearchData({ ...searchData, graduation_number: e.target.value })}
            className="pl-10"
            required={!searchData.admission_number}
            disabled={loading}
          />
        </div>
        <p className="text-xs text-slate-500">
          Use either admission number or graduation number
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="session" className="text-sm font-medium text-slate-700">
          Academic Session
        </Label>
        <Select
          value={searchData.session}
          onValueChange={(value) => setSearchData({ ...searchData, session: value })}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Select session" />
          </SelectTrigger>
          <SelectContent>
            {sessions.length > 0 ? (
              sessions.map((session) => (
                <SelectItem key={session} value={session}>
                  {session}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No sessions available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="term" className="text-sm font-medium text-slate-700">
          Term
        </Label>
        <Select
          value={searchData.term}
          onValueChange={(value) => setSearchData({ ...searchData, term: value })}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <Calendar className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Select term" />
          </SelectTrigger>
          <SelectContent>
            {terms.length > 0 ? (
              terms.map((term) => (
                <SelectItem key={term} value={term}>
                  {term}
                </SelectItem>
              ))
            ) : (
              <SelectItem value="none" disabled>
                No terms available
              </SelectItem>
            )}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="exam_type" className="text-sm font-medium text-slate-700">
          Exam Type
        </Label>
        <Select
          value={searchData.exam_type}
          onValueChange={(value) => setSearchData({ ...searchData, exam_type: value })}
          disabled={loading}
        >
          <SelectTrigger className="w-full">
            <ClipboardList className="h-4 w-4 mr-2 text-slate-400" />
            <SelectValue placeholder="Select exam type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="midterm">Midterm Examination</SelectItem>
            <SelectItem value="terminal">Terminal Examination</SelectItem>
          </SelectContent>
        </Select>
        <p className="text-xs text-slate-500">
          Choose which exam type results to view
        </p>
      </div>

      <Button
        type="submit"
        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
        disabled={(!searchData.admission_number && !searchData.graduation_number) || !searchData.session || !searchData.term || !searchData.exam_type || loading}
      >
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Searching...
          </>
        ) : (
          <>
            <CheckCircle className="h-4 w-4 mr-2" />
            Find Results
          </>
        )}
      </Button>
    </form>
  );

  const renderPinStep = () => (
    <div className="space-y-6">
      {/* Student Info */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-blue-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-blue-900">Student Found</h3>
            <p className="text-sm text-blue-700 mt-1">
              {studentData?.name}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {studentData?.admission_number && `Admission No: ${studentData.admission_number} • `}
              {studentData?.graduation_number && `Graduation No: ${studentData.graduation_number}`}
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              {studentData?.graduated_class && `Graduated Class: ${studentData.graduated_class} • `}
              {studentData?.session} - {studentData?.term} • {studentData?.exam_type === 'midterm' ? 'Midterm' : 'Terminal'}
            </p>
          </div>
        </div>
      </div>

      {/* PIN Entry */}
      <form onSubmit={handlePinVerification} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="result_pin" className="text-sm font-medium text-slate-700">
            Result PIN
          </Label>
          <div className="relative">
            <Key className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              id="result_pin"
              type="text"
              placeholder="Enter your result PIN"
              value={resultPin}
              onChange={(e) => setResultPin(e.target.value.toUpperCase())}
              className="pl-10 font-mono tracking-wider"
              required
              disabled={loading}
              maxLength={12}
            />
          </div>
          <p className="text-xs text-slate-500">
            Enter the PIN provided to you to access this result
          </p>
        </div>

        <Button
          type="submit"
          className="w-full bg-blue-600 hover:bg-blue-700 text-white"
          disabled={!resultPin || resultPin.length < 8 || loading}
        >
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Verifying PIN...
            </>
          ) : (
            <>
              <FileText className="h-4 w-4 mr-2" />
              View Results
            </>
          )}
        </Button>

        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={() => {
            setStep('search');
            setStudentData(null);
            setResultPin('');
            setError(null);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Search
        </Button>
      </form>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      {/* Success Message */}
      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
          <div className="flex-1">
            <h3 className="font-medium text-green-900">Results Retrieved</h3>
            <p className="text-sm text-green-700 mt-1">
              {resultsData?.student?.name}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {resultsData?.student?.admission_number && `Admission No: ${resultsData.student.admission_number} • `}
              {resultsData?.student?.graduation_number && `Graduation No: ${resultsData.student.graduation_number}`}
            </p>
            <p className="text-xs text-green-600 mt-0.5">
              {resultsData?.student?.graduated_class && `Graduated Class: ${resultsData.student.graduated_class} • `}
              {resultsData?.student?.session} - {resultsData?.student?.term} • {resultsData?.student?.exam_type === 'midterm' ? 'Midterm' : 'Terminal'} Examination
            </p>
          </div>
        </div>
      </div>

      {/* Results Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-3 text-sm font-medium text-slate-700">Subject</th>
              <th className="text-center p-3 text-sm font-medium text-slate-700">CA1</th>
              <th className="text-center p-3 text-sm font-medium text-slate-700">CA2</th>
              <th className="text-center p-3 text-sm font-medium text-slate-700">Exam</th>
              <th className="text-center p-3 text-sm font-medium text-slate-700">Total</th>
              <th className="text-center p-3 text-sm font-medium text-slate-700">Grade</th>
            </tr>
          </thead>
          <tbody>
            {resultsData?.subjects?.map((subject: any, index: number) => (
              <tr key={index} className="border-t">
                <td className="p-3 text-sm text-slate-900">{subject.name}</td>
                <td className="p-3 text-sm text-center text-slate-700">{subject.ca1}</td>
                <td className="p-3 text-sm text-center text-slate-700">{subject.ca2}</td>
                <td className="p-3 text-sm text-center text-slate-700">{subject.exam}</td>
                <td className="p-3 text-sm text-center font-medium text-slate-900">{subject.total}</td>
                <td className="p-3 text-sm text-center font-medium text-blue-600">{subject.grade}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-3">
        <Button
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => {
            toast.info('Print functionality will be implemented soon');
          }}
        >
          <FileText className="h-4 w-4 mr-2" />
          Print Results
        </Button>
        <Button
          variant="outline"
          onClick={() => {
            setStep('search');
            setStudentData(null);
            setResultsData(null);
            setResultPin('');
            setSearchData({ admission_number: '', graduation_number: '', session: '', term: '', exam_type: '' });
            setError(null);
          }}
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          New Search
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#7B9FCC] p-4">
      <Card className="w-full max-w-md shadow-2xl border-0">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <ClipboardList className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            Check Past Results
          </CardTitle>
          <p className="text-slate-600 mt-2">
            {step === 'search' && 'Enter your details to view results'}
            {step === 'pin' && 'Enter your PIN to access results'}
            {step === 'results' && 'Your Examination Results'}
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

          {step === 'search' && renderSearchStep()}
          {step === 'pin' && renderPinStep()}
          {step === 'results' && renderResultsStep()}

          {step === 'search' && (
            <div className="mt-6 text-center">
              <Button
                variant="link"
                onClick={onBack}
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