import { supabase } from './client';

// Helper function to check if tables exist and create demo data
export const setupDemoData = async () => {
  try {
    // Check if we have demo users already
    const { data: existingProfiles, error } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);

    // If we get an error, it might mean the table doesn't exist yet
    if (error) {
      console.log('Profiles table not found or accessible:', error.message);
      return false;
    }

    // If we already have profiles, don't create demo data
    if (existingProfiles && existingProfiles.length > 0) {
      console.log('Demo data already exists');
      return true;
    }

    console.log('Setting up demo data...');
    
    // Create demo profiles for different user types
    const demoProfiles = [
      {
        // Don't set id - it's auto-increment
        email: 'principal@school.edu',
        role: 'principal',
        username: 'principal',
        first_name: 'Dr. Sarah',
        last_name: 'Johnson',
        department_id: 1,
        staff_no: 'PRIN001'
      },
      {
        // Don't set id - it's auto-increment
        email: 'teacher@school.edu',
        role: 'teacher',
        username: 'teacher',
        first_name: 'Mr. Ahmed',
        last_name: 'Hassan',
        department_id: 2,
        staff_no: 'TECH001'
      },
      {
        // Don't set id - it's auto-increment
        email: 'student@school.edu',
        role: 'student',
        username: 'student',
        first_name: 'John',
        last_name: 'Smith',
        department_id: 3,
        staff_no: 'STU001'
      }
    ];

    // Insert demo profiles
    const { error: profileError } = await supabase
      .from('profiles')
      .insert(demoProfiles);

    if (profileError) {
      console.error('Error creating demo profiles:', profileError);
      return false;
    }

    console.log('Demo data created successfully');
    return true;

  } catch (error) {
    console.error('Error setting up demo data:', error);
    return false;
  }
};

// Function to create auth users for demo (this would typically be done through Supabase admin)
export const createDemoAuthUsers = async () => {
  const demoUsers = [
    { email: 'principal@school.edu', password: 'demo123', userData: { first_name: 'Dr. Sarah', last_name: 'Johnson', role: 'principal' } },
    { email: 'teacher@school.edu', password: 'demo123', userData: { first_name: 'Mr. Ahmed', last_name: 'Hassan', role: 'teacher' } },
    { email: 'student@school.edu', password: 'demo123', userData: { first_name: 'John', last_name: 'Smith', role: 'student' } }
  ];

  console.log('Demo auth users need to be created through Supabase admin panel:');
  demoUsers.forEach(user => {
    console.log(`- Email: ${user.email}, Password: ${user.password}, Role: ${user.userData.role}`);
  });
  
  return demoUsers;
};

// Sample SQL schema for reference (to be run in Supabase SQL editor)
export const getSampleSchema = () => {
  return `
-- Create profiles table (matches actual structure)
CREATE TABLE IF NOT EXISTS profiles (
  id SERIAL PRIMARY KEY,
  role TEXT NOT NULL CHECK (role IN ('principal', 'super_admin', 'director', 'secretary', 'transport_manager', 'teacher', 'student', 'parent')),
  username TEXT UNIQUE,
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT,
  dob DATE,
  gender TEXT CHECK (gender IN ('male', 'female')),
  address TEXT,
  class_id BIGINT,
  department_id BIGINT,
  staff_no TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create schools table
CREATE TABLE IF NOT EXISTS schools (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT NOT NULL,
  logo_url TEXT,
  motto TEXT,
  principal_id UUID REFERENCES profiles(id),
  session_start DATE NOT NULL,
  session_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create subjects table
CREATE TABLE IF NOT EXISTS subjects (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  code TEXT NOT NULL,
  description TEXT,
  school_id TEXT NOT NULL REFERENCES schools(id),
  is_core BOOLEAN NOT NULL DEFAULT TRUE,
  credit_hours INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create classes table
CREATE TABLE IF NOT EXISTS classes (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name TEXT NOT NULL,
  level TEXT NOT NULL,
  section TEXT NOT NULL,
  school_id TEXT NOT NULL REFERENCES schools(id),
  class_teacher_id UUID REFERENCES profiles(id),
  capacity INTEGER NOT NULL DEFAULT 40,
  current_strength INTEGER NOT NULL DEFAULT 0,
  academic_year TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create students table
CREATE TABLE IF NOT EXISTS students (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  admission_number TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  date_of_birth DATE NOT NULL,
  gender TEXT NOT NULL CHECK (gender IN ('male', 'female')),
  address TEXT NOT NULL,
  guardian_name TEXT NOT NULL,
  guardian_phone TEXT NOT NULL,
  guardian_email TEXT,
  class_id TEXT NOT NULL REFERENCES classes(id),
  school_id TEXT NOT NULL REFERENCES schools(id),
  photo_url TEXT,
  admission_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create teachers table
CREATE TABLE IF NOT EXISTS teachers (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  employee_id TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  phone TEXT NOT NULL,
  specialization TEXT NOT NULL,
  qualification TEXT NOT NULL,
  experience_years INTEGER NOT NULL DEFAULT 0,
  school_id TEXT NOT NULL REFERENCES schools(id),
  photo_url TEXT,
  hire_date DATE NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create marks table
CREATE TABLE IF NOT EXISTS marks (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  student_id TEXT NOT NULL REFERENCES students(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  class_id TEXT NOT NULL REFERENCES classes(id),
  exam_type TEXT NOT NULL CHECK (exam_type IN ('midterm', 'terminal', 'assignment', 'quiz')),
  marks_obtained DECIMAL(5,2) NOT NULL,
  total_marks DECIMAL(5,2) NOT NULL,
  grade TEXT,
  remarks TEXT,
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  term TEXT NOT NULL,
  session TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'reviewed', 'approved', 'rejected')),
  submitted_at TIMESTAMPTZ,
  reviewed_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(student_id, subject_id, exam_type, term, session)
);

-- Create uploads table
CREATE TABLE IF NOT EXISTS uploads (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  title TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  upload_type TEXT NOT NULL CHECK (upload_type IN ('e-notes', 'exam-questions', 'assignment', 'resource')),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  class_id TEXT REFERENCES classes(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  week INTEGER NOT NULL,
  term TEXT NOT NULL,
  session TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'uploaded', 'approved', 'rejected')),
  deadline TIMESTAMPTZ,
  is_late_submission BOOLEAN NOT NULL DEFAULT FALSE,
  download_count INTEGER NOT NULL DEFAULT 0,
  tags JSONB,
  approved_by UUID REFERENCES profiles(id),
  approved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create timetables table
CREATE TABLE IF NOT EXISTS timetables (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  class_id TEXT NOT NULL REFERENCES classes(id),
  subject_id TEXT NOT NULL REFERENCES subjects(id),
  teacher_id UUID NOT NULL REFERENCES profiles(id),
  day_of_week INTEGER NOT NULL CHECK (day_of_week BETWEEN 1 AND 7),
  start_time TIME NOT NULL,
  end_time TIME NOT NULL,
  room_number TEXT,
  term TEXT NOT NULL,
  session TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(class_id, day_of_week, start_time, term, session)
);

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  action TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id),
  details JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE schools ENABLE ROW LEVEL SECURITY;
ALTER TABLE subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE teachers ENABLE ROW LEVEL SECURITY;
ALTER TABLE marks ENABLE ROW LEVEL SECURITY;
ALTER TABLE uploads ENABLE ROW LEVEL SECURITY;
ALTER TABLE timetables ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view their own profile" ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update their own profile" ON profiles FOR UPDATE USING (auth.uid() = id);

-- Create function to increment download count
CREATE OR REPLACE FUNCTION increment_download_count(upload_id TEXT)
RETURNS void AS $$
BEGIN
  UPDATE uploads SET download_count = download_count + 1 WHERE id = upload_id;
END;
$$ LANGUAGE plpgsql;

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_schools_updated_at BEFORE UPDATE ON schools FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_subjects_updated_at BEFORE UPDATE ON subjects FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_classes_updated_at BEFORE UPDATE ON classes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_students_updated_at BEFORE UPDATE ON students FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_teachers_updated_at BEFORE UPDATE ON teachers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_marks_updated_at BEFORE UPDATE ON marks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_uploads_updated_at BEFORE UPDATE ON uploads FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_timetables_updated_at BEFORE UPDATE ON timetables FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
`;
};

export default {
  setupDemoData,
  createDemoAuthUsers,
  getSampleSchema
};