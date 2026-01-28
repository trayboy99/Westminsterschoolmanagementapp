-- Add publication tracking columns to timetable_settings table
ALTER TABLE timetable_settings
ADD COLUMN IF NOT EXISTS is_published BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
ADD COLUMN IF NOT EXISTS published_by UUID REFERENCES auth.users(id);

-- Add index for faster queries on published status
CREATE INDEX IF NOT EXISTS idx_timetable_settings_is_published 
ON timetable_settings(is_published);

-- Add index for published_at for sorting
CREATE INDEX IF NOT EXISTS idx_timetable_settings_published_at 
ON timetable_settings(published_at DESC);

-- Add comment to document the columns
COMMENT ON COLUMN timetable_settings.is_published IS 'Whether this timetable has been published to teachers and students';
COMMENT ON COLUMN timetable_settings.published_at IS 'Timestamp when the timetable was published';
COMMENT ON COLUMN timetable_settings.published_by IS 'User ID of the admin who published the timetable';
