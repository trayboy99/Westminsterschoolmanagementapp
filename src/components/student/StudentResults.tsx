import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { FileText, Trophy, TrendingUp, TrendingDown, Minus, Download } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';

interface ExamResult {
  exam_name: string;
  exam_term: string;
  exam_year: string;
  subjects: {
    subject_name: string;
    subject_code?: string;
    marks: number;
    max_marks: number;
    percentage: number;
    grade?: string;
    position?: number;
  }[];
  total_marks: number;
  total_max_marks: number;
  overall_percentage: number;
  overall_grade?: string;
  class_position?: number;
  total_students?: number;
}

export function StudentResults() {
  const [results, setResults] = useState<ExamResult[]>([]);
  const [selectedExam, setSelectedExam] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchResults();
  }, []);

  const fetchResults = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[StudentResults] No session found');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-results`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success) {
        setResults(result.results || []);
        if (result.results && result.results.length > 0) {
          setSelectedExam(`${result.results[0].exam_name}-${result.results[0].exam_term}-${result.results[0].exam_year}`);
        }
      } else {
        toast.error(result.error || 'Failed to load results');
      }
    } catch (error) {
      console.error('[StudentResults] Error:', error);
      toast.error('Failed to load results');
    } finally {
      setLoading(false);
    }
  };

  const getGradeColor = (percentage: number) => {
    if (percentage >= 80) return 'text-green-600 bg-green-50';
    if (percentage >= 70) return 'text-blue-600 bg-blue-50';
    if (percentage >= 60) return 'text-yellow-600 bg-yellow-50';
    if (percentage >= 50) return 'text-orange-600 bg-orange-50';
    return 'text-red-600 bg-red-50';
  };

  const getTrendIcon = (percentage: number) => {
    if (percentage >= 70) return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (percentage >= 50) return <Minus className="h-4 w-4 text-yellow-600" />;
    return <TrendingDown className="h-4 w-4 text-red-600" />;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const currentResult = results.find(r => 
    `${r.exam_name}-${r.exam_term}-${r.exam_year}` === selectedExam
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <FileText className="h-8 w-8" />
            My Results
          </h1>
          <p className="text-slate-600 mt-2">View your examination results</p>
        </div>
        {currentResult && (
          <Button variant="outline" className="gap-2">
            <Download className="h-4 w-4" />
            Download Report
          </Button>
        )}
      </div>

      {/* Exam Selector */}
      {results.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <label className="text-sm font-medium">Select Exam:</label>
              <Select value={selectedExam} onValueChange={setSelectedExam}>
                <SelectTrigger className="w-[300px]">
                  <SelectValue placeholder="Select an exam" />
                </SelectTrigger>
                <SelectContent>
                  {results.map((result, index) => (
                    <SelectItem 
                      key={index} 
                      value={`${result.exam_name}-${result.exam_term}-${result.exam_year}`}
                    >
                      {result.exam_name} - {result.exam_term} {result.exam_year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {currentResult ? (
        <>
          {/* Overall Summary */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-slate-600">Overall Percentage</p>
                    <p className="text-3xl font-bold mt-2">{currentResult.overall_percentage.toFixed(1)}%</p>
                  </div>
                  <div className="p-3 bg-blue-100 rounded-lg">
                    {getTrendIcon(currentResult.overall_percentage)}
                  </div>
                </div>
              </CardContent>
            </Card>

            {currentResult.overall_grade && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Overall Grade</p>
                      <p className="text-3xl font-bold mt-2">{currentResult.overall_grade}</p>
                    </div>
                    <div className="p-3 bg-purple-100 rounded-lg">
                      <Trophy className="h-6 w-6 text-purple-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {currentResult.class_position && (
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">Class Position</p>
                      <p className="text-3xl font-bold mt-2">
                        {currentResult.class_position}
                        {currentResult.total_students && `/${currentResult.total_students}`}
                      </p>
                    </div>
                    <div className="p-3 bg-green-100 rounded-lg">
                      <Trophy className="h-6 w-6 text-green-600" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Subject Results */}
          <Card>
            <CardHeader>
              <CardTitle>Subject Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {currentResult.subjects.map((subject, index) => (
                  <div key={index} className="p-4 border rounded-lg hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h3 className="font-semibold">{subject.subject_name}</h3>
                        {subject.subject_code && (
                          <Badge variant="outline" className="mt-1">
                            {subject.subject_code}
                          </Badge>
                        )}
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold">{subject.marks}/{subject.max_marks}</p>
                        <p className={`text-sm font-medium px-2 py-1 rounded ${getGradeColor(subject.percentage)}`}>
                          {subject.percentage.toFixed(1)}%
                          {subject.grade && ` (${subject.grade})`}
                        </p>
                      </div>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div
                        className={`h-2 rounded-full ${
                          subject.percentage >= 80 ? 'bg-green-500' :
                          subject.percentage >= 70 ? 'bg-blue-500' :
                          subject.percentage >= 60 ? 'bg-yellow-500' :
                          subject.percentage >= 50 ? 'bg-orange-500' :
                          'bg-red-500'
                        }`}
                        style={{ width: `${subject.percentage}%` }}
                      />
                    </div>
                    {subject.position && (
                      <p className="text-xs text-slate-600 mt-2">
                        Position: {subject.position}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardContent className="p-12">
            <div className="text-center">
              <FileText className="h-12 w-12 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-500">No results available</p>
              <p className="text-sm text-slate-400 mt-2">
                Your examination results will appear here once they are published
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
