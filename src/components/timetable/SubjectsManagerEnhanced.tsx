import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Switch } from '../ui/switch';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Subject {
  id: string;
  name: string;
  code?: string;
  level: 'junior' | 'senior';
  type: 'general' | 'departmental';
  department?: 'Science' | 'Arts' | 'Commercial';
  is_major: boolean;
  min_periods_per_week: number;
  max_periods_per_week: number;
  double_allowed: boolean;
  double_max_per_week: number;
  preferred_time_slots?: 'morning' | 'afternoon' | 'any';
}

export default function SubjectsManagerEnhanced() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Subject>>({
    name: '',
    code: '',
    level: 'junior',
    type: 'general',
    is_major: false,
    min_periods_per_week: 2,
    max_periods_per_week: 4,
    double_allowed: false,
    double_max_per_week: 1,
    preferred_time_slots: 'any'
  });

  const supabase = createClient(projectId, publicAnonKey);

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('[Subjects] Fetch error:', error);
      toast.error('Failed to load subjects');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      if (!formData.name?.trim()) {
        toast.error('Subject name is required');
        return;
      }

      const subjectData: any = {
        name: formData.name.trim(),
        code: formData.code?.trim() || null,
        level: formData.level,
        type: formData.type,
        department: formData.type === 'departmental' ? formData.department : null,
        is_major: formData.is_major,
        min_periods_per_week: formData.min_periods_per_week,
        max_periods_per_week: formData.max_periods_per_week,
        double_allowed: formData.double_allowed,
        double_max_per_week: formData.double_max_per_week,
        preferred_time_slots: formData.preferred_time_slots
      };

      if (editingId) {
        subjectData.id = editingId;
      }

      const { error } = await supabase
        .from('subjects')
        .upsert(subjectData);

      if (error) throw error;

      toast.success(editingId ? 'Subject updated!' : 'Subject created!');
      setShowAddForm(false);
      setEditingId(null);
      setFormData({
        name: '',
        code: '',
        level: 'junior',
        type: 'general',
        is_major: false,
        min_periods_per_week: 2,
        max_periods_per_week: 4,
        double_allowed: false,
        double_max_per_week: 1,
        preferred_time_slots: 'any'
      });
      fetchSubjects();
    } catch (error) {
      console.error('[Subjects] Save error:', error);
      toast.error('Failed to save subject');
    }
  };

  const handleEdit = (subject: Subject) => {
    setFormData(subject);
    setEditingId(subject.id);
    setShowAddForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this subject? This will affect all related assignments.')) return;

    try {
      const { error } = await supabase
        .from('subjects')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Subject deleted');
      fetchSubjects();
    } catch (error) {
      console.error('[Subjects] Delete error:', error);
      toast.error('Failed to delete subject');
    }
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      code: '',
      level: 'junior',
      type: 'general',
      is_major: false,
      min_periods_per_week: 2,
      max_periods_per_week: 4,
      double_allowed: false,
      double_max_per_week: 1,
      preferred_time_slots: 'any'
    });
  };

  if (loading) {
    return <div className="p-8 text-center">Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2">
            <BookOpen className="h-6 w-6" />
            Subjects Master List
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage all subjects with Nigerian school settings
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Subject
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Subject' : 'Add New Subject'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Subject Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Mathematics, Physics"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="code">Subject Code</Label>
                <Input
                  id="code"
                  value={formData.code || ''}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                  placeholder="e.g., MATH, PHY"
                />
              </div>
            </div>

            {/* Level and Type */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value: 'junior' | 'senior') => 
                    setFormData({ ...formData, level: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="junior">Junior (JSS1-3)</SelectItem>
                    <SelectItem value="senior">Senior (SS1-3)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">Type *</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: 'general' | 'departmental') => 
                    setFormData({ ...formData, type: value, department: value === 'general' ? undefined : formData.department })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="general">General (All Students)</SelectItem>
                    <SelectItem value="departmental">Departmental</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {formData.type === 'departmental' && (
                <div className="space-y-2">
                  <Label htmlFor="department">Department *</Label>
                  <Select
                    value={formData.department}
                    onValueChange={(value: 'Science' | 'Arts' | 'Commercial') => 
                      setFormData({ ...formData, department: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select department" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Science">Science</SelectItem>
                      <SelectItem value="Arts">Arts</SelectItem>
                      <SelectItem value="Commercial">Commercial</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Major Subject Toggle */}
            <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
              <div>
                <Label htmlFor="is_major" className="text-base">Major Subject</Label>
                <p className="text-sm text-gray-600">
                  Major subjects typically get more periods per week
                </p>
              </div>
              <Switch
                id="is_major"
                checked={formData.is_major}
                onCheckedChange={(checked) => setFormData({ ...formData, is_major: checked })}
              />
            </div>

            {/* Periods Per Week */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="min_periods">Min Periods/Week *</Label>
                <Input
                  id="min_periods"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.min_periods_per_week || 2}
                  onChange={(e) => setFormData({ ...formData, min_periods_per_week: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-600">Minimum periods per week</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="max_periods">Max Periods/Week *</Label>
                <Input
                  id="max_periods"
                  type="number"
                  min="1"
                  max="10"
                  value={formData.max_periods_per_week || 4}
                  onChange={(e) => setFormData({ ...formData, max_periods_per_week: parseInt(e.target.value) })}
                />
                <p className="text-xs text-gray-600">Maximum/required periods per week</p>
              </div>
            </div>

            {/* Double Period Settings */}
            <div className="space-y-4 p-4 bg-purple-50 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <Label htmlFor="double_allowed" className="text-base">Allow Double Periods</Label>
                  <p className="text-sm text-gray-600">
                    Can this subject have consecutive periods?
                  </p>
                </div>
                <Switch
                  id="double_allowed"
                  checked={formData.double_allowed}
                  onCheckedChange={(checked) => setFormData({ ...formData, double_allowed: checked })}
                />
              </div>

              {formData.double_allowed && (
                <div className="space-y-2">
                  <Label htmlFor="double_max">Max Double Periods/Week</Label>
                  <Input
                    id="double_max"
                    type="number"
                    min="1"
                    max="3"
                    value={formData.double_max_per_week || 1}
                    onChange={(e) => setFormData({ ...formData, double_max_per_week: parseInt(e.target.value) })}
                  />
                  <p className="text-xs text-gray-600">Typically 1 double period per week</p>
                </div>
              )}
            </div>

            {/* Time Slot Preference */}
            <div className="space-y-2">
              <Label htmlFor="preferred_time">Preferred Time Slots</Label>
              <Select
                value={formData.preferred_time_slots}
                onValueChange={(value: 'morning' | 'afternoon' | 'any') => 
                  setFormData({ ...formData, preferred_time_slots: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any Time</SelectItem>
                  <SelectItem value="morning">Morning (Better Focus)</SelectItem>
                  <SelectItem value="afternoon">Afternoon</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-600">
                Scheduler will try to respect this preference
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
                {editingId ? 'Update Subject' : 'Create Subject'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Subjects List */}
      <div className="grid grid-cols-1 gap-4">
        {subjects.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No subjects yet. Click "Add Subject" to create one.
            </CardContent>
          </Card>
        ) : (
          subjects.map((subject) => (
            <Card key={subject.id}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3>{subject.name}</h3>
                      {subject.code && (
                        <Badge variant="outline">{subject.code}</Badge>
                      )}
                      {subject.is_major && (
                        <Badge className="bg-blue-100 text-blue-800">Major</Badge>
                      )}
                      <Badge variant={subject.level === 'junior' ? 'secondary' : 'default'}>
                        {subject.level === 'junior' ? 'JSS1-3' : 'SS1-3'}
                      </Badge>
                      {subject.type === 'departmental' && subject.department && (
                        <Badge className="bg-purple-100 text-purple-800">
                          {subject.department}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm text-gray-600 mt-3">
                      <div>
                        <span className="block text-xs text-gray-500">Periods/Week</span>
                        <span className="text-gray-900">
                          {subject.min_periods_per_week === subject.max_periods_per_week
                            ? subject.max_periods_per_week
                            : `${subject.min_periods_per_week}-${subject.max_periods_per_week}`
                          }
                        </span>
                      </div>

                      {subject.double_allowed && (
                        <div>
                          <span className="block text-xs text-gray-500">Double Periods</span>
                          <span className="text-gray-900">
                            Max {subject.double_max_per_week}/week
                          </span>
                        </div>
                      )}

                      {subject.preferred_time_slots && subject.preferred_time_slots !== 'any' && (
                        <div>
                          <span className="block text-xs text-gray-500">Preferred Time</span>
                          <span className="text-gray-900 capitalize">
                            {subject.preferred_time_slots}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEdit(subject)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDelete(subject.id)}
                    >
                      <Trash2 className="h-4 w-4" />
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
