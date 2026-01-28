import { forwardRef } from 'react';

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

interface ReportCardData {
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
  next_term_begins?: string;
  grade_system: Array<{
    min_score: number;
    max_score: number;
    grade: string;
    remark: string;
  }>;
  session: string;
  term: string;
  exam_type: string;
  result_type?: 'midterm' | 'terminal'; // For explicit type detection
  attendance?: {
    times_school_opened: number;
    times_present: number;
    times_absent: number;
    percentage: number;
  };
  class_population?: number;
  director_name?: string;
  position_in_class?: number;
}

interface ReportCardTemplateProps {
  data: ReportCardData;
}

export const ReportCardTemplate = forwardRef<HTMLDivElement, ReportCardTemplateProps>(
  ({ data }, ref) => {
    // Determine if this is midterm or terminal based on exam_type
    // First check explicit result_type, then fall back to exam_type string matching
    const isMidterm = data.result_type === 'midterm' ||
                      data.exam_type?.toLowerCase().includes('midterm') || 
                      data.exam_type?.toLowerCase().includes('mid-term') ||
                      data.exam_type?.toLowerCase().includes('first');
    const reportTitle = isMidterm ? 'MIDTERM REPORT SHEET' : 'TERMINAL REPORT SHEET';
    
    // Define max marks based on report type
    const ca1Max = isMidterm ? 10 : 20;
    const ca2Max = isMidterm ? 10 : 20;
    const examMax = isMidterm ? 20 : 60;
    const totalMax = isMidterm ? 40 : 100;
    
    return (
      <div ref={ref} className="bg-white p-3 max-w-sm mx-auto border-2 border-black">
        {/* Header */}
        <div className="border-2 border-black p-3 mb-2 relative">
          <div className="flex items-start gap-2 mb-2">
            {/* School Logo */}
            {data.school.logo_url ? (
              <img 
                src={data.school.logo_url} 
                alt="School Logo"
                className="w-12 h-12 object-contain flex-shrink-0"
              />
            ) : (
              <div className="w-12 h-12 bg-blue-700 rounded-full flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                {(data.school.school_name || 'A').charAt(0)}
              </div>
            )}

            {/* School Info - Centered */}
            <div className="flex-1 text-center pr-16">
              <h1 className="text-sm font-bold uppercase leading-tight">
                {data.school.school_name || 'AL-QALAM ACADEMY'}
              </h1>
              <p className="text-[9px] italic mt-0.5">
                "{data.school.motto || 'Knowledge, Character, and Excellence'}"
              </p>
              <p className="text-[8px] mt-0.5 leading-tight">
                {data.school.address || 'Lagos, Nigeria'}
              </p>
              {data.school.phone && (
                <p className="text-[8px]">Tel: {data.school.phone}</p>
              )}
              {data.school.email && (
                <p className="text-[8px]">Email: {data.school.email}</p>
              )}
            </div>

            {/* Student Photo */}
            <div className="absolute top-3 right-3">
              {data.student.photo_url ? (
                <img 
                  src={data.student.photo_url} 
                  alt="Student"
                  className="w-16 h-20 object-cover border-2 border-black rounded"
                />
              ) : (
                <div className="w-16 h-20 bg-gray-200 border-2 border-black rounded flex items-center justify-center text-[8px] text-gray-500 text-center p-1">
                  Photo
                </div>
              )}
            </div>
          </div>

          {/* Report Title */}
          <div className="text-center border-t border-black pt-2 mt-2">
            <h2 className="text-xs font-bold uppercase tracking-wider">
              {reportTitle}
            </h2>
            <p className="text-[9px] font-medium mt-0.5">
              {data.session} Academic Session - {data.term}
            </p>
            <p className="text-[8px]">({data.exam_type})</p>
          </div>
        </div>

        {/* Student Information */}
        <div className="border border-blue-700 mb-2">
          <div className="bg-gradient-to-r from-blue-700 to-blue-500 text-white text-center py-1 px-2 font-bold text-[10px]">
            STUDENT'S INFORMATION
          </div>
          <div className="text-[9px] p-2 space-y-1">
            <div>
              <strong>Name:</strong> {data.student.last_name} {data.student.first_name} {data.student.middle_name || ''}
            </div>
            <div>
              <strong>Gender:</strong> {data.student.gender}
            </div>
            <div>
              <strong>Class:</strong> {data.student.class_name}
            </div>
            {data.class_population != null && (
              <div>
                <strong>No. in Class:</strong> {data.class_population}
              </div>
            )}
          </div>
        </div>

        {/* Academic Performance Table */}
        <div className="overflow-x-auto mb-2">
          <table className="w-full border-collapse text-[8px] border border-black min-w-[400px]">
            <thead>
              <tr className="bg-black text-white">
                <th className="border border-black p-1 text-left">SUBJECT</th>
                <th className="border border-black p-1">CA1<br/>({ca1Max})</th>
                <th className="border border-black p-1">CA2<br/>({ca2Max})</th>
                <th className="border border-black p-1">EXAM<br/>({examMax})</th>
                <th className="border border-black p-1">TOTAL<br/>({totalMax})</th>
                <th className="border border-black p-1">GRD</th>
                <th className="border border-black p-1">REMARK</th>
              </tr>
            </thead>
            <tbody>
              {data.results.map((subject, index) => (
                <tr key={index}>
                  <td className="border border-black p-1 text-left font-medium">
                    {subject.subject_name}
                  </td>
                  <td className="border border-black p-1 text-center">{subject.ca1}</td>
                  <td className="border border-black p-1 text-center">{subject.ca2}</td>
                  <td className="border border-black p-1 text-center">{subject.exam_score}</td>
                  <td className="border border-black p-1 text-center font-bold">{subject.total}</td>
                  <td className="border border-black p-1 text-center font-bold">{subject.grade}</td>
                  <td className="border border-black p-1 text-left text-[7px]">{subject.remark}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Performance Summary */}
        <div className="border border-green-600 mb-2">
          <div className="bg-gradient-to-r from-green-600 to-green-400 text-white text-center py-1 px-2 font-bold text-[10px]">
            PERFORMANCE SUMMARY
          </div>
          <div className="text-[9px] p-2 space-y-1">
            <div>
              <strong>Total:</strong> {data.results.reduce((sum, r) => sum + r.total, 0)}
            </div>
            <div>
              <strong>Average:</strong> {data.average_score.toFixed(2)}
            </div>
            <div>
              <strong>Percentage:</strong> {data.percentage_score.toFixed(2)}%
            </div>
            <div>
              <strong>Grade:</strong> {data.overall_grade}
            </div>
            <div>
              <strong>Remark:</strong> {data.overall_remark}
            </div>
          </div>
        </div>

        {/* Grading Key */}
        <div className="border border-purple-600 mb-2">
          <div className="bg-gradient-to-r from-purple-600 to-purple-400 text-white text-center py-1 px-2 font-bold text-[10px]">
            GRADING KEY
          </div>
          <div className="text-[8px] p-2 space-y-0.5">
            {data.grade_system.map((grade, idx) => (
              <div key={idx}>
                <strong>{grade.grade}:</strong> {grade.min_score}-{grade.max_score}% - {grade.remark}
              </div>
            ))}
          </div>
        </div>

        {/* Attendance (Terminal only) */}
        {!isMidterm && data.attendance && (
          <div className="border border-orange-500 mb-2">
            <div className="bg-gradient-to-r from-orange-500 to-orange-300 text-white text-center py-1 px-2 font-bold text-[10px]">
              ATTENDANCE RECORD
            </div>
            <div className="text-[9px] p-2 space-y-1">
              <div>
                <strong>Times Opened:</strong> {data.attendance.times_school_opened}
              </div>
              <div>
                <strong>Times Present:</strong> {data.attendance.times_present}
              </div>
              <div>
                <strong>Times Absent:</strong> {data.attendance.times_absent}
              </div>
              <div>
                <strong>Percentage:</strong> {data.attendance.percentage.toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Class Teacher's Comment */}
        <div className="border border-black mb-2">
          <div className="bg-black text-white text-center py-1 px-2 font-bold text-[10px]">
            CLASS TEACHER'S COMMENT
          </div>
          <div className="text-[9px] p-2">
            <p className="mb-2">{data.teacher_comment}</p>
            <div>
              <strong>Name:</strong> {data.teacher_name}
            </div>
            <div className="mt-1">
              <strong>Signature:</strong> _______________
            </div>
          </div>
        </div>

        {/* Principal's Comment */}
        <div className="border border-black mb-2">
          <div className="bg-black text-white text-center py-1 px-2 font-bold text-[10px]">
            PRINCIPAL'S COMMENT
          </div>
          <div className="text-[9px] p-2">
            <p className="mb-2">{data.principal_comment}</p>
            <div>
              <strong>Name:</strong> {data.principal_name}
            </div>
            <div className="mt-1">
              <strong>Signature:</strong> _______________
            </div>
          </div>
        </div>

        {/* Director's Signature */}
        <div className="border border-black p-2 text-center text-[9px] mb-2">
          <strong>Signed and stamped by the director: {data.director_name || '_____________________'}</strong>
        </div>

        {/* Footer */}
        <div className="border border-black p-2 text-center text-[8px] bg-gray-50">
          {data.next_term_begins && (
            <div className="mb-1">
              <strong>Next Term Begins:</strong> {new Date(data.next_term_begins).toLocaleDateString('en-GB')}
            </div>
          )}
          <div className="italic">
            This report is valid only with the school's official stamp and signature
          </div>
        </div>
      </div>
    );
  }
);

ReportCardTemplate.displayName = 'ReportCardTemplate';