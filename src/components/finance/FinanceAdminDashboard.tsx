import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { CheckCircle, DollarSign, FileText, ClipboardCheck, Users, ArrowRight, Wallet, TrendingUp, TrendingDown, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import FinanceStatistics from './FinanceStatistics';
import PaymentEntryForm from './PaymentEntryForm';
import PaymentsManagement from './PaymentsManagement';
import ClearanceReport from './ClearanceReport';
import StudentTypeAssignment from './StudentTypeAssignment';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface FinanceAdminDashboardProps {
  onNavigate?: (section: string) => void;
}

export default function FinanceAdminDashboard({ onNavigate }: FinanceAdminDashboardProps = {}) {
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [activeSession, setActiveSession] = useState('');
  const [activeTerm, setActiveTerm] = useState('');
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [activeTab, setActiveTab] = useState('overview');
  const [totalTermPayments, setTotalTermPayments] = useState<number>(0);
  const [loadingPayments, setLoadingPayments] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchActiveSessionAndTerm();
  }, []);

  useEffect(() => {
    if (academicYear && term) {
      fetchTotalTermPayments();
    }
  }, [academicYear, term, refreshKey]);

  const fetchActiveSessionAndTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const result = await res.json();

      console.log('[Finance Dashboard] Full API Response:', result);

      if (result.success) {
        // Get active session
        const currentSession = result.sessions?.find((s: any) => s.is_current);
        console.log('[Finance Dashboard] Current session from DB:', currentSession);
        
        // Get active term
        const currentTerm = result.terms?.find((t: any) => t.is_current);
        console.log('[Finance Dashboard] Current term from DB:', currentTerm);

        const newSessionName = currentSession?.session_name || '2025/2026';
        const newTermName = currentTerm?.term_name || 'First Term';

        // Update state
        if (currentSession) {
          setActiveSession(newSessionName);
          setAcademicYear(newSessionName);
        }

        if (currentTerm) {
          setActiveTerm(newTermName);
          setTerm(newTermName);
        }

        // Get all available sessions for dropdown
        if (result.sessions) {
          const sessionNames = result.sessions.map((s: any) => s.session_name);
          setAvailableSessions(sessionNames);
        }

        // 🔥 IMMEDIATELY fetch payment data for the current term
        console.log('[Finance Dashboard] 🔄 Fetching payment data for:', newSessionName, newTermName);
        await fetchTotalTermPaymentsForTerm(newSessionName, newTermName);
      }
    } catch (error) {
      console.error('[Finance Dashboard] Error fetching active session/term:', error);
    }
  };

  const fetchTotalTermPayments = async () => {
    await fetchTotalTermPaymentsForTerm(academicYear, term);
  };

  const fetchTotalTermPaymentsForTerm = async (session: string, termName: string) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        return;
      }

      const headers = {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json'
      };

      console.log('[Finance Dashboard] 📊 Fetching payments for session:', session, 'term:', termName);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/total-term-payments`,
        { headers, method: 'POST', body: JSON.stringify({ academicYear: session, term: termName }) }
      );
      const result = await res.json();

      console.log('[Finance Dashboard] 📊 Payment data response:', result);

      if (result.success) {
        setTotalTermPayments(result.totalPayments);
        console.log('[Finance Dashboard] ✅ Total payments:', result.totalPayments);
        setLoadingPayments(false);
      }
    } catch (error) {
      console.error('[Finance Dashboard] Error fetching total term payments:', error);
      setLoadingPayments(false);
    }
  };

  const handlePaymentSuccess = () => {
    setRefreshKey(prev => prev + 1);
    // Redirect to overview tab after successful payment entry
    setActiveTab('overview');
  };

  return (
    <div className="space-y-4 sm:space-y-6 pb-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Finance Module</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Manage school fees and payment records
        </p>
      </div>

      {/* Current Term Context Banner */}
      {academicYear && term && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-3 sm:p-4">
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-full bg-blue-500 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-white" />
              </div>
              <div>
                <p className="text-xs text-slate-600">Viewing Financial Data For:</p>
                <p className="font-bold text-slate-900">
                  {academicYear} - {term}
                </p>
              </div>
            </div>
            {academicYear === activeSession && term === activeTerm && (
              <Badge className="bg-green-500 text-white ml-auto">
                <CheckCircle className="h-3 w-3 mr-1" />
                Current Term
              </Badge>
            )}
          </div>
        </div>
      )}

      {/* Session/Term Filters */}
      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[140px]">
          <Select value={academicYear} onValueChange={setAcademicYear}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select session" />
            </SelectTrigger>
            <SelectContent>
              {availableSessions.length > 0 ? (
                availableSessions.map((session) => (
                  <SelectItem key={session} value={session}>
                    <div className="flex items-center gap-2">
                      <span>{session}</span>
                      {session === activeSession && (
                        <Badge variant="default" className="text-xs">Active</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))
              ) : (
                <>
                  <SelectItem value="2024/2025">2024/2025</SelectItem>
                  <SelectItem value="2025/2026">2025/2026</SelectItem>
                  <SelectItem value="2026/2027">2026/2027</SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
          {activeSession && academicYear === activeSession && (
            <div className="absolute -bottom-5 left-0 text-xs text-green-600 flex items-center gap-1 whitespace-nowrap">
              <CheckCircle className="h-3 w-3" />
              Active
            </div>
          )}
        </div>

        <div className="relative flex-1 min-w-[140px]">
          <Select value={term} onValueChange={setTerm}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select term" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="First Term">
                <div className="flex items-center gap-2">
                  <span>First Term</span>
                  {activeTerm === 'First Term' && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="Second Term">
                <div className="flex items-center gap-2">
                  <span>Second Term</span>
                  {activeTerm === 'Second Term' && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
              </SelectItem>
              <SelectItem value="Third Term">
                <div className="flex items-center gap-2">
                  <span>Third Term</span>
                  {activeTerm === 'Third Term' && (
                    <Badge variant="default" className="text-xs">Active</Badge>
                  )}
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          {activeTerm && term === activeTerm && (
            <div className="absolute -bottom-5 left-0 text-xs text-green-600 flex items-center gap-1 whitespace-nowrap">
              <CheckCircle className="h-3 w-3" />
              Active
            </div>
          )}
        </div>
      </div>

      {/* Statistics Cards */}
      <FinanceStatistics key={refreshKey} academicYear={academicYear} term={term} />

      {/* Main Navigation Cards - Show only on overview */}
      {activeTab === 'overview' && (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Quick Actions</h2>
          
          {/* Action Cards Grid - 2 per row */}
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            {/* Payment Entry Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200 hover:border-emerald-400"
              onClick={() => setActiveTab('entry')}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-full bg-emerald-500 text-white">
                    <DollarSign className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm text-emerald-900">Payment Entry</h3>
                    <p className="text-xs text-emerald-700 mt-1">Record payments</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Manage Payments Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 hover:border-blue-400"
              onClick={() => setActiveTab('manage')}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-full bg-blue-500 text-white">
                    <FileText className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm text-blue-900">Manage</h3>
                    <p className="text-xs text-blue-700 mt-1">View & edit</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Clearance Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 hover:border-purple-400"
              onClick={() => setActiveTab('clearance')}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-full bg-purple-500 text-white">
                    <ClipboardCheck className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm text-purple-900">Clearance</h3>
                    <p className="text-xs text-purple-700 mt-1">Fee status</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Student Type Assignment Card */}
            <Card 
              className="cursor-pointer hover:shadow-lg transition-all hover:scale-[1.02] border-2 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200 hover:border-orange-400"
              onClick={() => setActiveTab('studentType')}
            >
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col items-center text-center gap-2 sm:gap-3">
                  <div className="p-2.5 sm:p-3 rounded-full bg-orange-500 text-white">
                    <Users className="h-5 w-5 sm:h-6 sm:w-6" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-xs sm:text-sm text-orange-900">Student Type</h3>
                    <p className="text-xs text-orange-700 mt-1">Assign types</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Additional Quick Link */}
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all border-2 bg-gradient-to-r from-cyan-50 to-cyan-100 border-cyan-200 hover:border-cyan-400"
            onClick={() => onNavigate?.('student-fee-assignment')}
          >
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cyan-500 text-white">
                    <DollarSign className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-sm sm:text-base text-cyan-900">Assign Fee Items to Students</h3>
                    <p className="text-xs text-cyan-700 mt-0.5">New itemized fee system</p>
                  </div>
                </div>
                <Badge className="bg-cyan-500 text-white hidden sm:inline-flex">NEW</Badge>
              </div>
            </CardContent>
          </Card>

          {/* System Info Card */}
          <Card className="border-slate-200 bg-slate-50">
            <CardContent className="p-4 sm:p-5">
              <h3 className="font-semibold mb-3 text-sm sm:text-base">System Info</h3>
              <ul className="space-y-2 text-xs sm:text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>All payments require Director approval</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Cannot edit/delete approved payments</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Clearance status updates automatically</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Export available in CSV format</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'entry' && (
        <div>
          <button
            onClick={() => setActiveTab('overview')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <PaymentEntryForm onSuccess={handlePaymentSuccess} />
        </div>
      )}

      {activeTab === 'manage' && (
        <div>
          <button
            onClick={() => setActiveTab('overview')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <PaymentsManagement />
        </div>
      )}

      {activeTab === 'clearance' && (
        <div>
          <button
            onClick={() => setActiveTab('overview')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <ClearanceReport academicYear={academicYear} term={term} />
        </div>
      )}

      {activeTab === 'studentType' && (
        <div>
          <button
            onClick={() => setActiveTab('overview')}
            className="mb-4 text-sm text-blue-600 hover:text-blue-800 flex items-center gap-1"
          >
            ← Back to Dashboard
          </button>
          <StudentTypeAssignment />
        </div>
      )}
    </div>
  );
}