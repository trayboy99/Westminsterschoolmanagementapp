import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { ArrowLeft, Search, Calendar, CheckCircle, XCircle, Clock, FileText, Trash2 } from 'lucide-react';
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

interface LessonPlanListProps {
  weekInfo: any;
  onClose: () => void;
  onEdit: (subjectClass: any) => void;
}

export function LessonPlanList({ weekInfo, onClose, onEdit }: LessonPlanListProps) {
  const [lessonPlans, setLessonPlans] = useState<any[]>([]);
  const [filteredPlans, setFilteredPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const supabase = createClient();

  useEffect(() => {
    fetchLessonPlans();
  }, []);

  useEffect(() => {
    filterLessonPlans();
  }, [lessonPlans, searchQuery, statusFilter]);

  const fetchLessonPlans = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

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
        setLessonPlans(result.lesson_plans);
      } else {
        toast.error(result.error || 'Failed to fetch lesson plans');
      }
    } catch (error) {
      console.error('[Lesson Plans] Error:', error);
      toast.error('Failed to fetch lesson plans');
    } finally {
      setLoading(false);
    }
  };

  const filterLessonPlans = () => {
    let filtered = [...lessonPlans];

    // Filter by status
    if (statusFilter !== 'all') {
      filtered = filtered.filter(lp => lp.status === statusFilter);
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(lp => 
        lp.subject_name?.toLowerCase().includes(query) ||
        lp.class_name?.toLowerCase().includes(query) ||
        `week ${lp.week_number}`.includes(query)
      );
    }

    setFilteredPlans(filtered);
  };

  const handleDelete = async (lessonPlanId: string) => {
    if (!confirm('Are you sure you want to delete this lesson plan?')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/lesson-plans/${lessonPlanId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const result = await res.json();
      if (result.success) {
        toast.success('Lesson plan deleted');
        fetchLessonPlans();
      } else {
        toast.error(result.error || 'Failed to delete lesson plan');
      }
    } catch (error) {
      console.error('[Delete] Error:', error);
      toast.error('Failed to delete lesson plan');
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
        return (
          <Badge variant="outline" className="text-gray-600">
            <FileText className="h-3 w-3 mr-1" />
            Draft
          </Badge>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button onClick={onClose} variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h2 className="text-2xl font-bold">All Lesson Plans</h2>
            <p className="text-sm text-gray-600">{weekInfo.session} - {weekInfo.term}</p>
          </div>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by subject, class, or week..."
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="submitted">Pending Review</SelectItem>
                <SelectItem value="approved">Approved</SelectItem>
                <SelectItem value="declined">Declined</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Lesson Plans Grid */}
      {filteredPlans.length === 0 ? (
        <Card>
          <CardContent className="py-12">
            <div className="text-center text-gray-500">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No lesson plans found.</p>
              {searchQuery || statusFilter !== 'all' ? (
                <Button
                  variant="link"
                  onClick={() => {
                    setSearchQuery('');
                    setStatusFilter('all');
                  }}
                  className="mt-2"
                >
                  Clear filters
                </Button>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredPlans.map((plan) => (
            <Card key={plan.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-5">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900">{plan.subject_name}</h3>
                      {getStatusBadge(plan.status)}
                    </div>
                    <div className="space-y-1 text-sm text-gray-600">
                      <p><strong>Class:</strong> {plan.class_name}</p>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Week {plan.week_number} ({new Date(plan.week_start_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })} - {new Date(plan.week_end_date).toLocaleDateString('en-NG', { month: 'short', day: 'numeric' })})</span>
                      </div>
                      {plan.lesson_data?.lesson_title && (
                        <p><strong>Topic:</strong> {plan.lesson_data.lesson_title}</p>
                      )}
                      {plan.status === 'declined' && plan.review_notes && (
                        <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
                          <p className="text-xs font-semibold text-red-800">Decline Reason:</p>
                          <p className="text-xs text-red-700">{plan.review_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 ml-4">
                    <Button
                      onClick={() => onEdit({
                        subject_id: plan.subject_id,
                        subject_name: plan.subject_name,
                        class_id: plan.class_id,
                        class_name: plan.class_name
                      })}
                      size="sm"
                      variant="outline"
                    >
                      {plan.status === 'approved' ? 'View' : 'Edit'}
                    </Button>
                    {plan.status === 'draft' && (
                      <Button
                        onClick={() => handleDelete(plan.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Summary */}
      <Card className="bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-4">
          <div className="flex items-center justify-around text-center">
            <div>
              <p className="text-2xl font-bold text-gray-900">{lessonPlans.length}</p>
              <p className="text-xs text-gray-600">Total Plans</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div>
              <p className="text-2xl font-bold text-green-600">{lessonPlans.filter(lp => lp.status === 'approved').length}</p>
              <p className="text-xs text-gray-600">Approved</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div>
              <p className="text-2xl font-bold text-blue-600">{lessonPlans.filter(lp => lp.status === 'submitted').length}</p>
              <p className="text-xs text-gray-600">Pending</p>
            </div>
            <div className="w-px h-8 bg-gray-300"></div>
            <div>
              <p className="text-2xl font-bold text-gray-600">{lessonPlans.filter(lp => lp.status === 'draft').length}</p>
              <p className="text-xs text-gray-600">Drafts</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
