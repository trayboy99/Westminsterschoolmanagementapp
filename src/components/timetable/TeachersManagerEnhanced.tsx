import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, Users, Clock } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  is_part_time: boolean;
  slot_priority: 'high' | 'medium' | 'low';
  max_periods_per_week: number;
  max_periods_per_day: number;
  qualified_subjects: string[];
  preferred_classes: string[];
  cannot_teach_same_period_as: string[];
  availability: {
    mon?: number[];
    tue?: number[];
    wed?: number[];
    thu?: number[];
    fri?: number[];
  };
}

interface Subject {
  id: string;
  name: string;
}

interface Class {
  id: string;
  name: string;
}

interface AvailabilityPreset {
  id: string;
  name: string;
  description: string;
  availability: any;
}

const DAYS: Array<{ key: keyof Teacher['availability']; label: string }> = [
  { key: 'mon', label: 'Monday' },
  { key: 'tue', label: 'Tuesday' },
  { key: 'wed', label: 'Wednesday' },
  { key: 'thu', label: 'Thursday' },
  { key: 'fri', label: 'Friday' }
];

const MAX_PERIODS = {
  mon: 8,
  tue: 8,
  wed: 8,
  thu: 10,
  fri: 7
};

export default function TeachersManagerEnhanced() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [presets, setPresets] = useState<AvailabilityPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Teacher>>({
    first_name: '',
    last_name: '',
    email: '',
    is_part_time: false,
    slot_priority: 'medium',
    max_periods_per_week: 20,
    max_periods_per_day: 6,
    qualified_subjects: [],
    preferred_classes: [],
    cannot_teach_same_period_as: [],
    availability: {
      mon: [1, 2, 3, 4, 5, 6, 7, 8],
      tue: [1, 2, 3, 4, 5, 6, 7, 8],
      wed: [1, 2, 3, 4, 5, 6, 7, 8],
      thu: [1, 2, 3, 4, 5, 6, 7, 8],
      fri: [1, 2, 3, 4]
    }
  });

  const supabase = createClient(projectId, publicAnonKey);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [teachersRes, subjectsRes, classesRes, presetsRes] = await Promise.all([
        supabase.from('profiles').select('*').eq('role', 'teacher'),
        supabase.from('subjects').select('id, name').order('name'),
        supabase.from('classes').select('id, name').order('name'),
        fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-availability-presets`, {
          headers: { 'Authorization': `Bearer ${publicAnonKey}` }
        }).then(r => r.json())
      ]);

      if (teachersRes.error) throw teachersRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (classesRes.error) throw classesRes.error;

      setTeachers(teachersRes.data || []);
      setSubjects(subjectsRes.data || []);
      setClasses(classesRes.data || []);
      setPresets(presetsRes.presets || []);
    } catch (error) {
      console.error('[Teachers] Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.first_name?.trim() || !formData.last_name?.trim()) {
        toast.error('First name and last name are required');
        return;
      }

      const teacherData: any = {
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        email: formData.email?.trim() || null,
        role: 'teacher',
        is_part_time: formData.is_part_time,
        slot_priority: formData.slot_priority,
        max_periods_per_week: formData.max_periods_per_week,
        max_periods_per_day: formData.max_periods_per_day,
        qualified_subjects: formData.qualified_subjects || [],
        preferred_classes: formData.preferred_classes || [],
        cannot_teach_same_period_as: formData.cannot_teach_same_period_as || [],
        availability: formData.availability || {}
      };

      if (editingId) {
        teacherData.id = editingId;
      }

      const { error } = await supabase
        .from('profiles')
        .upsert(teacherData);

      if (error) throw error;

      toast.success(editingId ? 'Teacher updated!' : 'Teacher created!');
      handleCancel();
      fetchData();
    } catch (error) {
      console.error('[Teachers] Save error:', error);
      toast.error('Failed to save teacher');
    }
  };

  const handleEdit = (teacher: Teacher) => {
    setFormData({
      ...teacher,
      availability: teacher.availability || {
        mon: [1, 2, 3, 4, 5, 6, 7, 8],
        tue: [1, 2, 3, 4, 5, 6, 7, 8],
        wed: [1, 2, 3, 4, 5, 6, 7, 8],
        thu: [1, 2, 3, 4, 5, 6, 7, 8],
        fri: [1, 2, 3, 4]
      }
    });
    setEditingId(teacher.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      first_name: '',
      last_name: '',
      email: '',
      is_part_time: false,
      slot_priority: 'medium',
      max_periods_per_week: 20,
      max_periods_per_day: 6,
      qualified_subjects: [],
      preferred_classes: [],
      cannot_teach_same_period_as: [],
      availability: {
        mon: [1, 2, 3, 4, 5, 6, 7, 8],
        tue: [1, 2, 3, 4, 5, 6, 7, 8],
        wed: [1, 2, 3, 4, 5, 6, 7, 8],
        thu: [1, 2, 3, 4, 5, 6, 7, 8],
        fri: [1, 2, 3, 4]
      }
    });
  };

  const togglePeriodAvailability = (day: keyof Teacher['availability'], period: number) => {
    const currentAvailability = formData.availability?.[day] || [];
    const newAvailability = currentAvailability.includes(period)
      ? currentAvailability.filter(p => p !== period)
      : [...currentAvailability, period].sort((a, b) => a - b);

    setFormData({
      ...formData,
      availability: {
        ...formData.availability,
        [day]: newAvailability
      }
    });
  };

  const applyPreset = (preset: AvailabilityPreset) => {
    setFormData({
      ...formData,
      availability: preset.availability
    });
    toast.success(`Applied "${preset.name}" preset`);
  };

  const toggleSubject = (subjectId: string) => {
    const current = formData.qualified_subjects || [];
    const updated = current.includes(subjectId)
      ? current.filter(id => id !== subjectId)
      : [...current, subjectId];
    setFormData({ ...formData, qualified_subjects: updated });
  };

  const toggleClass = (classId: string) => {
    const current = formData.preferred_classes || [];
    const updated = current.includes(classId)
      ? current.filter(id => id !== classId)
      : [...current, classId];
    setFormData({ ...formData, preferred_classes: updated });
  };

  const toggleConflict = (teacherId: string) => {
    const current = formData.cannot_teach_same_period_as || [];
    const updated = current.includes(teacherId)
      ? current.filter(id => id !== teacherId)
      : [...current, teacherId];
    setFormData({ ...formData, cannot_teach_same_period_as: updated });
  };

  if (loading) {
    return <div className="p-8 text-center">Loading teachers...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2">
            <Users className="h-6 w-6" />
            Teachers Master List
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage teachers with availability and preferences
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Teacher
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Teacher' : 'Add New Teacher'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  value={formData.first_name || ''}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  value={formData.last_name || ''}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email || ''}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            {/* Part-Time Settings */}
            <div className="space-y-4 p-4 bg-orange-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="is_part_time" className="text-base">Part-Time Teacher</Label>
                  <p className="text-sm text-gray-600">
                    Part-time teachers have priority scheduling
                  </p>
                </div>
                <Switch
                  id="is_part_time"
                  checked={formData.is_part_time}
                  onCheckedChange={(checked) => setFormData({ ...formData, is_part_time: checked })}
                />
              </div>

              {formData.is_part_time && (
                <div className="space-y-2">
                  <Label htmlFor="slot_priority">Scheduling Priority</Label>
                  <Select
                    value={formData.slot_priority}
                    onValueChange={(value: 'high' | 'medium' | 'low') => 
                      setFormData({ ...formData, slot_priority: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">High (Schedule First)</SelectItem>
                      <SelectItem value="medium">Medium (Normal)</SelectItem>
                      <SelectItem value="low">Low (Schedule Last)</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-600">
                    High priority = most constrained, schedule early
                  </p>
                </div>
              )}
            </div>

            {/* Period Constraints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="max_periods_week">Max Periods/Week</Label>
                <Input
                  id="max_periods_week"
                  type="number"
                  min="1"
                  max="40"
                  value={formData.max_periods_per_week || 20}
                  onChange={(e) => setFormData({ ...formData, max_periods_per_week: parseInt(e.target.value) })}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_periods_day">Max Periods/Day</Label>
                <Input
                  id="max_periods_day"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_periods_per_day || 6}
                  onChange={(e) => setFormData({ ...formData, max_periods_per_day: parseInt(e.target.value) })}
                />
              </div>
            </div>

            {/* Qualified Subjects */}
            <div className="space-y-3">
              <Label>Qualified Subjects</Label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-gray-50 rounded-lg max-h-48 overflow-y-auto">
                {subjects.map((subject) => (
                  <div key={subject.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`subject-${subject.id}`}
                      checked={formData.qualified_subjects?.includes(subject.id)}
                      onCheckedChange={() => toggleSubject(subject.id)}
                    />
                    <label
                      htmlFor={`subject-${subject.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {subject.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Preferred Classes */}
            <div className="space-y-3">
              <Label>Preferred Classes (Optional)</Label>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 p-4 bg-blue-50 rounded-lg max-h-48 overflow-y-auto">
                {classes.map((cls) => (
                  <div key={cls.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`class-${cls.id}`}
                      checked={formData.preferred_classes?.includes(cls.id)}
                      onCheckedChange={() => toggleClass(cls.id)}
                    />
                    <label
                      htmlFor={`class-${cls.id}`}
                      className="text-sm cursor-pointer"
                    >
                      {cls.name}
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {/* Teacher Conflicts */}
            {editingId && teachers.filter(t => t.id !== editingId).length > 0 && (
              <div className="space-y-3">
                <Label>Cannot Teach Same Period As (Conflicts)</Label>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 p-4 bg-red-50 rounded-lg max-h-48 overflow-y-auto">
                  {teachers.filter(t => t.id !== editingId).map((teacher) => (
                    <div key={teacher.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`teacher-${teacher.id}`}
                        checked={formData.cannot_teach_same_period_as?.includes(teacher.id)}
                        onCheckedChange={() => toggleConflict(teacher.id)}
                      />
                      <label
                        htmlFor={`teacher-${teacher.id}`}
                        className="text-sm cursor-pointer"
                      >
                        {teacher.first_name} {teacher.last_name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Weekly Availability Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base">Weekly Availability</Label>
                  <p className="text-sm text-gray-600">
                    Click cells to toggle availability for each period
                  </p>
                </div>
                {presets.length > 0 && (
                  <Select onValueChange={(value) => {
                    const preset = presets.find(p => p.id === value);
                    if (preset) applyPreset(preset);
                  }}>
                    <SelectTrigger className="w-48">
                      <SelectValue placeholder="Apply preset..." />
                    </SelectTrigger>
                    <SelectContent>
                      {presets.map((preset) => (
                        <SelectItem key={preset.id} value={preset.id}>
                          {preset.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr>
                      <th className="border p-2 bg-gray-100 text-sm">Period</th>
                      {DAYS.map(({ key, label }) => (
                        <th key={key} className="border p-2 bg-gray-100 text-sm">
                          {label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((period) => (
                      <tr key={period}>
                        <td className="border p-2 text-center text-sm bg-gray-50">
                          {period}
                        </td>
                        {DAYS.map(({ key }) => {
                          const maxPeriod = MAX_PERIODS[key];
                          const isAvailable = formData.availability?.[key]?.includes(period);
                          const isDisabled = period > maxPeriod;

                          return (
                            <td
                              key={key}
                              className={`border p-2 text-center cursor-pointer transition-colors ${
                                isDisabled
                                  ? 'bg-gray-200 cursor-not-allowed'
                                  : isAvailable
                                  ? 'bg-green-100 hover:bg-green-200'
                                  : 'bg-white hover:bg-gray-100'
                              }`}
                              onClick={() => {
                                if (!isDisabled) {
                                  togglePeriodAvailability(key, period);
                                }
                              }}
                            >
                              {!isDisabled && (
                                <div className="h-6 w-6 mx-auto rounded flex items-center justify-center">
                                  {isAvailable ? '✓' : ''}
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
              <p className="text-xs text-gray-600">
                ✓ = Available | Gray = Not applicable for this day | 
                Thu has 10 periods, Fri has 7 periods
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSave}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update Teacher' : 'Create Teacher'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teachers List */}
      <div className="grid grid-cols-1 gap-4">
        {teachers.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No teachers yet. Click "Add Teacher" to create one.
            </CardContent>
          </Card>
        ) : (
          teachers.map((teacher) => (
            <Card key={teacher.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3>{teacher.first_name} {teacher.last_name}</h3>
                      {teacher.is_part_time && (
                        <Badge className="bg-orange-100 text-orange-800">
                          Part-Time ({teacher.slot_priority})
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-3">
                      <div>
                        <span className="block text-xs text-gray-500">Max Periods</span>
                        <span className="text-gray-900">
                          {teacher.max_periods_per_week}/week, {teacher.max_periods_per_day}/day
                        </span>
                      </div>

                      <div>
                        <span className="block text-xs text-gray-500">Subjects</span>
                        <span className="text-gray-900">
                          {teacher.qualified_subjects?.length || 0} qualified
                        </span>
                      </div>

                      {teacher.preferred_classes && teacher.preferred_classes.length > 0 && (
                        <div>
                          <span className="block text-xs text-gray-500">Preferred Classes</span>
                          <span className="text-gray-900">
                            {teacher.preferred_classes.length} selected
                          </span>
                        </div>
                      )}

                      {teacher.cannot_teach_same_period_as && teacher.cannot_teach_same_period_as.length > 0 && (
                        <div>
                          <span className="block text-xs text-gray-500">Conflicts</span>
                          <span className="text-gray-900">
                            {teacher.cannot_teach_same_period_as.length} teacher(s)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(teacher)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
