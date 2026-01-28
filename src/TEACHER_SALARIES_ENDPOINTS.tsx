// ==================== TEACHER SALARIES ENDPOINTS ====================
// Add these endpoints to /supabase/functions/server/index.tsx

// GET: Fetch all teacher salaries
app.get("/make-server-1ddd013a/teacher-salaries", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Verify director role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "director") {
      return c.json({ success: false, error: "Access denied. Director only." }, 403);
    }

    const url = new URL(c.req.url);
    const session = url.searchParams.get("session");

    console.log("[Teacher Salaries] Fetching salaries for session:", session);

    // Build query
    let query = supabase
      .from("teacher_salaries")
      .select(`
        id,
        teacher_id,
        basic_salary,
        salary_increase,
        allowances,
        tax_percentage,
        pension_percentage,
        other_deductions,
        gross_salary,
        total_deductions,
        net_salary,
        session,
        effective_date,
        notes,
        created_at,
        updated_at
      `)
      .order("created_at", { ascending: false });

    if (session) {
      query = query.eq("session", session);
    }

    const { data: salaries, error } = await query;

    if (error) {
      console.error("[Teacher Salaries] Error fetching salaries:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    // Enrich with teacher information
    const enrichedSalaries = await Promise.all(
      (salaries || []).map(async (salary) => {
        const { data: teacher } = await supabase
          .from("profiles")
          .select("id, first_name, last_name, email")
          .eq("id", salary.teacher_id)
          .single();

        return {
          ...salary,
          teacher_name: teacher ? `${teacher.first_name} ${teacher.last_name}` : "Unknown",
          teacher_email: teacher?.email || "N/A"
        };
      })
    );

    console.log("[Teacher Salaries] Found", enrichedSalaries.length, "salary records");

    return c.json({
      success: true,
      salaries: enrichedSalaries
    });
  } catch (error) {
    console.error("[Teacher Salaries] Error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to fetch teacher salaries"
    }, 500);
  }
});

// POST: Create teacher salary
app.post("/make-server-1ddd013a/teacher-salaries", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Verify director role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "director") {
      return c.json({ success: false, error: "Access denied. Director only." }, 403);
    }

    const body = await c.req.json();
    const {
      teacher_id,
      basic_salary,
      salary_increase,
      allowances,
      tax_percentage,
      pension_percentage,
      other_deductions,
      session,
      effective_date,
      notes
    } = body;

    console.log("[Teacher Salaries] Creating salary for teacher:", teacher_id);

    // Validate required fields
    if (!teacher_id || !basic_salary || !session) {
      return c.json({
        success: false,
        error: "Missing required fields: teacher_id, basic_salary, session"
      }, 400);
    }

    // Check if salary already exists for this teacher and session
    const { data: existing } = await supabase
      .from("teacher_salaries")
      .select("id")
      .eq("teacher_id", teacher_id)
      .eq("session", session)
      .single();

    if (existing) {
      return c.json({
        success: false,
        error: "Salary already exists for this teacher in this session. Please update instead."
      }, 400);
    }

    // Insert salary record
    const { data, error } = await supabase
      .from("teacher_salaries")
      .insert({
        teacher_id,
        basic_salary: parseFloat(basic_salary) || 0,
        salary_increase: parseFloat(salary_increase) || 0,
        allowances: parseFloat(allowances) || 0,
        tax_percentage: parseFloat(tax_percentage) || 0,
        pension_percentage: parseFloat(pension_percentage) || 0,
        other_deductions: parseFloat(other_deductions) || 0,
        session,
        effective_date: effective_date || new Date().toISOString().split("T")[0],
        notes: notes || null,
        created_by: user.id
      })
      .select()
      .single();

    if (error) {
      console.error("[Teacher Salaries] Error creating salary:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log("[Teacher Salaries] Successfully created salary");

    return c.json({
      success: true,
      salary: data
    });
  } catch (error) {
    console.error("[Teacher Salaries] Error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to create teacher salary"
    }, 500);
  }
});

// PUT: Update teacher salary
app.put("/make-server-1ddd013a/teacher-salaries/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Verify director role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "director") {
      return c.json({ success: false, error: "Access denied. Director only." }, 403);
    }

    const salaryId = c.req.param("id");
    const body = await c.req.json();
    const {
      basic_salary,
      salary_increase,
      allowances,
      tax_percentage,
      pension_percentage,
      other_deductions,
      effective_date,
      notes
    } = body;

    console.log("[Teacher Salaries] Updating salary:", salaryId);

    // Update salary record
    const { data, error } = await supabase
      .from("teacher_salaries")
      .update({
        basic_salary: parseFloat(basic_salary) || 0,
        salary_increase: parseFloat(salary_increase) || 0,
        allowances: parseFloat(allowances) || 0,
        tax_percentage: parseFloat(tax_percentage) || 0,
        pension_percentage: parseFloat(pension_percentage) || 0,
        other_deductions: parseFloat(other_deductions) || 0,
        effective_date: effective_date || new Date().toISOString().split("T")[0],
        notes: notes || null
      })
      .eq("id", salaryId)
      .select()
      .single();

    if (error) {
      console.error("[Teacher Salaries] Error updating salary:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log("[Teacher Salaries] Successfully updated salary");

    return c.json({
      success: true,
      salary: data
    });
  } catch (error) {
    console.error("[Teacher Salaries] Error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to update teacher salary"
    }, 500);
  }
});

// DELETE: Remove teacher salary
app.delete("/make-server-1ddd013a/teacher-salaries/:id", async (c) => {
  try {
    const accessToken = c.req.header("Authorization")?.split(" ")[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: "Unauthorized" }, 401);
    }

    // Verify director role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (profile?.role !== "director") {
      return c.json({ success: false, error: "Access denied. Director only." }, 403);
    }

    const salaryId = c.req.param("id");

    console.log("[Teacher Salaries] Deleting salary:", salaryId);

    const { error } = await supabase
      .from("teacher_salaries")
      .delete()
      .eq("id", salaryId);

    if (error) {
      console.error("[Teacher Salaries] Error deleting salary:", error);
      return c.json({ success: false, error: error.message }, 500);
    }

    console.log("[Teacher Salaries] Successfully deleted salary");

    return c.json({
      success: true,
      message: "Salary deleted successfully"
    });
  } catch (error) {
    console.error("[Teacher Salaries] Error:", error);
    return c.json({
      success: false,
      error: error instanceof Error ? error.message : "Failed to delete teacher salary"
    }, 500);
  }
});
