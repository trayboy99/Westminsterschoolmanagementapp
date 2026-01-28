import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { 
  FolderOpen, 
  FileText, 
  ChevronRight, 
  ChevronDown,
  Award,
  Clock,
  Calendar,
  BookOpen,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  ArrowLeft,
  RefreshCw
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import { useAuth } from '../../contexts/AuthContext';
import { StudentCBTReview } from './StudentCBTReview';

interface ExamResult {
  id: string;
  exam_id: string;
  attempt_number: number;
  start_time: string;
  end_time: string;
  time_taken_seconds: number;
  status: string;
  auto_graded_score: number;
  manual_graded_score: number | null;
  total_score: number;
  percentage: number;
  grade: string | null;
  submitted_at: string;
  requires_manual_grading: boolean;
  manual_grading_completed: boolean;
  teacher_comments: string | null;
  exam: {
    id: string;
    title: string;
    subject: string;
    class: string;
    exam_type: string;
    total_marks: number;
    pass_mark: number;
    session: string;
    term: string;
  };
}

interface FolderStructure {
  [session: string]: {
    [term: string]: {
      [subject: string]: ExamResult[];
    };
  };
}

export function StudentCBTResults() {
  const { profile } = useAuth();
  const [results, setResults] = useState<ExamResult[]>([]);
  const [folderStructure, setFolderStructure] = useState<FolderStructure>({});
  const [loading, setLoading] = useState(true);
  const [selectedResult, setSelectedResult] = useState<ExamResult | null>(null);
  const [viewingReview, setViewingReview] = useState(false);
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const supabase = createClient();

  useEffect(() => {
    if (profile?.id) {
      fetchResults();
    }
  }, [profile]);

  const fetchResults = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please login to continue');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt-student/results/${profile?.id}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await res.json();
      if (data.success) {
        setResults(data.results || []);
        organizeFolderStructure(data.results || []);
      } else {
        toast.error(data.error || 'Failed to fetch results');
      }
    } catch (error: any) {
      console.error('[StudentCBTResults] Error fetching results:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const organizeFolderStructure = (results: ExamResult[]) => {
    const structure: FolderStructure = {};

    results.forEach(result => {
      const session = result.exam.session || 'Unknown Session';
      const term = result.exam.term || 'Unknown Term';
      const subject = result.exam.subject || 'Unknown Subject';

      if (!structure[session]) {
        structure[session] = {};
      }
      if (!structure[session][term]) {
        structure[session][term] = {};
      }
      if (!structure[session][term][subject]) {
        structure[session][term][subject] = [];
      }

      structure[session][term][subject].push(result);
    });

    // Sort results by date (newest first) within each subject
    Object.keys(structure).forEach(session => {
      Object.keys(structure[session]).forEach(term => {
        Object.keys(structure[session][term]).forEach(subject => {
          structure[session][term][subject].sort((a, b) => 
            new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
          );
        });
      });
    });

    setFolderStructure(structure);
  };

  const toggleSession = (session: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(session)) {
      newExpanded.delete(session);
    } else {
      newExpanded.add(session);
    }
    setExpandedSessions(newExpanded);
  };

  const toggleTerm = (sessionTerm: string) => {
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(sessionTerm)) {
      newExpanded.delete(sessionTerm);
    } else {
      newExpanded.add(sessionTerm);
    }
    setExpandedTerms(newExpanded);
  };

  const toggleSubject = (sessionTermSubject: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(sessionTermSubject)) {
      newExpanded.delete(sessionTermSubject);
    } else {
      newExpanded.add(sessionTermSubject);
    }
    setExpandedSubjects(newExpanded);
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 75) return 'text-green-600';
    if (percentage >= 65) return 'text-blue-600';
    if (percentage >= 50) return 'text-yellow-600';
    if (percentage >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getPassStatus = (result: ExamResult) => {
    if (!result.exam || result.exam.pass_mark === undefined || result.exam.pass_mark === null) {
      return false;
    }
    
    // A score of 0 should never be considered passing
    if (result.total_score === 0) {
      return false;
    }
    
    // Compare the student's actual score with the pass mark (both are absolute values, not percentages)
    const passed = result.total_score >= result.exam.pass_mark;
    return passed;
  };

  const formatDuration = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  // If viewing detailed results
  if (selectedResult) {
    return (
      <div className="min-h-screen -mx-4 -mt-4 md:mx-0 md:mt-0">
        {/* Mobile App Header with Back Button */}
        <div className="bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 text-white px-4 pt-6 pb-8 sticky top-0 z-10 shadow-lg">
          <button 
            onClick={() => setSelectedResult(null)}
            className="flex items-center gap-2 text-white/90 hover:text-white mb-4 active:scale-95 transition-transform"
          >
            <ArrowLeft className="h-5 w-5" />
            <span className="font-medium">Back to Results</span>
          </button>
          
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold mb-1 line-clamp-2">{selectedResult.exam.title}</h1>
              <div className="flex items-center gap-2 text-sm text-white/80">
                <BookOpen className="h-4 w-4 flex-shrink-0" />
                <span className="truncate">{selectedResult.exam.subject}</span>
              </div>
            </div>
            <div className={`px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0 ${
              getPassStatus(selectedResult) 
                ? 'bg-green-500 text-white' 
                : 'bg-red-500 text-white'
            }`}>
              {getPassStatus(selectedResult) ? 'PASSED' : 'FAILED'}
            </div>
          </div>
        </div>

        <div className="px-4 py-6 space-y-4 bg-slate-50">
          {/* Exam Info Card */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-slate-50 to-gray-50 px-4 py-3 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900 text-sm">Exam Information</h2>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Calendar className="h-5 w-5 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Date Submitted</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {new Date(selectedResult.submitted_at).toLocaleDateString('en-US', {
                      weekday: 'short',
                      year: 'numeric',
                      month: 'short',
                      day: 'numeric'
                    })}
                  </p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    {new Date(selectedResult.submitted_at).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit'
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Clock className="h-5 w-5 text-purple-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Time Taken</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {formatDuration(selectedResult.time_taken_seconds)}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-orange-50 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Award className="h-5 w-5 text-orange-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-gray-500">Session & Term</p>
                  <p className="text-sm font-medium text-gray-900 mt-0.5">
                    {selectedResult.exam.session} - {selectedResult.exam.term}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Score Cards Grid */}
          <div className="grid grid-cols-2 gap-3">
            {/* Total Score */}
            <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl shadow-lg p-4 text-white">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium text-blue-100">Total Score</p>
              </div>
              <p className="text-3xl font-bold">{selectedResult.total_score}</p>
              <p className="text-sm text-blue-100 mt-1">out of {selectedResult.exam.total_marks}</p>
            </div>

            {/* Percentage */}
            <div className={`rounded-2xl shadow-lg p-4 text-white bg-gradient-to-br ${
              getPassStatus(selectedResult)
                ? 'from-green-500 to-green-600'
                : 'from-red-500 to-red-600'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-white/20 rounded-lg flex items-center justify-center">
                  <Award className="h-4 w-4" />
                </div>
                <p className="text-xs font-medium opacity-90">Percentage</p>
              </div>
              <p className="text-3xl font-bold">{selectedResult.percentage.toFixed(1)}%</p>
              <p className="text-sm opacity-90 mt-1">
                {getPassStatus(selectedResult) ? 'Above' : 'Below'} pass mark
              </p>
            </div>

            {/* Pass Mark */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-emerald-50 rounded-lg flex items-center justify-center">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                </div>
                <p className="text-xs font-medium text-gray-600">Pass Mark</p>
              </div>
              <p className="text-3xl font-bold text-gray-900">{selectedResult.exam.pass_mark}</p>
              <p className="text-sm text-gray-500 mt-1">Required score</p>
            </div>

            {/* Exam Type */}
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-amber-50 rounded-lg flex items-center justify-center">
                  <FileText className="h-4 w-4 text-amber-600" />
                </div>
                <p className="text-xs font-medium text-gray-600">Exam Type</p>
              </div>
              <p className="text-lg font-bold text-gray-900 uppercase mt-2">
                {selectedResult.exam.exam_type}
              </p>
            </div>
          </div>

          {/* Grading Status Alert */}
          {selectedResult.requires_manual_grading && !selectedResult.manual_grading_completed && (
            <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-2xl p-4 shadow-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center flex-shrink-0">
                  <AlertCircle className="h-5 w-5 text-yellow-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-yellow-900 text-sm">Awaiting Manual Grading</p>
                  <p className="text-xs text-yellow-700 mt-1 leading-relaxed">
                    Your exam contains essay questions that require manual grading by your teacher.
                    The current score is based on objective questions only.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Teacher Comments */}
          {selectedResult.teacher_comments && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 px-4 py-3 border-b border-gray-100">
                <h2 className="font-semibold text-gray-900 text-sm">Teacher's Comments</h2>
              </div>
              <div className="p-4">
                <p className="text-sm text-gray-700 leading-relaxed">{selectedResult.teacher_comments}</p>
              </div>
            </div>
          )}

          {/* View Detailed Answers Button */}
          <button
            onClick={() => setViewingReview(true)}
            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-2xl shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-2"
          >
            <Eye className="h-5 w-5" />
            <span>View Questions & Answers</span>
          </button>
        </div>

        {/* Review Component */}
        {viewingReview && (
          <StudentCBTReview
            result={selectedResult}
            onClose={() => setViewingReview(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mobile App Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">CBT Results</h1>
              <p className="text-violet-100 text-sm">Exam results archive</p>
            </div>
          </div>
          <button 
            onClick={fetchResults} 
            className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl hover:bg-white/30 transition-colors"
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Summary Stats - Mobile Cards */}
      {results.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{results.length}</p>
            <p className="text-xs text-gray-600 mt-0.5">Total Exams</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="w-10 h-10 bg-green-50 rounded-xl flex items-center justify-center mb-2">
              <Award className="w-5 h-5 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {(results.reduce((sum, r) => sum + r.percentage, 0) / results.length).toFixed(0)}%
            </p>
            <p className="text-xs text-gray-600 mt-0.5">Avg Score</p>
          </div>
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4">
            <div className="w-10 h-10 bg-purple-50 rounded-xl flex items-center justify-center mb-2">
              <CheckCircle className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {results.filter(r => getPassStatus(r)).length}
            </p>
            <p className="text-xs text-gray-600 mt-0.5">Passed</p>
          </div>
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex items-center justify-center py-16">
          <RefreshCw className="w-8 h-8 text-blue-600 animate-spin" />
        </div>
      ) : results.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 flex flex-col items-center justify-center py-16 px-4">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mb-4">
            <FileText className="h-8 w-8 text-gray-400" />
          </div>
          <p className="text-gray-900 font-semibold text-lg">No Results Yet</p>
          <p className="text-gray-600 text-center text-sm mt-1">
            You haven't completed any CBT exams. Results will appear here once you submit an exam.
          </p>
        </div>
      ) : (
        /* Folder Structure - Mobile App Style */
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-slate-50 border-b border-gray-200 px-4 py-4">
            <div className="flex items-center gap-2">
              <FolderOpen className="h-5 w-5 text-gray-700" />
              <div className="flex-1 min-w-0">
                <h2 className="font-semibold text-gray-900">Results Archive</h2>
                <p className="text-xs text-gray-600 mt-0.5">Navigate through your exam results organized by academic session</p>
              </div>
            </div>
          </div>
          <div className="divide-y divide-gray-100">
            {Object.keys(folderStructure).sort().reverse().map(session => (
              <div key={session}>
                {/* Session Level - Mobile Optimized */}
                <button
                  onClick={() => toggleSession(session)}
                  className="w-full flex items-center justify-between gap-2 p-3 pr-4 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  <div className="flex items-center gap-2 flex-1 min-w-0">
                    {expandedSessions.has(session) ? (
                      <ChevronDown className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    ) : (
                      <ChevronRight className="h-5 w-5 text-gray-500 flex-shrink-0" />
                    )}
                    <div className="w-8 h-8 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FolderOpen className="h-5 w-5 text-blue-600" />
                    </div>
                    <span className="font-semibold text-gray-900 text-sm truncate">{session}</span>
                  </div>
                  <div className="px-2 py-0.5 bg-blue-100 rounded-full flex-shrink-0">
                    <span className="text-xs font-medium text-blue-700 whitespace-nowrap">
                      {Object.values(folderStructure[session]).reduce((sum, terms) => 
                        sum + Object.values(terms).reduce((s, exams) => s + exams.length, 0), 0
                      )}
                    </span>
                  </div>
                </button>

                {/* Term Level - Mobile Optimized */}
                {expandedSessions.has(session) && (
                  <div className="bg-gray-50/50">
                    {Object.keys(folderStructure[session]).map(term => (
                      <div key={`${session}-${term}`} className="border-t border-gray-100">
                        <button
                          onClick={() => toggleTerm(`${session}-${term}`)}
                          className="w-full flex items-center justify-between gap-2 p-3 pl-10 pr-4 hover:bg-gray-100 active:bg-gray-200 transition-colors"
                        >
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            {expandedTerms.has(`${session}-${term}`) ? (
                              <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                            )}
                            <div className="w-7 h-7 bg-green-50 rounded-lg flex items-center justify-center flex-shrink-0">
                              <FolderOpen className="h-4 w-4 text-green-600" />
                            </div>
                            <span className="font-medium text-gray-900 text-sm truncate">{term}</span>
                          </div>
                          <div className="px-2 py-0.5 bg-green-100 rounded-full flex-shrink-0">
                            <span className="text-xs font-medium text-green-700 whitespace-nowrap">
                              {Object.values(folderStructure[session][term]).reduce((s, exams) => s + exams.length, 0)}
                            </span>
                          </div>
                        </button>

                        {/* Subject Level - Mobile Optimized */}
                        {expandedTerms.has(`${session}-${term}`) && (
                          <div className="bg-gray-100/50">
                            {Object.keys(folderStructure[session][term]).map(subject => (
                              <div key={`${session}-${term}-${subject}`} className="border-t border-gray-200">
                                <button
                                  onClick={() => toggleSubject(`${session}-${term}-${subject}`)}
                                  className="w-full flex items-center justify-between gap-2 p-3 pl-16 pr-4 hover:bg-gray-200 active:bg-gray-300 transition-colors"
                                >
                                  <div className="flex items-center gap-2 flex-1 min-w-0">
                                    {expandedSubjects.has(`${session}-${term}-${subject}`) ? (
                                      <ChevronDown className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4 text-gray-500 flex-shrink-0" />
                                    )}
                                    <div className="w-7 h-7 bg-purple-50 rounded-lg flex items-center justify-center flex-shrink-0">
                                      <BookOpen className="h-4 w-4 text-purple-600" />
                                    </div>
                                    <span className="font-medium text-gray-900 text-sm truncate">{subject}</span>
                                  </div>
                                  <div className="px-2 py-0.5 bg-purple-100 rounded-full flex-shrink-0">
                                    <span className="text-xs font-medium text-purple-700 whitespace-nowrap">
                                      {folderStructure[session][term][subject].length}
                                    </span>
                                  </div>
                                </button>

                                {/* Results List - Mobile Optimized */}
                                {expandedSubjects.has(`${session}-${term}-${subject}`) && (
                                  <div className="bg-white/50">
                                    {folderStructure[session][term][subject].map((result, idx) => (
                                      <div 
                                        key={result.id} 
                                        className="border-t border-gray-200 p-3 pl-20 pr-4 hover:bg-white active:bg-gray-50 transition-colors"
                                      >
                                        <div className="flex items-center justify-between gap-2">
                                          <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                              <div className="w-6 h-6 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                                                <FileText className="h-3.5 w-3.5 text-gray-600" />
                                              </div>
                                              <p className="font-medium text-gray-900 text-sm truncate">
                                                {result.exam.title}
                                              </p>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs text-gray-600 ml-8 flex-wrap">
                                              <span className={`font-semibold ${getGradeColor(result.percentage)}`}>
                                                {result.percentage.toFixed(0)}%
                                              </span>
                                              <span className="text-gray-400">•</span>
                                              <span>{new Date(result.submitted_at).toLocaleDateString()}</span>
                                            </div>
                                          </div>
                                          <button
                                            onClick={() => setSelectedResult(result)}
                                            className="p-1.5 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors flex-shrink-0"
                                          >
                                            <Eye className="h-4 w-4 text-blue-600" />
                                          </button>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}