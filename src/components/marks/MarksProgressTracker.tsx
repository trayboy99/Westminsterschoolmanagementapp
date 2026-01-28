import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Progress } from '../ui/progress';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { 
  CheckCircle, 
  Clock, 
  AlertCircle, 
  Users, 
  BookOpen,
  Calendar,
  TrendingUp,
  RefreshCw
} from 'lucide-react';

interface ClassProgress {
  classId: string;
  className: string;
  subjects: SubjectProgress[];
  overallProgress: number;
  totalTeachers: number;
  submittedTeachers: number;
  pendingTeachers: number;
}

interface ExamProgress {
  examId: string;
  examName: string;
  studentsWithMarks: number;
  progress: number;
}

interface SubjectProgress {
  subjectId: string;
  subjectName: string;
  teacher: string;
  teacherId: string;
  status: 'not_started' | 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  midtermProgress: number;  // Percentage of students with midterm marks
  terminalProgress: number; // Percentage of students with terminal marks
  overallProgress: number;
  totalStudents: number;
  examProgresses?: ExamProgress[]; // Per-exam breakdown
  lastUpdated: Date;
  dueDate: Date;
}

interface MarksProgressTrackerProps {
  classProgresses: ClassProgress[];
  onViewDetails: (classId: string, subjectId?: string) => void;
  onSendReminder: (teacherId: string, subjectId: string) => void;
  onRefresh?: () => void;
}

const mockClassProgresses: ClassProgress[] = [
  {
    classId: '1',
    className: 'Grade 10-A',
    overallProgress: 75,
    totalTeachers: 8,
    submittedTeachers: 6,
    pendingTeachers: 2,
    subjects: [
      {
        subjectId: '1',
        subjectName: 'Mathematics',
        teacher: 'Dr. Ahmed Hassan',
        teacherId: 'T001',
        status: 'approved',
        midtermProgress: 100,
        terminalProgress: 100,
        overallProgress: 100,
        lastUpdated: new Date(2024, 8, 15),
        dueDate: new Date(2024, 8, 20)
      },
      {
        subjectId: '2',
        subjectName: 'English Language',
        teacher: 'Ms. Sarah Wilson',
        teacherId: 'T002',
        status: 'submitted',
        midtermProgress: 100,
        terminalProgress: 80,
        overallProgress: 90,
        lastUpdated: new Date(2024, 8, 18),
        dueDate: new Date(2024, 8, 20)
      },
      {
        subjectId: '3',
        subjectName: 'Physics',
        teacher: 'Dr. Maria Santos',
        teacherId: 'T003',
        status: 'draft',
        midtermProgress: 100,
        terminalProgress: 30,
        overallProgress: 65,
        lastUpdated: new Date(2024, 8, 16),
        dueDate: new Date(2024, 8, 20)
      },
      {
        subjectId: '4',
        subjectName: 'Chemistry',
        teacher: 'Dr. James Brown',
        teacherId: 'T004',
        status: 'not_started',
        midtermProgress: 100,
        terminalProgress: 0,
        overallProgress: 50,
        lastUpdated: new Date(2024, 8, 10),
        dueDate: new Date(2024, 8, 20)
      }
    ]
  },
  {
    classId: '2',
    className: 'Grade 10-B',
    overallProgress: 60,
    totalTeachers: 8,
    submittedTeachers: 4,
    pendingTeachers: 4,
    subjects: [
      {
        subjectId: '5',
        subjectName: 'Mathematics',
        teacher: 'Mr. John Davis',
        teacherId: 'T005',
        status: 'reviewed',
        midtermProgress: 100,
        terminalProgress: 85,
        overallProgress: 92,
        lastUpdated: new Date(2024, 8, 17),
        dueDate: new Date(2024, 8, 20)
      },
      {
        subjectId: '6',
        subjectName: 'English Language',
        teacher: 'Ms. Jennifer Chen',
        teacherId: 'T006',
        status: 'draft',
        midtermProgress: 100,
        terminalProgress: 20,
        overallProgress: 60,
        lastUpdated: new Date(2024, 8, 14),
        dueDate: new Date(2024, 8, 20)
      }
    ]
  }
];

export function MarksProgressTracker({ 
  classProgresses = [], 
  onViewDetails, 
  onSendReminder,
  onRefresh
}: MarksProgressTrackerProps) {
  
  const getStatusBadge = (status: string) => {
    const config = {
      not_started: { variant: 'outline' as const, color: 'text-slate-600', icon: Clock },
      draft: { variant: 'secondary' as const, color: 'text-orange-600', icon: Clock },
      submitted: { variant: 'default' as const, color: 'text-blue-600', icon: CheckCircle },
      reviewed: { variant: 'default' as const, color: 'text-purple-600', icon: CheckCircle },
      approved: { variant: 'default' as const, color: 'text-green-600', icon: CheckCircle },
      rejected: { variant: 'destructive' as const, color: 'text-red-600', icon: AlertCircle }
    };
    
    const statusConfig = config[status as keyof typeof config] || config.not_started;
    const Icon = statusConfig.icon;
    
    return (
      <Badge variant={statusConfig.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
      </Badge>
    );
  };

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500';
    if (progress >= 70) return 'bg-blue-500';
    if (progress >= 50) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const isOverdue = (dueDate: Date) => {
    return new Date() > dueDate;
  };

  const getDaysUntilDue = (dueDate: Date) => {
    const diff = dueDate.getTime() - new Date().getTime();
    return Math.ceil(diff / (1000 * 3600 * 24));
  };

  // Calculate midterm and terminal progress across all subjects
  const allSubjects = classProgresses.flatMap(cls => cls.subjects);
  const midtermAvg = allSubjects.length > 0
    ? Math.round(allSubjects.reduce((sum, s) => sum + s.midtermProgress, 0) / allSubjects.length)
    : 0;
  const terminalAvg = allSubjects.length > 0
    ? Math.round(allSubjects.reduce((sum, s) => sum + s.terminalProgress, 0) / allSubjects.length)
    : 0;

  const overallStats = {
    totalClasses: classProgresses.length,
    totalTeachers: classProgresses.reduce((sum, cls) => sum + cls.totalTeachers, 0),
    submittedTeachers: classProgresses.reduce((sum, cls) => sum + cls.submittedTeachers, 0),
    averageProgress: classProgresses.length > 0 
      ? Math.round(classProgresses.reduce((sum, cls) => sum + cls.overallProgress, 0) / classProgresses.length)
      : 0,
    midtermAverage: midtermAvg,
    terminalAverage: terminalAvg,
    completionRate: 0 // Will calculate below
  };
  
  // Calculate completion rate (teachers who submitted both midterm and terminal)
  overallStats.completionRate = overallStats.totalTeachers > 0
    ? Math.round((overallStats.submittedTeachers / overallStats.totalTeachers) * 100)
    : 0;

  // Show empty state if no data
  if (classProgresses.length === 0) {
    return (
      <div className="space-y-6">
        <Card>
          <CardContent className="p-12 text-center">
            <AlertCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-xl font-medium text-slate-600 mb-2">No Progress Data Available</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              No active exams found or no marks have been entered yet. Progress tracking will appear here once teachers start entering marks.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Refresh Button */}
      {onRefresh && (
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold">Class Progress Tracking</h2>
            <p className="text-sm text-slate-600">Monitor marks entry progress by class and subject</p>
          </div>
          <Button variant="outline" onClick={onRefresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh Data
          </Button>
        </div>
      )}
      
      {/* Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-100 rounded-lg">
                <BookOpen className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-600">Total Classes</p>
                <p className="text-2xl font-bold">{overallStats.totalClasses}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Teachers Submitted</p>
                <p className="text-2xl font-bold">
                  {overallStats.submittedTeachers}/{overallStats.totalTeachers}
                </p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                    <span>M: {overallStats.midtermAverage}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span>T: {overallStats.terminalAverage}%</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-green-100 rounded-lg">
                <Users className="h-5 w-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Average Progress</p>
                <p className="text-2xl font-bold">{overallStats.averageProgress}%</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                    <span>Midterm: {overallStats.midtermAverage}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-violet-500"></div>
                    <span>Terminal: {overallStats.terminalAverage}%</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-purple-100 rounded-lg">
                <TrendingUp className="h-5 w-5 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="text-sm text-slate-600 mb-1">Completion Rate</p>
                <p className="text-2xl font-bold">{overallStats.completionRate}%</p>
                <div className="flex items-center gap-3 mt-2 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                    <span>Midterm: {overallStats.midtermAverage}%</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                    <span>Terminal: {overallStats.terminalAverage}%</span>
                  </div>
                </div>
              </div>
              <div className="p-2 bg-orange-100 rounded-lg">
                <Calendar className="h-5 w-5 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Class Progress Cards */}
      <div className="space-y-4">
        {classProgresses.map((classProgress) => (
          <Card key={classProgress.classId}>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  {classProgress.className}
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="text-sm text-slate-600">
                    Progress: {classProgress.overallProgress}%
                  </div>
                  <Progress 
                    value={classProgress.overallProgress} 
                    className="w-32"
                  />
                </div>
              </div>
              <div className="flex items-center gap-6 text-sm text-slate-600">
                <div className="flex items-center gap-1">
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  {classProgress.submittedTeachers} Submitted
                </div>
                <div className="flex items-center gap-1">
                  <Clock className="h-4 w-4 text-orange-600" />
                  {classProgress.pendingTeachers} Pending
                </div>
                <div className="flex items-center gap-1">
                  <Users className="h-4 w-4 text-blue-600" />
                  {classProgress.totalTeachers} Total Teachers
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 font-medium">Subject</th>
                      <th className="text-left py-2 font-medium">Teacher</th>
                      <th className="text-center py-2 font-medium">Status</th>
                      <th className="text-center py-2 font-medium">Midterm</th>
                      <th className="text-center py-2 font-medium">Terminal</th>
                      <th className="text-center py-2 font-medium">Overall</th>
                      <th className="text-center py-2 font-medium">Due Date</th>
                      <th className="text-center py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classProgress.subjects.map((subject) => (
                      <tr key={subject.subjectId} className="border-b hover:bg-slate-50">
                        <td className="py-3 font-medium">{subject.subjectName}</td>
                        <td className="py-3">{subject.teacher}</td>
                        <td className="py-3 text-center">
                          {getStatusBadge(subject.status)}
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={subject.midtermProgress} className="w-16 h-2" />
                            <span className="text-xs">{subject.midtermProgress}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Progress value={subject.terminalProgress} className="w-16 h-2" />
                            <span className="text-xs">{subject.terminalProgress}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className={`w-16 h-2 bg-slate-200 rounded-full overflow-hidden`}>
                              <div 
                                className={`h-full ${getProgressColor(subject.overallProgress)} transition-all`}
                                style={{ width: `${subject.overallProgress}%` }}
                              />
                            </div>
                            <span className="text-xs font-medium">{subject.overallProgress}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className={`text-xs ${isOverdue(subject.dueDate) ? 'text-red-600 font-medium' : 'text-slate-600'}`}>
                            {subject.dueDate.toLocaleDateString()}
                            {isOverdue(subject.dueDate) && (
                              <div className="text-red-600">Overdue</div>
                            )}
                            {!isOverdue(subject.dueDate) && getDaysUntilDue(subject.dueDate) <= 3 && (
                              <div className="text-orange-600">{getDaysUntilDue(subject.dueDate)} days left</div>
                            )}
                          </div>
                        </td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => onViewDetails(classProgress.classId, subject.subjectId)}
                            >
                              View
                            </Button>
                            {subject.status === 'not_started' || subject.status === 'draft' ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => onSendReminder(subject.teacherId, subject.subjectId)}
                              >
                                Remind
                              </Button>
                            ) : null}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}