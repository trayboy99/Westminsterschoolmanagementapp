-- ============================================
-- DROP OLD PROMOTIONS TABLE & CREATE NEW ONE
-- ============================================
-- This creates a proper promotions table with all required fields
-- for tracking student promotions across sessions

-- Step 1: Drop the old promotions table
DROP TABLE IF EXISTS promotions CASCADE;

-- Step 2: Create new promotions table with proper structure
CREATE TABLE promotions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Student being promoted
  student_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Class movement
  from_class_id UUID NOT NULL REFERENCES classes(id) ON DELETE RESTRICT,
  to_class_id UUID REFERENCES classes(id) ON DELETE RESTRICT, -- NULL for graduating students
  
  -- Session information
  current_session TEXT NOT NULL, -- e.g., "2024/2025"
  new_session TEXT NOT NULL,     -- e.g., "2025/2026"
  
  -- Promotion details
  is_graduation BOOLEAN DEFAULT FALSE, -- TRUE if student is graduating (no to_class_id)
  promotion_type TEXT DEFAULT 'regular', -- 'regular', 'skip', 'repeat'
  
  -- Who approved and when
  promoted_by UUID NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  promoted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Notes
  notes TEXT,
  
  -- Revert tracking
  is_reverted BOOLEAN DEFAULT FALSE, -- TRUE if this promotion has been undone
  reverted_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  reverted_at TIMESTAMP WITH TIME ZONE,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 3: Create indexes for performance
CREATE INDEX idx_promotions_student_id ON promotions(student_id);
CREATE INDEX idx_promotions_from_class ON promotions(from_class_id);
CREATE INDEX idx_promotions_to_class ON promotions(to_class_id);
CREATE INDEX idx_promotions_current_session ON promotions(current_session);
CREATE INDEX idx_promotions_new_session ON promotions(new_session);
CREATE INDEX idx_promotions_promoted_at ON promotions(promoted_at DESC);

-- Step 4: Unique constraint - prevent duplicate promotions
CREATE UNIQUE INDEX idx_promotions_unique_student_session 
ON promotions(student_id, current_session, new_session);

-- Step 5: Enable RLS
ALTER TABLE promotions ENABLE ROW LEVEL SECURITY;

-- Step 6: RLS Policies

-- Allow authenticated users to read promotions
CREATE POLICY "Allow authenticated users to read promotions"
ON promotions FOR SELECT 
TO authenticated 
USING (true);

-- Allow admins to insert promotions
CREATE POLICY "Allow admins to insert promotions"
ON promotions FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('principal', 'director', 'it_admin')
  )
);

-- Allow admins to update promotions
CREATE POLICY "Allow admins to update promotions"
ON promotions FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('principal', 'director', 'it_admin')
  )
);

-- Allow admins to delete promotions
CREATE POLICY "Allow admins to delete promotions"
ON promotions FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() 
    AND profiles.role IN ('principal', 'director', 'it_admin')
  )
);

-- ============================================
-- TABLE STRUCTURE SUMMARY
-- ============================================
-- 
-- promotions table fields:
-- - id: UUID (primary key)
-- - student_id: UUID (references profiles)
-- - from_class_id: UUID (references classes)
-- - to_class_id: UUID nullable (NULL for graduates)
-- - current_session: TEXT (e.g., "2024/2025")
-- - new_session: TEXT (e.g., "2025/2026")
-- - is_graduation: BOOLEAN (true if graduating)
-- - promotion_type: TEXT (regular/skip/repeat)
-- - promoted_by: UUID (admin who promoted)
-- - promoted_at: TIMESTAMPTZ
-- - notes: TEXT
-- - created_at: TIMESTAMPTZ
-- - updated_at: TIMESTAMPTZ
--
-- ============================================
