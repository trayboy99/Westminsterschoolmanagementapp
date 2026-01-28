import { forwardRef } from 'react';
import { User, BookOpen, Calendar, FileText, ClipboardCheck, Users, GraduationCap, MapPin, Mail, Phone, Globe } from 'lucide-react';

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
  result_type?: 'midterm' | 'terminal';
  attendance?: {
    times_school_opened: number;
    times_present: number;
    times_absent: number;
    percentage: number;
  };
  class_population?: number;
}

interface ModernReportCardTemplateProps {
  data: ReportCardData;
}

export const ModernReportCardTemplate = forwardRef<HTMLDivElement, ModernReportCardTemplateProps>(
  ({ data }, ref) => {
    const isMidterm = data.result_type === 'midterm' || 
                      data.exam_type?.toLowerCase().includes('midterm') || 
                      data.exam_type?.toLowerCase().includes('mid-term') ||
                      data.exam_type?.toLowerCase().includes('mid term') ||
                      data.exam_type?.toLowerCase().includes('first ca');
    
    const reportTitle = isMidterm ? 'MIDTERM REPORT CARD' : 'TERMINAL REPORT CARD';
    const reportTypeLabel = isMidterm ? 'Midterm Report' : 'Terminal Report';
    
    const ca1Max = isMidterm ? 10 : 20;
    const ca2Max = isMidterm ? 10 : 20;
    const examMax = isMidterm ? 20 : 60;
    const totalMax = isMidterm ? 40 : 100;
    
    const getInitials = () => {
      const first = data.student.first_name?.[0] || '';
      const last = data.student.last_name?.[0] || '';
      return `${first}${last}`.toUpperCase();
    };

    const getAttendanceStatus = () => {
      if (!data.attendance) return { label: 'N/A', color: '#6b7280' };
      const percentage = data.attendance.percentage;
      
      if (percentage >= 90) return { label: 'Excellent', color: '#16a34a' };
      if (percentage >= 75) return { label: 'Very Good', color: '#2563eb' };
      if (percentage >= 60) return { label: 'Satisfactory', color: '#ca8a04' };
      return { label: 'Unsatisfactory', color: '#dc2626' };
    };

    const getAttendanceLevel = () => {
      if (!data.attendance) return { label: 'N/A', color: '#6b7280' };
      const percentage = data.attendance.percentage;
      
      if (percentage >= 90) return { label: 'High', color: '#16a34a' };
      if (percentage >= 75) return { label: 'Medium', color: '#2563eb' };
      if (percentage >= 60) return { label: 'Average', color: '#ca8a04' };
      return { label: 'Low', color: '#dc2626' };
    };

    const attendanceStatus = getAttendanceStatus();
    const attendanceLevel = getAttendanceLevel();

    return (
      <div 
        ref={ref}
        style={{
          width: '100%',
          backgroundColor: '#f8fafc',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial, sans-serif',
          overflowX: 'auto',
          overflowY: 'visible'
        }}
      >
        <style>{`
          @media (max-width: 768px) {
            .mobile-scale {
              font-size: 10pt;
              min-width: 800px;
            }
            .mobile-scale h1 {
              font-size: 28pt !important;
            }
            .mobile-scale h2 {
              font-size: 20pt !important;
            }
            .mobile-scale h3 {
              font-size: 14pt !important;
            }
            .mobile-scale h4 {
              font-size: 12pt !important;
            }
            .mobile-scale .school-logo {
              width: 80px !important;
              height: 80px !important;
            }
            .mobile-scale .student-photo {
              width: 80px !important;
              height: 90px !important;
            }
            .mobile-scale .avatar-lg {
              width: 60px !important;
              height: 60px !important;
              font-size: 20pt !important;
            }
            .mobile-scale .card-icon {
              width: 40px !important;
              height: 40px !important;
              font-size: 24pt !important;
            }
            .mobile-scale .card-padding {
              padding: 12px !important;
            }
            .mobile-scale .section-gap {
              gap: 12px !important;
            }
            .mobile-scale .border-frame {
              border-width: 4px !important;
              padding: 20px !important;
            }
          }
        `}</style>
        
        <div className="mobile-scale"
          style={{
            maxWidth: '210mm',
            minHeight: '297mm',
            margin: '0 auto',
            padding: '0',
            fontSize: '10pt',
            lineHeight: '1.5',
            color: '#1e293b',
            backgroundColor: '#f8fafc'
          }}
        >
          {/* Blue Border Frame */}
          <div className="border-frame" style={{
            border: '4px solid #3b82f6',
            borderRadius: '12px',
            padding: '20px',
            backgroundColor: '#ffffff',
            minHeight: '277mm'
          }}>
            
            {/* School Header - Always Horizontal */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '20px',
              borderBottom: '3px solid #3b82f6',
              marginBottom: '20px',
              backgroundColor: '#ffffff'
            }}>
              {/* School Logo */}
              {data.school.logo_url && (
                <div style={{ flexShrink: 0 }}>
                  <img 
                    src={data.school.logo_url} 
                    alt="School Logo" 
                    className="school-logo"
                    style={{ 
                      width: '80px', 
                      height: '80px', 
                      objectFit: 'contain'
                    }} 
                  />
                </div>
              )}

              {/* School Info */}
              <div style={{ flex: 1, textAlign: 'center', padding: '0 20px' }}>
                <h1 style={{ 
                  fontSize: '28pt', 
                  fontWeight: '700', 
                  color: '#1e40af',
                  margin: '0 0 4px 0',
                  letterSpacing: '-0.5px',
                  lineHeight: '1.1'
                }}>
                  {data.school.school_name || 'SCHOOL NAME'}
                </h1>
                {data.school.motto && (
                  <p style={{ 
                    fontSize: '11pt', 
                    fontStyle: 'italic', 
                    color: '#7c3aed',
                    margin: '0 0 6px 0',
                    fontWeight: '500',
                    lineHeight: '1.2'
                  }}>
                    "{data.school.motto}"
                  </p>
                )}
                
                {/* Contact Info */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'center',
                  columnGap: '20px',
                  rowGap: '0px',
                  flexWrap: 'wrap',
                  fontSize: '9pt',
                  color: '#64748b',
                  lineHeight: '1.2'
                }}>
                  {data.school.address && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#3b82f6' }}>📍</span>
                      <span>{data.school.address}</span>
                    </div>
                  )}
                  {data.school.email && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#3b82f6' }}>✉️</span>
                      <span>{data.school.email}</span>
                    </div>
                  )}
                  {data.school.phone && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#3b82f6' }}>📞</span>
                      <span>{data.school.phone}</span>
                    </div>
                  )}
                  {data.school.website && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <span style={{ color: '#3b82f6' }}>🌐</span>
                      <span>{data.school.website}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Student Photo */}
              {data.student.photo_url ? (
                <div style={{ flexShrink: 0 }}>
                  <img 
                    src={data.student.photo_url} 
                    alt="Student" 
                    className="student-photo"
                    style={{ 
                      width: '80px', 
                      height: '90px', 
                      objectFit: 'cover',
                      border: '3px solid #e5e7eb',
                      borderRadius: '8px'
                    }} 
                  />
                </div>
              ) : (
                <div style={{ flexShrink: 0, width: '80px' }}></div>
              )}
            </div>

            {/* Report Title */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '16px',
              backgroundColor: '#eff6ff',
              padding: '8px 16px',
              borderRadius: '8px',
              marginBottom: '16px',
              border: '1px solid #bfdbfe'
            }}>
              <h2 style={{
                fontSize: '20pt',
                fontWeight: '700',
                color: '#1e40af',
                margin: 0,
                textTransform: 'uppercase',
                letterSpacing: '1px',
                lineHeight: '1'
              }}>
                {reportTitle}
              </h2>
              <p style={{
                fontSize: '11pt',
                color: '#3b82f6',
                margin: 0,
                fontWeight: '500',
                whiteSpace: 'nowrap',
                lineHeight: '1'
              }}>
                {data.session} • {data.term}
              </p>
            </div>

            {/* Student Information Section */}
            <div style={{
              marginBottom: '20px'
            }}>
              {/* Section Header with Avatar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div>
                  <h3 style={{
                    fontSize: '14pt',
                    fontWeight: '700',
                    color: '#1e293b',
                    margin: '0 0 2px 0'
                  }}>
                    Student Information
                  </h3>
                  <p style={{
                    fontSize: '9pt',
                    color: '#64748b',
                    margin: 0
                  }}>
                    Personal & Academic Details
                  </p>
                </div>
              </div>

              {/* Info Cards Grid - 6 columns always */}
              <div className="section-gap" style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '8px'
              }}>
                {/* Full Name Card - Spans 2 columns */}
                <div className="card-padding" style={{
                  gridColumn: 'span 2',
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}>
                  <p style={{
                    fontSize: '8pt',
                    color: '#64748b',
                    marginBottom: '2px',
                    fontWeight: '500'
                  }}>
                    Full Name
                  </p>
                  <p style={{
                    fontSize: '11pt',
                    color: '#1e293b',
                    fontWeight: '600',
                    wordWrap: 'break-word',
                    lineHeight: '1.2',
                    overflow: 'visible'
                  }}>
                    {data.student.last_name} {data.student.first_name} {data.student.middle_name || ''}
                  </p>
                </div>

                {/* Class Card */}
                <div className="card-padding" style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}>
                  <p style={{
                    fontSize: '8pt',
                    color: '#64748b',
                    marginBottom: '2px',
                    fontWeight: '500'
                  }}>
                    Class
                  </p>
                  <p style={{
                    fontSize: '11pt',
                    color: '#1e293b',
                    fontWeight: '600',
                    lineHeight: '1.2'
                  }}>
                    {data.student.class_name}
                  </p>
                </div>

                {/* Gender Card */}
                <div className="card-padding" style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}>
                  <p style={{
                    fontSize: '8pt',
                    color: '#64748b',
                    marginBottom: '2px',
                    fontWeight: '500'
                  }}>
                    Gender
                  </p>
                  <p style={{
                    fontSize: '11pt',
                    color: '#1e293b',
                    fontWeight: '600',
                    textTransform: 'capitalize',
                    lineHeight: '1.2'
                  }}>
                    {data.student.gender}
                  </p>
                </div>

                {/* Academic Session Card */}
                <div className="card-padding" style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}>
                  <p style={{
                    fontSize: '8pt',
                    color: '#64748b',
                    marginBottom: '2px',
                    fontWeight: '500'
                  }}>
                    Academic Session
                  </p>
                  <p style={{
                    fontSize: '11pt',
                    color: '#1e293b',
                    fontWeight: '600',
                    lineHeight: '1.2'
                  }}>
                    {data.session}
                  </p>
                </div>

                {/* Term Card */}
                <div className="card-padding" style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}>
                  <p style={{
                    fontSize: '8pt',
                    color: '#64748b',
                    marginBottom: '2px',
                    fontWeight: '500'
                  }}>
                    Term
                  </p>
                  <p style={{
                    fontSize: '11pt',
                    color: '#1e293b',
                    fontWeight: '600',
                    lineHeight: '1.2'
                  }}>
                    {data.term}
                  </p>
                </div>

                {/* Report Type Card */}
                <div className="card-padding" style={{
                  backgroundColor: '#ffffff',
                  border: '2px solid #e5e7eb',
                  borderRadius: '6px',
                  padding: '8px 12px'
                }}>
                  <p style={{
                    fontSize: '8pt',
                    color: '#64748b',
                    marginBottom: '2px',
                    fontWeight: '500'
                  }}>
                    Report Type
                  </p>
                  <p style={{
                    fontSize: '11pt',
                    color: '#1e293b',
                    fontWeight: '600',
                    lineHeight: '1.2'
                  }}>
                    {reportTypeLabel}
                  </p>
                </div>
              </div>
            </div>

            {/* Attendance Section */}
            {data.attendance && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 12px',
                backgroundColor: '#fef3f2',
                border: '2px solid #f87171',
                borderRadius: '6px',
                marginBottom: '12px',
                fontSize: '9pt'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ fontWeight: '700', color: '#4b5563' }}>Attendance:</span>
                  <span style={{ fontWeight: '700', color: '#1e40af' }}>
                    {data.attendance.times_present}/{data.attendance.times_school_opened} days
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span 
                    style={{ 
                      fontWeight: '700', 
                      color: data.attendance.percentage >= 75 ? '#16a34a' : '#ef4444' 
                    }}
                  >
                    {data.attendance.percentage.toFixed(0)}%
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ color: attendanceStatus.color, fontWeight: '600' }}>
                    {attendanceStatus.label}
                  </span>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span style={{ color: attendanceLevel.color, fontWeight: '600' }}>
                    {attendanceLevel.label}
                  </span>
                </div>
              </div>
            )}

            {/* Academic Performance Section */}
            <div style={{
              marginBottom: '12px'
            }}>
              <div style={{
                marginBottom: '8px'
              }}>
                <h3 style={{ 
                  fontSize: '14pt', 
                  fontWeight: '700', 
                  color: '#1e40af',
                  margin: 0
                }}>
                  Academic Performance
                </h3>
              </div>

              {/* Subjects Table */}
              <div style={{
                overflow: 'hidden',
                borderRadius: '8px',
                border: '2px solid #e5e7eb'
              }}>
                <table style={{
                  width: '100%',
                  borderCollapse: 'collapse',
                  fontSize: '9pt'
                }}>
                  <thead>
                    <tr style={{
                      background: 'linear-gradient(to right, #6366f1, #818cf8)',
                      color: '#ffffff'
                    }}>
                      <th style={{ padding: '8px 12px', textAlign: 'left', fontWeight: '700' }}>Subject</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', width: '50px' }}>
                        CA1<br/>({ca1Max})
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', width: '50px' }}>
                        CA2<br/>({ca2Max})
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', width: '50px' }}>
                        Exam<br/>({examMax})
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', width: '50px' }}>
                        Total<br/>({totalMax})
                      </th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', width: '30px' }}>Grade</th>
                      <th style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700' }}>Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.results.map((subject, index) => {
                      return (
                        <tr 
                          key={index} 
                          style={index % 2 === 0 ? { backgroundColor: '#ffffff' } : { backgroundColor: '#f9fafb' }}
                        >
                          <td style={{ padding: '8px 12px', fontWeight: '700', color: '#1e293b' }}>
                            {subject.subject_name}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                            {subject.ca1}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                            {subject.ca2}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                            {subject.exam_score}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', fontWeight: '700', color: '#1e40af' }}>
                            {subject.total}
                          </td>
                          <td style={{ 
                            padding: '4px 6px', 
                            textAlign: 'center', 
                            fontWeight: '700',
                            fontSize: '10pt',
                            color: subject.grade === 'A' ? '#16a34a' : 
                                   subject.grade === 'B' ? '#3b82f6' :
                                   subject.grade === 'C' ? '#f59e0b' :
                                   subject.grade === 'D' ? '#f97316' : '#ef4444'
                          }}>
                            {subject.grade}
                          </td>
                          <td style={{ padding: '8px 12px', textAlign: 'center', color: '#64748b' }}>
                            {subject.remark}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Performance Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: '#eff6ff',
                border: '2px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h4 style={{ 
                  fontSize: '12pt', 
                  fontWeight: '700', 
                  color: '#1e40af',
                  marginBottom: '12px'
                }}>
                  Performance Summary
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '9pt'
                }}>
                  <div>
                    <span style={{ color: '#64748b' }}>Average Score:</span>
                    <p style={{ 
                      fontSize: '20pt', 
                      fontWeight: '700', 
                      color: '#1e40af',
                      marginTop: '4px'
                    }}>
                      {data.percentage_score.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <span style={{ color: '#64748b' }}>Overall Grade:</span>
                    <p style={{ 
                      fontSize: '20pt', 
                      fontWeight: '700', 
                      color: data.overall_grade === 'A' ? '#16a34a' : 
                             data.overall_grade === 'B' ? '#3b82f6' :
                             data.overall_grade === 'C' ? '#f59e0b' : '#ef4444',
                      marginTop: '4px'
                    }}>
                      {data.overall_grade}
                    </p>
                  </div>
                </div>
                <div style={{ marginTop: '12px' }}>
                  <span style={{ fontSize: '9pt', color: '#64748b' }}>Remark:</span>
                  <p style={{ 
                    fontSize: '12pt', 
                    fontWeight: '600', 
                    color: '#1e40af',
                    marginTop: '4px'
                  }}>
                    {data.overall_remark}
                  </p>
                </div>
              </div>

              {/* Grading Scale */}
              <div style={{
                backgroundColor: '#fff9db',
                border: '2px solid #f59e0b',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h4 style={{ 
                  fontSize: '12pt', 
                  fontWeight: '700', 
                  color: '#9a3412',
                  marginBottom: '12px'
                }}>
                  Grading Scale
                </h4>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  fontSize: '9pt'
                }}>
                  {data.grade_system.slice(0, 5).map((grade, index) => (
                    <div 
                      key={index}
                      style={{
                        backgroundColor: '#ffffff',
                        border: '2px solid #f59e0b',
                        borderRadius: '6px',
                        padding: '8px 12px'
                      }}
                    >
                      <strong style={{ color: '#9a3412' }}>{grade.grade}</strong>: {grade.min_score}-{grade.max_score} ({grade.remark})
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comments Section */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px',
              marginBottom: '12px'
            }}>
              {/* Teacher's Comment */}
              <div style={{
                backgroundColor: '#fef3f2',
                border: '2px solid #f87171',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h4 style={{ 
                  fontSize: '11pt', 
                  fontWeight: '700', 
                  color: '#991b1b',
                  marginBottom: '6px'
                }}>
                  Class Teacher's Comment
                </h4>
                <p style={{ 
                  fontSize: '9pt', 
                  color: '#1e293b',
                  marginBottom: '8px',
                  lineHeight: '1.4',
                  minHeight: '24px'
                }}>
                  {data.teacher_comment || 'No comment provided'}
                </p>
                <div style={{ fontSize: '8pt', color: '#64748b' }}>
                  <strong>Name:</strong> {data.teacher_name}
                </div>
                <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '2px' }}>
                  <strong>Signature:</strong> _____________________
                </div>
              </div>

              {/* Principal's Comment */}
              <div style={{
                backgroundColor: '#f5f3ff',
                border: '2px solid #9333ea',
                borderRadius: '6px',
                padding: '8px 12px',
                display: 'flex',
                flexDirection: 'column'
              }}>
                <h4 style={{ 
                  fontSize: '11pt', 
                  fontWeight: '700', 
                  color: '#6366f1',
                  marginBottom: '6px'
                }}>
                  Principal's Comment
                </h4>
                <p style={{ 
                  fontSize: '9pt', 
                  color: '#1e293b',
                  marginBottom: '8px',
                  lineHeight: '1.4',
                  minHeight: '24px'
                }}>
                  {data.principal_comment || 'No comment provided'}
                </p>
                <div style={{ fontSize: '8pt', color: '#64748b' }}>
                  <strong>Name:</strong> {data.principal_name}
                </div>
                <div style={{ fontSize: '8pt', color: '#64748b', marginTop: '2px' }}>
                  <strong>Signature:</strong> _____________________
                </div>
              </div>
            </div>

            {/* Next Term */}
            {data.next_term_begins && (
              <div style={{
                textAlign: 'center',
                backgroundColor: '#f5f3ff',
                border: '2px solid #9333ea',
                borderRadius: '6px',
                padding: '6px 12px',
                marginBottom: '8px'
              }}>
                <span style={{ 
                  fontSize: '9pt', 
                  fontWeight: '700', 
                  color: '#6366f1'
                }}>
                  NEXT TERM BEGINS: {new Date(data.next_term_begins).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </span>
              </div>
            )}

            {/* Footer */}
            <div style={{
              textAlign: 'center',
              paddingTop: '12px',
              borderTop: '2px solid #e5e7eb',
              fontSize: '9pt',
              color: '#64748b'
            }}>
              <p style={{ marginBottom: '8px', fontStyle: 'italic' }}>
                "Education is the passport to the future, for tomorrow belongs to those who prepare for it today"
              </p>
              <p style={{ margin: 0, fontWeight: '600' }}>
                Designed and Developed by <span style={{ color: '#3b82f6' }}>Ororho Brume Tracy</span>
              </p>
            </div>

          </div>
        </div>
      </div>
    );
  }
);

ModernReportCardTemplate.displayName = 'ModernReportCardTemplate';