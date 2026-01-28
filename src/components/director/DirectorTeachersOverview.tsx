import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { 
  Users, 
  GraduationCap, 
  BookOpen, 
  Search,
  Mail,
  Loader2,
  UserCircle,
  Award,
  ChevronRight,
  ChevronLeft,
  Phone,
  MapPin,
  Calendar,
  X,
  Briefcase
} from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

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
  subjects: Subject[];
  subject_count: number;
  photo_url?: string;
  phone?: string;
  address?: string;
  date_joined?: string;
  gender?: string;
}

export function DirectorTeachersOverview() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [totalSubjects, setTotalSubjects] = useState(0);
  const [totalClasses, setTotalClasses] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const itemsPerPage = 8;
  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeachers(),
        fetchSubjects(),
        fetchClasses()
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      // Get access token from Supabase session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication session found');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await res.json();
      console.log('Teachers data:', data);
      
      if (data.success && data.teachers) {
        // Fetch profile photos for each teacher
        const teachersWithPhotos = await Promise.all(
          data.teachers.map(async (teacher: Teacher) => {
            try {
              const photoRes = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/${teacher.id}`,
                {
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                  },
                }
              );
              const photoData = await photoRes.json();
              return {
                ...teacher,
                photo_url: photoData.success && photoData.profile?.photo_url 
                  ? photoData.profile.photo_url 
                  : '',
                phone: photoData.profile?.phone || '',
                address: photoData.profile?.address || '',
                gender: photoData.profile?.gender || ''
              };
            } catch (error) {
              console.error(`Failed to fetch photo for teacher ${teacher.id}:`, error);
              return { ...teacher, photo_url: '' };
            }
          })
        );
        setTeachers(teachersWithPhotos);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication session found');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subjects`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await res.json();
      
      if (data.success) {
        setTotalSubjects(data.total_subjects || 0);
      }
    } catch (error) {
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClasses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No authentication session found');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const data = await res.json();
      
      if (data.success) {
        setTotalClasses(data.classes?.length || 0);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    }
  };

  const getFullName = (teacher: Teacher) => {
    const parts = [teacher.first_name, teacher.middle_name, teacher.last_name].filter(Boolean);
    return parts.join(' ');
  };

  const getInitials = (teacher: Teacher) => {
    return `${teacher.first_name?.[0] || ''}${teacher.last_name?.[0] || ''}`;
  };

  const handleTeacherClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowDetailsModal(true);
  };

  const filteredTeachers = teachers.filter(teacher =>
    getFullName(teacher).toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    teacher.subjects.some(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  // Pagination calculations
  const totalPages = Math.ceil(filteredTeachers.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentTeachers = filteredTeachers.slice(startIndex, endIndex);

  // Reset to page 1 when search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Loading teachers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 -mx-4 -mt-4 p-4 md:mx-0 md:mt-0 md:p-6 pb-24 md:pb-6">
      {/* Mobile App Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white rounded-3xl p-6 md:p-8 shadow-xl mb-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
            <Users className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">Teachers Management</h1>
            <p className="text-blue-100 text-sm mt-1">
              View and manage all teaching staff
            </p>
          </div>
        </div>

        {/* Stats Summary in Header */}
        <div className="grid grid-cols-3 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <Users className="h-5 w-5 mx-auto mb-1.5 text-blue-200" />
            <p className="text-2xl font-bold">{teachers.length}</p>
            <p className="text-[10px] text-blue-100 uppercase tracking-wide">Teachers</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <BookOpen className="h-5 w-5 mx-auto mb-1.5 text-purple-200" />
            <p className="text-2xl font-bold">{totalSubjects}</p>
            <p className="text-[10px] text-purple-100 uppercase tracking-wide">Subjects</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <GraduationCap className="h-5 w-5 mx-auto mb-1.5 text-pink-200" />
            <p className="text-2xl font-bold">{totalClasses}</p>
            <p className="text-[10px] text-pink-100 uppercase tracking-wide">Classes</p>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="relative mb-5">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
        <Input
          type="text"
          placeholder="Search teachers by name, email, or subject..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-12 pr-4 h-14 bg-white border-2 border-slate-200 rounded-2xl text-base focus:border-blue-400 focus:ring-4 focus:ring-blue-100 shadow-sm"
        />
      </div>

      {/* Results Count */}
      {filteredTeachers.length > 0 && (
        <div className="mb-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            Showing <span className="font-semibold text-slate-900">{startIndex + 1}-{Math.min(endIndex, filteredTeachers.length)}</span> of <span className="font-semibold text-slate-900">{filteredTeachers.length}</span> teachers
          </p>
          <p className="text-xs text-slate-500">
            Page {currentPage} of {totalPages}
          </p>
        </div>
      )}

      {/* Teachers Grid */}
      {filteredTeachers.length === 0 ? (
        <Card className="bg-white/70 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-3xl shadow-sm">
          <CardContent className="p-12 text-center">
            <UserCircle className="h-16 w-16 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No teachers found</h3>
            <p className="text-sm text-slate-500">
              {searchTerm ? 'Try adjusting your search criteria' : 'No teachers have been added yet'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            {currentTeachers.map((teacher) => (
              <Card 
                key={teacher.id} 
                className="bg-white hover:shadow-2xl transition-all duration-300 border-2 border-slate-200 hover:border-blue-300 rounded-3xl overflow-hidden group cursor-pointer active:scale-[0.98]"
                onClick={() => handleTeacherClick(teacher)}
              >
                <CardContent className="p-0">
                  {/* Teacher Header with Avatar */}
                  <div className="bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-5 relative overflow-hidden">
                    {/* Decorative Background */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-blue-200/20 rounded-full -mr-16 -mt-16"></div>
                    <div className="absolute bottom-0 left-0 w-24 h-24 bg-purple-200/20 rounded-full -ml-12 -mb-12"></div>
                    
                    <div className="flex items-start gap-4 relative z-10">
                      <Avatar className="h-16 w-16 border-4 border-white shadow-lg ring-2 ring-blue-100">
                        <AvatarImage src={teacher.photo_url} alt={getFullName(teacher)} />
                        <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg font-bold">
                          {getInitials(teacher)}
                        </AvatarFallback>
                      </Avatar>
                      
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-lg text-slate-800 truncate mb-1">
                          {getFullName(teacher)}
                        </h3>
                        <div className="flex items-center gap-2 text-sm text-slate-600 mb-2">
                          <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                          <span className="truncate text-xs">{teacher.email}</span>
                        </div>
                        <Badge 
                          variant={teacher.subject_count > 0 ? "default" : "outline"}
                          className="text-xs"
                        >
                          <Award className="h-3 w-3 mr-1" />
                          {teacher.subject_count} {teacher.subject_count === 1 ? 'Subject' : 'Subjects'}
                        </Badge>
                      </div>
                      
                      <ChevronRight className="h-5 w-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-1 transition-all flex-shrink-0" />
                    </div>
                  </div>

                  {/* Subjects Section */}
                  <div className="p-5 pt-4">
                    {teacher.subject_count === 0 ? (
                      <div className="text-center py-6 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <BookOpen className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                        <p className="text-sm text-slate-500 font-medium">No subjects assigned</p>
                        <p className="text-xs text-slate-400 mt-1">This teacher has no subjects yet</p>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <BookOpen className="h-3.5 w-3.5" />
                          Teaching Subjects
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {teacher.subjects.slice(0, 4).map((subject) => (
                            <Badge 
                              key={subject.id} 
                              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white border-0 px-3 py-1.5 text-xs font-medium shadow-sm hover:shadow-md transition-shadow"
                            >
                              {subject.name}
                            </Badge>
                          ))}
                          {teacher.subjects.length > 4 && (
                            <Badge 
                              variant="outline" 
                              className="border-2 border-slate-300 text-slate-700 px-3 py-1.5 text-xs font-semibold hover:bg-slate-100 transition-colors"
                            >
                              +{teacher.subjects.length - 4} more
                            </Badge>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Footer Action Hint */}
                  <div className="bg-gradient-to-r from-slate-50 to-blue-50 px-5 py-3 border-t border-slate-100">
                    <p className="text-xs text-center text-slate-500 font-medium">
                      Tap to view details
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                className="h-10 px-4 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>

              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Show first page, last page, current page, and pages around current
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="sm"
                        onClick={() => setCurrentPage(page)}
                        className={`h-10 w-10 rounded-xl ${
                          currentPage === page
                            ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0 shadow-md'
                            : 'border-2 hover:bg-blue-50 hover:border-blue-300'
                        }`}
                      >
                        {page}
                      </Button>
                    );
                  } else if (
                    page === currentPage - 2 ||
                    page === currentPage + 2
                  ) {
                    return <span key={page} className="px-2 text-slate-400">...</span>;
                  }
                  return null;
                })}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                className="h-10 px-4 rounded-xl border-2 hover:bg-blue-50 hover:border-blue-300 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          )}
        </>
      )}

      {/* Teacher Details Modal */}
      <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl p-0 gap-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Teacher Details</DialogTitle>
            <DialogDescription>
              View detailed information about the selected teacher including contact details, teaching subjects, and assigned classes.
            </DialogDescription>
          </DialogHeader>
          {selectedTeacher && (
            <>
              {/* Modal Header with Gradient */}
              <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white p-6 rounded-t-3xl relative">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-white/20 rounded-full transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
                
                <div className="flex items-start gap-4 mb-4">
                  <Avatar className="h-20 w-20 border-4 border-white shadow-xl">
                    <AvatarImage src={selectedTeacher.photo_url} alt={getFullName(selectedTeacher)} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-400 to-purple-500 text-white text-2xl font-bold">
                      {getInitials(selectedTeacher)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1">
                    <h2 className="text-2xl font-bold mb-2">{getFullName(selectedTeacher)}</h2>
                    <div className="flex items-center gap-2 text-blue-100">
                      <Briefcase className="h-4 w-4" />
                      <span className="text-sm">Teacher</span>
                    </div>
                  </div>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <p className="text-xs text-blue-100 mb-1">Subjects Teaching</p>
                    <p className="text-2xl font-bold">{selectedTeacher.subject_count}</p>
                  </div>
                  <div className="bg-white/10 backdrop-blur-md rounded-xl p-3 border border-white/20">
                    <p className="text-xs text-blue-100 mb-1">Status</p>
                    <Badge className="bg-green-500 hover:bg-green-600 border-0">Active</Badge>
                  </div>
                </div>
              </div>

              {/* Modal Body */}
              <div className="p-6 space-y-6">
                {/* Contact Information */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Mail className="h-4 w-4 text-blue-600" />
                    Contact Information
                  </h3>
                  <div className="space-y-3 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Mail className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500 mb-1">Email Address</p>
                        <p className="text-sm font-medium text-slate-900">{selectedTeacher.email}</p>
                      </div>
                    </div>
                    
                    {selectedTeacher.phone && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-green-100 rounded-lg">
                          <Phone className="h-4 w-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Phone Number</p>
                          <p className="text-sm font-medium text-slate-900">{selectedTeacher.phone}</p>
                        </div>
                      </div>
                    )}

                    {selectedTeacher.address && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-orange-100 rounded-lg">
                          <MapPin className="h-4 w-4 text-orange-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Address</p>
                          <p className="text-sm font-medium text-slate-900">{selectedTeacher.address}</p>
                        </div>
                      </div>
                    )}

                    {selectedTeacher.gender && (
                      <div className="flex items-start gap-3">
                        <div className="p-2 bg-purple-100 rounded-lg">
                          <UserCircle className="h-4 w-4 text-purple-600" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs text-slate-500 mb-1">Gender</p>
                          <p className="text-sm font-medium text-slate-900 capitalize">{selectedTeacher.gender}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Teaching Subjects */}
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-purple-600" />
                    Teaching Subjects ({selectedTeacher.subjects.length})
                  </h3>
                  
                  {selectedTeacher.subjects.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                      <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-500 font-medium">No subjects assigned</p>
                      <p className="text-xs text-slate-400 mt-1">This teacher has no subjects yet</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                      {selectedTeacher.subjects.map((subject) => (
                        <div 
                          key={subject.id}
                          className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200 rounded-2xl p-4 hover:shadow-md transition-shadow"
                        >
                          <div className="flex items-center gap-2">
                            <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center flex-shrink-0">
                              <BookOpen className="h-5 w-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{subject.name}</p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 p-4 rounded-b-3xl border-t border-slate-200">
                <Button
                  onClick={() => setShowDetailsModal(false)}
                  className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl font-semibold shadow-lg"
                >
                  Close
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}