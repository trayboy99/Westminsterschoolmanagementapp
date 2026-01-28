# FIX BOTH ISSUES NOW

## Issue 1: "Failed to Fetch" Error ✅ FIXED
**Fixed in backend** - The classes endpoint was trying to join with sections table which caused an error.

## Issue 2: CRS Not in class_subjects Table

### Run This SQL RIGHT NOW:

```sql
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
    RAISE EXCEPTION 'CRS subject not found!';
  END IF;
  
  RAISE NOTICE 'Found CRS subject: %', crs_id;
  
  -- Find JSS class IDs
  SELECT id INTO jss1_id FROM classes WHERE name ILIKE '%JSS 1%' OR name ILIKE '%JSS1%' LIMIT 1;
  SELECT id INTO jss2_id FROM classes WHERE name ILIKE '%JSS 2%' OR name ILIKE '%JSS2%' LIMIT 1;
  SELECT id INTO jss3_id FROM classes WHERE name ILIKE '%JSS 3%' OR name ILIKE '%JSS3%' LIMIT 1;
  
  -- Add to all JSS classes
  IF jss1_id IS NOT NULL THEN
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss1_id, crs_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    RAISE NOTICE '✅ Added CRS to JSS 1';
  END IF;
  
  IF jss2_id IS NOT NULL THEN
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss2_id, crs_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    RAISE NOTICE '✅ Added CRS to JSS 2';
  END IF;
  
  IF jss3_id IS NOT NULL THEN
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss3_id, crs_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    RAISE NOTICE '✅ Added CRS to JSS 3';
  END IF;
  
  RAISE NOTICE '✅ DONE!';
END $$;
```

### Verify:

```sql
SELECT 
  c.name as class_name,
  s.name as subject_name,
  s.code
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
WHERE s.code ILIKE '%CRS%' OR s.name ILIKE '%CRS%'
ORDER BY c.name;
```

Should show:
- JSS 1 - CRS
- JSS 2 - CRS
- JSS 3 - CRS

### Test:

1. **Refresh your browser** (the backend is fixed)
2. Go to **Subjects** tab → Should load without "failed to fetch" error ✅
3. Go to **Subject Offerings** → **Class Subjects** → Select JSS 1 → Should see CRS ✅
4. Go to **Subject Offerings** → **Student Subjects** → Select JSS 1 → CRS should be in dropdown ✅

## For NEW Subjects (Going Forward)

When you create a new subject with "Auto-assign to matching classes" checked, it will automatically appear in class_subjects. This works now because:
1. Backend classes endpoint is fixed ✅
2. Frontend loads classes properly ✅
3. Auto-assign feature works ✅

## For ALL Other Existing Subjects

If you want to auto-assign ALL your other subjects, run: `/FIX_CRS_AND_ALL_SUBJECTS_NOW.sql`
