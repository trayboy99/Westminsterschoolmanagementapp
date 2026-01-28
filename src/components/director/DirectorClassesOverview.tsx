import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { 
  BookOpen, 
  Users, 
  Search,
  User,
  Loader2
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface Class {
  id: string;
  name: string;
  display_name: string;
  level: string;
  class_teacher_id?: string;
  class_teacher_name?: string;
  student_count: number;
}

export function DirectorClassesOverview() {
  const [classes, setClasses] = useState<Class[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchClasses();
  }, []);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication session found');
        setLoading(false);
        return;
      }

      // Fetch classes, teachers, and students in parallel
      const [classesRes, teachersRes, studentsRes] = await Promise.all([
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        ),
        fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users?role=student`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        )
      ]);

      const classesData = await classesRes.json();
      const teachersData = await teachersRes.json();
      const studentsData = await studentsRes.json();
      
      console.log('Classes data:', classesData);
      console.log('Teachers data:', teachersData);
      console.log('Students data:', studentsData);
      
      if (classesData.success && classesData.classes) {
        const teachersCache = teachersData.success ? teachersData.teachers : [];
        const studentsCache = studentsData.success ? studentsData.users : [];
        
        // Process each class with student counts
        const classesWithDetails = classesData.classes.map((cls: any) => {
          const teacherName = cls.class_teacher_id 
            ? fetchClassTeacherSync(cls.class_teacher_id, teachersCache)
            : 'Not assigned';
          
          // Count students in this class from the students data
          const studentCount = studentsCache.filter((student: any) => {
            // Check if student's class_id matches this class id
            return student.class_id === cls.id;
          }).length;
          
          return {
            ...cls,
            display_name: cls.display_name || cls.name,
            class_teacher_name: teacherName,
            student_count: studentCount
          };
        });
        
        console.log('Classes with details:', classesWithDetails);
        setClasses(classesWithDetails);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchClassTeacherSync = (teacherId: string, teachersCache: any[]): string => {
    const teacher = teachersCache.find((t: any) => t.id === teacherId);
    if (teacher) {
      return `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.trim();
    }
    return 'Not assigned';
  };



  const filteredClasses = classes.filter(cls =>
    cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.class_teacher_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    cls.level.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalStudents = classes.reduce((sum, cls) => sum + cls.student_count, 0);
  const juniorClasses = classes.filter(cls => cls.level.toLowerCase() === 'junior');
  const seniorClasses = classes.filter(cls => cls.level.toLowerCase() === 'senior');

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl md:text-3xl">Classes Overview</h1>
        <p className="text-slate-600 mt-1">
          View all classes with their student counts and class teachers
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-blue-600" />
              <span className="text-3xl">{classes.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Total Students</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="h-8 w-8 text-green-600" />
              <span className="text-3xl">{totalStudents}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Junior Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-purple-600" />
              <span className="text-3xl">{juniorClasses.length}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">Senior Classes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <BookOpen className="h-8 w-8 text-orange-600" />
              <span className="text-3xl">{seniorClasses.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          type="text"
          placeholder="Search classes by name, level, or teacher..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Classes Table */}
      <Card>
        <CardHeader>
          <CardTitle>Classes List</CardTitle>
          <CardDescription>
            View all classes with their student counts and assigned class teachers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Class Name</TableHead>
                  <TableHead className="hidden md:table-cell">Level</TableHead>
                  <TableHead>Students</TableHead>
                  <TableHead>Class Teacher</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredClasses.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-slate-500">
                      No classes found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredClasses.map((cls) => (
                    <TableRow key={cls.id}>
                      <TableCell>
                        <div>
                          <p className="font-medium">{cls.display_name}</p>
                          <p className="text-sm text-slate-500 md:hidden">
                            <Badge variant="outline" className="mt-1">
                              {cls.level}
                            </Badge>
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <Badge variant="outline">
                          {cls.level}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-slate-400" />
                          <span className="font-medium">{cls.student_count}</span>
                          <span className="text-sm text-slate-500">
                            {cls.student_count === 1 ? 'student' : 'students'}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-slate-400" />
                          <span className={cls.class_teacher_name === 'Not assigned' ? 'text-slate-400 italic' : ''}>
                            {cls.class_teacher_name}
                          </span>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
