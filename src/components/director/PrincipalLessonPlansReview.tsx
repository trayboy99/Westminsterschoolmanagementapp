import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { 
  BookOpen, 
  CheckCircle, 
  XCircle, 
  Clock, 
  Search, 
  Calendar,
  Eye,
  Settings
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
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
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '../ui/tabs';
import { LessonPlanFieldSettings } from './LessonPlanFieldSettings';

interface WeekInfo {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  session: string;
  term: string;
}

export function PrincipalLessonPlansReview() {
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<any[]>([]);
  const [teachers, setTeachers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('submitted');
  const [teacherFilter, setTeacherFilter] = useState('all');
  const [weekFilter, setWeekFilter] = useState('current');
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [showReviewDialog, setShowReviewDialog] = useState(false);
  const [reviewAction, setReviewAction] = useState<'approved' | 'declined'>('approved');
  const [reviewNotes, setReviewNotes] = useState('');
  const [reviewing, setReviewing] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchCurrentWeek();
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (weekInfo) {
      fetchLessonPlans();
    }
  }, [weekInfo, weekFilter]);

  useEffect(() => {
    filterLessonPlans();
  }, [lessonPlans, searchQuery, statusFilter, teacherFilter]);

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
      }
    } catch (error) {
      console.error('[Current Week] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success) {
        setTeachers(result.teachers);
      }
    } catch (error) {
      console.error('[Teachers] Error:', error);
    }
  };

  const fetchLessonPlans = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session || !weekInfo) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plans?session=${weekInfo.session}&term=${weekInfo.term}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success) {
        let plans = result.lesson_plans;
        
        // Filter by week if "current" is selected
        if (weekFilter === 'current') {
          plans = plans.filter((lp: any) => lp.week_number === weekInfo.weekNumber);
        }
        
        setLessonPlans(plans);
      }
    } catch (error) {
      console.error('[Lesson Plans] Error:', error);
    }
  };

  const filterLessonPlans = () => {
    let filtered = [...lessonPlans];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lp => lp.status === statusFilter);
    }

    // Filter by teacher
    if (teacherFilter !== 'all') {
      filtered = filtered.filter(lp => lp.teacher_id === teacherFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lp => 
        lp.teacher_name?.toLowerCase().includes(query) ||
        lp.subject_name?.toLowerCase().includes(query) ||
        lp.class_name?.toLowerCase().includes(query)
      );
    }

    setFilteredPlans(filtered);
  };

  const handleReview = (plan: any, action: 'approved' | 'declined') => {
    setSelectedPlan(plan);
    setReviewAction(action);
    setReviewNotes('');
    setShowReviewDialog(true);
  };

  const submitReview = async () => {
    if (reviewAction === 'declined' && !reviewNotes.trim()) {
      toast.error('Please provide a reason for declining');
      return;
    }

    setReviewing(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plans/review`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            lesson_plan_id: selectedPlan.id,
            action: reviewAction,
            review_notes: reviewNotes
          })
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success(`Lesson plan ${reviewAction}!`);
        setShowReviewDialog(false);
        fetchLessonPlans();
      } else {
        toast.error(result.error || 'Failed to review lesson plan');
      }
    } catch (error) {
      console.error('[Review] Error:', error);
      toast.error('Failed to review lesson plan');
    } finally {
      setReviewing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-700 border-green-300">
            <CheckCircle className="h-3 w-3 mr-1" />
            Approved
          </Badge>
        );
      case 'declined':
        return (
          <Badge className="bg-red-100 text-red-700 border-red-300">
            <XCircle className="h-3 w-3 mr-1" />
            Declined
          </Badge>
        );
      case 'submitted':
        return (
          <Badge className="bg-blue-100 text-blue-700 border-blue-300">
            <Clock className="h-3 w-3 mr-1" />
            Pending Review
          </Badge>
        );
      default:
        return <Badge variant="outline">Draft</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (showSettings) {
    return <LessonPlanFieldSettings onClose={() => setShowSettings(false)} />;
  }

  const pendingCount = lessonPlans.filter(lp => lp.status === 'submitted').length;
  const approvedCount = lessonPlans.filter(lp => lp.status === 'approved').length;
  const declinedCount = lessonPlans.filter(lp => lp.status === 'declined').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">Lesson Plans Review</h1>
              <p className="text-purple-100 text-sm">
                {weekInfo ? `${weekInfo.session} - ${weekInfo.term} | Week ${weekInfo.weekNumber}` : ''}
              </p>
            </div>
          </div>
          <Button onClick={() => setShowSettings(true)} variant="secondary" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </Button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-gray-500 to-gray-600 border-gray-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Total Submissions</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{lessonPlans.length}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Pending Review</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{pendingCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-green-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{approvedCount}</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-red-500 to-red-600 border-red-700">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-white">Declined</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-white">{declinedCount}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="submitted">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
              </SelectContent>
            </Select>
            <Select value={teacherFilter} onValueChange={setTeacherFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by teacher" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Teachers</SelectItem>
                {teachers.map((teacher) => (
                  <SelectItem key={teacher.id} value={teacher.id}>
                    {teacher.first_name} {teacher.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={weekFilter} onValueChange={setWeekFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by week" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="current">Current Week Only</SelectItem>
                <SelectItem value="all">All Weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Plans List */}
      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No lesson plans found.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.subject_name}</h3>
                      {getStatusBadge(plan.status)}
                    </div>
                    <div className="grid md:grid-cols-2 gap-2 text-sm text-gray-600">
                      <p><strong>Teacher:</strong> {plan.teacher_name}</p>
                      <p><strong>Class:</strong> {plan.class_name}</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Week {plan.week_number}</span>
                      </div>
                      {plan.lesson_data?.lesson_title && (
                        <p><strong>Topic:</strong> {plan.lesson_data.lesson_title}</p>
                      )}
                    </div>
                    {plan.submitted_at && (
                      <p className="text-xs text-gray-500">
                        Submitted: {new Date(plan.submitted_at).toLocaleString('en-NG')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col gap-2">
                    <Button
                      onClick={() => {
                        setSelectedPlan(plan);
                        // We'll show details in the dialog
                      }}
                      size="sm"
                      variant="outline"
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    {plan.status === 'submitted' && (
                      <>
                        <Button
                          onClick={() => handleReview(plan, 'approved')}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          onClick={() => handleReview(plan, 'declined')}
                          size="sm"
                          variant="destructive"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Decline
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showReviewDialog} onOpenChange={setShowReviewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {reviewAction === 'approved' ? 'Approve' : 'Decline'} Lesson Plan
            </DialogTitle>
            <DialogDescription>
              {selectedPlan?.subject_name} - {selectedPlan?.teacher_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="review-notes">
                {reviewAction === 'approved' ? 'Comments (optional)' : 'Reason for Decline *'}
              </Label>
              <Textarea
                id="review-notes"
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={reviewAction === 'approved' ? 'Add any comments...' : 'Please provide a clear reason...'}
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowReviewDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitReview}
              disabled={reviewing}
              className={reviewAction === 'approved' ? 'bg-green-600 hover:bg-green-700' : ''}
              variant={reviewAction === 'declined' ? 'destructive' : 'default'}
            >
              {reviewing ? 'Processing...' : reviewAction === 'approved' ? 'Approve' : 'Decline'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
