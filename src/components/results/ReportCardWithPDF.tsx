import { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Download, Loader2 } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { ReportCardTemplate } from '../student/ReportCardTemplate';
import { ModernReportCardTemplate } from '../student/ModernReportCardTemplate';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

interface ReportCardWithPDFProps {
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
  exam_score: number;
  total: number;
  grade: string;
  remark: string;
  highest_in_class?: number;
  lowest_in_class?: number;
  class_average?: number;
  position?: number;
}

interface ReportData {
  student: {
    first_name: string;
    last_name: string;
    middle_name?: string;
    class_name: string;
    gender: string;
    photo_url?: string;
    admission_number?: string;
    date_of_birth?: string;
  };
  school: {
    school_name?: string;
    logo_url?: string;
    motto?: string;
    address?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  results: SubjectResult[];
  average_score: number;
  percentage_score: number;
  overall_grade: string;
  overall_remark: string;
  teacher_comment: string;
  principal_comment: string;
  teacher_name: string;
  principal_name: string;
  director_name?: string;
  position_in_class?: number;
  class_population?: number;
  next_term_begins?: string;
  grade_system: Array<{
    min_score: number;
    max_score: number;
    grade: string;
    remark: string;
  }>;
}

interface AttendanceSummary {
  total_school_days: number;
  days_present: number;
  days_absent: number;
  attendance_percentage: number;
}

export function ReportCardWithPDF({ 
  studentId, 
  sessionName, 
  termName, 
  examName, 
  resultType, 
  userRole 
}: ReportCardWithPDFProps) {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ReportData | null>(null);
  const [attendanceData, setAttendanceData] = useState<AttendanceSummary | null>(null);
  const [classPopulation, setClassPopulation] = useState<number>(0);
  const [downloadingPDF, setDownloadingPDF] = useState(false);
  const [directorName, setDirectorName] = useState<string>('');
  
  const reportRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchReportCard();
    fetchDirectorName();
    if (resultType === 'terminal') {
      fetchAttendanceSummary();
    }
    fetchClassPopulation();
  }, [studentId, sessionName, termName, examName, resultType]);

  const fetchDirectorName = async () => {
    try {
      const { data: directorProfile } = await supabase
        .from('profiles')
        .select('first_name, last_name')
        .eq('role', 'director')
        .limit(1)
        .single();

      if (directorProfile) {
        setDirectorName(`${directorProfile.first_name} ${directorProfile.last_name}`);
      }
    } catch (error) {
      console.error('[ReportCard] Error fetching director name:', error);
    }
  };

  const fetchClassPopulation = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get student's class
      const { data: student } = await supabase
        .from('profiles')
        .select('class_id')
        .eq('id', studentId)
        .single();

      if (student?.class_id) {
        // Count students in the same class
        const { count } = await supabase
          .from('profiles')
          .select('*', { count: 'exact', head: true })
          .eq('class_id', student.class_id)
          .eq('role', 'student');

        if (count) {
          setClassPopulation(count);
        }
      }
    } catch (error) {
      console.error('[ReportCard] Error fetching class population:', error);
    }
  };

  const fetchAttendanceSummary = async () => {
    try {
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
      
      if (result.success && result.summary) {
        setAttendanceData({
          total_school_days: result.summary.total_school_days,
          days_present: result.summary.days_present,
          days_absent: result.summary.days_absent,
          attendance_percentage: result.summary.attendance_percentage
        });
      }
    } catch (error) {
      console.error('[ReportCard] Attendance Error:', error);
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
      
      if (result.success && result.data) {
        console.log('[ReportCard] Backend response data:', result.data);
        console.log('[ReportCard] class_population from backend:', result.data.class_population);
        console.log('[ReportCard] position_in_class from backend:', result.data.position_in_class);
        
        // Transform the data to match our template interface
        const transformedData = {
          ...result.data,
          results: result.data.results.map((r: any) => ({
            subject_name: r.subject_name,
            ca1: r.ca1 || 0,
            ca2: r.ca2 || 0,
            exam_score: r.exam || 0,
            total: r.total,
            grade: r.grade,
            remark: r.remark,
            highest_in_class: r.highest_in_class,
            lowest_in_class: r.lowest_in_class,
            class_average: r.class_average,
            position: r.position
          })),
          grade_system: result.data.grade_system.map((g: any) => ({
            min_score: g.min_percentage,
            max_score: g.max_percentage,
            grade: g.grade,
            remark: g.remark
          }))
        };
        
        setData(transformedData);
        
        // Calculate per-subject statistics if not provided
        if (transformedData.results.length > 0) {
          await calculateSubjectStatistics(transformedData);
        }
      } else {
        toast.error(result.error || 'Failed to load report card');
      }
    } catch (error) {
      console.error('[ReportCard] Error:', error);
      toast.error('Failed to load report card');
    } finally {
      setLoading(false);
    }
  };

  const calculateSubjectStatistics = async (reportData: ReportData) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Get student's class
      const { data: student } = await supabase
        .from('profiles')
        .select('class_id')
        .eq('id', studentId)
        .single();

      if (!student?.class_id) return;

      // For each subject, calculate statistics
      const enhancedResults = await Promise.all(
        reportData.results.map(async (subject) => {
          try {
            // Fetch all marks for this subject in the same class
            const { data: marks } = await supabase
              .from('marks')
              .select('student_id, ca1, ca2, exam, total')
              .eq('session_name', sessionName)
              .eq('term_name', termName)
              .eq('exam_name', examName)
              .eq('subject_name', subject.subject_name);

            if (marks && marks.length > 0) {
              // Filter marks for students in the same class
              const { data: classStudents } = await supabase
                .from('profiles')
                .select('id')
                .eq('class_id', student.class_id)
                .eq('role', 'student');

              const classStudentIds = classStudents?.map(s => s.id) || [];
              const classMarks = marks.filter(m => classStudentIds.includes(m.student_id));

              if (classMarks.length > 0) {
                const totals = classMarks.map(m => m.total);
                const highest = Math.max(...totals);
                const lowest = Math.min(...totals);
                const average = totals.reduce((a, b) => a + b, 0) / totals.length;

                // Calculate position
                const sortedTotals = [...totals].sort((a, b) => b - a);
                const position = sortedTotals.indexOf(subject.total) + 1;

                return {
                  ...subject,
                  highest_in_class: highest,
                  lowest_in_class: lowest,
                  class_average: average,
                  position: position
                };
              }
            }
          } catch (error) {
            console.error(`Error calculating stats for ${subject.subject_name}:`, error);
          }
          
          return subject;
        })
      );

      setData(prev => prev ? { ...prev, results: enhancedResults } : null);
    } catch (error) {
      console.error('[ReportCard] Error calculating statistics:', error);
    }
  };

  const handleDownloadPDF = async () => {
    if (!reportRef.current || !data) return;

    try {
      setDownloadingPDF(true);
      toast.info('Generating PDF... Please wait.');

      // Wait for images to load
      await new Promise(resolve => setTimeout(resolve, 1000));

      // Create a style element that overrides ALL oklch colors with hex/rgb
      const styleOverride = document.createElement('style');
      styleOverride.innerHTML = `
        * {
          --foreground: #000000 !important;
          --card-foreground: #000000 !important;
          --popover: #ffffff !important;
          --popover-foreground: #000000 !important;
          --primary-foreground: #ffffff !important;
          --secondary: #f3f4f6 !important;
          --ring: #9ca3af !important;
          --chart-1: #f59e0b !important;
          --chart-2: #06b6d4 !important;
          --chart-3: #3b82f6 !important;
          --chart-4: #22c55e !important;
          --chart-5: #ef4444 !important;
          --sidebar: #f9fafb !important;
          --sidebar-foreground: #000000 !important;
          --sidebar-primary-foreground: #f9fafb !important;
          --sidebar-accent: #f3f4f6 !important;
          --sidebar-accent-foreground: #1f2937 !important;
          --sidebar-border: #e5e7eb !important;
          --sidebar-ring: #9ca3af !important;
        }
      `;

      // Create a temporary wrapper
      const tempWrapper = document.createElement('div');
      tempWrapper.style.backgroundColor = '#ffffff';
      tempWrapper.style.padding = '0';
      tempWrapper.style.margin = '0';
      tempWrapper.appendChild(styleOverride);
      
      // Clone the report content
      const clonedReport = reportRef.current.cloneNode(true) as HTMLElement;
      tempWrapper.appendChild(clonedReport);
      
      // Add to DOM (hidden)
      tempWrapper.style.position = 'fixed';
      tempWrapper.style.left = '-9999px';
      tempWrapper.style.top = '0';
      document.body.appendChild(tempWrapper);

      // Remove all class attributes from cloned elements
      const allElements = tempWrapper.querySelectorAll('*');
      allElements.forEach((el) => {
        if (el instanceof HTMLElement && el.tagName !== 'STYLE') {
          el.removeAttribute('class');
        }
      });

      const canvas = await html2canvas(tempWrapper, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
        windowWidth: tempWrapper.scrollWidth,
        windowHeight: tempWrapper.scrollHeight,
      });

      // Cleanup
      document.body.removeChild(tempWrapper);

      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      
      const fileName = `${data.student.last_name}_${data.student.first_name}_${sessionName}_${termName}_Report.pdf`
        .replace(/\s+/g, '_')
        .replace(/[^a-zA-Z0-9_]/g, '');
      
      pdf.save(fileName);
      toast.success('PDF downloaded successfully!');
    } catch (error) {
      console.error('❌ Error generating PDF:', error);
      toast.error('Failed to generate PDF. Please try again.');
    } finally {
      setDownloadingPDF(false);
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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-12 text-center">
        <p className="text-slate-500">No data available for this result</p>
      </div>
    );
  }

  const templateData = {
    ...data,
    session: sessionName,
    term: termName,
    exam_type: examName,
    result_type: resultType, // Pass the explicit result type
    attendance: attendanceData ? {
      times_school_opened: attendanceData.total_school_days,
      times_present: attendanceData.days_present,
      times_absent: attendanceData.days_absent,
      percentage: attendanceData.attendance_percentage
    } : undefined,
    // Use backend's class_population if available, otherwise use frontend fetched value
    class_population: data.class_population || classPopulation,
    // Use backend's position_in_class (already in data)
    position_in_class: data.position_in_class,
    // Use backend's director_name if available, otherwise use frontend fetched value
    director_name: data.director_name || directorName
  };

  console.log('[ReportCard] Final templateData:', {
    exam_type: templateData.exam_type,
    result_type: templateData.result_type,
    resultType: resultType,
    examName: examName,
    class_population: templateData.class_population,
    position_in_class: templateData.position_in_class,
    class_name: templateData.student?.class_name
  });

  return (
    <div className="space-y-4">
      {/* Action Buttons */}
      <div className="flex justify-end gap-3">
        <Button
          onClick={handleDownloadPDF}
          disabled={downloadingPDF}
          className="gap-2 rounded-xl shadow-lg hover:shadow-xl transition-all"
        >
          {downloadingPDF ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Generating PDF...
            </>
          ) : (
            <>
              <Download className="h-4 w-4" />
              Download PDF
            </>
          )}
        </Button>
      </div>

      {/* Report Card Template */}
      <div className="bg-white rounded-2xl shadow-lg overflow-hidden">
        <div className="flex justify-center p-4 md:p-8">
          <ModernReportCardTemplate ref={reportRef} data={templateData} />
        </div>
      </div>
    </div>
  );
}