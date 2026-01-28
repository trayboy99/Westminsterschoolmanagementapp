import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Skeleton } from './ui/skeleton';
import { Activity, User, Calendar, FileText, Key, DollarSign, Loader2 } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface ActivityItem {
  id: string;
  action: string;
  user: string;
  role: string;
  timestamp: string;
  type: 'user' | 'exam' | 'result' | 'pin' | 'finance' | 'system';
  details: string;
}

const mockActivities: ActivityItem[] = [
  {
    id: '1',
    action: 'Result Published',
    user: 'Dr. Sarah Johnson',
    role: 'Principal',
    timestamp: '15 minutes ago',
    type: 'result',
    details: 'Published Grade 11 Chemistry results for 45 students'
  },
  {
    id: '2',
    action: 'PIN Generated',
    user: 'Mr. Ahmed Hassan',
    role: 'Teacher',
    timestamp: '1 hour ago',
    type: 'pin',
    details: 'Generated 25 result access PINs for Grade 10-A'
  },
  {
    id: '3',
    action: 'New Teacher Added',
    user: 'Ms. Rebecca Smith',
    role: 'Secretary',
    timestamp: '2 hours ago',
    type: 'user',
    details: 'Added new teacher: Dr. Michael Brown (Mathematics)'
  },
  {
    id: '4',
    action: 'Exam Scheduled',
    user: 'Dr. Maria Santos',
    role: 'Teacher',
    timestamp: '3 hours ago',
    type: 'exam',
    details: 'Scheduled Physics final exam for Grade 12 - December 15th'
  },
  {
    id: '5',
    action: 'Fee Payment Recorded',
    user: 'Mr. John Davis',
    role: 'Finance Officer',
    timestamp: '4 hours ago',
    type: 'finance',
    details: 'Recorded payment of $1,200 for student ID: STU-2024-0156'
  },
  {
    id: '6',
    action: 'System Backup',
    user: 'System',
    role: 'Automated',
    timestamp: '6 hours ago',
    type: 'system',
    details: 'Daily database backup completed successfully'
  }
];

function getActivityIcon(type: string) {
  switch (type) {
    case 'user': return <User className="h-4 w-4" />;
    case 'exam': return <Calendar className="h-4 w-4" />;
    case 'result': return <FileText className="h-4 w-4" />;
    case 'pin': return <Key className="h-4 w-4" />;
    case 'finance': return <DollarSign className="h-4 w-4" />;
    case 'system': return <Activity className="h-4 w-4" />;
    default: return <Activity className="h-4 w-4" />;
  }
}

function getActivityColor(type: string) {
  switch (type) {
    case 'user': return 'bg-blue-100 text-blue-800';
    case 'exam': return 'bg-purple-100 text-purple-800';
    case 'result': return 'bg-green-100 text-green-800';
    case 'pin': return 'bg-orange-100 text-orange-800';
    case 'finance': return 'bg-emerald-100 text-emerald-800';
    case 'system': return 'bg-slate-100 text-slate-800';
    default: return 'bg-slate-100 text-slate-800';
  }
}

export function ActivityLog() {
  const [loading, setLoading] = useState(true);
  const [activities, setActivities] = useState<ActivityItem[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchRecentActivity();
  }, []);

  const fetchRecentActivity = async () => {
    try {
      setLoading(true);
      
      // For now, use mock data since audit logs backend endpoint doesn't exist yet
      // When backend endpoint is ready, follow the same pattern as teachers/students
      console.log('[ActivityLog] Using mock data - backend endpoint not implemented yet');
      
      // Simulate API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setActivities(mockActivities);
    } catch (error) {
      console.error('[ActivityLog] Error:', error);
      setActivities(mockActivities);
    } finally {
      setLoading(false);
    }
  };

  const getActivityType = (action: string): ActivityItem['type'] => {
    const actionLower = action.toLowerCase();
    if (actionLower.includes('user') || actionLower.includes('teacher') || actionLower.includes('student')) return 'user';
    if (actionLower.includes('exam')) return 'exam';
    if (actionLower.includes('result') || actionLower.includes('mark')) return 'result';
    if (actionLower.includes('pin')) return 'pin';
    if (actionLower.includes('fee') || actionLower.includes('payment')) return 'finance';
    return 'system';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="flex items-start gap-3 p-3 border rounded-lg">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-3 w-full" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Activity
        </CardTitle>
      </CardHeader>
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <Activity className="h-12 w-12 mx-auto mb-2 opacity-50" />
            <p>No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 border rounded-lg hover:bg-slate-50 transition-colors">
                <div className={`p-2 rounded-full ${getActivityColor(activity.type)}`}>
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="font-medium text-sm">{activity.action}</h4>
                    <span className="text-xs text-slate-500">{activity.timestamp}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-1">{activity.details}</p>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">by {activity.user}</span>
                    <Badge variant="secondary" className="text-xs">
                      {activity.role}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        <div className="mt-4 pt-4 border-t">
          <button className="w-full text-sm text-blue-600 hover:text-blue-700 transition-colors">
            View Complete Activity Log
          </button>
        </div>
      </CardContent>
    </Card>
  );
}