# Student Data Flow Diagram

## Student Lifecycle & Data Persistence

```
┌─────────────────────────────────────────────────────────────────┐
│                        STUDENT JOINS SCHOOL                      │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   PROFILES TABLE       │
                    │  ─────────────────     │
                    │  id: UUID (permanent)  │
                    │  first_name: "John"    │
                    │  last_name: "Doe"      │
                    │  class_id: JS1         │◄───── CURRENT CLASS
                    │  role: "student"       │
                    └────────────────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
                  ▼              ▼              ▼
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │ STUDENT_SUBJECTS │ │    MARKS     │ │   ATTENDANCE     │
    │ ────────────────│ │ ────────────│ │ ────────────────│
    │ student_id: UUID │ │ student_id  │ │ student_id: UUID │
    │ class_id: JS1    │ │ class_id:JS1│ │ date: 2024-01-15 │
    │ subject_id: Math │ │ exam_id     │ │ status: present  │
    │ session: 2024/25 │ │ subject: Eng│ │                  │
    │ status: active   │ │ midterm: 75 │ │                  │
    └──────────────────┘ └──────────────┘ └──────────────────┘
         ENROLLMENT         ACHIEVEMENT        DAILY RECORD
       (TEMPORARY)          (PERMANENT)         (PERMANENT)


═══════════════════════════════════════════════════════════════════
                         STUDENT PROMOTED
═══════════════════════════════════════════════════════════════════
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   PROFILES TABLE       │
                    │  ─────────────────     │
                    │  id: UUID (same)       │
                    │  first_name: "John"    │◄───── CAN CHANGE
                    │  last_name: "Smith"    │◄───── CAN CHANGE
                    │  class_id: JS2         │◄───── UPDATED!
                    │  role: "student"       │
                    └────────────────────────┘
                                 │
                  ┌──────────────┼──────────────┐
                  │              │              │
                  ▼              ▼              ▼
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
    │ STUDENT_SUBJECTS │ │    MARKS     │ │   ATTENDANCE     │
    │ ────────────────│ │ ────────────│ │ ────────────────│
    │ [OLD DELETED]    │ │ class_id:JS1│ │ [ALL PRESERVED]  │
    │                  │ │ exam: 2024  │ │                  │
    │ [NEW CREATED]    │ │ midterm: 75 │ │                  │
    │ student_id: UUID │ │             │ │                  │
    │ class_id: JS2    │ │ class_id:JS2│ │                  │
    │ subject_id: Math │ │ exam: 2025  │ │                  │
    │ session: 2025/26 │ │ midterm: 82 │ │                  │
    └──────────────────┘ └──────────────┘ └──────────────────┘
      🧹 AUTO-CLEANUP      ✅ BOTH KEPT      ✅ ALL KEPT
      Old JS1 deleted      JS1 + JS2 kept    All preserved


═══════════════════════════════════════════════════════════════════
                         STUDENT GRADUATED
═══════════════════════════════════════════════════════════════════
                                 │
                                 ▼
                    ┌────────────────────────┐
                    │   PROFILES TABLE       │
                    │  ─────────────────     │
                    │  id: UUID (same)       │
                    │  first_name: "John"    │
                    │  last_name: "Smith"    │
                    │  class_id: NULL        │◄───── CLEARED
                    │  role: "student"       │
                    │  is_graduated: true    │◄───── FLAGGED
                    └────────────────────────┘
                                 │
                  ┌──────────────┼──────────────┬──────────────┐
                  │              │              │              │
                  ▼              ▼              ▼              ▼
    ┌──────────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
    │ STUDENT_SUBJECTS │ │    MARKS     │ │  ATTENDANCE  │ │  GRADUATED   │
    │ ────────────────│ │ ────────────│ │ ────────────│ │   STUDENTS   │
    │ [ALL DELETED]    │ │ [ALL KEPT]   │ │ [ALL KEPT]   │ │ ────────────│
    │                  │ │              │ │              │ │ student_id   │
    │ 🧹 AUTO-CLEANUP  │ │ JS1: 75      │ │ All records  │ │ adm_number   │
    │                  │ │ JS2: 82      │ │ preserved    │ │ graduation   │
    │                  │ │ JS3: 88      │ │              │ │ session      │
    └──────────────────┘ └──────────────┘ └──────────────┘ │ class: JS3   │
                           ✅ TRANSCRIPT                    └──────────────┘
                              READY!                        ✅ ALUMNI DATA


═══════════════════════════════════════════════════════════════════
                      MARKS ENTRY - WHO APPEARS?
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  SCENARIO 1: Enter NEW marks for JS2 (Current Session)          │
└─────────────────────────────────────────────────────────────────┘

                    Query: profiles.class_id = 'JS2'
                                    │
                    ┌───────────────┴────────────────┐
                    │                                │
                    ▼                                ▼
            ✅ Mary (JS2)                    ❌ John (JS3)
            Currently in JS2                 Promoted to JS3
            → APPEARS IN LIST                → NOT IN LIST


┌─────────────────────────────────────────────────────────────────┐
│  SCENARIO 2: Edit OLD marks for JS2 (Previous Session)          │
└─────────────────────────────────────────────────────────────────┘

        Query: profiles.class_id = 'JS2'  UNION
               marks.class_id = 'JS2' AND exam_id = 'old-exam'
                                    │
        ┌───────────────────────────┼────────────────────────┐
        │                           │                        │
        ▼                           ▼                        ▼
    ✅ Mary (JS2)           ✅ John (JS3)            ❌ Sarah (JS1)
    Current JS2             Was JS2 in old exam      Never in JS2
    → APPEARS               → APPEARS (historical)   → NOT IN LIST


═══════════════════════════════════════════════════════════════════
                      RESULT VIEWING - WHAT SHOWS?
═══════════════════════════════════════════════════════════════════

┌─────────────────────────────────────────────────────────────────┐
│  View John's Results for 2024/2025 (when he was in JS2)         │
└─────────────────────────────────────────────────────────────────┘

        Query: student_id = 'john-uuid' AND
               exam.session = '2024/2025' AND
               exam.term = 'First Term'
                                    │
                                    ▼
                        ┌────────────────────┐
                        │  REPORT CARD       │
                        │  ──────────────    │
                        │  Name: John Smith  │◄──── CURRENT NAME
                        │  Class: JS2        │◄──── HISTORICAL CLASS
                        │  Session: 2024/25  │
                        │                    │
                        │  English: 75       │◄──── FROM marks TABLE
                        │  Maths: 82         │      class_id = JS2
                        │  Science: 78       │      exam.session = 2024/25
                        └────────────────────┘

✅ Shows CURRENT name (from profiles)
✅ Shows HISTORICAL class (from marks.class_id)
✅ Shows ALL marks from that session (preserved forever)


═══════════════════════════════════════════════════════════════════
                         DATA INTEGRITY RULES
═══════════════════════════════════════════════════════════════════

1. ✅ ALL relationships use UUID foreign keys (never names)
   profiles.id ──┬─► marks.student_id
                 ├─► attendance.student_id
                 ├─► student_subjects.student_id
                 └─► cbt_results.student_id

2. ✅ Historical data uses SNAPSHOT class_id
   marks.class_id = class at time of entry (never updated)
   profiles.class_id = current class (updated on promotion)

3. ✅ Current enrollment uses LIVE class_id
   student_subjects.class_id = current class (deleted on promotion)

4. ✅ Name changes update profiles ONLY
   marks table doesn't store names
   Report cards fetch current name on-the-fly

5. ✅ Automatic cleanup on state changes
   Promotion → Delete old student_subjects
   Graduation → Delete all student_subjects
   Deletion → Cascade delete all related data


═══════════════════════════════════════════════════════════════════
                            KEY TAKEAWAY
═══════════════════════════════════════════════════════════════════

    student_subjects = CURRENT ENROLLMENT (temporary)
           marks = HISTORICAL ACHIEVEMENT (permanent)
      profiles.class_id = CURRENT CLASS (changes)
        marks.class_id = HISTORICAL CLASS (frozen)

                    PERFECT SEPARATION! ✅
```
