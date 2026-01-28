import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Plus, Trash2, Save, AlertTriangle, CheckCircle, Clock, Calendar, Settings, BookOpen, Users, School, Link2, Bug } from 'lucide-react';
import type { DayConfig, BreakDef, TimetableSettings as TimetableSettingsType } from '../../types/timetable';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import SubjectsManagerEnhanced from './SubjectsManagerEnhanced';
import TeachersManagerEnhanced from './TeachersManagerEnhanced';
import ClassesManagerEnhanced from './ClassesManagerEnhanced';
import SubjectPairsManager from './SubjectPairsManager';
import { SubjectsConfigManager } from './SubjectsConfigManager';
import { TimetableDebugInfo } from './TimetableDebugInfo';
import { TimetableConfigViewer } from './TimetableConfigViewer';

interface TimetableSettingsProps {
  onSave?: (settings: TimetableSettingsType) => void;
  onCancel?: () => void;
}

function makeId(prefix = 'b') {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

const DAY_NAMES: { value: string; label: string }[] = [
  { value: 'mon', label: 'Monday' },
  { value: 'tue', label: 'Tuesday' },
  { value: 'wed', label: 'Wednesday' },
  { value: 'thu', label: 'Thursday' },
  { value: 'fri', label: 'Friday' }
];

const defaultDays: DayConfig[] = [
  { day: 'mon', openTime: '08:00', closeTime: '15:00', numPeriods: 8, periodDuration: 40 },
  { day: 'tue', openTime: '08:00', closeTime: '15:00', numPeriods: 8, periodDuration: 40 },
  { day: 'wed', openTime: '08:00', closeTime: '15:00', numPeriods: 8, periodDuration: 40 },
  { day: 'thu', openTime: '08:00', closeTime: '15:00', numPeriods: 10, periodDuration: 35 },
  { day: 'fri', openTime: '08:00', closeTime: '13:00', numPeriods: 7, periodDuration: 40 }
];

export function TimetableSettingsNew({ onSave, onCancel }: TimetableSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  
  const [academicYear, setAcademicYear] = useState('');
  const [term, setTerm] = useState('');
  const [daysConfig, setDaysConfig] = useState<DayConfig[]>(defaultDays);
  const [breaks, setBreaks] = useState<BreakDef[]>([]);
  
  // Special rules
  const [thuAcademic, setThuAcademic] = useState(8);
  const [thuCocurricular, setThuCocurricular] = useState(2);
  const [friFirstAcademic, setFriFirstAcademic] = useState(4);
  const [fri5Caption, setFri5Caption] = useState('Note Check');
  const [fri67Caption, setFri67Caption] = useState('Sports');
  const [allowBackToBack, setAllowBackToBack] = useState(true);
  const [doublePeriodOnce, setDoublePeriodOnce] = useState(true);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchInitialData();
  }, []);

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to access settings');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch sessions and terms
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const sessionData = await sessionRes.json();

      if (sessionData.success) {
        setSessions(sessionData.sessions || []);
        setTerms(sessionData.terms || []);
        
        // Set current session/term as default
        const currentSession = sessionData.sessions?.find((s: any) => s.is_current);
        const currentTerm = sessionData.terms?.find((t: any) => t.is_current);
        
        if (currentSession) setAcademicYear(currentSession.session_name);
        if (currentTerm) setTerm(currentTerm.term_name);
      }

      // Try to load existing settings
      await loadExistingSettings(headers);

    } catch (error) {
      console.error('[TimetableSettings] Error loading data:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const loadExistingSettings = async (headers: any) => {
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-settings`,
        { headers }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.settings) {
          const settings = data.settings;
          if (settings.daysConfig) setDaysConfig(settings.daysConfig);
          if (settings.breaks) setBreaks(settings.breaks);
          if (settings.special) {
            setThuAcademic(settings.special.thuAcademic || 8);
            setThuCocurricular(settings.special.thuCocurricular || 2);
            setFriFirstAcademic(settings.special.friFirstAcademic || 4);
            setFri5Caption(settings.special.fri5Caption || 'Note Check');
            setFri67Caption(settings.special.fri67Caption || 'Sports');
          }
          if (settings.allowBackToBackSameTeacher !== undefined) {
            setAllowBackToBack(settings.allowBackToBackSameTeacher);
          }
          if (settings.doublePeriodOncePerWeek !== undefined) {
            setDoublePeriodOnce(settings.doublePeriodOncePerWeek);
          }
        }
      }
    } catch (error) {
      console.log('[TimetableSettings] No existing settings found, using defaults');
    }
  };

  const updateDay = (idx: number, patch: Partial<DayConfig>) => {
    const nd = [...daysConfig];
    nd[idx] = { ...nd[idx], ...patch };
    setDaysConfig(nd);
  };

  const addBreak = () => {
    setBreaks(prev => [
      ...prev,
      {
        id: makeId('br'),
        name: 'Short Break',
        afterPeriod: 2,
        duration: 15,
        appliesTo: ['mon', 'tue', 'wed', 'thu', 'fri']
      }
    ]);
  };

  const updateBreak = (idx: number, patch: Partial<BreakDef>) => {
    const nb = [...breaks];
    nb[idx] = { ...nb[idx], ...patch };
    setBreaks(nb);
  };

  const removeBreak = (id: string) => {
    setBreaks(prev => prev.filter(b => b.id !== id));
  };

  const toggleBreakDay = (breakIdx: number, day: string) => {
    const nb = [...breaks];
    const currentDays = nb[breakIdx].appliesTo;
    
    if (currentDays.includes(day as any)) {
      nb[breakIdx].appliesTo = currentDays.filter(d => d !== day) as any;
    } else {
      nb[breakIdx].appliesTo = [...currentDays, day] as any;
    }
    
    setBreaks(nb);
  };

  const validateSettings = () => {
    const errors: string[] = [];

    // Thursday validation
    const thu = daysConfig.find(d => d.day === 'thu');
    if (thu && thu.numPeriods < (thuAcademic + thuCocurricular)) {
      errors.push(
        `Thursday has ${thu.numPeriods} periods but requires ${thuAcademic + thuCocurricular} (${thuAcademic} academic + ${thuCocurricular} co-curricular).`
      );
    }

    // Friday validation
    const fri = daysConfig.find(d => d.day === 'fri');
    if (fri && fri.numPeriods < 7) {
      errors.push('Friday should have at least 7 periods for the configured rules.');
    }

    // Break validation
    breaks.forEach((brk, idx) => {
      const maxPeriods = Math.max(...daysConfig.map(d => d.numPeriods));
      if (brk.afterPeriod > maxPeriods) {
        errors.push(`Break #${idx + 1} (${brk.name}) is after period ${brk.afterPeriod} but max periods is ${maxPeriods}.`);
      }
    });

    // Session/term validation
    if (!academicYear) errors.push('Please select an academic year/session.');
    if (!term) errors.push('Please select a term.');

    setValidationErrors(errors);
    return errors.length === 0;
  };

  const handleSave = async () => {
    if (!validateSettings()) {
      toast.error('Please fix validation errors before saving');
      return;
    }

    try {
      setSaving(true);

      // Build blocked map for special rules
      const blocked: any = {};

      // Friday period 5 = Note Check
      blocked['fri'] = blocked['fri'] || {};
      blocked['fri'][5] = { caption: fri5Caption };

      // Friday periods 6-7 = Sports
      blocked['fri'][6] = { caption: fri67Caption, isCoCurricular: true };
      blocked['fri'][7] = { caption: fri67Caption, isCoCurricular: true };

      // Thursday last N periods = Co-curricular
      const thuConfig = daysConfig.find(d => d.day === 'thu');
      if (thuConfig) {
        const cocurrStart = thuAcademic + 1;
        for (let p = cocurrStart; p <= thuConfig.numPeriods; p++) {
          blocked['thu'] = blocked['thu'] || {};
          blocked['thu'][p] = { caption: 'Co-curricular', isCoCurricular: true };
        }
      }

      const settingsPayload: TimetableSettingsType = {
        academicYear,
        term,
        daysConfig,
        breaks,
        special: {
          thuAcademic,
          thuCocurricular,
          friFirstAcademic,
          fri5Caption,
          fri67Caption
        },
        blocked,
        allowBackToBackSameTeacher: allowBackToBack,
        doublePeriodOncePerWeek: doublePeriodOnce
      };

      // Save to backend
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Session expired. Please log in again.');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-settings`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ settings: settingsPayload })
        }
      );

      const result = await response.json();

      if (result.success) {
        toast.success('Timetable settings saved successfully!');
        if (onSave) onSave(settingsPayload);
      } else {
        throw new Error(result.error || 'Failed to save settings');
      }

    } catch (error: any) {
      console.error('[TimetableSettings] Save error:', error);
      toast.error(error.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center">
        <div className="text-center">
          <Clock className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold flex items-center gap-2">
            <Settings className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 flex-shrink-0" />
            <span className="truncate">Timetable Settings & Configuration</span>
          </h1>
          <p className="text-slate-600 mt-2 text-xs sm:text-sm lg:text-base">
            Complete timetable setup: manage subjects, teachers, classes, and configure automation rules
          </p>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          {onCancel && (
            <Button variant="outline" onClick={onCancel} size="sm" className="text-xs sm:text-sm">
              Close
            </Button>
          )}
        </div>
      </div>

      <Tabs defaultValue="view" className="space-y-4">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
          <TabsList className="inline-flex w-auto sm:w-full sm:grid gap-1 p-1 h-auto" style={{ gridTemplateColumns: 'repeat(7, minmax(0, 1fr))' }}>
            <TabsTrigger value="view" className="flex items-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden md:inline">View Config</span>
              <span className="md:hidden">View</span>
            </TabsTrigger>
            <TabsTrigger value="subjects" className="flex items-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
              <BookOpen className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span className="hidden md:inline">Subjects Config</span>
              <span className="md:hidden">Subjects</span>
            </TabsTrigger>
            <TabsTrigger value="pairs" className="flex items-center gap-1 px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">
              <Link2 className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
              <span>Pairs</span>
            </TabsTrigger>
            <TabsTrigger value="basic" className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Basic</TabsTrigger>
            <TabsTrigger value="days" className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Timings</TabsTrigger>
            <TabsTrigger value="breaks" className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Breaks</TabsTrigger>
            <TabsTrigger value="special" className="px-2 sm:px-3 py-2 text-xs sm:text-sm whitespace-nowrap flex-shrink-0">Rules</TabsTrigger>
          </TabsList>
        </div>

        {/* Configuration Viewer Tab - NEW */}
        <TabsContent value="view" className="space-y-4">
          <TimetableConfigViewer />
        </TabsContent>

        {/* Subject Configuration Tab - Unified Interface */}
        <TabsContent value="subjects" className="space-y-4">
          {/* Debug Info Card - Shows what's configured */}
          <TimetableDebugInfo />
          
          <SubjectsConfigManager />
        </TabsContent>

        {/* Subject Pairs Tab - NEW */}
        <TabsContent value="pairs" className="space-y-4">
          <SubjectPairsManager />
        </TabsContent>

        {/* Validation Errors (show only on settings tabs) */}
        {validationErrors.length > 0 && (
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              <div className="font-medium mb-2">Please fix the following issues:</div>
              <ul className="list-disc pl-5 space-y-1">
                {validationErrors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
            </AlertDescription>
          </Alert>
        )}

        {/* Basic Settings Tab */}
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">Academic Period</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-sm">Academic Year / Session</Label>
                  <select
                    value={academicYear}
                    onChange={(e) => setAcademicYear(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select session...</option>
                    {sessions.map((s) => (
                      <option key={s.id || s.session_name} value={s.session_name}>
                        {s.session_name} {s.is_current && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">Term</Label>
                  <select
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2 text-sm"
                  >
                    <option value="">Select term...</option>
                    {terms.map((t) => (
                      <option key={t.id || t.term_name} value={t.term_name}>
                        {t.term_name} {t.is_current && '(Current)'}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={doublePeriodOnce}
                      onChange={(e) => setDoublePeriodOnce(e.target.checked)}
                      className="rounded"
                    />
                    Double periods only once per week
                  </Label>
                  <p className="text-sm text-slate-500">
                    General and departmental subjects with double periods appear only once weekly
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={allowBackToBack}
                      onChange={(e) => setAllowBackToBack(e.target.checked)}
                      className="rounded"
                    />
                    Allow same teacher consecutive periods
                  </Label>
                  <p className="text-sm text-slate-500">
                    If unchecked, teachers won't be scheduled in back-to-back periods
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Daily Timings Tab */}
        <TabsContent value="days" className="space-y-4">
          <Card className="bg-gradient-to-br from-slate-50 to-slate-100">
            <CardHeader>
              <CardTitle className="text-sm sm:text-base">Daily Timings & Periods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              {/* Desktop Header */}
              <div className="hidden sm:grid sm:grid-cols-5 gap-2 sm:gap-4 font-medium text-xs sm:text-sm text-slate-600 pb-2 border-b">
                <div>Day</div>
                <div>Open Time</div>
                <div>Close Time</div>
                <div>Periods</div>
                <div>Duration (min)</div>
              </div>

              {daysConfig.map((d, idx) => (
                <div key={d.day} className="bg-white rounded-lg p-4 sm:p-3 border sm:border-0 shadow-sm sm:shadow-none space-y-3 sm:space-y-0 sm:grid sm:grid-cols-5 sm:gap-4 sm:items-center">
                  <div className="font-semibold text-base sm:text-sm sm:font-medium text-slate-700">{DAY_NAMES.find(dn => dn.value === d.day)?.label}</div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-2 sm:contents">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 sm:hidden block">Open Time</label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                          type="time"
                          value={d.openTime}
                          onChange={(e) => updateDay(idx, { openTime: e.target.value })}
                          className="pl-9 text-sm h-10 sm:h-9"
                        />
                      </div>
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 sm:hidden block">Close Time</label>
                      <div className="relative">
                        <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                        <Input
                          type="time"
                          value={d.closeTime}
                          onChange={(e) => updateDay(idx, { closeTime: e.target.value })}
                          className="pl-9 text-sm h-10 sm:h-9"
                        />
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-3 sm:gap-2 sm:contents">
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 sm:hidden block">Periods</label>
                      <Input
                        type="number"
                        value={d.numPeriods}
                        onChange={(e) => updateDay(idx, { numPeriods: parseInt(e.target.value || '0', 10) })}
                        min="1"
                        max="15"
                        className="text-sm h-10 sm:h-9"
                      />
                    </div>
                    
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-slate-600 sm:hidden block">Duration (min)</label>
                      <Input
                        type="number"
                        value={d.periodDuration}
                        onChange={(e) => updateDay(idx, { periodDuration: parseInt(e.target.value || '0', 10) })}
                        min="30"
                        max="60"
                        className="text-sm h-10 sm:h-9"
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Alert className="bg-blue-50 border-blue-200">
                <Calendar className="h-4 w-4 text-blue-600 flex-shrink-0" />
                <AlertDescription className="text-blue-800 text-xs sm:text-sm">
                  <strong>Note:</strong> Thursday typically has 10 periods (8 academic + 2 co-curricular).
                  Friday typically has 7 periods (4 academic + note check + 2 sports).
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Breaks Tab */}
        <TabsContent value="breaks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Break Periods</span>
                <Button onClick={addBreak} size="sm" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Break
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {breaks.length === 0 ? (
                <div className="text-center py-8 text-slate-500">
                  <p>No breaks configured.</p>
                  <p className="text-sm">Click "Add Break" to add assembly, short breaks, or lunch periods.</p>
                </div>
              ) : (
                breaks.map((brk, idx) => (
                  <div key={brk.id} className="p-4 border rounded-lg space-y-3">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label>Break Name</Label>
                        <Input
                          value={brk.name}
                          onChange={(e) => updateBreak(idx, { name: e.target.value })}
                          placeholder="e.g., Short Break, Lunch"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>After Period</Label>
                        <Input
                          type="number"
                          value={brk.afterPeriod}
                          onChange={(e) => updateBreak(idx, { afterPeriod: parseInt(e.target.value || '0', 10) })}
                          min="1"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Duration (min)</Label>
                        <Input
                          type="number"
                          value={brk.duration}
                          onChange={(e) => updateBreak(idx, { duration: parseInt(e.target.value || '0', 10) })}
                          min="5"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Applies to Days</Label>
                      <div className="flex gap-2 flex-wrap">
                        {DAY_NAMES.map((day) => (
                          <Badge
                            key={day.value}
                            variant={brk.appliesTo.includes(day.value as any) ? 'default' : 'outline'}
                            className="cursor-pointer"
                            onClick={() => toggleBreakDay(idx, day.value)}
                          >
                            {day.label}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeBreak(brk.id)}
                        className="gap-2"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Special Rules Tab */}
        <TabsContent value="special" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Thursday Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Thursday's timetable is split into academic and co-curricular periods.
              </p>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Academic Periods (1st part)</Label>
                  <Input
                    type="number"
                    value={thuAcademic}
                    onChange={(e) => setThuAcademic(parseInt(e.target.value || '8', 10))}
                    min="1"
                  />
                  <p className="text-xs text-slate-500">First {thuAcademic} periods for regular subjects</p>
                </div>

                <div className="space-y-2">
                  <Label>Co-curricular Periods (last part)</Label>
                  <Input
                    type="number"
                    value={thuCocurricular}
                    onChange={(e) => setThuCocurricular(parseInt(e.target.value || '2', 10))}
                    min="0"
                  />
                  <p className="text-xs text-slate-500">Last {thuCocurricular} periods for clubs/activities</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Friday Rules</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-slate-600">
                Friday has a special structure with academic subjects, note check, and sports.
              </p>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>First Academic Periods</Label>
                  <Input
                    type="number"
                    value={friFirstAcademic}
                    onChange={(e) => setFriFirstAcademic(parseInt(e.target.value || '4', 10))}
                    min="1"
                  />
                  <p className="text-xs text-slate-500">First {friFirstAcademic} periods for regular subjects</p>
                </div>

                <div className="space-y-2">
                  <Label>Period 5 Caption</Label>
                  <Input
                    value={fri5Caption}
                    onChange={(e) => setFri5Caption(e.target.value)}
                    placeholder="Note Check"
                  />
                  <p className="text-xs text-slate-500">Caption for the 5th period (typically note check)</p>
                </div>

                <div className="space-y-2">
                  <Label>Periods 6-7 Caption</Label>
                  <Input
                    value={fri67Caption}
                    onChange={(e) => setFri67Caption(e.target.value)}
                    placeholder="Sports"
                  />
                  <p className="text-xs text-slate-500">Caption for periods 6 and 7 (typically sports/games)</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer Actions - Only for Settings Tabs */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-slate-600">
            {validationErrors.length === 0 ? (
              <span className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-4 w-4" />
                All settings are valid
              </span>
            ) : (
              <span className="flex items-center gap-2 text-red-600">
                <AlertTriangle className="h-4 w-4" />
                {validationErrors.length} validation error(s)
              </span>
            )}
          </div>

          <Button onClick={handleSave} disabled={saving} className="gap-2">
            <Save className="h-4 w-4" />
            {saving ? 'Saving Settings...' : 'Save Timetable Settings'}
          </Button>
        </div>
      </Tabs>
    </div>
  );
}