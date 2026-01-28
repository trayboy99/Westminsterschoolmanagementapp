import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { 
  Plus, 
  FileText, 
  Key, 
  Upload, 
  Calendar, 
  Users, 
  GraduationCap,
  MessageSquare,
  Clock
} from 'lucide-react';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<any>;
  color: string;
  action: () => void;
}

interface QuickActionsProps {
  onNavigate?: (section: string) => void;
}

export function QuickActions({ onNavigate }: QuickActionsProps) {
  const actions: QuickAction[] = [
    {
      id: 'create-exam',
      title: 'Create New Exam',
      description: 'Schedule a new examination',
      icon: Calendar,
      color: 'bg-blue-500 hover:bg-blue-600',
      action: () => onNavigate?.('exams')
    },
    {
      id: 'publish-results',
      title: 'Publish Results',
      description: 'Publish approved exam results',
      icon: FileText,
      color: 'bg-green-500 hover:bg-green-600',
      action: () => onNavigate?.('settings')
    },
    {
      id: 'generate-pins',
      title: 'Generate PINs',
      description: 'Create result access PINs',
      icon: Key,
      color: 'bg-purple-500 hover:bg-purple-600',
      action: () => onNavigate?.('pins')
    },
    {
      id: 'manage-timetable',
      title: 'Manage Timetable',
      description: 'Create and edit class schedules',
      icon: Clock,
      color: 'bg-cyan-500 hover:bg-cyan-600',
      action: () => onNavigate?.('timetable')
    },
    {
      id: 'upload-materials',
      title: 'Upload Materials',
      description: 'Share e-notes and resources',
      icon: Upload,
      color: 'bg-indigo-500 hover:bg-indigo-600',
      action: () => onNavigate?.('uploads')
    },
    {
      id: 'add-teacher',
      title: 'Add Teacher',
      description: 'Register new teaching staff',
      icon: Users,
      color: 'bg-orange-500 hover:bg-orange-600',
      action: () => onNavigate?.('teachers')
    },
    {
      id: 'enroll-student',
      title: 'Enroll Student',
      description: 'Add new student to system',
      icon: GraduationCap,
      color: 'bg-teal-500 hover:bg-teal-600',
      action: () => onNavigate?.('students')
    },
    {
      id: 'send-announcement',
      title: 'Send Announcement',
      description: 'Broadcast to school community',
      icon: MessageSquare,
      color: 'bg-pink-500 hover:bg-pink-600',
      action: () => onNavigate?.('comments')
    },
    {
      id: 'bulk-operations',
      title: 'Manage Marks',
      description: 'Enter and approve student marks',
      icon: Plus,
      color: 'bg-slate-500 hover:bg-slate-600',
      action: () => onNavigate?.('marks')
    }
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5" />
          Quick Actions
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {actions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.id}
                variant="outline"
                className="h-auto p-4 flex flex-col items-start gap-2 hover:shadow-md transition-all"
                onClick={action.action}
              >
                <div className={`p-2 rounded-lg text-white ${action.color}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <h4 className="font-medium text-sm">{action.title}</h4>
                  <p className="text-xs text-slate-600 mt-1">{action.description}</p>
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}