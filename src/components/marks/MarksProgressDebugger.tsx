import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Bug, RefreshCw } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

export function MarksProgressDebugger() {
  const [className, setClassName] = useState('SS1');
  const [subjectName, setSubjectName] = useState('Data Processing');
  const [loading, setLoading] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);

  const supabase = createClient();

  const runDebug = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const params = new URLSearchParams({
        class: className,
        subject: subjectName
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/debug-marks-progress?${params.toString()}`,
        { headers }
      );

      const data = await res.json();
      
      if (data.success) {
        setDebugData(data);
        toast.success('Debug data loaded');
      } else {
        toast.error(data.error || 'Failed to load debug data');
      }
    } catch (error) {
      console.error('[Debug] Error:', error);
      toast.error('Failed to run debug');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bug className="h-5 w-5" />
          Marks Progress Debugger
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Class Name</Label>
            <Input
              value={className}
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., SS1"
            />
          </div>
          <div className="space-y-2">
            <Label>Subject Name</Label>
            <Input
              value={subjectName}
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g., Data Processing"
            />
          </div>
        </div>

        <Button onClick={runDebug} disabled={loading} className="gap-2">
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? 'Loading...' : 'Run Debug'}
        </Button>

        {debugData && (
          <div className="mt-4 space-y-4">
            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium mb-2">Class & Subject Info</h3>
              <div className="text-sm space-y-1">
                <p><strong>Class:</strong> {debugData.class?.name} (ID: {debugData.class?.id})</p>
                <p><strong>Subject:</strong> {debugData.subject?.name} (ID: {debugData.subject?.id})</p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium mb-2">Students</h3>
              <div className="text-sm space-y-1">
                <p><strong>Total Students:</strong> {debugData.totalStudents}</p>
                {debugData.students && debugData.students.length > 0 && (
                  <div className="mt-2">
                    {debugData.students.map((student: any) => (
                      <div key={student.id} className="text-xs text-slate-600">
                        • {student.name} ({student.id.substring(0, 8)}...)
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-lg">
              <h3 className="font-medium mb-2">Marks Summary</h3>
              <div className="text-sm space-y-1">
                <p><strong>All Marks:</strong> {debugData.allMarks} entries</p>
                <p><strong>Midterm Marks:</strong> {debugData.midtermMarks} entries</p>
                <p><strong>Terminal Marks:</strong> {debugData.terminalMarks} entries</p>
              </div>
            </div>

            <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <h3 className="font-medium mb-2 text-yellow-800">Active Exams</h3>
              <div className="text-sm space-y-1">
                {debugData.activeExams && debugData.activeExams.length > 0 ? (
                  debugData.activeExams.map((exam: any) => (
                    <p key={exam.id}><strong>{exam.name}</strong> (ID: {exam.id})</p>
                  ))
                ) : (
                  <p className="text-red-600">⚠️ No active exams found!</p>
                )}
              </div>
            </div>

            {debugData.examBreakdown && debugData.examBreakdown.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-lg border border-emerald-200">
                <h3 className="font-medium mb-2 text-emerald-800">Per-Exam Progress (Based on Active Exams)</h3>
                <div className="text-sm space-y-2">
                  {debugData.examBreakdown.map((eb: any, idx: number) => (
                    <div key={idx} className="p-2 bg-white rounded border">
                      <p className="font-medium">{eb.exam}</p>
                      <p><strong>Marks Count:</strong> {eb.marksCount}</p>
                      <p><strong>Students with Marks:</strong> {eb.studentsWithMarks}</p>
                      <p className="text-lg">
                        <strong>Progress:</strong> 
                        <span className="ml-2 text-green-600 font-bold">{eb.progress}%</span>
                      </p>
                    </div>
                  ))}
                  <div className="mt-2 pt-2 border-t">
                    <p className="text-lg font-medium">
                      Overall Progress (Average): 
                      <span className="ml-2 text-green-600 font-bold">{debugData.calculations?.overallProgress}%</span>
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h3 className="font-medium mb-2 text-green-800">Legacy Progress Calculations (By Type)</h3>
              <div className="text-sm space-y-1">
                <p><strong>Students with Midterm:</strong> {debugData.calculations?.studentsWithMidterm}</p>
                <p><strong>Students with Terminal:</strong> {debugData.calculations?.studentsWithTerminal}</p>
                <p className="text-lg mt-2">
                  <strong>Midterm Progress:</strong> 
                  <span className="ml-2 text-green-600 font-bold">{debugData.calculations?.midtermProgress}%</span>
                </p>
                <p className="text-lg">
                  <strong>Terminal Progress:</strong> 
                  <span className="ml-2 text-green-600 font-bold">{debugData.calculations?.terminalProgress}%</span>
                </p>
              </div>
            </div>

            {debugData.midtermDetails && debugData.midtermDetails.length > 0 && (
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-medium mb-2">Midterm Details</h3>
                <div className="text-xs space-y-2 max-h-40 overflow-y-auto">
                  {debugData.midtermDetails.map((mark: any, idx: number) => (
                    <div key={idx} className="p-2 bg-white rounded border">
                      <p><strong>Student ID:</strong> {mark.student_id?.substring(0, 8)}...</p>
                      <p><strong>Status:</strong> {mark.status}</p>
                      <p><strong>CA1:</strong> {mark.ca1}, <strong>CA2:</strong> {mark.ca2}, <strong>Exam:</strong> {mark.exam}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {debugData.terminalDetails && debugData.terminalDetails.length > 0 && (
              <div className="p-4 bg-purple-50 rounded-lg">
                <h3 className="font-medium mb-2">Terminal Details</h3>
                <div className="text-xs space-y-2 max-h-40 overflow-y-auto">
                  {debugData.terminalDetails.map((mark: any, idx: number) => (
                    <div key={idx} className="p-2 bg-white rounded border">
                      <p><strong>Student ID:</strong> {mark.student_id?.substring(0, 8)}...</p>
                      <p><strong>Status:</strong> {mark.status}</p>
                      <p><strong>CA1:</strong> {mark.ca1}, <strong>CA2:</strong> {mark.ca2}, <strong>Exam:</strong> {mark.exam}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <details className="text-xs">
              <summary className="cursor-pointer font-medium">Raw Debug Data</summary>
              <pre className="mt-2 p-2 bg-slate-100 rounded overflow-x-auto">
                {JSON.stringify(debugData, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
