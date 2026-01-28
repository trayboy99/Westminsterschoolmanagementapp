import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { BookOpen, Users, FileText } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface Subject {
  id: string;
  name: string;
  code?: string;
  classes: {
    id: string;
    name: string;
    level?: string;
    display_name?: string;
  }[];
}

export function MySubjects() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchMySubjects();
  }, []);

  const fetchMySubjects = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[MySubjects] No session found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      console.log('[MySubjects] Fetching subjects...');
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/my-subjects`,
        { headers }
      );
      const data = await res.json();
      
      console.log('[MySubjects] Response:', data);
      
      if (data.success) {
        console.log('[MySubjects] Subjects fetched:', data.subjects.length);
        console.log('[MySubjects] Subjects data with classes:', JSON.stringify(data.subjects, null, 2));
        setSubjects(data.subjects || []);
      } else {
        console.error('[MySubjects] Error from server:', data.error);
        toast.error(data.error || 'Failed to load subjects');
      }
    } catch (error) {
      console.error('[MySubjects] Error fetching subjects:', error);
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
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">My Subjects</h1>
            <p className="text-purple-100 text-sm md:text-base mt-1">
              Subjects you are teaching this academic year
            </p>
          </div>
        </div>
      </div>

      {/* Stats - App Style */}
      <div className="grid grid-cols-3 gap-3 px-4 md:px-0">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-blue-50 rounded-xl mb-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
            <p className="text-xs text-gray-600 mt-1">Subjects</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-green-50 rounded-xl mb-2">
              <Users className="h-5 w-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(() => {
                const uniqueClassIds = new Set<string>();
                subjects.forEach(subject => {
                  subject.classes.forEach(cls => uniqueClassIds.add(cls.id));
                });
                return uniqueClassIds.size;
              })()}
            </p>
            <p className="text-xs text-gray-600 mt-1">Classes</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
          <div className="flex flex-col items-center text-center">
            <div className="p-2.5 bg-purple-50 rounded-xl mb-2">
              <FileText className="h-5 w-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{subjects.length}</p>
            <p className="text-xs text-gray-600 mt-1">Areas</p>
          </div>
        </div>
      </div>

      {/* Subjects List - App Style */}
      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 px-4 md:px-0">
          {subjects.map((subject) => (
            <div 
              key={subject.id} 
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="p-2.5 bg-blue-50 rounded-xl flex-shrink-0">
                  <BookOpen className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 text-base truncate">
                    {subject.name}
                  </h3>
                  {subject.code && (
                    <Badge variant="outline" className="mt-1 text-xs">
                      {subject.code}
                    </Badge>
                  )}
                </div>
              </div>

              <div>
                <p className="text-xs font-medium text-gray-500 mb-2">
                  Teaching in {subject.classes.length} {subject.classes.length === 1 ? 'Class' : 'Classes'}:
                </p>
                <div className="flex flex-wrap gap-2">
                  {subject.classes.map((cls) => (
                    <Badge key={cls.id} variant="secondary" className="text-xs">
                      {cls.display_name || cls.name}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 mx-4 md:mx-0">
          <div className="text-center">
            <div className="inline-flex p-4 bg-gray-50 rounded-full mb-3">
              <BookOpen className="h-8 w-8 text-gray-400" />
            </div>
            <h3 className="text-lg font-medium text-slate-600 mb-2">No Subjects Assigned</h3>
            <p className="text-slate-500 text-sm">
              You don't have any subjects assigned yet. Contact the administrator for assignment.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}