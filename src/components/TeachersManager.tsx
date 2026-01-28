import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Alert, AlertDescription } from './ui/alert';
import { Users, AlertCircle, Mail, User, BookOpen, GraduationCap, ChevronLeft, ChevronRight } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';
import { createClient } from '../utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';

interface Subject {
  id: string;
  name: string;
}

interface Teacher {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  photo_url?: string;
  subjects: Subject[];
  subject_count: number;
}

export function TeachersManager() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [totalTeachers, setTotalTeachers] = useState(0);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const supabase = createClient();

  useEffect(() => {
    fetchTeachers();
  }, []);

  // Reset to page 1 when teachers data changes
  useEffect(() => {
    setCurrentPage(1);
  }, [teachers.length]);

  const checkPing = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/ping`
      );
      const data = await response.json();
      console.log('[Ping] Response:', data);
      alert(`Server responded:\n\n${JSON.stringify(data, null, 2)}`);
    } catch (err) {
      console.error('[Ping] Error:', err);
      alert('Ping failed. Check console.');
    }
  };

  const checkHealth = async () => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/health`
      );
      const data = await response.json();
      console.log('[Health] Server version:', data);
      alert(`Server Status: ${data.status}\nVersion: ${data.version || 'Unknown'}\nTimestamp: ${data.timestamp || 'N/A'}`);
    } catch (err) {
      console.error('[Health] Error:', err);
      alert('Health check failed');
    }
  };

  const debugTeachers = async () => {
    try {
      console.log('[Teachers Debug] Calling debug endpoint...');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers-debug`,
        {
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[Teachers Debug] Response:', data);
      alert(`Debug Info:\n\nAll Profiles: ${data.all_profiles_count}\nTeachers: ${data.teachers_count}\nSubjects: ${data.subjects_count}\n\nCheck console for full details.`);
    } catch (err) {
      console.error('[Teachers Debug] Error:', err);
      alert('Debug failed. Check console for details.');
    }
  };

  const fetchTeachers = async () => {
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

      console.log('[Teachers] Fetching with access token...');

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Teachers] HTTP Error:', response.status, errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();
      console.log('[Teachers] Response data:', data);
      console.log('[Teachers] Response success:', data.success);
      console.log('[Teachers] Response teachers:', data.teachers);
      console.log('[Teachers] Response total_teachers:', data.total_teachers);

      if (!data.success) {
        throw new Error(data.error || 'Failed to fetch teachers');
      }

      const teachersArray = data.teachers || [];
      // Fallback: if total_teachers isn't in response, count the array
      const totalCount = data.total_teachers ?? teachersArray.length;

      console.log('[Teachers] Setting state - teachers:', teachersArray);
      console.log('[Teachers] Setting state - total:', totalCount);
      console.log('[Teachers] total_teachers from API:', data.total_teachers);
      console.log('[Teachers] teachersArray.length:', teachersArray.length);

      setTeachers(teachersArray);
      setTotalTeachers(totalCount);

      console.log('[Teachers] Loaded successfully:', {
        total: totalCount,
        teachers_count: teachersArray.length,
        teachers: teachersArray
      });

      // Fetch total subjects count from the subjects table
      console.log('[Subjects] Fetching total subjects count...');
      const subjectsResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subjects`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (subjectsResponse.ok) {
        const subjectsData = await subjectsResponse.json();
        console.log('[Subjects] Response:', subjectsData);
        if (subjectsData.success) {
          setTotalSubjects(subjectsData.total_subjects || 0);
          console.log('[Subjects] Total subjects:', subjectsData.total_subjects);
        }
      } else {
        console.error('[Subjects] Failed:', subjectsResponse.status);
      }
    } catch (err) {
      console.error('[Teachers] Error:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch teachers');
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
            <h2 className="text-3xl">Teachers Management</h2>
            <p className="text-gray-500">Loading teachers...</p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i}>
              <CardHeader className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              </CardHeader>
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
            <h2 className="text-3xl">Teachers Management</h2>
            <p className="text-gray-500">Manage school teachers</p>
          </div>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={fetchTeachers}
              className="ml-4"
            >
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  // Calculate statistics
  const teachersWithSubjects = teachers.filter(t => t.subject_count > 0).length;
  const teachersWithoutSubjects = teachers.filter(t => t.subject_count === 0).length;
  // totalSubjects now comes from the database via state

  // Pagination calculations
  const totalPages = Math.ceil(teachers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedTeachers = teachers.slice(startIndex, endIndex);

  // Pagination handlers
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  const goToPage = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-2xl sm:text-3xl">Teachers Management</h2>
          <p className="text-sm sm:text-base text-gray-500">
            Manage and view all teachers in the school
          </p>
        </div>
        <Button onClick={fetchTeachers} variant="outline" size="sm" className="w-full sm:w-auto">
          Refresh
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
        <Card className="bg-gradient-to-br from-indigo-500 to-indigo-600 border-indigo-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-white">Total Teachers</CardTitle>
            <Users className="h-4 w-4 text-indigo-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{totalTeachers}</div>
            <p className="text-xs text-indigo-100">
              Registered teachers
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-teal-500 to-teal-600 border-teal-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-white">With Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-teal-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{teachersWithSubjects}</div>
            <p className="text-xs text-teal-100">
              Teaching assignments
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-500 to-amber-600 border-amber-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-white">Without Subjects</CardTitle>
            <AlertCircle className="h-4 w-4 text-amber-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{teachersWithoutSubjects}</div>
            <p className="text-xs text-amber-100">
              Need assignment
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-pink-500 to-pink-600 border-pink-700">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm text-white">Total Subjects</CardTitle>
            <GraduationCap className="h-4 w-4 text-pink-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl sm:text-3xl font-bold text-white">{totalSubjects}</div>
            <p className="text-xs text-pink-100">
              Subjects in system
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Teachers Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Teachers</CardTitle>
          <CardDescription>
            Complete list of all registered teachers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {teachers.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No teachers registered yet.</p>
              <p className="text-sm mt-2">Teachers will appear here after registration approval.</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-slate-50">
                      <TableRow>
                        <TableHead className="min-w-[120px]">Teacher ID</TableHead>
                        <TableHead className="min-w-[200px]">Name</TableHead>
                        <TableHead className="min-w-[220px]">Email</TableHead>
                        <TableHead className="min-w-[250px]">Subjects Teaching</TableHead>
                        <TableHead className="min-w-[120px]">Subject Count</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {paginatedTeachers.map((teacher) => (
                        <TableRow key={teacher.id}>
                          <TableCell className="text-sm text-gray-500">
                            {teacher.id.substring(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                                <AvatarImage src={teacher.photo_url || ''} alt={`${teacher.first_name} ${teacher.last_name}`} />
                                <AvatarFallback className="h-4 w-4 text-green-600">
                                  <User className="h-4 w-4 text-green-600" />
                                </AvatarFallback>
                              </Avatar>
                              <span className="whitespace-nowrap">
                                {teacher.first_name}
                                {teacher.middle_name ? ` ${teacher.middle_name}` : ''} {teacher.last_name}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Mail className="h-3 w-3 flex-shrink-0" />
                              <span className="whitespace-nowrap">{teacher.email || 'N/A'}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            {teacher.subject_count > 0 && teacher.subjects && teacher.subjects.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {teacher.subjects.slice(0, 3).map((subject) => (
                                  <Badge key={subject.id} variant="secondary" className="text-xs whitespace-nowrap">
                                    {subject.name}
                                  </Badge>
                                ))}
                                {teacher.subjects.length > 3 && (
                                  <Badge variant="outline" className="text-xs whitespace-nowrap">
                                    +{teacher.subjects.length - 3} more
                                  </Badge>
                                )}
                              </div>
                            ) : (
                              <span className="text-sm text-gray-400 whitespace-nowrap">No subjects assigned</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge 
                              variant={teacher.subject_count > 0 ? "default" : "outline"}
                              className="text-xs"
                            >
                              {teacher.subject_count}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </div>

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-4 pt-4 border-t">
                  {/* Page Info */}
                  <div className="text-sm text-gray-600">
                    Showing {startIndex + 1} to {Math.min(endIndex, teachers.length)} of {teachers.length} teachers
                  </div>

                  {/* Pagination Buttons */}
                  <div className="flex items-center gap-2">
                    {/* Previous Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className="gap-1"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="hidden sm:inline">Previous</span>
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                        // Show first page, last page, current page, and pages around current
                        const showPage = 
                          page === 1 || 
                          page === totalPages || 
                          (page >= currentPage - 1 && page <= currentPage + 1);
                        
                        const showEllipsis = 
                          (page === currentPage - 2 && currentPage > 3) ||
                          (page === currentPage + 2 && currentPage < totalPages - 2);

                        if (showEllipsis) {
                          return (
                            <span key={page} className="px-2 text-gray-400">
                              ...
                            </span>
                          );
                        }

                        if (!showPage) {
                          return null;
                        }

                        return (
                          <Button
                            key={page}
                            variant={currentPage === page ? "default" : "outline"}
                            size="sm"
                            onClick={() => goToPage(page)}
                            className="min-w-[36px]"
                          >
                            {page}
                          </Button>
                        );
                      })}
                    </div>

                    {/* Next Button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
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
        </CardContent>
      </Card>
    </div>
  );
}