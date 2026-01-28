-- ================================================
-- INSTANT FIX: Create Timetable Tables Now
-- ================================================
-- Run this in Supabase SQL Editor to fix the schema cache error

-- Step 1: Create timetable_settings table
CREATE TABLE IF NOT EXISTS timetable_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config JSONB NOT NULL,
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Enable RLS
ALTER TABLE timetable_settings ENABLE ROW LEVEL SECURITY;

-- Step 3: Create policies (Admin only)
CREATE POLICY "Admin can view timetable settings" 
  ON timetable_settings FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can insert timetable settings" 
  ON timetable_settings FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

CREATE POLICY "Admin can update timetable settings" 
  ON timetable_settings FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- Step 4: Create class_subject_assignments table (if doesn't exist)
CREATE TABLE IF NOT EXISTS class_subject_assignments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  subject_id UUID REFERENCES subjects(id) ON DELETE CASCADE,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  periods_per_week INTEGER DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, subject_id)
);

-- Enable RLS
ALTER TABLE class_subject_assignments ENABLE ROW LEVEL SECURITY;

-- Policies for class_subject_assignments
CREATE POLICY "Everyone can view class subject assignments" 
  ON class_subject_assignments FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage class subject assignments" 
  ON class_subject_assignments FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- Step 5: Create timetable table (if doesn't exist)
CREATE TABLE IF NOT EXISTS timetable (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  class_id UUID REFERENCES classes(id) ON DELETE CASCADE,
  day TEXT NOT NULL,
  period INTEGER NOT NULL,
  subject_id UUID REFERENCES subjects(id) ON DELETE SET NULL,
  teacher_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  room TEXT,
  start_time TIME,
  end_time TIME,
  is_break BOOLEAN DEFAULT FALSE,
  break_type TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(class_id, day, period)
);

-- Enable RLS
ALTER TABLE timetable ENABLE ROW LEVEL SECURITY;

-- Policies for timetable
CREATE POLICY "Everyone can view timetables" 
  ON timetable FOR SELECT
  USING (true);

CREATE POLICY "Admin can manage timetables" 
  ON timetable FOR ALL
  USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('admin', 'principal', 'IT_admin')
  ));

-- Step 6: Force schema reload
NOTIFY pgrst, 'reload schema';

-- Verification
DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '✅ Timetable tables created successfully!';
  RAISE NOTICE '';
  RAISE NOTICE '📋 Tables created:';
  RAISE NOTICE '  • timetable_settings (with config JSONB column)';
  RAISE NOTICE '  • class_subject_assignments';
  RAISE NOTICE '  • timetable';
  RAISE NOTICE '';
  RAISE NOTICE '🔄 Schema cache refreshed!';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next step: Refresh your browser and try Settings again';
  RAISE NOTICE '';
END $$;
