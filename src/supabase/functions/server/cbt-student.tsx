import { Hono } from "npm:hono";
import { createClient } from "npm:@supabase/supabase-js";

const app = new Hono();

// Helper to extract base class name (e.g., "SS1 - Diamond" → "SS1", "jss2" → "JSS2")
function extractBaseClassName(fullClassName: string): string {
  if (!fullClassName) return '';
  
  // Remove section suffix (everything after " - ")
  const baseName = fullClassName.split(' - ')[0].trim();
  
  // Normalize: Convert to uppercase
  return baseName.toUpperCase();
}

// Create Supabase client
const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// ==================== STUDENT CBT ENDPOINTS ====================

// GET /cbt-student/available-exams/:studentId - Get available exams for student
app.get("/make-server-1ddd013a/cbt-student/available-exams/:studentId", async (c) => {
  try {
    const studentId = c.req.param("studentId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get student profile (to get their class)
    const { data: studentProfile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id, 
        class_id,
        first_name, 
        last_name,
        classes (
          id,
          name
        )
      `)
      .eq("id", studentId)
      .eq("role", "student")
      .single();

    if (profileError || !studentProfile) {
      console.error("[CBT Student] Student profile error:", profileError);
      return c.json({ success: false, error: "Student not found" }, 404);
    }

    const studentClass = studentProfile.classes?.name;
    if (!studentClass) {
      console.error("[CBT Student] Student class not found");
      return c.json({ success: false, error: "Student class not found" }, 404);
    }

    // Extract base class name (e.g., "SS1" from "SS1 Silver" or "SS1 Gold")
    // CBT exams use base class names like "JSS1", "JSS2", "JSS3", "SS1", "SS2", "SS3"
    const baseClass = extractBaseClassName(studentClass);

    console.log("[CBT Student] 🔍 DEBUG - Full student profile:", JSON.stringify(studentProfile, null, 2));
    console.log("[CBT Student] Student profile:", { 
      id: studentProfile.id, 
      name: `${studentProfile.first_name} ${studentProfile.last_name}`,
      class_id: studentProfile.class_id,
      fullClass: studentClass,
      baseClass: baseClass
    });

    const now = new Date().toISOString();
    console.log("[CBT Student] Current time:", now);

    // Get current session and term from the student's profile
    const { data: schoolSettings } = await supabase
      .from("settings")
      .select("current_session, current_term")
      .single();

    const currentSession = schoolSettings?.current_session || "2025/2026";
    const currentTerm = schoolSettings?.current_term || "First Term";

    console.log("[CBT Student] Current academic period:", { currentSession, currentTerm });

    // Get active/scheduled exams for student's base class
    // Use base class (e.g., "SS1") to match exams since CBT uses base class names
    // IMPORTANT: Only show exams that are ENABLED (scheduled or active status)
    // If an exam is DISABLED, students should not see it at all
    // The frontend will further filter to hide completed exams unless allow_retake is enabled
    const { data: exams, error: examsError } = await supabase
      .from("cbt_exams")
      .select(`
        id,
        title,
        subject,
        class,
        session,
        term,
        instructions,
        exam_type,
        duration_minutes,
        total_marks,
        pass_mark,
        scheduled_start,
        scheduled_end,
        status,
        settings
      `)
      .ilike("class", baseClass)
      .in("status", ["scheduled", "active"])  // ✅ ONLY enabled exams - excludes disabled exams
      .order("scheduled_start", { ascending: true });

    console.log("[CBT Student] 🔍 Query filters:", {
      fullClass: studentClass,
      baseClass: baseClass,
      status: ["scheduled", "active"],
    });
    console.log("[CBT Student] Found exams:", exams?.length || 0);
    if (exams && exams.length > 0) {
      console.log("[CBT Student] 🔍 All exams found:", JSON.stringify(exams, null, 2));
    } else {
      console.log("[CBT Student] ❌ No exams found - checking all exams in database...");
      
      // Debug: Get ALL exams to see what's in the database
      const { data: allExams } = await supabase
        .from("cbt_exams")
        .select("id, title, class, status, scheduled_start, scheduled_end");
      
      console.log("[CBT Student] 🔍 All exams in database:", JSON.stringify(allExams, null, 2));
    }

    if (examsError) {
      console.error("[CBT Student] Error fetching exams:", examsError);
      return c.json({ success: false, error: examsError.message }, 500);
    }

    // Check if student has already attempted each exam
    const examsWithStatus = await Promise.all(
      (exams || []).map(async (exam) => {
        const { data: attempts, error: attemptError } = await supabase
          .from("cbt_student_attempts")
          .select("id, status, total_score, percentage, submitted_at, start_time")
          .eq("exam_id", exam.id)
          .eq("student_id", studentId)
          .order("attempt_number", { ascending: false })
          .limit(1);

        if (attemptError) {
          console.error("[CBT Student] Error fetching attempts:", attemptError);
        }

        const latestAttempt = attempts?.[0];
        const hasAttempted = !!latestAttempt;
        const isCompleted = latestAttempt?.status === "submitted" || latestAttempt?.status === "auto_submitted";
        const isInProgress = latestAttempt?.status === "in_progress";

        return {
          ...exam,
          hasAttempted,
          isCompleted,
          isInProgress,
          latestAttempt: latestAttempt || null,
        };
      })
    );

    return c.json({
      success: true,
      exams: examsWithStatus,
      studentClass: studentClass,
    });

  } catch (error: any) {
    console.error("[CBT Student] Error in available-exams:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cbt-student/start-exam - Start an exam attempt
app.post("/make-server-1ddd013a/cbt-student/start-exam", async (c) => {
  try {
    const body = await c.req.json();
    const { examId, studentId } = body;
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get exam details
    const { data: exam, error: examError } = await supabase
      .from("cbt_exams")
      .select("*, teacher_id")
      .eq("id", examId)
      .single();

    if (examError || !exam) {
      return c.json({ success: false, error: "Exam not found" }, 404);
    }

    // Check if exam is active
    const now = new Date().toISOString();
    console.log("[CBT Student] 🕐 Time check:", {
      now: now,
      scheduled_start: exam.scheduled_start,
      scheduled_end: exam.scheduled_end,
      status: exam.status
    });

    // Explicitly reject disabled exams
    if (exam.status === "disabled") {
      console.log("[CBT Student] ❌ Exam is disabled");
      return c.json({ success: false, error: "This exam has been disabled by the administrator" }, 400);
    }

    if (exam.status !== "active" && exam.status !== "scheduled") {
      console.log("[CBT Student] ❌ Exam status check failed:", exam.status);
      return c.json({ success: false, error: "Exam is not available" }, 400);
    }

    // Relaxed time check: Allow starting if status is scheduled or active
    // In production, you might want stricter time enforcement
    const startTime = new Date(exam.scheduled_start).getTime();
    const endTime = new Date(exam.scheduled_end).getTime();
    const currentTime = new Date(now).getTime();
    
    if (currentTime < startTime) {
      const hoursUntilStart = Math.floor((startTime - currentTime) / (1000 * 60 * 60));
      console.log("[CBT Student] ⏰ Exam hasn't started yet. Hours until start:", hoursUntilStart);
      // Allow early start if within 1 hour of scheduled start time
      if (hoursUntilStart > 1) {
        return c.json({ 
          success: false, 
          error: `Exam starts at ${exam.scheduled_start}. Please wait.` 
        }, 400);
      }
    }
    
    if (currentTime > endTime) {
      console.log("[CBT Student] ❌ Exam has expired");
      return c.json({ 
        success: false, 
        error: `Exam ended at ${exam.scheduled_end}` 
      }, 400);
    }

    // Get student profile
    const { data: studentProfile, error: profileError } = await supabase
      .from("profiles")
      .select(`
        id, 
        class_id,
        first_name, 
        last_name,
        classes (
          id,
          name
        )
      `)
      .eq("id", studentId)
      .eq("role", "student")
      .single();

    if (profileError || !studentProfile) {
      return c.json({ success: false, error: "Student not found" }, 404);
    }

    const studentClass = studentProfile.classes?.name;
    if (!studentClass) {
      return c.json({ success: false, error: "Student class not found" }, 404);
    }

    // Check if student already has an active attempt
    const { data: existingAttempts, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select("id, status, attempt_number")
      .eq("exam_id", examId)
      .eq("student_id", studentId)
      .order("attempt_number", { ascending: false });

    if (attemptError) {
      console.error("[CBT Student] Error checking attempts:", attemptError);
      return c.json({ success: false, error: attemptError.message }, 500);
    }

    // Check if student has already completed the exam
    const completedAttempt = existingAttempts?.find(
      (a) => a.status === "submitted" || a.status === "auto_submitted"
    );
    
    // Check if retakes are allowed in exam settings
    const allowRetake = exam.settings?.allow_retake || false;
    
    if (completedAttempt && exam.exam_type === "formal" && !allowRetake) {
      return c.json({ success: false, error: "You have already completed this exam" }, 400);
    }

    // Check if student has an in-progress attempt
    const inProgressAttempt = existingAttempts?.find((a) => a.status === "in_progress");
    if (inProgressAttempt) {
      // Resume existing attempt
      return c.json({
        success: true,
        message: "Resuming existing attempt",
        attemptId: inProgressAttempt.id,
      });
    }

    // Get exam questions
    const { data: examQuestions, error: questionsError } = await supabase
      .from("cbt_exam_questions")
      .select(`
        id,
        question_id,
        question_order,
        marks,
        section,
        cbt_questions (
          id,
          question_type,
          question_text,
          question_image_url,
          options,
          marks,
          time_weight,
          explanation
        )
      `)
      .eq("exam_id", examId)
      .order("question_order", { ascending: true });

    if (questionsError) {
      console.error("[CBT Student] Error fetching questions:", questionsError);
      return c.json({ success: false, error: questionsError.message }, 500);
    }

    if (!examQuestions || examQuestions.length === 0) {
      return c.json({ success: false, error: "No questions found for this exam" }, 400);
    }

    // Create new attempt
    const attemptNumber = existingAttempts && existingAttempts.length > 0
      ? Math.max(...existingAttempts.map((a) => a.attempt_number)) + 1
      : 1;

    const { data: newAttempt, error: createError } = await supabase
      .from("cbt_student_attempts")
      .insert({
        exam_id: examId,
        student_id: studentId,
        student_name: `${studentProfile.first_name} ${studentProfile.last_name}`,
        student_class: studentClass,
        attempt_number: attemptNumber,
        start_time: new Date().toISOString(),
        status: "in_progress",
        total_questions: examQuestions.length,
        questions_answered: 0,
        questions_flagged: 0,
      })
      .select()
      .single();

    if (createError) {
      console.error("[CBT Student] Error creating attempt:", createError);
      return c.json({ success: false, error: createError.message }, 500);
    }

    // Create answer records for all questions
    const answerRecords = examQuestions.map((eq) => ({
      attempt_id: newAttempt.id,
      question_id: eq.question_id,
      exam_question_id: eq.id,
      max_marks: eq.marks || eq.cbt_questions.marks || 1,
      is_flagged: false,
      marks_awarded: 0,
    }));

    const { error: answersError } = await supabase
      .from("cbt_student_answers")
      .insert(answerRecords);

    if (answersError) {
      console.error("[CBT Student] Error creating answer records:", answersError);
      // Don't fail the whole request, answers can be created on-the-fly
    }

    return c.json({
      success: true,
      message: "Exam started successfully",
      attemptId: newAttempt.id,
      totalQuestions: examQuestions.length,
    });

  } catch (error: any) {
    console.error("[CBT Student] Error in start-exam:", error);
    console.error("[CBT Student] Full error details:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
      details: error.details
    });
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /cbt-student/exam-data/:attemptId - Get exam data for taking exam
app.get("/make-server-1ddd013a/cbt-student/exam-data/:attemptId", async (c) => {
  try {
    const attemptId = c.req.param("attemptId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return c.json({ success: false, error: "Attempt not found" }, 404);
    }

    // Get exam details
    const { data: exam, error: examError } = await supabase
      .from("cbt_exams")
      .select("*")
      .eq("id", attempt.exam_id)
      .single();

    if (examError || !exam) {
      return c.json({ success: false, error: "Exam not found" }, 404);
    }

    // Get CBT settings for exam rules
    const { data: settingsArray } = await supabase
      .from("cbt_settings")
      .select("exam_rules_text")
      .limit(1);

    const settings = settingsArray?.[0] || null;

    // Get exam questions with student answers
    const { data: examQuestions, error: questionsError } = await supabase
      .from("cbt_exam_questions")
      .select(`
        id,
        question_id,
        question_order,
        marks,
        section,
        cbt_questions (
          id,
          question_type,
          question_text,
          question_image_url,
          options,
          marks,
          time_weight
        )
      `)
      .eq("exam_id", attempt.exam_id)
      .order("question_order", { ascending: true });

    if (questionsError) {
      console.error("[CBT Student] Error fetching questions:", questionsError);
      return c.json({ success: false, error: questionsError.message }, 500);
    }

    // Get student's answers
    const { data: answers, error: answersError } = await supabase
      .from("cbt_student_answers")
      .select("question_id, student_answer, is_flagged, answered_at")
      .eq("attempt_id", attemptId);

    if (answersError) {
      console.error("[CBT Student] Error fetching answers:", answersError);
    }

    // Merge questions with answers
    const questionsWithAnswers = examQuestions?.map((eq) => {
      const answer = answers?.find((a) => a.question_id === eq.question_id);
      return {
        ...eq,
        studentAnswer: answer?.student_answer || null,
        isFlagged: answer?.is_flagged || false,
        answeredAt: answer?.answered_at || null,
      };
    });

    return c.json({
      success: true,
      exam,
      attempt,
      questions: questionsWithAnswers || [],
      examRules: settings?.exam_rules_text || "No exam rules available.",
    });

  } catch (error: any) {
    console.error("[CBT Student] Error in exam-data:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cbt-student/save-answer - Save/update answer (auto-save)
app.post("/make-server-1ddd013a/cbt-student/save-answer", async (c) => {
  try {
    const body = await c.req.json();
    const { attemptId, questionId, answer, isFlagged } = body;
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get attempt to ensure it's still in progress
    const { data: attempt, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select("status")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return c.json({ success: false, error: "Attempt not found" }, 404);
    }

    if (attempt.status !== "in_progress") {
      return c.json({ success: false, error: "Cannot save answer - exam is not in progress" }, 400);
    }

    // Find the existing answer record (created when exam started)
    const { data: existingAnswer, error: findError } = await supabase
      .from("cbt_student_answers")
      .select("id, exam_question_id")
      .eq("attempt_id", attemptId)
      .eq("question_id", questionId)
      .maybeSingle();

    if (findError) {
      console.error("[CBT Student] Error finding answer record:", findError);
      return c.json({ success: false, error: "Could not find answer record" }, 500);
    }

    if (!existingAnswer) {
      console.error("[CBT Student] No answer record found for:", { attemptId, questionId });
      return c.json({ success: false, error: "Answer record not found" }, 404);
    }

    // Update the existing answer record
    const { error: saveError } = await supabase
      .from("cbt_student_answers")
      .update({
        student_answer: answer,
        is_flagged: isFlagged || false,
        answered_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", existingAnswer.id);

    if (saveError) {
      console.error("[CBT Student] Error saving answer:", saveError);
      return c.json({ success: false, error: saveError.message }, 500);
    }

    // Update questions_answered count in attempt
    const { data: answersCount } = await supabase
      .from("cbt_student_answers")
      .select("id", { count: "exact" })
      .eq("attempt_id", attemptId)
      .not("student_answer", "is", null);

    await supabase
      .from("cbt_student_attempts")
      .update({
        questions_answered: answersCount?.length || 0,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    return c.json({
      success: true,
      message: "Answer saved successfully",
    });

  } catch (error: any) {
    console.error("[CBT Student] Error in save-answer:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cbt-student/submit-exam - Submit exam
app.post("/make-server-1ddd013a/cbt-student/submit-exam", async (c) => {
  try {
    const body = await c.req.json();
    const { attemptId } = body;
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select("*")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return c.json({ success: false, error: "Attempt not found" }, 404);
    }

    if (attempt.status !== "in_progress") {
      return c.json({ success: false, error: "Exam is not in progress" }, 400);
    }

    // Get all questions and answers
    const { data: answers, error: answersError } = await supabase
      .from("cbt_student_answers")
      .select(`
        id,
        question_id,
        student_answer,
        max_marks,
        cbt_questions (
          id,
          question_type,
          correct_answer,
          marks
        )
      `)
      .eq("attempt_id", attemptId);

    if (answersError) {
      console.error("[CBT Student] Error fetching answers:", answersError);
      return c.json({ success: false, error: answersError.message }, 500);
    }

    // Auto-grade objective questions
    let autoGradedScore = 0;
    let requiresManualGrading = false;

    console.log('[CBT Student] 🎯 Starting auto-grading for attempt:', attemptId);
    console.log('[CBT Student] Total answers to grade:', answers?.length || 0);

    for (const answer of answers || []) {
      const question = answer.cbt_questions;
      const questionType = question.question_type;
      const correctAnswer = question.correct_answer;
      const studentAnswer = answer.student_answer;

      console.log('[CBT Student] 📝 Grading question:', {
        questionId: answer.question_id,
        type: questionType,
        studentAnswer: studentAnswer,
        correctAnswer: correctAnswer,
        maxMarks: answer.max_marks
      });

      let isCorrect = false;
      let marksAwarded = 0;

      if (questionType === "mcq_single" || questionType === "true_false") {
        // Single answer - exact match
        if (studentAnswer && correctAnswer) {
          isCorrect = JSON.stringify(studentAnswer) === JSON.stringify(correctAnswer);
          marksAwarded = isCorrect ? (answer.max_marks || 1) : 0;
        }
      } else if (questionType === "mcq_multiple") {
        // Multiple answers - all must match
        if (studentAnswer && correctAnswer) {
          const studentAns = Array.isArray(studentAnswer) ? studentAnswer.sort() : [];
          const correctAns = Array.isArray(correctAnswer) ? correctAnswer.sort() : [];
          isCorrect = JSON.stringify(studentAns) === JSON.stringify(correctAns);
          marksAwarded = isCorrect ? (answer.max_marks || 1) : 0;
        }
      } else if (questionType === "fill_blank") {
        // Fill in the blank - check against all accepted variants
        if (studentAnswer && correctAnswer && Array.isArray(correctAnswer)) {
          const studentText = (studentAnswer as any)?.toString().toLowerCase().trim();
          isCorrect = correctAnswer.some((variant: any) => 
            variant.toString().toLowerCase().trim() === studentText
          );
          marksAwarded = isCorrect ? (answer.max_marks || 1) : 0;
        }
      } else if (questionType === "essay") {
        // Essay - requires manual grading
        requiresManualGrading = true;
        marksAwarded = 0;
      }

      // Update answer with grading results
      await supabase
        .from("cbt_student_answers")
        .update({
          is_correct: questionType !== "essay" ? isCorrect : null,
          marks_awarded: marksAwarded,
          requires_manual_grading: questionType === "essay",
          updated_at: new Date().toISOString(),
        })
        .eq("id", answer.id);

      autoGradedScore += marksAwarded;
    }

    // Get exam details for total marks
    const { data: exam, error: examError } = await supabase
      .from("cbt_exams")
      .select("total_marks")
      .eq("id", attempt.exam_id)
      .single();

    // 🔥 FIX: Calculate actual total marks from questions assigned to this exam
    // Don't rely on exam.total_marks which may be outdated
    const { data: examQuestions, error: examQuestionsError } = await supabase
      .from("cbt_exam_questions")
      .select("marks")
      .eq("exam_id", attempt.exam_id);

    // Calculate total possible marks from all exam questions
    const actualTotalMarks = examQuestions?.reduce((sum, q) => sum + (q.marks || 0), 0) || exam?.total_marks || 100;
    
    console.log('[CBT Submit] 📊 Grading Summary:', {
      attemptId,
      autoGradedScore,
      actualTotalMarks,
      examTotalMarks: exam?.total_marks,
      questionsCount: examQuestions?.length || 0,
      answersCount: answers?.length || 0
    });

    const totalMarks = actualTotalMarks;
    const percentage = totalMarks > 0 ? (autoGradedScore / totalMarks) * 100 : 0;

    // Calculate time taken
    const startTime = new Date(attempt.start_time).getTime();
    const endTime = new Date().getTime();
    const timeTakenSeconds = Math.floor((endTime - startTime) / 1000);

    // Update attempt
    const { error: updateError } = await supabase
      .from("cbt_student_attempts")
      .update({
        status: "submitted",
        end_time: new Date().toISOString(),
        submitted_at: new Date().toISOString(),
        time_taken_seconds: timeTakenSeconds,
        auto_graded_score: autoGradedScore,
        total_score: autoGradedScore, // Will be updated after manual grading if needed
        percentage: percentage,
        requires_manual_grading: requiresManualGrading,
        updated_at: new Date().toISOString(),
      })
      .eq("id", attemptId);

    if (updateError) {
      console.error("[CBT Student] Error updating attempt:", updateError);
      return c.json({ success: false, error: updateError.message }, 500);
    }

    return c.json({
      success: true,
      message: "Exam submitted successfully",
      autoGradedScore,
      totalMarks,
      percentage: percentage.toFixed(2),
      requiresManualGrading,
    });

  } catch (error: any) {
    console.error("[CBT Student] Error in submit-exam:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cbt-student/log-violation - Log exam violations
app.post("/make-server-1ddd013a/cbt-student/log-violation", async (c) => {
  try {
    const body = await c.req.json();
    const { attemptId, violationType, severity, details } = body;
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get CBT settings for penalty configuration
    const { data: settingsArray, error: settingsError } = await supabase
      .from("cbt_settings")
      .select("enable_violation_tracking, tab_switch_penalty_seconds, fullscreen_exit_penalty_seconds, max_violations_before_auto_submit")
      .limit(1);

    const settings = settingsArray?.[0] || null;

    if (settingsError) {
      console.error('[CBT Violation] ❌ Error fetching settings:', settingsError);
    }

    console.log('[CBT Violation] Settings fetched:', settings);
    console.log('[CBT Violation] Violation type:', violationType);
    console.log('[CBT Violation] Penalty calculation:', {
      enable_violation_tracking: settings?.enable_violation_tracking,
      tab_switch_penalty: settings?.tab_switch_penalty_seconds,
      fullscreen_exit_penalty: settings?.fullscreen_exit_penalty_seconds
    });

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select("exam_id, student_id, start_time, violations_count")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return c.json({ success: false, error: "Attempt not found" }, 404);
    }

    // Calculate penalty based on settings
    let penaltySeconds = 0;
    let penaltyMessage = '';
    
    if (settings?.enable_violation_tracking) {
      if (violationType === 'tab_switch') {
        penaltySeconds = settings.tab_switch_penalty_seconds || 0;
      } else if (violationType === 'fullscreen_exit') {
        penaltySeconds = settings.fullscreen_exit_penalty_seconds || 0;
      }
      
      if (penaltySeconds > 0) {
        const minutes = Math.floor(penaltySeconds / 60);
        const seconds = penaltySeconds % 60;
        if (minutes > 0) {
          penaltyMessage = seconds > 0 
            ? `${minutes} minute${minutes > 1 ? 's' : ''} ${seconds} second${seconds > 1 ? 's' : ''} deducted`
            : `${minutes} minute${minutes > 1 ? 's' : ''} deducted`;
        } else {
          penaltyMessage = `${seconds} second${seconds > 1 ? 's' : ''} deducted`;
        }
      }
    }

    // Log violation
    const { error: logError } = await supabase
      .from("cbt_violation_logs")
      .insert({
        attempt_id: attemptId,
        student_id: attempt.student_id,
        exam_id: attempt.exam_id,
        violation_type: violationType,
        severity: severity || "low",
        details: details || {},
        action_taken: penaltySeconds > 0 
          ? `Automatic: ${penaltyMessage}` 
          : `Automatic: Violation logged - ${violationType}`,
      });

    if (logError) {
      console.error("[CBT Student] Error logging violation:", logError);
      return c.json({ success: false, error: logError.message }, 500);
    }

    // Update violation count in attempt
    const { data: violationsCount } = await supabase
      .from("cbt_violation_logs")
      .select("id", { count: "exact" })
      .eq("attempt_id", attemptId);

    const currentViolationCount = violationsCount?.length || 0;

    const updateData: any = {
      violations_count: currentViolationCount,
      updated_at: new Date().toISOString(),
    };

    if (violationType === "tab_switch") {
      updateData.tab_switches = (attempt as any).tab_switches ? (attempt as any).tab_switches + 1 : 1;
    } else if (violationType === "fullscreen_exit") {
      updateData.fullscreen_exits = (attempt as any).fullscreen_exits ? (attempt as any).fullscreen_exits + 1 : 1;
    }

    await supabase
      .from("cbt_student_attempts")
      .update(updateData)
      .eq("id", attemptId);

    // Check if max violations exceeded
    const shouldAutoSubmit = settings?.max_violations_before_auto_submit > 0 
      && currentViolationCount >= settings.max_violations_before_auto_submit;

    return c.json({
      success: true,
      message: "Violation logged",
      penaltySeconds,
      penaltyMessage,
      shouldAutoSubmit,
      violationCount: currentViolationCount,
      maxViolations: settings?.max_violations_before_auto_submit || 0,
    });

  } catch (error: any) {
    console.error("[CBT Student] Error in log-violation:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// POST /cbt-student/log-violation-with-screenshot - Log violation with screenshot evidence and apply penalties
app.post("/make-server-1ddd013a/cbt-student/log-violation-with-screenshot", async (c) => {
  try {
    const formData = await c.req.formData();
    const screenshot = formData.get('screenshot') as File;
    const attemptId = formData.get('attemptId') as string;
    const violationType = formData.get('violationType') as string;
    const severity = formData.get('severity') as string;
    const detailsStr = formData.get('details') as string;
    const details = detailsStr ? JSON.parse(detailsStr) : {};
    
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    console.log('[CBT Violation] Processing violation with screenshot:', { attemptId, violationType, severity });

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select("exam_id, student_id, auto_graded_score, total_score")
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return c.json({ success: false, error: "Attempt not found" }, 404);
    }

    // STEP 1: Upload screenshot to Supabase Storage
    let screenshotUrl = null;
    if (screenshot) {
      console.log('[CBT Violation] Screenshot file received:', { 
        name: screenshot.name, 
        type: screenshot.type, 
        size: screenshot.size 
      });
      
      const bucketName = 'make-1ddd013a-cbt-violations';
      
      // Create bucket if it doesn't exist
      const { data: buckets } = await supabase.storage.listBuckets();
      const bucketExists = buckets?.some(bucket => bucket.name === bucketName);
      if (!bucketExists) {
        await supabase.storage.createBucket(bucketName, { public: false });
        console.log('[CBT Violation] Created violations bucket');
      }

      // Upload screenshot
      const fileName = `${attemptId}/${violationType}-${Date.now()}.jpg`;
      console.log('[CBT Violation] Uploading screenshot to:', fileName);
      
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(bucketName)
        .upload(fileName, screenshot, {
          contentType: 'image/jpeg',
          upsert: false
        });

      if (uploadError) {
        console.error('[CBT Violation] Screenshot upload error:', uploadError);
      } else {
        console.log('[CBT Violation] Screenshot uploaded successfully:', uploadData);
        
        // Get signed URL (valid for 1 year - for admin review)
        const { data: signedData, error: signError } = await supabase.storage
          .from(bucketName)
          .createSignedUrl(fileName, 31536000); // 1 year

        if (signError) {
          console.error('[CBT Violation] Error creating signed URL:', signError);
        } else {
          screenshotUrl = signedData?.signedUrl;
          console.log('[CBT Violation] Signed URL created:', screenshotUrl ? 'Success' : 'Failed');
        }
      }
    } else {
      console.warn('[CBT Violation] No screenshot file received in formData');
    }

    // STEP 2: Log violation with screenshot URL
    const { error: logError } = await supabase
      .from("cbt_violation_logs")
      .insert({
        attempt_id: attemptId,
        student_id: attempt.student_id,
        exam_id: attempt.exam_id,
        violation_type: violationType,
        severity: severity || "medium",
        details: { ...details, screenshot_url: screenshotUrl },
        screenshot_url: screenshotUrl, // Store in dedicated column if exists
        action_taken: `Automatic: Violation logged - ${violationType}`,
      });

    if (logError) {
      console.error("[CBT Violation] Error logging violation:", logError);
      return c.json({ success: false, error: logError.message }, 500);
    }

    // STEP 3: Calculate and apply automatic penalty
    let penaltyApplied = false;
    let penaltyMessage = '';
    let penaltyMarks = 0;

    // Penalty rules based on violation type and severity
    if (violationType === 'tab_switch' && severity === 'medium') {
      penaltyMarks = 2; // Deduct 2 marks per tab switch
      penaltyMessage = `${penaltyMarks} marks deducted for tab switching`;
    } else if (violationType === 'fullscreen_exit' && severity === 'high') {
      penaltyMarks = 5; // Deduct 5 marks per fullscreen exit
      penaltyMessage = `${penaltyMarks} marks deducted for exiting fullscreen`;
    }

    // STEP 4: Update violation count and apply penalty
    const { data: violationsCount } = await supabase
      .from("cbt_violation_logs")
      .select("id", { count: "exact" })
      .eq("attempt_id", attemptId);

    const currentTotalScore = attempt.total_score || attempt.auto_graded_score || 0;
    const newTotalScore = Math.max(0, currentTotalScore - penaltyMarks); // Don't go below 0

    const updateData: any = {
      violations_count: violationsCount?.length || 0,
      updated_at: new Date().toISOString(),
    };

    if (violationType === "tab_switch") {
      updateData.tab_switches = (attempt as any).tab_switches ? (attempt as any).tab_switches + 1 : 1;
    } else if (violationType === "fullscreen_exit") {
      updateData.fullscreen_exits = (attempt as any).fullscreen_exits ? (attempt as any).fullscreen_exits + 1 : 1;
    }

    // Apply penalty to score
    if (penaltyMarks > 0) {
      updateData.total_score = newTotalScore;
      updateData.penalty_marks = ((attempt as any).penalty_marks || 0) + penaltyMarks;
      penaltyApplied = true;
      console.log(`[CBT Violation] Applied penalty: ${penaltyMarks} marks deducted. New score: ${newTotalScore}`);
    }

    await supabase
      .from("cbt_student_attempts")
      .update(updateData)
      .eq("id", attemptId);

    return c.json({
      success: true,
      message: "Violation logged with screenshot evidence",
      screenshotUrl,
      penaltyApplied,
      penaltyMessage,
      penaltyMarks,
    });

  } catch (error: any) {
    console.error("[CBT Violation] Error in log-violation-with-screenshot:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /cbt/violations/:attemptId - Get violations for an attempt
app.get("/make-server-1ddd013a/cbt/violations/:attemptId", async (c) => {
  try {
    const attemptId = c.req.param("attemptId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get violations for this attempt
    const { data: violations, error: violationsError } = await supabase
      .from("cbt_violation_logs")
      .select("*")
      .eq("attempt_id", attemptId)
      .order("created_at", { ascending: false });

    if (violationsError) {
      console.error("[CBT Violations] Error fetching violations:", violationsError);
      return c.json({ success: false, error: violationsError.message }, 500);
    }

    return c.json({
      success: true,
      violations: violations || [],
    });

  } catch (error: any) {
    console.error("[CBT Violations] Error in get violations:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /cbt-student/results/:studentId - Get exam results for student
app.get("/make-server-1ddd013a/cbt-student/results/:studentId", async (c) => {
  try {
    const studentId = c.req.param("studentId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get all submitted attempts for the student
    const { data: attempts, error: attemptsError } = await supabase
      .from("cbt_student_attempts")
      .select(`
        id,
        exam_id,
        attempt_number,
        start_time,
        end_time,
        time_taken_seconds,
        status,
        auto_graded_score,
        manual_graded_score,
        total_score,
        percentage,
        grade,
        submitted_at,
        requires_manual_grading,
        manual_grading_completed,
        teacher_comments,
        cbt_exams (
          id,
          title,
          subject,
          class,
          exam_type,
          total_marks,
          pass_mark,
          session,
          term
        )
      `)
      .eq("student_id", studentId)
      .in("status", ["submitted", "auto_submitted"])
      .order("submitted_at", { ascending: false });

    if (attemptsError) {
      console.error("[CBT Student] Error fetching results:", attemptsError);
      return c.json({ success: false, error: attemptsError.message }, 500);
    }

    // Flatten the data structure to match frontend expectations
    const formattedResults = attempts?.map(attempt => ({
      id: attempt.id,
      exam_id: attempt.exam_id,
      attempt_number: attempt.attempt_number,
      start_time: attempt.start_time,
      end_time: attempt.end_time,
      time_taken_seconds: attempt.time_taken_seconds,
      status: attempt.status,
      auto_graded_score: attempt.auto_graded_score,
      manual_graded_score: attempt.manual_graded_score,
      total_score: attempt.total_score,
      percentage: attempt.percentage,
      grade: attempt.grade,
      submitted_at: attempt.submitted_at,
      requires_manual_grading: attempt.requires_manual_grading,
      manual_grading_completed: attempt.manual_grading_completed,
      teacher_comments: attempt.teacher_comments,
      exam: attempt.cbt_exams || {}
    })) || [];

    return c.json({
      success: true,
      results: formattedResults,
    });

  } catch (error: any) {
    console.error("[CBT Student] Error in results:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// GET /cbt-student/review/:attemptId - Get detailed review data for a submitted exam
app.get("/make-server-1ddd013a/cbt-student/review/:attemptId", async (c) => {
  try {
    const attemptId = c.req.param("attemptId");
    const accessToken = c.req.header("Authorization")?.split(" ")[1];

    // Verify authentication
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    if (!user || authError) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Get attempt details
    const { data: attempt, error: attemptError } = await supabase
      .from("cbt_student_attempts")
      .select(`
        id,
        exam_id,
        start_time,
        end_time,
        time_taken_seconds,
        total_score,
        percentage,
        cbt_exams (
          id,
          title,
          subject,
          session,
          term,
          total_marks,
          pass_mark
        )
      `)
      .eq("id", attemptId)
      .single();

    if (attemptError || !attempt) {
      return c.json({ success: false, error: "Attempt not found" }, 404);
    }

    // Verify this attempt belongs to the authenticated user
    const { data: attemptOwner } = await supabase
      .from("cbt_student_attempts")
      .select("student_id")
      .eq("id", attemptId)
      .single();

    if (attemptOwner?.student_id !== user.id) {
      return c.json({ success: false, error: "Unauthorized access to this exam" }, 403);
    }

    // Get all questions with student answers
    const { data: studentAnswers, error: answersError } = await supabase
      .from("cbt_student_answers")
      .select(`
        id,
        question_id,
        student_answer,
        is_correct,
        marks_awarded,
        max_marks,
        cbt_questions (
          id,
          question_text,
          question_type,
          question_image_url,
          options,
          correct_answer,
          explanation,
          marks
        )
      `)
      .eq("attempt_id", attemptId);

    if (answersError) {
      console.error("[CBT Student Review] Error fetching answers:", answersError);
      return c.json({ success: false, error: answersError.message }, 500);
    }

    console.log("[CBT Student Review] 📊 Raw student answers from DB:", JSON.stringify(studentAnswers, null, 2));

    // Format questions data
    const questions = studentAnswers?.map(ans => ({
      id: ans.cbt_questions.id,
      question_text: ans.cbt_questions.question_text,
      question_type: ans.cbt_questions.question_type,
      question_image_url: ans.cbt_questions.question_image_url,
      options: ans.cbt_questions.options,
      correct_answer: ans.cbt_questions.correct_answer,
      explanation: ans.cbt_questions.explanation,
      marks: ans.cbt_questions.marks,
      student_answer: ans.student_answer,
      is_correct: ans.is_correct,
      marks_awarded: ans.marks_awarded,
      max_marks: ans.max_marks,
    })) || [];

    console.log("[CBT Student Review] 📋 Formatted questions:", JSON.stringify(questions, null, 2));

    return c.json({
      success: true,
      attempt,
      questions,
    });

  } catch (error: any) {
    console.error("[CBT Student Review] Error:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

export default app;