import { useState, useEffect } from 'react';
import { AlertTriangle, Clock, Shield, CheckCircle2, X } from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface CBTRulesAcknowledgmentProps {
  examTitle: string;
  onAccept: () => void;
  onCancel: () => void;
}

interface CBTSettings {
  enable_violation_tracking: boolean;
  tab_switch_penalty_seconds: number;
  fullscreen_exit_penalty_seconds: number;
  max_violations_before_auto_submit: number;
  exam_rules_text: string;
}

export function CBTRulesAcknowledgment({ examTitle, onAccept, onCancel }: CBTRulesAcknowledgmentProps) {
  const [accepted, setAccepted] = useState(false);
  const [settings, setSettings] = useState<CBTSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/settings/public`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (data.settings) {
        setSettings(data.settings);
      }
    } catch (error) {
      console.error('Error fetching CBT settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds >= 60) {
      const minutes = Math.floor(seconds / 60);
      const secs = seconds % 60;
      return secs > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''} ${secs} second${secs > 1 ? 's' : ''}` : `${minutes} minute${minutes > 1 ? 's' : ''}`;
    }
    return `${seconds} second${seconds > 1 ? 's' : ''}`;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mb-4"></div>
            <p className="text-gray-600">Loading exam rules...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl max-h-[90vh] flex flex-col">
        <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white flex-shrink-0">
          <div className="flex items-start gap-4">
            <Shield className="w-8 h-8 flex-shrink-0 mt-1" />
            <div className="flex-1">
              <CardTitle className="text-2xl mb-2">Exam Rules & Regulations</CardTitle>
              <p className="text-blue-100 text-sm">{examTitle}</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Alert Warning */}
          <Alert variant="destructive">
            <AlertTriangle className="h-5 w-5" />
            <AlertDescription>
              <strong>Important:</strong> Please read all rules carefully before starting the exam. Violations will be tracked and penalized.
            </AlertDescription>
          </Alert>

          {/* Exam Rules Text */}
          {settings?.exam_rules_text && (
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
              <pre className="whitespace-pre-wrap font-sans text-gray-800 text-sm leading-relaxed">
                {settings.exam_rules_text}
              </pre>
            </div>
          )}

          {/* Violation Penalties */}
          {settings?.enable_violation_tracking && (
            <div className="space-y-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-orange-600" />
                Violation Penalties
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                  <p className="font-medium text-orange-900 text-sm mb-1">Tab Switch</p>
                  <p className="text-orange-700 text-xs">
                    <strong>{formatTime(settings.tab_switch_penalty_seconds)}</strong> will be deducted from your exam time
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <p className="font-medium text-red-900 text-sm mb-1">Fullscreen Exit</p>
                  <p className="text-red-700 text-xs">
                    <strong>{formatTime(settings.fullscreen_exit_penalty_seconds)}</strong> will be deducted from your exam time
                  </p>
                </div>
              </div>

              {settings.max_violations_before_auto_submit > 0 && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-sm">
                    <strong>Auto-Submission:</strong> Your exam will be automatically submitted after{' '}
                    <strong>{settings.max_violations_before_auto_submit}</strong> violation{settings.max_violations_before_auto_submit > 1 ? 's' : ''}.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Key Points */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-3 text-sm">📋 Key Points to Remember:</h3>
            <ul className="space-y-2 text-blue-800 text-xs">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>Ensure you have a stable internet connection throughout the exam</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>Do not refresh or close your browser during the exam</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>Your answers are auto-saved periodically</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 flex-shrink-0 mt-0.5 text-blue-600" />
                <span>All violations are recorded and reviewed by your teacher</span>
              </li>
            </ul>
          </div>

          {/* Acknowledgment Checkbox */}
          <div className="bg-white border-2 border-blue-200 rounded-lg p-4">
            <label className="flex items-start gap-3 cursor-pointer">
              <Checkbox
                id="accept-rules"
                checked={accepted}
                onCheckedChange={(checked) => setAccepted(checked as boolean)}
                className="mt-1"
              />
              <div className="flex-1">
                <label htmlFor="accept-rules" className="font-medium text-gray-900 cursor-pointer text-sm">
                  I have read and understood all the exam rules and regulations
                </label>
                <p className="text-gray-600 text-xs mt-1">
                  By checking this box, you agree to abide by all the rules stated above. Any violations will be subject to penalties.
                </p>
              </div>
            </label>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between gap-4 pt-4 border-t">
            <Button
              onClick={onCancel}
              variant="outline"
              className="flex items-center gap-2"
            >
              <X className="w-4 h-4" />
              Cancel
            </Button>
            <Button
              onClick={onAccept}
              disabled={!accepted}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4" />
              I Accept - Start Exam
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}