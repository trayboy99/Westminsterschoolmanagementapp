import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Save, X, School, BookOpen } from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Class {
  id: string;
  name: string;
  level: 'junior' | 'senior';
  department?: 'Science' | 'Arts' | 'Commercial';
}

interface Subject {
  id: string;
  name: string;
  level: 'junior' | 'senior';
  type: 'general' | 'departmental';
  department?: 'Science' | 'Arts' | 'Commercial';
  is_major: boolean;
  max_periods_per_week: number;
}

interface ClassSubjectAssignment {
  id: string;
  class_id: string;
  subject_id: string;
  periods_per_week: number;
  is_compulsory: boolean;
  teacher_id?: string;
}

export default function ClassesManagerEnhanced() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [assignments, setAssignments] = useState<ClassSubjectAssignment[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<Partial<Class>>({
    name: '',
    level: 'junior'
  });
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [classSubjects, setClassSubjects] = useState<{[subjectId: string]: number}>({});

  const supabase = createClient(projectId, publicAnonKey);

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedClassId) {
      fetchClassSubjects(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchData = async () => {
    try {
      const [classesRes, subjectsRes, assignmentsRes] = await Promise.all([
        supabase.from('classes').select('*').order('name'),
        supabase.from('subjects').select('*').order('level, name'),
        supabase.from('class_subject_assignments').select('*')
      ]);

      if (classesRes.error) throw classesRes.error;
      if (subjectsRes.error) throw subjectsRes.error;
      if (assignmentsRes.error) throw assignmentsRes.error;

      setClasses(classesRes.data || []);
      setSubjects(subjectsRes.data || []);
      setAssignments(assignmentsRes.data || []);
    } catch (error) {
      console.error('[Classes] Fetch error:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const fetchClassSubjects = async (classId: string) => {
    try {
      const { data, error } = await supabase
        .from('class_subject_assignments')
        .select('*')
        .eq('class_id', classId);

      if (error) throw error;

      const subjectMap: {[key: string]: number} = {};
      (data || []).forEach(assignment => {
        subjectMap[assignment.subject_id] = assignment.periods_per_week;
      });
      setClassSubjects(subjectMap);
    } catch (error) {
      console.error('[Class Subjects] Fetch error:', error);
    }
  };

  const handleSaveClass = async () => {
    try {
      if (!formData.name?.trim()) {
        toast.error('Class name is required');
        return;
      }

      const classData: any = {
        name: formData.name.trim(),
        level: formData.level,
        department: formData.level === 'senior' ? formData.department : null
      };

      if (editingId) {
        classData.id = editingId;
      }

      const { error } = await supabase
        .from('classes')
        .upsert(classData);

      if (error) throw error;

      toast.success(editingId ? 'Class updated!' : 'Class created!');
      handleCancel();
      fetchData();
    } catch (error) {
      console.error('[Classes] Save error:', error);
      toast.error('Failed to save class');
    }
  };

  const handleEditClass = (cls: Class) => {
    setFormData(cls);
    setEditingId(cls.id);
    setShowAddForm(true);
  };

  const handleCancel = () => {
    setShowAddForm(false);
    setEditingId(null);
    setFormData({
      name: '',
      level: 'junior'
    });
  };

  const handleToggleSubject = async (classId: string, subjectId: string, periods: number) => {
    try {
      const existing = assignments.find(
        a => a.class_id === classId && a.subject_id === subjectId
      );

      if (existing) {
        // Remove assignment
        const { error } = await supabase
          .from('class_subject_assignments')
          .delete()
          .eq('id', existing.id);

        if (error) throw error;
      } else {
        // Add assignment
        const { error } = await supabase
          .from('class_subject_assignments')
          .insert({
            class_id: classId,
            subject_id: subjectId,
            periods_per_week: periods,
            is_compulsory: true
          });

        if (error) throw error;
      }

      toast.success(existing ? 'Subject removed' : 'Subject added');
      fetchData();
      if (selectedClassId) {
        fetchClassSubjects(selectedClassId);
      }
    } catch (error) {
      console.error('[Class Subjects] Toggle error:', error);
      toast.error('Failed to update subject assignment');
    }
  };

  const handleUpdatePeriods = async (assignmentId: string, periods: number) => {
    try {
      const { error } = await supabase
        .from('class_subject_assignments')
        .update({ periods_per_week: periods })
        .eq('id', assignmentId);

      if (error) throw error;

      fetchData();
      if (selectedClassId) {
        fetchClassSubjects(selectedClassId);
      }
    } catch (error) {
      console.error('[Class Subjects] Update error:', error);
      toast.error('Failed to update periods');
    }
  };

  const getRelevantSubjects = (cls: Class) => {
    return subjects.filter(subject => {
      // Match level
      if (subject.level !== cls.level) return false;

      // For junior classes, show all junior subjects
      if (cls.level === 'junior') return true;

      // For senior classes
      if (cls.level === 'senior') {
        // Show general subjects
        if (subject.type === 'general') return true;

        // Show departmental subjects matching class department
        if (subject.type === 'departmental' && subject.department === cls.department) {
          return true;
        }
      }

      return false;
    });
  };

  const getClassAssignments = (classId: string) => {
    return assignments.filter(a => a.class_id === classId);
  };

  if (loading) {
    return <div className="p-8 text-center">Loading classes...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2">
            <School className="h-6 w-6" />
            Classes & Subject Assignments
          </h2>
          <p className="text-sm text-gray-600 mt-1">
            Manage classes and assign subjects with periods
          </p>
        </div>
        {!showAddForm && (
          <Button onClick={() => setShowAddForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Class
          </Button>
        )}
      </div>

      {showAddForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Class' : 'Add New Class'}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Class Name *</Label>
                <Input
                  id="name"
                  value={formData.name || ''}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., JSS1A, SS2 Science"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="level">Level *</Label>
                <Select
                  value={formData.level}
                  onValueChange={(value: 'junior' | 'senior') => 
                    setFormData({ ...formData, level: value, department: value === 'junior' ? undefined : formData.department })
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

              {formData.level === 'senior' && (
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

            <div className="flex gap-2 justify-end pt-4 border-t">
              <Button variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button onClick={handleSaveClass}>
                <Save className="h-4 w-4 mr-2" />
                {editingId ? 'Update Class' : 'Create Class'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Classes List with Subject Assignment */}
      <div className="grid grid-cols-1 gap-4">
        {classes.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              No classes yet. Click "Add Class" to create one.
            </CardContent>
          </Card>
        ) : (
          classes.map((cls) => {
            const relevantSubjects = getRelevantSubjects(cls);
            const classAssignments = getClassAssignments(cls.id);
            const isExpanded = selectedClassId === cls.id;

            return (
              <Card key={cls.id}>
                <CardContent className="p-4">
                  <div className="space-y-4">
                    {/* Class Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <h3>{cls.name}</h3>
                        <Badge variant={cls.level === 'junior' ? 'secondary' : 'default'}>
                          {cls.level === 'junior' ? 'JSS' : 'SS'}
                        </Badge>
                        {cls.department && (
                          <Badge className="bg-purple-100 text-purple-800">
                            {cls.department}
                          </Badge>
                        )}
                        <Badge variant="outline">
                          {classAssignments.length} subjects
                        </Badge>
                      </div>

                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setSelectedClassId(isExpanded ? null : cls.id)}
                        >
                          <BookOpen className="h-4 w-4 mr-2" />
                          {isExpanded ? 'Hide' : 'Manage'} Subjects
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleEditClass(cls)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Subject Assignment Section */}
                    {isExpanded && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-lg space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm">
                            Available Subjects ({relevantSubjects.length})
                          </h4>
                          <p className="text-xs text-gray-600">
                            Click checkbox to assign/unassign | Adjust periods as needed
                          </p>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                          {relevantSubjects.map((subject) => {
                            const assignment = classAssignments.find(
                              a => a.subject_id === subject.id
                            );
                            const isAssigned = !!assignment;

                            return (
                              <div
                                key={subject.id}
                                className={`flex items-center justify-between p-3 rounded border-2 transition-colors ${
                                  isAssigned
                                    ? 'bg-green-50 border-green-200'
                                    : 'bg-white border-gray-200'
                                }`}
                              >
                                <div className="flex items-center gap-3 flex-1">
                                  <Checkbox
                                    checked={isAssigned}
                                    onCheckedChange={() => {
                                      handleToggleSubject(
                                        cls.id,
                                        subject.id,
                                        subject.max_periods_per_week || 4
                                      );
                                    }}
                                  />
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <span className="text-sm">{subject.name}</span>
                                      {subject.is_major && (
                                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                                          Major
                                        </Badge>
                                      )}
                                      {subject.type === 'departmental' && (
                                        <Badge variant="outline" className="text-xs">
                                          {subject.department}
                                        </Badge>
                                      )}
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      Default: {subject.max_periods_per_week} periods/week
                                    </p>
                                  </div>
                                </div>

                                {isAssigned && assignment && (
                                  <div className="flex items-center gap-2">
                                    <Label htmlFor={`periods-${subject.id}`} className="text-xs">
                                      Periods/Week:
                                    </Label>
                                    <Input
                                      id={`periods-${subject.id}`}
                                      type="number"
                                      min="1"
                                      max="10"
                                      value={assignment.periods_per_week}
                                      onChange={(e) => {
                                        const val = parseInt(e.target.value);
                                        if (val >= 1 && val <= 10) {
                                          handleUpdatePeriods(assignment.id, val);
                                        }
                                      }}
                                      className="w-20"
                                    />
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>

                        {relevantSubjects.length === 0 && (
                          <div className="text-center text-sm text-gray-500 py-8">
                            No subjects available for this class level/department.
                            <br />
                            Create subjects first in the Subjects Manager.
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
