import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { 
  Plus, 
  Trash2, 
  Save, 
  ClipboardCheck, 
  Calendar, 
  AlertCircle,
  Info
} from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface GradeLevel {
  min: number;
  max: number;
  grade: string;
  remark: string;
}

interface AttendanceConfig {
  grades: GradeLevel[];
  intervention_threshold: number;
  updated_at?: string;
  updated_by?: string;
}

interface SchoolCalendar {
  session: string;
  term: string;
  start_date: string;
  end_date: string;
  total_school_days: number;
  weeks: number;
  updated_at?: string;
  updated_by?: string;
}

export function AttendanceSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Grading configuration
  const [gradingConfig, setGradingConfig] = useState<AttendanceConfig>({
    grades: [
      { min: 95, max: 100, grade: "Excellent", remark: "Outstanding attendance! Keep it up!" },
      { min: 90, max: 94, grade: "Very Good", remark: "Very good attendance record." },
      { min: 85, max: 89, grade: "Good", remark: "Good attendance. Maintain this standard." },
      { min: 80, max: 84, grade: "Fair", remark: "Fair attendance. Try to improve." },
      { min: 75, max: 79, grade: "Poor", remark: "Poor attendance. Significant improvement needed." },
      { min: 0, max: 74, grade: "Unsatisfactory", remark: "Unsatisfactory. This may affect promotion." }
    ],
    intervention_threshold: 85
  });

  // School calendar for current session/term
  const [availableSessions, setAvailableSessions] = useState<any[]>([]);
  const [availableTerms, setAvailableTerms] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState('');
  const [selectedTerm, setSelectedTerm] = useState('');
  
  const [calendar, setCalendar] = useState<SchoolCalendar>({
    session: '',
    term: '',
    start_date: '',
    end_date: '',
    total_school_days: 67,
    weeks: 13
  });

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  useEffect(() => {
    // When session/term changes, fetch calendar for that session/term
    if (selectedSession && selectedTerm) {
      fetchCalendarForSessionTerm(selectedSession, selectedTerm);
    }
  }, [selectedSession, selectedTerm]);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch grading config
      const gradingRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/grading-config`,
        { headers }
      );
      const gradingResult = await gradingRes.json();
      
      if (gradingResult.success && gradingResult.config) {
        setGradingConfig(gradingResult.config);
        console.log('[AttendanceSettings] Grading config loaded:', gradingResult.config);
      }

      // Fetch available sessions and terms
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const sessionResult = await sessionRes.json();
      
      if (sessionResult.success) {
        setAvailableSessions(sessionResult.sessions || []);
        setAvailableTerms(sessionResult.terms || []);
        
        // Auto-select current session/term
        const currentSession = sessionResult.sessions?.find((s: any) => s.is_current);
        const currentTerm = sessionResult.terms?.find((t: any) => t.is_current);
        
        if (currentSession) {
          setSelectedSession(currentSession.session_name);
          setCalendar(prev => ({ ...prev, session: currentSession.session_name }));
        }
        if (currentTerm) {
          setSelectedTerm(currentTerm.term_name);
          setCalendar(prev => ({ ...prev, term: currentTerm.term_name }));
        }
        
        console.log('[AttendanceSettings] Auto-loaded current session/term:', {
          session: currentSession?.session_name,
          term: currentTerm?.term_name
        });
      }

    } catch (error) {
      console.error('[AttendanceSettings] Error:', error);
      toast.error('Failed to load attendance settings');
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarForSessionTerm = async (session: string, term: string) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const headers = {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json'
      };

      const calendarRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/calendar?session=${encodeURIComponent(session)}&term=${encodeURIComponent(term)}`,
        { headers }
      );
      const calendarResult = await calendarRes.json();
      
      if (calendarResult.success && calendarResult.calendar) {
        setCalendar({
          ...calendarResult.calendar,
          session,  // Ensure session is set
          term      // Ensure term is set
        });
        console.log('[AttendanceSettings] Calendar loaded for', session, term, '- Total days:', calendarResult.calendar.total_school_days);
      } else {
        // Reset to default for new session/term
        setCalendar({
          session,
          term,
          start_date: '',
          end_date: '',
          total_school_days: 67,
          weeks: 13
        });
        console.log('[AttendanceSettings] No existing calendar - using defaults for', session, term);
      }
    } catch (error) {
      console.error('[AttendanceSettings] Error fetching calendar:', error);
    }
  };

  const handleSaveGradingConfig = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/grading-config`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            grades: gradingConfig.grades,
            intervention_threshold: gradingConfig.intervention_threshold
          })
        }
      );
      const result = await res.json();
      
      if (result.success) {
        toast.success('Attendance grading configuration saved successfully!');
        console.log('[AttendanceSettings] Grading config saved');
      } else {
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('[AttendanceSettings] Error saving grading config:', error);
      toast.error('Failed to save grading configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveCalendar = async () => {
    try {
      setSaving(true);

      if (!calendar.session || !calendar.term) {
        toast.error('Please select session and term');
        return;
      }

      if (!calendar.total_school_days || calendar.total_school_days <= 0) {
        toast.error('Please enter valid total school days');
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Not authenticated');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/attendance/calendar`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(calendar)
        }
      );
      const result = await res.json();
      
      if (result.success) {
        toast.success(`School calendar saved for ${calendar.session} - ${calendar.term}!`);
        console.log('[AttendanceSettings] Calendar saved');
      } else {
        toast.error(result.error || 'Failed to save calendar');
      }
    } catch (error) {
      console.error('[AttendanceSettings] Error saving calendar:', error);
      toast.error('Failed to save school calendar');
    } finally {
      setSaving(false);
    }
  };

  const updateGradeLevel = (index: number, field: keyof GradeLevel, value: any) => {
    const newGrades = [...gradingConfig.grades];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setGradingConfig({ ...gradingConfig, grades: newGrades });
  };

  const addGradeLevel = () => {
    const newGrades = [...gradingConfig.grades];
    newGrades.push({ min: 0, max: 100, grade: '', remark: '' });
    setGradingConfig({ ...gradingConfig, grades: newGrades });
  };

  const removeGradeLevel = (index: number) => {
    if (gradingConfig.grades.length <= 1) {
      toast.error('You must have at least one grade level');
      return;
    }
    const newGrades = gradingConfig.grades.filter((_, i) => i !== index);
    setGradingConfig({ ...gradingConfig, grades: newGrades });
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Grading Configuration */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardCheck className="h-5 w-5" />
                Attendance Grading System
              </CardTitle>
              <CardDescription className="mt-2">
                Configure how attendance percentages are graded on report cards
              </CardDescription>
            </div>
            <Button 
              onClick={handleSaveGradingConfig} 
              disabled={saving}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Grading'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Intervention Threshold */}
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="h-5 w-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <Label className="text-amber-900 font-medium mb-2 block">
                  Intervention Threshold (%)
                </Label>
                <Input
                  type="number"
                  value={gradingConfig.intervention_threshold}
                  onChange={(e) => setGradingConfig({
                    ...gradingConfig,
                    intervention_threshold: parseInt(e.target.value) || 85
                  })}
                  min={0}
                  max={100}
                  className="max-w-[120px] bg-white"
                />
                <p className="text-xs text-amber-700 mt-2">
                  Students below this percentage will be flagged for intervention
                </p>
              </div>
            </div>
          </div>

          {/* Grade Levels */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-base">Grade Levels</Label>
              <Button
                onClick={addGradeLevel}
                variant="outline"
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Grade Level
              </Button>
            </div>

            {gradingConfig.grades.map((gradeLevel, index) => (
              <Card key={index} className="p-4 bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
                  {/* Min % */}
                  <div className="md:col-span-2">
                    <Label className="text-xs mb-1 block">Min %</Label>
                    <Input
                      type="number"
                      value={gradeLevel.min}
                      onChange={(e) => updateGradeLevel(index, 'min', parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                      className="h-9"
                    />
                  </div>

                  {/* Max % */}
                  <div className="md:col-span-2">
                    <Label className="text-xs mb-1 block">Max %</Label>
                    <Input
                      type="number"
                      value={gradeLevel.max}
                      onChange={(e) => updateGradeLevel(index, 'max', parseInt(e.target.value) || 100)}
                      min={0}
                      max={100}
                      className="h-9"
                    />
                  </div>

                  {/* Grade */}
                  <div className="md:col-span-2">
                    <Label className="text-xs mb-1 block">Grade</Label>
                    <Input
                      value={gradeLevel.grade}
                      onChange={(e) => updateGradeLevel(index, 'grade', e.target.value)}
                      placeholder="e.g., Excellent"
                      className="h-9"
                    />
                  </div>

                  {/* Remark */}
                  <div className="md:col-span-5">
                    <Label className="text-xs mb-1 block">Remark (for report card)</Label>
                    <Input
                      value={gradeLevel.remark}
                      onChange={(e) => updateGradeLevel(index, 'remark', e.target.value)}
                      placeholder="e.g., Outstanding attendance!"
                      className="h-9"
                    />
                  </div>

                  {/* Delete Button */}
                  <div className="md:col-span-1 flex items-end">
                    <Button
                      onClick={() => removeGradeLevel(index)}
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 h-9 w-full md:w-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* School Calendar */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                School Calendar (Days Opened)
              </CardTitle>
              <CardDescription className="mt-2">
                Set total school days per session/term for attendance percentage calculation
              </CardDescription>
            </div>
            <Button 
              onClick={handleSaveCalendar} 
              disabled={saving || !selectedSession || !selectedTerm}
              size="sm"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Calendar'}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Info Box */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-start gap-3">
              <Info className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div className="text-sm text-blue-900">
                <p className="font-medium mb-1">How it works:</p>
                <p>
                  The "Total School Days" is used as the denominator when calculating attendance percentages. 
                  For example, if school opened 67 days and a student was present 64 days, their attendance is 64/67 = 95.5%
                </p>
              </div>
            </div>
          </div>

          {/* Session/Term Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="session">Academic Session</Label>
              <select
                id="session"
                value={selectedSession}
                onChange={(e) => {
                  setSelectedSession(e.target.value);
                  setCalendar({ ...calendar, session: e.target.value });
                }}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Session</option>
                {availableSessions.map((session) => (
                  <option key={session.session_name} value={session.session_name}>
                    {session.session_name} {session.is_current && '(Current)'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <Label htmlFor="term">Term</Label>
              <select
                id="term"
                value={selectedTerm}
                onChange={(e) => {
                  setSelectedTerm(e.target.value);
                  setCalendar({ ...calendar, term: e.target.value });
                }}
                className="w-full mt-1 px-3 py-2 border border-input rounded-md bg-background"
              >
                <option value="">Select Term</option>
                {availableTerms.map((term) => (
                  <option key={term.term_name} value={term.term_name}>
                    {term.term_name} {term.is_current && '(Current)'}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Calendar Details */}
          {selectedSession && selectedTerm && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 bg-slate-50 rounded-lg border">
              <div>
                <Label htmlFor="start_date">Term Start Date (Optional)</Label>
                <Input
                  id="start_date"
                  type="date"
                  value={calendar.start_date}
                  onChange={(e) => setCalendar({ ...calendar, start_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="end_date">Term End Date (Optional)</Label>
                <Input
                  id="end_date"
                  type="date"
                  value={calendar.end_date}
                  onChange={(e) => setCalendar({ ...calendar, end_date: e.target.value })}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="total_days" className="text-primary font-medium">
                  Total School Days <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="total_days"
                  type="number"
                  value={calendar.total_school_days}
                  onChange={(e) => setCalendar({ 
                    ...calendar, 
                    total_school_days: parseInt(e.target.value) || 0 
                  })}
                  min={1}
                  max={365}
                  className="mt-1 font-medium"
                  placeholder="e.g., 67"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Required: Used to calculate attendance %
                </p>
              </div>

              <div>
                <Label htmlFor="weeks">Number of Weeks (Optional)</Label>
                <Input
                  id="weeks"
                  type="number"
                  value={calendar.weeks}
                  onChange={(e) => setCalendar({ 
                    ...calendar, 
                    weeks: parseInt(e.target.value) || 0 
                  })}
                  min={1}
                  max={52}
                  className="mt-1"
                  placeholder="e.g., 13"
                />
              </div>
            </div>
          )}

          {/* Example Calculation */}
          {selectedSession && selectedTerm && calendar.total_school_days > 0 && (
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
              <p className="text-sm font-medium text-green-900 mb-2">Example Calculation:</p>
              <p className="text-sm text-green-800">
                If a student was present <strong>64 days</strong> out of <strong>{calendar.total_school_days} days</strong> school opened:
                <br />
                Attendance = (64 ÷ {calendar.total_school_days}) × 100 = <strong>{Math.round((64 / calendar.total_school_days) * 1000) / 10}%</strong>
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
