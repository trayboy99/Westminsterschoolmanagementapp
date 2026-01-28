import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Users, GraduationCap, Mail, User } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';

interface ClassData {
  classInfo: {
    id: string;
    name: string;
    level?: string;
    class_teacher_name?: string;
    class_teacher_email?: string;
    class_teacher_photo_url?: string;
  };
  classmates: {
    id: string;
    first_name: string;
    last_name: string;
    middle_name?: string;
    email: string;
    photo_url?: string;
  }[];
}

export function StudentMyClass() {
  const [data, setData] = useState<ClassData | null>(null);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchClassData();
  }, []);

  const fetchClassData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[StudentMyClass] No session found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-class`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success) {
        setData(result.data);
      } else {
        toast.error(result.error || 'Failed to load class data');
      }
    } catch (error) {
      console.error('[StudentMyClass] Error:', error);
      toast.error('Failed to load class data');
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

  if (!data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <GraduationCap className="h-8 w-8 text-slate-400" />
          </div>
          <p className="text-slate-900 font-medium text-lg">No Class Assigned</p>
          <p className="text-slate-500 text-sm mt-1">You are not assigned to a class yet</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile App Header */}
      <div className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">My Class</h1>
            <p className="text-blue-100 text-sm">Class info & classmates</p>
          </div>
        </div>
      </div>

      {/* Class Info Card - Mobile Optimized */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-5 space-y-5">
          <div>
            <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-2">Class Name</p>
            <p className="text-4xl font-bold text-gray-900">{data.classInfo.name}</p>
            {data.classInfo.level && (
              <div className="inline-flex items-center gap-2 mt-3 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-xl">
                <span className="text-sm font-semibold text-blue-700">{data.classInfo.level}</span>
              </div>
            )}
          </div>
          
          {data.classInfo.class_teacher_name && (
            <div className="pt-5 border-t border-gray-100">
              <p className="text-xs text-gray-600 font-medium uppercase tracking-wide mb-3">Class Teacher</p>
              <div className="flex items-center gap-3 bg-gradient-to-r from-blue-50 to-cyan-50 border border-blue-200 rounded-xl p-4">
                <Avatar className="w-12 h-12 border-2 border-white shadow-md">
                  <AvatarImage src={data.classInfo.class_teacher_photo_url} alt={data.classInfo.class_teacher_name} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-cyan-600 text-white font-bold">
                    {data.classInfo.class_teacher_name?.split(' ')[0]?.[0]}{data.classInfo.class_teacher_name?.split(' ')[1]?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900">{data.classInfo.class_teacher_name}</p>
                  {data.classInfo.class_teacher_email && (
                    <p className="text-sm text-gray-600 flex items-center gap-1.5 mt-1 truncate">
                      <Mail className="h-3.5 w-3.5 flex-shrink-0" />
                      {data.classInfo.class_teacher_email}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Classmates Section - Mobile Optimized */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="bg-slate-50 border-b border-gray-200 px-5 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-gray-900 font-semibold">
              <Users className="h-5 w-5 text-gray-700" />
              <span>Classmates</span>
            </div>
            <div className="px-3 py-1 bg-blue-100 rounded-full">
              <span className="text-sm font-semibold text-blue-700">{data.classmates.length}</span>
            </div>
          </div>
        </div>
        <div className="p-4">
          {data.classmates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
              {data.classmates.map((classmate) => (
                <div key={classmate.id} className="bg-slate-50 hover:bg-slate-100 active:bg-slate-200 border border-slate-200 rounded-xl p-3.5 transition-colors">
                  <div className="flex items-center gap-3">
                    <Avatar className="w-11 h-11 shadow-sm">
                      <AvatarImage src={classmate.photo_url} alt={`${classmate.first_name} ${classmate.last_name}`} />
                      <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-bold text-sm">
                        {classmate.first_name?.[0]}{classmate.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 truncate text-sm leading-tight">
                        {classmate.first_name} {classmate.middle_name ? classmate.middle_name + ' ' : ''}{classmate.last_name}
                      </p>
                      <p className="text-xs text-gray-500 truncate mt-1">{classmate.email}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <Users className="h-6 w-6 text-slate-400" />
              </div>
              <p className="text-slate-500 text-sm">No classmates found</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}