import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { projectId, publicAnonKey } from './info';

// Create a single supabase client for interacting with your database (singleton)
export const supabase = createSupabaseClient(
  `https://${projectId}.supabase.co`,
  publicAnonKey
);

// Export the singleton for backwards compatibility
export const createClient = () => supabase;

// Database table names for the School Management System
export const TABLES = {
  PROFILES: 'profiles',
  SCHOOLS: 'schools',
  CLASSES: 'classes',
  SUBJECTS: 'subjects',
  STUDENTS: 'students',
  TEACHERS: 'teachers',
  ADMINS: 'admins',
  ENROLLMENTS: 'enrollments',
  TIMETABLES: 'timetables',
  EXAMS: 'exams',
  MARKS: 'marks',
  UPLOADS: 'uploads',
  ATTENDANCE: 'attendance',
  FINANCES: 'finances',
  ANNOUNCEMENTS: 'announcements',
  RESULT_PINS: 'result_pins',
  AUDIT_LOGS: 'audit_logs'
} as const;

// User roles for the School Management System
export type UserRole = 
  | 'principal'
  | 'super_admin'
  | 'director'
  | 'secretary'
  | 'transport_manager'
  | 'teacher'
  | 'student'
  | 'parent';

// Auth helper functions
export const authHelpers = {
  // Get current user
  getCurrentUser: async () => {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error) throw error;
    return user;
  },

  // Get user profile with role
  getUserProfile: async (userId: string) => {
    const { data, error } = await supabase
      .from(TABLES.PROFILES)
      .select('*')
      .eq('id', userId)
      .single();
    
    if (error) throw error;
    return data;
  },

  // Sign in with email and password
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    });
    
    if (error) throw error;
    return data;
  },

  // Sign out
  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    // Ignore "Auth session missing" errors - user wants to logout anyway
    if (error && error.message !== 'Auth session missing!') {
      throw error;
    }
  },

  // Check if user has required role
  hasRole: (userRole: UserRole, requiredRoles: UserRole[]) => {
    return requiredRoles.includes(userRole);
  },

  // Check if user can access admin features
  isAdmin: (role: UserRole) => {
    return ['principal', 'super_admin', 'director', 'secretary'].includes(role);
  },

  // Check if user can manage marks
  canManageMarks: (role: UserRole) => {
    return ['principal', 'super_admin', 'director', 'teacher'].includes(role);
  },

  // Check if user can upload materials
  canUploadMaterials: (role: UserRole) => {
    return ['principal', 'super_admin', 'director', 'teacher'].includes(role);
  }
};

// Real-time subscriptions
export const subscriptions = {
  // Subscribe to marks updates
  subscribeToMarks: (classId: string, callback: (data: any) => void) => {
    return supabase
      .channel('marks_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.MARKS,
        filter: `class_id=eq.${classId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to timetable updates
  subscribeToTimetable: (classId: string, callback: (data: any) => void) => {
    return supabase
      .channel('timetable_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.TIMETABLES,
        filter: `class_id=eq.${classId}`
      }, callback)
      .subscribe();
  },

  // Subscribe to announcements
  subscribeToAnnouncements: (callback: (data: any) => void) => {
    return supabase
      .channel('announcements_changes')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: TABLES.ANNOUNCEMENTS
      }, callback)
      .subscribe();
  }
};

export default supabase;