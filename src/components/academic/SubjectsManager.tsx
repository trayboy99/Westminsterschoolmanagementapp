import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Plus, Edit2, Trash2, BookOpen, GraduationCap, Loader2, Hash, X, Users } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Separator } from '../ui/separator';
import { Checkbox } from '../ui/checkbox';

interface Subject {
  id: string;
  name: string;
  code: string;
  level?: string;
  department_id: string | null;
  main_teacher_id: string | null;
  created_at: string;
  updated_at: string;
}

interface Department {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  level: string;
  display_name: string;
}

interface Assignment {
  id: string;
  subject_id: string;
  class_id: string;
  teacher_id: string | null;
  class: Class;
  teacher: {
    id: string;
    name: string;
  } | null;
}

interface SubjectsManagerProps {
  userProfile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  onStatsUpdate: () => void;
}

export function SubjectsManager({ userProfile, onStatsUpdate }: SubjectsManagerProps) {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    level: 'junior',
    department_id: '',
    autoAssignToClasses: true // ✅ NEW: Auto-assign to class_subjects
  });
  const [assignments, setAssignments] = useState<Record<string, string>>({});
  const [existingAssignments, setExistingAssignments] = useState<Assignment[]>([]);
  const [allAssignments, setAllAssignments] = useState<Record<string, Assignment[]>>({}); // All assignments by subject ID

  const hasManagementAccess = ['principal', 'it_admin', 'director', 'secretary'].includes(userProfile.role);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authentication token
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      // Fetch subjects, teachers, departments, and classes
      const [subjectsResponse, teachersResponse, departmentsResponse, classesResponse] = await Promise.all([
        fetch(`${baseUrl}/subjects`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseUrl}/teachers`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseUrl}/departments`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseUrl}/classes`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const [subjectsData, teachersData, departmentsData, classesData] = await Promise.all([
        subjectsResponse.json(),
        teachersResponse.json(),
        departmentsResponse.json(),
        classesResponse.json()
      ]);

      if (subjectsData.success) {
        setSubjects(subjectsData.subjects || []);
      } else {
        throw new Error(subjectsData.error || 'Failed to fetch subjects');
      }

      if (teachersData.success) {
        setTeachers(teachersData.teachers || []);
      } else {
        throw new Error(teachersData.error || 'Failed to fetch teachers');
      }

      if (departmentsData.success) {
        setDepartments(departmentsData.departments || []);
      } else {
        // Don't throw error for departments - it's not critical
        setDepartments([]);
      }

      if (classesData.success) {
        setClasses(classesData.classes || []);
        console.log('[SubjectsManager] Loaded classes:', classesData.classes?.length || 0);
      } else {
        console.warn('[SubjectsManager] Failed to load classes:', classesData.error);
        setClasses([]);
      }

      // Fetch all subject assignments
      await fetchAllAssignments();

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  // Fetch all assignments for display in the table
  const fetchAllAssignments = async () => {
    try {
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      const response = await fetch(`${baseUrl}/subject-assignments`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      
      if (data.success && data.assignments) {
        // Group assignments by subject_id
        const assignmentsBySubject: Record<string, Assignment[]> = {};
        data.assignments.forEach((assignment: Assignment) => {
          if (!assignmentsBySubject[assignment.subject_id]) {
            assignmentsBySubject[assignment.subject_id] = [];
          }
          assignmentsBySubject[assignment.subject_id].push(assignment);
        });
        setAllAssignments(assignmentsBySubject);
      }
    } catch (error) {
      console.error('Error fetching all assignments:', error);
    }
  };

  // Fetch classes with sections
  const fetchClasses = async () => {
    try {
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      const response = await fetch(`${baseUrl}/classes`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Classes API response:', data);

      if (data.success) {
        setClasses(data.classes || []);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  // Fetch existing assignments for a subject
  const fetchAssignments = async (subjectId: string) => {
    try {
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      const response = await fetch(`${baseUrl}/subject-assignments?subject_id=${subjectId}`, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();
      console.log('Subject assignments API response:', data);

      if (data.success) {
        setExistingAssignments(data.assignments || []);
        
        // Convert assignments to state format: { classId: teacherId }
        const assignmentMap: Record<string, string> = {};
        (data.assignments || []).forEach((assignment: Assignment) => {
          if (assignment.teacher_id) {
            assignmentMap[assignment.class_id] = assignment.teacher_id;
          }
        });
        setAssignments(assignmentMap);
      }
    } catch (error) {
      console.error('Error fetching assignments:', error);
    }
  };

  // Ensure "General" department exists
  const ensureGeneralDepartment = async () => {
    try {
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      await fetch(`${baseUrl}/departments/ensure-general`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });
    } catch (error) {
      console.error('Error ensuring General department:', error);
    }
  };

  useEffect(() => {
    ensureGeneralDepartment().then(() => {
      fetchData();
      fetchClasses();
    });
  }, []);

  // Fetch assignments when editing a subject
  useEffect(() => {
    if (editingSubject) {
      fetchAssignments(editingSubject.id);
    } else {
      // Reset assignments when creating new subject
      setAssignments({});
      setExistingAssignments([]);
    }
  }, [editingSubject]);

  // ✅ NEW: Auto-assign subject to class_subjects table based on level
  const autoAssignToClassSubjects = async (subjectId: string, level: string) => {
    try {
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      // Get matching classes based on level
      const matchingClasses = classes.filter(c => {
        const classLevel = c.level?.toLowerCase();
        return level === 'junior' ? classLevel === 'junior' : classLevel === 'senior';
      });

      console.log(`[Auto-Assign] Assigning subject ${subjectId} to ${matchingClasses.length} ${level} classes`);

      // Create class_subjects entries for each matching class
      let successCount = 0;
      for (const classItem of matchingClasses) {
        try {
          const response = await fetch(`${baseUrl}/class-subjects`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              class_id: classItem.id,
              subject_id: subjectId
            })
          });

          const data = await response.json();
          if (data.success) {
            successCount++;
            console.log(`[Auto-Assign] ✅ Assigned to ${classItem.name}`);
          } else {
            console.warn(`[Auto-Assign] Failed for ${classItem.name}:`, data.error);
          }
        } catch (err) {
          console.error(`[Auto-Assign] Error for ${classItem.name}:`, err);
        }
      }

      if (successCount > 0) {
        toast.success(`Subject automatically assigned to ${successCount} ${level} class${successCount !== 1 ? 'es' : ''}!`);
      }
    } catch (error) {
      console.error('[Auto-Assign] Error:', error);
      // Don't throw - this is a bonus feature, main subject creation already succeeded
    }
  };

  // Save subject-class-teacher assignments
  const saveAssignments = async (subjectId: string) => {
    try {
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) return;

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      // Delete removed assignments (existed before but not in current state)
      for (const existing of existingAssignments) {
        if (!assignments[existing.class_id]) {
          await fetch(`${baseUrl}/subject-assignments/${existing.id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          });
          console.log('Deleted assignment:', existing.id);
        }
      }

      // Create or update assignments
      for (const [classId, teacherId] of Object.entries(assignments)) {
        if (!teacherId || teacherId === 'none') continue; // Skip if no teacher selected

        const existing = existingAssignments.find(a => a.class_id === classId);
        
        if (existing) {
          // Update if teacher changed
          if (existing.teacher_id !== teacherId) {
            await fetch(`${baseUrl}/subject-assignments/${existing.id}`, {
              method: 'PUT',
              headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
              },
              body: JSON.stringify({ teacher_id: teacherId })
            });
            console.log('Updated assignment:', existing.id);
          }
        } else {
          // Create new assignment
          await fetch(`${baseUrl}/subject-assignments`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subject_id: subjectId,
              class_id: classId,
              teacher_id: teacherId
            })
          });
          console.log('Created new assignment for class:', classId);
        }

        // ✅ SYNC: Also add to class_subjects table if not exists (for Subject Offerings tab)
        // This ensures that when you assign a subject to a class, it shows up in Subject Offerings
        try {
          const syncResponse = await fetch(`${baseUrl}/class-subjects/sync`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              subject_id: subjectId,
              class_id: classId,
              is_compulsory: false // Default to elective, can be changed in Subject Offerings tab
            })
          });
          const syncData = await syncResponse.json();
          if (syncData.success || syncData.message?.includes('already exists')) {
            console.log(`[Sync] ✅ Subject ${subjectId} synced to class_subjects for class ${classId}`);
          }
        } catch (syncError) {
          console.warn('[Sync] Non-critical error syncing to class_subjects:', syncError);
          // Don't fail the main operation if sync fails
        }
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      throw error;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasManagementAccess) {
      toast.error('You do not have permission to manage subjects');
      return;
    }

    if (!formData.name.trim() || !formData.code.trim()) {
      toast.error('Subject name and code are required');
      return;
    }

    // Validate that at least one class has a teacher assigned
    const assignedClasses = Object.keys(assignments).filter(classId => assignments[classId] && assignments[classId] !== 'none');
    if (assignedClasses.length === 0) {
      toast.error('Please assign at least one teacher to a class for this subject');
      return;
    }

    if (teachers.length === 0) {
      toast.error('No teachers available. Please create teachers first.');
      return;
    }

    try {
      setSubmitting(true);

      // Get authentication token
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      const requestData = {
        name: formData.name.trim(),
        code: formData.code.trim().toUpperCase(),
        level: formData.level,
        department_id: formData.department_id === 'none' ? null : formData.department_id || null,
        main_teacher_id: null // No longer using main_teacher_id
      };

      const response = await fetch(
        editingSubject 
          ? `${baseUrl}/subjects/${editingSubject.id}` 
          : `${baseUrl}/subjects`,
        {
          method: editingSubject ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${data.error || 'Failed to save subject'}`);
      }

      if (data.success) {
        const subjectId = editingSubject?.id || data.subject?.id;
        
        // Save class assignments (subject_assignments table)
        if (subjectId) {
          await saveAssignments(subjectId);
        }
        
        // ✅ NEW: Auto-assign to class_subjects table (for Subject Offerings)
        if (subjectId && !editingSubject && formData.autoAssignToClasses) {
          await autoAssignToClassSubjects(subjectId, formData.level);
        }
        
        toast.success(`${data.message} Class assignments saved successfully!`);
        setDialogOpen(false);
        setEditingSubject(null);
        resetForm();
        await fetchData();
        onStatsUpdate();
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Error saving subject:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to save subject');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (subject: Subject) => {
    if (!hasManagementAccess) {
      toast.error('You do not have permission to edit subjects');
      return;
    }

    setEditingSubject(subject);
    setFormData({
      name: subject.name,
      code: subject.code,
      level: subject.level || 'junior',
      department_id: subject.department_id || 'none',
      autoAssignToClasses: false // Not used when editing
    });
    setDialogOpen(true);
  };

  const handleDelete = async (subject: Subject) => {
    if (!hasManagementAccess) {
      toast.error('You do not have permission to delete subjects');
      return;
    }

    if (!confirm(`Are you sure you want to delete the subject "${subject.name}"?`)) {
      return;
    }

    try {
      // Get authentication token
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      const response = await fetch(`${baseUrl}/subjects/${subject.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await fetchData();
        onStatsUpdate();
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      console.error('Error deleting subject:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete subject');
    }
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return 'No teacher assigned';
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown teacher';
  };

  const getDepartmentName = (departmentId: string | null) => {
    if (!departmentId) return 'No department';
    const department = departments.find(d => d.id === departmentId);
    return department ? department.name : 'Unknown department';
  };

  const resetForm = () => {
    setFormData({ 
      name: '', 
      code: '', 
      level: 'junior',
      department_id: 'none',
      autoAssignToClasses: true // ✅ Reset to true by default
    });
    setEditingSubject(null);
    setAssignments({});
    setExistingAssignments([]);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading subjects...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Subjects Management</h2>
          <p className="text-muted-foreground">
            Manage academic subjects and assign main teachers
          </p>
        </div>
        {hasManagementAccess && (
          <Dialog open={dialogOpen} onOpenChange={(open) => {
            setDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent className="max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>
                  {editingSubject ? 'Edit Subject' : 'Add New Subject'}
                </DialogTitle>
                <DialogDescription>
                  {editingSubject 
                    ? 'Update the subject information and class assignments below.'
                    : 'Create a new subject. Assign a subject code, designate a main teacher, and assign teachers to specific classes.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="subjectName">Subject Name</Label>
                    <Input
                      id="subjectName"
                      placeholder="e.g., Mathematics, English Literature"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="code">Subject Code</Label>
                    <Input
                      id="code"
                      placeholder="e.g., MATH101, ENG202"
                      value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      A unique code to identify this subject (will be converted to uppercase)
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Level *</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                    >
                      <SelectTrigger id="level">
                        <SelectValue placeholder="Select level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="junior">Junior (JS 1-3)</SelectItem>
                        <SelectItem value="senior">Senior (SS 1-3)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Specify whether this is a junior or senior subject
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department (Optional)</Label>
                    <Select
                      value={formData.department_id}
                      onValueChange={(value) => setFormData({ ...formData, department_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a department" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Department</SelectItem>
                        {departments.map((department) => (
                          <SelectItem key={department.id} value={department.id}>
                            {department.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground">
                      Choose a department for better organization or leave blank
                    </p>
                  </div>

                  {/* ✅ NEW: Auto-assign checkbox - only show when creating new subject */}
                  {!editingSubject && (
                    <div className="space-y-2 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                      <div className="flex items-start space-x-2">
                        <Checkbox 
                          id="autoAssign" 
                          checked={formData.autoAssignToClasses}
                          onCheckedChange={(checked) => 
                            setFormData({ ...formData, autoAssignToClasses: checked as boolean })
                          }
                        />
                        <div className="space-y-1 leading-none">
                          <Label 
                            htmlFor="autoAssign"
                            className="text-sm font-medium cursor-pointer"
                          >
                            Auto-assign to matching classes
                          </Label>
                          <p className="text-sm text-muted-foreground">
                            {formData.level === 'junior' 
                              ? `Automatically make this subject available for all JSS 1-3 classes (${classes.filter(c => c.level?.toLowerCase() === 'junior').length} classes)`
                              : `Automatically make this subject available for all SS 1-3 classes (${classes.filter(c => c.level?.toLowerCase() === 'senior').length} classes)`
                            }
                          </p>
                          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
                            💡 Recommended: This makes the subject immediately available in Subject Offerings → Student Subjects
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  <Separator className="my-6" />

                  {/* Class Assignments Section */}
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label className="flex items-center gap-2">
                          <Users className="h-4 w-4" />
                          Teacher-Class Assignments *
                        </Label>
                        <Badge variant={Object.keys(assignments).filter(id => assignments[id] && assignments[id] !== 'none').length > 0 ? 'default' : 'destructive'}>
                          {Object.keys(assignments).filter(id => assignments[id] && assignments[id] !== 'none').length} assigned
                        </Badge>
                      </div>
                      <Alert>
                        <AlertDescription>
                          Assign teachers to each class for this subject. At least one assignment is required. Use the quick assign feature to assign one teacher to all {formData.level === 'junior' ? 'Junior' : 'Senior'} classes at once.
                        </AlertDescription>
                      </Alert>
                    </div>

                    {/* Quick Assign Section */}
                    <div className="p-4 border rounded-lg bg-blue-50/50 space-y-3">
                      <Label className="text-sm font-medium">Quick Assign to All Classes</Label>
                      <div className="flex gap-2">
                        <Select
                          value=""
                          onValueChange={(teacherId) => {
                            if (teacherId && teacherId !== 'none') {
                              // Get all classes for the current level
                              const levelClasses = classes.filter(classItem => {
                                if (formData.level === 'junior') {
                                  return classItem.level?.toLowerCase() === 'junior';
                                } else {
                                  return classItem.level?.toLowerCase() === 'senior';
                                }
                              });
                              
                              // Assign this teacher to all level classes
                              const newAssignments: Record<string, string> = { ...assignments };
                              levelClasses.forEach(classItem => {
                                newAssignments[classItem.id] = teacherId;
                              });
                              setAssignments(newAssignments);
                              toast.success(`Assigned teacher to all ${formData.level === 'junior' ? 'Junior' : 'Senior'} classes`);
                            }
                          }}
                        >
                          <SelectTrigger className="flex-1">
                            <SelectValue placeholder="Select teacher to assign to all classes" />
                          </SelectTrigger>
                          <SelectContent>
                            {teachers.map((teacher) => (
                              <SelectItem key={teacher.id} value={teacher.id}>
                                {teacher.first_name} {teacher.last_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Select a teacher to quickly assign them to all {formData.level === 'junior' ? 'Junior (JSS)' : 'Senior (SSS)'} classes. You can still customize individual classes below.
                      </p>
                    </div>

                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                      {classes
                        .filter(classItem => {
                          // Filter by level - classes use "Junior"/"Senior", subjects use "junior"/"senior"
                          if (formData.level === 'junior') {
                            return classItem.level?.toLowerCase() === 'junior';
                          } else {
                            return classItem.level?.toLowerCase() === 'senior';
                          }
                        })
                        .map(classItem => (
                          <div 
                            key={classItem.id} 
                            className="flex items-center gap-3 p-3 border rounded-lg bg-muted/50"
                          >
                            <Label className="flex-1 cursor-pointer">
                              {classItem.display_name}
                            </Label>
                            <Select
                              value={assignments[classItem.id] || 'none'}
                              onValueChange={(value) => {
                                if (value === 'none') {
                                  // Remove assignment if "No teacher" is selected
                                  setAssignments(prev => {
                                    const newAssignments = { ...prev };
                                    delete newAssignments[classItem.id];
                                    return newAssignments;
                                  });
                                } else {
                                  setAssignments(prev => ({
                                    ...prev,
                                    [classItem.id]: value
                                  }));
                                }
                              }}
                            >
                              <SelectTrigger className="w-[200px]">
                                <SelectValue placeholder="No teacher" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="none">No teacher</SelectItem>
                                {teachers.map((teacher) => (
                                  <SelectItem key={teacher.id} value={teacher.id}>
                                    {teacher.first_name} {teacher.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            {assignments[classItem.id] && assignments[classItem.id] !== 'none' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => {
                                  setAssignments(prev => {
                                    const newAssignments = { ...prev };
                                    delete newAssignments[classItem.id];
                                    return newAssignments;
                                  });
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            )}
                          </div>
                        ))
                      }
                      {classes.filter(c => 
                        formData.level === 'junior' 
                          ? c.level?.toLowerCase() === 'junior'
                          : c.level?.toLowerCase() === 'senior'
                      ).length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No {formData.level === 'junior' ? 'Junior' : 'Senior'} classes available. Create classes first.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting || teachers.length === 0}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingSubject ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingSubject ? 'Update Subject' : 'Create Subject'
                    )}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Subjects Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            All Subjects ({subjects.length})
          </CardTitle>
          <CardDescription>
            View and manage all academic subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No subjects found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first subject or use the sample data to get familiar with the system.
              </p>
              {hasManagementAccess && (
                <div className="space-x-2">
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Add First Subject button clicked');
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Subject
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Subject Code</TableHead>
                    <TableHead>Level</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Assigned Classes</TableHead>
                    <TableHead>Created</TableHead>
                    {hasManagementAccess && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subjects.map((subject) => (
                    <TableRow key={subject.id}>
                      <TableCell className="font-medium">{subject.name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className="font-mono">
                          <Hash className="h-3 w-3 mr-1" />
                          {subject.code}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={subject.level === 'senior' ? 'default' : 'secondary'}
                          className={subject.level === 'senior' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}
                        >
                          {subject.level === 'senior' ? 'Senior' : 'Junior'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className={subject.department_id ? '' : 'text-muted-foreground'}>
                          {getDepartmentName(subject.department_id)}
                        </span>
                      </TableCell>
                      <TableCell>
                        {allAssignments[subject.id] && allAssignments[subject.id].length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {allAssignments[subject.id].slice(0, 3).map((assignment) => (
                              <Badge key={assignment.id} variant="secondary" className="text-xs">
                                {assignment.class.display_name}
                              </Badge>
                            ))}
                            {allAssignments[subject.id].length > 3 && (
                              <Badge variant="outline" className="text-xs">
                                +{allAssignments[subject.id].length - 3} more
                              </Badge>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">No assignments</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {new Date(subject.created_at).toLocaleDateString()}
                      </TableCell>
                      {hasManagementAccess && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(subject)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(subject)}
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}