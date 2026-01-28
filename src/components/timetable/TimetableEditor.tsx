import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { 
  Edit, 
  Save, 
  X, 
  AlertTriangle, 
  CheckCircle, 
  Move,
  Copy,
  Trash2
} from 'lucide-react';
import { TimetableSlot } from './TimetableGrid';

interface TimetableEditorProps {
  timetable: TimetableSlot[];
  onUpdateTimetable: (updatedTimetable: TimetableSlot[]) => void;
  onClose: () => void;
}

interface Conflict {
  type: 'teacher_double_booking' | 'room_conflict' | 'subject_limit_exceeded';
  message: string;
  slots: string[];
}

const mockSubjects = [
  'Mathematics', 'English', 'Science', 'Science Lab', 'History', 
  'Geography', 'Art', 'Physical Education', 'Computer Science', 'Civic Education'
];

const mockTeachers = [
  'Dr. Ahmed Hassan', 'Ms. Sarah Wilson', 'Dr. Maria Santos', 
  'Mr. John Davis', 'Ms. Jennifer Chen', 'Ms. Lisa Brown', 
  'Mr. Mike Johnson', 'Mr. David Wilson', 'Ms. Rebecca Smith'
];

const mockRooms = [
  'Room 101', 'Room 102', 'Room 103', 'Room 104', 'Room 105', 
  'Room 106', 'Lab 1', 'Lab 2', 'Computer Lab', 'Art Studio', 
  'Gymnasium', 'Music Room'
];

export function TimetableEditor({ timetable, onUpdateTimetable, onClose }: TimetableEditorProps) {
  const [currentTimetable, setCurrentTimetable] = useState<TimetableSlot[]>(timetable);
  const [selectedSlot, setSelectedSlot] = useState<TimetableSlot | null>(null);
  const [conflicts, setConflicts] = useState<Conflict[]>([]);
  const [draggedSlot, setDraggedSlot] = useState<TimetableSlot | null>(null);

  const validateTimetable = (timetableToValidate: TimetableSlot[]): Conflict[] => {
    const foundConflicts: Conflict[] = [];
    
    // Check for teacher double booking
    const teacherSchedule: Record<string, Record<string, TimetableSlot[]>> = {};
    
    timetableToValidate.forEach(slot => {
      if (slot.isBreak || !slot.teacher) return;
      
      if (!teacherSchedule[slot.teacher]) {
        teacherSchedule[slot.teacher] = {};
      }
      
      if (!teacherSchedule[slot.teacher][slot.day]) {
        teacherSchedule[slot.teacher][slot.day] = [];
      }
      
      teacherSchedule[slot.teacher][slot.day].push(slot);
    });

    // Find conflicts
    Object.entries(teacherSchedule).forEach(([teacher, schedule]) => {
      Object.entries(schedule).forEach(([day, slots]) => {
        const periods = slots.map(s => s.period);
        const duplicates = periods.filter((period, index) => periods.indexOf(period) !== index);
        
        if (duplicates.length > 0) {
          foundConflicts.push({
            type: 'teacher_double_booking',
            message: `${teacher} is double-booked on ${day}`,
            slots: slots.filter(s => duplicates.includes(s.period)).map(s => s.id)
          });
        }
      });
    });

    // Check for room conflicts
    const roomSchedule: Record<string, Record<string, TimetableSlot[]>> = {};
    
    timetableToValidate.forEach(slot => {
      if (slot.isBreak || !slot.room) return;
      
      if (!roomSchedule[slot.room]) {
        roomSchedule[slot.room] = {};
      }
      
      if (!roomSchedule[slot.room][slot.day]) {
        roomSchedule[slot.room][slot.day] = [];
      }
      
      roomSchedule[slot.room][slot.day].push(slot);
    });

    Object.entries(roomSchedule).forEach(([room, schedule]) => {
      Object.entries(schedule).forEach(([day, slots]) => {
        const periods = slots.map(s => s.period);
        const duplicates = periods.filter((period, index) => periods.indexOf(period) !== index);
        
        if (duplicates.length > 0) {
          foundConflicts.push({
            type: 'room_conflict',
            message: `${room} is double-booked on ${day}`,
            slots: slots.filter(s => duplicates.includes(s.period)).map(s => s.id)
          });
        }
      });
    });

    return foundConflicts;
  };

  const handleSlotUpdate = (updatedSlot: TimetableSlot) => {
    const updatedTimetable = currentTimetable.map(slot => 
      slot.id === updatedSlot.id ? updatedSlot : slot
    );
    setCurrentTimetable(updatedTimetable);
    setConflicts(validateTimetable(updatedTimetable));
    setSelectedSlot(null);
  };

  const handleSlotDelete = (slotId: string) => {
    const updatedTimetable = currentTimetable.filter(slot => slot.id !== slotId);
    setCurrentTimetable(updatedTimetable);
    setConflicts(validateTimetable(updatedTimetable));
    setSelectedSlot(null);
  };

  const handleSlotCopy = (slot: TimetableSlot) => {
    const newSlot: TimetableSlot = {
      ...slot,
      id: Date.now().toString(),
      period: slot.period + 1,
    };
    
    const updatedTimetable = [...currentTimetable, newSlot];
    setCurrentTimetable(updatedTimetable);
    setConflicts(validateTimetable(updatedTimetable));
  };

  const handleDragStart = (slot: TimetableSlot) => {
    setDraggedSlot(slot);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (targetDay: string, targetPeriod: number) => {
    if (!draggedSlot) return;

    const updatedSlot = {
      ...draggedSlot,
      day: targetDay,
      period: targetPeriod
    };

    const updatedTimetable = currentTimetable.map(slot => 
      slot.id === draggedSlot.id ? updatedSlot : slot
    );

    setCurrentTimetable(updatedTimetable);
    setConflicts(validateTimetable(updatedTimetable));
    setDraggedSlot(null);
  };

  const handleSave = () => {
    if (conflicts.length === 0) {
      onUpdateTimetable(currentTimetable);
      onClose();
    }
  };

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
  const maxPeriods = 9;

  const getSlotForDayAndPeriod = (day: string, period: number) => {
    return currentTimetable.find(slot => slot.day === day && slot.period === period);
  };

  const isConflictSlot = (slotId: string) => {
    return conflicts.some(conflict => conflict.slots.includes(slotId));
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Edit className="h-6 w-6" />
          Timetable Editor
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            disabled={conflicts.length > 0}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            Save Changes
            {conflicts.length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {conflicts.length}
              </Badge>
            )}
          </Button>
        </div>
      </div>

      {/* Conflicts Alert */}
      {conflicts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-2">Timetable Conflicts Detected:</div>
            <ul className="list-disc list-inside space-y-1">
              {conflicts.map((conflict, index) => (
                <li key={index} className="text-sm">{conflict.message}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Success Message */}
      {conflicts.length === 0 && currentTimetable.length > 0 && (
        <Alert className="border-green-200 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-800">
            No conflicts detected. Timetable is ready to save.
          </AlertDescription>
        </Alert>
      )}

      {/* Editor Grid */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Move className="h-5 w-5" />
            Drag & Drop Editor
          </CardTitle>
          <p className="text-sm text-slate-600">
            Click to edit slots, drag to move them, or use the action buttons.
          </p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-slate-300">
              <thead>
                <tr className="bg-slate-50">
                  <th className="border border-slate-300 p-3 text-left font-medium">Period</th>
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
                    <td className="border border-slate-300 p-3 font-medium bg-slate-50 text-center">
                      {period}
                    </td>
                    {days.map(day => {
                      const slot = getSlotForDayAndPeriod(day, period);
                      return (
                        <td 
                          key={`${day}-${period}`} 
                          className="border border-slate-300 p-2"
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(day, period)}
                        >
                          {slot ? (
                            <div 
                              draggable
                              onDragStart={() => handleDragStart(slot)}
                              className={`p-3 rounded-lg border-2 cursor-move hover:shadow-md transition-all ${
                                isConflictSlot(slot.id) 
                                  ? 'border-red-400 bg-red-50' 
                                  : 'border-blue-200 bg-blue-50'
                              }`}
                            >
                              <div className="flex items-start justify-between mb-2">
                                <div className="font-medium text-sm">{slot.subject}</div>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedSlot(slot);
                                    }}
                                  >
                                    <Edit className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSlotCopy(slot);
                                    }}
                                  >
                                    <Copy className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-6 w-6 p-0 text-red-600"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSlotDelete(slot.id);
                                    }}
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                              {!slot.isBreak && (
                                <>
                                  <div className="text-xs text-slate-600">{slot.teacher}</div>
                                  <div className="text-xs text-slate-600">{slot.room}</div>
                                </>
                              )}
                            </div>
                          ) : (
                            <div 
                              className="h-20 flex items-center justify-center text-slate-400 text-sm border-2 border-dashed border-slate-200 rounded-lg hover:border-slate-300 transition-colors"
                              onDragOver={handleDragOver}
                              onDrop={() => handleDrop(day, period)}
                            >
                              Drop here
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
        </CardContent>
      </Card>

      {/* Edit Slot Dialog */}
      <Dialog open={!!selectedSlot} onOpenChange={() => setSelectedSlot(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Timetable Slot</DialogTitle>
            <DialogDescription>
              Edit the subject and teacher for this timetable slot
            </DialogDescription>
          </DialogHeader>
          {selectedSlot && (
            <SlotEditForm
              slot={selectedSlot}
              onSave={handleSlotUpdate}
              onCancel={() => setSelectedSlot(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface SlotEditFormProps {
  slot: TimetableSlot;
  onSave: (slot: TimetableSlot) => void;
  onCancel: () => void;
}

function SlotEditForm({ slot, onSave, onCancel }: SlotEditFormProps) {
  const [formData, setFormData] = useState(slot);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="subject">Subject</Label>
        <Select value={formData.subject} onValueChange={(value) => setFormData(prev => ({ ...prev, subject: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mockSubjects.map(subject => (
              <SelectItem key={subject} value={subject}>{subject}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="teacher">Teacher</Label>
        <Select value={formData.teacher} onValueChange={(value) => setFormData(prev => ({ ...prev, teacher: value }))}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {mockTeachers.map(teacher => (
              <SelectItem key={teacher} value={teacher}>{teacher}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="room">Room</Label>
        <Select value={formData.room || ''} onValueChange={(value) => setFormData(prev => ({ ...prev, room: value }))}>
          <SelectTrigger>
            <SelectValue placeholder="Select room" />
          </SelectTrigger>
          <SelectContent>
            {mockRooms.map(room => (
              <SelectItem key={room} value={room}>{room}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="startTime">Start Time</Label>
          <Input
            type="time"
            value={formData.startTime}
            onChange={(e) => setFormData(prev => ({ ...prev, startTime: e.target.value }))}
          />
        </div>
        <div>
          <Label htmlFor="endTime">End Time</Label>
          <Input
            type="time"
            value={formData.endTime}
            onChange={(e) => setFormData(prev => ({ ...prev, endTime: e.target.value }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit">
          Save Changes
        </Button>
      </div>
    </form>
  );
}