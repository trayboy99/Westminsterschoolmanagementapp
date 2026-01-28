import React, { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Download, Printer, Calendar, AlertTriangle } from 'lucide-react';

interface TimeSlot {
  period: number;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  breakName?: string;
}

interface TimetableSlot {
  id: string;
  period: number;
  day: string;
  subject: string;
  teacher: string;
  class: string;
  startTime: string;
  endTime: string;
  isBreak?: boolean;
  breakType?: string;
  isCoCurricular?: boolean;
  isPaired?: boolean;
  caption?: string; // For blocked periods like "Note Check", "Sports", "Co-curricular"
}

interface TraditionalTimetableViewProps {
  timetable: TimetableSlot[];
  settings?: any;
  academicYear?: string;
  term?: string;
  onExport?: (format: 'pdf' | 'excel') => void;
}

export function TraditionalTimetableView({ 
  timetable, 
  settings,
  academicYear, 
  term,
  onExport 
}: TraditionalTimetableViewProps) {
  
  // Debug: Log blocked periods from settings
  React.useEffect(() => {
    if (settings?.blocked) {
      console.log('[TimetableView] Blocked periods loaded:', settings.blocked);
    } else {
      console.log('[TimetableView] No blocked periods in settings');
    }
  }, [settings]);
  
  // Calculate periods with breaks for each day based on settings
  const calculateDayPeriods = (dayName: string) => {
    if (!settings?.daysConfig || !dayName) return [];
    
    // Map full day names to short codes used in settings
    const dayMap: { [key: string]: string } = {
      'Monday': 'mon',
      'Tuesday': 'tue',
      'Wednesday': 'wed',
      'Thursday': 'thu',
      'Friday': 'fri'
    };
    const dayCode = dayMap[dayName] || (dayName ? dayName.toLowerCase().substring(0, 3) : '');
    
    const dayConfig = settings.daysConfig.find((t: any) => t.day === dayCode);
    if (!dayConfig) return [];
    
    const openTime = dayConfig.openTime; // e.g., "08:00" (without AM/PM)
    const periods = dayConfig.numPeriods;
    const duration = dayConfig.periodDuration; // minutes per period
    const breaks = settings.breaks || [];
    
    // Convert "08:00" to minutes since midnight (24-hour format)
    const timeToMinutes = (timeStr: string) => {
      const timePart = timeStr.split(' ')[0]; // Handle both "08:00" and "08:00 AM"
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
    const result: TimeSlot[] = [];
    
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
      
      // Check if there's a break after this period for this day
      const breakAfterThis = breaks.find((b: any) => 
        b.afterPeriod === i && b.appliesTo?.includes(dayCode)
      );
      
      if (breakAfterThis) {
        const breakStart = currentMinutes;
        const breakEnd = breakStart + breakAfterThis.duration;
        
        result.push({
          period: i + 0.5, // Use decimal to indicate this is a break slot
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

  // Extract unique values
  const { classes, days, dayPeriodsMap } = useMemo(() => {
    const classSet = new Set<string>();
    const daySet = new Set<string>();

    timetable.forEach(slot => {
      // Add class to set - filter out obvious invalid patterns
      if (slot.class && !slot.class.includes('Period')) {
        classSet.add(slot.class);
      }
      // Only add valid day names
      if (slot.day) {
        daySet.add(slot.day);
      }
    });

    const sortedClasses = Array.from(classSet).sort((a, b) => {
      // Sort JSS before SSS, then by number
      const aIsJSS = a.includes('JSS');
      const bIsJSS = b.includes('JSS');
      if (aIsJSS !== bIsJSS) return aIsJSS ? -1 : 1;
      return a.localeCompare(b);
    });

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // CRITICAL FIX: ALWAYS show all 5 weekdays, even if some have no slots
    // This prevents Thursday/Friday from disappearing when they're empty
    const sortedDays = dayOrder;
    
    console.log('[TimetableView] Days in data:', Array.from(daySet));
    console.log('[TimetableView] Days to display:', sortedDays);

    // Calculate periods for each day (including breaks)
    const periodsMap = new Map<string, TimeSlot[]>();
    sortedDays.forEach(day => {
      periodsMap.set(day, calculateDayPeriods(day));
    });

    return {
      classes: sortedClasses,
      days: sortedDays,
      dayPeriodsMap: periodsMap
    };
  }, [timetable, settings]);

  // Get slot for specific class, day, and period
  const getSlot = (className: string, day: string, period: number) => {
    // First check if this period is blocked by a rule
    if (settings?.blocked) {
      const dayMap: { [key: string]: string } = {
        'Monday': 'mon',
        'Tuesday': 'tue',
        'Wednesday': 'wed',
        'Thursday': 'thu',
        'Friday': 'fri'
      };
      const dayCode = dayMap[day];
      
      // Check blocked map: settings.blocked['fri'][5]
      const dayBlocked = settings.blocked[dayCode];
      if (dayBlocked && dayBlocked[period]) {
        const blockedInfo = dayBlocked[period];
        console.log(`[TimetableView] Found blocked period: ${day} P${period} =`, blockedInfo);
        
        // Return a virtual slot for this blocked period
        return {
          id: `blocked-${className}-${day}-${period}`,
          period: period,
          day: day,
          subject: '',
          teacher: '',
          class: className,
          startTime: '',
          endTime: '',
          caption: blockedInfo.caption || 'Blocked',
          isCoCurricular: blockedInfo.isCoCurricular || false
        } as TimetableSlot;
      }
    }
    
    // Otherwise return the actual timetable slot
    return timetable.find(
      slot => slot.class === className && slot.day === day && slot.period === period
    );
  };

  // Abbreviate day names
  const abbreviateDay = (day: string) => {
    if (!day) return '';
    const abbr: Record<string, string> = {
      'Monday': 'MON',
      'Tuesday': 'TUE',
      'Wednesday': 'WED',
      'Thursday': 'THU',
      'Friday': 'FRI',
      'mon': 'MON',
      'tue': 'TUE',
      'wed': 'WED',
      'thu': 'THU',
      'fri': 'FRI'
    };
    return abbr[day] || (day.length >= 3 ? day.substring(0, 3).toUpperCase() : day.toUpperCase());
  };

  // Shorten class names
  const abbreviateClass = (className: string) => {
    if (!className) return '';
    return className.replace('Junior', 'J').replace('Senior', 'S').replace('Class', '').trim();
  };

  const handlePrint = () => {
    window.print();
  };

  if (timetable.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <Calendar className="h-16 w-16 mx-auto mb-4 text-slate-400" />
          <h3 className="text-xl mb-2">No Timetable Generated</h3>
          <p className="text-slate-600">Generate a timetable to view it here</p>
        </CardContent>
      </Card>
    );
  }

  if (!settings || !settings.daysConfig) {
    return (
      <Card>
        <CardContent className="p-12 text-center">
          <AlertTriangle className="h-16 w-16 mx-auto mb-4 text-amber-500" />
          <h3 className="text-xl mb-2">Timetable Settings Required</h3>
          <p className="text-slate-600">
            {!settings ? 'Please configure timetable settings (Timings & Breaks) first' : 
             'Timetable settings loaded but day configuration is missing. Please reconfigure settings.'}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 print:hidden">
        <div>
          <h2 className="text-xl sm:text-2xl">Traditional Timetable View</h2>
          {academicYear && term && (
            <p className="text-xs sm:text-sm text-slate-600">
              {academicYear} - {term}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" onClick={handlePrint} className="flex-1 sm:flex-initial">
            <Printer className="h-4 w-4 mr-2" />
            <span className="text-xs sm:text-sm">Print</span>
          </Button>
          {onExport && (
            <>
              <Button variant="outline" size="sm" onClick={() => onExport('pdf')} className="flex-1 sm:flex-initial">
                <Download className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">PDF</span>
              </Button>
              <Button variant="outline" size="sm" onClick={() => onExport('excel')} className="flex-1 sm:flex-initial">
                <Download className="h-4 w-4 mr-2" />
                <span className="text-xs sm:text-sm">Excel</span>
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Main Timetable Card */}
      <Card className="overflow-hidden">
        <CardHeader className="text-center pb-4 print:pb-2">
          <CardTitle className="text-3xl print:text-4xl">TIME TABLE</CardTitle>
          {academicYear && term && (
            <p className="text-sm text-slate-600 print:text-base">
              {academicYear} Academic Session - {term}
            </p>
          )}
        </CardHeader>
        <CardContent className="p-4 space-y-6">
          {/* Create a table for each CLASS */}
          {classes.map((className, classIndex) => (
            <div key={className} className="space-y-2">
              {/* Class Header */}
              <div className="bg-slate-800 text-white px-4 py-2 rounded-t-lg">
                <h3 className="text-lg font-bold uppercase">{className}</h3>
              </div>
              
              {/* Timetable Table for this class - Periods as ROWS, Days as COLUMNS */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border-2 border-slate-900">
                  <thead>
                    <tr>
                      {/* Period/Time Column Header */}
                      <th className="border-2 border-slate-900 p-2 bg-slate-100 text-sm min-w-[120px] font-bold">
                        PERIOD / TIME
                      </th>
                      {/* Day Column Headers */}
                      {days.map((day) => (
                        <th 
                          key={`${className}-${day}`}
                          className="border-2 border-slate-900 p-2 bg-slate-100 min-w-[150px]"
                        >
                          <div className="text-sm font-bold uppercase">{abbreviateDay(day)}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {/* Get periods for the first day (assuming all days have same structure) */}
                    {(dayPeriodsMap.get(days[0]) || []).map((timeSlot) => {
                      if (timeSlot.isBreak) {
                        // Break row
                        return (
                          <tr key={`${className}-break-${timeSlot.period}`}>
                            <td className="border-2 border-slate-900 p-2 bg-slate-300 font-bold text-xs">
                              <div>{timeSlot.breakName || 'BREAK'}</div>
                              <div className="text-[10px] text-slate-600">
                                {timeSlot.startTime} - {timeSlot.endTime}
                              </div>
                            </td>
                            {days.map((day) => (
                              <td 
                                key={`${className}-${day}-break-${timeSlot.period}`}
                                className="border-2 border-slate-900 bg-slate-200"
                              />
                            ))}
                          </tr>
                        );
                      }

                      // Regular period row
                      return (
                        <tr key={`${className}-period-${timeSlot.period}`}>
                          {/* Period label with time */}
                          <td className="border-2 border-slate-900 p-2 bg-slate-50 text-xs font-bold">
                            <div>Period {Math.floor(timeSlot.period)}</div>
                            <div className="text-[10px] text-slate-600 font-normal">
                              {timeSlot.startTime} - {timeSlot.endTime}
                            </div>
                          </td>
                          {/* Subject cells for each day */}
                          {days.map((day) => {
                            const slot = getSlot(className, day, Math.floor(timeSlot.period));
                            
                            return (
                              <td 
                                key={`${className}-${day}-${timeSlot.period}`}
                                className={`border-2 border-slate-900 p-2 ${
                                  slot?.caption || slot?.isCoCurricular ? 'bg-blue-50' : ''
                                }`}
                              >
                                {slot?.caption ? (
                                  // Blocked period with caption (Note Check, Sports, Co-curricular)
                                  <div className="h-10 flex items-center justify-center">
                                    <div className="text-xs font-bold text-blue-700 uppercase text-center">
                                      {slot.caption}
                                    </div>
                                  </div>
                                ) : slot && !slot.isBreak && slot.subject !== 'Free Period' ? (
                                  // Regular subject
                                  <div className="text-xs">
                                    <div className="font-bold leading-tight mb-1">
                                      {slot.subject}
                                    </div>
                                    {slot.teacher && (
                                      <div className="text-[10px] text-slate-600 leading-tight">
                                        {slot.teacher}
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  // Empty slot
                                  <div className="h-10 flex items-center justify-center text-slate-400 text-xs">
                                    -
                                  </div>
                                )}
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Add spacing between classes, except after the last class */}
              {classIndex < classes.length - 1 && (
                <div className="h-4 print:h-6" />
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Legend */}
      <div className="print:hidden">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-semibold">{classes.length}</span> Classes
              </div>
              <div>
                <span className="font-semibold">{settings?.timings?.[0]?.periods || 0}</span> Max Periods/Day
              </div>
              <div>
                <span className="font-semibold">{settings?.breaks?.length || 0}</span> Break(s) Per Day
              </div>
              <div>
                <span className="font-semibold">{days.length}</span> Days
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

    </div>
  );
}