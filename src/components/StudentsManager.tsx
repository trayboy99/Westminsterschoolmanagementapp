import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { ScrollArea } from './ui/scroll-area';
import { Users, ArrowLeft, AlertCircle, Mail, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}

interface ClassGroup {
  class_id: string;
  class_name: string;
  class_level: string;
  class_teacher_id?: string;
  student_count: number;
  students: Student[];
}

export function StudentsManager() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [studentsWithoutClass, setStudentsWithoutClass] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentClassPage, setCurrentClassPage] = useState(1);
  const [currentStudentPage, setCurrentStudentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

      console.log('[Students] Fetching with access token...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Students] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Students] Response data:', data);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch students');
      }

      setClasses(data.classes || []);
      setStudentsWithoutClass(data.students_without_class || []);
      setTotalStudents(data.total_students || 0);

      console.log('[Students] Loaded successfully:', {
        classes: data.classes?.length || 0,
        unassigned: data.students_without_class?.length || 0,
        total: data.total_students || 0
      });
    } catch (err) {
      console.error('[Students] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl">Students Management</h2>
            <p className="text-gray-500">Loading students...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2 mt-2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="text-3xl">Students Management</h2>
            <p className="text-gray-500">Manage student records</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchStudents}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Selected class view - show students table
  if (selectedClass) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClass(null)}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Classes
              </Button>
            </div>
            <h2 className="text-3xl">{selectedClass.class_name}</h2>
            <p className="text-gray-500">
              {selectedClass.class_level}
              {' • '}
              {selectedClass.student_count} {selectedClass.student_count === 1 ? 'student' : 'students'}
            </p>
          </div>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Student List</CardTitle>
            <CardDescription>
              All students enrolled in {selectedClass.class_name}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {selectedClass.students.length === 0 ? (
              <div className="text-center py-12 text-gray-500">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No students enrolled in this class yet.</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
                <div className="min-w-[640px]">
                  <ScrollArea className="h-[600px]">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="min-w-[100px]">Student ID</TableHead>
                          <TableHead className="min-w-[200px]">Name</TableHead>
                          <TableHead className="min-w-[200px]">Email</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedClass.students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="text-sm text-gray-500">
                              {student.id.substring(0, 8)}...
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                                  <User className="h-4 w-4 text-blue-600" />
                                </div>
                                <span className="whitespace-nowrap">
                                  {student.first_name}
                                  {student.middle_name ? ` ${student.middle_name}` : ''} {student.last_name}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2 text-sm text-gray-600">
                                <Mail className="h-3 w-3 flex-shrink-0" />
                                <span className="break-all">{student.email || 'N/A'}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </ScrollArea>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Main view - show classes as cards
  // Pagination for classes
  const totalClassPages = Math.ceil(classes.length / itemsPerPage);
  const startClassIndex = (currentClassPage - 1) * itemsPerPage;
  const endClassIndex = startClassIndex + itemsPerPage;
  const paginatedClasses = classes.slice(startClassIndex, endClassIndex);

  // Color gradients for class cards
  const colorGradients = [
    'bg-gradient-to-br from-blue-500 to-blue-600 border-blue-700',
    'bg-gradient-to-br from-purple-500 to-purple-600 border-purple-700',
    'bg-gradient-to-br from-orange-500 to-orange-600 border-orange-700',
    'bg-gradient-to-br from-teal-500 to-teal-600 border-teal-700',
    'bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-700',
    'bg-gradient-to-br from-cyan-500 to-cyan-600 border-cyan-700',
    'bg-gradient-to-br from-emerald-500 to-emerald-600 border-emerald-700',
    'bg-gradient-to-br from-violet-500 to-violet-600 border-violet-700',
    'bg-gradient-to-br from-sky-500 to-sky-600 border-sky-700',
    'bg-gradient-to-br from-green-500 to-green-600 border-green-700',
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl">Students Management</h2>
          <p className="text-gray-500">
            {totalStudents} total {totalStudents === 1 ? 'student' : 'students'} across {classes.length} {classes.length === 1 ? 'class' : 'classes'}
          </p>
        </div>
        <Button onClick={fetchStudents} variant="outline">
          Refresh
        </Button>
      </div>

      {/* Students without class alert */}
      {studentsWithoutClass.length > 0 && (
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {studentsWithoutClass.length} {studentsWithoutClass.length === 1 ? 'student' : 'students'} not assigned to any class
          </AlertDescription>
        </Alert>
      )}

      {/* Classes grid */}
      {classes.length === 0 ? (
        <Card>
          <CardContent className="text-center py-12">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50 text-gray-400" />
            <h3 className="text-lg mb-2">No Classes Found</h3>
            <p className="text-gray-500">
              Create classes in the Academic module to organize students.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedClasses.map((classGroup, index) => {
              const actualIndex = startClassIndex + index;
              const colorClass = colorGradients[actualIndex % colorGradients.length];
              
              return (
                <Card 
                  key={classGroup.class_id}
                  className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${colorClass}`}
                  onClick={() => {
                    setSelectedClass(classGroup);
                    setCurrentStudentPage(1);
                  }}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="space-y-1 flex-1">
                        <CardTitle className="text-white">{classGroup.class_name}</CardTitle>
                        <CardDescription className="text-white/90">
                          {classGroup.class_level}
                        </CardDescription>
                      </div>
                      <div className="h-12 w-12 rounded-full bg-white/20 flex items-center justify-center flex-shrink-0">
                        <Users className="h-6 w-6 text-white" />
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-white/90">Total Students</span>
                        <Badge variant="secondary" className="text-lg px-3 py-1 bg-white/20 text-white border-white/30">
                          {classGroup.student_count}
                        </Badge>
                      </div>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="w-full bg-white/10 hover:bg-white/20 text-white border-white/30 hover:border-white/50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedClass(classGroup);
                          setCurrentStudentPage(1);
                        }}
                      >
                        View Students
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Pagination Controls for Classes */}
          {totalClassPages > 1 && (
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 p-4 border rounded-lg bg-slate-50">
              <div className="text-sm text-gray-600">
                Showing {startClassIndex + 1} to {Math.min(endClassIndex, classes.length)} of {classes.length} classes
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentClassPage(currentClassPage - 1)}
                  disabled={currentClassPage === 1}
                  className="gap-1"
                >
                  <ChevronLeft className="h-4 w-4" />
                  <span className="hidden sm:inline">Previous</span>
                </Button>
                <div className="flex items-center gap-1">
                  {Array.from({ length: totalClassPages }, (_, i) => i + 1).map((page) => {
                    const showPage = 
                      page === 1 || 
                      page === totalClassPages || 
                      (page >= currentClassPage - 1 && page <= currentClassPage + 1);
                    
                    const showEllipsis = 
                      (page === currentClassPage - 2 && currentClassPage > 3) ||
                      (page === currentClassPage + 2 && currentClassPage < totalClassPages - 2);

                    if (showEllipsis) {
                      return <span key={page} className="px-2 text-gray-400">...</span>;
                    }

                    if (!showPage) return null;

                    return (
                      <Button
                        key={page}
                        variant={currentClassPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentClassPage(page)}
                        className="min-w-[36px]"
                      >
                        {page}
                      </Button>
                    );
                  })}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentClassPage(currentClassPage + 1)}
                  disabled={currentClassPage === totalClassPages}
                  className="gap-1"
                >
                  <span className="hidden sm:inline">Next</span>
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Students without class section */}
      {studentsWithoutClass.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Students Without Class Assignment</CardTitle>
            <CardDescription>
              These students need to be assigned to a class
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto -mx-6 px-6 md:mx-0 md:px-0">
              <div className="min-w-[640px]">
                <ScrollArea className="h-[300px]">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-[100px]">Student ID</TableHead>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="min-w-[200px]">Email</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsWithoutClass.map((student) => (
                        <TableRow key={student.id}>
                          <TableCell className="text-sm text-gray-500">
                            {student.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <div className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                                <User className="h-4 w-4 text-gray-600" />
                              </div>
                              <span className="whitespace-nowrap">
                                {student.first_name}
                                {student.middle_name ? ` ${student.middle_name}` : ''} {student.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="break-all">{student.email || 'N/A'}</span>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}