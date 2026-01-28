import { useState, useEffect, useCallback } from 'react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { 
  Users, 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  TrendingUp,
  RefreshCw,
  Filter,
  Search,
  Camera,
  Eye,
  X,
  AlertTriangle
} from 'lucide-react';

interface CBTAttempt {
  id: string;
  student_id: string;
  student_name: string;
  student_email: string;
  subject: string;
  student_class: string;
  session: string | null;
  term: string | null;
  status: 'in_progress' | 'submitted' | 'time_expired';
  start_time: string;
  end_time: string | null;
  duration_minutes: number;
  score: number | null;
  percentage: number | null;
  total_marks: number;
  total_questions: number;
  answered_questions: number;
  time_remaining_seconds: number | null;
  is_expired: boolean;
  progress_percentage: number;
  created_at: string;
  violations_count?: number;
  tab_switches?: number;
  fullscreen_exits?: number;
}

interface Violation {
  id: string;
  attempt_id: string;
  violation_type: string;
  severity: string;
  screenshot_url: string | null;
  details: any;
  created_at: string;
}

interface MonitoringSummary {
  total_active: number;
  total_completed: number;
  total_expired: number;
  average_score: number;
  total_attempts: number;
}

// Timer component that updates every second
function LiveTimer({ attempt }: { attempt: CBTAttempt }) {
  const [timeLeft, setTimeLeft] = useState(attempt.time_remaining_seconds || 0);

  useEffect(() => {
    if (attempt.status !== 'in_progress' || !attempt.time_remaining_seconds) {
      return;
    }

    setTimeLeft(attempt.time_remaining_seconds);

    const interval = setInterval(() => {
      setTimeLeft(prev => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [attempt.id, attempt.time_remaining_seconds]);

  // Show status-based messages for non-active exams
  if (attempt.status === 'submitted') {
    return <span className="text-sm text-green-600 font-medium">Completed</span>;
  }
  
  if (attempt.status === 'time_expired') {
    return <span className="text-sm text-red-600 font-medium">Time Up</span>;
  }

  if (attempt.status !== 'in_progress') {
    return <span className="text-sm text-gray-400">-</span>;
  }

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return <span className="text-red-600">Expired</span>;
    
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    const formatted = `${minutes}:${secs.toString().padStart(2, '0')}`;
    
    // Highlight if less than 5 minutes
    if (seconds < 300) {
      return <span className="text-red-600 font-medium">{formatted}</span>;
    }
    
    return <span className="text-gray-900">{formatted}</span>;
  };

  return <span className="text-sm">{formatTime(timeLeft)}</span>;
}

export function CBTMonitoring() {
  const [attempts, setAttempts] = useState<CBTAttempt[]>([]);
  const [summary, setSummary] = useState<MonitoringSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'in_progress' | 'submitted' | 'time_expired'>('all');
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [selectedAttemptViolations, setSelectedAttemptViolations] = useState<Violation[] | null>(null);
  const [loadingViolations, setLoadingViolations] = useState(false);
  const [selectedScreenshot, setSelectedScreenshot] = useState<string | null>(null);

  const supabase = createClient();

  const fetchMonitoringData = async () => {
    try {
      // Only set refreshing (not loading) after initial load
      if (!loading) {
        setRefreshing(true);
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/monitoring/active`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (response.ok) {
        setAttempts(data.attempts || []);
        setSummary(data.summary || null);
        setError('');
        setLastRefresh(new Date());
      } else {
        setError(data.error || 'Failed to fetch monitoring data');
      }
    } catch (err: any) {
      console.error('Error fetching monitoring data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchMonitoringData();
  }, []);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!autoRefresh) return;

    const interval = setInterval(() => {
      fetchMonitoringData();
    }, 10000); // 10 seconds

    return () => clearInterval(interval);
  }, [autoRefresh]);

  // Filter attempts
  const filteredAttempts = attempts.filter(attempt => {
    // Filter by status
    if (filterStatus !== 'all' && attempt.status !== filterStatus) {
      return false;
    }

    // Filter by search term
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      return (
        attempt.student_name.toLowerCase().includes(search) ||
        attempt.subject.toLowerCase().includes(search) ||
        attempt.student_class.toLowerCase().includes(search)
      );
    }

    return true;
  });

  // Get status badge color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'in_progress':
        return 'bg-blue-100 text-blue-800';
      case 'submitted':
        return 'bg-green-100 text-green-800';
      case 'time_expired':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  // Fetch violations for an attempt
  const fetchViolations = async (attemptId: string) => {
    try {
      setLoadingViolations(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/violations/${attemptId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSelectedAttemptViolations(data.violations || []);
      }
    } catch (error) {
      console.error('Error fetching violations:', error);
    } finally {
      setLoadingViolations(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading monitoring data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Active Now</p>
                <p className="text-2xl text-gray-900 mt-1">{summary.total_active}</p>
              </div>
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-2xl text-gray-900 mt-1">{summary.total_completed}</p>
              </div>
              <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle className="w-6 h-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired</p>
                <p className="text-2xl text-gray-900 mt-1">{summary.total_expired}</p>
              </div>
              <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Average Score</p>
                <p className="text-2xl text-gray-900 mt-1">{summary.average_score}%</p>
              </div>
              <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-purple-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Attempts</p>
                <p className="text-2xl text-gray-900 mt-1">{summary.total_attempts}</p>
              </div>
              <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                <Clock className="w-6 h-6 text-orange-600" />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="bg-gradient-to-br from-slate-50 to-blue-50 rounded-lg border border-slate-200 p-4 shadow-sm">
        <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-3 flex-1 w-full lg:w-auto">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                placeholder="Search student, subject, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              />
            </div>

            {/* Status Filter */}
            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="pl-10 pr-8 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none bg-white min-w-[150px]"
              >
                <option value="all">All Status</option>
                <option value="in_progress">In Progress</option>
                <option value="submitted">Submitted</option>
                <option value="time_expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Refresh Controls */}
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2 text-sm text-slate-700 font-medium">
              <input
                type="checkbox"
                checked={autoRefresh}
                onChange={(e) => setAutoRefresh(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              Auto-refresh (10s)
            </label>
            
            <button
              onClick={() => fetchMonitoringData()}
              disabled={refreshing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>
        </div>

        <p className="text-xs text-slate-600 mt-3 font-medium">
          Last updated: {lastRefresh.toLocaleTimeString()}
        </p>
      </div>

      {/* Attempts Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Subject
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Class
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Progress
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Time Left
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Score
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Violations
                </th>
                <th className="px-4 py-3 text-left text-xs text-gray-600 uppercase tracking-wider">
                  Started
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredAttempts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">
                    No exam attempts found
                  </td>
                </tr>
              ) : (
                filteredAttempts.map((attempt) => (
                  <tr key={attempt.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <p className="text-sm text-gray-900">{attempt.student_name}</p>
                        <p className="text-xs text-gray-500">{attempt.student_email}</p>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {attempt.subject}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {attempt.student_class}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs ${getStatusColor(attempt.status)}`}>
                        {attempt.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-200 rounded-full h-2 max-w-[100px]">
                          <div
                            className={`h-2 rounded-full ${
                              attempt.status === 'submitted' || attempt.status === 'time_expired'
                                ? 'bg-green-600'
                                : 'bg-blue-600'
                            }`}
                            style={{ width: `${attempt.progress_percentage}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-600 whitespace-nowrap">
                          {attempt.answered_questions}/{attempt.total_questions}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <LiveTimer attempt={attempt} />
                    </td>
                    <td className="px-4 py-3">
                      {attempt.score !== null ? (
                        <div className="flex flex-col">
                          <span className="text-sm text-gray-900 font-medium">{attempt.score}/{attempt.total_marks}</span>
                          {attempt.percentage !== null && (
                            <span className="text-xs text-gray-500">{attempt.percentage.toFixed(1)}%</span>
                          )}
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {attempt.violations_count !== undefined && attempt.violations_count > 0 ? (
                        <button
                          onClick={() => fetchViolations(attempt.id)}
                          className="flex items-center gap-2 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 rounded-lg transition-colors"
                        >
                          <Camera className="w-4 h-4" />
                          <span className="font-medium">{attempt.violations_count}</span>
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-sm text-gray-400 px-3">0</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {new Date(attempt.start_time).toLocaleString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Results Count */}
      <div className="text-sm text-gray-600 text-center">
        Showing {filteredAttempts.length} of {attempts.length} attempt(s)
      </div>

      {/* Violations Modal */}
      {selectedAttemptViolations !== null && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-gray-900">Violation Evidence</h2>
                <p className="text-sm text-gray-600 mt-1">
                  {selectedAttemptViolations.length} violation(s) detected
                </p>
              </div>
              <button
                onClick={() => setSelectedAttemptViolations(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-y-auto p-6">
              {loadingViolations ? (
                <div className="flex items-center justify-center py-12">
                  <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
                </div>
              ) : selectedAttemptViolations.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No violations found
                </div>
              ) : (
                <div className="space-y-4">
                  {selectedAttemptViolations.map((violation, index) => (
                    <div
                      key={violation.id}
                      className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                            violation.severity === 'high' 
                              ? 'bg-red-100' 
                              : violation.severity === 'medium'
                              ? 'bg-orange-100'
                              : 'bg-yellow-100'
                          }`}>
                            <AlertTriangle className={`w-5 h-5 ${
                              violation.severity === 'high'
                                ? 'text-red-600'
                                : violation.severity === 'medium'
                                ? 'text-orange-600'
                                : 'text-yellow-600'
                            }`} />
                          </div>
                          <div>
                            <h3 className="text-gray-900 capitalize">
                              {violation.violation_type.replace('_', ' ')}
                            </h3>
                            <p className="text-sm text-gray-600">
                              {new Date(violation.created_at).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs ${
                          violation.severity === 'high'
                            ? 'bg-red-100 text-red-800'
                            : violation.severity === 'medium'
                            ? 'bg-orange-100 text-orange-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {violation.severity} severity
                        </span>
                      </div>

                      {/* Violation Details */}
                      {violation.details?.message && (
                        <p className="text-sm text-gray-700 mb-3">
                          {violation.details.message}
                        </p>
                      )}

                      {/* Screenshot */}
                      {(violation.screenshot_url || violation.details?.screenshot_url) ? (
                        <div className="mt-3">
                          <div className="bg-gray-100 rounded-lg p-3 border border-gray-200">
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-sm text-gray-700 flex items-center gap-2">
                                <Camera className="w-4 h-4" />
                                Screenshot Evidence
                              </span>
                              <button
                                onClick={() => setSelectedScreenshot(violation.screenshot_url || violation.details?.screenshot_url)}
                                className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition-colors"
                              >
                                <Eye className="w-4 h-4" />
                                View Full Size
                              </button>
                            </div>
                            <img
                              src={violation.screenshot_url || violation.details?.screenshot_url}
                              alt="Violation screenshot"
                              className="w-full rounded border border-gray-300 cursor-pointer hover:opacity-90 transition-opacity"
                              onClick={() => setSelectedScreenshot(violation.screenshot_url || violation.details?.screenshot_url)}
                            />
                          </div>
                        </div>
                      ) : (
                        <div className="mt-3 bg-gray-50 rounded-lg p-3 text-center text-sm text-gray-500">
                          No screenshot available for this violation
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="border-t border-gray-200 p-4 bg-gray-50">
              <button
                onClick={() => setSelectedAttemptViolations(null)}
                className="w-full px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Screenshot Fullscreen Modal */}
      {selectedScreenshot && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
          onClick={() => setSelectedScreenshot(null)}
        >
          <div className="relative max-w-7xl w-full">
            <button
              onClick={() => setSelectedScreenshot(null)}
              className="absolute -top-12 right-0 p-2 bg-white rounded-lg hover:bg-gray-100 transition-colors"
            >
              <X className="w-6 h-6 text-gray-900" />
            </button>
            <img
              src={selectedScreenshot}
              alt="Screenshot fullscreen"
              className="w-full h-auto rounded-lg shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        </div>
      )}
    </div>
  );
}