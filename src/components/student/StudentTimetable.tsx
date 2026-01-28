import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Clock, Calendar } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TimetableEntry {
  id: string;
  day: string;
  period: number;
  start_time: string;
  end_time: string;
  subject_name: string;
  subject_code?: string;
  teacher_name?: string;
  isBreak?: boolean;
  breakType?: string;
  caption?: string;
  isCoCurricular?: boolean;
}

interface DayConfig {
  day: string;
  numPeriods: number;
  openTime: string;
  periodDuration: number;
}

interface BreakConfig {
  name: string;
  afterPeriod: number;
  duration: number;
  appliesTo: string[];
}

interface TimetableSettings {
  daysConfig: DayConfig[];
  breaks: BreakConfig[];
  blocked?: Record<string, Record<number, { caption: string; isCoCurricular?: boolean }>>;
}

export function StudentTimetable() {
  const [timetable, setTimetable] = useState<TimetableEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [settings, setSettings] = useState<TimetableSettings | null>(null);
  const [studentClassName, setStudentClassName] = useState('');

  const supabase = createClient();

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

  useEffect(() => {
    fetchTimetable();
  }, []);

  // Calculate all periods for a specific day including breaks
  const calculateDayPeriods = (dayName: string): Array<{ period: number; isBreak: boolean; breakName?: string; startTime: string; endTime: string }> => {
    if (!settings?.daysConfig || !dayName) return [];
    
    const dayMap: Record<string, string> = {
      'Monday': 'mon',
      'Tuesday': 'tue',
      'Wednesday': 'wed',
      'Thursday': 'thu',
      'Friday': 'fri'
    };
    const dayCode = dayMap[dayName];
    
    const dayConfig = settings.daysConfig.find((t: any) => t.day === dayCode);
    if (!dayConfig) return [];
    
    const openTime = dayConfig.openTime;
    const periods = dayConfig.numPeriods;
    const duration = dayConfig.periodDuration;
    const breaks = settings.breaks || [];
    
    const timeToMinutes = (timeStr: string) => {
      const timePart = timeStr.split(' ')[0];
      const [hours, minutes] = timePart.split(':').map(Number);
      return hours * 60 + minutes;
    };
    
    const minutesToTime = (totalMinutes: number) => {
      let hours = Math.floor(totalMinutes / 60);
      const minutes = totalMinutes % 60;
      const period = hours >= 12 ? 'PM' : 'AM';
      if (hours > 12) hours -= 12;
      if (hours === 0) hours = 12;
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')} ${period}`;
    };
    
    let currentMinutes = timeToMinutes(openTime);
    const result: Array<{ period: number; isBreak: boolean; breakName?: string; startTime: string; endTime: string }> = [];
    
    for (let i = 1; i <= periods; i++) {
      const startTime = currentMinutes;
      const endTime = startTime + duration;
      
      result.push({
        period: i,
        startTime: minutesToTime(startTime),
        endTime: minutesToTime(endTime),
        isBreak: false
      });
      
      currentMinutes = endTime;
      
      const breakAfterThis = breaks.find((b: any) => 
        b.afterPeriod === i && b.appliesTo?.includes(dayCode)
      );
      
      if (breakAfterThis) {
        const breakStart = currentMinutes;
        const breakEnd = breakStart + breakAfterThis.duration;
        
        result.push({
          period: i + 0.5,
          startTime: minutesToTime(breakStart),
          endTime: minutesToTime(breakEnd),
          isBreak: true,
          breakName: breakAfterThis.name
        });
        
        currentMinutes = breakEnd;
      }
    }
    
    return result;
  };

  // Get all unique periods across all days (max periods)
  const getAllPeriods = () => {
    if (!settings?.daysConfig) return [];
    
    const allPeriods = new Set<number>();
    days.forEach(day => {
      const dayPeriods = calculateDayPeriods(day);
      dayPeriods.forEach(p => {
        if (!p.isBreak) {
          allPeriods.add(p.period);
        }
      });
    });
    
    return Array.from(allPeriods).sort((a, b) => a - b);
  };

  // Check if a period is blocked for a specific day and class
  const getBlockedPeriod = (day: string, period: number) => {
    if (!settings?.blocked) return null;
    
    const dayMap: Record<string, string> = {
      'Monday': 'mon',
      'Tuesday': 'tue',
      'Wednesday': 'wed',
      'Thursday': 'thu',
      'Friday': 'fri'
    };
    const dayCode = dayMap[day];
    
    const dayBlocked = settings.blocked[dayCode];
    if (dayBlocked && dayBlocked[period]) {
      return dayBlocked[period];
    }
    
    return null;
  };

  const fetchTimetable = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[StudentTimetable] No session found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Get student's class first
      const { data: profile } = await supabase
        .from('profiles')
        .select('class_id')
        .eq('id', session.user.id)
        .single();

      if (!profile?.class_id) {
        console.log('[StudentTimetable] No class assigned to student');
        setLoading(false);
        return;
      }

      // Get class name
      const { data: classData } = await supabase
        .from('classes')
        .select('name')
        .eq('id', profile.class_id)
        .single();

      if (!classData?.name) {
        console.log('[StudentTimetable] Class not found');
        setLoading(false);
        return;
      }

      const className = classData.name;
      setStudentClassName(className);
      console.log('[StudentTimetable] Student class:', className);

      // Fetch timetable settings
      const settingsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-settings`,
        { headers }
      );
      const settingsData = await settingsRes.json();
      
      if (settingsData.success && settingsData.settings) {
        console.log('[StudentTimetable] Loaded settings:', settingsData.settings);
        setSettings(settingsData.settings);
      }

      // Fetch from the SAME endpoint as admin timetable
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success && result.slots) {
        console.log('[StudentTimetable] Received slots from admin endpoint:', result.slots.length);
        
        // Filter slots for this student's class and transform to match component interface
        const classSlots = result.slots.filter((slot: any) => {
          const parts = slot.slotName.split('-');
          const slotClassName = parts.slice(0, parts.length - 2).join('-');
          return slotClassName === className;
        });

        console.log('[StudentTimetable] Filtered slots for class', className, ':', classSlots.length);

        // Transform to match component's TimetableEntry interface
        const transformedEntries: TimetableEntry[] = classSlots.map((slot: any) => {
          const parts = slot.slotName.split('-');
          const day = parts[parts.length - 2];
          const period = parseInt(parts[parts.length - 1]);

          return {
            id: slot.id,
            day: day,
            period: period,
            start_time: slot.startTime || '',
            end_time: slot.endTime || '',
            subject_name: slot.subjectName || 'Free Period',
            subject_code: '',
            teacher_name: slot.teacherName || '',
            isBreak: slot.isBreak || false,
            breakType: slot.breakType,
            caption: slot.caption,
            isCoCurricular: slot.isCoCurricular
          };
        });

        console.log('[StudentTimetable] Sample transformed entry:', transformedEntries[0]);
        console.log('[StudentTimetable] Total entries:', transformedEntries.length);
        setTimetable(transformedEntries);
      } else {
        toast.error(result.error || 'Failed to load timetable');
      }
    } catch (error) {
      console.error('[StudentTimetable] Error:', error);
      toast.error('Failed to load timetable');
    } finally {
      setLoading(false);
    }
  };

  const getEntryForDayAndPeriod = (day: string, period: number): TimetableEntry | null => {
    // First check if this period is blocked
    const blocked = getBlockedPeriod(day, period);
    if (blocked) {
      return {
        id: `blocked-${day}-${period}`,
        day: day,
        period: period,
        start_time: '',
        end_time: '',
        subject_name: '',
        caption: blocked.caption || 'Blocked',
        isCoCurricular: blocked.isCoCurricular || false
      };
    }
    
    // Otherwise return the actual timetable slot
    return timetable.find(entry => entry.day === day && entry.period === period) || null;
  };

  // Get time range for a specific day and period
  const getTimeForPeriod = (day: string, period: number) => {
    const dayPeriods = calculateDayPeriods(day);
    const periodInfo = dayPeriods.find(p => p.period === period && !p.isBreak);
    return periodInfo ? `${periodInfo.startTime} - ${periodInfo.endTime}` : '';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const periods = getAllPeriods();

  return (
    <div className="space-y-4">
      {/* Mobile App Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Timetable</h1>
            <p className="text-indigo-100 text-sm">
              {studentClassName || 'Weekly schedule'}
            </p>
          </div>
        </div>
      </div>

      {/* Timetable Grid - Mobile Optimized */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-50 border-b border-gray-200 px-5 py-4">
          <div className="flex items-center gap-2 text-gray-900 font-semibold">
            <Calendar className="h-5 w-5 text-gray-700" />
            <span>Weekly Schedule</span>
          </div>
        </div>
        <div className="p-3 md:p-5">
          <div className="overflow-x-auto -mx-3 md:mx-0">
            <div className="min-w-max inline-block md:w-full px-3 md:px-0">
              <table className="w-full border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 md:p-3 text-left bg-slate-50 font-semibold text-xs md:text-sm text-gray-700 min-w-[80px] sticky left-0 z-10 rounded-tl-lg">
                      Period
                    </th>
                    {days.map((day, index) => (
                      <th 
                        key={day} 
                        className={`p-2 md:p-3 text-center bg-slate-50 font-semibold text-xs md:text-sm text-gray-700 min-w-[120px] md:min-w-[140px] ${
                          index === days.length - 1 ? 'rounded-tr-lg' : ''
                        }`}
                      >
                        <span className="hidden sm:inline">{day}</span>
                        <span className="sm:hidden">{day.slice(0, 3)}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {periods.map((period, idx) => (
                    <tr key={period} className={`${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'}`}>
                      <td className="p-2 md:p-3 font-semibold text-gray-700 text-xs md:text-sm bg-slate-50/80 sticky left-0 z-10">
                        <div>
                          <span className="hidden sm:inline">Period {period}</span>
                          <span className="sm:hidden">P{period}</span>
                        </div>
                        {settings && (
                          <div className="text-[10px] text-gray-500 font-normal mt-0.5">
                            {getTimeForPeriod(days[0], period)}
                          </div>
                        )}
                      </td>
                      {days.map(day => {
                        const entry = getEntryForDayAndPeriod(day, period);
                        const timeInfo = getTimeForPeriod(day, period);
                        
                        return (
                          <td key={`${day}-${period}`} className="p-1.5 md:p-2">
                            {entry ? (
                              entry.caption || entry.isCoCurricular ? (
                                // Blocked period (Co-curricular, Sports, etc.)
                                <div className="p-2 md:p-3 bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-200 rounded-lg text-center">
                                  <p className="font-semibold text-xs md:text-sm text-amber-800">
                                    {entry.caption}
                                  </p>
                                </div>
                              ) : (
                                // Regular subject
                                <div className="p-2 md:p-3 bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-sm active:scale-[0.98] transition-all">
                                  <p className="font-bold text-xs md:text-sm text-gray-900 leading-tight">{entry.subject_name}</p>
                                  {entry.subject_code && (
                                    <div className="inline-flex items-center px-1.5 py-0.5 bg-white/80 border border-blue-300 rounded-md mt-1.5">
                                      <span className="text-[10px] md:text-xs font-semibold text-blue-700">{entry.subject_code}</span>
                                    </div>
                                  )}
                                  {entry.teacher_name && (
                                    <p className="text-[10px] md:text-xs text-gray-600 mt-1.5 truncate">
                                      {entry.teacher_name}
                                    </p>
                                  )}
                                  {timeInfo && (
                                    <p className="text-[10px] text-gray-500 mt-1">
                                      {timeInfo}
                                    </p>
                                  )}
                                </div>
                              )
                            ) : (
                              <div className="p-2 md:p-3 bg-gray-50 border border-gray-200 rounded-lg text-center">
                                <p className="text-[10px] md:text-xs text-gray-400">Free</p>
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
          </div>
          
          {timetable.length === 0 && !settings && (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="h-8 w-8 text-slate-400" />
              </div>
              <p className="text-slate-900 font-semibold text-lg">No Timetable Available</p>
              <p className="text-sm text-slate-500 mt-1">
                Your timetable hasn't been created yet
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}