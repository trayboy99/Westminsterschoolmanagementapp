import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { Button } from '../ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Loader2, Download, FileSpreadsheet, X } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface TeacherBroadsheetProps {
  open: boolean;
  onClose: () => void;
  teacherId: string;
  teacherName: string;
}

interface BroadsheetData {
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  students: {
    studentId: string;
    studentName: string;
    ca1: number | null;
    ca2: number | null;
    exam: number | null;
    total: number | null;
  }[];
}

export function TeacherBroadsheet({ open, onClose, teacherId, teacherName }: TeacherBroadsheetProps) {
  const supabase = createClient();
  
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [exams, setExams] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  const [selectedExam, setSelectedExam] = useState('');
  const [selectedExamType, setSelectedExamType] = useState<'midterm' | 'terminal'>('midterm');
  
  const [loading, setLoading] = useState(false);
  const [broadsheetData, setBroadsheetData] = useState<BroadsheetData[]>([]);

  useEffect(() => {
    if (open) {
      fetchInitialData();
    }
  }, [open]);

  useEffect(() => {
    if (selectedSession && selectedTerm) {
      fetchExams();
    }
  }, [selectedSession, selectedTerm]);

  useEffect(() => {
    if (selectedSession && selectedTerm && selectedExam && selectedExamType) {
      fetchBroadsheetData();
    }
  }, [selectedSession, selectedTerm, selectedExam, selectedExamType]);

  const fetchInitialData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setSessions(data.sessions || []);
        setTerms(data.terms || []);
        
        // Set current as default
        const currentSession = data.sessions?.find((s: any) => s.is_current);
        const currentTerm = data.terms?.find((t: any) => t.is_current);
        
        if (currentSession) setSelectedSession(currentSession.session_name);
        if (currentTerm) setSelectedTerm(currentTerm.term_name);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
    }
  };

  const fetchExams = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const params = new URLSearchParams();
      if (selectedSession) params.append('session', selectedSession);
      if (selectedTerm) params.append('term', selectedTerm);
      
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams?${params.toString()}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setExams(data.exams || []);
        if (data.exams?.length > 0) {
          setSelectedExam(data.exams[0].name);
        }
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
    }
  };

  const fetchBroadsheetData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-broadsheet?` +
        `teacher_id=${teacherId}&session=${selectedSession}&term=${selectedTerm}&exam=${selectedExam}&type=${selectedExamType}`,
        { headers }
      );
      const data = await res.json();
      
      if (data.success) {
        setBroadsheetData(data.broadsheet || []);
      } else {
        toast.error(data.error || 'Failed to load broadsheet');
        setBroadsheetData([]);
      }
    } catch (error) {
      console.error('Error fetching broadsheet data:', error);
      toast.error('Failed to load broadsheet');
      setBroadsheetData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadPDF = () => {
    toast.info('PDF export feature coming soon!');
  };

  const getGrade = (percentage: number | null) => {
    if (percentage === null) return '-';
    if (percentage >= 70) return 'A';
    if (percentage >= 60) return 'B';
    if (percentage >= 50) return 'C';
    if (percentage >= 40) return 'D';
    if (percentage >= 30) return 'E';
    return 'F';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] max-h-[95vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg md:text-xl">
            <FileSpreadsheet className="h-5 w-5" />
            Teacher Broadsheet - {teacherName}
          </DialogTitle>
          <DialogDescription>
            View marks for all classes and subjects you teach
          </DialogDescription>
        </DialogHeader>

        {/* Filters */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-4 border-b">
          <Select value={selectedSession} onValueChange={setSelectedSession}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Session" />
            </SelectTrigger>
            <SelectContent>
              {sessions.map((s) => (
                <SelectItem key={s.session_name} value={s.session_name}>
                  {s.session_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedTerm} onValueChange={setSelectedTerm}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Term" />
            </SelectTrigger>
            <SelectContent>
              {terms.map((t) => (
                <SelectItem key={t.term_name} value={t.term_name}>
                  {t.term_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedExam} onValueChange={setSelectedExam}>
            <SelectTrigger className="text-sm">
              <SelectValue placeholder="Exam" />
            </SelectTrigger>
            <SelectContent>
              {exams.map((e) => (
                <SelectItem key={e.name} value={e.name}>
                  {e.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={selectedExamType} onValueChange={(val) => setSelectedExamType(val as 'midterm' | 'terminal')}>
            <SelectTrigger className="text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="midterm">Midterm</SelectItem>
              <SelectItem value="terminal">Terminal</SelectItem>
            </SelectContent>
          </Select>

          <Button
            onClick={handleDownloadPDF}
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={loading || broadsheetData.length === 0}
          >
            <Download className="h-4 w-4" />
            Export PDF
          </Button>
        </div>

        {/* Broadsheet Content */}
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
          ) : broadsheetData.length === 0 ? (
            <div className="text-center py-12">
              <FileSpreadsheet className="h-12 w-12 text-slate-400 mx-auto mb-3" />
              <p className="text-slate-600">No data available for the selected criteria</p>
              <p className="text-sm text-slate-500 mt-1">
                Select session, term, and exam to view broadsheet
              </p>
            </div>
          ) : (
            <div className="space-y-6">
              {broadsheetData.map((classData) => (
                <div key={`${classData.classId}-${classData.subjectId}`} className="border rounded-lg overflow-hidden">
                  {/* Class Header */}
                  <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-3">
                    <div className="flex flex-wrap items-baseline gap-3">
                      <h3 className="font-bold text-lg">{classData.className}</h3>
                      <span className="text-sm px-3 py-1 bg-white/25 rounded-full font-medium">
                        {classData.subjectName}
                      </span>
                    </div>
                    <p className="text-blue-100 text-sm mt-1">
                      {selectedSession} • {selectedTerm} • {selectedExam} ({selectedExamType})
                    </p>
                  </div>

                  {/* Broadsheet Table */}
                  {classData.students.length === 0 ? (
                    <div className="p-8 text-center">
                      <p className="text-slate-500">No students assigned to this subject</p>
                    </div>
                  ) : (
                    <>
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm border-collapse">
                      <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300">
                          <th className="border border-slate-300 px-3 py-2 text-left font-semibold">
                            #
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-left font-semibold min-w-[150px]">
                            Student Name
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-center font-semibold">
                            CA1
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-center font-semibold">
                            CA2
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-center font-semibold">
                            Exam
                          </th>
                          <th className="border border-slate-300 px-3 py-2 text-center font-semibold bg-blue-50">
                            Total
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {classData.students.map((student, index) => (
                          <tr key={student.studentId} className="hover:bg-slate-50">
                            <td className="border border-slate-300 px-3 py-2 text-center font-medium">
                              {index + 1}
                            </td>
                            <td className="border border-slate-300 px-3 py-2 font-medium">
                              {student.studentName}
                            </td>
                            <td className={`border border-slate-300 px-3 py-2 text-center ${student.ca1 === null ? 'bg-yellow-50' : ''}`}>
                              {student.ca1 !== null ? student.ca1 : '-'}
                            </td>
                            <td className={`border border-slate-300 px-3 py-2 text-center ${student.ca2 === null ? 'bg-yellow-50' : ''}`}>
                              {student.ca2 !== null ? student.ca2 : '-'}
                            </td>
                            <td className={`border border-slate-300 px-3 py-2 text-center ${student.exam === null ? 'bg-yellow-50' : ''}`}>
                              {student.exam !== null ? student.exam : '-'}
                            </td>
                            <td className={`border border-slate-300 px-3 py-2 text-center font-bold ${student.total === null ? 'bg-yellow-50' : 'bg-blue-50'}`}>
                              {student.total !== null ? student.total : '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Legend */}
                  <div className="bg-blue-50 border-t border-blue-200 p-2 text-xs">
                    <div className="flex flex-wrap gap-4 items-center">
                      <span className="font-semibold text-slate-700">Legend:</span>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-yellow-50 border border-slate-300"></div>
                        <span className="text-slate-600">= Missing marks</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <div className="w-4 h-4 bg-white border border-slate-300"></div>
                        <span className="text-slate-600">= Marks entered</span>
                      </div>
                    </div>
                  </div>

                  {/* Summary */}
                  <div className="bg-slate-50 p-3 border-t text-sm">
                    <div className="flex flex-wrap gap-4">
                      <div>
                        <span className="text-slate-600">Total Students:</span>{' '}
                        <span className="font-semibold">{classData.students.length}</span>
                      </div>
                      <div>
                        <span className="text-slate-600">Subject Average:</span>{' '}
                        <span className="font-semibold">
                          {classData.students.length > 0
                            ? (classData.students.reduce((sum, s) => sum + (s.total || 0), 0) / classData.students.length).toFixed(1)
                            : '-'}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-600">Students with Complete Marks:</span>{' '}
                        <span className="font-semibold">
                          {classData.students.filter(s => s.ca1 !== null && s.ca2 !== null && s.exam !== null).length} / {classData.students.length}
                        </span>
                      </div>
                    </div>
                  </div>
                  </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-4 border-t">
          <Button onClick={onClose} variant="outline" size="sm">
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}