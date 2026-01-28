import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

// Helper to extract base class name (e.g., "SS1 - Diamond" → "SS1", "jss2" → "JSS2")
function extractBaseClassName(fullClassName: string): string {
  if (!fullClassName) return '';
  
  // Remove section suffix (everything after " - ")
  const baseName = fullClassName.split(' - ')[0].trim();
  
  // Normalize: Convert to uppercase
  return baseName.toUpperCase();
}

// Helper to get authenticated user
async function getAuthUser(c: any) {
  const authHeader = c.req.header('Authorization');
  if (!authHeader) {
    return { error: 'No authorization header', user: null };
  }

  const token = authHeader.replace('Bearer ', '');
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_ANON_KEY') ?? ''
  );

  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) {
    return { error: 'Unauthorized', user: null };
  }

  return { error: null, user };
}

// Helper to get user profile
async function getUserProfile(userId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

// ================================================
// GET ALL QUESTIONS (for authenticated teacher)
// ================================================
app.get('/make-server-1ddd013a/cbt/questions', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    // Get profile to check role and qualified subjects
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get query parameters for filtering
    const url = new URL(c.req.url);
    const subject = url.searchParams.get('subject');
    const classParam = url.searchParams.get('class');
    const status = url.searchParams.get('status');
    const topic = url.searchParams.get('topic');
    const search = url.searchParams.get('search');
    const session = url.searchParams.get('session');
    const term = url.searchParams.get('term');

    let query = supabase
      .from('cbt_questions')
      .select('*')
      .order('created_at', { ascending: true }); // ✅ Changed to ascending - oldest first (Q1, Q2, Q3...)

    // Teachers see only their questions, admins see all
    if (profile.role === 'teacher') {
      query = query.eq('teacher_id', user.id);
    }

    // Apply filters
    if (subject) query = query.eq('subject', subject);
    if (classParam) query = query.eq('class', classParam);
    if (status) query = query.eq('status', status);
    if (topic) query = query.ilike('topic', `%${topic}%`);
    if (search) query = query.ilike('question_text', `%${search}%`);
    if (session) query = query.eq('session', session);
    if (term) query = query.eq('term', term);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      return c.json({ error: 'Failed to fetch questions', details: error.message }, 500);
    }

    return c.json({ questions: data || [], count: data?.length || 0 });
  } catch (error) {
    console.error('Error in GET /cbt/questions:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// GET SINGLE QUESTION
// ================================================
app.get('/make-server-1ddd013a/cbt/questions/:id', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const questionId = c.req.param('id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { data, error } = await supabase
      .from('cbt_questions')
      .select('*')
      .eq('id', questionId)
      .single();

    if (error) {
      console.error('Error fetching question:', error);
      return c.json({ error: 'Question not found', details: error.message }, 404);
    }

    return c.json({ question: data });
  } catch (error) {
    console.error('Error in GET /cbt/questions/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// CREATE QUESTION
// ================================================
app.post('/make-server-1ddd013a/cbt/questions', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    // Get profile to verify teacher role and qualified subjects
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    if (profile.role !== 'teacher' && !['admin', 'principal', 'IT_admin'].includes(profile.role)) {
      return c.json({ error: 'Only teachers can create questions' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await c.req.json();
    const {
      subject,
      class: classParam,
      topic,
      difficulty,
      question_type,
      question_text,
      question_image_url,
      options,
      correct_answer,
      explanation,
      marks,
      tags,
      status,
      session,
      term
    } = body;

    // Validate required fields
    if (!subject || !classParam || !question_type || !question_text || !correct_answer) {
      return c.json({ error: 'Missing required fields' }, 400);
    }

    // Verify teacher is assigned to this subject (same as marks module)
    if (profile.role === 'teacher') {
      // 🔥 FIX: Check subject_assignments table, and check if teacher teaches ANY section of the base class
      // Example: Teacher teaches "SS3 Silver", question is for "SS3" → Should be allowed
      
      // Step 1: Check if teacher is assigned to this subject
      const { data: assignments, error: assignError } = await supabase
        .from('subject_assignments')
        .select(`
          subject_id,
          subjects!inner(name),
          class_id,
          classes!inner(name)
        `)
        .eq('teacher_id', user.id);

      if (assignError) {
        console.error('[CBT] Error checking teacher assignments:', assignError);
        return c.json({ error: 'Failed to verify teacher qualification' }, 500);
      }

      console.log('[CBT] Teacher assignments:', assignments);

      // Step 2: Check if teacher teaches this subject
      const teachesSubject = assignments?.some((a: any) => a.subjects?.name === subject);
      
      if (!teachesSubject) {
        const assignedSubjects = [...new Set(assignments?.map((a: any) => a.subjects?.name) || [])];
        return c.json({ 
          error: 'You are not assigned to teach this subject',
          assigned_subjects: assignedSubjects
        }, 403);
      }

      // Step 3: Check if teacher teaches ANY section of the specified base class
      // classParam is the base class name (e.g., "SS3")
      const baseClassName = extractBaseClassName(classParam);
      const teachesClass = assignments?.some((a: any) => 
        a.subjects?.name === subject && 
        extractBaseClassName(a.classes?.name) === baseClassName // Match base class name
      );

      if (!teachesClass) {
        const assignedClasses = [...new Set(
          assignments
            ?.filter((a: any) => a.subjects?.name === subject)
            .map((a: any) => a.classes?.name) || []
        )];
        return c.json({ 
          error: `You are not assigned to teach ${subject} for ${classParam}`,
          assigned_classes_for_subject: assignedClasses
        }, 403);
      }

      console.log(`[CBT] ✅ Validation passed: Teacher teaches ${subject} for ${classParam}`);
    }

    const questionData = {
      teacher_id: user.id,
      teacher_name: profile.full_name || profile.name,
      subject,
      class: classParam,
      topic: topic || null,
      difficulty: difficulty || 'medium',
      question_type,
      question_text,
      question_image_url: question_image_url || null,
      options: options || null,
      correct_answer,
      explanation: explanation || null,
      marks: marks || 1,
      tags: tags || [],
      status: status || 'draft',
      session: session || null,
      term: term || null
    };

    const { data, error } = await supabase
      .from('cbt_questions')
      .insert([questionData])
      .select()
      .single();

    if (error) {
      console.error('Error creating question:', error);
      return c.json({ error: 'Failed to create question', details: error.message }, 500);
    }

    return c.json({ question: data, message: 'Question created successfully' }, 201);
  } catch (error) {
    console.error('Error in POST /cbt/questions:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// UPDATE QUESTION
// ================================================
app.put('/make-server-1ddd013a/cbt/questions/:id', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const questionId = c.req.param('id');
    const body = await c.req.json();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify ownership
    const { data: existing } = await supabase
      .from('cbt_questions')
      .select('teacher_id')
      .eq('id', questionId)
      .single();

    if (!existing) {
      return c.json({ error: 'Question not found' }, 404);
    }

    const profile = await getUserProfile(user.id);
    if (existing.teacher_id !== user.id && !['admin', 'principal', 'IT_admin'].includes(profile?.role)) {
      return c.json({ error: 'You can only update your own questions' }, 403);
    }

    // Remove fields that shouldn't be updated directly
    const { teacher_id, teacher_name, created_at, ...updateData } = body;

    const { data, error } = await supabase
      .from('cbt_questions')
      .update({ ...updateData, updated_at: new Date().toISOString() })
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating question:', error);
      return c.json({ error: 'Failed to update question', details: error.message }, 500);
    }

    return c.json({ question: data, message: 'Question updated successfully' });
  } catch (error) {
    console.error('Error in PUT /cbt/questions/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// DELETE QUESTION
// ================================================
app.delete('/make-server-1ddd013a/cbt/questions/:id', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const questionId = c.req.param('id');

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify ownership
    const { data: existing } = await supabase
      .from('cbt_questions')
      .select('teacher_id, usage_count')
      .eq('id', questionId)
      .single();

    if (!existing) {
      return c.json({ error: 'Question not found' }, 404);
    }

    const profile = await getUserProfile(user.id);
    if (existing.teacher_id !== user.id && !['admin', 'principal', 'IT_admin'].includes(profile?.role)) {
      return c.json({ error: 'You can only delete your own questions' }, 403);
    }

    // Check if question is used in any exams
    if (existing.usage_count && existing.usage_count > 0) {
      return c.json({ 
        error: 'Cannot delete question that has been used in exams. Archive it instead.',
        usage_count: existing.usage_count 
      }, 400);
    }

    // STEP 1: Delete from cbt_exam_questions first (cascade delete from admin schedules)
    console.log('[CBT Delete Question] Removing question from exam schedules...');
    const { data: examQuestionsDeleted, error: examDeleteError } = await supabase
      .from('cbt_exam_questions')
      .delete()
      .eq('question_id', questionId)
      .select('exam_id');

    if (examDeleteError) {
      console.error('[CBT Delete Question] Error deleting from exam schedules:', examDeleteError);
      return c.json({ error: 'Failed to remove question from exam schedules', details: examDeleteError.message }, 500);
    }

    const deletedFromExams = examQuestionsDeleted?.length || 0;
    if (deletedFromExams > 0) {
      console.log(`[CBT Delete Question] ✅ Removed from ${deletedFromExams} exam schedule(s)`);
    }

    // STEP 2: Delete from cbt_questions
    const { error } = await supabase
      .from('cbt_questions')
      .delete()
      .eq('id', questionId);

    if (error) {
      console.error('Error deleting question:', error);
      return c.json({ error: 'Failed to delete question', details: error.message }, 500);
    }

    return c.json({ 
      message: `Question deleted successfully${deletedFromExams > 0 ? ` and removed from ${deletedFromExams} exam schedule(s)` : ''}`,
      removedFromExams: deletedFromExams
    });
  } catch (error) {
    console.error('Error in DELETE /cbt/questions/:id:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// DELETE ENTIRE QUESTION BANK (all questions for subject/class/session/term)
// ================================================
app.delete('/make-server-1ddd013a/cbt/questions/bank/:subject/:class/:session/:term', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const subject = decodeURIComponent(c.req.param('subject'));
    const classParam = decodeURIComponent(c.req.param('class'));
    const session = decodeURIComponent(c.req.param('session'));
    const term = decodeURIComponent(c.req.param('term'));

    console.log('[CBT Delete Bank] Deleting question bank:', { subject, class: classParam, session, term, userId: user.id });

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get profile to check role
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Build query
    let query = supabase
      .from('cbt_questions')
      .select('id, teacher_id, usage_count')
      .eq('subject', subject)
      .eq('class', classParam);

    // Add optional filters
    if (session && session !== 'No Session') {
      query = query.eq('session', session);
    }
    if (term && term !== 'No Term') {
      query = query.eq('term', term);
    }

    // Filter by teacher (unless admin)
    if (!['admin', 'principal', 'IT_admin'].includes(profile.role)) {
      query = query.eq('teacher_id', user.id);
    }

    const { data: questions, error: fetchError } = await query;

    if (fetchError) {
      console.error('[CBT Delete Bank] Error fetching questions:', fetchError);
      return c.json({ error: 'Failed to fetch questions', details: fetchError.message }, 500);
    }

    if (!questions || questions.length === 0) {
      return c.json({ error: 'No questions found to delete' }, 404);
    }

    // Check if any questions are used in exams
    const usedQuestions = questions.filter(q => q.usage_count && q.usage_count > 0);
    if (usedQuestions.length > 0) {
      return c.json({ 
        error: `Cannot delete ${usedQuestions.length} question(s) that have been used in exams. Please archive them instead.`,
        usedCount: usedQuestions.length,
        totalCount: questions.length
      }, 400);
    }

    // Check ownership (unless admin)
    if (!['admin', 'principal', 'IT_admin'].includes(profile.role)) {
      const unauthorizedQuestions = questions.filter(q => q.teacher_id !== user.id);
      if (unauthorizedQuestions.length > 0) {
        return c.json({ 
          error: 'You can only delete your own questions',
          unauthorizedCount: unauthorizedQuestions.length 
        }, 403);
      }
    }

    // Delete all questions
    const questionIds = questions.map(q => q.id);
    
    // STEP 1: Delete from cbt_exam_questions first (cascade delete from admin schedules)
    console.log('[CBT Delete Bank] Removing questions from exam schedules...');
    const { data: examQuestionsDeleted, error: examDeleteError } = await supabase
      .from('cbt_exam_questions')
      .delete()
      .in('question_id', questionIds)
      .select('exam_id');

    if (examDeleteError) {
      console.error('[CBT Delete Bank] Error deleting from exam schedules:', examDeleteError);
      return c.json({ error: 'Failed to remove questions from exam schedules', details: examDeleteError.message }, 500);
    }

    const deletedFromExams = examQuestionsDeleted?.length || 0;
    const affectedExamIds = [...new Set(examQuestionsDeleted?.map(eq => eq.exam_id) || [])];
    console.log(`[CBT Delete Bank] ✅ Removed ${deletedFromExams} question link(s) from exam schedules`);
    console.log(`[CBT Delete Bank] Affected exam IDs:`, affectedExamIds);

    // STEP 1.5: Delete student attempts for affected exams
    if (affectedExamIds.length > 0) {
      console.log('[CBT Delete Bank] Deleting student attempts for affected exams...');
      
      // First, get all attempt IDs for these exams
      const { data: attemptData, error: fetchAttemptsError } = await supabase
        .from('cbt_student_attempts')
        .select('id')
        .in('exam_id', affectedExamIds);
      
      if (fetchAttemptsError) {
        console.warn('[CBT Delete Bank] Warning: Could not fetch student attempts:', fetchAttemptsError);
      }
      
      const attemptIds = attemptData?.map(a => a.id) || [];
      console.log(`[CBT Delete Bank] Found ${attemptIds.length} attempt(s) to delete`);
      
      // Delete student answers for these attempts
      if (attemptIds.length > 0) {
        const { error: answersDeleteError } = await supabase
          .from('cbt_student_answers')
          .delete()
          .in('attempt_id', attemptIds);
        
        if (answersDeleteError) {
          console.warn('[CBT Delete Bank] Warning: Could not delete student answers:', answersDeleteError);
        } else {
          console.log(`[CBT Delete Bank] ✅ Deleted student answers for ${attemptIds.length} attempt(s)`);
        }
      }
      
      // Delete student attempts
      const { data: deletedAttempts, error: attemptsDeleteError } = await supabase
        .from('cbt_student_attempts')
        .delete()
        .in('exam_id', affectedExamIds)
        .select('id');
      
      if (attemptsDeleteError) {
        console.warn('[CBT Delete Bank] Warning: Could not delete student attempts:', attemptsDeleteError);
      } else {
        console.log(`[CBT Delete Bank] ✅ Deleted ${deletedAttempts?.length || 0} student attempt(s)`);
      }
      
      // Delete exam schedules that have no questions left
      const { data: deletedSchedules, error: schedulesDeleteError } = await supabase
        .from('cbt_exams')  // ✅ FIXED: Use cbt_exams (NOT cbt_admin_exams)
        .delete()
        .in('id', affectedExamIds)
        .select('id');
      
      if (schedulesDeleteError) {
        console.warn('[CBT Delete Bank] Warning: Could not delete exam schedules:', schedulesDeleteError);
      } else {
        console.log(`[CBT Delete Bank] ✅ Deleted ${deletedSchedules?.length || 0} exam schedule(s)`);
      }
    }

    // STEP 1.6: ALSO delete exams matching subject/class/session/term (for direct teacher CBT exams)
    console.log('[CBT Delete Bank] Deleting exams matching subject/class/session/term...');
    
    let examQuery = supabase
      .from('cbt_exams')
      .select('id')
      .eq('subject', subject)
      .eq('class', classParam);
    
    if (session && session !== 'No Session') {
      examQuery = examQuery.eq('session', session);
    }
    if (term && term !== 'No Term') {
      examQuery = examQuery.eq('term', term);
    }
    
    const { data: matchingExams, error: examsFetchError } = await examQuery;
    
    if (!examsFetchError && matchingExams && matchingExams.length > 0) {
      const matchingExamIds = matchingExams.map(e => e.id);
      console.log(`[CBT Delete Bank] Found ${matchingExamIds.length} matching exam(s) to delete`);
      
      // Delete student answers first
      const { data: matchingAttempts } = await supabase
        .from('cbt_student_attempts')
        .select('id')
        .in('exam_id', matchingExamIds);
      
      const matchingAttemptIds = matchingAttempts?.map(a => a.id) || [];
      
      if (matchingAttemptIds.length > 0) {
        await supabase
          .from('cbt_student_answers')
          .delete()
          .in('attempt_id', matchingAttemptIds);
        console.log(`[CBT Delete Bank] ✅ Deleted student answers for ${matchingAttemptIds.length} matching attempt(s)`);
      }
      
      // Delete student attempts
      const { data: deletedMatchingAttempts } = await supabase
        .from('cbt_student_attempts')
        .delete()
        .in('exam_id', matchingExamIds)
        .select('id');
      console.log(`[CBT Delete Bank] ✅ Deleted ${deletedMatchingAttempts?.length || 0} matching student attempt(s)`);
      
      // Delete matching exams
      const { data: deletedMatchingExams } = await supabase
        .from('cbt_exams')
        .delete()
        .in('id', matchingExamIds)
        .select('id');
      console.log(`[CBT Delete Bank] ✅ Deleted ${deletedMatchingExams?.length || 0} matching exam(s)`);
    } else {
      console.log('[CBT Delete Bank] No matching exams found to delete');
    }

    // STEP 2: Delete from cbt_questions
    const { error: deleteError } = await supabase
      .from('cbt_questions')
      .delete()
      .in('id', questionIds);

    if (deleteError) {
      console.error('[CBT Delete Bank] Error deleting questions:', deleteError);
      return c.json({ error: 'Failed to delete questions', details: deleteError.message }, 500);
    }

    console.log(`[CBT Delete Bank] ✅ Deleted ${questions.length} questions from question bank`);
    return c.json({ 
      success: true,
      message: `Successfully deleted ${questions.length} question(s)${deletedFromExams > 0 ? ` and removed them from ${deletedFromExams} exam schedule(s)` : ''}`,
      deletedCount: questions.length,
      removedFromExams: deletedFromExams
    });
  } catch (error) {
    console.error('[CBT Delete Bank] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// GET GROUPED QUESTIONS (by subject, class, session, term)
// ================================================
app.get('/make-server-1ddd013a/cbt/questions-grouped', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    // Get profile to check role
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    let query = supabase
      .from('cbt_questions')
      .select('subject, class, session, term, status, marks');

    // Teachers see only their questions, admins see all
    if (profile.role === 'teacher') {
      query = query.eq('teacher_id', user.id);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching questions:', error);
      return c.json({ error: 'Failed to fetch questions', details: error.message }, 500);
    }

    // Group questions by subject, class, session, term
    const grouped: Record<string, any> = {};
    
    (data || []).forEach((q: any) => {
      const key = `${q.subject}|${q.class}|${q.session || 'No Session'}|${q.term || 'No Term'}`;
      if (!grouped[key]) {
        grouped[key] = {
          subject: q.subject,
          class: q.class,
          session: q.session || 'No Session',
          term: q.term || 'No Term',
          totalQuestions: 0,
          totalMarks: 0,
          publishedQuestions: 0,
          draftQuestions: 0,
        };
      }
      
      grouped[key].totalQuestions += 1;
      grouped[key].totalMarks += parseFloat(q.marks) || 0;
      
      if (q.status === 'published') {
        grouped[key].publishedQuestions += 1;
      } else if (q.status === 'draft') {
        grouped[key].draftQuestions += 1;
      }
    });

    const questionBanks = Object.values(grouped);

    return c.json({ questionBanks, count: questionBanks.length });
  } catch (error: any) {
    console.error('Error in GET /cbt/questions-grouped:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// GET QUESTION STATISTICS
// ================================================
app.get('/make-server-1ddd013a/cbt/questions/stats/summary', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get counts by status
    const { data: questions } = await supabase
      .from('cbt_questions')
      .select('status, subject, class, question_type')
      .eq('teacher_id', user.id);

    if (!questions) {
      return c.json({ stats: {} });
    }

    const stats = {
      total: questions.length,
      draft: questions.filter(q => q.status === 'draft').length,
      published: questions.filter(q => q.status === 'published').length,
      archived: questions.filter(q => q.status === 'archived').length,
      bySubject: {} as Record<string, number>,
      byClass: {} as Record<string, number>,
      byType: {} as Record<string, number>
    };

    // Count by subject
    questions.forEach(q => {
      stats.bySubject[q.subject] = (stats.bySubject[q.subject] || 0) + 1;
      stats.byClass[q.class] = (stats.byClass[q.class] || 0) + 1;
      stats.byType[q.question_type] = (stats.byType[q.question_type] || 0) + 1;
    });

    return c.json({ stats });
  } catch (error) {
    console.error('Error in GET /cbt/questions/stats/summary:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// UPLOAD QUESTION IMAGE
// ================================================
app.post('/make-server-1ddd013a/cbt/upload-question-image', async (c) => {
  try {
    console.log('[CBT Upload Image] Starting image upload...');
    
    // Get authenticated user
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      console.error('[CBT Upload Image] Auth error:', authError);
      return c.json({ success: false, error: authError || 'Unauthorized' }, 401);
    }

    // Get user profile
    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ success: false, error: 'Profile not found' }, 404);
    }

    // Only teachers and admins can upload question images
    const allowedRoles = ['teacher', 'principal', 'vice_principal', 'it_admin'];
    if (!allowedRoles.includes(profile.role)) {
      return c.json({ 
        success: false, 
        error: 'Only teachers and admins can upload question images' 
      }, 403);
    }

    // Parse multipart form data
    const formData = await c.req.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return c.json({ success: false, error: 'No file provided' }, 400);
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return c.json({ success: false, error: 'File must be an image' }, 400);
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      return c.json({ success: false, error: 'File size must be less than 5MB' }, 400);
    }

    // Create unique filename
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const bucketName = 'make-1ddd013a-cbt-questions';
    const filePath = `question-images/${fileName}`;

    // Upload to Supabase Storage using service role (bypasses RLS)
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Convert File to ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const uint8Array = new Uint8Array(arrayBuffer);

    const { data, error: uploadError } = await supabase.storage
      .from(bucketName)
      .upload(filePath, uint8Array, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('[CBT Upload Image] Upload error:', uploadError);
      return c.json({ 
        success: false, 
        error: `Upload failed: ${uploadError.message}` 
      }, 500);
    }

    // Get public URL
    const { data: { publicUrl } } = supabase.storage
      .from(bucketName)
      .getPublicUrl(filePath);

    console.log('[CBT Upload Image] ✅ Upload successful:', publicUrl);

    return c.json({
      success: true,
      url: publicUrl,
      message: 'Image uploaded successfully'
    });

  } catch (err: any) {
    console.error('[CBT Upload Image] Error:', err);
    return c.json({ 
      success: false, 
      error: `Server error: ${err.message}` 
    }, 500);
  }
});

// ================================================
// CLEANUP ORPHANED EXAMS (exams with no questions)
// ================================================
app.post('/make-server-1ddd013a/cbt/cleanup-orphaned-exams', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!profile) {
      return c.json({ error: 'Profile not found' }, 404);
    }

    // Only teachers and admins can run cleanup
    const allowedRoles = ['teacher', 'admin', 'principal', 'IT_admin'];
    if (!allowedRoles.includes(profile.role)) {
      return c.json({ error: 'Permission denied' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    console.log('[CBT Cleanup] Starting cleanup of orphaned exams...');

    // STEP 1: Get all exams
    const { data: allExams, error: examsError } = await supabase
      .from('cbt_exams')
      .select('id, subject, class, session, term, title');

    if (examsError) {
      console.error('[CBT Cleanup] Error fetching exams:', examsError);
      return c.json({ error: 'Failed to fetch exams', details: examsError.message }, 500);
    }

    if (!allExams || allExams.length === 0) {
      return c.json({ message: 'No exams found', orphanedCount: 0, deletedCount: 0 });
    }

    console.log(`[CBT Cleanup] Checking ${allExams.length} exam(s)...`);

    // STEP 2: For each exam, check if it has any questions in the question bank
    const orphanedExamIds = [];

    for (const exam of allExams) {
      // Check if there are any questions for this subject/class/session/term
      const { data: questions, error: questionsError } = await supabase
        .from('cbt_questions')
        .select('id')
        .eq('subject', exam.subject)
        .eq('class', exam.class)
        .eq('session', exam.session || '')
        .eq('term', exam.term || '')
        .limit(1);

      if (questionsError) {
        console.warn(`[CBT Cleanup] Error checking questions for exam ${exam.id}:`, questionsError);
        continue;
      }

      // If no questions found, this exam is orphaned
      if (!questions || questions.length === 0) {
        console.log(`[CBT Cleanup] Found orphaned exam: ${exam.title} (${exam.subject} - ${exam.class})`);
        orphanedExamIds.push(exam.id);
      }
    }

    console.log(`[CBT Cleanup] Found ${orphanedExamIds.length} orphaned exam(s)`);

    if (orphanedExamIds.length === 0) {
      return c.json({ 
        message: 'No orphaned exams found', 
        orphanedCount: 0, 
        deletedCount: 0 
      });
    }

    // STEP 3: Delete student answers for orphaned exams
    const { data: orphanedAttempts } = await supabase
      .from('cbt_student_attempts')
      .select('id')
      .in('exam_id', orphanedExamIds);

    const orphanedAttemptIds = orphanedAttempts?.map(a => a.id) || [];

    if (orphanedAttemptIds.length > 0) {
      const { error: answersDeleteError } = await supabase
        .from('cbt_student_answers')
        .delete()
        .in('attempt_id', orphanedAttemptIds);

      if (answersDeleteError) {
        console.warn('[CBT Cleanup] Warning: Could not delete student answers:', answersDeleteError);
      } else {
        console.log(`[CBT Cleanup] ✅ Deleted student answers for ${orphanedAttemptIds.length} orphaned attempt(s)`);
      }
    }

    // STEP 4: Delete student attempts for orphaned exams
    const { data: deletedAttempts, error: attemptsDeleteError } = await supabase
      .from('cbt_student_attempts')
      .delete()
      .in('exam_id', orphanedExamIds)
      .select('id');

    if (attemptsDeleteError) {
      console.warn('[CBT Cleanup] Warning: Could not delete student attempts:', attemptsDeleteError);
    } else {
      console.log(`[CBT Cleanup] ✅ Deleted ${deletedAttempts?.length || 0} orphaned student attempt(s)`);
    }

    // STEP 5: Delete orphaned exams
    const { data: deletedExams, error: examsDeleteError } = await supabase
      .from('cbt_exams')
      .delete()
      .in('id', orphanedExamIds)
      .select('id');

    if (examsDeleteError) {
      console.error('[CBT Cleanup] Error deleting orphaned exams:', examsDeleteError);
      return c.json({ error: 'Failed to delete orphaned exams', details: examsDeleteError.message }, 500);
    }

    console.log(`[CBT Cleanup] ✅ Deleted ${deletedExams?.length || 0} orphaned exam(s)`);

    return c.json({
      success: true,
      message: `Successfully cleaned up ${deletedExams?.length || 0} orphaned exam(s) and ${deletedAttempts?.length || 0} submission(s)`,
      orphanedCount: orphanedExamIds.length,
      deletedExams: deletedExams?.length || 0,
      deletedAttempts: deletedAttempts?.length || 0,
      deletedAnswers: orphanedAttemptIds.length
    });

  } catch (error: any) {
    console.error('[CBT Cleanup] Error:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

export default app;