-- SQL Check: Verify academic_sessions and academic_terms tables exist
-- Copy this SQL and run it in your Supabase SQL Editor

-- Check if academic_sessions table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'academic_sessions'
ORDER BY ordinal_position;

-- Check if academic_terms table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'academic_terms'
ORDER BY ordinal_position;

-- Check if academic_calendar table exists
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'academic_calendar'
ORDER BY ordinal_position;

-- If tables don't exist, create them:
-- =========================================

-- Create academic_sessions table
CREATE TABLE IF NOT EXISTS academic_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_name TEXT NOT NULL UNIQUE,
    start_date DATE,
    end_date DATE,
    is_current BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create academic_terms table
CREATE TABLE IF NOT EXISTS academic_terms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    term_name TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    next_term_begins DATE,
    number_of_weeks INTEGER DEFAULT 12,
    is_current BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'inactive',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create academic_calendar table (to track current session/term)
CREATE TABLE IF NOT EXISTS academic_calendar (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id UUID REFERENCES academic_sessions(id),
    term_id UUID REFERENCES academic_terms(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS on these tables
ALTER TABLE academic_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_terms ENABLE ROW LEVEL SECURITY;
ALTER TABLE academic_calendar ENABLE ROW LEVEL SECURITY;

-- Create policies to allow admins to manage
CREATE POLICY "Allow authenticated users to view academic sessions"
    ON academic_sessions FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to manage academic sessions"
    ON academic_sessions FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('principal', 'director', 'it_admin')
        )
    );

CREATE POLICY "Allow authenticated users to view academic terms"
    ON academic_terms FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to manage academic terms"
    ON academic_terms FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('principal', 'director', 'it_admin')
        )
    );

CREATE POLICY "Allow authenticated users to view academic calendar"
    ON academic_calendar FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Allow admins to manage academic calendar"
    ON academic_calendar FOR ALL
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM profiles
            WHERE profiles.id = auth.uid()
            AND profiles.role IN ('principal', 'director', 'it_admin')
        )
    );
