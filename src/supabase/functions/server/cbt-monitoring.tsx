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
// GET ACTIVE CBT SESSIONS (Real-time Monitoring)
// ================================================
app.get('/make-server-1ddd013a/cbt/monitoring/active', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can view monitoring data' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get all attempts with exam and student information
    const { data: attempts, error } = await supabase
      .from('cbt_student_attempts')
      .select(`
        id,
        student_id,
        exam_id,
        status,
        start_time,
        end_time,
        total_score,
        percentage,
        violations_count,
        tab_switches,
        fullscreen_exits,
        created_at,
        updated_at,
        cbt_exams (
          id,
          title,
          subject,
          class,
          session,
          term,
          duration_minutes,
          total_marks,
          pass_mark,
          scheduled_start,
          scheduled_end
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching CBT attempts:', error);
      return c.json({ error: 'Failed to fetch attempts', details: error.message }, 500);
    }

    // Get student profiles with class information
    const studentIds = [...new Set(attempts?.map(a => a.student_id) || [])];
    
    const { data: students } = await supabase
      .from('profiles')
      .select(`
        id, 
        first_name,
        middle_name,
        last_name,
        email,
        class_id,
        classes (
          name
        )
      `)
      .in('id', studentIds);

    // Get question counts for each attempt
    const attemptIds = attempts?.map(a => a.id) || [];
    const { data: answers } = await supabase
      .from('cbt_student_answers')
      .select('attempt_id, student_answer')
      .in('attempt_id', attemptIds);

    // Count answered questions per attempt
    const answeredCountMap = new Map();
    answers?.forEach(answer => {
      const key = answer.attempt_id;
      const isAnswered = answer.student_answer !== null && answer.student_answer !== '';
      if (isAnswered) {
        answeredCountMap.set(key, (answeredCountMap.get(key) || 0) + 1);
      }
    });

    // Get total question count per subject+class combination
    const subjectClassPairs = [...new Set(attempts?.map(a => {
      const exam = a.cbt_exams;
      return `${exam?.subject}|${exam?.class}`;
    }) || [])];
    
    console.log('[CBT Monitoring] Subject+Class pairs:', subjectClassPairs);
    
    // Fetch questions for all exam IDs instead of subject+class pairs
    // This ensures we count only the questions assigned to the specific exam
    const questionCountMap = new Map();
    const examIds = [...new Set(attempts?.map(a => a.exam_id) || [])];
    
    for (const examId of examIds) {
      if (examId) {
        const { data: examQuestions, error: questionsError } = await supabase
          .from('cbt_exam_questions')
          .select('id')
          .eq('exam_id', examId);

        if (questionsError) {
          console.error(`[CBT Monitoring] Error fetching questions for exam ${examId}:`, questionsError);
        } else {
          const count = examQuestions?.length || 0;
          questionCountMap.set(examId, count);
          console.log(`[CBT Monitoring] Found ${count} questions for exam ${examId}`);
        }
      }
    }
    
    console.log('[CBT Monitoring] Question count map:', Object.fromEntries(questionCountMap));

    // Merge all data together
    const attemptsWithStudents = attempts?.map(attempt => {
      const student = students?.find(s => s.id === attempt.student_id);
      const exam = attempt.cbt_exams;
      const totalQuestions = questionCountMap.get(attempt.exam_id) || 0;
      const answeredQuestions = answeredCountMap.get(attempt.id) || 0;
      
      // Calculate time remaining for in-progress attempts
      let timeRemaining = null;
      let isExpired = false;
      
      if (attempt.status === 'in_progress' && attempt.start_time && exam?.duration_minutes) {
        const startTime = new Date(attempt.start_time);
        const endTime = new Date(startTime.getTime() + exam.duration_minutes * 60000);
        const now = new Date();
        const remaining = Math.floor((endTime.getTime() - now.getTime()) / 1000);
        
        if (remaining <= 0) {
          isExpired = true;
          timeRemaining = 0;
        } else {
          timeRemaining = remaining; // in seconds
        }
      }

      // Build full name from first_name, middle_name, last_name
      const firstName = student?.first_name || '';
      const middleName = student?.middle_name || '';
      const lastName = student?.last_name || '';
      const fullName = [firstName, middleName, lastName].filter(n => n).join(' ') || 'Unknown Student';

      return {
        id: attempt.id,
        student_id: attempt.student_id,
        student_name: fullName,
        student_email: student?.email || '',
        subject: exam?.subject || 'Unknown',
        student_class: student?.classes?.name || 'Unknown',
        session: exam?.session || null,
        term: exam?.term || null,
        status: attempt.status,
        start_time: attempt.start_time,
        end_time: attempt.end_time,
        duration_minutes: exam?.duration_minutes || 0,
        score: attempt.total_score !== null && attempt.total_score !== undefined ? attempt.total_score : null,
        percentage: attempt.percentage || null,
        total_marks: exam?.total_marks || 0,
        total_questions: totalQuestions,
        answered_questions: answeredQuestions,
        created_at: attempt.created_at,
        time_remaining_seconds: timeRemaining,
        is_expired: isExpired,
        progress_percentage: totalQuestions > 0 
          ? Math.round((answeredQuestions / totalQuestions) * 100) 
          : 0,
        violations_count: attempt.violations_count || 0,
        tab_switches: attempt.tab_switches || 0,
        fullscreen_exits: attempt.fullscreen_exits || 0
      };
    }) || [];

    // Calculate summary statistics
    const totalActive = attemptsWithStudents.filter(a => a.status === 'in_progress').length;
    const totalCompleted = attemptsWithStudents.filter(a => a.status === 'submitted').length;
    const totalExpired = attemptsWithStudents.filter(a => a.status === 'time_expired' || a.is_expired).length;
    
    const completedWithScores = attemptsWithStudents.filter(a => 
      (a.status === 'submitted' || a.status === 'time_expired') && 
      a.score !== null
    );
    
    const averageScore = completedWithScores.length > 0
      ? Math.round(
          completedWithScores.reduce((sum, a) => sum + (a.score || 0), 0) / completedWithScores.length
        )
      : 0;

    return c.json({
      attempts: attemptsWithStudents,
      summary: {
        total_active: totalActive,
        total_completed: totalCompleted,
        total_expired: totalExpired,
        average_score: averageScore,
        total_attempts: attemptsWithStudents.length
      }
    });
  } catch (error: any) {
    console.error('Error in GET /cbt/monitoring/active:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

// ================================================
// GET MONITORING SUMMARY STATS
// ================================================
app.get('/make-server-1ddd013a/cbt/monitoring/stats', async (c) => {
  try {
    const { error: authError, user } = await getAuthUser(c);
    if (authError || !user) {
      return c.json({ error: authError || 'Unauthorized' }, 401);
    }

    const profile = await getUserProfile(user.id);
    if (!['admin', 'principal', 'it_admin'].includes(profile?.role)) {
      return c.json({ error: 'Only admins can view monitoring stats' }, 403);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get today's attempts
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: todayAttempts } = await supabase
      .from('cbt_student_attempts')
      .select('status, score')
      .gte('created_at', today.toISOString());

    const activeToday = todayAttempts?.filter(a => a.status === 'in_progress').length || 0;
    const completedToday = todayAttempts?.filter(a => a.status === 'submitted').length || 0;

    // Get all-time stats
    const { count: totalAttempts } = await supabase
      .from('cbt_student_attempts')
      .select('*', { count: 'exact', head: true });

    const { data: allCompleted } = await supabase
      .from('cbt_student_attempts')
      .select('score')
      .in('status', ['submitted', 'time_expired'])
      .not('score', 'is', null);

    const averageScore = allCompleted && allCompleted.length > 0
      ? Math.round(
          allCompleted.reduce((sum, a) => sum + (a.score || 0), 0) / allCompleted.length
        )
      : 0;

    return c.json({
      stats: {
        active_today: activeToday,
        completed_today: completedToday,
        total_all_time: totalAttempts || 0,
        average_score: averageScore
      }
    });
  } catch (error: any) {
    console.error('Error in GET /cbt/monitoring/stats:', error);
    return c.json({ error: 'Internal server error', details: error.message }, 500);
  }
});

export default app;