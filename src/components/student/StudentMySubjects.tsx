import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { BookOpen, User, Mail } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Subject {
  id: string;
  name: string;
  code?: string;
  teacher_name?: string;
  teacher_email?: string;
}

export function StudentMySubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentSession, setCurrentSession] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchCurrentSession();
  }, []);

  useEffect(() => {
    if (currentSession) {
      fetchSubjects();
    }
  }, [currentSession]);

  const fetchCurrentSession = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Please log in again');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      
      if (data.success) {
        if (data.sessions && Array.isArray(data.sessions)) {
          const current = data.sessions.find((s: any) => s.is_current);
          if (current) {
            setCurrentSession(current.session_name || '');
          }
        } else if (data.settings && data.settings.session) {
          setCurrentSession(data.settings.session || '');
        }
      }
    } catch (error) {
      console.error('[StudentMySubjects] Error fetching session:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.log('[StudentMySubjects] No session found');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) {
        toast.error('User not found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-subjects?student_id=${user.id}&session=${currentSession}`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success) {
        // Extract subjects from studentSubjects array
        const subjectsData = (result.studentSubjects || []).map((ss: any) => ({
          id: ss.subject.id,
          name: ss.subject.name,
          code: ss.subject.code,
          teacher_name: ss.subject.teacher_name,
          teacher_email: ss.subject.teacher_email,
        }));
        setSubjects(subjectsData);
      } else {
        if (!result.error?.includes('Subject offerings not configured')) {
          toast.error(result.error || 'Failed to load subjects');
        }
      }
    } catch (error) {
      console.error('[StudentMySubjects] Error:', error);
      toast.error('Failed to load subjects');
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

  return (
    <div className="space-y-4">
      {/* Mobile App Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3 mb-4">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <BookOpen className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Subjects</h1>
            <p className="text-emerald-100 text-sm">Subjects you're studying</p>
          </div>
        </div>
        
        {/* Subject Count in Header */}
        <div className="bg-white/20 backdrop-blur-sm rounded-xl p-4 border border-white/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-emerald-100 text-sm mb-1">Total Subjects</p>
              <p className="text-4xl font-bold">{subjects.length}</p>
            </div>
            <div className="w-14 h-14 bg-white/20 rounded-xl flex items-center justify-center">
              <BookOpen className="h-8 w-8" />
            </div>
          </div>
        </div>
      </div>

      {/* Subjects List - Mobile Optimized */}
      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {subjects.map((subject) => (
            <div key={subject.id} className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md active:scale-[0.99] transition-all">
              <div className="bg-gradient-to-r from-emerald-50 to-teal-50 border-b border-gray-200 px-4 py-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-9 h-9 bg-emerald-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <BookOpen className="h-5 w-5 text-emerald-600" />
                      </div>
                      <h3 className="font-bold text-gray-900 leading-tight">{subject.name}</h3>
                    </div>
                    {subject.code && (
                      <div className="inline-flex items-center px-2.5 py-1 bg-white border border-emerald-300 rounded-lg">
                        <span className="text-xs font-semibold text-emerald-700">{subject.code}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="p-4">
                {subject.teacher_name ? (
                  <div className="space-y-2">
                    <p className="text-xs text-gray-600 font-medium uppercase tracking-wide">Subject Teacher</p>
                    <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white shadow-sm flex-shrink-0">
                        <User className="h-5 w-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 text-sm">{subject.teacher_name}</p>
                        {subject.teacher_email && (
                          <p className="text-xs text-gray-500 truncate flex items-center gap-1 mt-0.5">
                            <Mail className="h-3 w-3 flex-shrink-0" />
                            {subject.teacher_email}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-xs text-gray-500">No teacher assigned</p>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
              <BookOpen className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-900 font-semibold text-lg">No Subjects Found</p>
            <p className="text-sm text-slate-500 mt-1 text-center">
              You haven't been assigned to any subjects yet
            </p>
          </div>
        </div>
      )}
    </div>
  );
}