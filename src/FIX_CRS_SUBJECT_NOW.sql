-- ✅ INSTANT FIX: Add CRS subject to all JSS classes NOW

-- Step 1: Find the CRS subject ID
SELECT id, name, code, level FROM subjects WHERE code = 'CRS' OR name ILIKE '%CRS%' OR name ILIKE '%Christian%Religious%';

-- Step 2: Find all JSS classes
SELECT id, name, level FROM classes WHERE level = 'junior' OR name ILIKE 'JSS%' ORDER BY name;

-- Step 3: Add CRS to all JSS classes (CHANGE THE SUBJECT ID BELOW!)
-- 👇 COPY THE SUBJECT ID FROM STEP 1 AND PASTE IT HERE:

DO $$
DECLARE
  crs_subject_id UUID;
  jss_class RECORD;
BEGIN
  -- Get CRS subject ID
  SELECT id INTO crs_subject_id FROM subjects 
  WHERE code = 'CRS' OR name ILIKE '%CRS%' OR name ILIKE '%Christian%Religious%' 
  LIMIT 1;
  
  IF crs_subject_id IS NULL THEN
    RAISE NOTICE 'CRS subject not found! Please check subject name/code.';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Found CRS subject: %', crs_subject_id;
  
  -- Add to all JSS classes
  FOR jss_class IN 
    SELECT id, name FROM classes WHERE level = 'junior' OR name ILIKE 'JSS%'
  LOOP
    -- Try to insert, ignore if already exists
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss_class.id, crs_subject_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    
    RAISE NOTICE 'Added CRS to class: %', jss_class.name;
  END LOOP;
  
  RAISE NOTICE '✅ DONE! CRS added to all JSS classes.';
END $$;

-- Step 4: Verify it worked
SELECT 
  c.name as class_name,
  s.name as subject_name,
  cs.is_compulsory
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
WHERE s.code = 'CRS' OR s.name ILIKE '%CRS%'
ORDER BY c.name;

-- Expected output: Should show CRS for JSS 1, JSS 2, JSS 3

-- ✅ NOW GO CHECK:
-- 1. Subject Offerings → Class Subjects → Select JSS 1 → Should see CRS
-- 2. Subject Offerings → Student Subjects → Select JSS 1 → Should see CRS in dropdown
