import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Settings, 
  Calendar, 
  Edit, 
  Users, 
  GraduationCap, 
  Clock,
  Wand2,
  Download,
  Upload,
  CheckCircle,
  AlertTriangle,
  Info,
  Grid3x3,
  LayoutGrid
} from 'lucide-react';
import { TimetableSettings, TimetableConfig } from './TimetableSettings';
import { TimetableGrid, TimetableSlot } from './TimetableGrid';
import { TimetableEditor } from './TimetableEditor';
import { TimetableSettingsNew } from './TimetableSettingsNew';
import { TimetableEditorNew } from './TimetableEditorNew';
import { TraditionalTimetableView } from './TraditionalTimetableView';
import { DraggableTimetableView } from './DraggableTimetableView';
import { TimetableDebugger } from './TimetableDebugger';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TimetableModuleProps {
  userRole: 'admin' | 'teacher' | 'student';
  userId?: string;
  className?: string;
}

// Mock data
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
];

export function TimetableModule({ userRole, userId, className = '' }: TimetableModuleProps) {
  const [activeTab, setActiveTab] = useState('view');
  const [viewMode, setViewMode] = useState<'traditional' | 'grid'>('traditional');
  const [timetable, setTimetable] = useState<TimetableSlot[]>([]);
  const [generatedSlots, setGeneratedSlots] = useState<TimetableSlot[] | null>(null); // NEW: Store generated slots
  const [timetableSettings, setTimetableSettings] = useState<any>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showEditor, setShowEditor] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastGenerated, setLastGenerated] = useState<Date | null>(null);
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  
  const supabase = createClient();

  // Fetch timetable data from backend
  const fetchTimetable = async () => {
    try {
      setIsLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[Timetable] No active session');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch timetable, classes, subjects, and teachers in parallel
      const [timetableRes, classesRes, subjectsRes, teachersRes] = await Promise.all([
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subjects`, { headers }),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers`, { headers })
      ]);

      const [timetableData, classesData, subjectsData, teachersData] = await Promise.all([
        timetableRes.json(),
        classesRes.json(),
        subjectsRes.json(),
        teachersRes.json()
      ]);

      // Fetch subject pairings from Supabase
      const { data: pairingsData } = await supabase
        .from('subject_pairings')
        .select('*');

      // Create a map of pair_group_id -> list of subject names
      const pairGroupMap = new Map<string, string[]>();
      if (pairingsData) {
        for (const pairing of pairingsData) {
          if (!pairGroupMap.has(pairing.pair_group_id)) {
            pairGroupMap.set(pairing.pair_group_id, []);
          }
          const subjectInfo = subjectsData.subjects?.find((s: any) => s.id === pairing.subject_id);
          if (subjectInfo) {
            pairGroupMap.get(pairing.pair_group_id)!.push(subjectInfo.name);
          }
        }
      }

      if (timetableData.success && timetableData.slots) {
        console.log('[TimetableModule] Received slots from backend:', timetableData.slots.length);
        console.log('[TimetableModule] Sample slot:', JSON.stringify(timetableData.slots[0], null, 2));
        console.log('[TimetableModule] Slots with isPaired:', timetableData.slots.filter((s: any) => s.isPaired).length);
        
        // Get timetable settings to calculate period times
        const settingsRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-settings`, { headers });
        const settingsData = await settingsRes.json();
        const config = settingsData.settings || {};
        
        // Helper function to calculate period times based on settings
        const calculatePeriodTimes = (dayName: string) => {
          // Map full day names to short codes used in settings
          const dayMap: { [key: string]: string } = {
            'Monday': 'mon',
            'Tuesday': 'tue',
            'Wednesday': 'wed',
            'Thursday': 'thu',
            'Friday': 'fri'
          };
          const dayCode = dayMap[dayName] || dayName.toLowerCase().substring(0, 3);
          
          const dayConfig = config.daysConfig?.find((t: any) => t.day === dayCode);
          if (!dayConfig) return [];
          
          const openTime = dayConfig.openTime; // e.g., "08:00"
          const periods = dayConfig.numPeriods;
          const duration = dayConfig.periodDuration; // minutes per period
          const breaks = config.breaks || [];
          
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
          const result = [];
          
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
            
            // Check if there's a break after this period
            const breakAfterThis = breaks.find((b: any) => 
              b.afterPeriod === i && b.appliesTo?.includes(dayCode)
            );
            
            if (breakAfterThis) {
              const breakStart = currentMinutes;
              const breakEnd = breakStart + breakAfterThis.duration;
              
              result.push({
                period: i + 0.5, // Use decimal to indicate break
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
        
        // Create a map of (day, period) -> time info
        const periodTimesMap = new Map<string, { startTime: string; endTime: string; isBreak?: boolean; breakType?: string }>();
        
        // Calculate times for each day
        ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].forEach(day => {
          const dayPeriods = calculatePeriodTimes(day);
          dayPeriods.forEach((p: any) => {
            const key = `${day}-${p.period}`;
            periodTimesMap.set(key, {
              startTime: p.startTime,
              endTime: p.endTime,
              isBreak: p.isBreak,
              breakType: p.breakName
            });
          });
        });
        
        // Enrich slots with parsed data and time info
        const enrichedSlots = timetableData.slots.map((slot: any) => {
          // Parse slotName safely: "SS1 Diamond-Monday-1" or "JSS1-Monday-1"
          // Parse from the END to handle class names with spaces/dashes correctly
          const parts = slot.slotName.split('-');
          const period = parseInt(parts[parts.length - 1]); // Last part is period
          const day = parts[parts.length - 2]; // Second to last is day
          const className = parts.slice(0, parts.length - 2).join('-'); // Everything before is class name
          
          // Get time info for this specific day and period
          const timeKey = `${day}-${period}`;
          const timeInfo = periodTimesMap.get(timeKey) || { startTime: '', endTime: '' };
          
          return {
            id: slot.id,
            slotName: slot.slotName,
            class: className,
            day: day,
            period: period,
            startPeriod: slot.startPeriod,
            endPeriod: slot.endPeriod,
            startTime: timeInfo.startTime,
            endTime: timeInfo.endTime,
            subject: slot.subjectName || 'Free Period',
            teacher: slot.teacherName || '',
            isBreak: timeInfo.isBreak || false,
            breakType: timeInfo.breakType,
            isPaired: slot.isPaired || false,
            pairsId: slot.pairsId,
            subjectConfigId: slot.subjectConfigId
          };
        });

        setTimetable(enrichedSlots);
        setTimetableSettings(config); // Store settings for use in view
        setAcademicYear(timetableData.academicYear || '');
        setTerm(timetableData.term || '');
        if (enrichedSlots.length > 0) {
          setLastGenerated(new Date());
        }
      } else {
        console.log('[Timetable] No timetable data found');
        setTimetable([]);
      }
    } catch (error) {
      console.error('[Timetable] Fetch error:', error);
      toast.error('Failed to load timetable');
    } finally {
      setIsLoading(false);
    }
  };

  // Load timetable on mount
  useEffect(() => {
    fetchTimetable();
  }, []);

  const handleSettingsSave = (config: TimetableConfig) => {
    // In a real app, this would save to backend and regenerate timetable
    console.log('Saving timetable configuration:', config);
    setShowSettings(false);
    
    // Simulate timetable generation
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setLastGenerated(new Date());
    }, 3000);
  };

  const handleTimetableUpdate = (updatedTimetable: TimetableSlot[]) => {
    setTimetable(updatedTimetable);
    setLastGenerated(new Date());
  };

  const handleExport = async (format: 'pdf' | 'excel') => {
    try {
      if (timetable.length === 0) {
        toast.error('No timetable data to export');
        return;
      }

      if (format === 'pdf') {
        // Client-side PDF generation
        toast.loading('Generating PDF...');
        
        // Dynamic import of jspdf
        const { jsPDF } = await import('jspdf');
        await import('jspdf-autotable');
        
        const doc = new jsPDF('landscape', 'mm', 'a4');
        
        // Add title
        doc.setFontSize(18);
        doc.text('SCHOOL TIMETABLE', doc.internal.pageSize.getWidth() / 2, 15, { align: 'center' });
        
        if (academicYear || term) {
          doc.setFontSize(12);
          doc.text(`${academicYear} - ${term}`, doc.internal.pageSize.getWidth() / 2, 22, { align: 'center' });
        }
        
        // Get unique classes
        const classes = [...new Set(timetable.map(slot => slot.class))].sort();
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        let yPosition = 30;
        
        // Create a table for each class
        classes.forEach((className, classIndex) => {
          if (classIndex > 0) {
            doc.addPage();
            yPosition = 15;
          }
          
          // Class header
          doc.setFontSize(14);
          doc.setFillColor(51, 65, 85); // slate-800
          doc.rect(10, yPosition, doc.internal.pageSize.getWidth() - 20, 8, 'F');
          doc.setTextColor(255, 255, 255);
          doc.text(className.toUpperCase(), 15, yPosition + 5.5);
          doc.setTextColor(0, 0, 0);
          
          yPosition += 10;
          
          // Filter slots for this class
          const classSlots = timetable.filter(slot => slot.class === className && !slot.isBreak);
          
          // Get periods
          const periods = [...new Set(classSlots.map(slot => slot.period))].sort((a, b) => a - b);
          
          // Build table data
          const tableData: any[] = [];
          
          periods.forEach(period => {
            const row: any[] = [];
            const periodSlots = classSlots.filter(s => s.period === period);
            const timeInfo = periodSlots[0];
            
            // Period/Time column
            row.push(`P${period}\n${timeInfo?.startTime || ''} - ${timeInfo?.endTime || ''}`);
            
            // Day columns
            days.forEach(day => {
              const daySlot = periodSlots.find(s => s.day === day);
              if (daySlot) {
                row.push(`${daySlot.subject || 'Free'}\n${daySlot.teacher || ''}`);
              } else {
                row.push('Free');
              }
            });
            
            tableData.push(row);
          });
          
          // Add breaks as separate rows
          const breaks = timetable.filter(slot => slot.class === className && slot.isBreak);
          const uniqueBreaks = [...new Map(breaks.map(b => [`${b.period}-${b.breakType}`, b])).values()];
          
          uniqueBreaks.forEach(breakSlot => {
            const breakRow: any[] = [];
            breakRow.push(`${breakSlot.breakType || 'BREAK'}\n${breakSlot.startTime} - ${breakSlot.endTime}`);
            for (let i = 0; i < days.length; i++) {
              breakRow.push(breakSlot.breakType || 'BREAK');
            }
            
            // Insert break at appropriate position
            const breakPeriod = Math.floor(breakSlot.period);
            const insertIndex = tableData.findIndex((row, idx) => {
              const periodMatch = row[0].match(/P(\d+)/);
              return periodMatch && parseInt(periodMatch[1]) > breakPeriod;
            });
            
            if (insertIndex >= 0) {
              tableData.splice(insertIndex, 0, breakRow);
            } else {
              tableData.push(breakRow);
            }
          });
          
          // Generate table
          (doc as any).autoTable({
            startY: yPosition,
            head: [['Period / Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']],
            body: tableData,
            theme: 'grid',
            headStyles: {
              fillColor: [241, 245, 249], // slate-100
              textColor: [0, 0, 0],
              fontStyle: 'bold',
              halign: 'center'
            },
            bodyStyles: {
              fontSize: 8,
              cellPadding: 2
            },
            columnStyles: {
              0: { cellWidth: 35, fontStyle: 'bold', fillColor: [241, 245, 249] }
            },
            styles: {
              lineColor: [51, 65, 85],
              lineWidth: 0.5
            },
            didParseCell: function(data: any) {
              // Highlight breaks
              if (data.row.index >= 0 && data.cell.raw && typeof data.cell.raw === 'string' && 
                  (data.cell.raw.includes('BREAK') || data.cell.raw.includes('Break'))) {
                data.cell.styles.fillColor = [203, 213, 225]; // slate-300
                data.cell.styles.fontStyle = 'bold';
              }
            }
          });
        });
        
        // Save PDF
        doc.save(`timetable-${academicYear || 'school'}-${term || 'term'}.pdf`);
        toast.success('PDF downloaded successfully!');
        
      } else if (format === 'excel') {
        // Excel export using SheetJS
        toast.loading('Generating Excel file...');
        
        const XLSX = await import('xlsx');
        
        // Create workbook
        const wb = XLSX.utils.book_new();
        
        // Get unique classes
        const classes = [...new Set(timetable.map(slot => slot.class))].sort();
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
        
        classes.forEach(className => {
          // Filter slots for this class
          const classSlots = timetable.filter(slot => slot.class === className);
          
          // Get periods
          const periods = [...new Set(classSlots.map(slot => slot.period))].sort((a, b) => a - b);
          
          // Build worksheet data
          const wsData: any[][] = [];
          
          // Title row
          wsData.push([`${className} - ${academicYear} ${term}`]);
          wsData.push([]);
          
          // Header row
          wsData.push(['Period / Time', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']);
          
          // Data rows
          periods.forEach(period => {
            const row: any[] = [];
            const periodSlots = classSlots.filter(s => s.period === period);
            const timeInfo = periodSlots[0];
            
            if (timeInfo?.isBreak) {
              row.push(`${timeInfo.breakType || 'BREAK'} (${timeInfo.startTime} - ${timeInfo.endTime})`);
              days.forEach(() => row.push(timeInfo.breakType || 'BREAK'));
            } else {
              row.push(`Period ${period} (${timeInfo?.startTime || ''} - ${timeInfo?.endTime || ''})`);
              
              days.forEach(day => {
                const daySlot = periodSlots.find(s => s.day === day && !s.isBreak);
                if (daySlot) {
                  row.push(`${daySlot.subject || 'Free'} - ${daySlot.teacher || ''}`);
                } else {
                  row.push('Free Period');
                }
              });
            }
            
            wsData.push(row);
          });
          
          // Create worksheet
          const ws = XLSX.utils.aoa_to_sheet(wsData);
          
          // Add worksheet to workbook
          XLSX.utils.book_append_sheet(wb, ws, className.substring(0, 31)); // Excel sheet name limit
        });
        
        // Write file
        XLSX.writeFile(wb, `timetable-${academicYear || 'school'}-${term || 'term'}.xlsx`);
        toast.success('Excel file downloaded successfully!');
      }
    } catch (error) {
      console.error('Error exporting timetable:', error);
      toast.error(`Failed to export timetable as ${format.toUpperCase()}`);
    }
  };

  const handleGenerateTimetable = async () => {
    // Open the editor to generate
    setShowEditor(true);
  };

  const handleClearTimetable = async () => {
    if (!confirm('⚠️ Are you sure you want to delete ALL timetable data? This action cannot be undone!')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to continue');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable`,
        {
          method: 'DELETE',
          headers
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Timetable cleared successfully!');
        setTimetable([]);
        setLastGenerated(null);
        setAcademicYear('');
        setTerm('');
        // Refresh the data
        fetchTimetable();
      } else {
        toast.error(result.error || 'Failed to clear timetable');
      }
    } catch (error) {
      console.error('Error clearing timetable:', error);
      toast.error('Failed to clear timetable');
    }
  };

  const handlePublishTimetable = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to continue');
        return;
      }

      if (!confirm('Are you sure you want to publish this timetable to all teachers and students?')) {
        return;
      }

      const toastId = toast.loading('Publishing timetable...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable/publish`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            academicYear,
            term
          })
        }
      );

      const result = await response.json();
      
      toast.dismiss(toastId);

      if (result.success) {
        toast.success(
          `Timetable published successfully! ${result.teachersNotified || 0} teachers and ${result.studentsNotified || 0} students notified.`
        );
      } else {
        console.error('[Publish Error]', result);
        toast.error(result.error || 'Failed to publish timetable');
      }
    } catch (error) {
      console.error('Error publishing timetable:', error);
      toast.error('Failed to publish timetable');
    }
  };

  if (showSettings) {
    return (
      <div className={className}>
        <TimetableSettingsNew
          onSave={() => setShowSettings(false)}
          onCancel={() => setShowSettings(false)}
        />
      </div>
    );
  }

  if (showEditor) {
    return (
      <div className={className}>
        <TimetableEditorNew
          onClose={() => setShowEditor(false)}
          onSave={async (slots: TimetableSlot[]) => {
            // Store the generated slots temporarily
            setGeneratedSlots(slots);
            setTimetable(slots);
            setShowEditor(false);
            setActiveTab('view'); // Switch to View Timetables tab
            
            // CRITICAL FIX: Refresh timetable from database to show the saved version
            // This ensures the data persists across page reloads
            toast.success('Timetable saved! Refreshing from database...');
            await fetchTimetable(); // Reload from database
            
            toast.success('Timetable loaded from database! Changes are now permanent.');
          }}
        />
      </div>
    );
  }

  const getTabs = () => {
    switch (userRole) {
      case 'admin':
        return [
          { value: 'view', label: 'View Timetables', icon: Calendar },
          { value: 'generate', label: 'Generate', icon: Wand2 },
          { value: 'teacher-view', label: 'Teacher View', icon: Users },
          { value: 'student-view', label: 'Student View', icon: GraduationCap },
          { value: 'debug', label: 'Debug', icon: Info }
        ];
      case 'teacher':
        return [
          { value: 'my-timetable', label: 'My Timetable', icon: Clock },
          { value: 'class-timetables', label: 'Class Timetables', icon: Calendar }
        ];
      case 'student':
        return [
          { value: 'my-timetable', label: 'My Timetable', icon: Calendar }
        ];
      default:
        return [];
    }
  };

  return (
    <div className={`space-y-4 md:space-y-6 ${className}`}>
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <Clock className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold">Timetable</h1>
              <p className="text-indigo-100 text-sm md:text-base mt-1">
                {userRole === 'admin' && 'Manage school timetables'}
                {userRole === 'teacher' && 'View your teaching schedule'}
                {userRole === 'student' && 'View your class schedule'}
              </p>
            </div>
          </div>

          {/* Admin Actions */}
          {userRole === 'admin' && (
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)} className="text-white hover:bg-white/20">
                <Settings className="h-5 w-5" />
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowEditor(true)} className="text-white hover:bg-white/20">
                <Edit className="h-5 w-5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Status Alert */}
      {isGenerating && (
        <Alert className="border-blue-200 bg-blue-50">
          <Wand2 className="h-4 w-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-800 text-sm">
            Generating timetable based on your settings. This may take a few moments...
          </AlertDescription>
        </Alert>
      )}

      {lastGenerated && !isGenerating && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800 text-sm">
            Timetable last updated: {lastGenerated.toLocaleDateString()} at {lastGenerated.toLocaleTimeString()}
          </AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <TabsList className="grid w-full min-w-max sm:min-w-0" style={{ gridTemplateColumns: `repeat(${getTabs().length}, minmax(0, 1fr))` }}>
            {getTabs().map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.value} value={tab.value} className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-4">
                  <Icon className="h-3 w-3 sm:h-4 sm:w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  <span className="sm:hidden">{tab.label.split(' ')[0]}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Admin Tabs */}
        {userRole === 'admin' && (
          <>
            <TabsContent value="view" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg sm:text-xl font-semibold">All Class Timetables</h2>
                <div className="flex gap-2 flex-wrap">
                  <div className="flex items-center gap-1 border rounded-md p-1">
                    <Button 
                      variant={viewMode === 'traditional' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('traditional')}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <Grid3x3 className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Traditional</span>
                    </Button>
                    <Button 
                      variant={viewMode === 'grid' ? 'default' : 'ghost'}
                      size="sm"
                      onClick={() => setViewMode('grid')}
                      className="gap-1 sm:gap-2 text-xs sm:text-sm px-2 sm:px-3"
                    >
                      <LayoutGrid className="h-3 w-3 sm:h-4 sm:w-4" />
                      <span className="hidden sm:inline">Grid</span>
                    </Button>
                  </div>
                  <Button variant="outline" onClick={() => handleExport('pdf')} size="sm" className="text-xs sm:text-sm">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Export PDF</span>
                    <span className="sm:hidden">PDF</span>
                  </Button>
                  <Button variant="outline" onClick={() => handleExport('excel')} size="sm" className="text-xs sm:text-sm">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    <span className="hidden sm:inline">Export Excel</span>
                    <span className="sm:hidden">Excel</span>
                  </Button>
                </div>
              </div>
              
              {viewMode === 'traditional' ? (
                <DraggableTimetableView 
                  timetable={timetable}
                  settings={timetableSettings}
                  academicYear={academicYear}
                  term={term}
                  onExport={handleExport}
                  onSlotsChange={async (updatedSlots) => {
                    // Save the updated slots to the backend
                    try {
                      const { data: { session } } = await supabase.auth.getSession();
                      if (!session) {
                        toast.error('Please log in to save changes');
                        return;
                      }

                      toast.loading('Saving changes...');

                      // Update local state immediately for UI feedback
                      setTimetable(updatedSlots);

                      // TODO: Implement backend save endpoint
                      // For now, just update local state
                      toast.success('Changes saved locally!'); 
                      
                    } catch (error) {
                      console.error('Error saving timetable changes:', error);
                      toast.error('Failed to save changes');
                    }
                  }}
                />
              ) : (
                <TimetableGrid 
                  timetable={timetable} 
                  mode="admin" 
                  onExport={handleExport}
                />
              )}
            </TabsContent>

            <TabsContent value="generate" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
                    <Wand2 className="h-5 w-5" />
                    Timetable Generation
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription className="text-sm">
                      The system will automatically generate timetables based on your configured settings. 
                      Make sure to configure subjects, teachers, and classes in Settings first.
                    </AlertDescription>
                  </Alert>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <Card className="p-4">
                      <h3 className="font-medium mb-2 text-sm sm:text-base">Smart Subject Assignment</h3>
                      <p className="text-xs sm:text-sm text-slate-600">Subjects auto-filtered by department and level</p>
                    </Card>
                    <Card className="p-4">
                      <h3 className="font-medium mb-2 text-sm sm:text-base">Teacher Availability</h3>
                      <p className="text-xs sm:text-sm text-slate-600">Part-time teachers scheduled with priority</p>
                    </Card>
                    <Card className="p-4">
                      <h3 className="font-medium mb-2 text-sm sm:text-base">Conflict Detection</h3>
                      <p className="text-xs sm:text-sm text-slate-600">Automatic validation for scheduling conflicts</p>
                    </Card>
                  </div>

                  <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-4 pt-4">
                    <Button 
                      onClick={handleGenerateTimetable} 
                      disabled={isGenerating}
                      className="flex items-center gap-2 justify-center text-sm sm:text-base"
                    >
                      <Wand2 className={`h-4 w-4 ${isGenerating ? 'animate-spin' : ''}`} />
                      {isGenerating ? 'Generating...' : 'Generate Timetable'}
                    </Button>
                    <Button variant="outline" onClick={() => setShowSettings(true)} className="text-sm sm:text-base">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure Settings
                    </Button>
                    {timetable.length > 0 && (
                      <Button 
                        variant="destructive" 
                        onClick={handleClearTimetable}
                        className="flex items-center gap-2 justify-center text-sm sm:text-base"
                      >
                        <AlertTriangle className="h-4 w-4" />
                        Clear Timetable
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="teacher-view" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">Teacher Timetables</h2>
              </div>
              <TimetableGrid 
                timetable={timetable} 
                mode="teacher" 
                onExport={handleExport}
                teacherFilter="Dr. Ahmed Hassan"
              />
            </TabsContent>

            <TabsContent value="student-view" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">Student Timetables</h2>
              </div>
              <TimetableGrid 
                timetable={timetable} 
                mode="student" 
                onExport={handleExport}
              />
            </TabsContent>

            <TabsContent value="debug" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">Timetable Debugger</h2>
              </div>
              <TimetableDebugger />
            </TabsContent>
          </>
        )}

        {/* Teacher Tabs */}
        {userRole === 'teacher' && (
          <>
            <TabsContent value="my-timetable" className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg sm:text-xl font-semibold">My Teaching Schedule</h2>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExport('pdf')} size="sm" className="text-xs sm:text-sm">
                    <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                    Export PDF
                  </Button>
                </div>
              </div>
              <TimetableGrid 
                timetable={timetable} 
                mode="teacher" 
                onExport={handleExport}
                teacherFilter="Dr. Ahmed Hassan"
              />
            </TabsContent>

            <TabsContent value="class-timetables" className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg sm:text-xl font-semibold">Class Timetables</h2>
              </div>
              <TimetableGrid 
                timetable={timetable} 
                mode="teacher" 
                onExport={handleExport}
              />
            </TabsContent>
          </>
        )}

        {/* Student Tabs */}
        {userRole === 'student' && (
          <TabsContent value="my-timetable" className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <h2 className="text-lg sm:text-xl font-semibold">My Class Schedule</h2>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => handleExport('pdf')} size="sm" className="text-xs sm:text-sm">
                  <Download className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                  Export PDF
                </Button>
              </div>
            </div>
            <TimetableGrid 
              timetable={timetable} 
              mode="student" 
              onExport={handleExport}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}