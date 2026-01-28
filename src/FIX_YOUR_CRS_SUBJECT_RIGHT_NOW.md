# FIX CRS SUBJECT - 1 MINUTE

## Run This SQL

```sql
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
    RAISE NOTICE 'CRS subject not found!';
    RETURN;
  END IF;
  
  -- Add to all JSS classes
  FOR jss_class IN 
    SELECT id, name FROM classes WHERE level = 'junior' OR name ILIKE 'JSS%'
  LOOP
    INSERT INTO class_subjects (class_id, subject_id, is_compulsory)
    VALUES (jss_class.id, crs_subject_id, true)
    ON CONFLICT (class_id, subject_id) DO NOTHING;
    
    RAISE NOTICE 'Added CRS to: %', jss_class.name;
  END LOOP;
  
  RAISE NOTICE '✅ DONE!';
END $$;
```

## Verify

```sql
SELECT 
  c.name as class_name,
  s.name as subject_name
FROM class_subjects cs
JOIN classes c ON cs.class_id = c.id
JOIN subjects s ON cs.subject_id = s.id
WHERE s.code = 'CRS'
ORDER BY c.name;
```

Should show:
- JSS 1 - CRS
- JSS 2 - CRS  
- JSS 3 - CRS

## Test

1. Subject Offerings → Class Subjects → Select JSS 1
   - Should see CRS ✅

2. Subject Offerings → Student Subjects → Select JSS 1
   - Should see CRS in dropdown ✅

---

## For ALL Subjects (Not Just CRS)

Run: `/AUTO_ASSIGN_EXISTING_SUBJECTS_NOW.sql`

This assigns ALL subjects to matching classes automatically.
