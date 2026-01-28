import { useState, useEffect } from 'react';
import { ComplianceTracker } from '../uploads/ComplianceTracker';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface TeacherCompliance {
  teacherId: string;
  teacherName: string;
  email: string;
  subjects: string[];
  totalRequired: number;
  submitted: number;
  pending: number;
  overdue: number;
  complianceRate: number;
  lastSubmission?: Date;
  status: 'compliant' | 'partial' | 'non-compliant' | 'overdue';
  uploads: UploadSummary[];
}

interface UploadSummary {
  id: string;
  title: string;
  subject: string;
  week: number;
  term: string;
  session: string;
  uploadType: string;
  status: 'submitted' | 'pending' | 'overdue';
  submittedAt?: Date;
  deadline: Date;
  daysOverdue?: number;
  uploadedByAdmin?: boolean;
  adminId?: string | null;
}

interface DirectorUploadsComplianceProps {
  onBack?: () => void;
}

export function DirectorUploadsCompliance({ onBack }: DirectorUploadsComplianceProps) {
  const [loading, setLoading] = useState(true);
  const [complianceData, setComplianceData] = useState<TeacherCompliance[]>([]);
  const [activeSession, setActiveSession] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    fetchActiveSessionAndTerm();
  }, []);

  useEffect(() => {
    if (activeSession && activeTerm) {
      fetchComplianceData();
    }
  }, [activeSession, activeTerm]);

  const fetchActiveSessionAndTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/available-filters`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();
      console.log('[DirectorUploadsCompliance] Active session/term response:', data);
      
      if (data.success) {
        setActiveSession(data.activeSession || '');
        setActiveTerm(data.activeTerm || '');
      }
    } catch (error) {
      console.error('[DirectorUploadsCompliance] Error fetching active session/term:', error);
    }
  };

  const fetchComplianceData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to view compliance data');
        return;
      }

      // Build query params with session and term filters
      const params = new URLSearchParams();
      if (activeSession) {
        params.append('session', activeSession);
      }
      if (activeTerm) {
        params.append('term', activeTerm);
      }

      const queryString = params.toString();
      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads-compliance${queryString ? `?${queryString}` : ''}`;

      console.log('[DirectorUploadsCompliance] Fetching compliance with filters:', { activeSession, activeTerm });
      console.log('[DirectorUploadsCompliance] 🚀 FULL URL:', url);
      console.log('[DirectorUploadsCompliance] 🚀 Query String:', queryString);

      const response = await fetch(url, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const data = await response.json();
      
      console.log('[DirectorUploadsCompliance] 📦 Response data:', data);
      console.log('[DirectorUploadsCompliance] 📦 Compliance count:', data.compliance?.length);

      if (data.success) {
        setComplianceData(data.compliance);
      } else {
        toast.error('Failed to load compliance data');
        console.error('Compliance data error:', data.error);
      }
    } catch (error) {
      console.error('Error fetching compliance data:', error);
      toast.error('Error loading compliance data');
    } finally {
      setLoading(false);
    }
  };

  const handleSendReminder = async (teacherId: string, uploadId?: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/send-upload-reminder`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          },
          body: JSON.stringify({ teacherId, uploadId })
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Reminder sent successfully!');
      } else {
        toast.error('Failed to send reminder');
      }
    } catch (error) {
      console.error('Error sending reminder:', error);
      toast.error('Error sending reminder');
    }
  };

  const handleExportReport = () => {
    // TODO: Implement CSV/PDF export
    toast.info('Export feature coming soon');
  };

  const handleViewDetails = (teacherId: string) => {
    // TODO: Navigate to teacher details or show modal
    console.log('View details for teacher:', teacherId);
    toast.info('Detailed view coming soon');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="text-center">
              <Loader2 className="h-12 w-12 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-slate-600">Loading compliance data...</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Compliance Record
        </Button>
      )}
      <ComplianceTracker
        complianceData={complianceData}
        onSendReminder={handleSendReminder}
        onExportReport={handleExportReport}
        onViewDetails={handleViewDetails}
        hideReminders={true}
      />
    </div>
  );
}