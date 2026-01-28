import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Calendar, Clock, AlertTriangle, FileText, BookOpen, Timer } from 'lucide-react';

interface UploadDeadline {
  id: string;
  term: string;
  session: string;
  uploadType: 'enote' | 'exam_question' | 'all';
  deadline: string; // ISO string
  enabled: boolean;
  description?: string;
}

interface DeadlineCountdownProps {
  deadlines: UploadDeadline[];
  userRole?: 'teacher' | 'admin' | 'student';
}

interface TimeRemaining {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  total: number;
}

export function DeadlineCountdown({ deadlines, userRole = 'teacher' }: DeadlineCountdownProps) {
  const [timeRemainingMap, setTimeRemainingMap] = useState<Record<string, TimeRemaining>>({});

  const calculateTimeRemaining = (deadlineDate: string): TimeRemaining => {
    const total = Date.parse(deadlineDate) - Date.now();
    
    if (total <= 0) {
      return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0 };
    }

    const seconds = Math.floor((total / 1000) % 60);
    const minutes = Math.floor((total / 1000 / 60) % 60);
    const hours = Math.floor((total / (1000 * 60 * 60)) % 24);
    const days = Math.floor(total / (1000 * 60 * 60 * 24));

    return { days, hours, minutes, seconds, total };
  };

  useEffect(() => {
    // Update countdown every second
    const interval = setInterval(() => {
      const newTimeMap: Record<string, TimeRemaining> = {};
      
      deadlines.forEach(deadline => {
        if (deadline.enabled) {
          newTimeMap[deadline.id] = calculateTimeRemaining(deadline.deadline);
        }
      });
      
      setTimeRemainingMap(newTimeMap);
    }, 1000);

    return () => clearInterval(interval);
  }, [deadlines]);

  // Filter active deadlines (enabled and not expired)
  const activeDeadlines = deadlines.filter(d => {
    const timeRemaining = timeRemainingMap[d.id];
    return d.enabled && timeRemaining && timeRemaining.total > 0;
  });

  if (activeDeadlines.length === 0) {
    return null;
  }

  const getUploadTypeInfo = (type: string) => {
    switch (type) {
      case 'enote':
        return { label: 'E-Notes', icon: BookOpen, color: 'bg-blue-100 text-blue-700' };
      case 'exam_question':
        return { label: 'Exam Questions', icon: FileText, color: 'bg-purple-100 text-purple-700' };
      case 'all':
        return { label: 'All Uploads', icon: AlertTriangle, color: 'bg-red-100 text-red-700' };
      default:
        return { label: 'Uploads', icon: Clock, color: 'bg-gray-100 text-gray-700' };
    }
  };

  const getUrgencyLevel = (time: TimeRemaining) => {
    const hoursRemaining = time.days * 24 + time.hours;
    
    if (hoursRemaining <= 24) {
      return { color: 'border-red-500 bg-red-50', badge: 'destructive' as const, label: 'URGENT' };
    } else if (hoursRemaining <= 72) {
      return { color: 'border-orange-500 bg-orange-50', badge: 'secondary' as const, label: 'SOON' };
    } else {
      return { color: 'border-blue-500 bg-blue-50', badge: 'default' as const, label: 'ACTIVE' };
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Timer className="h-5 w-5 text-red-600" />
        <h3 className="text-base sm:text-lg font-semibold">Active Upload Deadlines</h3>
        <Badge variant="destructive">{activeDeadlines.length}</Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {activeDeadlines.map(deadline => {
          const time = timeRemainingMap[deadline.id];
          if (!time || time.total <= 0) return null;

          const typeInfo = getUploadTypeInfo(deadline.uploadType);
          const urgency = getUrgencyLevel(time);
          const TypeIcon = typeInfo.icon;

          return (
            <Card key={deadline.id} className={`${urgency.color} border-2`}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-lg ${typeInfo.color}`}>
                      <TypeIcon className="h-4 w-4" />
                    </div>
                    <div>
                      <CardTitle className="text-sm font-medium">
                        {typeInfo.label}
                      </CardTitle>
                      <p className="text-xs text-slate-600 mt-0.5">
                        {deadline.term}
                      </p>
                    </div>
                  </div>
                  <Badge variant={urgency.badge} className="text-xs">
                    {urgency.label}
                  </Badge>
                </div>
              </CardHeader>
              
              <CardContent className="space-y-3">
                {/* Countdown Display */}
                <div className="grid grid-cols-4 gap-1.5 sm:gap-2 text-center">
                  <div className="bg-white rounded-lg p-1.5 sm:p-2 border">
                    <div className="text-lg sm:text-2xl font-bold text-slate-900">
                      {time.days}
                    </div>
                    <div className="text-xs text-slate-600">Days</div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 sm:p-2 border">
                    <div className="text-lg sm:text-2xl font-bold text-slate-900">
                      {time.hours}
                    </div>
                    <div className="text-xs text-slate-600">Hours</div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 sm:p-2 border">
                    <div className="text-lg sm:text-2xl font-bold text-slate-900">
                      {time.minutes}
                    </div>
                    <div className="text-xs text-slate-600">Mins</div>
                  </div>
                  <div className="bg-white rounded-lg p-1.5 sm:p-2 border">
                    <div className="text-lg sm:text-2xl font-bold text-slate-900">
                      {time.seconds}
                    </div>
                    <div className="text-xs text-slate-600">Secs</div>
                  </div>
                </div>

                {/* Deadline Date */}
                <div className="flex items-center gap-2 text-xs sm:text-sm">
                  <Calendar className="h-4 w-4 text-slate-500 flex-shrink-0" />
                  <span className="text-slate-700 truncate">
                    {new Date(deadline.deadline).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </span>
                </div>

                {/* Session */}
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {deadline.session}
                  </Badge>
                </div>

                {/* Description */}
                {deadline.description && (
                  <p className="text-xs text-slate-600 italic">
                    {deadline.description}
                  </p>
                )}

                {/* Warning for urgent deadlines */}
                {time.days === 0 && time.hours < 24 && (
                  <Alert className="border-red-300 bg-red-50 py-2">
                    <AlertTriangle className="h-3 w-3 text-red-600" />
                    <AlertDescription className="text-xs text-red-800">
                      <strong>Final hours!</strong> Upload access will be blocked after deadline.
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Summary Alert */}
      {userRole === 'teacher' && (
        <Alert className="border-amber-300 bg-amber-50">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertDescription className="text-amber-900">
            <strong>Important:</strong> You will not be able to upload materials after these deadlines. 
            Please ensure all required uploads are submitted before the deadline expires.
          </AlertDescription>
        </Alert>
      )}

      {userRole === 'admin' && (
        <Alert className="border-blue-300 bg-blue-50">
          <Clock className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-900">
            These deadlines are currently active. Teachers cannot upload materials after the deadline expires. 
            You can modify deadlines in Settings.
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
