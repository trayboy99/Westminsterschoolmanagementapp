import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { ArrowLeft, Users, CheckCircle, Clock, AlertTriangle, TrendingUp, Download } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';
import { createClient } from '../../utils/supabase/client';

interface DirectorComplianceViewProps {
  type: 'uploads' | 'marks';
  onBack?: () => void;
}

interface TeacherStats {
  teacherId: string;
  teacherName: string;
  subjects: string[];
  classes: string[];
  totalRequired: number;
  submitted: number;
  complianceRate: number;
  status: 'compliant' | 'partial' | 'overdue';
}

interface MarksStats {
  totalExams: number;
  completedExams: number;
  pendingApprovals: number;
  approvedExams: number;
}

export function DirectorComplianceView({ type, onBack }: DirectorComplianceViewProps) {
  const { session } = useAuth();
  const [uploadsData, setUploadsData] = useState<TeacherStats[]>([]);
  const [marksData, setMarksData] = useState<MarksStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeSession, setActiveSession] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    fetchActiveSessionAndTerm();
  }, []);

  useEffect(() => {
    if (activeSession && activeTerm) {
      fetchComplianceData();
    }
  }, [type, activeSession, activeTerm]);

  const fetchActiveSessionAndTerm = async () => {
    try {
      if (!session?.access_token) return;

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
      console.log('[DirectorComplianceView] Active session/term response:', data);
      
      if (data.success) {
        setActiveSession(data.activeSession || '');
        setActiveTerm(data.activeTerm || '');
      }
    } catch (error) {
      console.error('[DirectorComplianceView] Error fetching active session/term:', error);
    }
  };

  const fetchComplianceData = async () => {
    if (!session?.access_token) {
      toast.error('Not authenticated');
      return;
    }

    setLoading(true);
    try {
      if (type === 'uploads') {
        // Build query params with session and term filters
        const params = new URLSearchParams();
        if (activeSession) {
          params.append('session', activeSession);
        }
        if (activeTerm) {
          params.append('term', activeTerm);
        }

        const queryString = params.toString();
        const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/director-uploads-compliance${queryString ? `?${queryString}` : ''}`;

        console.log('[DirectorComplianceView] Fetching uploads compliance with filters:', { activeSession, activeTerm });
        console.log('[DirectorComplianceView] 🚀 FULL URL:', url);
        console.log('[DirectorComplianceView] 🚀 Query String:', queryString);

        // Fetch uploads compliance
        const uploadsResponse = await fetch(url, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        });

        if (uploadsResponse.ok) {
          const uploadsResult = await uploadsResponse.json();
          console.log('[DirectorComplianceView] 📦 Response:', uploadsResult);
          console.log('[DirectorComplianceView] 📦 Teachers count:', uploadsResult.teachers?.length);
          if (uploadsResult.success) {
            setUploadsData(uploadsResult.teachers || []);
          } else {
            toast.error(uploadsResult.error || 'Failed to load uploads data');
          }
        } else {
          const errorText = await uploadsResponse.text();
          console.error('[Director Uploads] Error:', errorText);
          toast.error('Failed to load uploads compliance data');
        }
      } else {
        // Fetch marks compliance
        const marksResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/director-marks-compliance`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
            },
          }
        );

        if (marksResponse.ok) {
          const marksResult = await marksResponse.json();
          console.log('[Director Marks] Response:', marksResult);
          if (marksResult.success) {
            console.log('[Director Marks] Setting marks data:', marksResult.stats);
            setMarksData(marksResult.stats);
          } else {
            console.error('[Director Marks] API returned error:', marksResult.error);
            toast.error(marksResult.error || 'Failed to load marks data');
          }
        } else {
          const status = marksResponse.status;
          const errorText = await marksResponse.text();
          console.error(`[Director Marks] HTTP ${status} Error:`, errorText);
          toast.error(`Failed to load marks data (${status})`);
        }
      }

    } catch (error) {
      console.error('[Director Compliance] Error fetching data:', error);
      toast.error('Failed to load compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    toast.success('Exporting compliance report...');
  };

  // Calculate uploads stats
  const uploadsStats = {
    totalTeachers: uploadsData.length,
    compliant: uploadsData.filter(t => t.status === 'compliant').length,
    partial: uploadsData.filter(t => t.status === 'partial').length,
    overdue: uploadsData.filter(t => t.status === 'overdue').length,
    avgCompliance: uploadsData.length > 0 
      ? Math.round(uploadsData.reduce((sum, t) => sum + t.complianceRate, 0) / uploadsData.length)
      : 0,
  };

  const getStatusBadge = (status: string) => {
    const config = {
      compliant: { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
      partial: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
      overdue: { bg: 'bg-red-100', text: 'text-red-800', icon: AlertTriangle },
    };
    const { bg, text, icon: Icon } = config[status as keyof typeof config] || config.partial;
    
    return (
      <Badge className={`${bg} ${text} border-0`}>
        <Icon className="h-3 w-3 mr-1" />
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {onBack && (
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        )}
        <Card>
          <CardContent className="p-8">
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-900" />
              <span className="ml-3">Loading compliance data...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      {onBack && (
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Compliance Record
        </Button>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">
            {type === 'uploads' ? 'Uploads Compliance' : 'Marks Entry Compliance'}
          </h2>
          <p className="text-slate-600">
            {type === 'uploads' 
              ? 'Monitor teacher uploads compliance for materials and resources'
              : 'Monitor marks entry completion and approval status'
            }
          </p>
        </div>
        <Button variant="outline" onClick={handleExport}>
          <Download className="h-4 w-4 mr-2" />
          Export Report
        </Button>
      </div>

      {/* Uploads Compliance */}
      {type === 'uploads' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Teachers</p>
                    <p className="text-3xl font-bold mt-1">{uploadsStats.totalTeachers}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Compliant</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{uploadsStats.compliant}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Partial</p>
                    <p className="text-3xl font-bold mt-1 text-yellow-600">{uploadsStats.partial}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Overdue</p>
                    <p className="text-3xl font-bold mt-1 text-red-600">{uploadsStats.overdue}</p>
                  </div>
                  <AlertTriangle className="h-8 w-8 text-red-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Average Compliance */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Overall Compliance Rate
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold">{uploadsStats.avgCompliance}%</span>
                  <span className="text-sm text-slate-600">Average across all teachers</span>
                </div>
                <Progress value={uploadsStats.avgCompliance} className="h-3" />
              </div>
            </CardContent>
          </Card>

          {/* Teachers List */}
          <Card>
            <CardHeader>
              <CardTitle>Teachers ({uploadsData.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {uploadsData.map((teacher) => (
                  <div
                    key={teacher.teacherId}
                    className="border rounded-lg p-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h4 className="font-semibold">{teacher.teacherName}</h4>
                          {getStatusBadge(teacher.status)}
                        </div>
                        <p className="text-sm text-slate-600">
                          <span className="font-medium">Subjects:</span> {teacher.subjects.join(', ')}
                        </p>
                        {teacher.classes.length > 0 && (
                          <p className="text-sm text-slate-600">
                            <span className="font-medium">Classes:</span> {teacher.classes.join(', ')}
                          </p>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{teacher.complianceRate}%</p>
                        <p className="text-xs text-slate-600">{teacher.submitted}/{teacher.totalRequired} uploads</p>
                      </div>
                    </div>
                    <Progress value={teacher.complianceRate} className="h-2" />
                  </div>
                ))}

                {uploadsData.length === 0 && (
                  <div className="text-center py-8 text-slate-500">
                    No teacher data available
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Marks Compliance */}
      {type === 'marks' && (
        <div className="space-y-6">
          {marksData ? (
            <>
              {/* Stats Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Total Exams</p>
                    <p className="text-3xl font-bold mt-1">{marksData.totalExams}</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Completed</p>
                    <p className="text-3xl font-bold mt-1 text-green-600">{marksData.completedExams}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-green-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Pending Approval</p>
                    <p className="text-3xl font-bold mt-1 text-yellow-600">{marksData.pendingApprovals}</p>
                  </div>
                  <Clock className="h-8 w-8 text-yellow-600" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Approved</p>
                    <p className="text-3xl font-bold mt-1 text-blue-600">{marksData.approvedExams}</p>
                  </div>
                  <CheckCircle className="h-8 w-8 text-blue-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Progress Chart */}
          <Card>
            <CardHeader>
              <CardTitle>Marks Entry Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Completion Rate</span>
                    <span className="text-sm text-slate-600">
                      {marksData.totalExams > 0 
                        ? Math.round((marksData.completedExams / marksData.totalExams) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={marksData.totalExams > 0 
                      ? (marksData.completedExams / marksData.totalExams) * 100
                      : 0} 
                    className="h-3" 
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Approval Progress</span>
                    <span className="text-sm text-slate-600">
                      {marksData.completedExams > 0 
                        ? Math.round((marksData.approvedExams / marksData.completedExams) * 100)
                        : 0}%
                    </span>
                  </div>
                  <Progress 
                    value={marksData.completedExams > 0 
                      ? (marksData.approvedExams / marksData.completedExams) * 100
                      : 0} 
                    className="h-3 bg-blue-200" 
                  />
                </div>
              </div>
            </CardContent>
          </Card>
            </>
          ) : (
            <Card>
              <CardContent className="p-8">
                <div className="text-center text-slate-500">
                  <Clock className="h-12 w-12 mx-auto mb-3 text-slate-400" />
                  <p className="font-medium">No marks data available</p>
                  <p className="text-sm mt-1">Marks compliance data will appear here once exams are created and marked.</p>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}