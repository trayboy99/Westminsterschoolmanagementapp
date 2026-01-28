import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { CheckCircle, XCircle, Clock, Eye, UserPlus, Loader2 } from 'lucide-react';
import { PendingRegistrationsManager } from './auth/PendingRegistrationsManager';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface Approval {
  id: string;
  type: 'result' | 'exam' | 'promotion' | 'comment';
  title: string;
  teacher: string;
  class: string;
  subject?: string;
  submittedAt: string;
  priority: 'high' | 'medium' | 'low';
}

const mockApprovals: Approval[] = [
  {
    id: '1',
    type: 'result',
    title: 'Grade 10 Mathematics Mid-term Results',
    teacher: 'Mr. Ahmed Hassan',
    class: 'Grade 10-A',
    subject: 'Mathematics',
    submittedAt: '2 hours ago',
    priority: 'high'
  },
  {
    id: '2',
    type: 'exam',
    title: 'Grade 12 Physics Final Exam Schedule',
    teacher: 'Dr. Maria Santos',
    class: 'Grade 12-B',
    subject: 'Physics',
    submittedAt: '4 hours ago',
    priority: 'medium'
  },
  {
    id: '3',
    type: 'promotion',
    title: 'Grade 9 to Grade 10 Promotion List',
    teacher: 'Ms. Jennifer Chen',
    class: 'Grade 9-C',
    submittedAt: '1 day ago',
    priority: 'high'
  },
  {
    id: '4',
    type: 'comment',
    title: 'Behavioral Comments - Quarter 2',
    teacher: 'Mr. David Wilson',
    class: 'Grade 8-A',
    submittedAt: '2 days ago',
    priority: 'low'
  }
];

function getTypeIcon(type: string) {
  switch (type) {
    case 'result': return '📊';
    case 'exam': return '📝';
    case 'promotion': return '⬆️';
    case 'comment': return '💬';
    default: return '📄';
  }
}

function getPriorityColor(priority: string) {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-800 border-red-200';
    case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    case 'low': return 'bg-green-100 text-green-800 border-green-200';
    default: return 'bg-slate-100 text-slate-800 border-slate-200';
  }
}

export function PendingApprovals() {
  const [loading, setLoading] = useState(true);
  const [approvals, setApprovals] = useState<Approval[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchPendingApprovals();
  }, []);

  const fetchPendingApprovals = async () => {
    try {
      setLoading(true);
      
      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('[PendingApprovals] Not authenticated');
        setLoading(false);
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      console.log('[PendingApprovals] Fetching marks with status=submitted...');

      // Fetch marks with status='submitted' (pending approval)
      const { data: marks, error } = await supabase
        .from('marks')
        .select('exam_id, subject_id, type, student_id, created_at, updated_at, submitted_by')
        .eq('status', 'submitted')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('[PendingApprovals] Error fetching marks:', error);
        setApprovals([]);
        setLoading(false);
        return;
      }

      if (!marks || marks.length === 0) {
        console.log('[PendingApprovals] No pending approvals found');
        setApprovals([]);
        setLoading(false);
        return;
      }

      // Group marks by exam_id + subject_id to get unique submissions
      const grouped = new Map<string, any>();
      marks.forEach((mark: any) => {
        const key = `${mark.exam_id}_${mark.subject_id}`;
        if (!grouped.has(key)) {
          grouped.set(key, {
            exam_id: mark.exam_id,
            subject_id: mark.subject_id,
            type: mark.type,
            updated_at: mark.updated_at || mark.created_at,
            submitted_by: mark.submitted_by,
            student_count: 0
          });
        }
        grouped.get(key).student_count++;
      });

      // Fetch details for each unique submission
      const uniqueSubmissions = Array.from(grouped.values());
      console.log('[PendingApprovals] Found unique submissions:', uniqueSubmissions.length);

      // Fetch exam details
      const examIds = [...new Set(uniqueSubmissions.map(s => s.exam_id))];
      const { data: exams } = await supabase
        .from('exams')
        .select('id, name, term, session, class_id')
        .in('id', examIds);

      // Fetch subject details
      const subjectIds = [...new Set(uniqueSubmissions.map(s => s.subject_id))];
      const { data: subjects } = await supabase
        .from('subjects')
        .select('id, name')
        .in('id', subjectIds);

      // Fetch class details for exams
      const classIds = exams ? [...new Set(exams.map(e => e.class_id).filter(Boolean))] : [];
      const { data: classes } = classIds.length > 0 ? await supabase
        .from('classes')
        .select('id, name, section')
        .in('id', classIds) : { data: [] };

      // Fetch teacher details
      const teacherIds = [...new Set(uniqueSubmissions.map(s => s.submitted_by).filter(Boolean))];
      const { data: teachers } = teacherIds.length > 0 ? await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .in('id', teacherIds) : { data: [] };

      // Create lookup maps
      const examMap = new Map(exams?.map(e => [e.id, e]) || []);
      const subjectMap = new Map(subjects?.map(s => [s.id, s]) || []);
      const classMap = new Map(classes?.map(c => [c.id, c]) || []);
      const teacherMap = new Map(teachers?.map(t => [t.id, t]) || []);

      // Format approvals
      const formattedApprovals: Approval[] = uniqueSubmissions.slice(0, 5).map((submission) => {
        const exam = examMap.get(submission.exam_id);
        const subject = subjectMap.get(submission.subject_id);
        const classData = exam?.class_id ? classMap.get(exam.class_id) : null;
        const teacher = teacherMap.get(submission.submitted_by);

        const className = classData 
          ? `${classData.name}${classData.section ? `-${classData.section}` : ''}`
          : 'Unknown Class';
        
        const subjectName = subject?.name || 'Unknown Subject';
        const teacherName = teacher 
          ? `${teacher.first_name} ${teacher.last_name}`.trim()
          : 'Unknown Teacher';
        
        const examType = submission.type || 'exam';
        const examTypeName = examType === 'midterm' ? 'Mid-term' : 'Terminal';

        // Calculate time ago
        const updatedDate = new Date(submission.updated_at);
        const now = new Date();
        const diffMs = now.getTime() - updatedDate.getTime();
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);
        
        let timeAgo = '';
        if (diffMins < 60) {
          timeAgo = diffMins <= 1 ? 'just now' : `${diffMins} minutes ago`;
        } else if (diffHours < 24) {
          timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
        } else {
          timeAgo = diffDays === 1 ? '1 day ago' : `${diffDays} days ago`;
        }

        return {
          id: `${submission.exam_id}_${submission.subject_id}`,
          type: 'result',
          title: `${className} ${subjectName} ${examTypeName} Results`,
          teacher: teacherName,
          class: className,
          subject: subjectName,
          submittedAt: timeAgo,
          priority: 'high' as const
        };
      });

      console.log('[PendingApprovals] Formatted approvals:', formattedApprovals);
      setApprovals(formattedApprovals);
    } catch (error) {
      console.error('[PendingApprovals] Error:', error);
      setApprovals([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* User Registration Approvals */}
      <PendingRegistrationsManager />
      
      {/* Academic Approvals */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Academic Approvals
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="space-y-2">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-4 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-4 w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : approvals.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <CheckCircle className="h-12 w-12 mx-auto mb-2 opacity-50 text-green-500" />
              <p className="font-medium">All Caught Up!</p>
              <p className="text-sm">No pending academic approvals</p>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {approvals.map((approval) => (
                  <div key={approval.id} className="border rounded-lg p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">{getTypeIcon(approval.type)}</span>
                          <h4 className="font-medium">{approval.title}</h4>
                          <Badge className={getPriorityColor(approval.priority)}>
                            {approval.priority}
                          </Badge>
                        </div>
                        <div className="text-sm text-slate-600 space-y-1">
                          <p>Teacher: {approval.teacher}</p>
                          <p>Class: {approval.class}</p>
                          {approval.subject && <p>Subject: {approval.subject}</p>}
                          <p>Submitted: {approval.submittedAt}</p>
                        </div>
                      </div>
                      <div className="flex gap-2 ml-4">
                        <Button size="sm" variant="outline">
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-green-600 hover:text-green-700">
                          <CheckCircle className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline" className="text-red-600 hover:text-red-700">
                          <XCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t">
                <Button variant="outline" className="w-full">
                  View All Academic Approvals ({approvals.length})
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}