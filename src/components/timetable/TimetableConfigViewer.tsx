import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Loader2, CheckCircle, XCircle, Calendar, Users, BookOpen, Settings, Clock } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface SubjectConfig {
  id: string;
  subject_id: string;
  subject_name: string;
  class_ids: string[];
  teachers: {
    teacherId: string;
    teacherName: string;
    isFullTime: boolean;
    daysPerWeek: number;
    availableDays: string[];
    classIds: string[];
  }[];
  min_periods_per_week: number;
  max_periods_per_week: number;
  allow_double_periods: boolean;
  type: string;
  department: string;
  is_paired_subject: boolean;
  is_departmental: boolean;
}

interface TimetableSettings {
  academicYear: string;
  term: string;
  daysConfig: any[];
  breaks: any[];
  blocked: any;
  allowBackToBackSameTeacher: boolean;
  doublePeriodOncePerWeek: boolean;
}

export function TimetableConfigViewer() {
  const [loading, setLoading] = useState(true);
  const [subjectConfigs, setSubjectConfigs] = useState<SubjectConfig[]>([]);
  const [settings, setSettings] = useState<TimetableSettings | null>(null);
  const [pairGroups, setPairGroups] = useState<any[]>([]);
  const [classNames, setClassNames] = useState<Map<string, string>>(new Map());

  const supabase = createClient();

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load subject configurations
      const { data: configs } = await supabase
        .from('subject_configs')
        .select('*');

      setSubjectConfigs(configs || []);

      // Load class names for display
      const { data: classes } = await supabase
        .from('classes')
        .select('id, name');

      const classMap = new Map();
      classes?.forEach(c => classMap.set(c.id, c.name));
      setClassNames(classMap);

      // Load timetable settings
      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const settingsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-settings`,
        { headers }
      );
      const settingsData = await settingsRes.json();
      setSettings(settingsData.settings);

      // Load pair groups
      const { data: pairs } = await supabase
        .from('subject_pairings')
        .select('*');

      const groupMap = new Map<string, any>();
      pairs?.forEach(p => {
        if (!groupMap.has(p.pair_group_id)) {
          groupMap.set(p.pair_group_id, {
            id: p.pair_group_id,
            name: p.pair_group_name,
            level: p.level,
            subjects: []
          });
        }
        groupMap.get(p.pair_group_id).subjects.push(p.subject_id);
      });
      setPairGroups(Array.from(groupMap.values()));

    } catch (error) {
      console.error('Error loading config:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  const totalPeriods = settings?.daysConfig?.reduce((sum, d) => sum + d.numPeriods, 0) || 0;
  const totalBreaks = settings?.breaks?.length || 0;

  return (
    <div className="space-y-4 sm:space-y-6 p-3 sm:p-6">
      <div>
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold">Timetable Configuration</h1>
        <p className="text-slate-600 text-xs sm:text-sm lg:text-base">View all configured settings for timetable generation</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <BookOpen className="h-6 w-6 sm:h-8 sm:w-8 text-blue-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-blue-600 truncate">Week Periods</p>
                <p className="text-lg sm:text-2xl font-bold text-blue-700">{totalPeriods}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Clock className="h-6 w-6 sm:h-8 sm:w-8 text-purple-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-purple-600 truncate">Breaks</p>
                <p className="text-lg sm:text-2xl font-bold text-purple-700">{totalBreaks}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-3 sm:p-4">
            <div className="flex items-center gap-2 sm:gap-3">
              <Users className="h-6 w-6 sm:h-8 sm:w-8 text-orange-600 flex-shrink-0" />
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-orange-600 truncate">Pair Groups</p>
                <p className="text-lg sm:text-2xl font-bold text-orange-700">{pairGroups.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Subject Configurations */}
      <Card className="bg-gradient-to-br from-slate-50/50 to-slate-100/50 border-slate-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
            <BookOpen className="h-4 w-4 sm:h-5 sm:w-5" />
            Subject Configurations ({subjectConfigs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 sm:space-y-4">
            {subjectConfigs.map(config => (
              <div key={config.id} className="border rounded-lg p-3 sm:p-4 space-y-3 bg-white">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-base sm:text-lg break-words">{config.subject_name}</h3>
                    <div className="flex gap-2 mt-2 flex-wrap">
                      {config.type && <Badge variant="secondary" className="text-xs">{config.type}</Badge>}
                      {config.department && <Badge variant="outline" className="text-xs">{config.department}</Badge>}
                      {config.is_paired_subject && <Badge className="bg-purple-100 text-purple-700 text-xs">Paired</Badge>}
                      {config.allow_double_periods && <Badge className="bg-blue-100 text-blue-700 text-xs">Double Periods</Badge>}
                    </div>
                  </div>
                  <div className="text-left sm:text-right flex-shrink-0">
                    <p className="text-xs sm:text-sm text-slate-600">Periods per week</p>
                    <p className="text-lg sm:text-xl font-bold">{config.min_periods_per_week} - {config.max_periods_per_week}</p>
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-700 mb-2">Classes:</p>
                  <div className="flex flex-wrap gap-2">
                    {config.class_ids.map(classId => (
                      <Badge key={classId} variant="outline" className="text-xs">
                        {classNames.get(classId) || classId}
                      </Badge>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-700 mb-2">Teachers:</p>
                  <div className="space-y-2">
                    {config.teachers.map((teacher, idx) => (
                      <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between bg-slate-50 p-3 rounded gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm sm:text-base break-words">{teacher.teacherName}</p>
                          <p className="text-xs text-slate-600 break-words">
                            {teacher.isFullTime ? (
                              <span className="text-green-600">Full-time • All days</span>
                            ) : (
                              <span className="text-orange-600">Part-time • {teacher.availableDays?.join(', ') || 'No days specified'}</span>
                            )}
                          </p>
                        </div>
                        <div className="text-left sm:text-right text-xs sm:text-sm flex-shrink-0">
                          <p className="text-slate-600">Teaching in:</p>
                          <p className="font-medium">{teacher.classIds?.length || 0} class(es)</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {subjectConfigs.length === 0 && (
              <div className="text-center py-8 text-slate-500">
                <XCircle className="h-12 w-12 mx-auto mb-2 text-slate-300" />
                <p className="text-sm sm:text-base">No subjects configured yet</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Basic Settings */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Settings className="h-4 w-4 sm:h-5 sm:w-5" />
              Basic Settings
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Academic Year</p>
                <p className="font-semibold text-sm sm:text-base break-words">{settings.academicYear}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Term</p>
                <p className="font-semibold text-sm sm:text-base break-words">{settings.term}</p>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Back-to-back Same Teacher</p>
                <div className="flex items-center gap-2 text-sm">
                  {settings.allowBackToBackSameTeacher ? (
                    <><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> <span>Allowed</span></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-red-500 flex-shrink-0" /> <span>Not Allowed</span></>
                  )}
                </div>
              </div>
              <div>
                <p className="text-xs sm:text-sm text-slate-600 mb-1">Double Period Once Per Week</p>
                <div className="flex items-center gap-2 text-sm">
                  {settings.doublePeriodOncePerWeek ? (
                    <><CheckCircle className="h-4 w-4 text-green-500 flex-shrink-0" /> <span>Yes</span></>
                  ) : (
                    <><XCircle className="h-4 w-4 text-red-500 flex-shrink-0" /> <span>No</span></>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Days & Periods */}
      {settings && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Days & Periods Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {settings.daysConfig.map((day, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-slate-50 rounded">
                  <p className="font-medium">{day.day}</p>
                  <Badge variant="secondary">{day.numPeriods} periods</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Breaks */}
      {settings && settings.breaks.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm sm:text-base">
              <Clock className="h-4 w-4 sm:h-5 sm:w-5" />
              Breaks Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {settings.breaks.map((brk, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-3 bg-slate-50 rounded gap-2">
                  <p className="font-medium text-sm sm:text-base break-words">{brk.caption || brk.label || 'Break'}</p>
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 text-xs sm:text-sm">
                    <span className="text-slate-600">Period: {brk.period || brk.afterPeriod || 'N/A'}</span>
                    <span className="text-slate-600 break-words">Days: {Array.isArray(brk.days) ? brk.days.join(', ') : (brk.day || 'All days')}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Pair Groups */}
      {pairGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Subject Pair Groups ({pairGroups.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pairGroups.map(group => (
                <div key={group.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{group.name}</h4>
                    <Badge>{group.level}</Badge>
                  </div>
                  <p className="text-sm text-slate-600">{group.subjects.length} subjects paired together</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button onClick={loadConfig} variant="outline">
          <Loader2 className="h-4 w-4 mr-2" />
          Refresh Configuration
        </Button>
      </div>
    </div>
  );
}