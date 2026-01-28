// Timetable Automation Types - Enhanced for Nigerian Schools

export type WeekDay = 'mon' | 'tue' | 'wed' | 'thu' | 'fri';
export type Department = 'Science' | 'Arts' | 'Commercial';
export type Level = 'junior' | 'senior';
export type SubjectType = 'general' | 'departmental';
export type TimeSlotPreference = 'morning' | 'afternoon' | 'any';
export type SlotPriority = 'high' | 'medium' | 'low';

export interface DayConfig {
  day: WeekDay;
  openTime: string; // "08:00"
  closeTime: string; // "15:00"
  numPeriods: number;
  periodDuration: number; // minutes
}

export interface BreakDef {
  id: string;
  name: string;
  afterPeriod: number; // appears after this period index (1-based)
  duration: number; // minutes
  appliesTo: WeekDay[];
}

export interface SubjectDef {
  id: string;
  name: string;
  code?: string;
  level: Level;
  type: SubjectType;
  department?: Department;
  
  // Major subject settings
  is_major?: boolean;
  
  // Period constraints
  periods_per_week?: number; // Legacy field
  periodsPerWeek?: number; // Computed field
  min_periods_per_week?: number;
  max_periods_per_week?: number;
  
  // Double period settings
  double_allowed?: boolean;
  doubleAllowed?: boolean; // Legacy
  double_max_per_week?: number;
  doubleMaxPerWeek?: number; // Legacy
  
  // Time preferences
  preferred_time_slots?: TimeSlotPreference;
}

export interface SubjectPair {
  id: string;
  pair_name: string;
  subject_1_id: string;
  subject_2_id: string;
  department: Department;
  level: Level;
  description?: string;
}

export interface DepartmentalRequirement {
  id: string;
  department: Department;
  level: Level;
  subject_id: string;
  is_compulsory: boolean;
  min_periods_per_week: number;
}

export interface Teacher {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  name?: string; // computed full name
  email: string;
  
  // Part-time settings
  isPartTime: boolean;
  is_part_time?: boolean; // Database field
  slot_priority?: SlotPriority;
  
  // Qualifications and preferences
  qualifiedSubjects: string[]; // subject ids
  qualified_subjects?: string[]; // Database field
  preferredClasses?: string[];
  preferred_classes?: string[]; // Database field
  
  // Constraints
  maxPerWeek?: number;
  max_periods_per_week?: number; // Database field
  maxPerDay?: number;
  max_periods_per_day?: number; // Database field
  
  // Availability
  availability?: { [K in WeekDay]?: number[] }; // period indexes available: e.g. { mon: [1,2,4] }
  
  // Conflicts
  cannotTeachSamePeriodAs?: string[]; // teacher ids
  cannot_teach_same_period_as?: string[]; // Database field
}

export interface TeacherAvailabilityPreset {
  id: string;
  name: string;
  description?: string;
  availability: { [K in WeekDay]?: number[] };
}

export interface ClassDef {
  id: string;
  name: string;
  level: Level;
  department?: Department;
  section_name?: string;
  display_name?: string;
  subjects: { subjectId: string; periods: number; isCompulsory?: boolean }[];
}

export interface TimetableSlot {
  id?: string;
  classId: string;
  day: WeekDay;
  period: number; // 1-based
  subjectId?: string;
  teacherId?: string;
  roomId?: string;
  caption?: string; // e.g., "Note Check", "Sports", break name
  isCoCurricular?: boolean;
  reservedForPartTime?: boolean;
  startTime?: string;
  endTime?: string;
  pairGroupId?: string; // For paired subjects like Igbo/Yoruba
}

export interface TimetableSettings {
  id?: string;
  academicYear: string;
  term: string;
  daysConfig: DayConfig[];
  breaks: BreakDef[];
  special: {
    thuAcademic: number;
    thuCocurricular: number;
    friFirstAcademic: number;
    fri5Caption: string;
    fri67Caption: string;
  };
  blocked?: { [day: string]: { [period: number]: { caption?: string; isCoCurricular?: boolean } } };
  allowBackToBackSameTeacher?: boolean;
  doublePeriodOncePerWeek?: boolean;
}

export interface GenerationResult {
  slots: TimetableSlot[];
  conflicts: string[];
  warnings: string[];
}

export interface Room {
  id: string;
  name: string;
  type: 'classroom' | 'lab' | 'hall' | 'gym' | 'art_studio';
  capacity?: number;
}