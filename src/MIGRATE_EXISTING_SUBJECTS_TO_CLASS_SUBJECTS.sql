-- ================================================================
-- MIGRATE EXISTING SUBJECT-CLASS ASSIGNMENTS TO NEW SYSTEM
-- ================================================================
-- This migrates existing subject assignments from subject_assignments table
-- (teacher-subject-class relationships) to the new Subject Offerings system
-- (class_subjects table with many-to-many relationship)
-- ================================================================
-- NOTE: If Math is taught in JSS1, JSS2, JSS3 by different teachers,
--       this creates 3 separate rows (one per class) in class_subjects
-- ================================================================

DO $$
DECLARE
  v_migrated_count INTEGER := 0;
  v_existing_count INTEGER := 0;
  v_teacher_assignments_count INTEGER := 0;
BEGIN
  -- Check if class_subjects table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'class_subjects') THEN
    RAISE EXCEPTION 'class_subjects table does not exist. Please run CREATE_SUBJECT_OFFERING_SYSTEM.sql first';
  END IF;

  -- Check if subject_assignments table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'subject_assignments') THEN
    RAISE EXCEPTION 'subject_assignments table does not exist. Cannot migrate data.';
  END IF;

  -- Count existing teacher assignments (may have duplicates if multiple teachers teach same subject to same class)
  SELECT COUNT(*) INTO v_teacher_assignments_count
  FROM subject_assignments
  WHERE class_id IS NOT NULL AND subject_id IS NOT NULL;

  -- Count unique class-subject pairs
  SELECT COUNT(DISTINCT (class_id, subject_id)) INTO v_existing_count
  FROM subject_assignments
  WHERE class_id IS NOT NULL AND subject_id IS NOT NULL;

  RAISE NOTICE '📊 Found % teacher-subject-class assignments in subject_assignments table', v_teacher_assignments_count;
  RAISE NOTICE '📊 Found % UNIQUE class-subject pairs to migrate', v_existing_count;

  -- Migrate existing assignments to new system
  -- Extract DISTINCT class-subject pairs (removes duplicate if multiple teachers teach same subject to same class)
  INSERT INTO class_subjects (class_id, subject_id, is_compulsory, created_at)
  SELECT DISTINCT
    sa.class_id,
    sa.subject_id,
    true AS is_compulsory, -- Mark all existing subjects as compulsory by default
    NOW()
  FROM subject_assignments sa
  WHERE sa.class_id IS NOT NULL 
    AND sa.subject_id IS NOT NULL
  ON CONFLICT (class_id, subject_id) 
  DO NOTHING; -- Skip if already exists

  GET DIAGNOSTICS v_migrated_count = ROW_COUNT;

  RAISE NOTICE '✅ Successfully migrated % subject-class assignments to new system', v_migrated_count;
  
  IF v_migrated_count < v_existing_count THEN
    RAISE NOTICE '⚠️  % assignments were already in the new system (duplicates skipped)', (v_existing_count - v_migrated_count);
  END IF;

  -- Display summary of migrated data
  RAISE NOTICE '';
  RAISE NOTICE '=== MIGRATION SUMMARY ===';
  RAISE NOTICE 'Teacher assignments (may have duplicates): %', v_teacher_assignments_count;
  RAISE NOTICE 'Unique class-subject pairs found: %', v_existing_count;
  RAISE NOTICE 'Newly migrated: %', v_migrated_count;
  RAISE NOTICE 'Already existed: %', (v_existing_count - v_migrated_count);
  RAISE NOTICE '';
  RAISE NOTICE '💡 Example: If Math is taught by Teacher A to JSS1 and Teacher B to JSS2,';
  RAISE NOTICE '    this creates 2 rows in class_subjects (Math-JSS1, Math-JSS2)';
  RAISE NOTICE '';
  RAISE NOTICE '🎯 Next steps:';
  RAISE NOTICE '   1. Refresh your app';
  RAISE NOTICE '   2. Go to Classes & Subjects → Subject Offerings';
  RAISE NOTICE '   3. Select a class - you should now see all its subjects!';
  RAISE NOTICE '   4. You can now assign subjects to individual students';

END $$;

-- ================================================================
-- VERIFICATION QUERY
-- ================================================================
-- Run this to verify the migration worked

SELECT 
  c.name AS class_name,
  c.level AS class_level,
  COUNT(cs.id) AS total_subjects,
  COUNT(CASE WHEN cs.is_compulsory THEN 1 END) AS compulsory_subjects,
  COUNT(CASE WHEN NOT cs.is_compulsory THEN 1 END) AS optional_subjects
FROM classes c
LEFT JOIN class_subjects cs ON cs.class_id = c.id
GROUP BY c.id, c.name, c.level
ORDER BY c.name;

-- ================================================================
-- VIEW ALL MIGRATED ASSIGNMENTS
-- ================================================================
-- This shows all the subject-class assignments in the new system

SELECT 
  c.name AS class_name,
  s.name AS subject_name,
  s.code AS subject_code,
  cs.is_compulsory,
  cs.created_at
FROM class_subjects cs
INNER JOIN classes c ON c.id = cs.class_id
INNER JOIN subjects s ON s.id = cs.subject_id
ORDER BY c.name, s.name;
