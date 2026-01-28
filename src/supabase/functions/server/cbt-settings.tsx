import { Hono } from 'npm:hono';
import { createClient } from 'jsr:@supabase/supabase-js@2';

const app = new Hono();

// Helper function to get authenticated user
async function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader?.startsWith('Bearer ')) {
    return { error: 'No authorization token provided', user: null };
  }

  const token = authHeader.substring(7);
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { error: 'Invalid or expired token', user: null };
  }

  return { error: null, user };
}

// Helper function to get user profile
async function getUserProfile(userId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  return profile;
}

// ================================================
// GET CBT SETTINGS
// ================================================
app.get('/make-server-1ddd013a/cbt/settings', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('cbt_settings')
      .select('*')
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
      console.error('Error fetching CBT settings:', error);
      return c.json({ error: 'Failed to fetch settings', details: error.message }, 500);
    }

    // If no settings exist, return defaults
    if (!data) {
      const defaultSettings = {
        allow_calculator: false,
        disable_copy_paste: true,
        disable_right_click: true,
        randomize_questions: true,
        randomize_options: true,
        show_results_after: true,
        time_limit_per_question: 0,
        allow_test_review: true,
        notify_teacher_on_completion: true,
        show_correct_answers: false,
        // Violation tracking defaults
        enable_violation_tracking: true,
        tab_switch_penalty_seconds: 120,
        fullscreen_exit_penalty_seconds: 180,
        max_violations_before_auto_submit: 5,
        exam_rules_text: `EXAM RULES AND REGULATIONS:

1. DO NOT switch tabs or open other applications during the exam.
2. DO NOT exit fullscreen mode once the exam has started.
3. DO NOT copy or paste any content during the exam.
4. Violations will result in automatic time penalties.
5. Excessive violations will result in automatic submission of your exam.

By starting this exam, you agree to abide by these rules.`
      };
      return c.json({ settings: defaultSettings });
    }

    return c.json({ settings: data });
  } catch (error: any) {
    console.error('Error in GET /cbt/settings:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// GET CBT SETTINGS (PUBLIC - for students before exam)
// ================================================
app.get('/make-server-1ddd013a/cbt/settings/public', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('cbt_settings')
      .select('enable_violation_tracking, tab_switch_penalty_seconds, fullscreen_exit_penalty_seconds, max_violations_before_auto_submit, exam_rules_text')
      .single();

    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching CBT settings:', error);
      return c.json({ error: 'Failed to fetch settings', details: error.message }, 500);
    }

    // Return defaults if no settings exist
    if (!data) {
      return c.json({ 
        settings: {
          enable_violation_tracking: true,
          tab_switch_penalty_seconds: 120,
          fullscreen_exit_penalty_seconds: 180,
          max_violations_before_auto_submit: 5,
          exam_rules_text: `EXAM RULES AND REGULATIONS:

1. DO NOT switch tabs or open other applications during the exam.
2. DO NOT exit fullscreen mode once the exam has started.
3. DO NOT copy or paste any content during the exam.
4. Violations will result in automatic time penalties.
5. Excessive violations will result in automatic submission of your exam.

By starting this exam, you agree to abide by these rules.`
        }
      });
    }

    return c.json({ settings: data });
  } catch (error: any) {
    console.error('Error in GET /cbt/settings/public:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// UPDATE CBT SETTINGS (Admin/Principal/IT_admin only)
// ================================================
app.put('/make-server-1ddd013a/cbt/settings', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    // Check if user is admin/principal/IT_admin
    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can update CBT settings' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await c.req.json();
    const {
      allow_calculator,
      disable_copy_paste,
      disable_right_click,
      randomize_questions,
      randomize_options,
      show_results_after,
      time_limit_per_question,
      allow_test_review,
      notify_teacher_on_completion,
      show_correct_answers,
      // Violation tracking fields
      enable_violation_tracking,
      tab_switch_penalty_seconds,
      fullscreen_exit_penalty_seconds,
      max_violations_before_auto_submit,
      exam_rules_text
    } = body;

    const settingsData = {
      allow_calculator: allow_calculator ?? false,
      disable_copy_paste: disable_copy_paste ?? true,
      disable_right_click: disable_right_click ?? true,
      randomize_questions: randomize_questions ?? true,
      randomize_options: randomize_options ?? true,
      show_results_after: show_results_after ?? true,
      time_limit_per_question: time_limit_per_question ?? 0,
      allow_test_review: allow_test_review ?? true,
      notify_teacher_on_completion: notify_teacher_on_completion ?? true,
      show_correct_answers: show_correct_answers ?? false,
      // Violation tracking fields
      enable_violation_tracking: enable_violation_tracking ?? true,
      tab_switch_penalty_seconds: tab_switch_penalty_seconds ?? 120,
      fullscreen_exit_penalty_seconds: fullscreen_exit_penalty_seconds ?? 180,
      max_violations_before_auto_submit: max_violations_before_auto_submit ?? 5,
      exam_rules_text: exam_rules_text ?? `EXAM RULES AND REGULATIONS:

1. DO NOT switch tabs or open other applications during the exam.
2. DO NOT exit fullscreen mode once the exam has started.
3. DO NOT copy or paste any content during the exam.
4. Violations will result in automatic time penalties.
5. Excessive violations will result in automatic submission of your exam.

By starting this exam, you agree to abide by these rules.`,
      updated_at: new Date().toISOString()
    };

    // Check if settings exist
    const { data: existing } = await supabase
      .from('cbt_settings')
      .select('id')
      .single();

    let data, error;

    if (existing) {
      // Update existing settings
      const result = await supabase
        .from('cbt_settings')
        .update(settingsData)
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Insert new settings
      const result = await supabase
        .from('cbt_settings')
        .insert([settingsData])
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error saving CBT settings:', error);
      return c.json({ error: 'Failed to save settings', details: error.message }, 500);
    }

    return c.json({ settings: data, message: 'CBT settings saved successfully' });
  } catch (error: any) {
    console.error('Error in PUT /cbt/settings:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// GET AVAILABLE CBT SESSIONS (Subject+Class+Term combinations from questions)
// ================================================
app.get('/make-server-1ddd013a/cbt/sessions/available', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can view CBT sessions' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get active session and term from database
    const { data: activeSessionData } = await supabase
      .from('academic_sessions')
      .select('session_name')
      .eq('is_current', true)
      .single();

    const { data: activeTermData } = await supabase
      .from('academic_terms')
      .select('term_name')
      .eq('is_current', true)
      .single();

    const activeSession = activeSessionData?.session_name || null;
    const activeTerm = activeTermData?.term_name || null;

    console.log('[CBT Sessions] Active session:', activeSession, 'Active term:', activeTerm);

    // Build query for published questions, filtering by active session/term if available
    let questionsQuery = supabase
      .from('cbt_questions')
      .select('subject, class, session, term, id, status')
      .eq('status', 'published');

    // Only filter by session/term if they exist and are set
    if (activeSession) {
      questionsQuery = questionsQuery.eq('session', activeSession);
    }
    if (activeTerm) {
      questionsQuery = questionsQuery.eq('term', activeTerm);
    }

    const { data: questions, error } = await questionsQuery;

    if (error) {
      console.error('Error fetching questions:', error);
      return c.json({ error: 'Failed to fetch questions', details: error.message }, 500);
    }

    console.log('[CBT Sessions] Fetched', questions?.length || 0, 'questions for active session/term');

    // Group questions by subject, class, session, term
    const grouped = new Map<string, any>();
    
    questions?.forEach(q => {
      const key = `${q.subject}|${q.class}|${q.session || 'N/A'}|${q.term || 'N/A'}`;
      
      if (!grouped.has(key)) {
        grouped.set(key, {
          subject: q.subject,
          class: q.class,
          session: q.session || null,
          term: q.term || null,
          question_count: 0,
          question_ids: []
        });
      }
      
      const group = grouped.get(key);
      group.question_count++;
      group.question_ids.push(q.id);
    });

    // Convert to array
    const sessions = Array.from(grouped.values());

    // Get existing CBT schedules
    const { data: schedules } = await supabase
      .from('cbt_schedules')
      .select('*');

    // Merge with schedules
    const sessionsWithSchedules = sessions.map(session => {
      const schedule = schedules?.find(s => 
        s.subject === session.subject &&
        s.class === session.class &&
        s.session === session.session &&
        s.term === session.term
      );

      return {
        ...session,
        schedule: schedule || null,
        is_enabled: schedule?.is_enabled || false,
        start_date: schedule?.start_date || null,
        end_date: schedule?.end_date || null,
        start_time: schedule?.start_time || null,
        duration_minutes: schedule?.duration_minutes || null
      };
    });

    console.log('[CBT Sessions] Returning', sessionsWithSchedules.length, 'sessions');

    return c.json({ 
      sessions: sessionsWithSchedules, 
      count: sessionsWithSchedules.length,
      activeSession,
      activeTerm
    });
  } catch (error: any) {
    console.error('Error in GET /cbt/sessions/available:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// VIEW QUESTIONS BY IDS (Admin)
// ================================================
app.post('/make-server-1ddd013a/cbt/admin/view-questions', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can view questions' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await c.req.json();
    const { questionIds } = body;

    if (!questionIds || !Array.isArray(questionIds) || questionIds.length === 0) {
      return c.json({ success: true, questions: [] });
    }

    // Fetch questions by IDs
    const { data: questions, error } = await supabase
      .from('cbt_questions')
      .select('*')
      .in('id', questionIds)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching questions:', error);
      return c.json({ error: 'Failed to fetch questions', details: error.message }, 500);
    }

    return c.json({ success: true, questions: questions || [] });
  } catch (error: any) {
    console.error('Error in POST /cbt/admin/view-questions:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// ENABLE/SCHEDULE CBT SESSION
// ================================================
app.post('/make-server-1ddd013a/cbt/sessions/schedule', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can schedule CBT sessions' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await c.req.json();
    const {
      subject,
      class: classParam,
      session,
      term,
      is_enabled,
      start_date,
      end_date,
      start_time,
      duration_minutes,
      allow_retake
    } = body;

    // Validate required fields
    if (!subject || !classParam) {
      return c.json({ error: 'Subject and class are required' }, 400);
    }

    // Check if schedule already exists
    let query = supabase
      .from('cbt_schedules')
      .select('*')
      .eq('subject', subject)
      .eq('class', classParam);

    if (session) query = query.eq('session', session);
    else query = query.is('session', null);

    if (term) query = query.eq('term', term);
    else query = query.is('term', null);

    const { data: existing } = await query.single();

    const scheduleData = {
      subject,
      class: classParam,
      session: session || null,
      term: term || null,
      is_enabled: is_enabled ?? true,
      start_date: start_date || null,
      end_date: end_date || null,
      start_time: start_time || null,
      duration_minutes: duration_minutes || 60,
      updated_by: user.id,
      updated_at: new Date().toISOString()
    };

    let data, error;

    if (existing) {
      // Update existing schedule
      const result = await supabase
        .from('cbt_schedules')
        .update(scheduleData)
        .eq('id', existing.id)
        .select()
        .single();
      data = result.data;
      error = result.error;
    } else {
      // Create new schedule
      const result = await supabase
        .from('cbt_schedules')
        .insert([{ ...scheduleData, created_by: user.id }])
        .select()
        .single();
      data = result.data;
      error = result.error;
    }

    if (error) {
      console.error('Error saving CBT schedule:', error);
      return c.json({ error: 'Failed to save schedule', details: error.message }, 500);
    }

    // ✅ CREATE OR UPDATE CBT_EXAMS ENTRY
    // When a schedule is enabled, create an exam entry for students to see
    if (data && is_enabled) {
      console.log('[CBT Settings] Creating/updating cbt_exams entry for schedule:', data);

      // Get questions for this session
      let questionsQuery = supabase
        .from('cbt_questions')
        .select('id, marks')
        .eq('subject', subject)
        .eq('class', classParam)
        .eq('status', 'published');

      // Filter by session if provided
      if (session) {
        questionsQuery = questionsQuery.eq('session', session);
      }

      // Filter by term if provided
      if (term) {
        questionsQuery = questionsQuery.eq('term', term);
      }

      const { data: questions } = await questionsQuery;

      console.log('[CBT Settings] 🔍 Questions query filters:', {
        subject,
        class: classParam,
        session: session || 'any',
        term: term || 'any',
        status: 'published',
        found: questions?.length || 0
      });

      if (questions && questions.length > 0) {
        const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 1), 0);
        
        // Calculate scheduled_start and scheduled_end
        // FIXED: Store as plain timestamp strings to avoid timezone conversion
        let scheduled_start = new Date().toISOString();
        let scheduled_end = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString();

        if (start_date) {
          // Extract just the date part in case it comes as ISO timestamp
          const dateOnly = start_date.split('T')[0];
          
          // Combine date and time as plain string: "2025-12-03 08:40:00"
          // Using space instead of 'T' and no timezone indicator
          // This tells PostgreSQL to store it as-is without timezone conversion
          if (start_time) {
            // start_time is already in HH:MM:SS or HH:MM format
            // Ensure it has seconds
            const timeParts = start_time.split(':');
            const formattedTime = timeParts.length === 2 
              ? `${start_time}:00` 
              : start_time;
            scheduled_start = `${dateOnly} ${formattedTime}`;
          } else {
            scheduled_start = `${dateOnly} 00:00:00`;
          }
          console.log('[CBT Settings] 📅 Scheduling exam at:', {
            input_date: start_date,
            input_time: start_time,
            stored_datetime: scheduled_start
          });
        }

        if (end_date) {
          // Extract just the date part in case it comes as ISO timestamp
          const dateOnly = end_date.split('T')[0];
          // Same format for end date
          scheduled_end = `${dateOnly} 23:59:59`;
        }

        // Check if exam already exists for this schedule
        const { data: existingExam } = await supabase
          .from('cbt_exams')
          .select('id')
          .eq('subject', subject)
          .eq('class', classParam)
          .eq('session', session || null)
          .eq('term', term || null)
          .maybeSingle();

        const examData = {
          title: `${subject} - ${classParam}${term ? ` (${term})` : ''}`,
          subject,
          class: classParam,
          session: session || null,
          term: term || null,
          instructions: 'Answer all questions within the time limit.',
          exam_type: 'formal',
          duration_minutes: duration_minutes || 60,
          total_marks: totalMarks,
          pass_mark: Math.floor(totalMarks * 0.5), // 50% pass mark
          scheduled_start,
          scheduled_end,
          status: 'scheduled',
          settings: {
            randomize_questions: true,
            randomize_options: true,
            show_results_after: true,
            allow_review: true,
            allow_retake: allow_retake || false  // NEW: Enable retakes if requested
          },
          updated_at: new Date().toISOString()
        };

        if (existingExam) {
          // Update existing exam
          const { error: examError } = await supabase
            .from('cbt_exams')
            .update(examData)
            .eq('id', existingExam.id);

          if (examError) {
            console.error('[CBT Settings] Error updating cbt_exams:', examError);
          } else {
            console.log('[CBT Settings] ✅ Updated cbt_exams entry:', existingExam.id);

            // Link questions to exam
            const { error: linkError } = await supabase
              .from('cbt_exam_questions')
              .delete()
              .eq('exam_id', existingExam.id);

            const examQuestions = questions.map((q, index) => ({
              exam_id: existingExam.id,
              question_id: q.id,
              question_order: index + 1,
              marks: q.marks || 1,
              section: 'main'
            }));

            await supabase
              .from('cbt_exam_questions')
              .insert(examQuestions);
          }
        } else {
          // Create new exam
          const { data: newExam, error: examError } = await supabase
            .from('cbt_exams')
            .insert([{ ...examData, created_by: user.id }])
            .select('id')
            .single();

          if (examError) {
            console.error('[CBT Settings] Error creating cbt_exams:', examError);
          } else if (newExam) {
            console.log('[CBT Settings] ✅ Created cbt_exams entry:', newExam.id);

            // Link questions to exam
            const examQuestions = questions.map((q, index) => ({
              exam_id: newExam.id,
              question_id: q.id,
              question_order: index + 1,
              marks: q.marks || 1,
              section: 'main'
            }));

            await supabase
              .from('cbt_exam_questions')
              .insert(examQuestions);
          }
        }
      }
    } else if (data && !is_enabled) {
      // If schedule is disabled, update exam status to 'disabled'
      console.log('[CBT Settings] Disabling cbt_exams entry for schedule');
      
      await supabase
        .from('cbt_exams')
        .update({ status: 'disabled', updated_at: new Date().toISOString() })
        .eq('subject', subject)
        .eq('class', classParam)
        .eq('session', session || null)
        .eq('term', term || null);
    }

    return c.json({ schedule: data, message: 'CBT session scheduled successfully' });
  } catch (error: any) {
    console.error('Error in POST /cbt/sessions/schedule:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// DELETE CBT SCHEDULE
// ================================================
app.delete('/make-server-1ddd013a/cbt/sessions/schedule/:id', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can delete CBT schedules' }, 403);
    }

    const scheduleId = c.req.param('id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { error } = await supabase
      .from('cbt_schedules')
      .delete()
      .eq('id', scheduleId);

    if (error) {
      console.error('Error deleting CBT schedule:', error);
      return c.json({ error: 'Failed to delete schedule', details: error.message }, 500);
    }

    return c.json({ message: 'CBT schedule deleted successfully' });
  } catch (error: any) {
    console.error('Error in DELETE /cbt/sessions/schedule/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// DELETE CBT SCHEDULE BY SUBJECT/CLASS/SESSION/TERM
// ================================================
app.post('/make-server-1ddd013a/cbt/sessions/delete', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can delete CBT schedules' }, 403);
    }

    const { subject, class: className, session, term } = await c.req.json();

    if (!subject || !className) {
      return c.json({ error: 'Subject and class are required' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Build the delete query
    let query = supabase
      .from('cbt_schedules')
      .delete()
      .eq('subject', subject)
      .eq('class', className);

    if (session) {
      query = query.eq('session', session);
    } else {
      query = query.is('session', null);
    }

    if (term) {
      query = query.eq('term', term);
    } else {
      query = query.is('term', null);
    }

    const { error } = await query;

    if (error) {
      console.error('Error deleting CBT schedule:', error);
      return c.json({ error: 'Failed to delete schedule', details: error.message }, 500);
    }

    return c.json({ message: 'CBT schedule deleted successfully' });
  } catch (error: any) {
    console.error('Error in POST /cbt/sessions/delete:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

export default app;