import { supabase, TABLES, UserRole } from './client';

// Database type definitions for the School Management System
export interface Profile {
  id: string; // UUID from auth.users
  first_name: string;
  middle_name?: string;
  last_name: string;
  role: UserRole;
  email: string;
}

// Utility function to get full name from profile
export const getFullName = (profile: Profile): string => {
  const { first_name, middle_name, last_name } = profile;
  return middle_name 
    ? `${first_name} ${middle_name} ${last_name}`.trim()
    : `${first_name} ${last_name}`.trim();
};

export interface School {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  logo_url?: string;
  motto?: string;
  principal_id?: string;
  session_start: string;
  session_end: string;
  created_at: string;
  updated_at: string;
}

export interface Class {
  id: string;
  name: string;
  level: string;
  section: string;
  school_id: string;
  class_teacher_id?: string;
  capacity: number;
  current_strength: number;
  academic_year: string;
  created_at: string;
  updated_at: string;
}

export interface Subject {
  id: string;
  name: string;
  code: string;
  description?: string;
  school_id: string;
  is_core: boolean;
  credit_hours: number;
  created_at: string;
  updated_at: string;
}

export interface Student {
  id: string;
  admission_number: string;
  full_name: string;
  email?: string;
  phone?: string;
  date_of_birth: string;
  gender: 'male' | 'female';
  address: string;
  guardian_name: string;
  guardian_phone: string;
  guardian_email?: string;
  class_id: string;
  school_id: string;
  photo_url?: string;
  admission_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Teacher {
  id: string;
  employee_id: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  qualification: string;
  experience_years: number;
  school_id: string;
  photo_url?: string;
  hire_date: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Marks {
  id: string;
  student_id: string;
  subject_id: string;
  class_id: string;
  exam_type: 'midterm' | 'terminal' | 'assignment' | 'quiz';
  marks_obtained: number;
  total_marks: number;
  grade?: string;
  remarks?: string;
  teacher_id: string;
  term: string;
  session: string;
  status: 'draft' | 'submitted' | 'reviewed' | 'approved' | 'rejected';
  submitted_at?: string;
  reviewed_at?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Upload {
  id: string;
  title: string;
  description?: string;
  file_name: string;
  file_url: string;
  file_size: number;
  file_type: string;
  upload_type: 'e-notes' | 'exam-questions' | 'assignment' | 'resource';
  subject_id: string;
  class_id?: string;
  teacher_id: string;
  week: number;
  term: string;
  session: string;
  version: number;
  status: 'draft' | 'uploaded' | 'approved' | 'rejected';
  deadline?: string;
  is_late_submission: boolean;
  download_count: number;
  tags?: string[];
  approved_by?: string;
  approved_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Timetable {
  id: string;
  class_id: string;
  subject_id: string;
  teacher_id: string;
  day_of_week: number; // 0-6 (Monday = 1)
  start_time: string;
  end_time: string;
  room_number?: string;
  term: string;
  session: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// Database operations for the School Management System
export const db = {
  // Profile operations
  profiles: {
    get: async (id: string) => {
      // Since id is auto-increment, we should get by email instead
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('email', id) // Treating id parameter as email for compatibility
        .single();
      
      if (error) throw error;
      return data as Profile;
    },

    getByEmail: async (email: string) => {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('email', email)
        .single();
      
      if (error) throw error;
      return data as Profile;
    },

    getByRole: async (role: UserRole) => {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .select('*')
        .eq('role', role);
      
      if (error) throw error;
      return data as Profile[];
    },

    create: async (profile: Omit<Profile, 'id'>) => {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .insert(profile)
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    },

    update: async (email: string, updates: Partial<Profile>) => {
      const { data, error } = await supabase
        .from(TABLES.PROFILES)
        .update(updates)
        .eq('email', email) // Update by email instead of id
        .select()
        .single();
      
      if (error) throw error;
      return data as Profile;
    }
  },

  // Student operations
  students: {
    getByClass: async (classId: string) => {
      const { data, error } = await supabase
        .from(TABLES.STUDENTS)
        .select('*')
        .eq('class_id', classId)
        .eq('is_active', true)
        .order('full_name');
      
      if (error) throw error;
      return data as Student[];
    },

    create: async (student: Omit<Student, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from(TABLES.STUDENTS)
        .insert(student)
        .select()
        .single();
      
      if (error) throw error;
      return data as Student;
    },

    update: async (id: string, updates: Partial<Student>) => {
      const { data, error } = await supabase
        .from(TABLES.STUDENTS)
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', id)
        .select()
        .single();
      
      if (error) throw error;
      return data as Student;
    }
  },

  // Marks operations
  marks: {
    getByClassAndSubject: async (classId: string, subjectId: string, term: string, session: string) => {
      const { data, error } = await supabase
        .from(TABLES.MARKS)
        .select(`
          *,
          students:student_id(full_name, admission_number),
          subjects:subject_id(name, code)
        `)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('term', term)
        .eq('session', session)
        .order('students(full_name)');
      
      if (error) throw error;
      return data;
    },

    bulkUpsert: async (marks: Partial<Marks>[]) => {
      const { data, error } = await supabase
        .from(TABLES.MARKS)
        .upsert(marks, { onConflict: 'student_id,subject_id,exam_type,term,session' })
        .select();
      
      if (error) throw error;
      return data as Marks[];
    },

    updateStatus: async (ids: string[], status: Marks['status'], reviewerId?: string) => {
      const updates: Partial<Marks> = {
        status,
        updated_at: new Date().toISOString()
      };

      if (status === 'reviewed') {
        updates.reviewed_at = new Date().toISOString();
      } else if (status === 'approved') {
        updates.approved_at = new Date().toISOString();
        updates.approved_by = reviewerId;
      }

      const { data, error } = await supabase
        .from(TABLES.MARKS)
        .update(updates)
        .in('id', ids)
        .select();
      
      if (error) throw error;
      return data as Marks[];
    }
  },

  // Upload operations
  uploads: {
    getByClassAndSubject: async (classId: string, subjectId: string, term: string, session: string) => {
      const { data, error } = await supabase
        .from(TABLES.UPLOADS)
        .select(`
          *,
          subjects:subject_id(name, code),
          teachers:teacher_id(full_name)
        `)
        .eq('class_id', classId)
        .eq('subject_id', subjectId)
        .eq('term', term)
        .eq('session', session)
        .order('week', { ascending: true });
      
      if (error) throw error;
      return data;
    },

    create: async (upload: Omit<Upload, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from(TABLES.UPLOADS)
        .insert(upload)
        .select()
        .single();
      
      if (error) throw error;
      return data as Upload;
    },

    updateDownloadCount: async (id: string) => {
      const { data, error } = await supabase
        .rpc('increment_download_count', { upload_id: id });
      
      if (error) throw error;
      return data;
    }
  },

  // Timetable operations
  timetable: {
    getByClass: async (classId: string, term: string, session: string) => {
      const { data, error } = await supabase
        .from(TABLES.TIMETABLES)
        .select(`
          *,
          subjects:subject_id(name, code),
          teachers:teacher_id(full_name)
        `)
        .eq('class_id', classId)
        .eq('term', term)
        .eq('session', session)
        .eq('is_active', true)
        .order('day_of_week')
        .order('start_time');
      
      if (error) throw error;
      return data;
    },

    bulkUpsert: async (entries: Partial<Timetable>[]) => {
      const { data, error } = await supabase
        .from(TABLES.TIMETABLES)
        .upsert(entries, { onConflict: 'class_id,day_of_week,start_time,term,session' })
        .select();
      
      if (error) throw error;
      return data as Timetable[];
    }
  },

  // Audit logging
  auditLog: {
    create: async (action: string, entityType: string, entityId: string, userId: string, details?: any) => {
      const { data, error } = await supabase
        .from(TABLES.AUDIT_LOGS)
        .insert({
          action,
          entity_type: entityType,
          entity_id: entityId,
          user_id: userId,
          details,
          created_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    }
  }
};

export default db;