-- ============================================================================
-- RESTRUCTURE ACADEMIC CALENDAR SYSTEM
-- This creates separate tables for sessions and terms with historical tracking
-- ============================================================================

-- STEP 1: Drop the old academic_calendar table
-- WARNING: This will delete all existing calendar data. 
-- If you have important data, export it first!
DROP TABLE IF EXISTS academic_calendar CASCADE;

-- ============================================================================
-- STEP 2: Create academic_sessions table
-- ============================================================================
CREATE TABLE academic_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_name TEXT NOT NULL UNIQUE, -- e.g., "2024/2025", "2025/2026"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure dates are logical
  CHECK (end_date > start_date),
  
  -- Only ONE session can be current at a time
  CONSTRAINT only_one_current_session EXCLUDE USING gist (
    is_current WITH =
  ) WHERE (is_current = true)
);

-- Trigger: When a session is set to current, set status to active
CREATE OR REPLACE FUNCTION set_session_active_on_current()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    NEW.status := 'active';
    
    -- Set all other sessions to NOT current
    UPDATE academic_sessions 
    SET is_current = false, status = 'inactive'
    WHERE id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_session_active_on_current
  BEFORE INSERT OR UPDATE ON academic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION set_session_active_on_current();

-- ============================================================================
-- STEP 3: Create academic_terms table
-- ============================================================================
CREATE TABLE academic_terms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  term_name TEXT NOT NULL UNIQUE, -- e.g., "First Term", "Second Term", "Third Term"
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  next_term_begins DATE,
  number_of_weeks INTEGER NOT NULL DEFAULT 12 CHECK (number_of_weeks > 0),
  is_current BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'archived')),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Ensure dates are logical
  CHECK (end_date > start_date),
  CHECK (next_term_begins IS NULL OR next_term_begins > end_date),
  
  -- Only ONE term can be current at a time
  CONSTRAINT only_one_current_term EXCLUDE USING gist (
    is_current WITH =
  ) WHERE (is_current = true)
);

-- Trigger: When a term is set to current, set status to active
CREATE OR REPLACE FUNCTION set_term_active_on_current()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_current = true THEN
    NEW.status := 'active';
    
    -- Set all other terms to NOT current
    UPDATE academic_terms 
    SET is_current = false, status = 'inactive'
    WHERE id != NEW.id AND is_current = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_term_active_on_current
  BEFORE INSERT OR UPDATE ON academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION set_term_active_on_current();

-- ============================================================================
-- STEP 4: Create NEW academic_calendar table (references sessions & terms)
-- ============================================================================
-- This table now just stores the CURRENT combination
-- It's essentially a "settings" table that says which session/term is active
CREATE TABLE academic_calendar (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES academic_sessions(id) ON DELETE CASCADE,
  term_id UUID NOT NULL REFERENCES academic_terms(id) ON DELETE CASCADE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Only ONE calendar entry should exist (current session + current term)
  -- We'll enforce this at the application level
  UNIQUE(session_id, term_id)
);

-- ============================================================================
-- STEP 5: Create helper function to get current session
-- ============================================================================
CREATE OR REPLACE FUNCTION get_current_session()
RETURNS UUID AS $$
DECLARE
  current_session_id UUID;
BEGIN
  SELECT id INTO current_session_id
  FROM academic_sessions
  WHERE is_current = true
  LIMIT 1;
  
  RETURN current_session_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 6: Create helper function to get current term
-- ============================================================================
CREATE OR REPLACE FUNCTION get_current_term()
RETURNS UUID AS $$
DECLARE
  current_term_id UUID;
BEGIN
  SELECT id INTO current_term_id
  FROM academic_terms
  WHERE is_current = true
  LIMIT 1;
  
  RETURN current_term_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- STEP 7: Insert default academic sessions (Nigerian school year)
-- ============================================================================
INSERT INTO academic_sessions (session_name, start_date, end_date, is_current, status)
VALUES 
  ('2024/2025', '2024-09-01', '2025-08-31', false, 'inactive'),
  ('2025/2026', '2025-09-01', '2026-08-31', true, 'active'), -- Current session
  ('2026/2027', '2026-09-01', '2027-08-31', false, 'inactive')
ON CONFLICT (session_name) DO NOTHING;

-- ============================================================================
-- STEP 8: Insert default academic terms (Nigerian school terms)
-- ============================================================================
INSERT INTO academic_terms (term_name, start_date, end_date, next_term_begins, number_of_weeks, is_current, status)
VALUES 
  ('First Term', '2025-09-01', '2025-12-20', '2026-01-05', 14, true, 'active'), -- Current term
  ('Second Term', '2026-01-05', '2026-04-10', '2026-04-27', 12, false, 'inactive'),
  ('Third Term', '2026-04-27', '2026-08-05', '2026-09-01', 12, false, 'inactive')
ON CONFLICT (term_name) DO NOTHING;

-- ============================================================================
-- STEP 9: Populate academic_calendar with current session + current term
-- ============================================================================
INSERT INTO academic_calendar (session_id, term_id)
SELECT 
  (SELECT id FROM academic_sessions WHERE is_current = true LIMIT 1),
  (SELECT id FROM academic_terms WHERE is_current = true LIMIT 1)
WHERE NOT EXISTS (SELECT 1 FROM academic_calendar);

-- ============================================================================
-- STEP 10: Update updated_at timestamp automatically
-- ============================================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_sessions_updated_at
  BEFORE UPDATE ON academic_sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_terms_updated_at
  BEFORE UPDATE ON academic_terms
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calendar_updated_at
  BEFORE UPDATE ON academic_calendar
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================
-- Run these to verify everything is set up correctly:

-- Check current session
-- SELECT * FROM academic_sessions WHERE is_current = true;

-- Check current term
-- SELECT * FROM academic_terms WHERE is_current = true;

-- Check academic calendar
-- SELECT 
--   ac.id,
--   s.session_name,
--   s.is_current as session_is_current,
--   s.status as session_status,
--   t.term_name,
--   t.is_current as term_is_current,
--   t.status as term_status,
--   t.number_of_weeks
-- FROM academic_calendar ac
-- JOIN academic_sessions s ON ac.session_id = s.id
-- JOIN academic_terms t ON ac.term_id = t.id;

-- ============================================================================
-- IMPORTANT NOTES:
-- ============================================================================
-- 1. OLD SESSIONS/TERMS ARE NEVER DELETED - they're historical records
-- 2. When you promote students, their marks/comments keep the OLD session_id and term_id
-- 3. Only ONE session and ONE term can be marked as is_current = true at a time
-- 4. When is_current = true, status automatically becomes 'active'
-- 5. The academic_calendar table always shows the current session + current term
-- 6. All other tables (marks, comments, attendance, etc.) should reference
--    session_id and term_id directly from academic_sessions and academic_terms
-- ============================================================================
