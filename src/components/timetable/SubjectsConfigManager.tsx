import React, { useState, useEffect, useRef } from 'react';
import { flushSync } from 'react-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  BookOpen, 
  ChevronRight, 
  ChevronDown, 
  Plus, 
  Save, 
  Users, 
  Calendar,
  Clock,
  Settings,
  CheckCircle,
  AlertTriangle,
  Trash2,
  Edit2,
  School
} from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { toast } from 'sonner@2.0.3';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';

interface Subject {
  id: string;
  name: string;
  code: string;
  level: 'jss' | 'sss' | 'both';
  type?: 'core' | 'elective';
  department?: 'general' | 'science' | 'arts' | 'commercial';
}

interface Teacher {
  id: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
}

interface Class {
  id: string;
  name: string;
  level: 'jss' | 'sss';
  section_id?: string;
  section_name?: string | null;
  display_name?: string;
}

interface TeacherAssignment {
  teacherId: string;
  teacherName: string;
  isFullTime: boolean;
  daysPerWeek?: number;
  availableDays?: string[];
  classIds: string[];
}

interface SubjectConfig {
  subjectId: string;
  subjectName: string;
  classIds: string[];
  teachers: TeacherAssignment[];
  minPeriodsPerWeek: number;
  maxPeriodsPerWeek: number;
  allowDoublePeriods: boolean;
  preferredTimeSlots: string[];
  type?: 'core' | 'elective';
  department?: 'general' | 'science' | 'arts' | 'commercial';
  isPairedSubject?: boolean;   // For JSS classes - marks subject for pairing in Pairs tab
  isDepartmental?: boolean;    // For SSS classes - marks subject for departmental grouping in Pairs tab
}

const DAYS_OF_WEEK = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

export function SubjectsConfigManager() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [classes, setClasses] = useState<Class[]>([]);
  const [configs, setConfigs] = useState<SubjectConfig[]>([]);
  const [expandedSubjects, setExpandedSubjects] = useState<Set<string>>(new Set());
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  // Force re-render trigger when configs change
  const [configVersion, setConfigVersion] = useState(0);
  // Track configured subject IDs separately for immediate UI updates
  const [configuredSubjectIds, setConfiguredSubjectIds] = useState<Set<string>>(new Set());
  
  // CRITICAL: Track if we've successfully loaded data and have valid configs
  const hasValidDataRef = useRef(false);
  const lastConfigCountRef = useRef(0);

  // Dialog states
  const [showConfigDialog, setShowConfigDialog] = useState(false);
  const [editingConfig, setEditingConfig] = useState<SubjectConfig | null>(null);
  const [tempSelectedClasses, setTempSelectedClasses] = useState<string[]>([]);
  const [tempTeachers, setTempTeachers] = useState<TeacherAssignment[]>([]);
  const [tempMinPeriods, setTempMinPeriods] = useState(2);
  const [tempMaxPeriods, setTempMaxPeriods] = useState(5);
  const [tempAllowDouble, setTempAllowDouble] = useState(true);
  const [tempType, setTempType] = useState<'core' | 'elective'>('core');
  const [tempDepartment, setTempDepartment] = useState<'general' | 'science' | 'arts' | 'commercial'>('general');
  const [tempIsPairedSubject, setTempIsPairedSubject] = useState(false);
  const [tempIsDepartmental, setTempIsDepartmental] = useState(false);
  const [tempLevelSelection, setTempLevelSelection] = useState<'junior' | 'senior' | 'both' | ''>('');

  useEffect(() => {
    console.log('SubjectsConfigManager mounted, fetching initial data...');
    fetchData();
  }, []);

  // Update configuredSubjectIds whenever configs changes
  useEffect(() => {
    const newConfiguredIds = new Set(
      configs
        .filter(c => c != null && c.subjectId != null)
        .map(c => c.subjectId)
    );
    console.log('🔄 [useEffect] configs changed, updating configured subject IDs:', Array.from(newConfiguredIds));
    console.log('🔄 [useEffect] This should trigger a re-render with updated buttons');
    setConfiguredSubjectIds(newConfiguredIds);
  }, [configs]);

  const fetchData = async (force = false) => {
    // Skip fetch if we already have valid data and this isn't a forced refresh
    if (!force && hasValidDataRef.current && configs.length > 0) {
      console.log('⏭️ Skipping fetch - already have valid data in state');
      console.log(`   Current configs: ${configs.length}, Last known: ${lastConfigCountRef.current}`);
      return;
    }
    
    try {
      console.log('=== FETCHING DATA (LOCAL-FIRST MODE) ===');
      setLoading(true);

      // TEST: Check Supabase connection
      console.log('🔍 Testing Supabase client:', supabase ? 'Client exists' : 'Client is null');
      console.log('🔍 Supabase client auth:', await supabase.auth.getSession());
      
      // Fetch subjects, teachers, and classes from Supabase DIRECTLY (no backend needed!)
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      const { data: teachersData, error: teachersError } = await supabase
        .from('profiles')
        .select('*')
        .eq('role', 'teacher')
        .order('first_name');

      const { data: classesData, error: classesError } = await supabase
        .from('classes')
        .select('*')
        .order('name');

      if (subjectsError || teachersError || classesError) {
        console.error('❌ DATABASE FETCH ERRORS:', { 
          subjectsError, 
          teachersError, 
          classesError 
        });
        
        // Log specific error details
        if (classesError) {
          console.error('❌ CLASSES ERROR DETAILS:', {
            message: classesError.message,
            code: classesError.code,
            details: classesError.details,
            hint: classesError.hint
          });
        }
        if (teachersError) {
          console.error('❌ TEACHERS ERROR DETAILS:', {
            message: teachersError.message,
            code: teachersError.code,
            details: teachersError.details,
            hint: teachersError.hint
          });
        }
        
        throw new Error('Failed to fetch data from database');
      }

      // Load configs from database
      const { data: dbConfigsData, error: configsError } = await supabase
        .from('subject_configs')
        .select('*')
        .order('subject_name');

      if (configsError) {
        console.error('❌ Error loading configs:', configsError);
        throw new Error('Failed to fetch configurations from database');
      }

      // Transform database format to our internal format
      const configsData: SubjectConfig[] = (dbConfigsData || []).map((dbConfig: any) => ({
        subjectId: dbConfig.subject_id,
        subjectName: dbConfig.subject_name,
        classIds: dbConfig.class_ids || [],
        teachers: dbConfig.teachers || [],
        minPeriodsPerWeek: dbConfig.min_periods_per_week,
        maxPeriodsPerWeek: dbConfig.max_periods_per_week,
        allowDoublePeriods: dbConfig.allow_double_periods,
        preferredTimeSlots: dbConfig.preferred_time_slots || [],
        type: dbConfig.type,
        department: dbConfig.department,
        isPairedSubject: dbConfig.is_paired_subject,
        isDepartmental: dbConfig.is_departmental
      }));

      console.log('Subjects from database:', subjectsData?.length || 0);
      console.log('Teachers from database:', teachersData?.length || 0);
      console.log('Classes from database:', classesData?.length || 0);
      console.log('Configs from database:', configsData.length);
      
      // Log actual data to verify
      if (classesData && classesData.length > 0) {
        console.log('📚 Classes data sample:', classesData.slice(0, 3));
      } else {
        console.log('⚠️ WARNING: No classes returned from database!');
      }

      // Set the fetched data
      setSubjects(subjectsData || []);
      setTeachers(teachersData || []);
      setClasses(classesData || []);
      
      // Update configs and configured IDs
      const validConfigs = configsData.filter((c: SubjectConfig | null) => c != null && c.subjectId);
      console.log(`Valid configs: ${validConfigs.length}`);
      
      setConfigs(validConfigs);
      const newConfiguredIds = new Set(validConfigs.map((c: SubjectConfig) => c.subjectId));
      setConfiguredSubjectIds(newConfiguredIds);
      hasValidDataRef.current = true;
      lastConfigCountRef.current = validConfigs.length;
      
      console.log('✅ DATA LOADED - Configured subject IDs:', Array.from(newConfiguredIds));
    } catch (error) {
      console.error('❌ Error fetching data:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const toggleSubject = (subjectId: string) => {
    const newExpanded = new Set(expandedSubjects);
    if (newExpanded.has(subjectId)) {
      newExpanded.delete(subjectId);
    } else {
      newExpanded.add(subjectId);
    }
    setExpandedSubjects(newExpanded);
  };

  const openConfigDialog = (subject: Subject) => {
    console.log('=== OPENING CONFIG DIALOG ===');
    console.log('Subject:', subject);
    console.log('Current configs in state:', configs);
    console.log('Looking for existing config for subject ID:', subject.id);
    console.log('📊 DATA CHECK - classes:', classes.length, 'teachers:', teachers.length, 'subjects:', subjects.length);
    
    const existingConfig = configs.find(c => c && c.subjectId === subject.id);
    console.log('Found existing config:', existingConfig);
    
    if (existingConfig) {
      console.log('Loading existing configuration...');
      console.log('isPairedSubject:', existingConfig.isPairedSubject);
      console.log('isDepartmental:', existingConfig.isDepartmental);
      
      setEditingConfig(existingConfig);
      setTempSelectedClasses(existingConfig.classIds);
      setTempTeachers(existingConfig.teachers);
      setTempMinPeriods(existingConfig.minPeriodsPerWeek);
      setTempMaxPeriods(existingConfig.maxPeriodsPerWeek);
      setTempAllowDouble(existingConfig.allowDoublePeriods);
      // FIX: Validate type - only "core" or "elective" allowed
      const validType = (existingConfig.type === 'core' || existingConfig.type === 'elective') ? existingConfig.type : 'core';
      setTempType(validType);
      // FIX: Ensure department is lowercase
      const validDepartment = existingConfig.department?.toLowerCase() as 'general' | 'science' | 'arts' | 'commercial';
      setTempDepartment(validDepartment || 'general');
      
      // Auto-detect level from existing config FIRST
      const hasSSS = existingConfig.classIds.some(classId => {
        const cls = classes.find(c => c.id === classId);
        return cls?.name.toLowerCase().startsWith('ss');
      });
      const hasJSS = existingConfig.classIds.some(classId => {
        const cls = classes.find(c => c.id === classId);
        return cls?.name.toLowerCase().startsWith('jss');
      });
      
      let detectedLevel = '';
      if (hasSSS && hasJSS) detectedLevel = 'both';
      else if (hasSSS) detectedLevel = 'senior';
      else if (hasJSS) detectedLevel = 'junior';
      
      console.log('Auto-detected level:', detectedLevel);
      setTempLevelSelection(detectedLevel);
      
      // CRITICAL FIX: Only load isPairedSubject/isDepartmental if compatible with detected level
      // If Senior-only, clear isPairedSubject (pairs are JSS only)
      if (detectedLevel === 'senior') {
        setTempIsPairedSubject(false); // Always false for Senior-only
        setTempIsDepartmental(existingConfig.isDepartmental || false);
      }
      // If Junior-only, clear isDepartmental (departmental is SSS only)
      else if (detectedLevel === 'junior') {
        setTempIsPairedSubject(existingConfig.isPairedSubject || false);
        setTempIsDepartmental(false); // Always false for Junior-only
      }
      // If both, load both settings
      else {
        setTempIsPairedSubject(existingConfig.isPairedSubject || false);
        setTempIsDepartmental(existingConfig.isDepartmental || false);
      }
      
      console.log('Loaded temp state - isPaired:', existingConfig.isPairedSubject, 'isDepartmental:', existingConfig.isDepartmental);
    } else {
      console.log('No existing config found, creating new...');
      setEditingConfig({
        subjectId: subject.id,
        subjectName: subject.name,
        classIds: [],
        teachers: [],
        minPeriodsPerWeek: 2,
        maxPeriodsPerWeek: 5,
        allowDoublePeriods: true,
        preferredTimeSlots: [],
        type: subject.type,
        department: subject.department
      });
      setTempSelectedClasses([]);
      setTempTeachers([]);
      setTempMinPeriods(2);
      setTempMaxPeriods(5);
      setTempAllowDouble(true);
      // FIX: subject.type might be "departmental" or other invalid values from subjects table
      // We only allow "core" or "elective" in subject_configs
      const validType = (subject.type === 'core' || subject.type === 'elective') ? subject.type : 'core';
      setTempType(validType);
      // FIX: department must be lowercase
      const validDepartment = subject.department?.toLowerCase() as 'general' | 'science' | 'arts' | 'commercial';
      setTempDepartment(validDepartment || 'general');
      setTempIsPairedSubject(false);
      setTempIsDepartmental(false);
      setTempLevelSelection('');
    }
    
    setSelectedSubject(subject.id);
    setShowConfigDialog(true);
    console.log('=== CONFIG DIALOG OPENED ===');
    
    // Force refresh data if classes are empty
    if (classes.length === 0 || teachers.length === 0 || subjects.length === 0) {
      console.log('⚠️ Missing data detected, forcing refresh...');
      fetchData(true);
    }
  };

  const addTeacher = () => {
    setTempTeachers([
      ...tempTeachers,
      {
        teacherId: '',
        teacherName: '',
        isFullTime: true,
        daysPerWeek: 5,
        availableDays: DAYS_OF_WEEK,
        classIds: []
      }
    ]);
  };

  const updateTeacher = (index: number, updates: Partial<TeacherAssignment>) => {
    const newTeachers = [...tempTeachers];
    newTeachers[index] = { ...newTeachers[index], ...updates };
    
    // Update teacher name if teacher ID changed
    if (updates.teacherId) {
      const teacher = teachers.find(t => t.id === updates.teacherId);
      if (teacher) {
        newTeachers[index].teacherName = `${teacher.first_name} ${teacher.last_name}`;
      }
    }
    
    setTempTeachers(newTeachers);
  };

  const removeTeacher = (index: number) => {
    setTempTeachers(tempTeachers.filter((_, i) => i !== index));
  };

  const toggleTeacherDay = (teacherIndex: number, day: string) => {
    const teacher = tempTeachers[teacherIndex];
    const currentDays = teacher.availableDays || [];
    const newDays = currentDays.includes(day)
      ? currentDays.filter(d => d !== day)
      : [...currentDays, day];
    
    updateTeacher(teacherIndex, { 
      availableDays: newDays,
      daysPerWeek: newDays.length
    });
  };

  const toggleClassForTeacher = (teacherIndex: number, classId: string) => {
    const teacher = tempTeachers[teacherIndex];
    const currentClasses = teacher.classIds || [];
    const newClasses = currentClasses.includes(classId)
      ? currentClasses.filter(id => id !== classId)
      : [...currentClasses, classId];
    
    updateTeacher(teacherIndex, { classIds: newClasses });
  };

  const saveConfig = async () => {
    // CRITICAL: Make a defensive copy of editingConfig to prevent null reference errors
    const configToSave = editingConfig;
    
    if (!configToSave || tempSelectedClasses.length === 0) {
      toast.error('Please select at least one class');
      return;
    }

    if (tempTeachers.length === 0 || tempTeachers.some(t => !t.teacherId)) {
      toast.error('Please assign at least one teacher with valid selection');
      return;
    }

    // Validate level selection is required
    if (!tempLevelSelection) {
      toast.error('Please select a level in Step 4');
      return;
    }

    // Validate level selection matches paired/departmental settings
    if (tempIsPairedSubject && tempLevelSelection !== 'junior' && tempLevelSelection !== 'both') {
      toast.error('Paired subjects are only for Junior Secondary classes. Please select "Junior Secondary" or "Both" in Step 4.');
      return;
    }

    if (tempIsDepartmental && tempLevelSelection !== 'senior' && tempLevelSelection !== 'both') {
      toast.error('Departmental subjects are only for Senior Secondary classes. Please select "Senior Secondary" or "Both" in Step 4.');
      return;
    }

    // Get subject details
    const subject = subjects.find(s => s.id === configToSave.subjectId);
    const isSSS = tempLevelSelection === 'senior' || tempLevelSelection === 'both';
    const isJSS = tempLevelSelection === 'junior' || tempLevelSelection === 'both';

    const newConfig: SubjectConfig = {
      ...configToSave,
      classIds: tempSelectedClasses,
      teachers: tempTeachers,
      minPeriodsPerWeek: tempMinPeriods,
      maxPeriodsPerWeek: tempMaxPeriods,
      allowDoublePeriods: tempAllowDouble,
      type: isSSS ? tempType : undefined,
      department: isSSS ? tempDepartment : undefined,
      // Save isPairedSubject if it's checked, regardless of level (will show in Pairs tab for junior)
      isPairedSubject: tempIsPairedSubject ? true : undefined,
      // Save isDepartmental if it's checked, regardless of level (will show in Pairs tab for senior)
      isDepartmental: tempIsDepartmental ? true : undefined
    };

    console.log('=== SAVING CONFIG ===');
    console.log('Subject:', configToSave.subjectName);
    console.log('Level Selection:', tempLevelSelection);
    console.log('isJSS:', isJSS, 'isSSS:', isSSS);
    console.log('tempIsPairedSubject (checkbox):', tempIsPairedSubject);
    console.log('tempIsDepartmental (checkbox):', tempIsDepartmental);
    console.log('Final config isPairedSubject:', newConfig.isPairedSubject, '(will show in Pairs tab if true)');
    console.log('Final config isDepartmental:', newConfig.isDepartmental, '(will show in Departmental groups if true)');
    console.log('Full config:', newConfig);

    // Update or add config to local state
    // Filter out any null configs first to prevent errors
    const validConfigs = configs.filter(c => c != null && c.subjectId != null);
    console.log(`Working with ${validConfigs.length} valid configs (filtered from ${configs.length} total)`);
    
    let updatedConfigs: SubjectConfig[];
    const existingIndex = validConfigs.findIndex(c => c.subjectId === configToSave.subjectId);
    
    if (existingIndex >= 0) {
      console.log(`Updating existing config at index ${existingIndex}`);
      updatedConfigs = [...validConfigs];
      updatedConfigs[existingIndex] = newConfig;
    } else {
      console.log('Adding new config to array');
      updatedConfigs = [...validConfigs, newConfig];
    }

    // Save to database
    try {
      console.log('=== SAVING TO DATABASE ===');
      setSaving(true);

      console.log('Saving config:', JSON.stringify(newConfig, null, 2));

      // Transform to database format
      const dbConfig = {
        subject_id: newConfig.subjectId,
        subject_name: newConfig.subjectName,
        class_ids: newConfig.classIds,
        teachers: newConfig.teachers,
        min_periods_per_week: newConfig.minPeriodsPerWeek,
        max_periods_per_week: newConfig.maxPeriodsPerWeek,
        allow_double_periods: newConfig.allowDoublePeriods,
        preferred_time_slots: newConfig.preferredTimeSlots,
        type: newConfig.type,
        department: newConfig.department,
        is_paired_subject: newConfig.isPairedSubject || false,
        is_departmental: newConfig.isDepartmental || false
      };

      // UPSERT: Insert or update if subject_id already exists
      const { data: savedData, error: saveError } = await supabase
        .from('subject_configs')
        .upsert(dbConfig, { onConflict: 'subject_id' })
        .select();

      if (saveError) {
        console.error('❌ Database save error:', saveError);
        throw new Error(`Failed to save configuration: ${saveError.message}`);
      }

      console.log('✅ Saved to database successfully:', savedData);

      const result = { success: true, savedCount: 1 };
      
      if (result.success) {
        console.log('Database save successful!');
        console.log('Saved count:', result.savedCount);
        
        // Reload ALL configs from database to get fresh data
        const { data: allConfigsData, error: reloadError } = await supabase
          .from('subject_configs')
          .select('*')
          .order('subject_name');

        if (reloadError) {
          console.error('❌ Error reloading configs:', reloadError);
          throw new Error('Failed to reload configurations');
        }

        // Transform database format to our internal format
        const finalConfigs: SubjectConfig[] = (allConfigsData || []).map((dbConfig: any) => ({
          subjectId: dbConfig.subject_id,
          subjectName: dbConfig.subject_name,
          classIds: dbConfig.class_ids || [],
          teachers: dbConfig.teachers || [],
          minPeriodsPerWeek: dbConfig.min_periods_per_week,
          maxPeriodsPerWeek: dbConfig.max_periods_per_week,
          allowDoublePeriods: dbConfig.allow_double_periods,
          preferredTimeSlots: dbConfig.preferred_time_slots || [],
          type: dbConfig.type,
          department: dbConfig.department,
          isPairedSubject: dbConfig.is_paired_subject,
          isDepartmental: dbConfig.is_departmental
        }));
        
        console.log('Reloaded configs from database:', finalConfigs.length);
        
        console.log(`=== UPDATING STATE WITH ${finalConfigs.length} CONFIGS ===`);
        console.log('About to update configs state and trigger re-render...');
        console.log('Configs being set to state:', finalConfigs.map(c => ({ id: c.subjectId, name: c.subjectName })));
        
        // CRITICAL: Update configured IDs Set IMMEDIATELY for instant UI feedback
        const newConfiguredIds = new Set(
          finalConfigs
            .filter(c => c != null && c.subjectId != null)
            .map(c => c.subjectId)
        );
        console.log('Immediately updating configured subject IDs:', Array.from(newConfiguredIds));
        
        // Use flushSync to force SYNCHRONOUS state updates - no batching, no delays
        flushSync(() => {
          setConfiguredSubjectIds(newConfiguredIds);
          setConfigs([...finalConfigs]);
          setConfigVersion(v => v + 1);
        });
        
        console.log('✅ State updates applied SYNCHRONOUSLY via flushSync');
        
        // Update refs to remember this valid state
        hasValidDataRef.current = true;
        lastConfigCountRef.current = finalConfigs.length;
        console.log(`✅ Updated refs: hasValidData=${hasValidDataRef.current}, lastCount=${lastConfigCountRef.current}`);
        
        console.log('Local state updated, closing dialog');
        setShowConfigDialog(false);
        toast.success('Subject configuration saved successfully to database!');
        console.log('✅ Save complete - configs persisted to database and local state updated');
        console.log('✅ Button should now show "Edit" instead of "Configure"');
      } else {
        console.error('Backend save failed:', result.error);
        toast.error(result.error || 'Failed to save configuration');
      }
    } catch (error) {
      console.error('❌ Error saving config:', error);
      console.error('Error details:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace');
      console.error('Config being saved:', configToSave);
      console.error('Temp classes:', tempSelectedClasses);
      console.error('Temp teachers:', tempTeachers);
      toast.error(`Failed to save configuration: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSaving(false);
    }
  };

  const deleteConfig = async (subjectId: string) => {
    if (!confirm('Are you sure you want to delete this configuration?')) return;
    
    try {
      setSaving(true);
      
      // Delete from database
      const { error: deleteError } = await supabase
        .from('subject_configs')
        .delete()
        .eq('subject_id', subjectId);

      if (deleteError) {
        console.error('❌ Database delete error:', deleteError);
        throw new Error(`Failed to delete configuration: ${deleteError.message}`);
      }

      console.log('✅ Deleted from database successfully');

      // Reload configs from database
      const { data: allConfigsData, error: reloadError } = await supabase
        .from('subject_configs')
        .select('*')
        .order('subject_name');

      if (reloadError) {
        console.error('❌ Error reloading configs:', reloadError);
        throw new Error('Failed to reload configurations');
      }

      // Transform database format to our internal format
      const updatedConfigs: SubjectConfig[] = (allConfigsData || []).map((dbConfig: any) => ({
        subjectId: dbConfig.subject_id,
        subjectName: dbConfig.subject_name,
        classIds: dbConfig.class_ids || [],
        teachers: dbConfig.teachers || [],
        minPeriodsPerWeek: dbConfig.min_periods_per_week,
        maxPeriodsPerWeek: dbConfig.max_periods_per_week,
        allowDoublePeriods: dbConfig.allow_double_periods,
        preferredTimeSlots: dbConfig.preferred_time_slots || [],
        type: dbConfig.type,
        department: dbConfig.department,
        isPairedSubject: dbConfig.is_paired_subject,
        isDepartmental: dbConfig.is_departmental
      }));
      
      // Update state immediately
      flushSync(() => {
        setConfigs(updatedConfigs);
        const newConfiguredIds = new Set(updatedConfigs.map(c => c.subjectId));
        setConfiguredSubjectIds(newConfiguredIds);
        setConfigVersion(v => v + 1);
      });
      
      toast.success('Configuration deleted successfully');
    } catch (error) {
      console.error('Error deleting config:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete configuration');
    } finally {
      setSaving(false);
    }
  };

  const getConfig = (subjectId: string) => {
    const config = configs.find(c => c && c.subjectId === subjectId);
    // Uncomment for debugging:
    // console.log(`getConfig(${subjectId}):`, config ? 'FOUND' : 'NOT FOUND', config);
    return config;
  };

  const getClassName = (classId: string) => {
    const cls = classes.find(c => c.id === classId);
    if (!cls) return 'Unknown';
    // Use display_name if available, otherwise construct from name + section_name
    const displayName = cls.display_name || (cls.section_name ? `${cls.name} ${cls.section_name}` : cls.name);
    console.log('getClassName:', { classId, name: cls.name, section_name: cls.section_name, display_name: cls.display_name, result: displayName });
    return displayName;
  };

  const getTeacherName = (teacherId: string) => {
    const teacher = teachers.find(t => t.id === teacherId);
    return teacher ? `${teacher.first_name} ${teacher.last_name}` : 'Unknown';
  };

  const selectedSubjectData = subjects.find(s => s.id === selectedSubject);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2 sm:gap-4">
        <div>
          <h3 className="text-base sm:text-lg font-semibold">Subject Configuration</h3>
          <p className="text-xs sm:text-sm text-slate-600">
            Configure class assignments, teachers, and scheduling preferences for each subject
          </p>
          <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
            <CheckCircle className="h-3 w-3" />
            Changes are automatically saved when you click "Save Configuration"
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4">
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-xl sm:text-2xl font-bold text-blue-700">{subjects.length}</div>
          <div className="text-xs sm:text-sm text-blue-600">Total Subjects</div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-xl sm:text-2xl font-bold text-green-700">{configs.length}</div>
          <div className="text-xs sm:text-sm text-green-600">Configured</div>
        </Card>
        <Card className="p-3 sm:p-4 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="text-xl sm:text-2xl font-bold text-orange-700">{subjects.length - configs.length}</div>
          <div className="text-xs sm:text-sm text-orange-600">Not Configured</div>
        </Card>
      </div>

      {/* Subject List */}
      {loading ? (
        <Card className="p-8 text-center">
          <p className="text-slate-600">Loading subjects...</p>
        </Card>
      ) : subjects.length === 0 ? (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            No subjects found. Please add subjects in the Academic Management section first.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-2">
          {subjects.map(subject => {
            const config = getConfig(subject.id);
            const isExpanded = expandedSubjects.has(subject.id);
            // Use BOTH the config object AND the Set for immediate reactivity
            const isConfigured = configuredSubjectIds.has(subject.id) || !!config;
            
            // Debug logging for EVERY subject to see what's happening
            console.log(`[RENDER ${subject.name}] configuredSubjectIds.has: ${configuredSubjectIds.has(subject.id)}, config exists: ${!!config}, isConfigured: ${isConfigured}, button will show: ${isConfigured ? 'EDIT' : 'CONFIGURE'}`);

            return (
              <Card key={`${subject.id}-v${configVersion}-${isConfigured ? 'configured' : 'not'}-${configs.length}-${configuredSubjectIds.size}`} className={isConfigured ? 'border-green-200 bg-green-50/30' : ''}>
                <CardHeader className="p-3 sm:p-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="flex items-start gap-2 sm:gap-3 flex-1 min-w-0 overflow-hidden">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleSubject(subject.id)}
                        className="h-6 w-6 p-0 flex-shrink-0 mt-0.5"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4" />
                        ) : (
                          <ChevronRight className="h-4 w-4" />
                        )}
                      </Button>
                      <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap mb-1">
                          <h4 className="font-semibold text-sm sm:text-base break-words max-w-full">{subject.name}</h4>
                          <Badge variant="outline" className="text-xs flex-shrink-0">
                            {subject.code}
                          </Badge>
                          {subject.level === 'jss' && (
                            <Badge className="bg-blue-500 text-xs flex-shrink-0">JSS</Badge>
                          )}
                          {subject.level === 'sss' && (
                            <Badge className="bg-purple-500 text-xs flex-shrink-0">SSS</Badge>
                          )}
                          {subject.level === 'both' && (
                            <Badge className="bg-slate-500 text-xs flex-shrink-0">JSS & SSS</Badge>
                          )}
                          {isConfigured && (
                            <Badge className="bg-green-500 text-xs flex-shrink-0">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Configured</span>
                              <span className="sm:hidden">✓</span>
                            </Badge>
                          )}
                        </div>
                        {config && (
                          <div className="text-xs sm:text-sm text-slate-600 mt-1 leading-relaxed break-words max-w-full">
                            <span className="inline-block">{config.classIds.length} class(es)</span>
                            {' • '}
                            <span className="inline-block">{config.teachers.length} teacher(s)</span>
                            <br className="sm:hidden" />
                            <span className="hidden sm:inline"> • </span>
                            <span className="inline-block">{config.minPeriodsPerWeek}-{config.maxPeriodsPerWeek} periods/week</span>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 self-start">
                      <Button
                        size="sm"
                        onClick={() => openConfigDialog(subject)}
                        className="text-xs sm:text-sm bg-blue-500 hover:bg-blue-600 text-white whitespace-nowrap"
                      >
                        <Edit2 className="h-3 w-3 sm:h-4 sm:w-4 sm:mr-2" />
                        <span className="hidden sm:inline">{isConfigured ? 'Edit' : 'Configure'}</span>
                        <span className="sm:hidden">{isConfigured ? 'Edit' : 'Config'}</span>
                      </Button>
                      {isConfigured && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => deleteConfig(subject.id)}
                          className="text-xs sm:text-sm"
                        >
                          <Trash2 className="h-4 w-4 text-red-600" />
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>

                {/* Expanded Details */}
                {isExpanded && config && (
                  <CardContent className="px-3 sm:px-4 pb-4 pt-0 border-t">
                    <div className="space-y-4 mt-4">
                      {/* Classes */}
                      <div>
                        <Label className="text-xs text-slate-600 block mb-2">Classes Offering This Subject</Label>
                        <div className="flex flex-wrap gap-2">
                          {config.classIds.map(classId => (
                            <Badge key={classId} variant="secondary" className="text-xs">
                              {getClassName(classId)}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      {/* Teachers */}
                      <div>
                        <Label className="text-xs text-slate-600 block mb-2">Teacher Assignments</Label>
                        <div className="space-y-2">
                          {config.teachers.map((teacher, idx) => (
                            <Card key={idx} className="p-3">
                              <div className="space-y-2">
                                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                  <span className="font-medium text-sm break-words">{teacher.teacherName}</span>
                                  <Badge variant={teacher.isFullTime ? 'default' : 'secondary'} className="w-fit">
                                    {teacher.isFullTime ? 'Full-Time' : 'Part-Time'}
                                  </Badge>
                                </div>
                                {!teacher.isFullTime && (
                                  <div className="text-xs text-slate-600 space-y-1">
                                    <p>Available: {teacher.daysPerWeek} days/week</p>
                                    <p className="break-words">Days: {teacher.availableDays?.join(', ')}</p>
                                  </div>
                                )}
                                <div className="text-xs text-slate-600 break-words">
                                  <span className="font-medium">Teaching in:</span>{' '}
                                  {teacher.classIds.length} class(es)
                                </div>
                              </div>
                            </Card>
                          ))}
                        </div>
                      </div>

                      {/* Scheduling */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label className="text-xs text-slate-600">Periods Per Week</Label>
                          <p className="text-sm mt-1">{config.minPeriodsPerWeek} - {config.maxPeriodsPerWeek}</p>
                        </div>
                        <div>
                          <Label className="text-xs text-slate-600">Double Periods</Label>
                          <p className="text-sm mt-1">{config.allowDoublePeriods ? 'Allowed' : 'Not Allowed'}</p>
                        </div>
                      </div>

                      {/* SSS Specific */}
                      {config.type && config.department && (
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-xs text-slate-600">Type</Label>
                            <Badge className="mt-1">{config.type}</Badge>
                          </div>
                          <div>
                            <Label className="text-xs text-slate-600">Department</Label>
                            <Badge className="mt-1">{config.department}</Badge>
                          </div>
                        </div>
                      )}

                      {/* Pairing Information */}
                      {(config.isPairedSubject || config.isDepartmental) && (
                        <div className="border-t pt-3">
                          {config.isPairedSubject && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                                Paired Subject (JSS)
                              </Badge>
                              <span className="text-xs text-slate-600">
                                Configure pairs in the "Pairs" tab
                              </span>
                            </div>
                          )}
                          {config.isDepartmental && (
                            <div className="flex items-center gap-2">
                              <Badge variant="secondary" className="bg-orange-100 text-orange-800">
                                Departmental Subject (SSS)
                              </Badge>
                              <span className="text-xs text-slate-600">
                                Configure pairs in the "Pairs" tab
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Configuration Dialog */}
      <Dialog open={showConfigDialog} onOpenChange={setShowConfigDialog}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base sm:text-lg">
              <BookOpen className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
              <span className="break-words">Configure {selectedSubjectData?.name}</span>
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Set up class assignments, teachers, and scheduling preferences for this subject
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 sm:space-y-6">
            {/* STEP 1: Class Selection */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 sm:p-4">
              <Label className="text-xs sm:text-sm font-semibold mb-1 block flex items-center gap-2">
                <School className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                <span>Step 1: Select Classes Offering This Subject</span>
              </Label>
              <p className="text-xs text-slate-600 mb-3">
                Choose all classes that will learn {selectedSubjectData?.name}
              </p>
              
              {/* Debug info */}
              {classes.length === 0 && (
                <Alert className="mb-3 bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800 text-xs sm:text-sm">
                    {loading ? 'Loading classes from database...' : 'No classes found. Please refresh the page or add classes in Academic Management.'}
                  </AlertDescription>
                </Alert>
              )}
              
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
                {classes
                  .filter(cls => {
                    // Match database values: "Junior" for JSS, "Senior" for SSS
                    if (selectedSubjectData?.level === 'jss') return cls.level?.toLowerCase() === 'junior' || cls.level?.toLowerCase() === 'jss';
                    if (selectedSubjectData?.level === 'sss') return cls.level?.toLowerCase() === 'senior' || cls.level?.toLowerCase() === 'sss';
                    return true;
                  })
                  .map(cls => (
                    <div key={cls.id} className="flex items-center space-x-2 bg-white p-2 rounded border min-w-0">
                      <Checkbox
                        id={`class-${cls.id}`}
                        checked={tempSelectedClasses.includes(cls.id)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setTempSelectedClasses([...tempSelectedClasses, cls.id]);
                          } else {
                            setTempSelectedClasses(tempSelectedClasses.filter(id => id !== cls.id));
                          }
                        }}
                        className="flex-shrink-0"
                      />
                      <label htmlFor={`class-${cls.id}`} className="text-xs sm:text-sm cursor-pointer font-medium break-words flex-1 min-w-0">
                        {cls.display_name || (cls.section_name ? `${cls.name} ${cls.section_name}` : cls.name)}
                      </label>
                    </div>
                  ))}
              </div>
              
              {classes.length > 0 && classes.filter(cls => {
                // Match database values: "Junior" for JSS, "Senior" for SSS
                if (selectedSubjectData?.level === 'jss') return cls.level?.toLowerCase() === 'junior' || cls.level?.toLowerCase() === 'jss';
                if (selectedSubjectData?.level === 'sss') return cls.level?.toLowerCase() === 'senior' || cls.level?.toLowerCase() === 'sss';
                return true;
              }).length === 0 && (
                <Alert className="mt-3 bg-amber-50 border-amber-200">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <AlertDescription className="text-amber-800">
                    No classes match this subject's level ({selectedSubjectData?.level}). 
                    Available classes: {classes.length} total 
                    ({classes.filter(c => c.level?.toLowerCase() === 'junior' || c.level?.toLowerCase() === 'jss').length} Junior/JSS, {classes.filter(c => c.level?.toLowerCase() === 'senior' || c.level?.toLowerCase() === 'sss').length} Senior/SSS)
                  </AlertDescription>
                </Alert>
              )}
              
              {tempSelectedClasses.length > 0 ? (
                <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  ✓ {tempSelectedClasses.length} class(es) selected
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Please select at least one class to continue
                </p>
              )}
            </div>

            {/* STEP 2: Teacher Assignments */}
            <div className={`${tempSelectedClasses.length === 0 ? 'opacity-50 pointer-events-none' : ''} bg-green-50 border border-green-200 rounded-lg p-3 sm:p-4`}>
              <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <Label className="text-xs sm:text-sm font-semibold flex items-center gap-2 flex-wrap">
                    <Users className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Step 2: Assign Teachers</span>
                    {tempSelectedClasses.length === 0 && <Badge variant="secondary" className="text-xs">Complete Step 1 first</Badge>}
                  </Label>
                  <p className="text-xs text-slate-600 mt-1">
                    For each teacher, select which classes they will teach
                  </p>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={addTeacher}
                  disabled={tempSelectedClasses.length === 0}
                  className="w-full sm:w-auto whitespace-nowrap"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Teacher
                </Button>
              </div>

              {tempTeachers.length === 0 && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    {tempSelectedClasses.length === 0 
                      ? 'Please select classes in Step 1 before assigning teachers'
                      : 'Click "Add Teacher" to assign teachers to this subject'}
                  </AlertDescription>
                </Alert>
              )}

              {tempTeachers.length > 0 && (
                <div className="space-y-3 sm:space-y-4 mt-4">
                  {tempTeachers.map((teacher, idx) => (
                    <Card key={idx} className="p-3 sm:p-4 bg-white border-2">
                      <div className="space-y-3 sm:space-y-4">
                        {/* Teacher Header */}
                        <div className="flex items-center justify-between pb-2 border-b">
                          <span className="font-semibold text-xs sm:text-sm text-slate-700">
                            Teacher #{idx + 1}
                          </span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => removeTeacher(idx)}
                          >
                            <Trash2 className="h-4 w-4 text-red-600" />
                          </Button>
                        </div>

                        {/* Teacher Selection */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                          <div>
                            <Label className="text-xs mb-2 block font-semibold">Select Teacher</Label>
                            <Select
                              value={teacher.teacherId}
                              onValueChange={(value) => updateTeacher(idx, { teacherId: value })}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Choose a teacher..." />
                              </SelectTrigger>
                              <SelectContent>
                                {teachers.map(t => (
                                  <SelectItem key={t.id} value={t.id}>
                                    {t.first_name} {t.last_name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div>
                            <Label className="text-xs mb-2 block font-semibold">Employment Type</Label>
                            <Select
                              value={teacher.isFullTime ? 'full' : 'part'}
                              onValueChange={(value) => updateTeacher(idx, { isFullTime: value === 'full' })}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="full">Full-Time</SelectItem>
                                <SelectItem value="part">Part-Time</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        {/* Part-Time Settings */}
                        {!teacher.isFullTime && (
                          <div className="bg-amber-50 border border-amber-200 rounded p-3">
                            <Label className="text-xs mb-2 block font-semibold">Available Days (Part-Time)</Label>
                            <div className="flex flex-wrap gap-2">
                              {DAYS_OF_WEEK.map(day => (
                                <Button
                                  key={day}
                                  size="sm"
                                  variant={teacher.availableDays?.includes(day) ? 'default' : 'outline'}
                                  onClick={() => toggleTeacherDay(idx, day)}
                                >
                                  {day.substring(0, 3)}
                                </Button>
                              ))}
                            </div>
                            <p className="text-xs text-amber-700 mt-2 font-medium">
                              {teacher.daysPerWeek || 0} day(s) selected
                            </p>
                          </div>
                        )}

                        {/* Class Assignment */}
                        <div className="bg-blue-50 border border-blue-200 rounded p-3">
                          <Label className="text-xs mb-2 block font-semibold">
                            Which classes will this teacher teach?
                          </Label>
                          <p className="text-xs text-slate-600 mb-2 break-words">
                            Click to toggle. Selected classes will be highlighted in blue.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            {tempSelectedClasses.map(classId => (
                              <Button
                                key={classId}
                                size="sm"
                                variant={teacher.classIds.includes(classId) ? 'default' : 'outline'}
                                onClick={() => toggleClassForTeacher(idx, classId)}
                                className="font-medium text-xs whitespace-nowrap"
                              >
                                {getClassName(classId)}
                              </Button>
                            ))}
                          </div>
                          {teacher.classIds.length > 0 && (
                            <p className="text-xs text-blue-700 mt-2 font-medium break-words">
                              ✓ Teaching {teacher.classIds.length} class(es)
                            </p>
                          )}
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </div>

            {/* STEP 3: Scheduling Preferences */}
            <div className={`${tempSelectedClasses.length === 0 || tempTeachers.length === 0 ? 'opacity-50 pointer-events-none' : ''} bg-purple-50 border border-purple-200 rounded-lg p-3 sm:p-4`}>
              <Label className="text-xs sm:text-sm font-semibold mb-1 block flex items-start gap-2 flex-wrap">
                <Clock className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">Step 3: Set Scheduling Preferences</span>
                {(tempSelectedClasses.length === 0 || tempTeachers.length === 0) && (
                  <Badge variant="secondary" className="text-xs">Complete Steps 1 & 2 first</Badge>
                )}
              </Label>
              <p className="text-xs text-slate-600 mb-3">
                Configure how many periods per week and other scheduling rules
              </p>
              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <Label className="text-xs mb-2 block font-semibold">Min Periods/Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={tempMinPeriods}
                    onChange={(e) => setTempMinPeriods(parseInt(e.target.value) || 1)}
                    disabled={tempSelectedClasses.length === 0 || tempTeachers.length === 0}
                    className="text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs mb-2 block font-semibold">Max Periods/Week</Label>
                  <Input
                    type="number"
                    min={1}
                    max={10}
                    value={tempMaxPeriods}
                    onChange={(e) => setTempMaxPeriods(parseInt(e.target.value) || 5)}
                    disabled={tempSelectedClasses.length === 0 || tempTeachers.length === 0}
                    className="text-sm"
                  />
                </div>
              </div>

              <div className="flex items-start space-x-2 mt-3 sm:mt-4 bg-white p-3 rounded border">
                <Checkbox
                  id="allow-double"
                  checked={tempAllowDouble}
                  onCheckedChange={(checked) => setTempAllowDouble(checked as boolean)}
                  disabled={tempSelectedClasses.length === 0 || tempTeachers.length === 0}
                  className="mt-0.5 flex-shrink-0"
                />
                <label htmlFor="allow-double" className="text-xs sm:text-sm cursor-pointer font-medium flex-1 break-words">
                  Allow double periods (consecutive periods)
                </label>
              </div>

              {tempMinPeriods > 0 && tempMaxPeriods > 0 && (
                <p className="text-xs text-green-600 mt-2 font-medium flex items-start gap-1 break-words">
                  <CheckCircle className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span>✓ {tempMinPeriods}-{tempMaxPeriods} periods per week • Double periods {tempAllowDouble ? 'allowed' : 'not allowed'}</span>
                </p>
              )}
            </div>

            {/* STEP 4: Level Selection - REQUIRED */}
            <div className={`${tempSelectedClasses.length === 0 ? 'opacity-50 pointer-events-none' : ''} bg-indigo-50 border-2 border-indigo-300 rounded-lg p-3 sm:p-4`}>
              <Label className="text-xs sm:text-sm font-semibold mb-1 block flex items-start gap-2 flex-wrap">
                <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0 mt-0.5" />
                <span className="flex-1">Step 4: Select Level <span className="text-red-600">*</span></span>
                {tempSelectedClasses.length === 0 && (
                  <Badge variant="secondary" className="text-xs">Complete Step 1 first</Badge>
                )}
              </Label>
              <p className="text-xs text-slate-600 mb-3 break-words">
                <strong className="text-red-600">REQUIRED:</strong> Choose whether this subject configuration is for Junior or Senior classes. This determines which pairing options are available in Step 5.
              </p>
              <Select 
                value={tempLevelSelection} 
                onValueChange={(value: 'junior' | 'senior' | 'both') => setTempLevelSelection(value)}
                disabled={tempSelectedClasses.length === 0}
              >
                <SelectTrigger className={`bg-white ${!tempLevelSelection ? 'border-red-300 border-2' : 'border-green-300 border-2'}`}>
                  <SelectValue placeholder="⚠️ Select level (Required)..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="junior">Junior Secondary (JSS)</SelectItem>
                  <SelectItem value="senior">Senior Secondary (SSS)</SelectItem>
                  <SelectItem value="both">Both (JSS & SSS)</SelectItem>
                </SelectContent>
              </Select>
              {tempLevelSelection ? (
                <p className="text-xs text-green-600 mt-2 font-medium flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  ✓ Level selected: {tempLevelSelection === 'junior' ? 'Junior Secondary' : tempLevelSelection === 'senior' ? 'Senior Secondary' : 'Both Levels'}
                </p>
              ) : (
                <p className="text-xs text-amber-600 mt-2 font-medium flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  Please select a level to enable Step 5
                </p>
              )}
            </div>

            {/* STEP 5: Advanced Settings - Shows both JSS and SSS sections */}
            <div className={`${!tempLevelSelection ? 'opacity-50 pointer-events-none' : ''} space-y-3 sm:space-y-4`}>
              {/* SSS Specific Fields */}
              {(tempLevelSelection === 'senior' || tempLevelSelection === 'both') && (
                <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-3 sm:p-4">
                  <Label className="text-xs sm:text-sm font-semibold mb-1 block flex items-center gap-2">
                    <Settings className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span>Step 5a: Senior Secondary (SSS) Settings (Optional)</span>
                  </Label>
                  <p className="text-xs text-slate-600 mb-3 break-words">
                    Configure settings for senior secondary classes. Check "departmental subject" if you want to manage subject pairs in the Pairs tab.
                  </p>
                  <div className="space-y-4">
                    <div>
                      <Label className="text-xs mb-2 block font-semibold">Subject Type</Label>
                      <Select value={tempType} onValueChange={(value: 'core' | 'elective') => setTempType(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="core">Core (Required - Higher Priority)</SelectItem>
                          <SelectItem value="elective">Elective</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-600 mt-1">
                        Core subjects get priority in timetable generation
                      </p>
                    </div>

                    <div>
                      <Label className="text-xs mb-2 block font-semibold">Department</Label>
                      <Select value={tempDepartment} onValueChange={(value: 'general' | 'science' | 'arts' | 'commercial') => setTempDepartment(value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="general">General (All Students)</SelectItem>
                          <SelectItem value="science">Science</SelectItem>
                          <SelectItem value="arts">Arts</SelectItem>
                          <SelectItem value="commercial">Commercial</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-slate-600 mt-1">
                        General subjects are taken by all students regardless of department
                      </p>
                    </div>

                    {/* SSS Departmental Subject Checkbox */}
                    <div className="border-t border-orange-300 pt-4">
                      <div className="flex items-start space-x-3 bg-white p-3 rounded border">
                        <Checkbox
                          id="sss-departmental"
                          checked={tempIsDepartmental}
                          onCheckedChange={(checked) => {
                            setTempIsDepartmental(checked as boolean);
                          }}
                        />
                        <div className="flex-1">
                          <label htmlFor="sss-departmental" className="text-sm font-medium cursor-pointer block">
                            This is a departmental/major subject
                          </label>
                          <p className="text-xs text-slate-600 mt-1">
                            Check this for subjects that belong to departmental groupings (Science, Arts, Commercial). After checking this and saving, go to the "Pairs" tab to create departmental subject pairs.
                          </p>
                        </div>
                      </div>
                      {tempIsDepartmental && (
                        <p className="text-xs text-orange-600 mt-2 font-medium flex items-center gap-1">
                          <CheckCircle className="h-3 w-3" />
                          ✓ This subject will be available for departmental pairing in the "Pairs" tab
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* JSS Paired Subject */}
              {(tempLevelSelection === 'junior' || tempLevelSelection === 'both') && (
                <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-4">
                  <Label className="text-sm font-semibold mb-1 block flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    Step 5{tempLevelSelection === 'both' ? 'b' : ''}: Junior Secondary (JSS) Settings (Optional)
                  </Label>
                  <p className="text-xs text-slate-600 mb-3">
                    Optional settings for junior classes. Check "paired subject" if you want to manage subject pairs in the Pairs tab.
                  </p>
                  <div className="flex items-start space-x-3 bg-white p-3 rounded border">
                    <Checkbox
                      id="jss-paired"
                      checked={tempIsPairedSubject}
                      onCheckedChange={(checked) => setTempIsPairedSubject(checked as boolean)}
                    />
                    <div className="flex-1">
                      <label htmlFor="jss-paired" className="text-sm font-medium cursor-pointer block">
                        This is a paired subject
                      </label>
                      <p className="text-xs text-slate-600 mt-1">
                        Paired subjects are scheduled together (e.g., English Language & Literature). After checking this and saving, go to the "Pairs" tab to create pair groups.
                      </p>
                    </div>
                  </div>
                  {tempIsPairedSubject && (
                    <p className="text-xs text-blue-600 mt-2 font-medium flex items-center gap-1">
                      <CheckCircle className="h-3 w-3" />
                      ✓ This subject will be available for pairing in the "Pairs" tab
                    </p>
                  )}
                </div>
              )}

              {/* Placeholder when no level selected */}
              {!tempLevelSelection && (
                <Alert className="bg-slate-50 border-slate-200">
                  <AlertTriangle className="h-4 w-4 text-slate-600" />
                  <AlertDescription className="text-slate-700">
                    Complete Step 4 to unlock advanced settings for JSS and/or SSS classes
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </div>

          <DialogFooter className="flex flex-col sm:flex-row gap-2 sm:gap-0">
            <Button 
              variant="outline" 
              onClick={() => setShowConfigDialog(false)} 
              disabled={saving}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={saveConfig} 
              disabled={saving}
              className="w-full sm:w-auto"
            >
              <Save className="h-4 w-4 mr-2" />
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
