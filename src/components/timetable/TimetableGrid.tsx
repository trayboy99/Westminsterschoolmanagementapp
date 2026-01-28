import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  Download, 
  Edit, 
  RefreshCw, 
  Eye, 
  Calendar,
  Clock,
  User,
  BookOpen,
  GraduationCap
} from 'lucide-react';

export interface TimetableSlot {
  id: string;
  period: number;
  day: string;
  subject: string;
  teacher: string;
  class: string;
  room?: string;
  isBreak?: boolean;
  breakType?: string;
  startTime: string;
  endTime: string;
}

interface TimetableGridProps {
  timetable: TimetableSlot[];
  mode: 'admin' | 'teacher' | 'student';
  onEdit?: (slot: TimetableSlot) => void;
  onExport?: (format: 'pdf' | 'excel') => void;
  className?: string;
  teacherFilter?: string;
}

const mockTimetable: TimetableSlot[] = [
  // Monday
  { id: '1', period: 1, day: 'Monday', subject: 'Mathematics', teacher: 'Dr. Ahmed Hassan', class: 'Grade 10-A', room: 'Room 101', startTime: '08:00', endTime: '08:45' },
  { id: '2', period: 2, day: 'Monday', subject: 'English', teacher: 'Ms. Sarah Wilson', class: 'Grade 10-A', room: 'Room 102', startTime: '08:45', endTime: '09:30' },
  { id: '3', period: 3, day: 'Monday', subject: 'Science', teacher: 'Dr. Maria Santos', class: 'Grade 10-A', room: 'Lab 1', startTime: '09:30', endTime: '10:15' },
  { id: '4', period: 4, day: 'Monday', subject: 'Break', teacher: '', class: 'Grade 10-A', isBreak: true, breakType: 'Morning Break', startTime: '10:15', endTime: '10:30' },
  { id: '5', period: 5, day: 'Monday', subject: 'History', teacher: 'Mr. John Davis', class: 'Grade 10-A', room: 'Room 105', startTime: '10:30', endTime: '11:15' },
  { id: '6', period: 6, day: 'Monday', subject: 'Geography', teacher: 'Ms. Jennifer Chen', class: 'Grade 10-A', room: 'Room 106', startTime: '11:15', endTime: '12:00' },
  { id: '7', period: 7, day: 'Monday', subject: 'Lunch Break', teacher: '', class: 'Grade 10-A', isBreak: true, breakType: 'Lunch', startTime: '12:00', endTime: '13:00' },
  { id: '8', period: 8, day: 'Monday', subject: 'Art', teacher: 'Ms. Lisa Brown', class: 'Grade 10-A', room: 'Art Studio', startTime: '13:00', endTime: '13:45' },
  { id: '9', period: 9, day: 'Monday', subject: 'Physical Education', teacher: 'Mr. Mike Johnson', class: 'Grade 10-A', room: 'Gymnasium', startTime: '13:45', endTime: '14:30' },

  // Tuesday
  { id: '10', period: 1, day: 'Tuesday', subject: 'Science Lab', teacher: 'Dr. Maria Santos', class: 'Grade 10-A', room: 'Lab 1', startTime: '08:00', endTime: '09:30' },
  { id: '11', period: 3, day: 'Tuesday', subject: 'Mathematics', teacher: 'Dr. Ahmed Hassan', class: 'Grade 10-A', room: 'Room 101', startTime: '09:30', endTime: '10:15' },
  { id: '12', period: 4, day: 'Tuesday', subject: 'Break', teacher: '', class: 'Grade 10-A', isBreak: true, breakType: 'Morning Break', startTime: '10:15', endTime: '10:30' },
  { id: '13', period: 5, day: 'Tuesday', subject: 'English', teacher: 'Ms. Sarah Wilson', class: 'Grade 10-A', room: 'Room 102', startTime: '10:30', endTime: '11:15' },
  { id: '14', period: 6, day: 'Tuesday', subject: 'Computer Science', teacher: 'Mr. David Wilson', class: 'Grade 10-A', room: 'Computer Lab', startTime: '11:15', endTime: '13:00' },
  { id: '15', period: 8, day: 'Tuesday', subject: 'Lunch Break', teacher: '', class: 'Grade 10-A', isBreak: true, breakType: 'Lunch', startTime: '13:00', endTime: '14:00' },
  { id: '16', period: 9, day: 'Tuesday', subject: 'Civic Education', teacher: 'Ms. Rebecca Smith', class: 'Grade 10-A', room: 'Room 108', startTime: '14:00', endTime: '14:45' },

  // Add more days as needed...
];

const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
const maxPeriods = 9;

export function TimetableGrid({ 
  timetable = mockTimetable, 
  mode = 'admin', 
  onEdit, 
  onExport,
  className = '',
  teacherFilter 
}: TimetableGridProps) {
  const [selectedClass, setSelectedClass] = useState('all');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [viewMode, setViewMode] = useState<'class-period' | 'day-period'>('class-period');

  // Get unique classes and periods from timetable
  const uniqueClasses = Array.from(new Set(timetable.map(slot => slot.class))).sort();
  const maxPeriod = Math.max(...timetable.map(slot => slot.period), 0);
  const periods = Array.from({ length: maxPeriod }, (_, i) => i + 1);

  const filteredTimetable = timetable.filter(slot => {
    if (selectedClass !== 'all' && slot.class !== selectedClass) return false;
    if (selectedDay !== 'all' && slot.day !== selectedDay) return false;
    if (teacherFilter && slot.teacher !== teacherFilter) return false;
    return true;
  });

  const getSlotForDayAndPeriod = (day: string, period: number) => {
    return filteredTimetable.find(slot => slot.day === day && slot.period === period);
  };

  const getSlotForClassAndPeriod = (className: string, period: number, day: string) => {
    return timetable.find(slot => 
      slot.class === className && 
      slot.period === period && 
      slot.day === day
    );
  };

  const getSubjectColor = (subject: string) => {
    const colors: Record<string, string> = {
      'Mathematics': 'bg-blue-100 text-blue-800 border-blue-200',
      'English': 'bg-green-100 text-green-800 border-green-200',
      'Science': 'bg-purple-100 text-purple-800 border-purple-200',
      'Science Lab': 'bg-purple-100 text-purple-800 border-purple-200',
      'History': 'bg-orange-100 text-orange-800 border-orange-200',
      'Geography': 'bg-teal-100 text-teal-800 border-teal-200',
      'Art': 'bg-pink-100 text-pink-800 border-pink-200',
      'Physical Education': 'bg-red-100 text-red-800 border-red-200',
      'Computer Science': 'bg-indigo-100 text-indigo-800 border-indigo-200',
      'Civic Education': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Break': 'bg-gray-100 text-gray-600 border-gray-200',
      'Lunch Break': 'bg-gray-100 text-gray-600 border-gray-200'
    };
    return colors[subject] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  // New view: Classes as rows, Periods as columns
  const renderClassPeriodGrid = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-300 p-3 text-left font-medium sticky left-0 bg-slate-50 z-10">
              <div className="flex items-center gap-2">
                <GraduationCap className="h-4 w-4" />
                Class
              </div>
            </th>
            {periods.map(period => {
              const sampleSlot = timetable.find(s => s.period === period);
              return (
                <th key={period} className="border border-slate-300 p-3 text-center font-medium min-w-[180px]">
                  <div className="font-semibold">Period {period}</div>
                  {sampleSlot && (
                    <div className="text-xs text-slate-500 mt-1">
                      {sampleSlot.startTime} - {sampleSlot.endTime}
                    </div>
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {uniqueClasses.map(className => (
            <tr key={className} className="hover:bg-slate-50">
              <td className="border border-slate-300 p-3 font-medium bg-slate-50 sticky left-0 z-10">
                <div className="font-semibold text-sm">{className}</div>
              </td>
              {periods.map(period => {
                const slot = getSlotForClassAndPeriod(className, period, selectedDay);
                return (
                  <td key={`${className}-${period}`} className="border border-slate-300 p-2">
                    {slot ? (
                      <div 
                        className={`p-2 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${getSubjectColor(slot.subject)}`}
                        onClick={() => mode === 'admin' && onEdit && onEdit(slot)}
                      >
                        <div className="font-medium text-sm mb-1">{slot.subject}</div>
                        {!slot.isBreak && slot.teacher && (
                          <div className="text-xs opacity-80 flex items-center gap-1">
                            <User className="h-3 w-3" />
                            <span className="truncate">{slot.teacher}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="h-16 flex items-center justify-center text-slate-400 text-xs">
                        —
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderGridView = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-slate-300">
        <thead>
          <tr className="bg-slate-50">
            <th className="border border-slate-300 p-3 text-left font-medium">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Period
              </div>
            </th>
            {days.map(day => (
              <th key={day} className="border border-slate-300 p-3 text-center font-medium min-w-[200px]">
                {day}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: maxPeriods }, (_, i) => i + 1).map(period => (
            <tr key={period} className="hover:bg-slate-50">
              <td className="border border-slate-300 p-3 font-medium bg-slate-50">
                <div className="text-center">
                  <div className="font-semibold">{period}</div>
                  <div className="text-xs text-slate-500">
                    {period === 4 ? '10:15-10:30' : 
                     period === 7 ? '12:00-13:00' : 
                     `${8 + Math.floor((period - 1) * 0.75)}:${(period - 1) * 45 % 60 || '00'}`}
                  </div>
                </div>
              </td>
              {days.map(day => {
                const slot = getSlotForDayAndPeriod(day, period);
                return (
                  <td key={`${day}-${period}`} className="border border-slate-300 p-2">
                    {slot ? (
                      <div 
                        className={`p-3 rounded-lg border-2 cursor-pointer hover:shadow-md transition-all ${getSubjectColor(slot.subject)}`}
                        onClick={() => mode === 'admin' && onEdit && onEdit(slot)}
                      >
                        <div className="font-medium text-sm mb-1">{slot.subject}</div>
                        {!slot.isBreak && (
                          <>
                            <div className="text-xs opacity-80 flex items-center gap-1">
                              <User className="h-3 w-3" />
                              {slot.teacher}
                            </div>
                            {slot.room && (
                              <div className="text-xs opacity-80 flex items-center gap-1 mt-1">
                                <BookOpen className="h-3 w-3" />
                                {slot.room}
                              </div>
                            )}
                          </>
                        )}
                        <div className="text-xs opacity-70 mt-1">
                          {slot.startTime} - {slot.endTime}
                        </div>
                      </div>
                    ) : (
                      <div className="h-20 flex items-center justify-center text-slate-400 text-sm">
                        Free Period
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderListView = () => (
    <div className="space-y-4">
      {days.map(day => {
        const daySlots = filteredTimetable.filter(slot => slot.day === day).sort((a, b) => a.period - b.period);
        if (daySlots.length === 0) return null;
        
        return (
          <Card key={day}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                {day}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {daySlots.map(slot => (
                  <div 
                    key={slot.id}
                    className={`p-3 rounded-lg border-2 ${getSubjectColor(slot.subject)} hover:shadow-md transition-all cursor-pointer`}
                    onClick={() => mode === 'admin' && onEdit && onEdit(slot)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="text-sm font-medium bg-white/50 px-2 py-1 rounded">
                          Period {slot.period}
                        </div>
                        <div>
                          <div className="font-medium">{slot.subject}</div>
                          {!slot.isBreak && (
                            <div className="text-sm opacity-80">
                              {slot.teacher} • {slot.room}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="text-sm opacity-70">
                        {slot.startTime} - {slot.endTime}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Controls */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Select value={selectedDay} onValueChange={setSelectedDay}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Select day" />
            </SelectTrigger>
            <SelectContent>
              {days.map(day => (
                <SelectItem key={day} value={day}>{day}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="flex items-center gap-2">
            <Badge variant="outline" className="px-3 py-1">
              {uniqueClasses.length} {uniqueClasses.length === 1 ? 'Class' : 'Classes'}
            </Badge>
            <Badge variant="outline" className="px-3 py-1">
              {periods.length} Periods
            </Badge>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {mode === 'admin' && (
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-2" />
              Regenerate
            </Button>
          )}
          
          {onExport && (
            <div className="flex gap-1">
              <Button variant="outline" size="sm" onClick={() => onExport('pdf')}>
                <Download className="h-4 w-4 mr-2" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport('excel')}>
                <Download className="h-4 w-4 mr-2" />
                Excel
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Timetable Display */}
      {timetable.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-400" />
            <p className="text-slate-600">No timetable data available for {selectedDay}</p>
          </CardContent>
        </Card>
      ) : (
        renderClassPeriodGrid()
      )}

      {/* Legend */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Subject Legend</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {[...new Set(filteredTimetable.map(slot => slot.subject))].map(subject => (
              <Badge key={subject} className={getSubjectColor(subject)}>
                {subject}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}