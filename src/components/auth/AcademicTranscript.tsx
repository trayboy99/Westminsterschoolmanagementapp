import React, { useRef, useState, useEffect } from 'react';
import { GraduationCap, Download, Printer, Award, Calendar, Hash, User, Mail, Phone, Loader2 } from 'lucide-react';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface TranscriptData {
  alumni: {
    id: string;
    first_name: string;
    middle_name: string;
    last_name: string;
    admission_number: string;
    graduation_session: string;
    graduation_class: string;
    graduation_number?: string;
    email?: string;
    phone?: string;
    date_of_birth?: string;
    gender?: string;
  };
  academic_records: Array<{
    id: string;
    subject: string;
    ca1: number;
    ca2: number;
    exam_score: number;
    total: number;
    grade: string;
    exams: {
      session: string;
      term: string;
      name: string;
    };
  }>;
  grouped_records: Record<string, any[]>;
}

interface SchoolInfo {
  school_name: string;
  address: string;
  email: string;
  phone_numbers: string;
  website_url: string;
  principal_name: string;
  director_name: string;
  motto: string;
  logo_url?: string;
  stamp_url?: string;
}

interface GradeConfig {
  grade: string;
  min_percentage: number;
  max_percentage: number;
  remark: string;
}

interface AcademicTranscriptProps {
  data: TranscriptData;
}

export function AcademicTranscript({ data }: AcademicTranscriptProps) {
  const transcriptRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    school_name: 'BRUME MEMORIAL GRAMMAR SCHOOL',
    address: 'Irhirhi Town, Ughelli South L.G.A, Delta State, Nigeria',
    email: '',
    phone_numbers: '',
    website_url: '',
    principal_name: 'School Principal',
    director_name: 'Director of Studies',
    motto: '',
  });
  const [grades, setGrades] = useState<GradeConfig[]>([
    { grade: 'A', min_percentage: 75, max_percentage: 100, remark: 'Excellent' },
    { grade: 'B', min_percentage: 65, max_percentage: 74, remark: 'Very Good' },
    { grade: 'C', min_percentage: 55, max_percentage: 64, remark: 'Good' },
    { grade: 'D', min_percentage: 45, max_percentage: 54, remark: 'Fair' },
    { grade: 'F', min_percentage: 0, max_percentage: 44, remark: 'Fail' },
  ]);

  // Fetch school settings and grade settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setLoading(true);
        
        console.log('[AcademicTranscript] Fetching school settings...');
        
        // Fetch school settings
        const schoolRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/school-settings`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (schoolRes.ok) {
          const schoolResult = await schoolRes.json();
          console.log('[AcademicTranscript] School settings response:', schoolResult);
          
          if (schoolResult.success && schoolResult.settings) {
            console.log('[AcademicTranscript] ✅ Using school settings from admin dashboard');
            setSchoolInfo(schoolResult.settings);
          } else {
            console.warn('[AcademicTranscript] ⚠️ Invalid response format, using fallback');
          }
        } else {
          console.error('[AcademicTranscript] ❌ Failed to fetch school settings:', schoolRes.status);
        }

        // Fetch grade settings
        const gradeRes = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/grade-settings`,
          {
            headers: {
              Authorization: `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json',
            },
          }
        );
        
        if (gradeRes.ok) {
          const gradeResult = await gradeRes.json();
          if (gradeResult.success && gradeResult.grades && gradeResult.grades.length > 0) {
            // Sort grades by min_percentage descending for proper display
            const sortedGrades = gradeResult.grades.sort(
              (a: GradeConfig, b: GradeConfig) => b.min_percentage - a.min_percentage
            );
            setGrades(sortedGrades);
          }
        }
      } catch (error) {
        console.error('[AcademicTranscript] Error fetching settings:', error);
        // Continue with default values if fetch fails
      } finally {
        setLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const calculateSessionAverage = (records: any[]) => {
    if (!records || records.length === 0) return 0;
    const sum = records.reduce((acc, record) => acc + (record.total || 0), 0);
    return (sum / records.length).toFixed(2);
  };

  const getOverallAverage = () => {
    if (!data.academic_records || data.academic_records.length === 0) return 0;
    const sum = data.academic_records.reduce((acc, record) => acc + (record.total || 0), 0);
    return (sum / data.academic_records.length).toFixed(2);
  };

  const getClassification = (average: number) => {
    // Find the appropriate grade based on average
    const matchedGrade = grades.find(
      (g) => average >= g.min_percentage && average <= g.max_percentage
    );
    
    if (matchedGrade) {
      // Map grade to classification with colors
      const gradeColorMap: Record<string, { label: string; color: string }> = {
        A: { label: 'Distinction', color: 'text-green-700' },
        B: { label: 'Upper Credit', color: 'text-blue-700' },
        C: { label: 'Credit', color: 'text-yellow-700' },
        D: { label: 'Pass', color: 'text-orange-700' },
        E: { label: 'Pass', color: 'text-orange-600' },
        F: { label: 'Fail', color: 'text-red-700' },
      };
      
      return gradeColorMap[matchedGrade.grade] || { label: matchedGrade.remark, color: 'text-slate-700' };
    }
    
    return { label: 'N/A', color: 'text-slate-700' };
  };

  const handleDownload = () => {
    if (!transcriptRef.current) return;

    toast.info('Preparing transcript for download...');

    // Create a print-friendly version
    const printWindow = window.open('', '', 'width=800,height=600');
    if (!printWindow) {
      toast.error('Please allow popups to download the transcript');
      return;
    }

    const content = transcriptRef.current.innerHTML;
    const styles = `
      <style>
        @media print {
          body { margin: 0; padding: 15px; }
          @page { size: A4; margin: 15mm; }
        }
        body {
          font-family: 'Times New Roman', serif;
          line-height: 1.4;
          color: #000;
        }
        table { 
          width: 100%; 
          border-collapse: collapse; 
          margin: 12px 0;
          font-size: 11px;
        }
        th, td { 
          border: 1px solid #000; 
          padding: 4px 6px; 
          text-align: left;
        }
        th { 
          background-color: #f0f0f0; 
          font-weight: bold;
        }
        .no-print { display: none !important; }
        .header {
          margin-bottom: 15px;
          border-bottom: 2px solid #000;
          padding-bottom: 10px;
        }
        .flex {
          display: flex;
        }
        .items-start {
          align-items: flex-start;
        }
        .gap-4 {
          gap: 16px;
        }
        .flex-shrink-0 {
          flex-shrink: 0;
        }
        .flex-1 {
          flex: 1;
        }
        .text-center {
          text-align: center;
        }
        .student-info {
          margin: 12px 0;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 8px;
          font-size: 11px;
        }
        .signature-section {
          margin-top: 30px;
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 40px;
        }
        .signature-line {
          border-top: 1px solid #000;
          margin-top: 30px;
          padding-top: 5px;
          text-align: center;
        }
      </style>
    `;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Academic Transcript - ${data.alumni.first_name} ${data.alumni.last_name}</title>
          ${styles}
        </head>
        <body>
          ${content}
          <script>
            window.onload = function() {
              window.print();
              setTimeout(() => window.close(), 100);
            };
          </script>
        </body>
      </html>
    `);

    printWindow.document.close();
    toast.success('Transcript ready for download');
  };

  const handlePrint = () => {
    handleDownload();
  };

  const overallAverage = parseFloat(getOverallAverage());
  const classification = getClassification(overallAverage);

  // Show loading state while fetching settings
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="h-8 w-8 animate-spin text-blue-600 mx-auto" />
          <p className="text-slate-600">Loading transcript settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Action Buttons */}
      <div className="flex gap-3 justify-end no-print">
        <Button
          onClick={handlePrint}
          variant="outline"
          className="flex items-center gap-2"
        >
          <Printer className="h-4 w-4" />
          Print
        </Button>
        <Button
          onClick={handleDownload}
          className="bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
        >
          <Download className="h-4 w-4" />
          Download as PDF
        </Button>
      </div>

      {/* Transcript Document - Compressed Layout */}
      <div
        ref={transcriptRef}
        className="bg-white border-2 border-slate-300 rounded-lg p-6 shadow-lg"
        style={{ minHeight: '800px' }}
      >
        {/* Header - Professional Horizontal Layout */}
        <div className="header border-b-2 border-slate-800 pb-4 mb-4">
          {/* Logo and School Info Side by Side */}
          <div className="flex items-start gap-4">
            {/* Logo on Left */}
            <div className="flex-shrink-0">
              {schoolInfo.logo_url ? (
                <img 
                  src={schoolInfo.logo_url} 
                  alt={`${schoolInfo.school_name} Logo`}
                  className="h-20 w-20 object-contain"
                />
              ) : (
                <div className="bg-blue-100 p-3 rounded-full">
                  <GraduationCap className="h-14 w-14 text-blue-600" />
                </div>
              )}
            </div>

            {/* School Information on Right */}
            <div className="flex-1 pt-1">
              <h1 className="text-xl font-bold text-slate-900 uppercase leading-tight mb-1">
                {schoolInfo.school_name}
              </h1>
              <p className="text-xs text-slate-600 leading-snug mb-1">
                {schoolInfo.address}
              </p>
              {(schoolInfo.email || schoolInfo.phone_numbers) && (
                <p className="text-xs text-slate-600">
                  {schoolInfo.email && (
                    <span>Email: <span className="text-blue-600">{schoolInfo.email}</span></span>
                  )}
                  {schoolInfo.email && schoolInfo.phone_numbers && ' | '}
                  {schoolInfo.phone_numbers && (
                    <span>Phone: <span className="text-blue-600">{schoolInfo.phone_numbers}</span></span>
                  )}
                </p>
              )}
              {schoolInfo.motto && (
                <p className="text-xs italic text-slate-500 mt-1">
                  "{schoolInfo.motto}"
                </p>
              )}
            </div>
          </div>

          {/* Transcript Title */}
          <div className="mt-3 pt-3 border-t border-slate-300 text-center">
            <h2 className="text-lg font-bold text-blue-700 uppercase">
              ACADEMIC TRANSCRIPT
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Official Record of Academic Performance
            </p>
          </div>
        </div>

        {/* Student Information - Compressed */}
        <div className="mb-4">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
            <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
              <User className="h-4 w-4 text-blue-600" />
              Student Information
            </h3>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <p className="text-slate-500 text-xs font-medium">Full Name</p>
                <p className="text-slate-900 font-semibold">
                  {data.alumni.first_name} {data.alumni.middle_name} {data.alumni.last_name}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Admission Number</p>
                <p className="text-slate-900 font-semibold flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  {data.alumni.admission_number}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Graduation Class</p>
                <p className="text-slate-900 font-semibold">
                  {data.alumni.graduation_class}
                </p>
              </div>
              <div>
                <p className="text-slate-500 text-xs font-medium">Graduation Session</p>
                <p className="text-slate-900 font-semibold flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {data.alumni.graduation_session}
                </p>
              </div>
              {data.alumni.graduation_number && (
                <div>
                  <p className="text-slate-500 text-xs font-medium">Graduation Number</p>
                  <p className="text-slate-900 font-semibold">
                    {data.alumni.graduation_number}
                  </p>
                </div>
              )}
              {data.alumni.gender && (
                <div>
                  <p className="text-slate-500 text-xs font-medium">Gender</p>
                  <p className="text-slate-900 font-semibold capitalize">
                    {data.alumni.gender}
                  </p>
                </div>
              )}
              {data.alumni.email && (
                <div className="col-span-2">
                  <p className="text-slate-500 text-xs font-medium">Email Address</p>
                  <p className="text-slate-900 text-sm flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {data.alumni.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Academic Records by Session - Compressed */}
        <div className="mb-4">
          <h3 className="text-base font-semibold text-slate-900 mb-3 flex items-center gap-2">
            <Award className="h-4 w-4 text-blue-600" />
            Academic Performance
          </h3>

          {Object.keys(data.grouped_records)
            .sort()
            .map((session) => {
              const records = data.grouped_records[session];
              const sessionAvg = parseFloat(calculateSessionAverage(records));

              return (
                <div key={session} className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold text-sm text-slate-800">
                      Session: {session}
                    </h4>
                    <Badge variant="secondary" className="bg-blue-100 text-blue-700 text-xs">
                      Average: {sessionAvg}%
                    </Badge>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full border border-slate-300 text-xs">
                      <thead>
                        <tr className="bg-slate-100">
                          <th className="border border-slate-300 px-2 py-1.5 text-left">
                            Subject
                          </th>
                          <th className="border border-slate-300 px-2 py-1.5 text-center">
                            CA1
                          </th>
                          <th className="border border-slate-300 px-2 py-1.5 text-center">
                            CA2
                          </th>
                          <th className="border border-slate-300 px-2 py-1.5 text-center">
                            Exam
                          </th>
                          <th className="border border-slate-300 px-2 py-1.5 text-center">
                            Total
                          </th>
                          <th className="border border-slate-300 px-2 py-1.5 text-center">
                            Grade
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {records
                          .sort((a, b) => (a.subject || '').localeCompare(b.subject || ''))
                          .map((record, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="border border-slate-300 px-2 py-1.5">
                                {record.subject}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center">
                                {record.ca1}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center">
                                {record.ca2}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center">
                                {record.exam_score}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center font-semibold">
                                {record.total}
                              </td>
                              <td className="border border-slate-300 px-2 py-1.5 text-center">
                                <Badge
                                  variant="outline"
                                  className={
                                    record.grade === 'A'
                                      ? 'bg-green-50 text-green-700 border-green-300'
                                      : record.grade === 'B'
                                      ? 'bg-blue-50 text-blue-700 border-blue-300'
                                      : record.grade === 'C'
                                      ? 'bg-yellow-50 text-yellow-700 border-yellow-300'
                                      : 'bg-slate-50 text-slate-700 border-slate-300'
                                  }
                                >
                                  {record.grade}
                                </Badge>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })}
        </div>

        {/* Overall Performance Summary - Compressed */}
        <div className="mb-4 bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-lg p-4">
          <h3 className="text-base font-semibold text-slate-900 mb-3">
            Overall Performance Summary
          </h3>
          <div className="grid grid-cols-3 gap-3 text-center">
            <div>
              <p className="text-xs text-slate-600 mb-0.5">Total Subjects</p>
              <p className="text-xl font-bold text-slate-900">
                {data.academic_records.length}
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-0.5">Overall Average</p>
              <p className="text-xl font-bold text-blue-600">
                {overallAverage}%
              </p>
            </div>
            <div>
              <p className="text-xs text-slate-600 mb-0.5">Classification</p>
              <p className={`text-xl font-bold ${classification.color}`}>
                {classification.label}
              </p>
            </div>
          </div>
        </div>

        {/* Grading Scale - Compressed */}
        <div className="mb-4 border border-slate-200 rounded-lg p-3 bg-slate-50">
          <h4 className="font-semibold text-slate-800 mb-2 text-xs">
            Grading Scale
          </h4>
          <div className={`grid gap-2 text-[10px]`} style={{ gridTemplateColumns: `repeat(${Math.min(grades.length, 6)}, minmax(0, 1fr))` }}>
            {grades.map((grade) => {
              // Determine badge color based on grade
              const getBadgeClass = (g: string) => {
                switch (g.toUpperCase()) {
                  case 'A': return 'bg-green-100 text-green-800 border-green-300';
                  case 'B': return 'bg-blue-100 text-blue-800 border-blue-300';
                  case 'C': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
                  case 'D': return 'bg-orange-100 text-orange-800 border-orange-300';
                  case 'E': return 'bg-red-100 text-red-800 border-red-300';
                  case 'F': return 'bg-red-200 text-red-900 border-red-400';
                  default: return 'bg-slate-100 text-slate-800 border-slate-300';
                }
              };

              return (
                <div key={grade.grade} className="text-center">
                  <Badge className={`text-[10px] ${getBadgeClass(grade.grade)}`}>{grade.grade}</Badge>
                  <p className="mt-0.5 text-slate-600">
                    {grade.min_percentage}-{grade.max_percentage}
                  </p>
                  <p className="text-[9px] text-slate-500 mt-0.5">
                    {grade.remark}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Certification - Compressed */}
        <div className="mt-6 pt-4 border-t-2 border-slate-300">
          <p className="text-xs text-slate-700 mb-4">
            This is to certify that the above is a true record of the academic performance of{' '}
            <span className="font-semibold">
              {data.alumni.first_name} {data.alumni.middle_name} {data.alumni.last_name}
            </span>{' '}
            during their time at {schoolInfo.school_name} from admission to graduation in{' '}
            <span className="font-semibold">{data.alumni.graduation_session}</span>.
          </p>

          <div className="grid grid-cols-2 gap-12">
            <div>
              <div className="signature-line mt-12 pt-2 border-t border-slate-800">
                <p className="font-semibold text-xs">{schoolInfo.principal_name}</p>
                <p className="text-[10px] text-slate-500">School Principal</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Signature & Official Stamp</p>
              </div>
            </div>
            <div>
              <div className="signature-line mt-12 pt-2 border-t border-slate-800">
                <p className="font-semibold text-xs">{schoolInfo.director_name}</p>
                <p className="text-[10px] text-slate-500">Director of Studies</p>
                <p className="text-[9px] text-slate-400 mt-0.5">Signature & Date</p>
              </div>
            </div>
          </div>

          <div className="mt-4 text-center text-[10px] text-slate-500">
            <p>Transcript generated on: {new Date().toLocaleDateString('en-NG', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}</p>
            <p className="mt-1">
              Document ID: BMGS-TRANS-{data.alumni.admission_number}-{new Date().getFullYear()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
