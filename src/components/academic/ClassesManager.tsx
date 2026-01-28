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
import { Plus, Edit2, Trash2, Users, GraduationCap, Loader2 } from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface Class {
  id: string;
  name: string;
  level: string;
  class_teacher_id: string | null;
  section_id: string | null;
  display_name?: string;
  section_name?: string;
  created_at: string;
  updated_at: string;
}

interface Section {
  id: string;
  name: string;
  description?: string;
}

interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
}

interface ClassesManagerProps {
  userProfile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
  onStatsUpdate: () => void;
}

export function ClassesManager({ userProfile, onStatsUpdate }: ClassesManagerProps) {
  const [classes, setClasses] = useState<Class[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [sections, setSections] = useState<Section[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    level: '',
    class_teacher_id: 'none',
    section_id: 'none'
  });

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

      // Fetch classes, teachers, and sections
      const [classesResponse, teachersResponse, sectionsResponse] = await Promise.all([
        fetch(`${baseUrl}/classes`, {
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
        fetch(`${baseUrl}/sections`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const [classesData, teachersData, sectionsData] = await Promise.all([
        classesResponse.json(),
        teachersResponse.json(),
        sectionsResponse.json()
      ]);

      if (classesData.success) {
        setClasses(classesData.classes || []);
      } else {
        throw new Error(classesData.error || 'Failed to fetch classes');
      }

      if (teachersData.success) {
        setTeachers(teachersData.teachers || []);
      } else {
        throw new Error(teachersData.error || 'Failed to fetch teachers');
      }

      if (sectionsData.success) {
        setSections(sectionsData.sections || []);
      } else {
        // Don't throw error for sections - it's optional
        setSections([]);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!hasManagementAccess) {
      toast.error('You do not have permission to manage classes');
      return;
    }

    if (!formData.name.trim() || !formData.level || formData.level.trim() === '') {
      toast.error('Class name and grade level are required');
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
        level: formData.level.trim(),
        class_teacher_id: formData.class_teacher_id === 'none' ? null : formData.class_teacher_id,
        section_id: formData.section_id === 'none' ? null : formData.section_id
      };

      const response = await fetch(
        editingClass 
          ? `${baseUrl}/classes/${editingClass.id}` 
          : `${baseUrl}/classes`,
        {
          method: editingClass ? 'PUT' : 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestData)
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        setDialogOpen(false);
        setEditingClass(null);
        setFormData({ name: '', level: '', class_teacher_id: 'none', section_id: 'none' });
        await fetchData();
        onStatsUpdate();
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save class');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (classItem: Class) => {
    if (!hasManagementAccess) {
      toast.error('You do not have permission to edit classes');
      return;
    }

    // Extract the base class name from the combined name
    // If the class has a section, the name will be like "SS2 - Silver"
    // We need to extract just "SS2" to prevent double-combining
    let baseName = classItem.name;
    if (classItem.section_id && classItem.section_name) {
      // Remove the section suffix from the name
      const sectionSuffix = ` - ${classItem.section_name}`;
      if (baseName.endsWith(sectionSuffix)) {
        baseName = baseName.substring(0, baseName.length - sectionSuffix.length);
      }
    }

    setEditingClass(classItem);
    setFormData({
      name: baseName,
      level: classItem.level,
      class_teacher_id: classItem.class_teacher_id || 'none',
      section_id: classItem.section_id || 'none'
    });
    setDialogOpen(true);
  };

  const handleDelete = async (classItem: Class) => {
    if (!hasManagementAccess) {
      toast.error('You do not have permission to delete classes');
      return;
    }

    if (!confirm(`Are you sure you want to delete the class "${classItem.name}"?`)) {
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

      const response = await fetch(`${baseUrl}/classes/${classItem.id}`, {
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
      toast.error(error instanceof Error ? error.message : 'Failed to delete class');
    }
  };

  const getTeacherName = (teacherId: string | null) => {
    if (!teacherId) return 'No teacher assigned';
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown teacher';
  };

  const resetForm = () => {
    setFormData({ name: '', level: '', class_teacher_id: 'none', section_id: 'none' });
    setEditingClass(null);
  };

  const getSectionName = (sectionId: string | null) => {
    if (!sectionId) return 'No section';
    const section = sections.find(s => s.id === sectionId);
    return section ? section.name : 'Unknown section';
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading classes...</span>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Classes Management</h2>
          <p className="text-muted-foreground">
            Manage class groups and assign class teachers
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
                Add Class
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingClass ? 'Edit Class' : 'Add New Class'}
                </DialogTitle>
                <DialogDescription>
                  {editingClass 
                    ? 'Update the class information below.'
                    : 'Create a new class group. You can assign a class teacher and set the grade level.'
                  }
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit}>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="className">Class Name</Label>
                    <Input
                      id="className"
                      placeholder="e.g., JSS1, SSS2"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="level">Grade Level</Label>
                    <Select
                      value={formData.level}
                      onValueChange={(value) => setFormData({ ...formData, level: value })}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select grade level" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Junior">Junior</SelectItem>
                        <SelectItem value="Senior">Senior</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="section">Section (Optional)</Label>
                    <Select
                      value={formData.section_id}
                      onValueChange={(value) => setFormData({ ...formData, section_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a section" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No section</SelectItem>
                        {sections.map((section) => (
                          <SelectItem key={section.id} value={section.id}>
                            {section.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {sections.length === 0 && (
                      <p className="text-xs text-slate-500">
                        Create sections in Settings Management → Class Sections
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="teacher">Class Teacher (Optional)</Label>
                    <Select
                      value={formData.class_teacher_id}
                      onValueChange={(value) => setFormData({ ...formData, class_teacher_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a teacher" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No teacher assigned</SelectItem>
                        {teachers.map((teacher) => (
                          <SelectItem key={teacher.id} value={teacher.id}>
                            {teacher.first_name} {teacher.last_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
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
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        {editingClass ? 'Updating...' : 'Creating...'}
                      </>
                    ) : (
                      editingClass ? 'Update Class' : 'Create Class'
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

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            All Classes ({classes.length})
          </CardTitle>
          <CardDescription>
            View and manage all class groups in your school
          </CardDescription>
        </CardHeader>
        <CardContent>
          {classes.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No classes found</h3>
              <p className="text-muted-foreground mb-4">
                Get started by creating your first class group or use the sample data to get familiar with the system.
              </p>
              {hasManagementAccess && (
                <div className="space-x-2">
                  <Button 
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('Add First Class button clicked');
                      setDialogOpen(true);
                    }}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add First Class
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Class Name</TableHead>
                    <TableHead>Grade Level</TableHead>
                    <TableHead>Class Teacher</TableHead>
                    <TableHead>Created</TableHead>
                    {hasManagementAccess && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classes.map((classItem) => (
                    <TableRow key={classItem.id}>
                      <TableCell className="font-medium">
                        {classItem.display_name || classItem.name}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{classItem.level}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <GraduationCap className="h-4 w-4 text-muted-foreground" />
                          {getTeacherName(classItem.class_teacher_id)}
                        </div>
                      </TableCell>
                      <TableCell>
                        {new Date(classItem.created_at).toLocaleDateString()}
                      </TableCell>
                      {hasManagementAccess && (
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(classItem)}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(classItem)}
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