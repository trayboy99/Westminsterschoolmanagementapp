import React, { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Loader2, AlertTriangle, Calendar, Download, X } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { generateTimetable } from '../../lib/timetable/generator';
import { TraditionalTimetableView } from './TraditionalTimetableView';
import { DraggableTimetableView } from './DraggableTimetableView';
import { DebugPairings } from './DebugPairings';
import { toast } from 'sonner';
import type { TimetableSlot, Teacher, ClassDef, SubjectDef } from '../../types/timetable';

interface TimetableEditorProps {
  onClose: () => void;
  onSave: (slots: any[]) => void; // Changed to pass generated slots back
}

export function TimetableEditorNew({ onClose, onSave }: TimetableEditorProps) {
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [slots, setSlots] = useState<TimetableSlot[]>([]);
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [subjectNames, setSubjectNames] = useState<Map<string, string>>(new Map());
  const [classNames, setClassNames] = useState<Map<string, string>>(new Map());
  const [pairGroupNames, setPairGroupNames] = useState<Map<string, string>>(new Map());
  const [teacherNames, setTeacherNames] = useState<Map<string, string>>(new Map()); // NEW: Teacher names

  const supabase = createClient();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to access timetable');
        return;
      }

      // Load settings from API
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

      // Load existing timetable if any
      const { data: existingSlots } = await supabase
        .from('timetable_slots')
        .select('*')
        .order('day')
        .order('period');

      if (existingSlots && existingSlots.length > 0) {
        setSlots(existingSlots);
      }

    } catch (error) {
      console.error('Error loading timetable data:', error);
      toast.error('Failed to load timetable data');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!settings) {
      toast.error('Settings not loaded');
      return;
    }

    try {
      setGenerating(true);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Load subject configurations from database
      const { data: subjectConfigs, error: configError } = await supabase
        .from('subject_configs')
        .select('*');

      if (configError) {
        toast.error('Failed to load subject configurations');
        return;
      }

      if (!subjectConfigs || subjectConfigs.length === 0) {
        toast.error('No subjects configured. Please configure subjects first.');
        return;
      }

      // Load class names for display
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name');

      const classMap = new Map(classesData?.map(c => [c.id, c.name]) || []);
      console.log('📚 Loaded', classMap.size, 'class names');

      // Load subject_pairings to map pair_group_id -> pairing UUID (CRITICAL FOR handleSave!)
      const { data: pairingsDataForSave } = await supabase
        .from('subject_pairings')
        .select('id, pair_group_id');
      
      // Build a map: pair_group_id -> first pairing UUID  
      const pairGroupToUuidMap = new Map<string, string>();
      if (pairingsDataForSave) {
        pairingsDataForSave.forEach(pairing => {
          if (!pairGroupToUuidMap.has(pairing.pair_group_id)) {
            pairGroupToUuidMap.set(pairing.pair_group_id, pairing.id);
          }
        });
      }
      console.log('🔗 Loaded', pairGroupToUuidMap.size, 'pair group UUID mappings IN handleSave');

      // Get or create timetable_settings_id
      let settingsId: string;
      const { data: existingSettings } = await supabase
        .from('timetable_settings')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSettings) {
        settingsId = existingSettings.id;
      } else {
        // Create settings via API endpoint if none exists
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };

        const settingsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-settings`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ settings: settings || {} })
          }
        );

        if (!settingsResponse.ok) {
          const errorData = await settingsResponse.json();
          throw new Error(`Failed to create settings: ${errorData.error || settingsResponse.statusText}`);
        }

        const settingsData = await settingsResponse.json();
        if (!settingsData.id) {
          throw new Error('Settings created but no ID returned');
        }

        settingsId = settingsData.id;
        console.log('✅ Created new timetable settings:', settingsId);
      }

      // Transform subject_configs into generator format
      const teachers: Teacher[] = [];
      const teacherMap = new Map<string, Teacher>();
      const subjects: SubjectDef[] = [];
      const subjectMap = new Map<string, SubjectDef>();
      const classes: ClassDef[] = [];
      const classSubjects = new Map<string, { subjectId: string; periods: number }[]>();

      // Create mapping from (classId, subjectId) -> subject_config_id
      const configMap = new Map<string, string>(); // key: "classId-subjectId", value: config.id

      // Process each subject configuration
      for (const config of subjectConfigs) {
        // Map each class to this config
        for (const classId of config.class_ids || []) {
          const key = `${classId}-${config.subject_id}`;
          configMap.set(key, config.id);
          console.log(`📋 Mapping: ${key} -> config.id: ${config.id}`);
        }

        // Add subject if not already added
        if (!subjectMap.has(config.subject_id)) {
          const subject: SubjectDef = {
            id: config.subject_id,
            name: config.subject_name,
            code: '',
            level: 'junior',
            type: config.type || 'general',
            department: config.department,
            periodsPerWeek: config.max_periods_per_week,
            doubleAllowed: config.allow_double_periods,
            doubleMaxPerWeek: 1
          };
          subjects.push(subject);
          subjectMap.set(config.subject_id, subject);
        }

        // Process teachers for this subject
        for (const teacherConfig of config.teachers || []) {
          if (!teacherMap.has(teacherConfig.teacherId)) {
            const teacher: Teacher = {
              id: teacherConfig.teacherId,
              name: teacherConfig.teacherName,
              first_name: teacherConfig.teacherName.split(' ')[0],
              last_name: teacherConfig.teacherName.split(' ').slice(1).join(' '),
              email: '',
              isPartTime: !teacherConfig.isFullTime,
              qualifiedSubjects: [config.subject_id],
              maxPerWeek: 20,
              maxPerDay: 6,
              availability: {}
            };

            // Set availability based on available days
            if (!teacherConfig.isFullTime && teacherConfig.availableDays) {
              const dayMap: Record<string, string> = {
                'Monday': 'mon',
                'Tuesday': 'tue',
                'Wednesday': 'wed',
                'Thursday': 'thu',
                'Friday': 'fri'
              };

              for (const fullDay of teacherConfig.availableDays) {
                const shortDay = dayMap[fullDay];
                if (shortDay) {
                  const dayConfig = settings.daysConfig.find((d: any) => d.day === shortDay);
                  if (dayConfig) {
                    teacher.availability[shortDay as 'mon' | 'tue' | 'wed' | 'thu' | 'fri'] = 
                      Array.from({ length: dayConfig.numPeriods }, (_, i) => i + 1);
                  }
                }
              }
            } else {
              // Full-time: available all days
              ['mon', 'tue', 'wed', 'thu', 'fri'].forEach(day => {
                const dayConfig = settings.daysConfig.find((d: any) => d.day === day);
                if (dayConfig) {
                  teacher.availability[day as 'mon' | 'tue' | 'wed' | 'thu' | 'fri'] = 
                    Array.from({ length: dayConfig.numPeriods }, (_, i) => i + 1);
                }
              });
            }

            teachers.push(teacher);
            teacherMap.set(teacherConfig.teacherId, teacher);
          } else {
            // Teacher already exists, add this subject to their qualified subjects
            const teacher = teacherMap.get(teacherConfig.teacherId)!;
            if (!teacher.qualifiedSubjects.includes(config.subject_id)) {
              teacher.qualifiedSubjects.push(config.subject_id);
            }
          }
        }

        // Process classes for this subject
        for (const classId of config.class_ids || []) {
          if (!classSubjects.has(classId)) {
            classSubjects.set(classId, []);
          }
          // FIXED: Use min periods to ensure we stay within weekly limits
          // The range (min-max) provides flexibility for manual adjustments later
          const minPeriods = config.min_periods_per_week || 1;
          const maxPeriods = config.max_periods_per_week || 5;
          
          // Strategy: For small ranges (1-2), use min. For larger ranges, use min + 1
          // This prevents over-scheduling while providing reasonable coverage
          const periodsToSchedule = (maxPeriods - minPeriods) >= 2 ? minPeriods + 1 : minPeriods;
          
          console.log(`🔢 ${config.subject_name} for class ${classMap.get(classId)}: min=${minPeriods}, max=${maxPeriods}, scheduling=${periodsToSchedule} periods`);
          
          classSubjects.get(classId)!.push({
            subjectId: config.subject_id,
            periods: periodsToSchedule
          });
        }
      }

      // Create class objects
      for (const [classId, subjectsList] of classSubjects.entries()) {
        const className = classMap.get(classId) || classId;
        classes.push({
          id: classId,
          name: className,
          display_name: className,
          level: 'junior',
          department: 'science',
          subjects: subjectsList
        });
      }

      console.log('');
      console.log('══════════════════════════════════════');
      console.log('📊 TIMETABLE GENERATION STARTING');
      console.log('═══════════════════════════════════════');
      console.log(`  ✓ ${classes.length} classes configured`);
      console.log(`  ✓ ${subjects.length} subjects configured`);
      console.log(`  ✓ ${teachers.length} teachers configured`);
      
      classes.forEach(cls => {
        console.log(`  📚 ${cls.name}: ${cls.subjects.length} subjects`);
        cls.subjects.forEach(s => {
          const subj = subjectMap.get(s.subjectId);
          console.log(`     - ${subj?.name}: ${s.periods} periods/week`);
        });
      });

      const input = {
        daysConfig: settings.daysConfig,
        breaks: settings.breaks || [],
        classes,
        teachers,
        subjects,
        blocked: settings.blocked || {},
        allowBackToBack: settings.allowBackToBackSameTeacher,
        doublePeriodOnce: settings.doublePeriodOncePerWeek
      };

      const result = await generateTimetable(input);

      // Load subject_pairings to map pairGroupId -> subject_id -> configId
      const { data: pairingsForMapping } = await supabase
        .from('subject_pairings')
        .select('pair_group_id, subject_id');
      
      const pairGroupToSubjectId = new Map<string, string>();
      if (pairingsForMapping) {
        pairingsForMapping.forEach(pairing => {
          if (!pairGroupToSubjectId.has(pairing.pair_group_id)) {
            pairGroupToSubjectId.set(pairing.pair_group_id, pairing.subject_id);
          }
        });
      }
      console.log('🔗 Mapped', pairGroupToSubjectId.size, 'pair groups to subject IDs for config lookup');

      // Attach configMap to slots for later use during save
      result.slots.forEach((slot: any) => {
        if (slot.subjectId && slot.classId) {
          const key = `${slot.classId}-${slot.subjectId}`;
          slot.configId = configMap.get(key);
          if (!slot.configId) {
            console.warn(`⚠️ No config found for slot: classId=${slot.classId}, subjectId=${slot.subjectId}, key=${key}`);
          }
        } else if (slot.pairGroupId && slot.classId) {
          // For paired slots, map pairGroupId -> subject_id -> configId
          const subjectId = pairGroupToSubjectId.get(slot.pairGroupId);
          if (subjectId) {
            const key = `${slot.classId}-${subjectId}`;
            slot.configId = configMap.get(key);
            if (!slot.configId) {
              console.warn(`⚠️ No config found for paired slot: classId=${slot.classId}, pairGroupId=${slot.pairGroupId}, subjectId=${subjectId}, key=${key}`);
            } else {
              console.log(`✅ Mapped paired slot: ${slot.pairGroupId} -> ${subjectId} -> config ${slot.configId}`);
            }
          } else {
            console.error(`❌ No subject_id found for pair group: ${slot.pairGroupId}`);
          }
        }
      });
      
      console.log(`✅ Mapped ${result.slots.filter((s: any) => s.configId).length}/${result.slots.length} slots to configs (including paired)`);

      // Load pair group names for display
      const { data: pairingsDataDisplay } = await supabase
        .from('subject_pairings')
        .select('pair_group_id, pair_group_name');
      
      const pairNamesMap = new Map<string, string>();
      if (pairingsDataDisplay) {
        pairingsDataDisplay.forEach(p => {
          if (!pairNamesMap.has(p.pair_group_id)) {
            pairNamesMap.set(p.pair_group_id, p.pair_group_name || p.pair_group_id);
          }
        });
      }

      setSlots(result.slots);
      setConflicts(result.conflicts);
      setWarnings(result.warnings);
      
      // Store names for display
      const subjectNameMap = new Map<string, string>();
      subjectMap.forEach((subject, id) => {
        subjectNameMap.set(id, subject.name);
      });
      
      const teacherNameMap = new Map<string, string>();
      teacherMap.forEach((teacher, id) => {
        teacherNameMap.set(id, teacher.name);
      });
      
      setSubjectNames(subjectNameMap);
      setClassNames(classMap);
      setPairGroupNames(pairNamesMap);
      setTeacherNames(teacherNameMap);

      console.log('');
      console.log('✅ GENERATION COMPLETE!');
      console.log(`   Total slots: ${result.slots.length}`);
      console.log(`   Conflicts: ${result.conflicts.length}`);
      console.log(`   Warnings: ${result.warnings.length}`);
      console.log('   ⚠️  IMPORTANT: Click "Save Timetable" to persist changes');
      console.log('═══════════════════════════════════════');
      console.log('');
      
      if (result.conflicts.length === 0) {
        toast.success(`Timetable generated! ${result.slots.length} periods scheduled. Click "Save Timetable" to persist.`);
      } else {
        toast.warning(`Timetable generated with ${result.conflicts.length} conflict(s).`);
      }

      // Don't pass slots here - wait until after save

    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error(error.message || 'Failed to generate timetable');
    } finally {
      setGenerating(false);
    }
  };

  const handleSave = async () => {
    if (slots.length === 0) {
      toast.error('No timetable to save. Please generate first.');
      return;
    }

    try {
      setSaving(true);

      // Reload subject_configs to get fresh config IDs
      const { data: currentConfigs, error: configError } = await supabase
        .from('subject_configs')
        .select('id, subject_id, class_ids');

      if (configError || !currentConfigs) {
        toast.error('Failed to load subject configurations');
        setSaving(false);
        return;
      }

      // Rebuild the config map with current data
      const freshConfigMap = new Map<string, string>();
      for (const config of currentConfigs) {
        for (const classId of config.class_ids || []) {
          const key = `${classId}-${config.subject_id}`;
          freshConfigMap.set(key, config.id);
        }
      }

      console.log('🔄 Rebuilt config map with', freshConfigMap.size, 'entries');

      // Load subject_pairings to map pairGroupId -> subject_id for paired slots
      const { data: pairingsForMapping } = await supabase
        .from('subject_pairings')
        .select('pair_group_id, subject_id');
      
      const pairGroupToSubjectId = new Map<string, string>();
      if (pairingsForMapping) {
        pairingsForMapping.forEach(pairing => {
          if (!pairGroupToSubjectId.has(pairing.pair_group_id)) {
            pairGroupToSubjectId.set(pairing.pair_group_id, pairing.subject_id);
          }
        });
      }
      console.log('🔗 Mapped', pairGroupToSubjectId.size, 'pair groups to subject IDs for config lookup');

      // Re-map all slots with fresh config IDs
      slots.forEach((slot: any) => {
        if (slot.subjectId && slot.classId) {
          const key = `${slot.classId}-${slot.subjectId}`;
          const freshConfigId = freshConfigMap.get(key);
          if (freshConfigId) {
            slot.configId = freshConfigId;
          } else {
            console.warn(`⚠️ No fresh config for: ${key}`);
          }
        } else if (slot.pairGroupId && slot.classId) {
          // For paired slots, map pairGroupId -> subject_id -> configId
          const subjectId = pairGroupToSubjectId.get(slot.pairGroupId);
          if (subjectId) {
            const key = `${slot.classId}-${subjectId}`;
            const freshConfigId = freshConfigMap.get(key);
            if (freshConfigId) {
              slot.configId = freshConfigId;
              console.log(`✅ Remapped paired slot: ${slot.pairGroupId} -> ${subjectId} -> config ${freshConfigId}`);
            } else {
              console.warn(`⚠️ No fresh config for paired slot: ${key}`);
            }
          } else {
            console.error(`❌ No subject_id found for pair group: ${slot.pairGroupId}`);
          }
        }
      });

      // Load class names for slot_name generation
      const { data: classesData } = await supabase
        .from('classes')
        .select('id, name');
      
      const classMap = new Map(classesData?.map(c => [c.id, c.name]) || []);
      console.log('📚 Loaded', classMap.size, 'class names');

      // Load subject_pairings to map pair_group_id -> pairing UUID (CRITICAL FOR handleSave!)
      const { data: pairingsDataForSave } = await supabase
        .from('subject_pairings')
        .select('id, pair_group_id');
      
      // Build a map: pair_group_id -> first pairing UUID
      const pairGroupToUuidMap = new Map<string, string>();
      if (pairingsDataForSave) {
        pairingsDataForSave.forEach(pairing => {
          if (!pairGroupToUuidMap.has(pairing.pair_group_id)) {
            pairGroupToUuidMap.set(pairing.pair_group_id, pairing.id);
          }
        });
      }
      console.log('🔗 Loaded', pairGroupToUuidMap.size, 'pair group UUID mappings IN handleSave');

      // Get or create timetable_settings_id
      let settingsId: string;
      const { data: existingSettings } = await supabase
        .from('timetable_settings')
        .select('id')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingSettings) {
        settingsId = existingSettings.id;
      } else {
        // Create settings via API endpoint if none exists
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          throw new Error('Not authenticated');
        }

        const headers = {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        };

        const settingsResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-settings`,
          {
            method: 'POST',
            headers,
            body: JSON.stringify({ settings: settings || {} })
          }
        );

        if (!settingsResponse.ok) {
          const errorData = await settingsResponse.json();
          throw new Error(`Failed to create settings: ${errorData.error || settingsResponse.statusText}`);
        }

        const settingsData = await settingsResponse.json();
        if (!settingsData.id) {
          throw new Error('Settings created but no ID returned');
        }

        settingsId = settingsData.id;
        console.log('✅ Created new timetable settings:', settingsId);
      }

      // Note: We're not using pairs_id due to FK constraint mismatch
      // Paired subjects are handled via subject_configs table
      // IMPORTANT: ALL slots (regular and paired) must have valid subject_config_id
      // The pairs_id field should always be NULL

      // Transform slots to match database schema
      const slotsToSave = slots
        .filter(slot => slot.configId) // Only save slots with valid config ID
        .map(slot => {
          // Get the class name from classMap
          const className = classMap.get(slot.classId) || slot.classId;
          
          // Convert day: mon -> Monday, tue -> Tuesday, etc.
          const dayNames: Record<string, string> = {
            'mon': 'Monday',
            'tue': 'Tuesday',
            'wed': 'Wednesday',
            'thu': 'Thursday',
            'fri': 'Friday'
          };
          const dayName = dayNames[slot.day.toLowerCase()] || slot.day;
          
          // Create slot_name as "JSS1-Monday-1" format
          const slotName = `${className}-${dayName}-${slot.period}`;

          // ALL slots use subject_config_id, pairs_id is always null
          return {
            timetable_settings_id: settingsId,
            slot_name: slotName,
            start_period: slot.period,
            end_period: slot.period,
            subject_config_id: slot.configId,
            teacher_id: slot.teacherId || null,
            pairs_id: null  // Always null as per comment above
          };
        });

      console.log('💾 Saving slots:', {
        total: slotsToSave.length,
        sample: slotsToSave.slice(0, 3)
      });
      
      // CRITICAL: Verify NO slots have non-null pairs_id
      const slotsWithPairsId = slotsToSave.filter(s => s.pairs_id !== null);
      if (slotsWithPairsId.length > 0) {
        console.error('🚨 CRITICAL ERROR: Found slots with non-null pairs_id before sending to backend!');
        console.error('   These will cause foreign key errors:', slotsWithPairsId);
        throw new Error(`Found ${slotsWithPairsId.length} slots with invalid pairs_id. All pairs_id values must be null.`);
      } else {
        console.log('✅ Verified: All slots have pairs_id = null');
      }
      
      // Save slots via API endpoint
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('Not authenticated');
      }

      const saveResponse = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/timetable-slots`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            slots: slotsToSave,
            settingsId: settingsId
          })
        }
      );

      if (!saveResponse.ok) {
        const errorData = await saveResponse.json();
        throw new Error(`Failed to save slots: ${errorData.error || saveResponse.statusText}`);
      }

      toast.success('Timetable saved successfully!');
      // Transform slots to TimetableSlot format for display
      const displaySlots = slots.map(slot => {
        const className = classMap.get(slot.classId) || slot.classId;
        const dayNames: Record<string, string> = {
          'mon': 'Monday',
          'tue': 'Tuesday',
          'wed': 'Wednesday',
          'thu': 'Thursday',
          'fri': 'Friday'
        };
        const dayName = dayNames[slot.day.toLowerCase()] || slot.day;
        
        // Get subject name and teacher name
        let subjectDisplay = '';
        if (slot.caption) {
          subjectDisplay = slot.caption;
        } else if (slot.subjectId) {
          subjectDisplay = subjectNames.get(slot.subjectId) || 'Unknown Subject';
        } else if (slot.pairGroupId) {
          subjectDisplay = pairGroupNames.get(slot.pairGroupId) || 'Paired Subject';
        }
        
        const teacherDisplay = teacherNames.get(slot.teacherId) || '';
        
        return {
          id: slot.id,
          slotName: `${className}-${dayName}-${slot.period}`,
          class: className,
          day: dayName,
          period: slot.period,
          startPeriod: slot.period,
          endPeriod: slot.period,
          startTime: slot.startTime || '',
          endTime: slot.endTime || '',
          subject: subjectDisplay,
          teacher: teacherDisplay,
          isPaired: !!slot.pairGroupId,
          pairsId: slot.pairGroupId || null,
          subjectConfigId: slot.configId || null,
          caption: slot.caption || null
        };
      });
      
      // Pass the generated slots to parent
      onSave(displaySlots);

    } catch (error: any) {
      console.error('Save error:', error);
      toast.error('Failed to save timetable');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Timetable Generator</h2>
          <p className="text-slate-600">Generate and manage class timetables</p>
        </div>
        <Button onClick={onClose} variant="ghost" size="icon">
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button 
          onClick={handleGenerate} 
          disabled={generating || !settings}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {generating ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Calendar className="h-4 w-4 mr-2" />
              Generate Timetable
            </>
          )}
        </Button>

        {slots.length > 0 && (
          <Button 
            onClick={handleSave} 
            disabled={saving}
            className="bg-green-600 hover:bg-green-700"
          >
            {saving ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Save Timetable
              </>
            )}
          </Button>
        )}
      </div>

      {/* Conflicts */}
      {conflicts.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <div className="font-medium mb-2">Conflicts detected:</div>
            <ul className="list-disc pl-5 space-y-1">
              {conflicts.map((conflict, idx) => (
                <li key={idx}>{conflict}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      {/* Warnings */}
      {warnings.length > 0 && (
        <Alert className="border-yellow-200 bg-yellow-50">
          <AlertTriangle className="h-4 w-4 text-yellow-600" />
          <AlertDescription className="text-yellow-800">
            <div className="font-medium mb-2">Warnings:</div>
            <ul className="list-disc pl-5 space-y-1">
              {warnings.slice(0, 5).map((warning, idx) => (
                <li key={idx}>{warning}</li>
              ))}
            </ul>
            {warnings.length > 5 && (
              <p className="mt-2 text-sm">... and {warnings.length - 5} more warnings</p>
            )}
          </AlertDescription>
        </Alert>
      )}

      {/* Timetable View */}
      {slots.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Timetable ({slots.length} periods)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Group slots by class */}
              {Array.from(new Set(slots.map(s => s.classId))).map(classId => {
                const classSlots = slots.filter(s => s.classId === classId);
                const className = classNames.get(classId) || classId;
                
                return (
                  <div key={classId} className="border rounded-lg overflow-hidden">
                    <div className="bg-slate-100 px-4 py-2 font-semibold">
                      {className.toUpperCase()}
                    </div>
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="bg-slate-50">
                            <th className="border p-2 text-left">Period</th>
                            <th className="border p-2 text-left">Monday</th>
                            <th className="border p-2 text-left">Tuesday</th>
                            <th className="border p-2 text-left">Wednesday</th>
                            <th className="border p-2 text-left">Thursday</th>
                            <th className="border p-2 text-left">Friday</th>
                          </tr>
                        </thead>
                        <tbody>
                          {Array.from({ length: 10 }, (_, i) => i + 1).map(period => (
                            <tr key={period}>
                              <td className="border p-2 font-medium bg-slate-50">{period}</td>
                              {['mon', 'tue', 'wed', 'thu', 'fri'].map(day => {
                                const slot = classSlots.find(s => s.day === day && s.period === period);
                                return (
                                  <td key={day} className="border p-2">
                                    {slot ? (
                                      <div className="text-sm">
                                        {slot.caption ? (
                                          <div className="italic text-slate-600">{slot.caption}</div>
                                        ) : slot.pairGroupId ? (
                                          <div>
                                            <div className="font-medium text-purple-600">
                                              {pairGroupNames.get(slot.pairGroupId) || slot.pairGroupId}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                              {slot.startTime} - {slot.endTime}
                                            </div>
                                          </div>
                                        ) : slot.subjectId ? (
                                          <div>
                                            <div className="font-medium text-blue-600">
                                              {subjectNames.get(slot.subjectId) || slot.subjectId.substring(0, 12)}
                                            </div>
                                            <div className="text-xs text-slate-500">
                                              {teacherNames.get(slot.teacherId || '') || ''}
                                            </div>
                                            <div className="text-xs text-slate-400">
                                              {slot.startTime} - {slot.endTime}
                                            </div>
                                          </div>
                                        ) : null}
                                      </div>
                                    ) : (
                                      <div className="text-slate-300 text-xs">-</div>
                                    )}
                                  </td>
                                );
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {slots.length === 0 && !generating && (
        <Card>
          <CardContent className="p-12 text-center text-slate-500">
            <Calendar className="h-12 w-12 mx-auto mb-4 text-slate-300" />
            <p>No timetable generated yet.</p>
            <p className="text-sm mt-2">Click "Generate Timetable" to create a new schedule.</p>
          </CardContent>
        </Card>
      )}

      {/* Debug Component */}
      <DebugPairings />
    </div>
  );
}