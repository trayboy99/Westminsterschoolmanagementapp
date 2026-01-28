import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Users, Search, Mail, BookOpen, GraduationCap } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Teacher {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  subjects: string[];
  isClassTeacher: boolean;
  className?: string | null;
}

export function TeachersList() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [filteredTeachers, setFilteredTeachers] = useState<Teacher[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchTeachers();
  }, []);

  useEffect(() => {
    if (searchTerm) {
      const filtered = teachers.filter(teacher =>
        `${teacher.first_name} ${teacher.last_name}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        teacher.subjects.some(s => s.toLowerCase().includes(searchTerm.toLowerCase())) ||
        teacher.className?.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTeachers(filtered);
    } else {
      setFilteredTeachers(teachers);
    }
  }, [searchTerm, teachers]);

  const fetchTeachers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-list`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setTeachers(data.teachers || []);
        setFilteredTeachers(data.teachers || []);
      } else {
        toast.error(data.error || 'Failed to load teachers');
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
      toast.error('Failed to load teachers');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredTeachers.slice(indexOfFirstItem, indexOfLastItem);

  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);

  const handlePageChange = (pageNumber: number) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <Users className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">Teachers Directory</h1>
            <p className="text-blue-100 text-sm md:text-base mt-1">
              View and connect with fellow teachers
            </p>
          </div>
        </div>
      </div>

      {/* Stats - App Style */}
      <div className="grid grid-cols-3 gap-3 px-4 md:px-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-blue-50 rounded-xl mb-2">
              <Users className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{teachers.length}</p>
            <p className="text-xs text-gray-600 mt-1">Total</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-green-50 rounded-xl mb-2">
              <GraduationCap className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {teachers.filter(t => t.isClassTeacher).length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Class</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-purple-50 rounded-xl mb-2">
              <BookOpen className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {teachers.filter(t => t.subjects.length > 0).length}
            </p>
            <p className="text-xs text-gray-600 mt-1">Subject</p>
          </div>
        </div>
      </div>

      {/* Teachers List - App Style */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mx-4 md:mx-0">
        <div className="p-5 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900 mb-4">All Teachers</h2>
          
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              placeholder="Search teachers..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 rounded-xl border-gray-200"
            />
          </div>
        </div>

        {/* Mobile: Card List View */}
        <div className="md:hidden divide-y divide-gray-100">
          {currentItems.length > 0 ? (
            currentItems.map((teacher) => (
              <div key={teacher.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">
                      {teacher.first_name} {teacher.middle_name || ''} {teacher.last_name}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">{teacher.email}</p>
                    
                    {/* Subjects */}
                    {teacher.subjects.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {teacher.subjects.slice(0, 2).map((subject, idx) => (
                          <Badge key={idx} variant="secondary" className="text-xs">
                            {subject}
                          </Badge>
                        ))}
                        {teacher.subjects.length > 2 && (
                          <Badge variant="secondary" className="text-xs">
                            +{teacher.subjects.length - 2}
                          </Badge>
                        )}
                      </div>
                    )}
                    
                    {/* Class Teacher Badge */}
                    {teacher.isClassTeacher && (
                      <div className="mt-2">
                        <Badge variant="outline" className="border-green-500 text-green-700 text-xs">
                          Class Teacher: {teacher.className}
                        </Badge>
                      </div>
                    )}
                  </div>
                  <Button variant="ghost" size="sm" asChild className="ml-2 flex-shrink-0">
                    <a href={`mailto:${teacher.email}`}>
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
              <p className="text-gray-500 text-sm">No teachers found</p>
            </div>
          )}
        </div>

        {/* Desktop: Table View */}
        <div className="hidden md:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="min-w-[150px]">Name</TableHead>
                <TableHead className="min-w-[200px]">Email</TableHead>
                <TableHead className="min-w-[150px]">Subjects</TableHead>
                <TableHead className="min-w-[120px]">Class Teacher</TableHead>
                <TableHead className="min-w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {currentItems.length > 0 ? (
                currentItems.map((teacher) => (
                  <TableRow key={teacher.id}>
                    <TableCell className="font-medium">
                      {teacher.first_name} {teacher.middle_name || ''} {teacher.last_name}
                    </TableCell>
                    <TableCell>{teacher.email}</TableCell>
                    <TableCell>
                      {teacher.subjects.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {teacher.subjects.slice(0, 2).map((subject, idx) => (
                            <Badge key={idx} variant="secondary" className="text-xs">
                              {subject}
                            </Badge>
                          ))}
                          {teacher.subjects.length > 2 && (
                            <Badge variant="secondary" className="text-xs">
                              +{teacher.subjects.length - 2}
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <span className="text-slate-400 text-sm">No subjects</span>
                      )}
                    </TableCell>
                    <TableCell>
                      {teacher.isClassTeacher ? (
                        <Badge variant="outline" className="border-green-500 text-green-700">
                          {teacher.className}
                        </Badge>
                      ) : (
                        <span className="text-slate-400 text-sm">-</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" asChild>
                        <a href={`mailto:${teacher.email}`}>
                          <Mail className="h-4 w-4" />
                        </a>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-slate-500">
                    No teachers found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* Pagination */}
        <div className="p-4 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
              >
                Previous
              </Button>
            </div>
            <div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}