import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Input } from '../ui/input';
import { Users, Search, Mail, Phone, Download } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface Student {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  admission_number?: string;
  photo_url?: string;
}

export function MyClass() {
  const [classInfo, setClassInfo] = useState<any>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [filteredStudents, setFilteredStudents] = useState<Student[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchClassData();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = students.filter(student =>
        `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        student.admission_number?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredStudents(filtered);
    } else {
      setFilteredStudents(students);
    }
  }, [searchTerm, students]);

  const fetchClassData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/my-class`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setClassInfo(data.classInfo);
        setStudents(data.students || []);
        setFilteredStudents(data.students || []);
      } else {
        toast.error(data.error || 'Failed to load class data');
      }
    } catch (error) {
      console.error('Error fetching class data:', error);
      toast.error('Failed to load class data');
    } finally {
      setLoading(false);
    }
  };

  const exportClassList = () => {
    // Simple CSV export
    const headers = ['Admission Number', 'Name', 'Email'];
    const rows = filteredStudents.map(s => [
      s.admission_number || 'N/A',
      `${s.first_name} ${s.middle_name || ''} ${s.last_name}`.trim(),
      s.email
    ]);
    
    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${classInfo?.name || 'class'}_students.csv`;
    a.click();
    toast.success('Class list exported successfully');
  };

  const getStudentInitials = (student: Student) => {
    const first = student.first_name?.[0] || '';
    const last = student.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'ST';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!classInfo) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-600 mb-2">Not a Class Teacher</h3>
          <p className="text-slate-500">
            You are not currently assigned as a class teacher.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Class</h1>
            <p className="text-blue-100 text-sm md:text-base mt-1">
              Manage and view your class students
            </p>
          </div>
        </div>
      </div>

      {/* Class Info Stats - Mobile App Style */}
      <div className="grid grid-cols-3 gap-3 px-4 md:px-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Class Name</p>
          <p className="text-base font-bold text-gray-900">{classInfo.name}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Level</p>
          <p className="text-base font-bold text-gray-900">{classInfo.level || 'N/A'}</p>
        </div>
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <p className="text-xs text-gray-500 mb-1">Students</p>
          <p className="text-base font-bold text-gray-900">{students.length}</p>
        </div>
      </div>

      {/* Students List - App Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-0">
        <div className="p-5 border-b border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">Students</h2>
            <Button onClick={exportClassList} variant="outline" size="sm" className="rounded-xl">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search students..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-gray-200"
            />
          </div>
        </div>

        {/* Mobile: Card List View */}
        <div className="md:hidden divide-y divide-gray-100">
          {filteredStudents.length > 0 ? (
            filteredStudents.map((student) => (
              <div key={student.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-center gap-3">
                  <Avatar className="h-12 w-12">
                    <AvatarImage src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                      {getStudentInitials(student)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 truncate">
                      {student.first_name} {student.middle_name || ''} {student.last_name}
                    </p>
                    <p className="text-sm text-gray-500 truncate mt-0.5">{student.email}</p>
                  </div>
                  <Button variant="ghost" size="sm" asChild className="flex-shrink-0">
                    <a href={`mailto:${student.email}`}>
                      <Mail className="h-4 w-4" />
                    </a>
                  </Button>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-gray-50 rounded-full mb-3">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              <p className="text-gray-500 text-sm">No students found</p>
            </div>
          )}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Admission No.</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={student.photo_url} alt={`${student.first_name} ${student.last_name}`} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-medium">
                            {getStudentInitials(student)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">
                          {student.first_name} {student.middle_name || ''} {student.last_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{student.admission_number || 'N/A'}</Badge>
                    </TableCell>
                    <TableCell>{student.email}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`mailto:${student.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-8 text-slate-500">
                    No students found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}