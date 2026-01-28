-- Create attendance table for tracking student attendance
CREATE TABLE IF NOT EXISTS attendance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  class_id UUID NOT NULL REFERENCES classes(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('present', 'absent', 'late', 'excused')),
  marked_by UUID NOT NULL REFERENCES profiles(id),
  session TEXT NOT NULL,
  term TEXT NOT NULL CHECK (term IN ('First Term', 'Second Term', 'Third Term')),
  week_number INTEGER NOT NULL CHECK (week_number >= 1 AND week_number <= 15),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(student_id, date)
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_attendance_student_id ON attendance(student_id);
CREATE INDEX IF NOT EXISTS idx_attendance_class_id ON attendance(class_id);
CREATE INDEX IF NOT EXISTS idx_attendance_date ON attendance(date);
CREATE INDEX IF NOT EXISTS idx_attendance_session_term ON attendance(session, term);

-- Enable RLS
ALTER TABLE attendance ENABLE ROW LEVEL SECURITY;

-- Policy: Teachers can view attendance for their classes
CREATE POLICY "Teachers can view attendance for their classes" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.class_teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can insert attendance for their classes
CREATE POLICY "Teachers can mark attendance for their classes" ON attendance
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.class_teacher_id = auth.uid()
    )
  );

-- Policy: Teachers can update attendance for their classes
CREATE POLICY "Teachers can update attendance for their classes" ON attendance
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM classes
      WHERE classes.id = attendance.class_id
      AND classes.class_teacher_id = auth.uid()
    )
  );

-- Policy: Students can view their own attendance
CREATE POLICY "Students can view their own attendance" ON attendance
  FOR SELECT
  USING (student_id = auth.uid());

-- Policy: Admins (principal and IT admin) can view all attendance
CREATE POLICY "Admins can view all attendance" ON attendance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role IN ('principal', 'it_admin', 'director')
    )
  );

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_attendance_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER attendance_updated_at
  BEFORE UPDATE ON attendance
  FOR EACH ROW
  EXECUTE FUNCTION update_attendance_updated_at();

COMMENT ON TABLE attendance IS 'Stores daily attendance records for students';
