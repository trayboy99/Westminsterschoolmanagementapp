// Clean Column-to-Row Timetable Generator with PROPER Double Period Handling
// Column = Day (mon, tue, wed, thu, fri)
// Row = Period (P1, P2, P3, ..., P10)
// Cell = (Column, Row) = (Day, Period)
// Double Period = 2 consecutive rows in the SAME column

import type {
  DayConfig,
  TimetableSlot,
  Teacher,
  ClassDef,
  SubjectDef,
  BreakDef,
  GenerationResult,
  WeekDay
} from '../../types/timetable';
import { createClient } from '../../utils/supabase/client';

type BlockedMap = { [day: string]: { [period: number]: { caption?: string; isCoCurricular?: boolean } } };

interface GeneratorInput {
  daysConfig: DayConfig[];
  breaks: BreakDef[];
  classes: ClassDef[];
  teachers: Teacher[];
  subjects: SubjectDef[];
  blocked?: BlockedMap;
  allowBackToBack?: boolean;
  doublePeriodOnce?: boolean;
}

interface SubjectPairGroup {
  pair_group_id: string;
  pair_group_name: string;
  subject_ids: string[];
  level: 'junior' | 'senior';
}

interface SubjectConfigConstraint {
  subjectId: string;
  teacherId: string;
  isPartTime: boolean;
  allowedDays: string[];
  priority: 'high' | 'medium' | 'low'; // NEW: Priority level from subject_configs
}

interface Cell {
  day: string;
  period: number;
  isOccupied: boolean;
  slot?: TimetableSlot;
}

interface ClassGrid {
  classId: string;
  className: string;
  cells: Map<string, Cell>;
}

// Simple global tracker: which (teacher, day, period) combinations are occupied
const occupiedSlots = new Set<string>();

function makeId(prefix = 's') {
  return `${prefix}_${Date.now().toString(36)}_${Math.floor(Math.random() * 9000 + 1000)}`;
}

function getCellKey(day: string, period: number): string {
  return `${day}-${period}`;
}

function getSlotKey(teacherId: string, day: string, period: number): string {
  return `${teacherId}|${day}|${period}`;
}

async function fetchSubjectPairGroups(): Promise<SubjectPairGroup[]> {
  const supabase = createClient();
  
  try {
    const { data: pairingsData, error } = await supabase
      .from('subject_pairings')
      .select('*')
      .order('pair_group_id');

    if (error) return [];
    if (!pairingsData || pairingsData.length === 0) return [];

    const groupsMap = new Map<string, SubjectPairGroup>();
    
    for (const pairing of pairingsData) {
      if (!groupsMap.has(pairing.pair_group_id)) {
        groupsMap.set(pairing.pair_group_id, {
          pair_group_id: pairing.pair_group_id,
          pair_group_name: pairing.pair_group_name || `Pair ${pairing.pair_group_id}`,
          subject_ids: [],
          level: pairing.level || 'junior'
        });
      }
      groupsMap.get(pairing.pair_group_id)!.subject_ids.push(pairing.subject_id);
    }

    return Array.from(groupsMap.values());
  } catch (err) {
    console.error('[Generator] Exception fetching pairs:', err);
    return [];
  }
}

async function fetchSubjectConfigConstraints(): Promise<SubjectConfigConstraint[]> {
  const supabase = createClient();
  
  try {
    const { data: subjectConfigs, error} = await supabase
      .from('subject_configs')
      .select('subject_id, teachers, type');

    if (error) return [];
    if (!subjectConfigs) return [];

    const constraints: SubjectConfigConstraint[] = [];

    for (const config of subjectConfigs) {
      // Determine priority from type: 'core' = high, 'elective' = low
      const priority: 'high' | 'medium' | 'low' = config.type === 'core' ? 'high' : 'low';
      
      if (config.teachers && Array.isArray(config.teachers)) {
        for (const teacherConfig of config.teachers) {
          constraints.push({
            subjectId: config.subject_id,
            teacherId: teacherConfig.teacherId,
            isPartTime: !teacherConfig.isFullTime,
            allowedDays: teacherConfig.isFullTime ? [] : (teacherConfig.availableDays || []),
            priority // Add priority for all subjects
          });
        }
      }
    }

    return constraints;
  } catch (err) {
    console.error('[Generator] Exception fetching subject configs:', err);
    return [];
  }
}

function calculateTime(period: number, startHour = 8, minutesPerPeriod = 40): { start: string; end: string } {
  const startMinutes = startHour * 60 + (period - 1) * minutesPerPeriod;
  const endMinutes = startMinutes + minutesPerPeriod;
  
  const formatTime = (mins: number) => {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
  };
  
  return {
    start: formatTime(startMinutes),
    end: formatTime(endMinutes)
  };
}

function buildVacancyGrid(cls: ClassDef, daysConfig: DayConfig[]): ClassGrid {
  const cells = new Map<string, Cell>();
  
  for (const dayConfig of daysConfig) {
    for (let period = 1; period <= dayConfig.numPeriods; period++) {
      const key = getCellKey(dayConfig.day, period);
      cells.set(key, {
        day: dayConfig.day,
        period,
        isOccupied: false
      });
    }
  }
  
  return {
    classId: cls.id,
    className: cls.name,
    cells
  };
}

function applyBlockedPeriods(
  grid: ClassGrid,
  blocked: BlockedMap,
  breaks: BreakDef[]
): void {
  for (const [day, periods] of Object.entries(blocked)) {
    for (const [periodStr, blockInfo] of Object.entries(periods)) {
      const period = parseInt(periodStr);
      const key = getCellKey(day, period);
      const cell = grid.cells.get(key);
      
      if (cell) {
        const time = calculateTime(period);
        cell.isOccupied = true;
        cell.slot = {
          id: makeId(),
          classId: grid.classId,
          day: day as WeekDay,
          period,
          caption: blockInfo.caption || 'Blocked',
          isCoCurricular: blockInfo.isCoCurricular || false,
          startTime: time.start,
          endTime: time.end
        };
      }
    }
  }
  
  // CRITICAL FIX: DO NOT block period cells for breaks!
  // Breaks are SEPARATE ROWS in the timetable display (inserted between periods)
  // The breaks are handled by the display component, not the generator
  // So we don't mark any cells as occupied for breaks
}

function getAllowedDays(
  subjectId: string,
  teacherId: string,
  constraints: SubjectConfigConstraint[]
): string[] | null {
  const constraint = constraints.find(
    c => c.subjectId === subjectId && c.teacherId === teacherId
  );
  
  if (constraint && constraint.isPartTime) {
    const dayMap: Record<string, string> = {
      'Monday': 'mon',
      'Tuesday': 'tue',
      'Wednesday': 'wed',
      'Thursday': 'thu',
      'Friday': 'fri'
    };
    
    return constraint.allowedDays
      .map(d => dayMap[d])
      .filter(d => d !== undefined);
  }
  
  return null;
}

// NEW: Get priority for a subject
function getPriority(
  subjectId: string,
  teacherId: string,
  constraints: SubjectConfigConstraint[]
): 'high' | 'medium' | 'low' {
  const constraint = constraints.find(
    c => c.subjectId === subjectId && c.teacherId === teacherId
  );
  
  return constraint?.priority || 'medium';
}

// NEW: Allocate a double period (2 consecutive rows in same column)
// priorityLevel: 'high' = periods 1-6 only, 'medium' = periods 1-8, 'low' = any period
function tryAllocateDoublePeriod(
  grid: ClassGrid,
  day: string,
  startPeriod: number,
  teacherId: string,
  subjectId: string,
  priorityLevel: 'high' | 'medium' | 'low' = 'medium'
): boolean {
  const period1 = startPeriod;
  const period2 = startPeriod + 1;
  
  // PRIORITY CHECK: High priority subjects should only use early periods
  if (priorityLevel === 'high' && period1 > 6) return false;
  if (priorityLevel === 'medium' && period1 > 8) return false;
  
  const cellKey1 = getCellKey(day, period1);
  const cellKey2 = getCellKey(day, period2);
  const slotKey1 = getSlotKey(teacherId, day, period1);
  const slotKey2 = getSlotKey(teacherId, day, period2);
  
  const cell1 = grid.cells.get(cellKey1);
  const cell2 = grid.cells.get(cellKey2);
  
  // Both cells must be free in this class AND teacher must not be occupied at both times
  if (!cell1 || !cell2 || cell1.isOccupied || cell2.isOccupied) return false;
  if (occupiedSlots.has(slotKey1) || occupiedSlots.has(slotKey2)) return false;
  
  // Allocate both periods
  const time1 = calculateTime(period1);
  const time2 = calculateTime(period2);
  
  cell1.isOccupied = true;
  cell1.slot = {
    id: makeId(),
    classId: grid.classId,
    subjectId,
    teacherId,
    day: day as WeekDay,
    period: period1,
    startTime: time1.start,
    endTime: time1.end
  };
  
  cell2.isOccupied = true;
  cell2.slot = {
    id: makeId(),
    classId: grid.classId,
    subjectId,
    teacherId,
    day: day as WeekDay,
    period: period2,
    startTime: time2.start,
    endTime: time2.end
  };
  
  occupiedSlots.add(slotKey1);
  occupiedSlots.add(slotKey2);
  
  return true;
}

// NEW: Allocate a single period
// priorityLevel: 'high' = periods 1-6 only, 'medium' = periods 1-8, 'low' = any period
// hasSubjectOnDayFn: callback to check if this subject already has a period on this day
function tryAllocateSinglePeriod(
  grid: ClassGrid,
  day: string,
  period: number,
  teacherId: string,
  subjectId: string,
  priorityLevel: 'high' | 'medium' | 'low' = 'medium',
  hasSubjectOnDayFn?: (classId: string, subjectId: string, day: string) => boolean
): boolean {
  // PRIORITY CHECK: High priority subjects should only use early periods
  if (priorityLevel === 'high' && period > 6) return false;
  if (priorityLevel === 'medium' && period > 8) return false;
  
  // CRITICAL: Check if subject already has a period on this day
  // This ensures 2-3 period subjects are distributed across different days
  if (hasSubjectOnDayFn && hasSubjectOnDayFn(grid.classId, subjectId, day)) {
    return false;
  }
  
  const cellKey = getCellKey(day, period);
  const slotKey = getSlotKey(teacherId, day, period);
  const cell = grid.cells.get(cellKey);
  
  if (!cell || cell.isOccupied) return false;
  if (occupiedSlots.has(slotKey)) return false;
  
  const time = calculateTime(period);
  cell.isOccupied = true;
  cell.slot = {
    id: makeId(),
    classId: grid.classId,
    subjectId,
    teacherId,
    day: day as WeekDay,
    period,
    startTime: time.start,
    endTime: time.end
  };
  
  occupiedSlots.add(slotKey);
  
  return true;
}

function extractSlots(grids: Map<string, ClassGrid>): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  
  for (const grid of grids.values()) {
    for (const cell of grid.cells.values()) {
      if (cell.slot) {
        slots.push(cell.slot);
      }
    }
  }
  
  return slots;
}

export async function generateTimetable(input: GeneratorInput): Promise<GenerationResult> {
  const {
    daysConfig,
    classes,
    teachers,
    subjects,
    breaks = [],
    blocked = {}
  } = input;

  // Clear global tracker
  occupiedSlots.clear();
  
  // NEW: Track which days each subject has been scheduled on in each class
  // This ensures subjects with 2-3 periods don't all fall on the same day
  const subjectDaysUsed = new Map<string, Set<string>>(); // key: "classId|subjectId"
  
  const getSubjectDaysKey = (classId: string, subjectId: string) => `${classId}|${subjectId}`;
  
  const addSubjectDay = (classId: string, subjectId: string, day: string) => {
    const key = getSubjectDaysKey(classId, subjectId);
    if (!subjectDaysUsed.has(key)) {
      subjectDaysUsed.set(key, new Set());
    }
    subjectDaysUsed.get(key)!.add(day);
  };
  
  const hasSubjectOnDay = (classId: string, subjectId: string, day: string): boolean => {
    const key = getSubjectDaysKey(classId, subjectId);
    return subjectDaysUsed.has(key) && subjectDaysUsed.get(key)!.has(day);
  };

  const warnings: string[] = [];
  const conflicts: string[] = [];

  const subjectMap = new Map(subjects.map(s => [s.id, s]));
  const teacherMap = new Map(teachers.map(t => [t.id, t]));

  console.log('');
  console.log('🎓 ═══════════════════════════════════════════════════════════');
  console.log('🎓 COLUMN-TO-ROW GENERATOR WITH DOUBLE PERIOD SUPPORT');
  console.log('🎓 ═══════════════════════════════════════════════════════════');
  console.log(`   Classes: ${classes.length}`);
  console.log(`   Expected: ${classes.length * 50} total periods`);
  console.log('');

  // Fetch pair groups and constraints
  const pairGroups = await fetchSubjectPairGroups();
  const subjectToPairGroup = new Map<string, SubjectPairGroup>();
  pairGroups.forEach(group => {
    group.subject_ids.forEach(subjectId => {
      subjectToPairGroup.set(subjectId, group);
    });
  });

  const subjectConfigConstraints = await fetchSubjectConfigConstraints();

  // Build all grids
  const allGrids = new Map<string, ClassGrid>();
  
  for (const cls of classes) {
    const grid = buildVacancyGrid(cls, daysConfig);
    applyBlockedPeriods(grid, blocked, breaks);
    allGrids.set(cls.id, grid);
  }

  // STEP 1: Schedule paired subjects
  console.log('🔗 STEP 1: Paired subjects');
  console.log('');
  
  for (const cls of classes) {
    const grid = allGrids.get(cls.id)!;
    const processedPairs = new Set<string>();
    
    for (const subj of cls.subjects) {
      const pairGroup = subjectToPairGroup.get(subj.subjectId);
      if (!pairGroup) continue;
      if (processedPairs.has(pairGroup.pair_group_id)) continue;
      
      processedPairs.add(pairGroup.pair_group_id);
      
      const qualifiedTeachers = teachers.filter(t => t.qualifiedSubjects.includes(subj.subjectId));
      if (qualifiedTeachers.length === 0) continue;
      
      const teacher = qualifiedTeachers[0];
      const allowedDays = getAllowedDays(subj.subjectId, teacher.id, subjectConfigConstraints);
      
      if (!allowedDays || allowedDays.length !== 2) continue;
      
      const day1 = allowedDays[0];
      const day2 = allowedDays[1];
      let scheduled = 0;
      
      // Schedule on day1 - scan through periods
      for (let period = 1; period <= 10; period++) {
        const cellKey = getCellKey(day1, period);
        const slotKey = getSlotKey(teacher.id, day1, period);
        const cell = grid.cells.get(cellKey);
        
        if (cell && !cell.isOccupied && !occupiedSlots.has(slotKey)) {
          const time = calculateTime(period);
          cell.isOccupied = true;
          cell.slot = {
            id: makeId(),
            classId: cls.id,
            pairGroupId: pairGroup.pair_group_id,
            teacherId: teacher.id,
            day: day1 as WeekDay,
            period,
            startTime: time.start,
            endTime: time.end
          };
          
          occupiedSlots.add(slotKey);
          scheduled++;
          break;
        }
      }
      
      // Schedule on day2
      for (let period = 1; period <= 10; period++) {
        const cellKey = getCellKey(day2, period);
        const slotKey = getSlotKey(teacher.id, day2, period);
        const cell = grid.cells.get(cellKey);
        
        if (cell && !cell.isOccupied && !occupiedSlots.has(slotKey)) {
          const time = calculateTime(period);
          cell.isOccupied = true;
          cell.slot = {
            id: makeId(),
            classId: cls.id,
            pairGroupId: pairGroup.pair_group_id,
            teacherId: teacher.id,
            day: day2 as WeekDay,
            period,
            startTime: time.start,
            endTime: time.end
          };
          
          occupiedSlots.add(slotKey);
          scheduled++;
          break;
        }
      }
      
      if (scheduled === 2) {
        console.log(`   ✅ ${cls.name}: ${pairGroup.pair_group_name}`);
      } else {
        console.log(`   ❌ ${cls.name}: ${pairGroup.pair_group_name} (${scheduled}/2)`);
        warnings.push(`${pairGroup.pair_group_name} in ${cls.name}: ${scheduled}/2 periods`);
      }
    }
  }
  
  console.log('');

  // STEP 2: Collect all non-paired subject assignments
  const allAssignments: {
    classId: string;
    className: string;
    subjectId: string;
    subjectName: string;
    teacherId: string;
    teacherName: string;
    periodsNeeded: number;
    allowedDays: string[] | null;
    doubleAllowed: boolean;
  }[] = [];

  for (const cls of classes) {
    for (const subj of cls.subjects) {
      const subject = subjectMap.get(subj.subjectId);
      if (!subject) continue;
      
      // Skip if it's a paired subject
      if (subjectToPairGroup.has(subj.subjectId)) continue;
      
      const qualifiedTeachers = teachers.filter(t => t.qualifiedSubjects.includes(subj.subjectId));
      if (qualifiedTeachers.length === 0) {
        warnings.push(`No teacher for ${subject.name} in ${cls.name}`);
        continue;
      }
      
      const teacher = qualifiedTeachers[0];
      const allowedDays = getAllowedDays(subj.subjectId, teacher.id, subjectConfigConstraints);
      
      allAssignments.push({
        classId: cls.id,
        className: cls.name,
        subjectId: subj.subjectId,
        subjectName: subject.name,
        teacherId: teacher.id,
        teacherName: teacher.name,
        periodsNeeded: subj.periods,
        allowedDays,
        doubleAllowed: subject.double_allowed || subject.doubleAllowed || false
      });
    }
  }

  console.log(`📚 STEP 2: Regular subjects (${allAssignments.length} assignments)`);
  console.log('');

  // Group by (subjectId, teacherId) for processing together
  const groupedAssignments = new Map<string, typeof allAssignments>();
  
  for (const assignment of allAssignments) {
    const key = `${assignment.subjectId}|${assignment.teacherId}`;
    if (!groupedAssignments.has(key)) {
      groupedAssignments.set(key, []);
    }
    groupedAssignments.get(key)!.push(assignment);
  }

  // Process each subject-teacher group
  for (const [key, assignments] of groupedAssignments.entries()) {
    const first = assignments[0];
    console.log(`   📖 ${first.subjectName} (${first.teacherName}) - ${assignments.length} classes`);
    
    // ROUND-ROBIN ALLOCATION: Process all classes together, one period at a time
    const teacher = teacherMap.get(first.teacherId)!;
    const daysToScan = first.allowedDays || daysConfig.map(d => d.day);
    
    // Track progress for each class
    const classProgress = new Map<string, {
      assignment: typeof assignments[0];
      scheduled: number;
      doubleAllocated: boolean;
      doubleDay: string;
    }>();
    
    for (const assignment of assignments) {
      classProgress.set(assignment.classId, {
        assignment,
        scheduled: 0,
        doubleAllocated: false,
        doubleDay: ''
      });
    }
    
    // PHASE 1: Allocate double periods first (if allowed)
    if (first.doubleAllowed && first.periodsNeeded >= 2) {
      for (const assignment of assignments) {
        const grid = allGrids.get(assignment.classId)!;
        const progress = classProgress.get(assignment.classId)!;
        
        // Try to allocate 1 double period
        for (const day of daysToScan) {
          if (progress.doubleAllocated) break;
          
          for (let period = 1; period <= 9; period++) {
            if (tryAllocateDoublePeriod(grid, day, period, teacher.id, assignment.subjectId, getPriority(assignment.subjectId, teacher.id, subjectConfigConstraints))) {
              progress.scheduled += 2;
              progress.doubleAllocated = true;
              progress.doubleDay = day;
              addSubjectDay(assignment.classId, assignment.subjectId, day);
              break;
            }
          }
        }
      }
    }
    
    // PHASE 2: Allocate remaining singles in ROUND-ROBIN fashion
    let anyProgress = true;
    let passCount = 0;
    const MAX_PASSES = 20; // Increase to 20 passes for more thorough filling
    
    // Continue looping while we have progress OR we haven't reached pass 11 (where constraint relaxation happens)
    while ((anyProgress || passCount <= 10) && passCount < MAX_PASSES) {
      anyProgress = false;
      passCount++;
      
      // Go through each class and try to allocate 1 single period
      for (const assignment of assignments) {
        const grid = allGrids.get(assignment.classId)!;
        const progress = classProgress.get(assignment.classId)!;
        
        // Check if this class still needs more periods
        if (progress.scheduled >= assignment.periodsNeeded) continue;
        
        let allocated = false;
        
        // Strategy: First 3 passes enforce day-spreading, passes 4-10 relax spreading, passes 11+ ignore priority
        const enforceSpread = passCount <= 3;
        const ignorePriority = passCount > 10; // After 10 passes, ignore priority constraints
        
        // Scan for vacant cells
        for (const day of daysToScan) {
          if (allocated) break;
          
          // Skip the day where we allocated the double (if any)
          if (progress.doubleAllocated && day === progress.doubleDay) continue;
          
          for (let period = 1; period <= 10; period++) {
            const useSpreadingCheck = enforceSpread ? hasSubjectOnDay : undefined;
            const effectivePriority = ignorePriority ? 'low' : getPriority(assignment.subjectId, teacher.id, subjectConfigConstraints);
            
            if (tryAllocateSinglePeriod(grid, day, period, teacher.id, assignment.subjectId, effectivePriority, useSpreadingCheck)) {
              progress.scheduled++;
              allocated = true;
              anyProgress = true;
              addSubjectDay(assignment.classId, assignment.subjectId, day);
              console.log(`      ✓ Pass ${passCount}: Allocated ${assignment.className} P${period} ${day}`);
              break;
            }
          }
        }
        
        // If still not allocated and we're past pass 10, try ANY day regardless of part-time constraints
        if (!allocated && passCount > 10 && progress.scheduled < assignment.periodsNeeded) {
          console.log(`      ⚠️  Pass ${passCount}: Trying ALL days for ${assignment.className} (ignoring constraints)...`);
          const allDays = daysConfig.map(d => d.day);
          
          for (const day of allDays) {
            if (allocated) break;
            if (progress.doubleAllocated && day === progress.doubleDay) continue;
            
            for (let period = 1; period <= 10; period++) {
              if (tryAllocateSinglePeriod(grid, day, period, teacher.id, assignment.subjectId, 'low', undefined)) {
                progress.scheduled++;
                allocated = true;
                anyProgress = true;
                addSubjectDay(assignment.classId, assignment.subjectId, day);
                console.log(`      ✓✓ Pass ${passCount}: Forced allocation ${assignment.className} P${period} ${day}`);
                break;
              }
            }
          }
        }
      }
    }
    
    if (passCount >= MAX_PASSES) {
      console.log(`   ⚠️  Stopped after ${MAX_PASSES} passes`);
    }
    
    // Log results
    for (const assignment of assignments) {
      const progress = classProgress.get(assignment.classId)!;
      
      if (progress.scheduled === assignment.periodsNeeded) {
        console.log(`      ✅ ${assignment.className}: ${progress.scheduled}/${assignment.periodsNeeded}`);
      } else {
        console.log(`      ❌ ${assignment.className}: ${progress.scheduled}/${assignment.periodsNeeded}`);
        warnings.push(`${assignment.subjectName} in ${assignment.className}: ${progress.scheduled}/${assignment.periodsNeeded} periods`);
      }
    }
    
    console.log('');
  }

  // Extract results
  const slots = extractSlots(allGrids);
  
  console.log('');
  console.log('✅ ═══════════════════════════════════════════════════════════');
  console.log('✅ GENERATION COMPLETE');
  console.log('✅ ═══════════════════════════════════════════════════════════');
  console.log(`   Total slots: ${slots.length}`);
  console.log(`   Warnings: ${warnings.length}`);
  console.log('');

  if (warnings.length > 0) {
    console.log('⚠️  WARNINGS:');
    warnings.forEach(w => console.log(`   - ${w}`));
    console.log('');
  }

  return { slots, conflicts, warnings };
}