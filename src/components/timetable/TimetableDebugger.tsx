import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { createClient } from '../../utils/supabase/client';
import { RefreshCw, AlertCircle, CheckCircle, Wrench } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { Alert, AlertDescription } from '../ui/alert';

export function TimetableDebugger() {
  const [ss1Slots, setSs1Slots] = useState<any[]>([]);
  const [ss1Configs, setSs1Configs] = useState<any[]>([]);
  const [allFurtherMathsSlots, setAllFurtherMathsSlots] = useState<any[]>([]);
  const [ss1Classes, setSs1Classes] = useState<any[]>([]);
  const [furtherMathsSubject, setFurtherMathsSubject] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [fixing, setFixing] = useState(false);
  const supabase = createClient();

  const loadDebugData = async () => {
    setLoading(true);
    try {
      // Get latest timetable settings
      const { data: settings } = await supabase
        .from('timetable_settings')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      // Get Further Maths subject - try multiple variations
      console.log('🔍 Searching for Further Maths subject...');
      const { data: allSubjects } = await supabase
        .from('subjects')
        .select('*');
      
      console.log('📚 All subjects:', allSubjects);
      
      // Try to find Further Maths with flexible matching
      const furtherMathsData = allSubjects?.find(s => 
        s.name.toLowerCase().includes('further') && 
        (s.name.toLowerCase().includes('math') || s.name.toLowerCase().includes('maths'))
      );

      console.log('🎯 Found Further Maths:', furtherMathsData);
      setFurtherMathsSubject(furtherMathsData || null);

      // Get all classes to see what we have
      console.log('🔍 Searching for SS1 classes...');
      const { data: allClasses } = await supabase
        .from('classes')
        .select('id, name');
      
      console.log('🏫 All classes:', allClasses);
      
      // Find SS1 classes with flexible matching
      const ss1ClassesData = allClasses?.filter(c => 
        c.name.toUpperCase().startsWith('SS1') || 
        c.name.toUpperCase().startsWith('SS 1')
      ) || [];

      console.log('🎯 Found SS1 classes:', ss1ClassesData);
      setSs1Classes(ss1ClassesData);

      if (!settings) {
        console.log('No timetable settings found');
        setLoading(false);
        return;
      }

      // Get all SS1 slots
      const { data: slots } = await supabase
        .from('timetable_time_slots')
        .select('*')
        .eq('timetable_settings_id', settings.id);

      // Filter slots that match SS1
      const ss1SlotsData = slots?.filter(s => 
        s.slot_name?.toUpperCase().includes('SS1') || 
        s.slot_name?.toUpperCase().includes('SS 1')
      ) || [];

      // Get all Further Maths slots (all classes)
      const allFMSlots = slots?.filter(s =>
        s.subject_name?.toLowerCase().includes('further') &&
        (s.subject_name?.toLowerCase().includes('math') || s.subject_name?.toLowerCase().includes('maths'))
      ) || [];

      // Get all subject configs for SS1 classes
      let allConfigs: any[] = [];
      if (ss1ClassesData.length > 0) {
        const classIds = ss1ClassesData.map(c => c.id);
        console.log('🔍 Searching for configs with class IDs:', classIds);
        
        const { data: configs } = await supabase
          .from('subject_configs')
          .select('*');
        
        console.log('📋 All subject configs:', configs);
        
        // Filter configs that contain any SS1 class ID
        allConfigs = configs?.filter(config => 
          config.class_ids && config.class_ids.some((id: string) => classIds.includes(id))
        ) || [];
        
        console.log('🎯 Configs for SS1 classes:', allConfigs);
      }

      // Filter to Further Maths configs
      const furtherMathsConfigs = allConfigs.filter(c => 
        c.subject_name && 
        c.subject_name.toLowerCase().includes('further') &&
        (c.subject_name.toLowerCase().includes('math') || c.subject_name.toLowerCase().includes('maths'))
      );

      console.log('SS1 Slots:', ss1SlotsData);
      console.log('SS1 Further Maths Configs:', furtherMathsConfigs);
      console.log('All Further Maths Slots:', allFMSlots);

      setSs1Slots(ss1SlotsData || []);
      setSs1Configs(furtherMathsConfigs);
      setAllFurtherMathsSlots(allFMSlots || []);

    } catch (error) {
      console.error('Debug error:', error);
    } finally {
      setLoading(false);
    }
  };

  const quickFixFurtherMaths = async () => {
    if (!furtherMathsSubject) {
      toast.error('Further Maths subject not found in database');
      return;
    }

    if (ss1Classes.length === 0) {
      toast.error('No SS1 classes found in database');
      return;
    }

    setFixing(true);
    try {
      // Get a teacher to assign (optional - can be configured later)
      const { data: teachers } = await supabase
        .from('profiles')
        .select('id, first_name, last_name')
        .eq('role', 'teacher')
        .limit(1);

      const classIds = ss1Classes.map(c => c.id);

      // Create subject config for Further Maths + SS1 classes
      const newConfig = {
        subject_id: furtherMathsSubject.id,
        subject_name: furtherMathsSubject.name,
        class_ids: classIds,
        teachers: teachers && teachers.length > 0 ? [{
          teacherId: teachers[0].id,
          teacherName: `${teachers[0].first_name} ${teachers[0].last_name}`,
          isFullTime: true,
          daysPerWeek: 5,
          availableDays: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
          classIds: classIds
        }] : [],
        min_periods_per_week: 3,
        max_periods_per_week: 3,
        allow_double_periods: true,
        preferred_time_slots: [],
        type: 'elective',
        department: 'science',
        is_paired_subject: false,
        is_departmental: true
      };

      const { data, error } = await supabase
        .from('subject_configs')
        .upsert(newConfig, { onConflict: 'subject_id' })
        .select();

      if (error) {
        console.error('Error creating config:', error);
        toast.error(`Failed to create config: ${error.message}`);
        return;
      }

      toast.success('Further Maths config created for SS1 classes!');
      console.log('Created config:', data);

      // Reload debug data
      await loadDebugData();

    } catch (error: any) {
      console.error('Quick fix error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setFixing(false);
    }
  };

  useEffect(() => {
    loadDebugData();
  }, []);

  const hasProblem = ss1Configs.length === 0 && furtherMathsSubject && ss1Classes.length > 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>SS1 Further Maths Debugger</CardTitle>
          <Button 
            size="sm" 
            variant="outline" 
            onClick={loadDebugData}
            disabled={loading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Diagnostic Alert */}
        {hasProblem && (
          <Alert className="border-orange-300 bg-orange-50">
            <AlertCircle className="h-4 w-4 text-orange-600" />
            <AlertDescription>
              <div className="space-y-2">
                <p className="font-semibold text-orange-900">Problem Detected:</p>
                <p className="text-orange-800">
                  Further Maths subject exists and {ss1Classes.length} SS1 class(es) found, 
                  but <strong>no subject configuration</strong> exists linking them together.
                </p>
                <div className="flex items-center gap-2 mt-3">
                  <Button 
                    size="sm" 
                    onClick={quickFixFurtherMaths}
                    disabled={fixing}
                    className="bg-orange-600 hover:bg-orange-700"
                  >
                    <Wrench className={`h-4 w-4 mr-2 ${fixing ? 'animate-spin' : ''}`} />
                    {fixing ? 'Creating Config...' : 'Quick Fix: Create Config'}
                  </Button>
                  <span className="text-xs text-orange-700">
                    or manually configure in "Subjects Config" tab
                  </span>
                </div>
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Database Status */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-600 mb-1">Further Maths Subject</div>
            <div className="flex items-center gap-2">
              {furtherMathsSubject ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{furtherMathsSubject.name}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">Not Found</span>
                </>
              )}
            </div>
          </div>

          <div className="bg-slate-50 p-3 rounded">
            <div className="text-xs text-slate-600 mb-1">SS1 Classes</div>
            <div className="flex items-center gap-2">
              {ss1Classes.length > 0 ? (
                <>
                  <CheckCircle className="h-4 w-4 text-green-600" />
                  <span className="text-sm font-medium">{ss1Classes.length} class(es)</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                  <span className="text-sm font-medium text-red-600">None Found</span>
                </>
              )}
            </div>
          </div>
        </div>

        <div>
          <h3 className="font-semibold mb-2">SS1 Further Maths Subject Configs ({ss1Configs.length})</h3>
          {ss1Configs.length > 0 ? (
            <div className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-48">
              <pre>{JSON.stringify(ss1Configs, null, 2)}</pre>
            </div>
          ) : (
            <p className="text-sm text-slate-600">No Further Maths configs found for SS1 classes</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">SS1 Timetable Slots ({ss1Slots.length})</h3>
          {ss1Slots.length > 0 ? (
            <div className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-96">
              {ss1Slots.map(slot => (
                <div key={slot.id} className="mb-2 pb-2 border-b border-slate-300">
                  <div><strong>Slot:</strong> {slot.slot_name}</div>
                  <div><strong>Config ID:</strong> {slot.subject_config_id || 'NULL'}</div>
                  <div><strong>Pairs ID:</strong> {slot.pairs_id || 'NULL'}</div>
                  <div><strong>Teacher ID:</strong> {slot.teacher_id || 'NULL'}</div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-600">No SS1 slots found in timetable</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold mb-2">Further Maths Slots</h3>
          {ss1Slots.length > 0 && ss1Configs.length > 0 ? (
            <div className="bg-slate-100 p-3 rounded text-xs">
              {ss1Slots
                .filter(slot => 
                  ss1Configs.some(config => config.id === slot.subject_config_id)
                )
                .map(slot => (
                  <div key={slot.id} className="mb-1">
                    ✅ {slot.slot_name} - Config: {slot.subject_config_id}
                  </div>
                ))}
              {ss1Slots.filter(slot => 
                ss1Configs.some(config => config.id === slot.subject_config_id)
              ).length === 0 && (
                <div className="text-red-600">
                  ❌ No SS1 slots found with Further Maths config IDs
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-slate-600">-</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}