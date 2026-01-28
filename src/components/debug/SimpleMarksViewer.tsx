import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { createClient } from '../../utils/supabase/client';
import { AlertCircle } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export function SimpleMarksViewer() {
  const [marks, setMarks] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const loadMarks = async () => {
    try {
      setLoading(true);
      setError('');

      // Get ALL marks from the database with subject/student/class names
      const { data, error: queryError } = await supabase
        .from('marks')
        .select(`
          *,
          subjects (name, code),
          students (first_name, last_name),
          classes (name),
          exams (name, session, term)
        `)
        .order('created_at', { ascending: false })
        .limit(100);

      if (queryError) {
        setError(queryError.message);
        console.error('Error fetching marks:', queryError);
        return;
      }

      setMarks(data || []);
      console.log('Loaded marks:', data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadMarks();
  }, []);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5" />
          All Marks in Database
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-slate-600">Total Marks Records</div>
              <div className="text-3xl font-bold">{marks.length}</div>
            </div>
            <Button onClick={loadMarks} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </Button>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
              Error: {error}
            </div>
          )}

          {marks.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No marks found in database
            </div>
          ) : (
            <div className="overflow-auto max-h-[600px] border rounded-lg">
              <Table>
                <TableHeader className="sticky top-0 bg-white">
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Subject</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>CA1</TableHead>
                    <TableHead>CA2</TableHead>
                    <TableHead>Exam</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {marks.map((mark, index) => {
                    const student = (mark as any).students;
                    const subject = (mark as any).subjects;
                    const classData = (mark as any).classes;
                    const exam = (mark as any).exams;
                    
                    return (
                      <TableRow key={mark.id || index}>
                        <TableCell className="text-xs">
                          {student ? `${student.first_name} ${student.last_name}` : mark.student_id}
                        </TableCell>
                        <TableCell className="text-xs font-medium">
                          {subject ? subject.name : mark.subject_id}
                        </TableCell>
                        <TableCell className="text-xs">
                          {classData ? classData.name : mark.class_id}
                        </TableCell>
                        <TableCell className="text-xs">
                          {exam ? exam.name : mark.exam_id}
                        </TableCell>
                        <TableCell className="text-xs">
                          {exam?.session || mark.session || '-'}
                        </TableCell>
                        <TableCell className="text-xs">
                          {exam?.term || mark.term || '-'}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded ${
                            mark.type === 'midterm' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                          }`}>
                            {mark.type}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {mark.type === 'midterm' ? (mark.midterm_ca1 ?? '-') : (mark.terminal_ca1 ?? '-')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {mark.type === 'midterm' ? (mark.midterm_ca2 ?? '-') : (mark.terminal_ca2 ?? '-')}
                        </TableCell>
                        <TableCell className="text-xs">
                          {mark.type === 'midterm' ? (mark.midterm_exam ?? '-') : (mark.terminal_exam ?? '-')}
                        </TableCell>
                        <TableCell>
                          <span className={`text-xs px-2 py-1 rounded ${
                            mark.status === 'approved' ? 'bg-green-100 text-green-800' : 
                            mark.status === 'draft' ? 'bg-gray-100 text-gray-800' :
                            'bg-amber-100 text-amber-800'
                          }`}>
                            {mark.status}
                          </span>
                        </TableCell>
                        <TableCell className="text-xs">
                          {new Date(mark.created_at).toLocaleDateString()}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}

          {marks.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">Summary</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-slate-600">Total Marks</div>
                  <div className="font-bold">{marks.length}</div>
                </div>
                <div>
                  <div className="text-slate-600">Midterm</div>
                  <div className="font-bold">{marks.filter(m => m.type === 'midterm').length}</div>
                </div>
                <div>
                  <div className="text-slate-600">Terminal</div>
                  <div className="font-bold">{marks.filter(m => m.type === 'terminal').length}</div>
                </div>
                <div>
                  <div className="text-slate-600">Approved</div>
                  <div className="font-bold">{marks.filter(m => m.status === 'approved').length}</div>
                </div>
                <div>
                  <div className="text-slate-600">Unique Students</div>
                  <div className="font-bold">{new Set(marks.map(m => m.student_id)).size}</div>
                </div>
                <div>
                  <div className="text-slate-600">Unique Subjects</div>
                  <div className="font-bold">{new Set(marks.map(m => m.subject_id)).size}</div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
