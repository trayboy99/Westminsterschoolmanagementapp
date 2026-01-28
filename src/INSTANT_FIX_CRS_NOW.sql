-- ✅ INSTANT FIX: Add CRS to JSS classes RIGHT NOW

-- Step 1: Check if CRS exists
SELECT id, name, code, level 
FROM subjects 
WHERE code = 'CRS_JUNIOR' OR code = 'CRS' OR name ILIKE '%CRS%';

-- Step 2: Check JSS classes
SELECT id, name, level 
FROM classes 
WHERE level = 'junior' OR name ILIKE 'JSS%';

-- Step 3: Add CRS to all JSS classes (RUN THIS!)
DO $$
DECLARE
  crs_id UUID;
  jss1_id UUID;
  jss2_id UUID;
  jss3_id UUID;
BEGIN
  -- Find CRS subject ID
  SELECT id INTO crs_id 
  FROM subjects 
  WHERE code = 'CRS_JUNIOR' OR code = 'CRS' OR name ILIKE '%CRS%'
  LIMIT 1;
  
  IF crs_id IS NULL THEN
    RAISE EXCEPTION 'CRS subject not found! Check the subject name/code.';
  END IF;
  
  RAISE NOTICE 'Found CRS subject: %', crs_id;
  
  -- Find JSS class IDs
  SELECT id INTO jss1_id FROM classes WHERE name ILIKE '%JSS 1%' OR name ILIKE '%JSS1%' LIMIT 1;
  SELECT id INTO jss2_id FROM classes WHERE name ILIKE '%JSS 2%' OR name ILIKE '%JSS2%' LIMIT 1;
  SELECT id INTO jss3_id FROM classes WHERE name ILIKE '%JSS 3%' OR name ILIKE '%JSS3%' LIMIT 1;
  
  -- Add to JSS 1
  IF jss1_id IS NOT NULL THEN
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss1_id, crs_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    RAISE NOTICE '✅ Added CRS to JSS 1';
  ELSE
    RAISE NOTICE '⚠️  JSS 1 class not found';
  END IF;
  
  -- Add to JSS 2
  IF jss2_id IS NOT NULL THEN
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss2_id, crs_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    RAISE NOTICE '✅ Added CRS to JSS 2';
  ELSE
    RAISE NOTICE '⚠️  JSS 2 class not found';
  END IF;
  
  -- Add to JSS 3
  IF jss3_id IS NOT NULL THEN
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss3_id, crs_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    RAISE NOTICE '✅ Added CRS to JSS 3';
  ELSE
    RAISE NOTICE '⚠️  JSS 3 class not found';
  END IF;
  
  RAISE NOTICE '════════════════════════════════════';
  RAISE NOTICE '✅ DONE! CRS added to JSS classes';
  RAISE NOTICE '════════════════════════════════════';
END $$;

-- Step 4: Verify it worked
SELECT 
  c.name as class_name,
  s.name as subject_name,
  s.code,
  cs.is_compulsory
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
WHERE s.code ILIKE '%CRS%' OR s.name ILIKE '%CRS%'
ORDER BY c.name;

-- Expected: Should show CRS for JSS 1, JSS 2, JSS 3
