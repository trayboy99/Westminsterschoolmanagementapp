# Comprehensive School Management System Update Plan

## Priority 1: Mobile Responsiveness & UI Fixes (CRITICAL)

### 1. Students Management Page ✓
- Add horizontal scroll for table on mobile
- Wrap table in div with `overflow-x-auto`

### 2. Teachers Management Page ✓
- Remove debug button
- Add mobile responsiveness
- Horizontal scroll for table

### 3. Exam Management Page ✓
- Fix viewport width stability
- Mobile responsive layout
- Proper card layouts for mobile

### 4. Marks Entry Management Page ✓
- Mobile responsive
- Fix viewport width
- Align tabs properly on mobile
- Horizontal scroll for marks table

### 5. Result Management Page ✓
- Mobile responsive report card
- Proper layout for web/tablet/mobile
- Fix PDF download functionality

### 6. Comment Management Page ✓
- Remove debug/migration section entirely
- Complete UI redesign
- Mobile responsive layout

### 7. Upload Management Page ✓
- Mobile responsive
- Make "Send Reminders" functional
- Add assignment and "other resources" support
- Conditional weeks field visibility
- SQL update for resource types

### 8. Pin Management ✓
- Final UI polish

### 9. Settings Management ✓
- Remove debug button
- Mobile responsive

## Priority 2: School Branding

### 10. Header/Logo Integration ✓
- Fetch school info from settings
- Display school logo and name in header
- Replace "School SMS" throughout app

## Priority 3: Role-Based Dashboards

### 11. Principal Dashboard ✓
- Update menu to: Teachers, Students, Subject & Classes, Timetable, Exams, Marks Entry, Results, Comments, Uploads, Promotions, Pin Management, Settings, Audit Logs
- Add Principal Settings with personal info (KV store)

### 12. Student Dashboard ✓
- Add personal info in Settings (KV store)
- Remove exam questions from Learning Materials

### 13. IT Admin Dashboard ✓
- Students page: Fetch profiles + KV data + passwords
- Teachers page: Fetch profiles + KV data + passwords  
- New "Admins" menu
- Overview shows "Principal"

### 14. Finance Administrator Dashboard ✓ (NEW)
- Complete new dashboard
- Overview: Teachers, Students, Class, Timetable, Uploads, Results, Finance
- Show as "Director" in overview

## Priority 4: Authentication UI

### 15. Login Page ✓
- Remove demo users section
- Remove connection diagnostics button

## SQL Changes Needed

1. Upload types constraint - add "assignment" and "other_resources"
2. KV store structure for extended profiles

## Files to Modify

1. `/components/StudentsManager.tsx` - Mobile responsive + horizontal scroll
2. `/components/TeachersManager.tsx` - Remove debug, mobile responsive
3. `/components/academic/ExamsManager.tsx` - UI fixes, mobile responsive
4. `/components/marks/MarksModule.tsx` - Mobile responsive, tabs alignment
5. `/components/results/AdminResultManagement.tsx` - Mobile responsive
6. `/components/results/ReportCard.tsx` - Mobile responsive, PDF fixes
7. `/components/teacher/Comments.tsx` - Remove debug, redesign
8. `/components/uploads/UploadModule.tsx` - Send reminders, resource types
9. `/components/uploads/UploadForm.tsx` - Conditional weeks field
10. `/components/PinManagement.tsx` - UI polish
11. `/components/results/SettingsManagement.tsx` - Remove debug, mobile responsive
12. `/components/PrincipalSidebar.tsx` - Update menu items
13. `/components/student/StudentSettings.tsx` - Add extended fields (KV)
14. `/App.tsx` - Add Finance Admin dashboard, school branding
15. `/components/auth/LoginForm.tsx` - Remove demo/diagnostics
16. `/supabase/functions/server/index.tsx` - Backend updates for KV profiles, reminders, etc.

## Implementation Order

Phase 1: UI/Mobile Fixes (Items 1-9) - HIGH PRIORITY
Phase 2: School Branding (Item 10) - HIGH PRIORITY  
Phase 3: Dashboard Updates (Items 11-14) - MEDIUM PRIORITY
Phase 4: Auth UI (Item 15) - LOW PRIORITY
Phase 5: Backend/SQL (Throughout) - AS NEEDED

Let's execute!
