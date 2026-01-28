import { useState, useEffect } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Download, Printer, Award, TrendingUp, User, BookOpen, Users, Calendar, Clock, FileText, ClipboardCheck, Check, X, AlertCircle } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface ReportCardProps {
  studentId: string;
  sessionName: string;
  termName: string;
  examName: string;
  resultType: 'midterm' | 'terminal';
  userRole: 'admin' | 'student';
}

interface SubjectResult {
  subject_name: string;
  ca1: number;
  ca2: number;
  exam: number;
  total: number;
  grade: string;
  remark: string;
}

interface ReportData {
  student: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    class_name: string;
    gender?: string;
    photo_url?: string;
  };
  school: {
    school_name: string;
    address: string;
    email: string;
    phone_numbers: string;
    website_url?: string;
    logo_url?: string;
    stamp_url?: string;
    motto?: string;
    principal_name?: string;
    director_name?: string;
  };
  results: SubjectResult[];
  average_score: number;
  percentage_score: number;
  overall_grade: string;
  overall_remark: string;
  teacher_comment?: string;
  principal_comment?: string;
  teacher_name?: string;
  principal_name?: string;
  next_term_begins?: string;
  grade_system: Array<{ grade: string; min_percentage: number; max_percentage: number; remark: string }>;
}

interface AttendanceSummary {
  total_school_days: number;
  days_present: number;
  days_absent: number;
  days_late: number;
  days_excused: number;
  attendance_percentage: number;
  attendance_grade: string;
  attendance_remark: string;
  flagged: boolean;
}

export function ReportCard({ studentId, sessionName, termName, examName, resultType, userRole }: ReportCardProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(true);

  const supabase = createClient();

  useEffect(() => {
    fetchReportCard();
    // Only fetch attendance for terminal reports
    if (resultType === 'terminal') {
      fetchAttendanceSummary();
    }
  }, [studentId, sessionName, termName, examName, resultType]);

  const fetchAttendanceSummary = async () => {
    try {
      setLoadingAttendance(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/summary/student?` +
        `student_id=${studentId}&session=${encodeURIComponent(sessionName)}&term=${encodeURIComponent(termName)}`,
        { headers }
      );
      const result = await res.json();
      
      console.log('[ReportCard] Attendance Summary:', result);
      
      if (result.success && result.summary) {
        setAttendanceData(result.summary);
      } else {
        console.warn('[ReportCard] No attendance data:', result.error);
        // Don't show error toast - attendance might not be configured yet
      }
    } catch (error) {
      console.error('[ReportCard] Attendance Error:', error);
      // Silent fail - attendance is optional
    } finally {
      setLoadingAttendance(false);
    }
  };

  const fetchReportCard = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/report-card?` +
        `student_id=${studentId}&session=${sessionName}&term=${termName}&exam=${examName}&type=${resultType}`,
        { headers }
      );
      const result = await res.json();
      
      console.log('[ReportCard] API Response:', result);
      
      if (result.success) {
        console.log('[ReportCard] Results count:', result.data?.results?.length || 0);
        if (result.data?.results?.length === 0) {
          console.warn('[ReportCard] No results found in data');
        }
        setData(result.data);
      } else {
        console.error('[ReportCard] API Error:', result.error);
        toast.error(result.error || 'Failed to load report card');
      }
    } catch (error) {
      console.error('[ReportCard] Error:', error);
      toast.error('Failed to load report card');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Add class to body for print-specific styling
    document.body.classList.add('printing-report-card');
    
    // Trigger print
    window.print();
    
    // Remove class after print dialog closes
    setTimeout(() => {
      document.body.classList.remove('printing-report-card');
    }, 1000);
  };

  const handleDownloadPDF = async () => {
    try {
      toast.info('Generating PDF... This may take a moment.');
      
      // Add class to body for print-specific styling
      document.body.classList.add('printing-report-card');
      
      // Use browser's print-to-PDF capability
      window.print();
      
      // Remove class after print dialog closes
      setTimeout(() => {
        document.body.classList.remove('printing-report-card');
      }, 1000);
      
      toast.success('PDF ready! Use your browser\'s print dialog to save as PDF.');
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast.error('Failed to generate PDF');
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
      <Card>
        <CardContent className="p-12 text-center">
          <p className="text-slate-500">No data available for this result</p>
        </CardContent>
      </Card>
    );
  }

  // Calculate max marks based on result type
  const maxMarks = resultType === 'midterm' ? 40 : 100;
  const ca1Max = resultType === 'midterm' ? 10 : 20;
  const ca2Max = resultType === 'midterm' ? 10 : 20;
  const examMax = resultType === 'midterm' ? 20 : 60;

  const chartData = data.results && data.results.length > 0 
    ? data.results.map(r => ({
        name: r.subject_name.length > 15 ? r.subject_name.substring(0, 12) + '...' : r.subject_name,
        score: r.total,
        percentage: (r.total / maxMarks) * 100
      }))
    : [];

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-green-500';
      case 'B': return 'bg-blue-500';
      case 'C': return 'bg-yellow-500';
      case 'D': return 'bg-orange-500';
      default: return 'bg-red-500';
    }
  };

  return (
    <div className="space-y-4">
      {/* Print Styles */}
      <style>
        {`
          @media print {
            @page {
              size: A4;
              margin: 6mm;
            }
            
            /* Minimal scaling - keep text large and readable */
            .report-card-printable {
              page-break-inside: avoid !important;
              transform: scale(0.95) !important;
              transform-origin: top left !important;
              width: 105% !important;
            }
            
            /* Header - readable */
            .report-card-printable .bg-gradient-to-r.from-blue-600 {
              padding: 2px !important;
            }
            
            .report-card-printable .bg-gradient-to-r.from-blue-600 > div {
              padding: 10px 12px !important;
            }
            
            .report-card-printable h1 {
              font-size: 20px !important;
              margin-bottom: 2px !important;
              line-height: 1.2 !important;
            }
            
            .report-card-printable h2 {
              font-size: 15px !important;
              padding: 6px !important;
            }
            
            /* Logos and images */
            .report-card-printable .h-16,
            .report-card-printable .w-16 {
              height: 50px !important;
              width: 50px !important;
            }
            
            /* Student photo - visible and clear */
            .report-card-printable .student-photo {
              width: 45px !important;
              height: 45px !important;
              border-width: 2px !important;
            }
            
            /* Student info section - LARGER TEXT */
            .report-card-printable .student-info-card {
              padding: 6px 8px !important;
              gap: 5px !important;
            }
            
            .report-card-printable .student-info-card .icon-box {
              width: 22px !important;
              height: 22px !important;
            }
            
            .report-card-printable .student-info-card .icon-box svg {
              width: 12px !important;
              height: 12px !important;
            }
            
            .report-card-printable .student-info-card p {
              font-size: 10px !important;
              line-height: 1.3 !important;
              margin: 0 !important;
            }
            
            .report-card-printable .student-info-card .text-sm {
              font-size: 11px !important;
            }
            
            /* Table - MUCH MORE READABLE */
            .report-card-printable table th,
            .report-card-printable table td {
              padding: 6px 7px !important;
              font-size: 10px !important;
              line-height: 1.3 !important;
            }
            
            .report-card-printable table th {
              font-size: 11px !important;
              font-weight: bold !important;
            }
            
            /* Summary stats - LARGER */
            .report-card-printable .summary-stat {
              padding: 8px 10px !important;
            }
            
            .report-card-printable .summary-stat p:first-child {
              font-size: 10px !important;
              margin-bottom: 3px !important;
            }
            
            .report-card-printable .summary-stat p:last-child {
              font-size: 20px !important;
              margin: 0 !important;
            }
            
            /* Comments - LARGER and more readable */
            .report-card-printable .comment-section {
              padding: 8px 10px !important;
            }
            
            .report-card-printable .comment-section h4 {
              font-size: 11px !important;
              margin-bottom: 4px !important;
              font-weight: bold !important;
            }
            
            .report-card-printable .comment-section p {
              font-size: 10px !important;
              line-height: 1.4 !important;
              margin: 0 !important;
              min-height: 32px !important;
            }
            
            .report-card-printable .comment-section .border-t {
              padding-top: 4px !important;
              margin-top: 4px !important;
            }
            
            .report-card-printable .comment-section .text-\\[10px\\] {
              font-size: 9px !important;
            }
            
            .report-card-printable .comment-section .text-xs {
              font-size: 10px !important;
            }
            
            /* Grade system - LARGER */
            .report-card-printable .grade-system {
              padding: 8px 10px !important;
            }
            
            .report-card-printable .grade-system h4 {
              font-size: 11px !important;
              margin-bottom: 4px !important;
              font-weight: bold !important;
            }
            
            .report-card-printable .grade-system-item {
              font-size: 10px !important;
              gap: 5px !important;
              margin-bottom: 2px !important;
              padding: 0 !important;
            }
            
            .report-card-printable .grade-system-item .badge {
              font-size: 9px !important;
              padding: 2px 5px !important;
            }
            
            /* Next term card */
            .report-card-printable .next-term-card {
              padding: 8px 10px !important;
            }
            
            .report-card-printable .next-term-card h4 {
              font-size: 11px !important;
              margin-bottom: 4px !important;
              font-weight: bold !important;
            }
            
            .report-card-printable .next-term-card p {
              font-size: 11px !important;
              margin: 0 !important;
            }
            
            /* Attendance bar */
            .report-card-printable .border.border-slate-200.rounded {
              padding: 5px 7px !important;
              font-size: 10px !important;
            }
            
            /* Footer */
            .report-card-printable .bg-gradient-to-r.from-blue-600.p-4 {
              padding: 8px 10px !important;
            }
            
            .report-card-printable .bg-gradient-to-r.from-blue-600.p-4 p {
              font-size: 10px !important;
              margin: 2px 0 !important;
            }
            
            /* Section headings */
            .report-card-printable h3 {
              font-size: 13px !important;
              margin-bottom: 6px !important;
              font-weight: bold !important;
            }
            
            /* General padding reductions */
            .report-card-printable .p-4 {
              padding: 6px !important;
            }
            
            .report-card-printable .p-3 {
              padding: 5px !important;
            }
            
            .report-card-printable .pb-4,
            .report-card-printable .pb-3 {
              padding-bottom: 5px !important;
            }
            
            .report-card-printable .px-4,
            .report-card-printable .px-3 {
              padding-left: 6px !important;
              padding-right: 6px !important;
            }
            
            .report-card-printable .mb-4,
            .report-card-printable .mb-3 {
              margin-bottom: 4px !important;
            }
            
            .report-card-printable .mb-2 {
              margin-bottom: 3px !important;
            }
            
            .report-card-printable .gap-3,
            .report-card-printable .gap-4 {
              gap: 4px !important;
            }
            
            .report-card-printable .gap-2 {
              gap: 3px !important;
            }
            
            /* Hide decorative elements */
            .print\\\\\\\\:hidden {
              display: none !important;
            }
          }
        `}
      </style>

      {/* Action Buttons - Hide when printing */}
      <div className="flex flex-col sm:flex-row gap-2 sm:justify-end print:hidden">
        <Button variant="outline" onClick={handlePrint} className="gap-2 w-full sm:w-auto">
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button variant="outline" className="gap-2 w-full sm:w-auto" onClick={handleDownloadPDF}>
          <Download className="h-4 w-4" />
          Download PDF
        </Button>
      </div>

      {/* Report Card */}
      <Card className="bg-white shadow-2xl print:shadow-none overflow-hidden report-card-printable">
        <CardContent className="p-0">
          {/* Header Section with Decorative Border */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-1">
            <div className="bg-white p-4 sm:p-8">
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 sm:gap-6 items-center">
                {/* Logo */}
                {data.school.logo_url && (
                  <div className="sm:col-span-2 flex justify-center">
                    <ImageWithFallback
                      src={data.school.logo_url}
                      alt="School Logo"
                      className="h-16 w-16 sm:h-24 sm:w-24 object-contain"
                    />
                  </div>
                )}

                {/* School Info */}
                <div className={`${data.school.logo_url ? 'sm:col-span-8' : 'sm:col-span-10'} text-center`}>
                  <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-blue-900 mb-1">{data.school.school_name}</h1>
                  {data.school.motto && (
                    <p className="text-xs sm:text-sm text-purple-600 italic mb-2">"{data.school.motto}"</p>
                  )}
                  <p className="text-xs sm:text-sm text-slate-600">{data.school.address}</p>
                  <div className="flex flex-col sm:flex-row justify-center gap-2 sm:gap-4 mt-2 text-xs text-slate-600">
                    <span>📧 {data.school.email}</span>
                    <span>📞 {data.school.phone_numbers}</span>
                    {data.school.website_url && <span className="hidden sm:inline">🌐 {data.school.website_url}</span>}
                  </div>
                </div>

                {/* Stamp */}
                {data.school.stamp_url && (
                  <div className="sm:col-span-2 flex justify-center">
                    <ImageWithFallback
                      src={data.school.stamp_url}
                      alt="School Stamp"
                      className="h-16 w-16 sm:h-24 sm:w-24 object-contain"
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Report Type Badge */}
          <div className="text-center py-3 sm:py-4 bg-gradient-to-r from-blue-50 to-purple-50 border-y-2 border-blue-200">
            <h2 className="text-base sm:text-lg md:text-xl font-bold text-blue-900">
              {resultType === 'midterm' ? 'MID-TERM REPORT CARD' : 'TERMINAL REPORT CARD'}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">{sessionName} • {termName}</p>
          </div>

          {/* Student Information - Enhanced Design */}
          <div className="p-4 sm:p-6 md:px-8 print:p-3 bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20">
            {/* Student Profile Header with Photo */}
            <div className="mb-3 sm:mb-4 print:mb-2">
              <div className="flex items-center gap-3 mb-3 print:mb-2">
                {/* Student Photo */}
                <Avatar className="h-16 w-16 sm:h-20 sm:w-20 print:h-16 print:w-16 border-4 border-white shadow-lg student-photo">
                  <AvatarImage src={data.student.photo_url} alt={`${data.student.first_name} ${data.student.last_name}`} />
                  <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white text-lg sm:text-xl font-bold">
                    {data.student.first_name?.[0]}{data.student.last_name?.[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  <div className="h-7 w-7 sm:h-8 sm:w-8 print:h-6 print:w-6 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg flex-shrink-0">
                    <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="text-sm sm:text-base print:text-sm font-bold text-slate-700">Student Information</h3>
                    <p className="text-xs text-slate-500 hidden sm:block print:hidden">Personal & Academic Details</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Information Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3 print:gap-2">
              {/* Full Name Card */}
              <div className="bg-white rounded-lg p-2 sm:p-3 print:p-2 shadow-sm border border-blue-100 hover:shadow-md transition-shadow student-info-card">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 print:h-7 print:w-7 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0 icon-box">
                    <User className="h-4 w-4 print:h-3 print:w-3 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs print:text-[10px] text-slate-500 mb-0.5">Full Name</p>
                    <p className="text-sm print:text-xs font-bold text-slate-900 truncate">
                      {data.student.first_name} {data.student.middle_name} {data.student.last_name}
                    </p>
                  </div>
                </div>
              </div>

              {/* Class Card */}
              <div className="bg-white rounded-lg p-2 sm:p-3 print:p-2 shadow-sm border border-purple-100 hover:shadow-md transition-shadow student-info-card">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 print:h-7 print:w-7 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0 icon-box">
                    <BookOpen className="h-4 w-4 print:h-3 print:w-3 text-purple-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs print:text-[10px] text-slate-500 mb-0.5">Class</p>
                    <p className="text-sm print:text-xs font-bold text-slate-900">{data.student.class_name}</p>
                  </div>
                </div>
              </div>

              {/* Gender Card */}
              {data.student.gender && (
                <div className="bg-white rounded-lg p-2 sm:p-3 print:p-2 shadow-sm border border-pink-100 hover:shadow-md transition-shadow student-info-card">
                  <div className="flex items-start gap-2">
                    <div className="h-8 w-8 print:h-7 print:w-7 rounded-lg bg-pink-100 flex items-center justify-center flex-shrink-0 icon-box">
                      <Users className="h-4 w-4 print:h-3 print:w-3 text-pink-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs print:text-[10px] text-slate-500 mb-0.5">Gender</p>
                      <p className="text-sm print:text-xs font-bold text-slate-900">{data.student.gender}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Session Card */}
              <div className="bg-white rounded-lg p-2 sm:p-3 print:p-2 shadow-sm border border-green-100 hover:shadow-md transition-shadow student-info-card">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 print:h-7 print:w-7 rounded-lg bg-green-100 flex items-center justify-center flex-shrink-0 icon-box">
                    <Calendar className="h-4 w-4 print:h-3 print:w-3 text-green-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs print:text-[10px] text-slate-500 mb-0.5">Academic Session</p>
                    <p className="text-sm print:text-xs font-bold text-slate-900">{sessionName}</p>
                  </div>
                </div>
              </div>

              {/* Term Card */}
              <div className="bg-white rounded-lg p-2 sm:p-3 print:p-2 shadow-sm border border-orange-100 hover:shadow-md transition-shadow student-info-card">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 print:h-7 print:w-7 rounded-lg bg-orange-100 flex items-center justify-center flex-shrink-0 icon-box">
                    <Clock className="h-4 w-4 print:h-3 print:w-3 text-orange-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs print:text-[10px] text-slate-500 mb-0.5">Term</p>
                    <p className="text-sm print:text-xs font-bold text-slate-900">{termName}</p>
                  </div>
                </div>
              </div>

              {/* Report Type Card */}
              <div className="bg-white rounded-lg p-2 sm:p-3 print:p-2 shadow-sm border border-indigo-100 hover:shadow-md transition-shadow student-info-card">
                <div className="flex items-start gap-2">
                  <div className="h-8 w-8 print:h-7 print:w-7 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0 icon-box">
                    <FileText className="h-4 w-4 print:h-3 print:w-3 text-indigo-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs print:text-[10px] text-slate-500 mb-0.5">Report Type</p>
                    <p className="text-sm print:text-xs font-bold text-slate-900">
                      {resultType === 'midterm' ? 'Mid-Term Report' : 'Terminal Report'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Attendance Summary Section - Compact (Terminal Reports Only) */}
          {resultType === 'terminal' && attendanceData && (
            <div className="px-4 sm:px-6 md:px-8 print:px-3 pb-2 print:pb-1">
              <div className="border border-slate-200 rounded p-2 print:p-1.5 bg-slate-50">
                <div className="flex items-center justify-between gap-2 text-xs print:text-[10px]">
                  <div className="flex items-center gap-1.5">
                    <ClipboardCheck className="h-3.5 w-3.5 text-slate-600 flex-shrink-0" />
                    <span className="font-medium text-slate-700">Attendance:</span>
                  </div>
                  <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
                    <span className="text-slate-600">
                      <span className="font-medium text-green-700">{attendanceData.days_present}</span>/{attendanceData.total_school_days} days
                    </span>
                    {attendanceData.days_absent > 0 && (
                      <span className="text-slate-600">
                        <span className="font-medium text-red-600">{attendanceData.days_absent}</span> absent
                      </span>
                    )}
                    {attendanceData.days_late > 0 && (
                      <span className="text-slate-600">
                        <span className="font-medium text-orange-600">{attendanceData.days_late}</span> late
                      </span>
                    )}
                    <span className={`font-bold ${
                      attendanceData.attendance_percentage >= 95 ? 'text-green-700' :
                      attendanceData.attendance_percentage >= 85 ? 'text-blue-700' :
                      attendanceData.attendance_percentage >= 75 ? 'text-yellow-700' :
                      'text-red-700'
                    }`}>
                      {attendanceData.attendance_percentage}%
                    </span>
                    <Badge className={`${
                      attendanceData.attendance_percentage >= 95 ? 'bg-green-100 text-green-800' :
                      attendanceData.attendance_percentage >= 85 ? 'bg-blue-100 text-blue-800' :
                      attendanceData.attendance_percentage >= 75 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    } text-[10px] px-1.5 py-0 h-auto`}>
                      {attendanceData.attendance_grade}
                    </Badge>
                    {attendanceData.flagged && (
                      <span className="text-amber-600 flex items-center gap-1">
                        <AlertCircle className="h-3 w-3" />
                        <span className="hidden sm:inline">Low</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Debug: Show why attendance might not be displaying (Terminal Reports Only) */}
          {resultType === 'terminal' && !loadingAttendance && !attendanceData && (
            <div className="px-4 sm:px-6 md:px-8 print:hidden pb-4">
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <div className="flex items-start gap-3">
                  <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-blue-900 mb-1">Attendance data not available</p>
                    <p className="text-xs text-blue-700">
                      Attendance will appear here once:
                      <br />• Admin sets school calendar in Settings → Attendance Settings
                      <br />• Teacher marks attendance for this student
                      <br />• Check browser console for details (F12)
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Academic Performance Table */}
          <div className="p-4 sm:p-6 md:p-8 print:p-3">
            <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
              <Award className="h-4 w-4 sm:h-5 sm:w-5" />
              Academic Performance
            </h3>
            <div className="overflow-x-auto -mx-4 sm:mx-0">
              <div className="min-w-[640px] border-2 border-blue-200 rounded-lg">
                <table className="w-full">
                  <thead className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
                    <tr>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm">Subject</th>
                      <th className="p-2 sm:p-3 text-center text-xs sm:text-sm">CA1<br/><span className="text-xs font-normal">({ca1Max})</span></th>
                      <th className="p-2 sm:p-3 text-center text-xs sm:text-sm">CA2<br/><span className="text-xs font-normal">({ca2Max})</span></th>
                      <th className="p-2 sm:p-3 text-center text-xs sm:text-sm">{resultType === 'midterm' ? 'Midterm' : 'Exam'}<br/><span className="text-xs font-normal">({examMax})</span></th>
                      <th className="p-2 sm:p-3 text-center text-xs sm:text-sm">Total<br/><span className="text-xs font-normal">({maxMarks})</span></th>
                      <th className="p-2 sm:p-3 text-center text-xs sm:text-sm">Grade</th>
                      <th className="p-2 sm:p-3 text-left text-xs sm:text-sm">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results && data.results.length > 0 ? (
                      data.results.map((result, index) => (
                        <tr key={index} className={`border-b ${index % 2 === 0 ? 'bg-white' : 'bg-slate-50'} hover:bg-blue-50 transition-colors`}>
                          <td className="p-2 sm:p-3 font-medium text-xs sm:text-sm">{result.subject_name}</td>
                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm">{result.ca1}</td>
                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm">{result.ca2}</td>
                          <td className="p-2 sm:p-3 text-center text-xs sm:text-sm">{result.exam}</td>
                          <td className="p-2 sm:p-3 text-center font-bold text-blue-900 text-xs sm:text-sm">{result.total}</td>
                          <td className="p-2 sm:p-3 text-center">
                            <Badge className={`${getGradeColor(result.grade)} text-xs`}>{result.grade}</Badge>
                          </td>
                          <td className="p-2 sm:p-3 text-xs sm:text-sm">{result.remark}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className="p-6 sm:p-8 text-center text-slate-500">
                          <p className="text-base sm:text-lg font-medium mb-2">No marks found for this exam</p>
                          <p className="text-xs sm:text-sm">
                            Marks may not have been entered or approved yet. Please contact your class teacher.
                          </p>
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Summary Statistics */}
          <div className="px-4 sm:px-6 md:px-8 print:px-3 pb-4 sm:pb-6 md:pb-8 print:pb-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 print:gap-2">
              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200 summary-stat">
                <CardContent className="p-3 sm:p-4 print:p-2 text-center">
                  <p className="text-xs print:text-[10px] text-green-700 font-medium mb-1">Average Score</p>
                  <p className="text-xl sm:text-2xl print:text-xl font-bold text-green-900">{data.average_score.toFixed(1)}</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200 summary-stat">
                <CardContent className="p-3 sm:p-4 print:p-2 text-center">
                  <p className="text-xs print:text-[10px] text-blue-700 font-medium mb-1">Percentage</p>
                  <p className="text-xl sm:text-2xl print:text-xl font-bold text-blue-900">{data.percentage_score.toFixed(1)}%</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200 summary-stat">
                <CardContent className="p-3 sm:p-4 print:p-2 text-center">
                  <p className="text-xs print:text-[10px] text-purple-700 font-medium mb-1">Overall Grade</p>
                  <p className="text-xl sm:text-2xl print:text-xl font-bold text-purple-900">{data.overall_grade}</p>
                  <p className="text-xs print:text-[10px] text-purple-600 mt-1">{data.overall_remark}</p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Performance Chart */}
          {chartData.length > 0 && (
            <div className="px-4 sm:px-6 md:px-8 pb-4 sm:pb-6 md:pb-8 print:hidden">
              <h3 className="text-lg sm:text-xl font-bold text-blue-900 mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5" />
                Performance Overview
              </h3>
              <Card className="p-3 sm:p-4">
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="name" 
                      angle={-45} 
                      textAnchor="end" 
                      height={80}
                      tick={{ fontSize: 10 }}
                    />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip />
                    <Bar dataKey="score" radius={[8, 8, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.percentage >= 80 ? '#10b981' : entry.percentage >= 70 ? '#3b82f6' : entry.percentage >= 60 ? '#f59e0b' : '#ef4444'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Card>
            </div>
          )}

          {/* Comments Section */}
          <div className="px-4 sm:px-6 md:px-8 print:px-3 pb-4 sm:pb-6 md:pb-8 print:pb-3 flex flex-col md:flex-row gap-3 sm:gap-4 print:gap-3">
            <Card className="border-2 border-blue-200 flex-1 comment-section">
              <CardContent className="p-3 sm:p-4 print:p-2">
                <h4 className="text-xs sm:text-sm print:text-xs font-bold text-blue-900 mb-2 print:mb-1">Class Teacher's Comment</h4>
                <p className="text-xs print:text-[10px] text-slate-700 mb-3 print:mb-2 min-h-[40px] print:min-h-[30px] italic">
                  {data.teacher_comment || 'No comment yet'}
                </p>
                {data.teacher_name && (
                  <div className="pt-2 print:pt-1 border-t">
                    <p className="text-[10px] text-slate-600">Signed:</p>
                    <p className="text-xs print:text-[10px] font-medium">{data.teacher_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-2 border-purple-200 flex-1 comment-section">
              <CardContent className="p-3 sm:p-4 print:p-2">
                <h4 className="text-xs sm:text-sm print:text-xs font-bold text-purple-900 mb-2 print:mb-1">Principal's Comment</h4>
                <p className="text-xs print:text-[10px] text-slate-700 mb-3 print:mb-2 min-h-[40px] print:min-h-[30px] italic">
                  {data.principal_comment || 'No comment yet'}
                </p>
                {data.principal_name && (
                  <div className="pt-2 print:pt-1 border-t">
                    <p className="text-[10px] text-slate-600">Signed:</p>
                    <p className="text-xs print:text-[10px] font-medium">{data.principal_name}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Grade System & Next Term (Terminal Only) */}
          <div className="px-4 sm:px-6 md:px-8 print:px-3 pb-4 sm:pb-6 md:pb-8 print:pb-3">
            <div className="flex flex-col md:flex-row gap-3 sm:gap-4 print:gap-3">
              {/* Grade System */}
              <Card className="border-2 border-slate-200 flex-1 grade-system">
                <CardContent className="p-3 sm:p-4 print:p-2">
                  <h4 className="text-xs sm:text-sm print:text-xs font-bold text-slate-900 mb-2 print:mb-1">Grade System</h4>
                  <div className="space-y-1 print:space-y-0.5">
                    {data.grade_system.map((grade, index) => (
                      <div key={index} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs print:text-[10px] grade-system-item">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getGradeColor(grade.grade)} text-[10px] print:text-[9px] badge`}>{grade.grade}</Badge>
                          <span className="text-slate-600">{grade.min_percentage}% - {grade.max_percentage}%</span>
                        </div>
                        <span className="text-slate-700 pl-8 sm:pl-0">{grade.remark}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Next Term Begins (Terminal Only) */}
              {resultType === 'terminal' && (
                <Card className="border-2 border-green-200 bg-gradient-to-br from-green-50 to-green-100 flex-1 next-term-card">
                  <CardContent className="p-3 sm:p-4 print:p-2">
                    <h4 className="text-xs sm:text-sm print:text-xs font-bold text-green-900 mb-2 print:mb-1">Next Term Begins</h4>
                    {data.next_term_begins ? (
                      <p className="text-base sm:text-lg print:text-sm font-bold text-green-900">
                        {new Date(data.next_term_begins).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    ) : (
                      <p className="text-sm print:text-xs text-slate-600 italic">Not yet configured</p>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 p-4 sm:p-6 text-white">
            <div className="text-center mb-3">
              <p className="text-xs sm:text-sm">
                This is an official report card issued by {data.school.school_name}
              </p>
              <p className="text-xs mt-2 opacity-80">
                Generated on {new Date().toLocaleDateString()} • School Management System
              </p>
            </div>
            {data.school.director_name && (
              <div className="pt-3 border-t border-white/30 text-center">
                <p className="text-xs sm:text-sm">
                  Signed by the Director: <span className="font-semibold">{data.school.director_name}</span>
                </p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}