import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { BookOpen, Plus, Calendar, Clock, CheckCircle, XCircle, AlertCircle, FileText } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { LessonPlanEditor } from './LessonPlanEditor';
import { LessonPlanList } from './LessonPlanList';

interface WeekInfo {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  session: string;
  term: string;
  term_start_date: string;
  term_end_date: string;
}

interface SubmissionStatus {
  subject_id: string;
  subject_name: string;
  class_id: string;
  class_name: string;
  submitted: boolean;
  status: string;
  lesson_plan_id?: string;
}

export function LessonPlanDashboard() {
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [submissionStatus, setSubmissionStatus] = useState<SubmissionStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEditor, setShowEditor] = useState(false);
  const [showList, setShowList] = useState(false);
  const [selectedSubjectClass, setSelectedSubjectClass] = useState<any>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchCurrentWeek();
  }, []);

  useEffect(() => {
    if (weekInfo) {
      fetchSubmissionStatus();
    }
  }, [weekInfo]);

  const fetchCurrentWeek = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/current-week`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success) {
        setWeekInfo(result.week_info);
      } else {
        toast.error(result.error || 'Failed to fetch current week info');
      }
    } catch (error) {
      console.error('[Current Week] Error:', error);
      toast.error('Failed to fetch current week info');
    } finally {
      setLoading(false);
    }
  };

  const fetchSubmissionStatus = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !weekInfo) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-submission-status?session=${weekInfo.session}&term=${weekInfo.term}&week_number=${weekInfo.weekNumber}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success) {
        setSubmissionStatus(result.submission_status);
      }
    } catch (error) {
      console.error('[Submission Status] Error:', error);
    }
  };

  const handleCreateNew = (subjectClass: SubmissionStatus) => {
    setSelectedSubjectClass(subjectClass);
    setShowEditor(true);
  };

  const handleViewAll = () => {
    setShowList(true);
  };

  const handleCloseEditor = () => {
    setShowEditor(false);
    setSelectedSubjectClass(null);
    fetchSubmissionStatus();
  };

  const handleCloseList = () => {
    setShowList(false);
    fetchSubmissionStatus();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (showEditor) {
    return (
      <LessonPlanEditor
        weekInfo={weekInfo}
        subjectClass={selectedSubjectClass}
        onClose={handleCloseEditor}
      />
    );
  }

  if (showList) {
    return (
      <LessonPlanList
        weekInfo={weekInfo}
        onClose={handleCloseList}
        onEdit={(subjectClass) => {
          setSelectedSubjectClass(subjectClass);
          setShowList(false);
          setShowEditor(true);
        }}
      />
    );
  }

  if (!weekInfo) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            No current academic session/term found. Please contact the administrator.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const submittedCount = submissionStatus.filter(s => s.submitted).length;
  const pendingCount = submissionStatus.filter(s => !s.submitted).length;
  const approvedCount = submissionStatus.filter(s => s.status === 'approved').length;
  const declinedCount = submissionStatus.filter(s => s.status === 'declined').length;

  // Calculate deadline (Friday of current week)
  const deadline = new Date(weekInfo.weekEndDate);
  const today = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  return (
    <div className="space-y-6">
      {/* Mobile App Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">E-Lesson Plans</h1>
              <p className="text-purple-100 text-sm">Weekly submissions</p>
            </div>
          </div>
          <Button onClick={handleViewAll} variant="secondary" size="sm" className="shadow-md">
            <FileText className="h-4 w-4 mr-2" />
            View All
          </Button>
        </div>
      </div>

      {/* Current Week Info */}
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600">Current Week</span>
              </div>
              <p className="text-3xl font-bold text-gray-900">Week {weekInfo.weekNumber}</p>
              <p className="text-sm text-gray-600">
                {new Date(weekInfo.weekStartDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} - {new Date(weekInfo.weekEndDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
              <div className="flex gap-2 mt-2">
                <Badge variant="secondary">{weekInfo.session}</Badge>
                <Badge variant="secondary">{weekInfo.term}</Badge>
              </div>
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 text-orange-600">
                <Clock className="h-5 w-5" />
                <span className="text-sm font-medium">Deadline</span>
              </div>
              <p className="text-2xl font-bold text-gray-900 mt-1">
                {daysUntilDeadline > 0 ? `${daysUntilDeadline} days` : 'Today'}
              </p>
              <p className="text-xs text-gray-600 mt-1">Friday, {new Date(weekInfo.weekEndDate).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Total Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{submissionStatus.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-green-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Submitted</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{submittedCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 border-orange-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-purple-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{approvedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Subjects List */}
      <Card>
        <CardHeader>
          <CardTitle>Subjects - Week {weekInfo.weekNumber} Lesson Plans</CardTitle>
        </CardHeader>
        <CardContent>
          {submissionStatus.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No subject assignments found.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {submissionStatus.map((item) => (
                <div
                  key={`${item.subject_id}_${item.class_id}`}
                  className="flex items-center justify-between p-4 border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">{item.subject_name}</p>
                    <p className="text-sm text-gray-600">{item.class_name}</p>
                  </div>
                  <div className="flex items-center gap-3">
                    {item.status === 'approved' && (
                      <Badge className="bg-green-100 text-green-700 border-green-300">
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Approved
                      </Badge>
                    )}
                    {item.status === 'declined' && (
                      <Badge className="bg-red-100 text-red-700 border-red-300">
                        <XCircle className="h-3 w-3 mr-1" />
                        Declined
                      </Badge>
                    )}
                    {item.status === 'submitted' && (
                      <Badge className="bg-blue-100 text-blue-700 border-blue-300">
                        <Clock className="h-3 w-3 mr-1" />
                        Pending Review
                      </Badge>
                    )}
                    {!item.submitted && (
                      <Badge variant="outline" className="text-gray-600">
                        Not Submitted
                      </Badge>
                    )}
                    <Button
                      onClick={() => handleCreateNew(item)}
                      size="sm"
                      variant={item.submitted ? 'outline' : 'default'}
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      {item.submitted ? 'View/Edit' : 'Create'}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
