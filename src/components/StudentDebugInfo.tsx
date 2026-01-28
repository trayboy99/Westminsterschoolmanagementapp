import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { RefreshCw, Database, Users } from 'lucide-react';

export function StudentDebugInfo() {
  const [debugData, setDebugData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const supabase = createClient();

  const fetchDebugData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('No session found');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students-debug`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` }
        }
      );

      const data = await response.json();
      console.log('Student Debug Data:', data);
      setDebugData(data);
    } catch (error) {
      console.error('Error fetching debug data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebugData();
  }, []);

  if (!debugData) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <div className="text-sm text-slate-500">Loading debug information...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="h-5 w-5 text-blue-600" />
            <CardTitle className="text-base font-semibold">Student Database Debug Info</CardTitle>
          </div>
          <Button
            onClick={fetchDebugData}
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Summary Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
            <div className="text-xs text-blue-600 font-medium mb-1">All Students</div>
            <div className="text-2xl font-bold text-blue-900">
              {debugData.summary?.total_all_students || 0}
            </div>
          </div>
          <div className="p-3 bg-green-50 rounded-lg border border-green-200">
            <div className="text-xs text-green-600 font-medium mb-1">Active Students</div>
            <div className="text-2xl font-bold text-green-900">
              {debugData.summary?.total_active_students || 0}
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
            <div className="text-xs text-amber-600 font-medium mb-1">With Class</div>
            <div className="text-2xl font-bold text-amber-900">
              {debugData.summary?.active_with_class || 0}
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-lg border border-red-200">
            <div className="text-xs text-red-600 font-medium mb-1">Without Class</div>
            <div className="text-2xl font-bold text-red-900">
              {debugData.summary?.active_without_class || 0}
            </div>
          </div>
        </div>

        {/* Class Breakdown */}
        {debugData.class_breakdown && Object.keys(debugData.class_breakdown).length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1">
              <Users className="h-3 w-3" />
              Students Per Class ID
            </div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {Object.entries(debugData.class_breakdown).map(([classId, count]) => (
                  <div key={classId} className="flex justify-between">
                    <span className="text-slate-600 font-mono">{classId.substring(0, 8)}...</span>
                    <span className="font-semibold text-slate-900">{count as number}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Sample Students */}
        {debugData.sample_students && debugData.sample_students.length > 0 && (
          <div>
            <div className="text-xs font-semibold text-slate-700 mb-2">Sample Students (First 5)</div>
            <div className="bg-slate-50 rounded-lg p-3 border border-slate-200 space-y-2">
              {debugData.sample_students.map((student: any) => (
                <div key={student.id} className="text-xs flex justify-between items-center">
                  <span className="text-slate-900 font-medium">{student.name}</span>
                  <span className={`text-xs px-2 py-0.5 rounded ${
                    student.class_id === 'null' 
                      ? 'bg-red-100 text-red-700' 
                      : 'bg-green-100 text-green-700'
                  }`}>
                    {student.class_id === 'null' ? 'No Class' : 'Has Class'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SQL Queries */}
        <div>
          <div className="text-xs font-semibold text-slate-700 mb-2">SQL Queries (Run in Supabase)</div>
          <div className="bg-slate-900 rounded-lg p-3 text-xs font-mono space-y-2 max-h-48 overflow-y-auto">
            {debugData.sql_queries && Object.entries(debugData.sql_queries).map(([key, query]) => (
              <div key={key}>
                <div className="text-slate-400 mb-1">-- {key.replace(/_/g, ' ')}</div>
                <div className="text-green-400">{query as string}</div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
