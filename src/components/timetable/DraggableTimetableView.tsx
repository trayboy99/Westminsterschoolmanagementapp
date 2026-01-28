import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Download, Printer, Calendar, AlertTriangle, Save, RefreshCw } from 'lucide-react';
import { DndProvider, useDrag, useDrop } from 'react-dnd@16.0.1';
import { HTML5Backend } from 'react-dnd-html5-backend@16.0.1';
import { toast } from 'sonner';

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
  caption?: string;
  subjectId?: string;
  teacherId?: string;
  classId?: string;
}

interface DraggableTimetableViewProps {
  timetable: TimetableSlot[];
  settings?: any;
  academicYear?: string;
  term?: string;
  onExport?: (format: 'pdf' | 'excel') => void;
  onSlotsChange?: (slots: TimetableSlot[]) => void; // Callback when slots are swapped
}

const ITEM_TYPE = 'TIMETABLE_SLOT';

interface DragItem {
  slot: TimetableSlot;
  className: string;
  day: string;
  period: number;
}

// Draggable Cell Component
function DraggableCell({ 
  slot, 
  className, 
  day, 
  period,
  onSwap
}: { 
  slot: TimetableSlot | undefined;
  className: string;
  day: string;
  period: number;
  onSwap: (source: DragItem, target: { className: string; day: string; period: number }) => void;
}) {
  const [{ isDragging }, drag] = useDrag(() => ({
    type: ITEM_TYPE,
    item: { slot, className, day, period } as DragItem,
    canDrag: () => !!slot && !slot.caption && !slot.isBreak, // Only drag actual subjects, not blocked/break periods
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  }), [slot, className, day, period]);

  const [{ isOver, canDrop }, drop] = useDrop(() => ({
    accept: ITEM_TYPE,
    canDrop: (item: DragItem) => {
      // Can drop on same class only
      return item.className === className && 
             (item.day !== day || item.period !== period); // Can't drop on itself
    },
    drop: (item: DragItem) => {
      console.log('DROP triggered:', { from: item, to: { className, day, period } });
      onSwap(item, { className, day, period });
    },
    collect: (monitor) => ({
      isOver: monitor.isOver(),
      canDrop: monitor.canDrop(),
    }),
  }), [className, day, period, onSwap]);

  // Combine refs properly using a callback ref
  const ref = React.useCallback((node: HTMLTableCellElement | null) => {
    drag(node);
    drop(node);
  }, [drag, drop]);

  const opacity = isDragging ? 0.4 : 1;
  const bgColor = isOver && canDrop ? 'bg-green-100' : 
                  slot?.caption || slot?.isCoCurricular ? 'bg-blue-50' : '';

  const canDragThisSlot = !!slot && !slot.caption && !slot.isBreak;

  return (
    <td 
      ref={ref}
      className={`border-2 border-slate-900 p-2 ${bgColor} transition-colors ${canDragThisSlot ? 'cursor-move' : 'cursor-default'}`}
      style={{ opacity }}
    >
      {slot?.caption ? (
        // Blocked period with caption (Note Check, Sports, Co-curricular)
        <div className="h-10 flex items-center justify-center">
          <div className="text-xs font-bold text-blue-700 uppercase text-center">
            {slot.caption}
          </div>
        </div>
      ) : slot && !slot.isBreak && slot.subject !== 'Free Period' ? (
        // Regular subject - draggable
        <div className="text-xs relative">
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
        // Empty slot - can drop here
        <div className="h-10 flex items-center justify-center text-slate-400 text-xs">
          {isOver && canDrop ? (
            <span className="text-green-600 font-semibold">Drop here</span>
          ) : (
            '-'
          )}
        </div>
      )}
    </td>
  );
}

export function DraggableTimetableView({ 
  timetable, 
  settings,
  academicYear, 
  term,
  onExport,
  onSlotsChange
}: DraggableTimetableViewProps) {
  const [localTimetable, setLocalTimetable] = useState<TimetableSlot[]>(timetable);
  const [hasChanges, setHasChanges] = useState(false);

  // Update local timetable when prop changes
  React.useEffect(() => {
    setLocalTimetable(timetable);
    setHasChanges(false);
  }, [timetable]);

  // Calculate periods with breaks for each day based on settings
  const calculateDayPeriods = (dayName: string) => {
    if (!settings?.daysConfig || !dayName) return [];
    
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

  const { classes, days, dayPeriodsMap } = useMemo(() => {
    const classSet = new Set<string>();
    const daySet = new Set<string>();

    localTimetable.forEach(slot => {
      if (slot.class && !slot.class.includes('Period')) {
        classSet.add(slot.class);
      }
      if (slot.day) {
        daySet.add(slot.day);
      }
    });

    const sortedClasses = Array.from(classSet).sort((a, b) => {
      const getLevel = (name: string) => {
        if (name.toLowerCase().includes('jss')) return 1;
        if (name.toLowerCase().includes('ss')) return 2;
        return 0;
      };
      
      const levelA = getLevel(a);
      const levelB = getLevel(b);
      
      if (levelA !== levelB) return levelA - levelB;
      return a.localeCompare(b);
    });

    const dayOrder = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
    
    // CRITICAL FIX: ALWAYS show all 5 weekdays, even if some have no slots
    // This prevents Thursday/Friday from disappearing when they're empty
    const sortedDays = dayOrder;
    
    console.log('[DraggableTimetableView] Days to display:', sortedDays);

    const dayPeriodsMap = new Map<string, TimeSlot[]>();
    sortedDays.forEach(day => {
      const periods = calculateDayPeriods(day);
      dayPeriodsMap.set(day, periods);
    });

    return {
      classes: sortedClasses,
      days: sortedDays,
      dayPeriodsMap
    };
  }, [localTimetable, settings]);

  const getSlot = (className: string, day: string, period: number): TimetableSlot | undefined => {
    const dayMap: { [key: string]: string } = {
      'Monday': 'mon',
      'Tuesday': 'tue',
      'Wednesday': 'wed',
      'Thursday': 'thu',
      'Friday': 'fri'
    };
    const dayCode = dayMap[day] || day.toLowerCase().substring(0, 3);
    
    if (settings?.blocked) {
      const blockedPeriods = settings.blocked[dayCode];
      if (blockedPeriods && blockedPeriods[period]) {
        const blockedInfo = blockedPeriods[period];
        console.log(`[TimetableView] Found blocked period: ${day} P${period} =`, blockedInfo);
        
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
    
    return localTimetable.find(
      slot => slot.class === className && slot.day === day && slot.period === period
    );
  };

  const handleSwap = React.useCallback((source: DragItem, target: { className: string; day: string; period: number }) => {
    console.log('[handleSwap] Called with:', { source, target });
    
    if (!source.slot) {
      console.log('[handleSwap] No source slot, aborting');
      return;
    }

    const sourceSlot = source.slot;
    const targetSlot = getSlot(target.className, target.day, target.period);

    console.log('[handleSwap] Source:', sourceSlot.subject, 'Target:', targetSlot?.subject || 'empty');

    // Clone the timetable array
    const newTimetable = [...localTimetable];

    // Find indices
    const sourceIndex = newTimetable.findIndex(
      s => s.class === source.className && s.day === source.day && s.period === source.period
    );

    console.log('[handleSwap] Source index:', sourceIndex);

    if (targetSlot && !targetSlot.caption) {
      // SWAP: Both source and target have subjects
      const targetIndex = newTimetable.findIndex(
        s => s.class === target.className && s.day === target.day && s.period === target.period
      );

      console.log('[handleSwap] SWAP mode - Target index:', targetIndex);

      if (sourceIndex !== -1 && targetIndex !== -1) {
        // Swap the day and period properties
        const tempDay = newTimetable[sourceIndex].day;
        const tempPeriod = newTimetable[sourceIndex].period;

        newTimetable[sourceIndex].day = newTimetable[targetIndex].day;
        newTimetable[sourceIndex].period = newTimetable[targetIndex].period;

        newTimetable[targetIndex].day = tempDay;
        newTimetable[targetIndex].period = tempPeriod;

        setLocalTimetable(newTimetable);
        setHasChanges(true);
        toast.success(`Swapped ${sourceSlot.subject} with ${targetSlot.subject}`);
      }
    } else if (!targetSlot || !targetSlot.caption) {
      // MOVE: Target is empty, just move the source
      console.log('[handleSwap] MOVE mode - moving to empty slot');
      
      if (sourceIndex !== -1) {
        newTimetable[sourceIndex].day = target.day;
        newTimetable[sourceIndex].period = target.period;

        setLocalTimetable(newTimetable);
        setHasChanges(true);
        toast.success(`Moved ${sourceSlot.subject} to ${target.day} Period ${target.period}`);
      }
    } else {
      console.log('[handleSwap] Cannot drop - blocked period');
      toast.error('Cannot drop on blocked periods');
    }
  }, [localTimetable, getSlot]);

  const handleSaveChanges = () => {
    if (onSlotsChange) {
      onSlotsChange(localTimetable);
      setHasChanges(false);
      toast.success('Timetable changes saved!');
    }
  };

  const handleResetChanges = () => {
    setLocalTimetable(timetable);
    setHasChanges(false);
    toast.info('Changes discarded');
  };

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

  const handlePrint = () => {
    window.print();
  };

  if (localTimetable.length === 0) {
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
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-6">
        {/* Header with controls */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 sm:gap-4 print:hidden">
          <div>
            <h2 className="text-xl sm:text-2xl">Drag & Drop Timetable Editor</h2>
            {academicYear && term && (
              <p className="text-xs sm:text-sm text-slate-600">
                {academicYear} - {term}
              </p>
            )}
            <p className="text-xs text-slate-500 mt-1">
              💡 Drag subjects to swap or move them to empty slots
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasChanges && (
              <>
                <Button variant="default" size="sm" onClick={handleSaveChanges} className="flex-1 sm:flex-initial">
                  <Save className="h-4 w-4 mr-2" />
                  <span className="text-xs sm:text-sm">Save Changes</span>
                </Button>
                <Button variant="outline" size="sm" onClick={handleResetChanges} className="flex-1 sm:flex-initial">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  <span className="text-xs sm:text-sm">Discard</span>
                </Button>
              </>
            )}
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

        {hasChanges && (
          <Alert className="bg-amber-50 border-amber-200">
            <AlertDescription className="text-amber-800">
              ⚠️ You have unsaved changes. Click "Save Changes" to persist them.
            </AlertDescription>
          </Alert>
        )}

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
            {classes.map((className, classIndex) => (
              <div key={className} className="space-y-2">
                {/* Class Header */}
                <div className="bg-slate-800 text-white px-4 py-2 rounded-t-lg">
                  <h3 className="text-lg font-bold uppercase">{className}</h3>
                </div>
                
                {/* Timetable Table for this class */}
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border-2 border-slate-900">
                    <thead>
                      <tr>
                        <th className="border-2 border-slate-900 p-2 bg-slate-100 text-sm min-w-[120px] font-bold">
                          PERIOD / TIME
                        </th>
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
                      {(dayPeriodsMap.get(days[0]) || []).map((timeSlot) => {
                        if (timeSlot.isBreak) {
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

                        return (
                          <tr key={`${className}-period-${timeSlot.period}`}>
                            <td className="border-2 border-slate-900 p-2 bg-slate-50 text-xs font-bold">
                              <div>Period {Math.floor(timeSlot.period)}</div>
                              <div className="text-[10px] text-slate-600 font-normal">
                                {timeSlot.startTime} - {timeSlot.endTime}
                              </div>
                            </td>
                            {days.map((day) => {
                              const slot = getSlot(className, day, Math.floor(timeSlot.period));
                              
                              return (
                                <DraggableCell
                                  key={`${className}-${day}-${timeSlot.period}`}
                                  slot={slot}
                                  className={className}
                                  day={day}
                                  period={Math.floor(timeSlot.period)}
                                  onSwap={handleSwap}
                                />
                              );
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
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
                  <Badge variant={hasChanges ? "default" : "secondary"}>
                    {hasChanges ? 'Unsaved Changes' : 'No Changes'}
                  </Badge>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DndProvider>
  );
}