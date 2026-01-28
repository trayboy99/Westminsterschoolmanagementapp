import { Hono } from 'npm:hono';
import { createClient } from 'npm:@supabase/supabase-js@2';

const app = new Hono();

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

// SIMPLE: Get ALL CBT results - no complex filtering
app.get("/make-server-1ddd013a/cbt-teacher/class-results/:teacherId", async (c) => {
  const { error: authError, user } = await getAuthUser(c);
  if (authError || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`[CBT Teacher] Fetching ALL student attempts`);

  try {
    // Get current session and term
    const { data: settings } = await supabase
      .from("settings")
      .select("current_session, current_term")
      .single();

    const currentSession = settings?.current_session || "2024/2025";
    const currentTerm = settings?.current_term || "First Term";

    // Get ALL student attempts with exam info - NO STATUS FILTER YET
    const { data: attempts, error: attemptsError } = await supabase
      .from("cbt_student_attempts")
      .select(`
        id,
        student_id,
        exam_id,
        total_score,
        percentage,
        status,
        cbt_exams (
          id,
          title,
          class,
          subject,
          session,
          term,
          total_marks
        ),
        student:profiles!student_id (
          id,
          first_name,
          middle_name,
          last_name
        )
      `);

    if (attemptsError) {
      console.error("[CBT Teacher] Error fetching attempts:", attemptsError);
      return c.json({ success: false, error: attemptsError.message }, 500);
    }

    console.log(`[CBT Teacher] Found ${attempts?.length || 0} total attempts`);

    // Debug: Log first attempt to see structure
    if (attempts && attempts.length > 0) {
      console.log(`[CBT Teacher] Sample attempt:`, JSON.stringify(attempts[0], null, 2));
      console.log(`[CBT Teacher] Current session: ${currentSession}, term: ${currentTerm}`);
      
      const uniqueSessions = [...new Set(attempts.map(a => a.cbt_exams?.session))];
      const uniqueTerms = [...new Set(attempts.map(a => a.cbt_exams?.term))];
      console.log(`[CBT Teacher] Sessions in data: ${uniqueSessions.join(', ')}`);
      console.log(`[CBT Teacher] Terms in data: ${uniqueTerms.join(', ')}`);
    }

    // Filter by current session/term and group by class + subject
    const grouped = new Map();

    for (const attempt of attempts || []) {
      const exam = attempt.cbt_exams;
      if (!exam) continue;

      // TEMPORARILY REMOVED: Only current session/term filtering
      // This will show ALL attempts regardless of session/term
      // if (exam.session !== currentSession || exam.term !== currentTerm) continue;

      const key = `${exam.class}|${exam.subject}`;

      if (!grouped.has(key)) {
        grouped.set(key, {
          class: exam.class,
          subject: exam.subject,
          examIds: new Set(),
          attempts: [],
          session: exam.session,
          term: exam.term,
        });
      }

      const group = grouped.get(key);
      group.examIds.add(exam.id);
      group.attempts.push(attempt);
    }

    console.log(`[CBT Teacher] Grouped into ${grouped.size} class-subject combinations`);

    // Format results
    const classExams = [];

    for (const [key, group] of grouped.entries()) {
      const totalPercentage = group.attempts.reduce((sum, a) => sum + (a.percentage || 0), 0);
      const avgScore = group.attempts.length > 0 ? totalPercentage / group.attempts.length : 0;

      // Count unique students (not total attempts)
      const uniqueStudents = new Set(group.attempts.map(a => a.student_id));

      classExams.push({
        class: group.class,
        className: group.class,
        subject: group.subject,
        examCount: group.examIds.size,
        completedAttempts: group.attempts.length, // Total attempts
        totalStudents: uniqueStudents.size, // Unique students only
        averageScore: avgScore,
        session: group.session,
        term: group.term,
      });
    }

    console.log(`[CBT Teacher] Returning ${classExams.length} results`);

    return c.json({ success: true, classExams });
  } catch (error: any) {
    console.error("[CBT Teacher] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get student attempts for specific class + subject
app.post("/make-server-1ddd013a/cbt-teacher/student-attempts", async (c) => {
  const { error: authError, user } = await getAuthUser(c);
  if (authError || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }

  const { classId, subject } = await c.req.json();
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`[CBT Teacher] Fetching attempts - class: ${classId}, subject: ${subject}`);

  try {
    const { data: settings } = await supabase
      .from("settings")
      .select("current_session, current_term")
      .single();

    const currentSession = settings?.current_session || "2024/2025";
    const currentTerm = settings?.current_term || "First Term";

    // Get all attempts with exam and student info
    const { data: attempts, error: attemptsError } = await supabase
      .from("cbt_student_attempts")
      .select(`
        id,
        student_id,
        exam_id,
        total_score,
        percentage,
        status,
        submitted_at,
        time_taken_seconds,
        questions_answered,
        cbt_exams (
          id,
          title,
          class,
          subject,
          session,
          term,
          total_marks
        ),
        student:profiles!student_id (
          id,
          first_name,
          middle_name,
          last_name
        )
      `)
      .in("status", ["submitted", "auto_submitted"]);

    if (attemptsError) {
      console.error("[CBT Teacher] Error fetching attempts:", attemptsError);
      return c.json({ success: false, error: attemptsError.message }, 500);
    }

    console.log(`[CBT Teacher] Fetched ${attempts?.length || 0} raw attempts from DB`);
    console.log(`[CBT Teacher] Current session: ${currentSession}, term: ${currentTerm}`);

    // Debug: Log first attempt to see structure
    if (attempts && attempts.length > 0) {
      console.log(`[CBT Teacher] Sample attempt:`, JSON.stringify(attempts[0], null, 2));
    }

    // TEMPORARILY REMOVED: Filter by session/term to match first endpoint behavior
    // Filter by class and subject only
    const filtered = attempts?.filter(attempt => {
      const exam = attempt.cbt_exams;
      if (!exam) return false;

      const classMatch = exam.class === classId;
      const subjectMatch = exam.subject === subject;

      console.log(`[CBT Teacher] Checking attempt: class=${exam.class} (match=${classMatch}), subject=${exam.subject} (match=${subjectMatch}), session=${exam.session}, term=${exam.term}`);

      // TEMPORARILY: Only filter by class and subject (not session/term)
      return classMatch && subjectMatch;
    }) || [];

    console.log(`[CBT Teacher] After filtering: ${filtered.length} attempts matched`);

    const formatted = filtered.map(attempt => {
      const firstName = attempt.student?.first_name || '';
      const middleName = attempt.student?.middle_name || '';
      const lastName = attempt.student?.last_name || '';
      const fullName = [firstName, middleName, lastName].filter(n => n).join(' ') || 'Unknown';

      return {
        id: attempt.id,
        student_id: attempt.student_id,
        student_name: fullName,
        exam_title: attempt.cbt_exams?.title || "Unknown",
        exam_id: attempt.exam_id,
        total_score: attempt.total_score || 0,
        total_marks: attempt.cbt_exams?.total_marks || 0,
        percentage: attempt.percentage || 0,
        status: attempt.status,
        submitted_at: attempt.submitted_at,
        time_taken_seconds: attempt.time_taken_seconds || 0,
        questions_answered: attempt.questions_answered || 0,
      };
    });

    return c.json({ success: true, attempts: formatted });
  } catch (error: any) {
    console.error("[CBT Teacher] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get detailed answers for an attempt
app.get("/make-server-1ddd013a/cbt-teacher/attempt-details/:attemptId", async (c) => {
  const { error: authError, user } = await getAuthUser(c);
  if (authError || !user) {
    return c.json({ error: authError || 'Unauthorized' }, 401);
  }

  const attemptId = c.req.param("attemptId");
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`[CBT Teacher] Fetching attempt details: ${attemptId}`);

  try {
    // Get attempt
    const { data: attempt, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select(`
        student_id,
        exam_id,
        total_score,
        percentage,
        submitted_at,
        cbt_exams (
          title,
          total_marks
        )
      `)
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      console.error('[CBT Teacher] Attempt error:', attemptError);
      return c.json({ success: false, error: "Attempt not found" }, 404);
    }

    // Get student profile separately
    const { data: student, error: studentError } = await supabase
      .from("profiles")
      .select("first_name, middle_name, last_name")
      .eq("id", attempt.student_id)
      .single();

    if (studentError) {
      console.error('[CBT Teacher] Student error:', studentError);
    }

    // Get answers
    const { data: answers, error: answersError } = await supabase
      .from("cbt_student_answers")
      .select(`
        question_id,
        student_answer,
        is_correct
      `)
      .eq("attempt_id", attemptId)
      .order("question_id");

    if (answersError) {
      console.error('[CBT Teacher] Answers error:', answersError);
      return c.json({ success: false, error: answersError.message }, 500);
    }

    console.log(`[CBT Teacher] Found ${answers?.length || 0} answers`);

    // Get question details separately
    const questionIds = answers?.map(a => a.question_id) || [];
    const { data: questions, error: questionsError } = await supabase
      .from("cbt_questions")
      .select("id, question_text, question_type, marks, correct_answer, options")
      .in("id", questionIds);

    if (questionsError) {
      console.error('[CBT Teacher] Questions error:', questionsError);
    }

    console.log(`[CBT Teacher] Found ${questions?.length || 0} questions`);

    // Map questions by ID for easy lookup
    const questionsMap = new Map();
    questions?.forEach(q => {
      questionsMap.set(q.id, q);
    });

    const formatted = answers?.map(answer => {
      const question = questionsMap.get(answer.question_id);
      const marks = question?.marks || 0;
      const isCorrect = answer.is_correct || false;
      
      // Calculate points earned based on is_correct and question marks
      const pointsEarned = isCorrect ? marks : 0;

      return {
        question_id: answer.question_id,
        question_text: question?.question_text || "",
        question_type: question?.question_type || "",
        marks: marks,
        student_answer: answer.student_answer,
        correct_answer: question?.correct_answer,
        is_correct: isCorrect,
        points_earned: pointsEarned,
        options: question?.options || null,
      };
    }) || [];

    const firstName = student?.first_name || '';
    const middleName = student?.middle_name || '';
    const lastName = student?.last_name || '';
    const fullName = [firstName, middleName, lastName].filter(n => n).join(' ') || 'Unknown';

    const details = {
      student_name: fullName,
      exam_title: attempt.cbt_exams?.title || "Unknown",
      total_score: attempt.total_score || 0,
      total_marks: attempt.cbt_exams?.total_marks || 0,
      percentage: attempt.percentage || 0,
      submitted_at: attempt.submitted_at,
      answers: formatted,
    };

    console.log(`[CBT Teacher] Returning details with ${formatted.length} answers`);
    return c.json({ success: true, details });
  } catch (error: any) {
    console.error("[CBT Teacher] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;