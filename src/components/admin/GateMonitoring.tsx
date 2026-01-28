import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Alert, AlertDescription } from '../ui/alert';
import {
  Calendar as CalendarIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  Search,
  User,
  LogIn,
  LogOut as LogOutIcon,
  TrendingUp,
  Users,
  Filter,
  Eye
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface ClockRecord {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  date: string;
  clock_in_time?: string;
  clock_out_time?: string;
  clock_in_photo_url?: string;
  clock_out_photo_url?: string;
  clock_in_teacher_name?: string;
  clock_out_teacher_name?: string;
  late_arrival: boolean;
  early_departure: boolean;
  session: string;
  term: string;
  week?: string;
}

interface DailyStats {
  date: string;
  totalStudents: number;
  clockedIn: number;
  clockedOut: number;
  lateArrivals: number;
  notArrived: number;
  averageArrivalTime?: string;
  notClockedInStudents?: Array<{ id: string; name: string; class_name: string; }>;
  notClockedOutStudents?: Array<{ id: string; name: string; class_name: string; clock_in_time: string; }>;
}

interface WeeklyTrend {
  day: string;
  clockedIn: number;
  lateArrivals: number;
}

export function GateMonitoring() {
  const [todayRecords, setTodayRecords] = useState<ClockRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<ClockRecord[]>([]);
  const [weeklyTrends, setWeeklyTrends] = useState<WeeklyTrend[]>([]);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'present' | 'late' | 'absent'>('all');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedWeek, setSelectedWeek] = useState<string>('all');
  const [selectedTerm, setSelectedTerm] = useState<string>('all');
  const [selectedSession, setSelectedSession] = useState<string>('all');
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  const [availableTerms, setAvailableTerms] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [showHistoricalFilters, setShowHistoricalFilters] = useState(false);
  const [activeSession, setActiveSession] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<string>('');
  
  const supabase = createClient();

  useEffect(() => {
    fetchAvailableFilters();
  }, []);

  // Refetch filters when toggle changes
  useEffect(() => {
    fetchAvailableFilters(showHistoricalFilters);
  }, [showHistoricalFilters]);

  useEffect(() => {
    fetchTodayData();
    fetchWeeklyTrends();
  }, [selectedDate, selectedWeek, selectedTerm, selectedSession]);

  useEffect(() => {
    // Filter records based on search and status filter
    let filtered = todayRecords;

    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record =>
        record.student_name.toLowerCase().includes(query) ||
        record.class_name.toLowerCase().includes(query)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(record => {
        if (filterStatus === 'present') return record.clock_in_time && !record.late_arrival;
        if (filterStatus === 'late') return record.late_arrival;
        if (filterStatus === 'absent') return !record.clock_in_time;
        return true;
      });
    }

    setFilteredRecords(filtered);
  }, [searchQuery, filterStatus, todayRecords]);

  const fetchAvailableFilters = async (viewAllHistorical: boolean = showHistoricalFilters) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/available-filters`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[GateMonitoring] Available filters response:', data);
      
      if (data.success) {
        // Store active term and session
        setActiveSession(data.activeSession || '');
        setActiveTerm(data.activeTerm || '');
        
        // Set available filters based on toggle state
        if (viewAllHistorical) {
          setAvailableSessions(data.allSessions || []);
          setAvailableTerms(data.allTerms || []);
          console.log('[GateMonitoring] Showing ALL sessions/terms:', data.allSessions, data.allTerms);
        } else {
          // Only show active session and term
          const activeSessions = data.activeSession ? [data.activeSession] : [];
          const activeTerms = data.activeTerm ? [data.activeTerm] : [];
          setAvailableSessions(activeSessions);
          setAvailableTerms(activeTerms);
          console.log('[GateMonitoring] Showing ACTIVE only:', data.activeSession, data.activeTerm);
          console.log('[GateMonitoring] Available arrays:', activeSessions, activeTerms);
        }
      }
    } catch (error) {
      console.error('[GateMonitoring] Error fetching available filters:', error);
    }
  };

  const fetchTodayData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/clock-records?date=${selectedDate}&week=${selectedWeek}&term=${selectedTerm}&session=${selectedSession}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setTodayRecords(data.records || []);
        setFilteredRecords(data.records || []);
        setDailyStats(data.stats);
      }
    } catch (error) {
      console.error('[GateMonitoring] Error fetching today data:', error);
      toast.error('Failed to load clock records');
    } finally {
      setLoading(false);
    }
  };

  const fetchWeeklyTrends = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/clock-weekly-trends`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      if (data.success) {
        setWeeklyTrends(data.trends || []);
      }
    } catch (error) {
      console.error('[GateMonitoring] Error fetching weekly trends:', error);
    }
  };

  const exportToCSV = () => {
    if (filteredRecords.length === 0) {
      toast.error('No records to export');
      return;
    }

    const headers = ['Student Name', 'Class', 'Clock In', 'Clock Out', 'Status', 'Recorded By'];
    const rows = filteredRecords.map(record => [
      record.student_name,
      record.class_name,
      record.clock_in_time ? formatTime(record.clock_in_time) : 'N/A',
      record.clock_out_time ? formatTime(record.clock_out_time) : 'N/A',
      record.late_arrival ? 'Late' : record.clock_in_time ? 'On Time' : 'Absent',
      record.clock_in_teacher_name || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gate-records-${selectedDate}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    toast.success('Records exported successfully');
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const isSelectedDateWeekend = () => {
    const date = new Date(selectedDate);
    const day = date.getDay();
    return day === 0 || day === 6; // Sunday = 0, Saturday = 6
  };

  const getSelectedDayName = () => {
    const date = new Date(selectedDate);
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl mb-2">🚪 Gate Monitoring Dashboard</h1>
          <p className="text-xs sm:text-sm text-slate-600">Track student arrivals and departures</p>
        </div>
        <Button onClick={exportToCSV} variant="outline" className="text-sm w-full sm:w-auto">
          <Download className="h-4 w-4 sm:mr-2" />
          <span className="hidden sm:inline">Export CSV</span>
          <span className="sm:hidden">Export</span>
        </Button>
      </div>

      {/* Weekend Warning for Selected Date */}
      {isSelectedDateWeekend() && (
        <Alert className="bg-amber-50 border-amber-200">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-800">
            <strong>Weekend Notice:</strong> {getSelectedDayName()}, {formatDate(selectedDate)} is a weekend. 
            Displayed records may be from special events, makeup days, or Saturday classes (outside regular Mon-Fri school days).
          </AlertDescription>
        </Alert>
      )}

      {/* Historical Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Filter className="h-4 w-4" />
              Historical Filters
            </CardTitle>
            <div className="flex items-center gap-2">
              <label className="text-xs text-slate-600 cursor-pointer">
                View All Sessions/Terms
              </label>
              <button
                onClick={() => setShowHistoricalFilters(!showHistoricalFilters)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  showHistoricalFilters ? 'bg-blue-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    showHistoricalFilters ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Date Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600">Date</label>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
                className="text-sm"
              />
            </div>

            {/* Week Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600">Week</label>
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="w-full h-10 px-3 text-sm border rounded-md bg-white"
              >
                <option value="all">All Weeks</option>
                {[...Array(12)].map((_, i) => (
                  <option key={i + 1} value={`Week ${i + 1}`}>
                    Week {i + 1}
                  </option>
                ))}
              </select>
            </div>

            {/* Term Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600">Term</label>
              <select
                value={selectedTerm}
                onChange={(e) => setSelectedTerm(e.target.value)}
                className="w-full h-10 px-3 text-sm border rounded-md bg-white"
              >
                <option value="all">All Terms</option>
                {availableTerms.length > 0 ? (
                  availableTerms.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="First Term">First Term</option>
                    <option value="Second Term">Second Term</option>
                    <option value="Third Term">Third Term</option>
                  </>
                )}
              </select>
            </div>

            {/* Session Filter */}
            <div className="space-y-1.5">
              <label className="text-xs text-slate-600">Session</label>
              <select
                value={selectedSession}
                onChange={(e) => setSelectedSession(e.target.value)}
                className="w-full h-10 px-3 text-sm border rounded-md bg-white"
              >
                <option value="all">All Sessions</option>
                {availableSessions.length > 0 ? (
                  availableSessions.map((session) => (
                    <option key={session} value={session}>
                      {session}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="2024/2025">2024/2025</option>
                    <option value="2023/2024">2023/2024</option>
                    <option value="2022/2023">2022/2023</option>
                  </>
                )}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics Cards */}
      {dailyStats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2 sm:gap-4">
          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="w-full">
                  <p className="text-xs sm:text-sm text-slate-600">Total Students</p>
                  <p className="text-xl sm:text-2xl mt-1">{dailyStats.totalStudents}</p>
                </div>
                <Users className="h-6 w-6 sm:h-10 sm:w-10 text-slate-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="w-full">
                  <p className="text-xs sm:text-sm text-slate-600">Clocked In</p>
                  <p className="text-xl sm:text-2xl mt-1">{dailyStats.clockedIn}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {((dailyStats.clockedIn / dailyStats.totalStudents) * 100).toFixed(1)}%
                  </p>
                </div>
                <CheckCircle className="h-6 w-6 sm:h-10 sm:w-10 text-green-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="w-full">
                  <p className="text-xs sm:text-sm text-slate-600">Clocked Out</p>
                  <p className="text-xl sm:text-2xl mt-1">{dailyStats.clockedOut}</p>
                </div>
                <LogOutIcon className="h-6 w-6 sm:h-10 sm:w-10 text-blue-600" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="w-full">
                  <p className="text-xs sm:text-sm text-slate-600">Late Arrivals</p>
                  <p className="text-xl sm:text-2xl mt-1">{dailyStats.lateArrivals}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {dailyStats.clockedIn > 0 
                      ? ((dailyStats.lateArrivals / dailyStats.clockedIn) * 100).toFixed(1) 
                      : '0'}% of arrivals
                  </p>
                </div>
                <AlertTriangle className="h-6 w-6 sm:h-10 sm:w-10 text-amber-600" />
              </div>
            </CardContent>
          </Card>

          <Card className="col-span-2 sm:col-span-1">
            <CardContent className="p-3 sm:p-4">
              <div className="flex flex-col sm:flex-row items-start sm:items-center sm:justify-between gap-2">
                <div className="w-full">
                  <p className="text-xs sm:text-sm text-slate-600">Not Arrived</p>
                  <p className="text-xl sm:text-2xl mt-1">{dailyStats.notArrived}</p>
                </div>
                <XCircle className="h-6 w-6 sm:h-10 sm:w-10 text-red-600" />
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Students Not Clocked In & Not Clocked Out Lists */}
      {dailyStats && (dailyStats.notClockedInStudents?.length > 0 || dailyStats.notClockedOutStudents?.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Students Not Clocked In */}
          {dailyStats.notClockedInStudents && dailyStats.notClockedInStudents.length > 0 && (
            <Card className="border-red-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <XCircle className="h-5 w-5 text-red-600" />
                  Students Not Clocked In ({dailyStats.notClockedInStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dailyStats.notClockedInStudents.map((student) => (
                    <div key={student.id} className="flex items-center gap-3 p-2 border rounded hover:bg-red-50">
                      <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-red-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.class_name}</div>
                      </div>
                      <Badge variant="secondary" className="bg-red-100 text-red-700 text-xs">
                        Absent
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Students Not Clocked Out */}
          {dailyStats.notClockedOutStudents && dailyStats.notClockedOutStudents.length > 0 && (
            <Card className="border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-blue-600" />
                  Students Not Clocked Out ({dailyStats.notClockedOutStudents.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {dailyStats.notClockedOutStudents.map((student) => (
                    <div key={student.id} className="flex items-center gap-3 p-2 border rounded hover:bg-blue-50">
                      <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <User className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">{student.name}</div>
                        <div className="text-xs text-slate-500">{student.class_name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          In: {formatTime(student.clock_in_time)}
                        </div>
                      </div>
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                        In School
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}

      <Tabs defaultValue="records" className="space-y-4">
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full grid-cols-3 min-w-max sm:min-w-0">
            <TabsTrigger value="records" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Clock Records</span>
              <span className="sm:hidden">Records</span>
            </TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Weekly Trends</span>
              <span className="sm:hidden">Trends</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="text-xs sm:text-sm px-2 sm:px-4">
              <span className="hidden sm:inline">Security Alerts</span>
              <span className="sm:hidden">Alerts</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Clock Records Tab */}
        <TabsContent value="records" className="space-y-4">
          {/* Filters */}
          <Card>
            <CardContent className="p-4">
              <div className="flex flex-col gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    type="text"
                    placeholder="Search by student name or class..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 text-sm"
                  />
                </div>
                <div className="flex gap-2 overflow-x-auto pb-2">
                  <Button
                    variant={filterStatus === 'all' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('all')}
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    All
                  </Button>
                  <Button
                    variant={filterStatus === 'present' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('present')}
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    Present
                  </Button>
                  <Button
                    variant={filterStatus === 'late' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('late')}
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    Late
                  </Button>
                  <Button
                    variant={filterStatus === 'absent' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setFilterStatus('absent')}
                    className="text-xs sm:text-sm whitespace-nowrap"
                  >
                    Absent
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Records Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">
                Clock Records ({filteredRecords.length} {filterStatus !== 'all' ? `${filterStatus}` : 'total'})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-[600px] overflow-y-auto">
                {loading ? (
                  <p className="text-center text-slate-500 py-8 text-sm">Loading records...</p>
                ) : filteredRecords.length === 0 ? (
                  <p className="text-center text-slate-500 py-8 text-sm">No records found</p>
                ) : (
                  filteredRecords.map((record) => (
                    <div
                      key={record.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 sm:p-4 border rounded-lg hover:bg-slate-50 gap-3 sm:gap-4"
                    >
                      <div className="flex items-center gap-3 sm:gap-4 flex-1 min-w-0">
                        <div className={`h-10 w-10 sm:h-12 sm:w-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                          !record.clock_in_time ? 'bg-red-100' :
                          record.clock_out_time ? 'bg-blue-100' : 
                          record.late_arrival ? 'bg-amber-100' : 'bg-green-100'
                        }`}>
                          {!record.clock_in_time ? (
                            <XCircle className="h-5 w-5 sm:h-6 sm:w-6 text-red-600" />
                          ) : record.clock_out_time ? (
                            <LogOutIcon className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                          ) : record.late_arrival ? (
                            <AlertTriangle className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                          ) : (
                            <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <div className="font-medium text-sm sm:text-base truncate">{record.student_name}</div>
                            {record.late_arrival && (
                              <Badge variant="secondary" className="bg-amber-100 text-amber-700 text-xs">
                                LATE
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-slate-500">{record.class_name}</div>
                          {record.week && (
                            <div className="text-xs text-slate-400 mt-0.5">📅 {record.week}</div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-6 text-xs sm:text-sm">
                        {/* Clock In Info */}
                        <div className="text-left sm:text-right min-w-[100px] sm:min-w-[120px]">
                          {record.clock_in_time ? (
                            <>
                              <div className="flex items-center sm:justify-end gap-1">
                                <LogIn className="h-3 w-3 text-green-600" />
                                <span className="text-xs sm:text-sm">{formatTime(record.clock_in_time)}</span>
                              </div>
                              {record.clock_in_teacher_name && (
                                <div className="text-xs text-slate-500 mt-1">
                                  By {record.clock_in_teacher_name}
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="text-xs sm:text-sm text-red-600">Not arrived</div>
                          )}
                        </div>

                        {/* Clock Out Info */}
                        <div className="text-right min-w-[100px] sm:min-w-[120px]">
                          {record.clock_out_time ? (
                            <>
                              <div className="flex items-center justify-end gap-1">
                                <LogOutIcon className="h-3 w-3 text-blue-600" />
                                <span className="text-xs sm:text-sm">{formatTime(record.clock_out_time)}</span>
                              </div>
                              {record.clock_out_teacher_name && (
                                <div className="text-xs text-slate-500 mt-1">
                                  By {record.clock_out_teacher_name}
                                </div>
                              )}
                            </>
                          ) : record.clock_in_time ? (
                            <div className="text-xs sm:text-sm text-slate-400">Still in school</div>
                          ) : (
                            <div className="text-xs sm:text-sm text-slate-400">-</div>
                          )}
                        </div>

                        {/* View Photos */}
                        <div className="flex gap-2 flex-shrink-0">
                          {record.clock_in_photo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPhoto(record.clock_in_photo_url || null)}
                              className="flex items-center gap-1"
                              title="View Clock-In Photo"
                            >
                              <LogIn className="h-3 w-3 sm:h-4 sm:w-4 text-green-600" />
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                          {record.clock_out_photo_url && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedPhoto(record.clock_out_photo_url || null)}
                              className="flex items-center gap-1"
                              title="View Clock-Out Photo"
                            >
                              <LogOutIcon className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                              <Eye className="h-3 w-3 sm:h-4 sm:w-4" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Weekly Trends Tab */}
        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Weekly Attendance Trends</CardTitle>
            </CardHeader>
            <CardContent>
              {weeklyTrends.length === 0 ? (
                <p className="text-center text-slate-500 py-8 text-sm">No trend data available</p>
              ) : (
                <div className="space-y-4">
                  {weeklyTrends.map((trend, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0 text-xs sm:text-sm">
                        <span className="font-medium">{trend.day}</span>
                        <div className="flex items-center gap-3 sm:gap-4 text-xs text-slate-600">
                          <span>Present: {trend.clockedIn}</span>
                          <span>Late: {trend.lateArrivals}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <div
                          className="h-6 sm:h-8 bg-green-500 rounded flex items-center justify-center text-white text-xs"
                          style={{ width: `${(trend.clockedIn / (dailyStats?.totalStudents || 1)) * 100}%` }}
                        >
                          {trend.clockedIn > 0 && `${trend.clockedIn}`}
                        </div>
                        <div
                          className="h-6 sm:h-8 bg-amber-500 rounded flex items-center justify-center text-white text-xs"
                          style={{ width: `${(trend.lateArrivals / (dailyStats?.totalStudents || 1)) * 100}%` }}
                        >
                          {trend.lateArrivals > 0 && `${trend.lateArrivals}`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Security Alerts Tab */}
        <TabsContent value="alerts">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Security Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Students who clocked in but never clocked out from previous day */}
                <Alert>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <div className="ml-2">
                    <p className="font-medium">Students Not Clocked Out Yesterday</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Review students who clocked in yesterday but have no clock-out record
                    </p>
                  </div>
                </Alert>

                {/* Habitual late arrivals */}
                <Alert>
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <div className="ml-2">
                    <p className="font-medium">Habitual Late Arrivals This Week</p>
                    <p className="text-sm text-slate-600 mt-1">
                      Students with 3 or more late arrivals require attention
                    </p>
                  </div>
                </Alert>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Photo Viewer Modal */}
      {selectedPhoto && (
        <div
          className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
          onClick={() => setSelectedPhoto(null)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img src={selectedPhoto} alt="Clock record" className="w-full h-auto rounded-lg" />
          </div>
        </div>
      )}
    </div>
  );
}