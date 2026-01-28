-- QUICK FIX: Add admin_id column to uploads table
-- Copy and paste this into Supabase SQL Editor and run it NOW!

-- Add the missing column
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS admin_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_uploads_admin_id ON uploads(admin_id);

-- Ensure uploaded_by_admin exists
ALTER TABLE uploads ADD COLUMN IF NOT EXISTS uploaded_by_admin BOOLEAN DEFAULT FALSE;

-- Done! Now try uploading again as admin.
