import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Checkbox } from '../ui/checkbox';
import { Separator } from '../ui/separator';
import { Badge } from '../ui/badge';
import { X, Plus, Settings, Save } from 'lucide-react';

interface TimetableSettingsProps {
  onSave: (settings: TimetableConfig) => void;
  onCancel: () => void;
}

export interface TimetableConfig {
  periodsPerDay: number;
  schoolStartTime: string;
  schoolEndTime: string;
  periodDuration: number;
  breaks: {
    count: number;
    duration: number;
    afterPeriods: number;
  };
  coreSubjects: string[];
  doublePeriodsSubjects: string[];
  pairedSubjects: Array<{ subject1: string; subject2: string }>;
  teachers: Array<{
    id: string;
    name: string;
    type: 'full-time' | 'part-time';
    availability?: {
      days: string[];
      slots: string[];
    };
  }>;
  weeklyPeriods: Record<string, number>;
}

const defaultSettings: TimetableConfig = {
  periodsPerDay: 8,
  schoolStartTime: '08:00',
  schoolEndTime: '15:30',
  periodDuration: 45,
  breaks: {
    count: 2,
    duration: 15,
    afterPeriods: 3
  },
  coreSubjects: ['Mathematics', 'English', 'Science'],
  doublePeriodsSubjects: ['Science Lab', 'Computer Science'],
  pairedSubjects: [
    { subject1: 'Science', subject2: 'Civic Education' },
    { subject1: 'Mathematics', subject2: 'Art' }
  ],
  teachers: [
    { id: '1', name: 'Dr. Ahmed Hassan', type: 'full-time' },
    { id: '2', name: 'Ms. Sarah Wilson', type: 'part-time', availability: { days: ['Monday', 'Wednesday', 'Friday'], slots: ['morning', 'mid-day'] } }
  ],
  weeklyPeriods: {
    'Mathematics': 6,
    'English': 5,
    'Science': 4,
    'History': 3,
    'Geography': 3,
    'Art': 2,
    'Physical Education': 2
  }
};

export function TimetableSettings({ onSave, onCancel }: TimetableSettingsProps) {
  const [settings, setSettings] = useState<TimetableConfig>(defaultSettings);
  const [newSubject, setNewSubject] = useState('');
  const [newTeacher, setNewTeacher] = useState({ name: '', type: 'full-time' as const });

  const addCoreSubject = () => {
    if (newSubject && !settings.coreSubjects.includes(newSubject)) {
      setSettings(prev => ({
        ...prev,
        coreSubjects: [...prev.coreSubjects, newSubject]
      }));
      setNewSubject('');
    }
  };

  const removeCoreSubject = (subject: string) => {
    setSettings(prev => ({
      ...prev,
      coreSubjects: prev.coreSubjects.filter(s => s !== subject)
    }));
  };

  const addDoublePeriodsSubject = () => {
    if (newSubject && !settings.doublePeriodsSubjects.includes(newSubject)) {
      setSettings(prev => ({
        ...prev,
        doublePeriodsSubjects: [...prev.doublePeriodsSubjects, newSubject]
      }));
      setNewSubject('');
    }
  };

  const removeDoublePeriodsSubject = (subject: string) => {
    setSettings(prev => ({
      ...prev,
      doublePeriodsSubjects: prev.doublePeriodsSubjects.filter(s => s !== subject)
    }));
  };

  const addTeacher = () => {
    if (newTeacher.name) {
      const teacher = {
        id: Date.now().toString(),
        name: newTeacher.name,
        type: newTeacher.type,
        ...(newTeacher.type === 'part-time' && {
          availability: { days: ['Monday'], slots: ['morning'] }
        })
      };
      
      setSettings(prev => ({
        ...prev,
        teachers: [...prev.teachers, teacher]
      }));
      setNewTeacher({ name: '', type: 'full-time' });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          <h2 className="text-2xl font-bold">Timetable Settings</h2>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={() => onSave(settings)}>
            <Save className="h-4 w-4 mr-2" />
            Save Settings
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Basic Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Schedule Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="periodsPerDay">Periods per Day</Label>
                <Input
                  id="periodsPerDay"
                  type="number"
                  value={settings.periodsPerDay}
                  onChange={(e) => setSettings(prev => ({ ...prev, periodsPerDay: parseInt(e.target.value) }))}
                />
              </div>
              <div>
                <Label htmlFor="periodDuration">Period Duration (minutes)</Label>
                <Input
                  id="periodDuration"
                  type="number"
                  value={settings.periodDuration}
                  onChange={(e) => setSettings(prev => ({ ...prev, periodDuration: parseInt(e.target.value) }))}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="startTime">School Start Time</Label>
                <Input
                  id="startTime"
                  type="time"
                  value={settings.schoolStartTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, schoolStartTime: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="endTime">School End Time</Label>
                <Input
                  id="endTime"
                  type="time"
                  value={settings.schoolEndTime}
                  onChange={(e) => setSettings(prev => ({ ...prev, schoolEndTime: e.target.value }))}
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label className="text-base font-medium">Break Configuration</Label>
              <div className="grid grid-cols-3 gap-4 mt-2">
                <div>
                  <Label htmlFor="breakCount">Number of Breaks</Label>
                  <Input
                    id="breakCount"
                    type="number"
                    value={settings.breaks.count}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      breaks: { ...prev.breaks, count: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="breakDuration">Break Duration (min)</Label>
                  <Input
                    id="breakDuration"
                    type="number"
                    value={settings.breaks.duration}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      breaks: { ...prev.breaks, duration: parseInt(e.target.value) }
                    }))}
                  />
                </div>
                <div>
                  <Label htmlFor="afterPeriods">After How Many Periods</Label>
                  <Input
                    id="afterPeriods"
                    type="number"
                    value={settings.breaks.afterPeriods}
                    onChange={(e) => setSettings(prev => ({
                      ...prev,
                      breaks: { ...prev.breaks, afterPeriods: parseInt(e.target.value) }
                    }))}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subject Configuration */}
        <Card>
          <CardHeader>
            <CardTitle>Subject Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-base font-medium">Core Subjects (Priority)</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add core subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
                <Button size="sm" onClick={addCoreSubject}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.coreSubjects.map((subject) => (
                  <Badge key={subject} variant="secondary" className="flex items-center gap-1">
                    {subject}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeCoreSubject(subject)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Double Period Subjects</Label>
              <div className="flex gap-2 mt-2">
                <Input
                  placeholder="Add double period subject"
                  value={newSubject}
                  onChange={(e) => setNewSubject(e.target.value)}
                />
                <Button size="sm" onClick={addDoublePeriodsSubject}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-wrap gap-2 mt-2">
                {settings.doublePeriodsSubjects.map((subject) => (
                  <Badge key={subject} variant="outline" className="flex items-center gap-1">
                    {subject}
                    <X 
                      className="h-3 w-3 cursor-pointer" 
                      onClick={() => removeDoublePeriodsSubject(subject)}
                    />
                  </Badge>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-base font-medium">Weekly Period Allocation</Label>
              <div className="space-y-2 mt-2 max-h-40 overflow-y-auto">
                {Object.entries(settings.weeklyPeriods).map(([subject, periods]) => (
                  <div key={subject} className="flex items-center justify-between">
                    <span className="text-sm">{subject}</span>
                    <Input
                      type="number"
                      className="w-20"
                      value={periods}
                      onChange={(e) => setSettings(prev => ({
                        ...prev,
                        weeklyPeriods: {
                          ...prev.weeklyPeriods,
                          [subject]: parseInt(e.target.value) || 0
                        }
                      }))}
                    />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Teacher Configuration */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teacher Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Input
                placeholder="Teacher name"
                value={newTeacher.name}
                onChange={(e) => setNewTeacher(prev => ({ ...prev, name: e.target.value }))}
              />
              <Select value={newTeacher.type} onValueChange={(value: 'full-time' | 'part-time') => setNewTeacher(prev => ({ ...prev, type: value }))}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full-time">Full-time</SelectItem>
                  <SelectItem value="part-time">Part-time</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={addTeacher}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {settings.teachers.map((teacher) => (
                <div key={teacher.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium">{teacher.name}</h4>
                    <Badge variant={teacher.type === 'full-time' ? 'default' : 'secondary'}>
                      {teacher.type}
                    </Badge>
                  </div>
                  
                  {teacher.type === 'part-time' && teacher.availability && (
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="font-medium">Available Days:</span>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map((day) => (
                            <label key={day} className="flex items-center space-x-1">
                              <Checkbox
                                checked={teacher.availability?.days.includes(day)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSettings(prev => ({
                                      ...prev,
                                      teachers: prev.teachers.map(t => 
                                        t.id === teacher.id 
                                          ? { ...t, availability: { ...t.availability!, days: [...t.availability!.days, day] } }
                                          : t
                                      )
                                    }));
                                  } else {
                                    setSettings(prev => ({
                                      ...prev,
                                      teachers: prev.teachers.map(t => 
                                        t.id === teacher.id 
                                          ? { ...t, availability: { ...t.availability!, days: t.availability!.days.filter(d => d !== day) } }
                                          : t
                                      )
                                    }));
                                  }
                                }}
                              />
                              <span className="text-xs">{day.slice(0, 3)}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <span className="font-medium">Time Slots:</span>
                        <div className="flex gap-2 mt-1">
                          {['morning', 'mid-day', 'afternoon'].map((slot) => (
                            <label key={slot} className="flex items-center space-x-1">
                              <Checkbox
                                checked={teacher.availability?.slots.includes(slot)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSettings(prev => ({
                                      ...prev,
                                      teachers: prev.teachers.map(t => 
                                        t.id === teacher.id 
                                          ? { ...t, availability: { ...t.availability!, slots: [...t.availability!.slots, slot] } }
                                          : t
                                      )
                                    }));
                                  } else {
                                    setSettings(prev => ({
                                      ...prev,
                                      teachers: prev.teachers.map(t => 
                                        t.id === teacher.id 
                                          ? { ...t, availability: { ...t.availability!, slots: t.availability!.slots.filter(s => s !== slot) } }
                                          : t
                                      )
                                    }));
                                  }
                                }}
                              />
                              <span className="text-xs capitalize">{slot}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}