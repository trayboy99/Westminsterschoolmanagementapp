import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/CustomToast';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { Loader2, Save, Search, UserCheck, Users } from 'lucide-react';

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  class_name?: string;
  student_type?: 'Day' | 'Boarding' | null;
  admission_number?: string;
}

export default function StudentTypeAssignment() {
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'Day' | 'Boarding' | 'unassigned'>('all');
  const [savingStudentId, setSavingStudentId] = useState<string | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchStudents();
  }, []);

  useEffect(() => {
    filterStudentsList();
  }, [students, searchTerm, filterType]);

  const fetchStudents = async () => {
    try {
      setLoading(true);
      console.log('[StudentTypeAssignment] Fetching students...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Authentication error. Please log in again.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students`;
      const res = await fetch(url, { headers });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[StudentTypeAssignment] HTTP Error:', res.status, errorText);
        toast.error(`Server error: Failed to fetch students`);
        return;
      }
      
      const result = await res.json();
      console.log('[StudentTypeAssignment] Response:', result);

      if (result.success === true) {
        const studentsList = result.students || [];
        console.log('[StudentTypeAssignment] Loaded students:', studentsList.length);
        setStudents(studentsList);
        toast.success(`Loaded ${studentsList.length} students`);
      } else {
        toast.error(result.error || 'Failed to load students');
      }
    } catch (error) {
      console.error('[StudentTypeAssignment] Error fetching students:', error);
      toast.error('Failed to load students. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const filterStudentsList = () => {
    let filtered = [...students];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(student => {
        const fullName = `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.toLowerCase();
        const search = searchTerm.toLowerCase();
        return fullName.includes(search) || 
               student.email?.toLowerCase().includes(search) ||
               student.admission_number?.toLowerCase().includes(search) ||
               student.class_name?.toLowerCase().includes(search);
      });
    }

    // Apply type filter
    if (filterType !== 'all') {
      if (filterType === 'unassigned') {
        filtered = filtered.filter(student => !student.student_type);
      } else {
        filtered = filtered.filter(student => student.student_type === filterType);
      }
    }

    setFilteredStudents(filtered);
  };

  const handleUpdateStudentType = async (studentId: string, studentType: 'Day' | 'Boarding') => {
    try {
      setSavingStudentId(studentId);
      console.log('[StudentTypeAssignment] Updating student type:', { studentId, studentType });

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Authentication error. Please log in again.');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/student-type/${studentId}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ student_type: studentType }),
        }
      );

      const data = await response.json();
      console.log('[StudentTypeAssignment] Update response:', data);

      if (data.success) {
        // Update local state
        setStudents(prevStudents => 
          prevStudents.map(student => 
            student.id === studentId 
              ? { ...student, student_type: studentType }
              : student
          )
        );
        
        const student = students.find(s => s.id === studentId);
        toast.success(`${student?.first_name} ${student?.last_name} set as ${studentType} student`);
      } else {
        toast.error(data.error || 'Failed to update student type');
      }
    } catch (error) {
      console.error('[StudentTypeAssignment] Error updating student type:', error);
      toast.error('Failed to update student type. Please try again.');
    } finally {
      setSavingStudentId(null);
    }
  };

  const getStats = () => {
    const dayStudents = students.filter(s => s.student_type === 'Day').length;
    const boardingStudents = students.filter(s => s.student_type === 'Boarding').length;
    const unassigned = students.filter(s => !s.student_type).length;
    
    return { dayStudents, boardingStudents, unassigned, total: students.length };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
      {/* Statistics Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Students</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>

        <Card className="border-blue-200 bg-blue-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Day Students</CardTitle>
            <UserCheck className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-700">{stats.dayStudents}</div>
            <p className="text-xs text-blue-600 mt-1">
              {stats.total > 0 ? Math.round((stats.dayStudents / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Boarding Students</CardTitle>
            <UserCheck className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-700">{stats.boardingStudents}</div>
            <p className="text-xs text-purple-600 mt-1">
              {stats.total > 0 ? Math.round((stats.boardingStudents / stats.total) * 100) : 0}% of total
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Unassigned</CardTitle>
            <Users className="h-4 w-4 text-amber-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-amber-700">{stats.unassigned}</div>
            <p className="text-xs text-amber-600 mt-1">
              {stats.unassigned > 0 ? 'Needs assignment' : 'All assigned!'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Card */}
      <Card>
        <CardHeader>
          <CardTitle>Assign Student Types</CardTitle>
          <CardDescription>
            Set each student as Day or Boarding student. This will be used for fee structure and payment tracking.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, email, admission number, or class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={(value: any) => setFilterType(value)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Students</SelectItem>
                <SelectItem value="Day">Day Students Only</SelectItem>
                <SelectItem value="Boarding">Boarding Students Only</SelectItem>
                <SelectItem value="unassigned">Unassigned Only</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Students Table */}
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading students...</span>
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No students found matching your filters</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 border-b">
                    <tr>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Student</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Class</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Email</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Current Type</th>
                      <th className="text-left px-4 py-3 text-sm font-medium text-slate-700">Assign Type</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {filteredStudents.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50">
                        <td className="px-4 py-3">
                          <div>
                            <p className="font-medium text-slate-900">
                              {student.first_name} {student.middle_name} {student.last_name}
                            </p>
                            {student.admission_number && (
                              <p className="text-xs text-slate-500">{student.admission_number}</p>
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">
                            {student.class_name || 'No Class'}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className="text-sm text-slate-600">{student.email}</span>
                        </td>
                        <td className="px-4 py-3">
                          {student.student_type ? (
                            <Badge 
                              variant={student.student_type === 'Boarding' ? 'secondary' : 'default'}
                              className={
                                student.student_type === 'Boarding' 
                                  ? 'bg-purple-100 text-purple-700 border-purple-300' 
                                  : 'bg-blue-100 text-blue-700 border-blue-300'
                              }
                            >
                              {student.student_type}
                            </Badge>
                          ) : (
                            <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-300">
                              Not Set
                            </Badge>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant={student.student_type === 'Day' ? 'default' : 'outline'}
                              className={student.student_type === 'Day' ? 'bg-blue-600 hover:bg-blue-700' : 'border-blue-300 text-blue-700 hover:bg-blue-50'}
                              onClick={() => handleUpdateStudentType(student.id, 'Day')}
                              disabled={savingStudentId === student.id}
                            >
                              {savingStudentId === student.id && student.student_type !== 'Day' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>{student.student_type === 'Day' ? '✓' : ''} Day</>
                              )}
                            </Button>
                            <Button
                              size="sm"
                              variant={student.student_type === 'Boarding' ? 'default' : 'outline'}
                              className={student.student_type === 'Boarding' ? 'bg-purple-600 hover:bg-purple-700' : 'border-purple-300 text-purple-700 hover:bg-purple-50'}
                              onClick={() => handleUpdateStudentType(student.id, 'Boarding')}
                              disabled={savingStudentId === student.id}
                            >
                              {savingStudentId === student.id && student.student_type !== 'Boarding' ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <>{student.student_type === 'Boarding' ? '✓' : ''} Boarding</>
                              )}
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Results Count */}
          {!loading && filteredStudents.length > 0 && (
            <div className="mt-4 text-sm text-muted-foreground">
              Showing {filteredStudents.length} of {students.length} students
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
