import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Users, ArrowLeft, AlertCircle, RefreshCw, X } from 'lucide-react';
import { projectId } from '../utils/supabase/info'
import { createClient } from '../utils/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone?: string;
  photo_url?: string;
}

interface ClassGroup {
  class_id: string;
  class_name: string;
  class_level: string;
  section_name?: string;
  class_teacher_id?: string;
  student_count: number;
  students: Student[];
}

// Modern gradient colors for class cards
const CARD_GRADIENTS = [
  'from-blue-500 to-blue-600',
  'from-purple-500 to-purple-600',
  'from-orange-500 to-orange-600',
  'from-teal-500 to-teal-600',
  'from-indigo-500 to-indigo-600',
  'from-cyan-500 to-cyan-600',
  'from-emerald-500 to-emerald-600',
  'from-pink-500 to-pink-600',
  'from-violet-500 to-violet-600',
];

export function StudentsManagementModern() {
  const [classes, setClasses] = useState<ClassGroup[]>([]);
  const [studentsWithoutClass, setStudentsWithoutClass] = useState<Student[]>([]);
  const [totalStudents, setTotalStudents] = useState(0);
  const [selectedClass, setSelectedClass] = useState<ClassGroup | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchStudents();
  }, []);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('Not authenticated. Please log in.');
        setLoading(false);
        return;
      }

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
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch students');
      }

      setClasses(data.classes || []);
      setStudentsWithoutClass(data.students_without_class || []);
      setTotalStudents(data.total_students || 0);
    } catch (err) {
      console.error('[Students] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch students');
    } finally {
      setLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStudents();
  };

  const getClassSectionLabel = (className: string) => {
    // Extract section (e.g., "JSS1 - Gold" => "Junior")
    if (className.includes('JSS') || className.toLowerCase().includes('jss')) {
      return 'Junior';
    }
    if (className.includes('SS') || className.toLowerCase().includes('ss')) {
      return 'Senior';
    }
    return 'Class';
  };

  const getCardGradient = (index: number) => {
    return CARD_GRADIENTS[index % CARD_GRADIENTS.length];
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-4 md:p-6">
        <div className="max-w-7xl mx-auto">
          <div className="animate-pulse space-y-4">
            <div className="h-12 bg-slate-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="h-48 bg-slate-200 rounded-2xl"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-slate-900">Students Management</h1>
            <p className="text-sm md:text-base text-slate-600 mt-1">
              {totalStudents} total students across {classes.length} classes
            </p>
          </div>
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Classes Grid - Modern Card Layout */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {classes.map((classGroup, index) => (
            <Card
              key={classGroup.class_id}
              className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
              onClick={() => setSelectedClass(classGroup)}
            >
              <div className={`bg-gradient-to-br ${getCardGradient(index)} p-6 text-white relative`}>
                {/* Background Icon */}
                <Users className="absolute top-4 right-4 h-12 w-12 opacity-20" />
                
                {/* Class Name */}
                <h3 className="text-xl md:text-2xl font-bold mb-1 relative z-10">
                  {classGroup.class_name}
                </h3>
                <p className="text-sm opacity-90 relative z-10">
                  {getClassSectionLabel(classGroup.class_name)}
                </p>

                {/* Student Count Badge */}
                <div className="mt-6 flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-xs opacity-75 uppercase tracking-wide">Total Students</p>
                    <p className="text-3xl font-bold mt-1">{classGroup.student_count}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <Users className="h-6 w-6" />
                  </div>
                </div>
              </div>

              {/* View Students Button */}
              <CardContent className="p-4 bg-white">
                <Button
                  className="w-full bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClass(classGroup);
                  }}
                >
                  View Students
                </Button>
              </CardContent>
            </Card>
          ))}

          {/* Unassigned Students Card */}
          {studentsWithoutClass.length > 0 && (
            <Card
              className="group overflow-hidden border-0 shadow-lg hover:shadow-2xl transition-all duration-300 hover:scale-105 cursor-pointer"
              onClick={() => setSelectedClass({
                class_id: 'unassigned',
                class_name: 'Unassigned Students',
                class_level: '',
                student_count: studentsWithoutClass.length,
                students: studentsWithoutClass
              })}
            >
              <div className="bg-gradient-to-br from-slate-500 to-slate-600 p-6 text-white relative">
                <Users className="absolute top-4 right-4 h-12 w-12 opacity-20" />
                
                <h3 className="text-xl md:text-2xl font-bold mb-1 relative z-10">
                  Unassigned
                </h3>
                <p className="text-sm opacity-90 relative z-10">
                  No Class
                </p>

                <div className="mt-6 flex items-center justify-between relative z-10">
                  <div>
                    <p className="text-xs opacity-75 uppercase tracking-wide">Total Students</p>
                    <p className="text-3xl font-bold mt-1">{studentsWithoutClass.length}</p>
                  </div>
                  <div className="h-12 w-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                    <AlertCircle className="h-6 w-6" />
                  </div>
                </div>
              </div>

              <CardContent className="p-4 bg-white">
                <Button
                  className="w-full bg-white text-slate-700 hover:bg-slate-50 border border-slate-200 shadow-sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedClass({
                      class_id: 'unassigned',
                      class_name: 'Unassigned Students',
                      class_level: '',
                      student_count: studentsWithoutClass.length,
                      students: studentsWithoutClass
                    });
                  }}
                >
                  View Students
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Empty State */}
        {classes.length === 0 && studentsWithoutClass.length === 0 && !loading && (
          <Card className="p-12">
            <div className="text-center">
              <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-700 mb-2">No Students Found</h3>
              <p className="text-slate-500">There are no students registered in the system yet.</p>
            </div>
          </Card>
        )}
      </div>

      {/* Student List Dialog */}
      <Dialog open={selectedClass !== null} onOpenChange={(open) => !open && setSelectedClass(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] p-0">
          <DialogHeader className="p-6 pb-4 border-b">
            <div className="flex items-center justify-between">
              <div>
                <DialogTitle className="text-2xl">{selectedClass?.class_name}</DialogTitle>
                <p className="text-sm text-slate-600 mt-1">
                  {selectedClass?.student_count} {selectedClass?.student_count === 1 ? 'student' : 'students'}
                </p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setSelectedClass(null)}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </DialogHeader>

          <ScrollArea className="max-h-[calc(90vh-180px)] p-6">
            {selectedClass && selectedClass.students.length > 0 ? (
              <div className="space-y-3">
                {selectedClass.students.map((student, index) => (
                  <Card key={student.id} className="p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarImage src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-500 text-white font-bold text-lg">
                          {student.first_name.charAt(0)}{student.last_name.charAt(0)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-slate-900 truncate">
                          {student.first_name} {student.middle_name && `${student.middle_name} `}{student.last_name}
                        </h4>
                        <p className="text-sm text-slate-600 truncate">{student.email}</p>
                        {student.phone && (
                          <p className="text-xs text-slate-500 truncate mt-0.5">{student.phone}</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500">No students in this class</p>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </div>
  );
}