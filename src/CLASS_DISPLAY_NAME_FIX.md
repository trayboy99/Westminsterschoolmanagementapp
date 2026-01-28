# Class Display Name Fix - Complete Implementation

## Problem
Classes were not displaying with their section names merged (e.g., "JSS2 Gold" instead of just "JSS2"). The issue was:
1. Multiple duplicate endpoints returning classes WITHOUT sections JOIN
2. Frontend components adding extra text like "(Junior)" after the display name
3. Inconsistent display across the app

## Solution

### Backend Changes (server/index.tsx)

#### 1. Removed ALL Duplicate Endpoints
- ❌ Removed duplicate `GET /classes-admin` (line ~1301) 
- ❌ Removed duplicate `POST /classes` (line ~1303)
- ❌ Removed duplicate `PUT /classes/:id` (line ~1391)
- ❌ Removed duplicate `DELETE /classes/:id` (line ~1480)
- ❌ Removed duplicate `GET /classes` (line ~3450)

#### 2. Updated GET /classes Endpoint (line ~3053)
```typescript
// Already correct - fetches with sections JOIN
const { data: classes, error } = await supabase
  .from("classes")
  .select("*, sections(name)")
  .order("name");

// Maps to add display_name field
const classesWithDisplayName = classes?.map((classItem: any) => ({
  ...classItem,
  display_name: classItem.sections?.name 
    ? `${classItem.name} ${classItem.sections.name}` 
    : classItem.name,
  section_name: classItem.sections?.name || null
})) || [];
```

#### 3. Updated POST /classes Endpoint (line ~3107)
After creating a class, now fetches it back WITH sections to return display_name:
```typescript
// Create the class
const { data: classData, error } = await supabase
  .from("classes")
  .insert({ name, level, class_teacher_id, section_id })
  .select()
  .single();

// Fetch with sections JOIN
const { data: classWithSection } = await supabase
  .from("classes")
  .select("*, sections(name)")
  .eq("id", classData.id)
  .single();

// Add display_name
const classWithDisplayName = {
  ...classWithSection,
  display_name: classWithSection.sections?.name 
    ? `${classWithSection.name} ${classWithSection.sections.name}` 
    : classWithSection.name,
  section_name: classWithSection.sections?.name || null
};

return c.json({ success: true, class: classWithDisplayName });
```

#### 4. Updated PUT /classes/:id Endpoint (line ~3178)
Same pattern as POST - fetches updated class WITH sections to return display_name.

### Frontend Changes

#### 1. MarksEntryForm.tsx (line 309)
**Before:**
```tsx
{classData.display_name || classData.name} {classData.level && `(${classData.level})`}
```

**After:**
```tsx
{classData.display_name || classData.name}
```

#### 2. RegistrationForm.tsx (line 309)
**Before:**
```tsx
{classItem.display_name || classItem.name} {classItem.level && `(${classItem.level})`}
```

**After:**
```tsx
{classItem.display_name || classItem.name}
```

#### 3. ClassesManager.tsx (line 501)
**Already Correct:**
```tsx
{classItem.display_name || classItem.name}
```

## Expected Behavior

### 1. Class Creation
When you create a class "JSS2" with section "Gold":
- ✅ Immediately shows "JSS2 Gold" in the classes list
- ✅ display_name field is returned from the API

### 2. Class List Display
In all class selection dropdowns and tables:
- ✅ Shows "JSS2 Gold" (class name + section name)
- ✅ Does NOT show "JSS2 Gold (Junior)" 
- ✅ Level (Junior/Senior) is shown separately if needed

### 3. Marks Entry Form
- ✅ Class dropdown shows "JSS2 Gold"
- ✅ NOT "JSS1 (Junior)"

### 4. Registration Form
- ✅ Class dropdown shows "JSS2 Gold"
- ✅ Clean display without extra parentheses

### 5. Classes Management
- ✅ Table shows "JSS2 Gold" in the Class Name column
- ✅ Level shown separately in its own column as a badge

## How It Works

1. **Database Schema:**
   - `classes` table has: `id`, `name`, `level`, `section_id`, `class_teacher_id`
   - `sections` table has: `id`, `name`, `description`

2. **API Response:**
   ```json
   {
     "success": true,
     "classes": [
       {
         "id": "uuid",
         "name": "JSS2",
         "level": "Junior",
         "section_id": "section-uuid",
         "sections": {
           "name": "Gold"
         },
         "display_name": "JSS2 Gold",
         "section_name": "Gold"
       }
     ]
   }
   ```

3. **Frontend Usage:**
   - Always use `display_name` field when displaying class
   - Fallback to `name` if `display_name` not available
   - Don't add extra text like level in parentheses

## Files Modified

### Backend
- `/supabase/functions/server/index.tsx` - Removed duplicates, added sections JOIN to all class endpoints

### Frontend
- `/components/marks/MarksEntryForm.tsx` - Removed "(Junior)" suffix
- `/components/auth/RegistrationForm.tsx` - Removed "(Junior)" suffix
- `/components/academic/ClassesManager.tsx` - Already correct

## Testing Checklist

- [ ] Create a new class with a section → Shows "JSS2 Gold" immediately in list
- [ ] Edit a class and change section → Updates to new section name immediately
- [ ] View classes in Marks Entry → Shows "JSS2 Gold" without "(Junior)"
- [ ] View classes in Student Registration → Shows "JSS2 Gold" cleanly
- [ ] View Classes Management page → Shows "JSS2 Gold" in table
- [ ] Create class without section → Shows just "JSS2" (no extra text)

## Notes

- All class-related endpoints now use a single source of truth
- The `display_name` field is computed on the backend, not stored in database
- This ensures consistency across the entire application
- Frontend components never have to compute the display name themselves
