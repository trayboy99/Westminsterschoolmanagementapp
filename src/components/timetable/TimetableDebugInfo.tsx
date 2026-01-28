import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { Badge } from '../ui/badge';
import { AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';

export function TimetableDebugInfo() {
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<any>(null);
  const supabase = createClient();

  const loadDebugData = async () => {
    try {
      setLoading(true);

      // Fetch subject configs
      const { data: subjectConfigs, error } = await supabase
        .from('subject_configs')
        .select('*');

      if (error) {
        console.error('Error loading subject configs:', error);
        toast.error('Failed to load data: ' + error.message);
        return;
      }

      console.log('=== TIMETABLE DEBUG DATA ===');
      console.log('Subject Configs:', subjectConfigs);

      // Extract teachers
      const teachersMap = new Map();
      (subjectConfigs || []).forEach((config: any) => {
        const teacherAssignments = config.teachers || [];
        console.log(`Subject "${config.subject_name}" has ${teacherAssignments.length} teachers:`, teacherAssignments);
        
        teacherAssignments.forEach((ta: any) => {
          console.log(`  Teacher ${ta.teacherName}: isFullTime=${ta.isFullTime}, computed isPartTime=${!ta.isFullTime}`);
          
          if (!teachersMap.has(ta.teacherId)) {
            teachersMap.set(ta.teacherId, {
              id: ta.teacherId,
              name: ta.teacherName,
              isPartTime: ta.isFullTime === false, // Start with current value
              qualifiedSubjects: []
            });
          } else {
            // CRITICAL FIX: If teacher is part-time for ANY subject, mark as part-time
            const existingTeacher = teachersMap.get(ta.teacherId);
            if (ta.isFullTime === false) {
              existingTeacher.isPartTime = true;
            }
          }
          teachersMap.get(ta.teacherId).qualifiedSubjects.push(config.subject_id);
        });
      });

      const teachers = Array.from(teachersMap.values());
      console.log('Extracted Teachers:', teachers);

      // Extract classes
      const classesMap = new Map();
      (subjectConfigs || []).forEach((config: any) => {
        const classIds = config.class_ids || [];
        console.log(`Subject "${config.subject_name}" assigned to ${classIds.length} classes:`, classIds);
        
        classIds.forEach((classId: string) => {
          if (!classesMap.has(classId)) {
            classesMap.set(classId, {
              id: classId,
              name: classId,
              subjects: []
            });
          }
          classesMap.get(classId).subjects.push({
            subjectId: config.subject_id,
            subjectName: config.subject_name,
            periods: config.max_periods_per_week
          });
        });
      });

      const classes = Array.from(classesMap.values());
      console.log('Extracted Classes:', classes);

      setData({
        subjectConfigs,
        teachers,
        classes
      });

      toast.success('Debug data loaded - check console for details');

    } catch (error: any) {
      console.error('Debug load error:', error);
      toast.error('Failed to load debug data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDebugData();
  }, []);

  if (loading) {
    return <div className="p-4 text-center">Loading debug info...</div>;
  }

  if (!data) {
    return (
      <Alert className="border-red-200 bg-red-50">
        <AlertTriangle className="h-4 w-4 text-red-600" />
        <AlertDescription className="text-red-800">
          Failed to load debug data. Check console for errors.
        </AlertDescription>
      </Alert>
    );
  }

  const { subjectConfigs, teachers, classes } = data;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h2 className="text-base sm:text-xl font-semibold">Timetable Configuration Debug</h2>
        <Button onClick={loadDebugData} variant="outline" size="sm" className="w-full sm:w-auto">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-purple-700">Subject Configs</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-purple-700">{subjectConfigs?.length || 0}</div>
            {subjectConfigs?.length === 0 && (
              <p className="text-xs text-red-600 mt-2">
                ⚠️ No subjects configured! Add subjects in the Subjects Config tab.
              </p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-cyan-100 border-cyan-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-cyan-700">Teachers Extracted</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-cyan-700">{teachers?.length || 0}</div>
            <p className="text-xs text-cyan-600 mt-2">
              {teachers?.filter((t: any) => t.isPartTime).length} part-time
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs sm:text-sm text-emerald-700">Classes Extracted</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="text-2xl sm:text-3xl font-bold text-emerald-700">{classes?.length || 0}</div>
            {classes?.length === 0 && (
              <p className="text-xs text-red-600 mt-2">
                ⚠️ No classes found! Assign classes to subjects.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Subject Configs Detail */}
      <Card className="bg-gradient-to-br from-blue-50/50 to-blue-100/50 border-blue-200">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Subject Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {subjectConfigs?.length === 0 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-xs sm:text-sm">
                No subjects configured. Go to Settings → Subjects Config tab and add subjects.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {subjectConfigs?.map((config: any) => (
                <div key={config.subject_id} className="border rounded-lg p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm sm:text-base truncate">{config.subject_name}</div>
                      <div className="text-xs sm:text-sm text-slate-600 truncate">
                        Code: {config.subject_code || 'N/A'} | Level: {config.subject_level || 'N/A'}
                      </div>
                    </div>
                    <Badge variant="secondary" className="text-xs flex-shrink-0 w-fit">
                      {config.max_periods_per_week} periods/week
                    </Badge>
                  </div>

                  <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <div className="text-xs font-medium text-slate-600">Classes ({config.class_ids?.length || 0}):</div>
                      {config.class_ids?.length > 0 ? (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {config.class_ids.map((classId: string) => (
                            <Badge key={classId} variant="outline" className="text-xs">
                              {classId}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-red-600 mt-1">⚠️ No classes assigned!</div>
                      )}
                    </div>

                    <div>
                      <div className="text-xs font-medium text-slate-600">Teachers ({config.teachers?.length || 0}):</div>
                      {config.teachers?.length > 0 ? (
                        <div className="space-y-1 mt-1">
                          {config.teachers.map((teacher: any, idx: number) => (
                            <div key={idx} className="text-xs flex items-center gap-1 flex-wrap">
                              <span className="font-medium truncate">{teacher.teacherName}</span>
                              {teacher.isFullTime === false && (
                                <Badge variant="secondary" className="text-xs flex-shrink-0">Part-time</Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-red-600 mt-1">⚠️ No teachers assigned!</div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Classes Detail */}
      <Card className="bg-gradient-to-br from-green-50/50 to-green-100/50 border-green-200">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Extracted Classes</CardTitle>
        </CardHeader>
        <CardContent>
          {classes?.length === 0 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-xs sm:text-sm">
                No classes extracted. Make sure you've assigned classes to subjects in the Subjects Config tab.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-3">
              {classes?.map((cls: any) => (
                <div key={cls.id} className="border rounded-lg p-2 sm:p-3">
                  <div className="font-semibold text-sm sm:text-base">{cls.name}</div>
                  <div className="text-xs sm:text-sm text-slate-600 mt-1">
                    Subjects: {cls.subjects?.length || 0}
                  </div>
                  {cls.subjects?.length === 0 && (
                    <div className="text-xs text-red-600 mt-1">
                      ⚠️ No subjects assigned to this class!
                    </div>
                  )}
                  {cls.subjects?.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {cls.subjects.map((subj: any, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {subj.subjectName} ({subj.periods}p)
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Teachers Detail */}
      <Card className="bg-gradient-to-br from-amber-50/50 to-amber-100/50 border-amber-200">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Extracted Teachers</CardTitle>
        </CardHeader>
        <CardContent>
          {teachers?.length === 0 ? (
            <Alert className="border-yellow-200 bg-yellow-50">
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800 text-xs sm:text-sm">
                No teachers extracted. Make sure you've assigned teachers to subjects in the Subjects Config tab.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="space-y-2">
              {teachers?.map((teacher: any) => (
                <div key={teacher.id} className="border rounded-lg p-2 sm:p-3">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="font-semibold text-sm sm:text-base min-w-0 truncate">{teacher.name}</div>
                    {teacher.isPartTime && (
                      <Badge variant="secondary" className="text-xs w-fit flex-shrink-0">Part-time</Badge>
                    )}
                  </div>
                  <div className="text-xs sm:text-sm text-slate-600 mt-1">
                    Qualified Subjects: {teacher.qualifiedSubjects?.length || 0}
                  </div>
                  {teacher.qualifiedSubjects?.length === 0 && (
                    <div className="text-xs text-red-600 mt-1">
                      ⚠️ No qualified subjects!
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Validation Summary */}
      <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
        <CardHeader>
          <CardTitle className="text-sm sm:text-base">Validation Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              {subjectConfigs?.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              )}
              <span className="text-xs sm:text-sm">
                {subjectConfigs?.length > 0
                  ? `✅ ${subjectConfigs.length} subjects configured`
                  : '❌ No subjects configured'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {teachers?.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              )}
              <span className="text-xs sm:text-sm">
                {teachers?.length > 0
                  ? `✅ ${teachers.length} teachers extracted`
                  : '❌ No teachers found - assign teachers to subjects'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {classes?.length > 0 ? (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              ) : (
                <AlertTriangle className="h-4 w-4 text-red-600 flex-shrink-0" />
              )}
              <span className="text-xs sm:text-sm">
                {classes?.length > 0
                  ? `✅ ${classes.length} classes extracted`
                  : '❌ No classes found - assign classes to subjects'}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {classes?.some((c: any) => c.subjects?.length === 0) ? (
                <AlertTriangle className="h-4 w-4 text-yellow-600 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600 flex-shrink-0" />
              )}
              <span className="text-xs sm:text-sm">
                {classes?.some((c: any) => c.subjects?.length === 0)
                  ? '⚠️ Some classes have no subjects assigned'
                  : '✅ All classes have subjects'}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}