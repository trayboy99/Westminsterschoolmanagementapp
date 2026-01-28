import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { AlertCircle, Database } from 'lucide-react';

export function MarksDebugPanel() {
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'midterm' | 'terminal'>('midterm');

  const supabase = createClient();

  useEffect(() => {
    fetchSessions();
  }, []);

  const fetchSessions = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        }
      );
      const data = await res.json();
      
      if (data.success && data.sessions) {
        setSessions(data.sessions);
        const current = data.sessions.find((s: any) => s.is_current);
        if (current) {
          setSelectedSession(current.session_name);
          const currentTerm = data.terms?.find((t: any) => t.is_current);
          if (currentTerm) {
            setSelectedTerm(currentTerm.term_name);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const runDebug = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        session: selectedSession,
        term: selectedTerm,
        type: selectedType
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/debug-marks?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          }
        }
      );
      const data = await res.json();
      
      console.log('Debug data:', data);
      setDebugData(data.debug);
    } catch (error) {
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-6xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Marks Database Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 items-end">
          <div>
            <label className="text-sm font-medium">Session</label>
            <select 
              value={selectedSession}
              onChange={(e) => setSelectedSession(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              {sessions.map(s => (
                <option key={s.id} value={s.session_name}>{s.session_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium">Term</label>
            <input 
              type="text"
              value={selectedTerm}
              onChange={(e) => setSelectedTerm(e.target.value)}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
              placeholder="e.g., First Term"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Type</label>
            <select 
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value as 'midterm' | 'terminal')}
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2"
            >
              <option value="midterm">Midterm</option>
              <option value="terminal">Terminal</option>
            </select>
          </div>
          <Button onClick={runDebug} disabled={loading}>
            {loading ? 'Loading...' : 'Run Debug'}
          </Button>
        </div>

        {debugData && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Database Summary</h3>
              <div className="grid grid-cols-3 gap-4 text-sm">
                <div>
                  <div className="text-slate-600">Total Marks</div>
                  <div className="text-2xl font-bold">{debugData.total_marks_count}</div>
                </div>
                <div>
                  <div className="text-slate-600">Filtered Marks</div>
                  <div className="text-2xl font-bold">{debugData.filtered_marks?.length || 0}</div>
                </div>
                <div>
                  <div className="text-slate-600">Student-Subject Enrollments</div>
                  <div className="text-2xl font-bold">{debugData.student_subjects_count}</div>
                </div>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                All Marks in Database (Sample)
              </h3>
              <pre className="text-xs overflow-auto max-h-48 bg-white p-2 rounded">
                {JSON.stringify(debugData.all_marks_sample, null, 2)}
              </pre>
            </div>

            {debugData.filtered_marks && (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <h3 className="font-semibold mb-2">
                  Filtered Marks ({selectedSession}, {selectedTerm}, {selectedType})
                </h3>
                <pre className="text-xs overflow-auto max-h-96 bg-white p-2 rounded">
                  {JSON.stringify(debugData.filtered_marks, null, 2)}
                </pre>
              </div>
            )}

            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-semibold mb-2">Student-Subject Enrollments (Sample)</h3>
              <pre className="text-xs overflow-auto max-h-48 bg-white p-2 rounded">
                {JSON.stringify(debugData.student_subjects_sample, null, 2)}
              </pre>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
