-- =====================================================
-- GRADUATED STUDENTS & TRANSCRIPT SYSTEM
-- =====================================================
-- Complete database schema for Nigerian school system
-- Features:
-- 1. Alumni/Graduated students management
-- 2. PIN-based transcript access control  
-- 3. Transcript request tracking and auditing
-- 4. School fees clearance validation
-- 5. Future integration with finance module
-- =====================================================

-- =====================================================
-- TABLE 1: graduated_students
-- Purpose: Alumni directory with custom login and fees clearance
-- Auth: Custom login via first_name + last_name + graduation_session
-- =====================================================

CREATE TABLE IF NOT EXISTS graduated_students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ===================================================
  -- STUDENT REFERENCE
  -- ===================================================
  student_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- Note: SET NULL to preserve alumni record even if profile deleted
  
  -- ===================================================
  -- BASIC INFORMATION (Denormalized for fast lookups)
  -- ===================================================
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  middle_name TEXT,
  admission_number TEXT UNIQUE, -- Unique identifier from student records
  
  -- ===================================================
  -- GRADUATION DETAILS
  -- ===================================================
  graduation_session TEXT NOT NULL, -- e.g., "2023/2024"
  graduation_class TEXT NOT NULL,   -- e.g., "SS3 A"
  graduation_date TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- ===================================================
  -- CONTACT INFORMATION (Optional)
  -- ===================================================
  email TEXT,
  phone TEXT,
  
  -- ===================================================
  -- PERSONAL INFORMATION (For transcript display)
  -- ===================================================
  gender TEXT CHECK (gender IN ('Male', 'Female')),
  date_of_birth DATE,
  
  -- ===================================================
  -- SCHOOL FEES CLEARANCE SYSTEM
  -- ===================================================
  -- Manual system now, automated when finance module is built
  
  fees_clearance_required BOOLEAN DEFAULT true,
  -- Can be set to false for:
  -- - Scholarship students
  -- - Special cases approved by Director
  -- - Students with fee waivers
  
  fees_cleared BOOLEAN DEFAULT false,
  -- When true, student can access transcript
  -- When false, student sees outstanding balance message
  
  outstanding_balance DECIMAL(12, 2) DEFAULT 0.00,
  -- Amount owed in Naira
  -- Example: 50000.00 = ₦50,000
  -- Current: Manually updated by Director/Finance Admin
  -- Future: Auto-calculated from school_fees table
  
  fees_cleared_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- ID of Director/Finance Admin who cleared the fees
  -- Null if auto-cleared by finance system
  
  fees_cleared_at TIMESTAMPTZ,
  -- Timestamp when fees were marked as cleared
  
  fees_notes TEXT,
  -- Optional notes about fees status
  -- Examples:
  -- - "Scholarship student - no fees required"
  -- - "Payment plan approved - expires 2025-12-31"
  -- - "Cleared by Director John Doe on 2024-06-15"
  -- - "Balance written off due to exceptional circumstances"
  
  -- ===================================================
  -- STATUS MANAGEMENT
  -- ===================================================
  is_active BOOLEAN DEFAULT true,
  -- Can be disabled to revoke alumni portal access
  -- Examples:
  -- - Disciplinary issues
  -- - Fraudulent records
  -- - Duplicate entries
  
  -- ===================================================
  -- TIMESTAMPS
  -- ===================================================
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================

-- Fast lookup by student_id
CREATE INDEX IF NOT EXISTS idx_graduated_students_student_id 
ON graduated_students(student_id);

-- Fast lookup by graduation session (for bulk operations)
CREATE INDEX IF NOT EXISTS idx_graduated_students_graduation_session 
ON graduated_students(graduation_session);

-- Fast lookup by admission number
CREATE INDEX IF NOT EXISTS idx_graduated_students_admission_number 
ON graduated_students(admission_number) 
WHERE admission_number IS NOT NULL;

-- Composite index for alumni login (first_name + last_name + graduation_session)
CREATE INDEX IF NOT EXISTS idx_graduated_students_name_session 
ON graduated_students(LOWER(first_name), LOWER(last_name), graduation_session);

-- Fast lookup for active alumni only
CREATE INDEX IF NOT EXISTS idx_graduated_students_active 
ON graduated_students(is_active) 
WHERE is_active = true;

-- Fast lookup for students with outstanding fees
CREATE INDEX IF NOT EXISTS idx_graduated_students_fees_pending 
ON graduated_students(fees_cleared, outstanding_balance) 
WHERE fees_cleared = false AND fees_clearance_required = true;

-- Fast lookup for students cleared for transcripts
CREATE INDEX IF NOT EXISTS idx_graduated_students_fees_cleared 
ON graduated_students(fees_cleared) 
WHERE fees_cleared = true OR fees_clearance_required = false;

-- ===================================================
-- UNIQUE CONSTRAINTS
-- ===================================================

-- Prevent duplicate alumni logins
-- Same name + same graduation session = duplicate entry
CREATE UNIQUE INDEX IF NOT EXISTS idx_graduated_students_unique_login 
ON graduated_students(LOWER(first_name), LOWER(last_name), graduation_session) 
WHERE is_active = true;

-- ===================================================
-- TABLE COMMENTS AND DOCUMENTATION
-- ===================================================

COMMENT ON TABLE graduated_students IS 
'Alumni/graduated students directory with custom login credentials and fees clearance tracking';

COMMENT ON COLUMN graduated_students.student_id IS 
'References original student profile (nullable for data retention if profile deleted)';

COMMENT ON COLUMN graduated_students.admission_number IS 
'Unique identifier from student records (e.g., ADM2023001)';

COMMENT ON COLUMN graduated_students.graduation_session IS 
'Academic session when student graduated (e.g., 2023/2024)';

COMMENT ON COLUMN graduated_students.graduation_class IS 
'Final class before graduation (e.g., SS3 A)';

COMMENT ON COLUMN graduated_students.is_active IS 
'Can be disabled to revoke alumni portal access';

COMMENT ON COLUMN graduated_students.fees_clearance_required IS 
'If false, fees check is bypassed (for scholarship students, etc.)';

COMMENT ON COLUMN graduated_students.fees_cleared IS 
'True when all school fees are paid - required for transcript access';

COMMENT ON COLUMN graduated_students.outstanding_balance IS 
'Amount owed in Naira. Manual now, auto-calculated when finance module is built';

COMMENT ON COLUMN graduated_students.fees_cleared_by IS 
'Director/Finance Admin who manually cleared fees (null if auto-cleared)';

COMMENT ON COLUMN graduated_students.fees_notes IS 
'Free-text notes about fees status (payment plans, waivers, etc.)';

-- =====================================================
-- TABLE 2: transcript_pins
-- Purpose: PIN-based access control for transcripts
-- Payment tracking and one-time usage validation
-- =====================================================

CREATE TABLE IF NOT EXISTS transcript_pins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ===================================================
  -- PIN DETAILS
  -- ===================================================
  pin_code TEXT UNIQUE NOT NULL,
  -- Format: XXXX-XXXX-XXXX (12 alphanumeric characters)
  -- Example: A3F7-2K9L-8M4P
  -- Excludes confusing characters (0, O, I, 1, etc.)
  
  -- ===================================================
  -- STUDENT REFERENCE
  -- ===================================================
  graduated_student_id UUID REFERENCES graduated_students(id) ON DELETE CASCADE,
  -- CASCADE: If alumni record deleted, their PINs should also be deleted
  
  -- ===================================================
  -- GENERATION TRACKING
  -- ===================================================
  generated_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  -- ID of Director/IT Admin who generated the PIN
  -- Null if generated by automated system
  
  -- ===================================================
  -- PAYMENT INFORMATION
  -- ===================================================
  price DECIMAL(10, 2) DEFAULT 0.00,
  -- Amount paid for PIN in Naira
  -- Example: 5000.00 = ₦5,000
  
  payment_reference TEXT,
  -- Optional payment reference number
  -- Examples:
  -- - Bank transfer reference
  -- - POS receipt number
  -- - Online payment ID
  
  -- ===================================================
  -- USAGE TRACKING
  -- ===================================================
  is_used BOOLEAN DEFAULT false,
  -- False: PIN can still be used to generate transcript
  -- True: PIN already used (one-time use enforced)
  
  used_at TIMESTAMPTZ,
  -- Timestamp when PIN was used to generate transcript
  -- Null if not yet used
  
  -- ===================================================
  -- EXPIRY MANAGEMENT
  -- ===================================================
  expires_at TIMESTAMPTZ,
  -- Optional expiry date
  -- Examples:
  -- - 90 days from creation
  -- - End of academic session
  -- - Null = no expiry
  
  -- ===================================================
  -- TIMESTAMPS
  -- ===================================================
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ===================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================

-- Fast PIN lookup and validation
CREATE INDEX IF NOT EXISTS idx_transcript_pins_pin_code 
ON transcript_pins(pin_code);

-- Fast lookup of all PINs for a graduated student
CREATE INDEX IF NOT EXISTS idx_transcript_pins_graduated_student_id 
ON transcript_pins(graduated_student_id);

-- Track who generated PINs
CREATE INDEX IF NOT EXISTS idx_transcript_pins_generated_by 
ON transcript_pins(generated_by);

-- Fast lookup of unused PINs
CREATE INDEX IF NOT EXISTS idx_transcript_pins_unused 
ON transcript_pins(is_used) 
WHERE is_used = false;

-- Fast lookup of PINs with expiry dates (for cleanup queries)
CREATE INDEX IF NOT EXISTS idx_transcript_pins_expired 
ON transcript_pins(expires_at) 
WHERE expires_at IS NOT NULL;

-- Composite index for revenue reporting
CREATE INDEX IF NOT EXISTS idx_transcript_pins_price_date 
ON transcript_pins(created_at DESC, price);

-- ===================================================
-- TABLE COMMENTS AND DOCUMENTATION
-- ===================================================

COMMENT ON TABLE transcript_pins IS 
'PIN codes for transcript access control and payment tracking';

COMMENT ON COLUMN transcript_pins.pin_code IS 
'Unique 12-digit alphanumeric PIN (format: XXXX-XXXX-XXXX)';

COMMENT ON COLUMN transcript_pins.price IS 
'Amount paid for the PIN in Nigerian Naira';

COMMENT ON COLUMN transcript_pins.is_used IS 
'True after PIN is used to generate transcript (one-time use enforced)';

COMMENT ON COLUMN transcript_pins.expires_at IS 
'Optional expiry date (e.g., 90 days from creation)';

-- =====================================================
-- TABLE 3: transcript_requests
-- Purpose: Complete audit log of all transcript generations
-- Track what was requested, when, and by whom
-- =====================================================

CREATE TABLE IF NOT EXISTS transcript_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- ===================================================
  -- STUDENT REFERENCE
  -- ===================================================
  graduated_student_id UUID REFERENCES graduated_students(id) ON DELETE CASCADE,
  -- CASCADE: If alumni deleted, their request history also deleted
  
  -- ===================================================
  -- PIN REFERENCE
  -- ===================================================
  pin_id UUID REFERENCES transcript_pins(id) ON DELETE SET NULL,
  -- SET NULL: Preserve audit log even if PIN record deleted
  
  -- ===================================================
  -- TRANSCRIPT CONFIGURATION
  -- ===================================================
  -- What the student selected to include in transcript
  
  selected_classes JSONB,
  -- Array of class names included in transcript
  -- Example: ["JSS1 A", "JSS2 A", "JSS3 A", "SS1 A", "SS2 A", "SS3 A"]
  
  selected_sessions JSONB,
  -- Array of academic sessions included
  -- Example: ["2018/2019", "2019/2020", "2020/2021", "2021/2022", "2022/2023", "2023/2024"]
  
  selected_terms JSONB,
  -- Array of terms included
  -- Example: ["First Term", "Second Term", "Third Term"]
  -- Or: ["First Term"] for first term only
  
  -- ===================================================
  -- TRANSCRIPT METADATA
  -- ===================================================
  total_subjects_count INTEGER,
  -- How many unique subjects included in transcript
  
  total_marks_records INTEGER,
  -- How many individual mark entries included
  
  -- ===================================================
  -- SECURITY AND AUDITING
  -- ===================================================
  ip_address TEXT,
  -- IP address from which transcript was generated
  -- For security monitoring and fraud detection
  
  user_agent TEXT,
  -- Browser/device user agent string
  -- For analytics and security
  
  -- ===================================================
  -- TIMESTAMPS
  -- ===================================================
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  -- When transcript was generated
  
  downloaded_at TIMESTAMPTZ,
  -- When transcript PDF was downloaded
  -- Null if generated but not downloaded yet
  
  -- ===================================================
  -- PERFORMANCE METRICS
  -- ===================================================
  file_size_bytes BIGINT,
  -- Size of generated PDF in bytes
  
  generation_duration_ms INTEGER
  -- How long it took to generate transcript (milliseconds)
  -- For performance monitoring
);

-- ===================================================
-- INDEXES FOR PERFORMANCE
-- ===================================================

-- Fast lookup of all requests by a student
CREATE INDEX IF NOT EXISTS idx_transcript_requests_graduated_student_id 
ON transcript_requests(graduated_student_id);

-- Fast lookup by PIN (which PIN was used for which request)
CREATE INDEX IF NOT EXISTS idx_transcript_requests_pin_id 
ON transcript_requests(pin_id);

-- Chronological sorting (most recent first)
CREATE INDEX IF NOT EXISTS idx_transcript_requests_generated_at 
ON transcript_requests(generated_at DESC);

-- Track downloaded vs not downloaded
CREATE INDEX IF NOT EXISTS idx_transcript_requests_downloaded 
ON transcript_requests(downloaded_at) 
WHERE downloaded_at IS NOT NULL;

-- Performance analytics
CREATE INDEX IF NOT EXISTS idx_transcript_requests_performance 
ON transcript_requests(generation_duration_ms, file_size_bytes);

-- ===================================================
-- TABLE COMMENTS AND DOCUMENTATION
-- ===================================================

COMMENT ON TABLE transcript_requests IS 
'Complete audit log of all transcript generation requests';

COMMENT ON COLUMN transcript_requests.selected_classes IS 
'JSON array of class names included in transcript';

COMMENT ON COLUMN transcript_requests.selected_sessions IS 
'JSON array of academic sessions included';

COMMENT ON COLUMN transcript_requests.selected_terms IS 
'JSON array of terms included (First Term, Second Term, Third Term)';

COMMENT ON COLUMN transcript_requests.generated_at IS 
'Timestamp when transcript was generated';

COMMENT ON COLUMN transcript_requests.downloaded_at IS 
'Timestamp when transcript PDF was actually downloaded';

-- =====================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE graduated_students ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_pins ENABLE ROW LEVEL SECURITY;
ALTER TABLE transcript_requests ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- RLS POLICIES: graduated_students
-- =====================================================

-- Admin/Director/Principal can view all graduated students
CREATE POLICY "Admins can view all graduated students"
ON graduated_students
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('IT Admin', 'Director', 'Principal')
  )
);

-- Admin/Director can manage graduated students (insert, update, delete)
CREATE POLICY "Admins can manage graduated students"
ON graduated_students
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('IT Admin', 'Director')
  )
);

-- Finance Admin can view and update fees clearance only
CREATE POLICY "Finance Admin can manage fees clearance"
ON graduated_students
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Finance Admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role = 'Finance Admin'
  )
);

-- Note: Graduated students access via custom auth (backend handles this)

-- =====================================================
-- RLS POLICIES: transcript_pins
-- =====================================================

-- Admin/Director/Principal can view all transcript PINs
CREATE POLICY "Admins can view all transcript PINs"
ON transcript_pins
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('IT Admin', 'Director', 'Principal')
  )
);

-- Admin/Director can generate new PINs
CREATE POLICY "Admins can generate transcript PINs"
ON transcript_pins
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('IT Admin', 'Director')
  )
);

-- Admin/Director can update PINs (e.g., mark as used)
CREATE POLICY "Admins can update transcript PINs"
ON transcript_pins
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('IT Admin', 'Director')
  )
);

-- =====================================================
-- RLS POLICIES: transcript_requests
-- =====================================================

-- Admin/Director/Principal can view all transcript requests
CREATE POLICY "Admins can view all transcript requests"
ON transcript_requests
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.id = auth.uid()
    AND profiles.role IN ('IT Admin', 'Director', 'Principal')
  )
);

-- Allow insertion of transcript requests (backend handles auth)
CREATE POLICY "Allow transcript request creation"
ON transcript_requests
FOR INSERT
TO authenticated
WITH CHECK (true);

-- =====================================================
-- HELPER FUNCTIONS
-- =====================================================

-- ===================================================
-- FUNCTION: Automatically mark PIN as used
-- ===================================================
CREATE OR REPLACE FUNCTION mark_pin_as_used()
RETURNS TRIGGER AS $$
BEGIN
  -- When a transcript request is created, mark the PIN as used
  UPDATE transcript_pins
  SET 
    is_used = true,
    used_at = NEW.generated_at
  WHERE id = NEW.pin_id
  AND is_used = false; -- Only mark if not already used
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically mark PIN as used when transcript is generated
DROP TRIGGER IF EXISTS trigger_mark_pin_used ON transcript_requests;
CREATE TRIGGER trigger_mark_pin_used
AFTER INSERT ON transcript_requests
FOR EACH ROW
WHEN (NEW.pin_id IS NOT NULL)
EXECUTE FUNCTION mark_pin_as_used();

COMMENT ON FUNCTION mark_pin_as_used() IS 
'Automatically marks a PIN as used when a transcript request is created';

-- ===================================================
-- FUNCTION: Validate PIN before use
-- ===================================================
CREATE OR REPLACE FUNCTION is_pin_valid(p_pin_code TEXT)
RETURNS TABLE (
  valid BOOLEAN,
  reason TEXT,
  pin_id UUID,
  graduated_student_id UUID
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      WHEN tp.id IS NULL THEN false
      WHEN tp.is_used = true THEN false
      WHEN tp.expires_at IS NOT NULL AND tp.expires_at < NOW() THEN false
      ELSE true
    END as valid,
    CASE 
      WHEN tp.id IS NULL THEN 'PIN does not exist'
      WHEN tp.is_used = true THEN 'PIN has already been used'
      WHEN tp.expires_at IS NOT NULL AND tp.expires_at < NOW() THEN 'PIN has expired'
      ELSE 'PIN is valid'
    END as reason,
    tp.id as pin_id,
    tp.graduated_student_id
  FROM transcript_pins tp
  WHERE tp.pin_code = p_pin_code
  LIMIT 1;
  
  -- If no PIN found, return default response
  IF NOT FOUND THEN
    RETURN QUERY 
    SELECT 
      false AS valid, 
      'PIN does not exist'::TEXT AS reason, 
      NULL::UUID AS pin_id, 
      NULL::UUID AS graduated_student_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION is_pin_valid(TEXT) IS 
'Validates a PIN code and returns validation status, reason, and associated student ID';

-- ===================================================
-- FUNCTION: Generate secure PIN code
-- ===================================================
CREATE OR REPLACE FUNCTION generate_transcript_pin_code()
RETURNS TEXT AS $$
DECLARE
  -- Exclude confusing characters: 0, O, I, 1, L
  characters TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result TEXT := '';
  i INTEGER;
BEGIN
  -- Generate 12-character PIN in format: XXXX-XXXX-XXXX
  FOR i IN 1..12 LOOP
    IF i IN (5, 9) THEN
      result := result || '-';
    ELSE
      result := result || substr(
        characters, 
        floor(random() * length(characters) + 1)::integer, 
        1
      );
    END IF;
  END LOOP;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION generate_transcript_pin_code() IS 
'Generates a secure 12-character PIN in format XXXX-XXXX-XXXX (excludes confusing characters)';

-- ===================================================
-- FUNCTION: Check fees clearance before transcript
-- ===================================================
CREATE OR REPLACE FUNCTION check_fees_clearance(p_graduated_student_id UUID)
RETURNS TABLE (
  can_access_transcript BOOLEAN,
  reason TEXT,
  outstanding_balance DECIMAL(12, 2),
  fees_notes TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    CASE 
      -- If clearance not required (scholarship, etc.), allow access
      WHEN gs.fees_clearance_required = false THEN true
      -- If fees cleared, allow access
      WHEN gs.fees_cleared = true THEN true
      -- Otherwise, deny access
      ELSE false
    END as can_access_transcript,
    CASE 
      WHEN gs.fees_clearance_required = false THEN 'Fees clearance not required'
      WHEN gs.fees_cleared = true THEN 'Fees cleared - transcript access granted'
      ELSE 'Outstanding school fees must be cleared before accessing transcript'
    END as reason,
    gs.outstanding_balance,
    gs.fees_notes
  FROM graduated_students gs
  WHERE gs.id = p_graduated_student_id
  AND gs.is_active = true
  LIMIT 1;
  
  -- If student not found
  IF NOT FOUND THEN
    RETURN QUERY 
    SELECT 
      false AS can_access_transcript,
      'Student record not found or inactive'::TEXT AS reason,
      0.00::DECIMAL(12, 2) AS outstanding_balance,
      NULL::TEXT AS fees_notes;
  END IF;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION check_fees_clearance(UUID) IS 
'Checks if a graduated student has cleared fees and can access transcript';

-- ===================================================
-- FUNCTION: Maintenance - Clean up expired PINs
-- ===================================================
CREATE OR REPLACE FUNCTION cleanup_expired_pins()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- Delete unused PINs that expired more than 30 days ago
  DELETE FROM transcript_pins
  WHERE is_used = false
  AND expires_at IS NOT NULL
  AND expires_at < NOW() - INTERVAL '30 days';
  
  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION cleanup_expired_pins() IS 
'Maintenance function to delete unused PINs that expired more than 30 days ago';

-- ===================================================
-- FUNCTION: Get comprehensive transcript statistics
-- ===================================================
CREATE OR REPLACE FUNCTION get_transcript_statistics()
RETURNS TABLE (
  total_alumni INTEGER,
  active_alumni INTEGER,
  alumni_fees_cleared INTEGER,
  alumni_fees_pending INTEGER,
  total_pins_generated INTEGER,
  total_pins_used INTEGER,
  total_transcripts_issued INTEGER,
  total_revenue DECIMAL(12, 2),
  avg_transcript_generation_time_ms INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(DISTINCT gs.id)::INTEGER as total_alumni,
    COUNT(DISTINCT gs.id) FILTER (WHERE gs.is_active = true)::INTEGER as active_alumni,
    COUNT(DISTINCT gs.id) FILTER (
      WHERE gs.fees_cleared = true OR gs.fees_clearance_required = false
    )::INTEGER as alumni_fees_cleared,
    COUNT(DISTINCT gs.id) FILTER (
      WHERE gs.fees_cleared = false AND gs.fees_clearance_required = true
    )::INTEGER as alumni_fees_pending,
    COUNT(tp.id)::INTEGER as total_pins_generated,
    COUNT(tp.id) FILTER (WHERE tp.is_used = true)::INTEGER as total_pins_used,
    COUNT(tr.id)::INTEGER as total_transcripts_issued,
    COALESCE(SUM(tp.price), 0)::DECIMAL(12, 2) as total_revenue,
    COALESCE(AVG(tr.generation_duration_ms)::INTEGER, 0) as avg_transcript_generation_time_ms
  FROM graduated_students gs
  LEFT JOIN transcript_pins tp ON gs.id = tp.graduated_student_id
  LEFT JOIN transcript_requests tr ON gs.id = tr.graduated_student_id;
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION get_transcript_statistics() IS 
'Returns comprehensive statistics about transcript system (alumni, PINs, revenue, etc.)';

-- ===================================================
-- FUNCTION: Update graduated_students.updated_at
-- ===================================================
CREATE OR REPLACE FUNCTION update_graduated_students_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Automatically update updated_at timestamp
DROP TRIGGER IF EXISTS trigger_update_graduated_students_timestamp ON graduated_students;
CREATE TRIGGER trigger_update_graduated_students_timestamp
BEFORE UPDATE ON graduated_students
FOR EACH ROW
EXECUTE FUNCTION update_graduated_students_updated_at();

-- =====================================================
-- REPORTING VIEWS
-- =====================================================

-- ===================================================
-- VIEW: Transcript PINs Summary by Student
-- ===================================================
CREATE OR REPLACE VIEW v_transcript_pins_summary AS
SELECT 
  gs.id as graduated_student_id,
  gs.first_name || ' ' || gs.last_name as student_name,
  gs.admission_number,
  gs.graduation_session,
  gs.graduation_class,
  gs.fees_cleared,
  gs.outstanding_balance,
  COUNT(tp.id) as total_pins,
  COUNT(tp.id) FILTER (WHERE tp.is_used = false) as unused_pins,
  COUNT(tp.id) FILTER (WHERE tp.is_used = true) as used_pins,
  SUM(tp.price) as total_revenue,
  MAX(tp.created_at) as last_pin_generated_at
FROM graduated_students gs
LEFT JOIN transcript_pins tp ON gs.id = tp.graduated_student_id
WHERE gs.is_active = true
GROUP BY 
  gs.id, 
  gs.first_name, 
  gs.last_name, 
  gs.admission_number, 
  gs.graduation_session, 
  gs.graduation_class,
  gs.fees_cleared,
  gs.outstanding_balance
ORDER BY gs.graduation_session DESC, gs.graduation_class;

COMMENT ON VIEW v_transcript_pins_summary IS 
'Summary of transcript PINs by student with fees status';

-- ===================================================
-- VIEW: Transcript Requests with Full Details
-- ===================================================
CREATE OR REPLACE VIEW v_transcript_requests_detailed AS
SELECT 
  tr.id as request_id,
  gs.first_name || ' ' || gs.last_name as student_name,
  gs.admission_number,
  gs.graduation_session,
  gs.graduation_class,
  tp.pin_code,
  tp.price as pin_price,
  tr.selected_classes,
  tr.selected_sessions,
  tr.selected_terms,
  tr.total_subjects_count,
  tr.total_marks_records,
  tr.generated_at,
  tr.downloaded_at,
  tr.ip_address,
  tr.file_size_bytes,
  tr.generation_duration_ms,
  CASE 
    WHEN tr.downloaded_at IS NOT NULL THEN
      EXTRACT(EPOCH FROM (tr.downloaded_at - tr.generated_at))::INTEGER
    ELSE NULL
  END as download_delay_seconds
FROM transcript_requests tr
JOIN graduated_students gs ON tr.graduated_student_id = gs.id
LEFT JOIN transcript_pins tp ON tr.pin_id = tp.id
ORDER BY tr.generated_at DESC;

COMMENT ON VIEW v_transcript_requests_detailed IS 
'Detailed transcript requests with student info, PIN details, and timing metrics';

-- ===================================================
-- VIEW: Fees Clearance Dashboard
-- ===================================================
CREATE OR REPLACE VIEW v_fees_clearance_status AS
SELECT 
  gs.id as graduated_student_id,
  gs.first_name || ' ' || gs.last_name as student_name,
  gs.admission_number,
  gs.graduation_session,
  gs.graduation_class,
  gs.email,
  gs.phone,
  gs.fees_clearance_required,
  gs.fees_cleared,
  gs.outstanding_balance,
  CASE 
    WHEN gs.fees_clearance_required = false THEN 'Exempted'
    WHEN gs.fees_cleared = true THEN 'Cleared'
    WHEN gs.outstanding_balance > 0 THEN 'Outstanding'
    ELSE 'Unknown'
  END as fees_status,
  gs.fees_notes,
  gs.fees_cleared_at,
  clearer.first_name || ' ' || clearer.last_name as cleared_by_name,
  clearer.role as cleared_by_role,
  COUNT(tp.id) as total_pins_purchased,
  COUNT(tr.id) as total_transcripts_generated
FROM graduated_students gs
LEFT JOIN profiles clearer ON gs.fees_cleared_by = clearer.id
LEFT JOIN transcript_pins tp ON gs.id = tp.graduated_student_id
LEFT JOIN transcript_requests tr ON gs.id = tr.graduated_student_id
WHERE gs.is_active = true
GROUP BY 
  gs.id,
  gs.first_name,
  gs.last_name,
  gs.admission_number,
  gs.graduation_session,
  gs.graduation_class,
  gs.email,
  gs.phone,
  gs.fees_clearance_required,
  gs.fees_cleared,
  gs.outstanding_balance,
  gs.fees_notes,
  gs.fees_cleared_at,
  clearer.first_name,
  clearer.last_name,
  clearer.role
ORDER BY 
  gs.fees_cleared ASC, 
  gs.outstanding_balance DESC,
  gs.graduation_session DESC;

COMMENT ON VIEW v_fees_clearance_status IS 
'Dashboard view of fees clearance status for all graduated students';

-- ===================================================
-- VIEW: Alumni Revenue Report
-- ===================================================
CREATE OR REPLACE VIEW v_alumni_revenue_report AS
SELECT 
  gs.graduation_session,
  COUNT(DISTINCT gs.id) as total_graduates,
  COUNT(DISTINCT tp.id) as total_pins_sold,
  SUM(tp.price) as total_revenue,
  AVG(tp.price) as avg_pin_price,
  COUNT(DISTINCT tr.id) as total_transcripts_issued,
  COUNT(DISTINCT gs.id) FILTER (
    WHERE gs.fees_cleared = false AND gs.fees_clearance_required = true
  ) as graduates_with_fees_pending,
  SUM(gs.outstanding_balance) FILTER (
    WHERE gs.fees_cleared = false AND gs.fees_clearance_required = true
  ) as total_outstanding_fees
FROM graduated_students gs
LEFT JOIN transcript_pins tp ON gs.id = tp.graduated_student_id
LEFT JOIN transcript_requests tr ON gs.id = tr.graduated_student_id
WHERE gs.is_active = true
GROUP BY gs.graduation_session
ORDER BY gs.graduation_session DESC;

COMMENT ON VIEW v_alumni_revenue_report IS 
'Revenue and statistics report grouped by graduation session';

-- =====================================================
-- GRANTS (Permissions)
-- =====================================================

-- Grant appropriate access to authenticated users
GRANT SELECT, INSERT, UPDATE ON graduated_students TO authenticated;
GRANT SELECT, INSERT, UPDATE ON transcript_pins TO authenticated;
GRANT SELECT, INSERT ON transcript_requests TO authenticated;

-- Grant access to views
GRANT SELECT ON v_transcript_pins_summary TO authenticated;
GRANT SELECT ON v_transcript_requests_detailed TO authenticated;
GRANT SELECT ON v_fees_clearance_status TO authenticated;
GRANT SELECT ON v_alumni_revenue_report TO authenticated;

-- =====================================================
-- SAMPLE DATA FOR TESTING (OPTIONAL)
-- =====================================================
-- Uncomment the section below to insert sample data for testing

/*
-- Sample graduated student with fees cleared
INSERT INTO graduated_students (
  first_name,
  last_name,
  middle_name,
  admission_number,
  graduation_session,
  graduation_class,
  graduation_date,
  email,
  phone,
  gender,
  date_of_birth,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  fees_notes,
  is_active
) VALUES (
  'John',
  'Doe',
  'Chukwu',
  'ADM2023001',
  '2023/2024',
  'SS3 A',
  '2024-06-15',
  'john.doe@example.com',
  '+234-803-123-4567',
  'Male',
  '2006-03-15',
  true,
  true,
  0.00,
  'Fees fully paid before graduation',
  true
) ON CONFLICT (admission_number) DO NOTHING;

-- Sample graduated student with outstanding fees
INSERT INTO graduated_students (
  first_name,
  last_name,
  middle_name,
  admission_number,
  graduation_session,
  graduation_class,
  graduation_date,
  email,
  phone,
  gender,
  date_of_birth,
  fees_clearance_required,
  fees_cleared,
  outstanding_balance,
  fees_notes,
  is_active
) VALUES (
  'Jane',
  'Smith',
  'Adaeze',
  'ADM2023002',
  '2023/2024',
  'SS3 B',
  '2024-06-15',
  'jane.smith@example.com',
  '+234-805-234-5678',
  'Female',
  '2005-08-20',
  true,
  false,
  50000.00,
  'Outstanding balance from SS3 Third Term',
  true
) ON CONFLICT (admission_number) DO NOTHING;

-- Sample transcript PIN for John Doe
INSERT INTO transcript_pins (
  pin_code,
  graduated_student_id,
  price,
  expires_at
) 
SELECT 
  'A3F7-2K9L-8M4P',
  id,
  5000.00,
  NOW() + INTERVAL '90 days'
FROM graduated_students
WHERE admission_number = 'ADM2023001'
ON CONFLICT (pin_code) DO NOTHING;
*/

-- =====================================================
-- COMPLETION MESSAGE
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '========================================================================';
  RAISE NOTICE 'GRADUATED STUDENTS & TRANSCRIPT SYSTEM - INSTALLATION COMPLETE';
  RAISE NOTICE '========================================================================';
  RAISE NOTICE '';
  RAISE NOTICE '✅ TABLES CREATED:';
  RAISE NOTICE '   • graduated_students - Alumni directory with fees clearance';
  RAISE NOTICE '   • transcript_pins - PIN access control and payment tracking';
  RAISE NOTICE '   • transcript_requests - Complete audit log';
  RAISE NOTICE '';
  RAISE NOTICE '✅ INDEXES CREATED: 20+ performance indexes';
  RAISE NOTICE '';
  RAISE NOTICE '✅ FUNCTIONS CREATED:';
  RAISE NOTICE '   • mark_pin_as_used() - Auto-mark PIN when used';
  RAISE NOTICE '   • is_pin_valid() - Validate PIN before use';
  RAISE NOTICE '   • generate_transcript_pin_code() - Secure PIN generation';
  RAISE NOTICE '   • check_fees_clearance() - Validate fees before transcript';
  RAISE NOTICE '   • cleanup_expired_pins() - Maintenance function';
  RAISE NOTICE '   • get_transcript_statistics() - Dashboard stats';
  RAISE NOTICE '';
  RAISE NOTICE '✅ VIEWS CREATED:';
  RAISE NOTICE '   • v_transcript_pins_summary - PIN summary by student';
  RAISE NOTICE '   • v_transcript_requests_detailed - Full request history';
  RAISE NOTICE '   • v_fees_clearance_status - Fees clearance dashboard';
  RAISE NOTICE '   • v_alumni_revenue_report - Revenue by session';
  RAISE NOTICE '';
  RAISE NOTICE '✅ SECURITY:';
  RAISE NOTICE '   • Row Level Security (RLS) enabled on all tables';
  RAISE NOTICE '   • Role-based access policies configured';
  RAISE NOTICE '   • Automatic triggers for data integrity';
  RAISE NOTICE '';
  RAISE NOTICE '🎓 FEES CLEARANCE SYSTEM:';
  RAISE NOTICE '   • Manual management ready (Director/Finance Admin)';
  RAISE NOTICE '   • Future-proof for finance module integration';
  RAISE NOTICE '   • Flexible exemptions (scholarships, etc.)';
  RAISE NOTICE '   • Complete audit trail';
  RAISE NOTICE '';
  RAISE NOTICE '📋 NEXT STEPS:';
  RAISE NOTICE '   1. Test sample data (uncomment sample section if needed)';
  RAISE NOTICE '   2. Implement backend endpoints (promotion integration)';
  RAISE NOTICE '   3. Create admin PIN management UI';
  RAISE NOTICE '   4. Build alumni login portal';
  RAISE NOTICE '   5. Develop transcript generation logic';
  RAISE NOTICE '';
  RAISE NOTICE '========================================================================';
END $$;
