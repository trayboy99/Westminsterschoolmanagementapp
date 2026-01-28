import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, Search, CheckCircle, XCircle, AlertTriangle } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';

export function MarksCompletionDebugger() {
  const [loading, setLoading] = useState(false);
  const [subjectName, setSubjectName] = useState('Data Processing');
  const [className, setClassName] = useState('SS1');
  const [session, setSession] = useState('2025/2026');
  const [term, setTerm] = useState('First Term');
  const [debugData, setDebugData] = useState<any>(null);

  const supabase = createClient();

  const handleDebug = async () => {
    try {
      setLoading(true);
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const headers = {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/debug-subject-marks?subject=${encodeURIComponent(subjectName)}&class=${encodeURIComponent(className)}&session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setDebugData(data);
        console.log('[Debug Data]:', data);
      } else {
        console.error('Debug failed:', data.error);
        
        // Show helpful error message with available options
        let errorMessage = `Error: ${data.error}`;
        if (data.available_classes) {
          errorMessage += `\n\nAvailable classes:\n${data.available_classes.join(', ')}`;
        }
        if (data.available_subjects) {
          errorMessage += `\n\nAvailable subjects:\n${data.available_subjects.join(', ')}`;
        }
        if (data.hint) {
          errorMessage += `\n\n${data.hint}`;
        }
        
        alert(errorMessage);
      }
    } catch (error) {
      console.error('[Debug] Error:', error);
      alert('Failed to fetch debug data');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600">✓ Approved</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-600">⟳ Submitted</Badge>;
      case 'draft':
        return <Badge variant="secondary">Draft</Badge>;
      case 'rejected':
        return <Badge variant="destructive">✕ Rejected</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          Marks Completion Debugger
        </CardTitle>
        <CardDescription>
          Debug why specific subjects are not showing checkmarks
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Input Form */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Subject Name</Label>
            <Input 
              value={subjectName} 
              onChange={(e) => setSubjectName(e.target.value)}
              placeholder="e.g., Data Processing"
            />
          </div>
          <div className="space-y-2">
            <Label>Class Name</Label>
            <Input 
              value={className} 
              onChange={(e) => setClassName(e.target.value)}
              placeholder="e.g., SS1"
            />
          </div>
          <div className="space-y-2">
            <Label>Session</Label>
            <Input 
              value={session} 
              onChange={(e) => setSession(e.target.value)}
              placeholder="e.g., 2024/2025"
            />
          </div>
          <div className="space-y-2">
            <Label>Term</Label>
            <Input 
              value={term} 
              onChange={(e) => setTerm(e.target.value)}
              placeholder="e.g., First Term"
            />
          </div>
        </div>

        <Button onClick={handleDebug} disabled={loading} className="w-full">
          {loading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Debugging...
            </>
          ) : (
            <>
              <Search className="mr-2 h-4 w-4" />
              Run Debug Check
            </>
          )}
        </Button>

        {/* Debug Results */}
        {debugData && (
          <div className="space-y-4">
            {/* Summary */}
            <Alert>
              <AlertDescription>
                <div className="space-y-2">
                  <p><strong>Subject:</strong> {debugData.subject}</p>
                  <p><strong>Class:</strong> {debugData.class}</p>
                  <p><strong>Session:</strong> {debugData.session} - {debugData.term}</p>
                  <p><strong>Total Students:</strong> {debugData.total_students}</p>
                </div>
              </AlertDescription>
            </Alert>

            {/* Summary Stats */}
            <div className="grid grid-cols-4 gap-4">
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{debugData.summary.total_marks}</div>
                    <div className="text-sm text-muted-foreground">Total Marks</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-600">{debugData.summary.approved_marks}</div>
                    <div className="text-sm text-muted-foreground">Approved</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-600">{debugData.summary.students_with_marks}</div>
                    <div className="text-sm text-muted-foreground">Students w/ Marks</div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-red-600">{debugData.summary.students_without_marks}</div>
                    <div className="text-sm text-muted-foreground">Missing Marks</div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Active Exams Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Active Exams for this Session/Term</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {debugData.exams?.map((exam: any) => (
                    <Badge key={exam.id} variant="default" className="bg-green-600">
                      ✓ {exam.name}
                    </Badge>
                  ))}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Showing only <strong>active exams</strong>. Students need approved marks for {debugData.exams?.length === 1 ? 'this exam' : 'these exams'}.
                </p>
              </CardContent>
            </Card>

            {/* Student-by-Student Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Student Marks Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead className="text-center">Exams</TableHead>
                        <TableHead className="text-center">Approved</TableHead>
                        <TableHead className="text-center">Status</TableHead>
                        <TableHead>Details</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {debugData.marks_by_student?.map((student: any) => {
                        const allApproved = student.approved_count === debugData.exams?.length;
                        const hasAllExams = student.exams_count === debugData.exams?.length;
                        
                        return (
                          <TableRow key={student.student_id}>
                            <TableCell className="font-medium">{student.student_name}</TableCell>
                            <TableCell className="text-center">
                              <Badge variant={hasAllExams ? "default" : "destructive"}>
                                {student.exams_count}/{debugData.exams?.length}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              <Badge variant={allApproved ? "default" : "secondary"}>
                                {student.approved_count}/{student.exams_count}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                              {allApproved && hasAllExams ? (
                                <CheckCircle className="h-5 w-5 text-green-600 mx-auto" />
                              ) : hasAllExams ? (
                                <Loader2 className="h-5 w-5 text-blue-600 mx-auto" />
                              ) : (
                                <AlertTriangle className="h-5 w-5 text-amber-600 mx-auto" />
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="space-y-1">
                                {student.marks.map((mark: any, idx: number) => (
                                  <div key={idx} className="flex items-center gap-2 text-xs">
                                    <span className="text-muted-foreground">{mark.exam}:</span>
                                    {getStatusBadge(mark.status)}
                                    <span className="text-muted-foreground">
                                      ({mark.ca1 || 0} + {mark.ca2 || 0} + {mark.exam_score || 0} = {mark.total || 0})
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                      
                      {/* Students without any marks */}
                      {debugData.summary.students_without_marks > 0 && (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                            <XCircle className="h-6 w-6 mx-auto mb-2 text-red-600" />
                            <p>{debugData.summary.students_without_marks} student(s) have no marks at all</p>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>

            {/* Diagnosis */}
            <Alert className={
              debugData.summary.approved_marks === debugData.total_students * debugData.exams?.length
                ? "border-green-500 bg-green-50"
                : "border-amber-500 bg-amber-50"
            }>
              <AlertDescription>
                <h3 className="font-semibold mb-2">Diagnosis:</h3>
                {debugData.summary.approved_marks === debugData.total_students * debugData.exams?.length ? (
                  <p className="text-green-900">
                    ✅ <strong>Complete!</strong> All {debugData.total_students} students have approved marks for all {debugData.exams?.length} exams.
                    A checkmark should appear for this subject/class.
                  </p>
                ) : debugData.summary.students_without_marks > 0 ? (
                  <p className="text-amber-900">
                    ❌ <strong>Incomplete:</strong> {debugData.summary.students_without_marks} student(s) have no marks entered yet.
                    Teacher needs to enter marks for these students.
                  </p>
                ) : debugData.summary.total_marks > debugData.summary.approved_marks ? (
                  <p className="text-amber-900">
                    🔄 <strong>Pending Approval:</strong> {debugData.summary.total_marks - debugData.summary.approved_marks} marks are entered but not approved.
                    Principal needs to approve these marks in the Approval Panel.
                  </p>
                ) : (
                  <p className="text-amber-900">
                    ⚠️ <strong>Partial:</strong> Some students don't have marks for all exam types.
                    Required: {debugData.exams?.length} exams per student.
                  </p>
                )}
              </AlertDescription>
            </Alert>
          </div>
        )}

        {!debugData && !loading && (
          <Alert>
            <AlertDescription>
              Enter the subject and class details above, then click "Run Debug Check" to see detailed information
              about why a checkmark may or may not be appearing.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
