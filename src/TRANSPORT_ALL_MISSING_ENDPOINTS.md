# 🚨 COMPLETE TRANSPORT ENDPOINTS - COPY & PASTE NOW!

## ❌ **PROBLEM**
You only added the DRIVER endpoints, but the system also needs:
- ✅ Driver endpoints (already added)
- ❌ **BUS endpoints** (MISSING - that's why bus save fails!)
- ❌ **ROUTE endpoints** (MISSING - that's why drivers dropdown doesn't populate!)
- ❌ **STATS endpoint** (MISSING - for dashboard)
- ❌ **STUDENT ASSIGNMENT endpoints** (MISSING - for student transport)

---

## ✅ **SOLUTION: ADD ALL THESE ENDPOINTS**

Open `/supabase/functions/server/index.tsx` and add ALL of these endpoints at the end (before `Deno.serve` or any export):

```typescript
// ============================================
// TRANSPORT MANAGEMENT - ALL ENDPOINTS
// ============================================

// ------------------------------------------
// 1. TRANSPORT STATS (for Dashboard)
// ------------------------------------------
app.get('/make-server-1ddd013a/transport/stats', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const busesList = await kv.get('transport:buses:list') || [];
    const routesList = await kv.get('transport:routes:list') || [];
    const driversList = await kv.get('transport:drivers:list') || [];
    const studentsList = await kv.get('transport:students:list') || [];

    const buses = await Promise.all(busesList.map(id => kv.get(`transport:bus:${id}`)));
    const routes = await Promise.all(routesList.map(id => kv.get(`transport:route:${id}`)));
    const students = await Promise.all(studentsList.map(id => kv.get(`transport:student:${id}`)));

    const stats = {
      totalBuses: buses.filter(Boolean).length,
      activeBuses: buses.filter(b => b?.status === 'active').length,
      totalRoutes: routes.filter(Boolean).length,
      totalDrivers: driversList.length,
      totalStudents: students.filter(Boolean).length,
      paidStudents: students.filter(s => s?.payment_status === 'paid').length,
      pendingPayments: students.filter(s => s?.payment_status === 'pending').reduce((sum, s) => sum + (s.fee_amount || 0), 0),
      maintenanceDue: buses.filter(b => b?.next_maintenance_date && new Date(b.next_maintenance_date) <= new Date()).length
    };

    const recentActivity = [
      { title: 'System Active', description: 'Transport management system operational', time: 'Now' }
    ];

    return c.json({ success: true, stats, recentActivity });
  } catch (error) {
    console.error('Error fetching transport stats:', error);
    return c.json({ success: false, error: 'Failed to fetch stats' }, 500);
  }
});

// ------------------------------------------
// 2. BUSES MANAGEMENT
// ------------------------------------------

// Get all buses
app.get('/make-server-1ddd013a/transport/buses', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const busesList = await kv.get('transport:buses:list') || [];
    const buses = await Promise.all(
      busesList.map(async (id) => {
        const bus = await kv.get(`transport:bus:${id}`);
        if (!bus) return null;

        // Fetch driver and route names if assigned
        if (bus.driver_id) {
          const driver = await kv.get(`transport:driver:${bus.driver_id}`);
          bus.driver_name = driver?.name;
        }
        if (bus.route_id) {
          const route = await kv.get(`transport:route:${bus.route_id}`);
          bus.route_name = route?.route_name;
        }

        return bus;
      })
    );

    return c.json({ success: true, buses: buses.filter(Boolean) });
  } catch (error) {
    console.error('Error fetching buses:', error);
    return c.json({ success: false, error: 'Failed to fetch buses' }, 500);
  }
});

// Create bus
app.post('/make-server-1ddd013a/transport/buses', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const busId = crypto.randomUUID();
    
    const busData = {
      id: busId,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`transport:bus:${busId}`, busData);
    
    // Update buses list
    const busesList = await kv.get('transport:buses:list') || [];
    busesList.push(busId);
    await kv.set('transport:buses:list', busesList);

    return c.json({ success: true, bus: busData });
  } catch (error) {
    console.error('Error creating bus:', error);
    return c.json({ success: false, error: 'Failed to create bus' }, 500);
  }
});

// Update bus
app.put('/make-server-1ddd013a/transport/buses/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const busId = c.req.param('id');
    const body = await c.req.json();
    
    const existingBus = await kv.get(`transport:bus:${busId}`);
    if (!existingBus) {
      return c.json({ success: false, error: 'Bus not found' }, 404);
    }

    const updatedBus = {
      ...existingBus,
      ...body,
      id: busId,
      updated_at: new Date().toISOString()
    };

    await kv.set(`transport:bus:${busId}`, updatedBus);

    return c.json({ success: true, bus: updatedBus });
  } catch (error) {
    console.error('Error updating bus:', error);
    return c.json({ success: false, error: 'Failed to update bus' }, 500);
  }
});

// Delete bus
app.delete('/make-server-1ddd013a/transport/buses/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const busId = c.req.param('id');
    
    await kv.del(`transport:bus:${busId}`);
    
    // Update buses list
    const busesList = await kv.get('transport:buses:list') || [];
    const updatedList = busesList.filter(id => id !== busId);
    await kv.set('transport:buses:list', updatedList);

    return c.json({ success: true, message: 'Bus deleted successfully' });
  } catch (error) {
    console.error('Error deleting bus:', error);
    return c.json({ success: false, error: 'Failed to delete bus' }, 500);
  }
});

// ------------------------------------------
// 3. ROUTES MANAGEMENT
// ------------------------------------------

// Get all routes
app.get('/make-server-1ddd013a/transport/routes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const routesList = await kv.get('transport:routes:list') || [];
    const routes = await Promise.all(
      routesList.map(async (id) => {
        const route = await kv.get(`transport:route:${id}`);
        if (!route) return null;

        // Count students on this route
        const studentsList = await kv.get('transport:students:list') || [];
        const studentsOnRoute = await Promise.all(
          studentsList.map(sid => kv.get(`transport:student:${sid}`))
        );
        route.student_count = studentsOnRoute.filter(s => s?.route_id === id).length;

        return route;
      })
    );

    return c.json({ success: true, routes: routes.filter(Boolean) });
  } catch (error) {
    console.error('Error fetching routes:', error);
    return c.json({ success: false, error: 'Failed to fetch routes' }, 500);
  }
});

// Create route
app.post('/make-server-1ddd013a/transport/routes', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const routeId = crypto.randomUUID();
    
    const routeData = {
      id: routeId,
      ...body,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`transport:route:${routeId}`, routeData);
    
    // Update routes list
    const routesList = await kv.get('transport:routes:list') || [];
    routesList.push(routeId);
    await kv.set('transport:routes:list', routesList);

    return c.json({ success: true, route: routeData });
  } catch (error) {
    console.error('Error creating route:', error);
    return c.json({ success: false, error: 'Failed to create route' }, 500);
  }
});

// Update route
app.put('/make-server-1ddd013a/transport/routes/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const routeId = c.req.param('id');
    const body = await c.req.json();
    
    const existingRoute = await kv.get(`transport:route:${routeId}`);
    if (!existingRoute) {
      return c.json({ success: false, error: 'Route not found' }, 404);
    }

    const updatedRoute = {
      ...existingRoute,
      ...body,
      id: routeId,
      updated_at: new Date().toISOString()
    };

    await kv.set(`transport:route:${routeId}`, updatedRoute);

    return c.json({ success: true, route: updatedRoute });
  } catch (error) {
    console.error('Error updating route:', error);
    return c.json({ success: false, error: 'Failed to update route' }, 500);
  }
});

// Delete route
app.delete('/make-server-1ddd013a/transport/routes/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const routeId = c.req.param('id');
    
    await kv.del(`transport:route:${routeId}`);
    
    // Update routes list
    const routesList = await kv.get('transport:routes:list') || [];
    const updatedList = routesList.filter(id => id !== routeId);
    await kv.set('transport:routes:list', updatedList);

    return c.json({ success: true, message: 'Route deleted successfully' });
  } catch (error) {
    console.error('Error deleting route:', error);
    return c.json({ success: false, error: 'Failed to delete route' }, 500);
  }
});

// ------------------------------------------
// 4. STUDENT TRANSPORT ASSIGNMENTS
// ------------------------------------------

// Get all student transport assignments
app.get('/make-server-1ddd013a/transport/students', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const assignmentsList = await kv.get('transport:students:list') || [];
    const assignments = await Promise.all(
      assignmentsList.map(async (id) => {
        const assignment = await kv.get(`transport:student:${id}`);
        if (!assignment) return null;

        // Fetch student details
        const student = await kv.get(`user_profile:${assignment.student_id}`);
        if (!student) {
          // Try fetching from Supabase profiles table
          const { data: profileData } = await supabase
            .from('profiles')
            .select('first_name, middle_name, last_name, email')
            .eq('id', assignment.student_id)
            .single();
          
          if (profileData) {
            assignment.student_name = `${profileData.first_name} ${profileData.middle_name || ''} ${profileData.last_name}`.trim();
            assignment.student_email = profileData.email;
          }
        }

        // Fetch class details
        const { data: classData } = await supabase
          .from('classes')
          .select('display_name, name')
          .eq('id', assignment.student_id)
          .single();

        // Fetch route details
        if (assignment.route_id) {
          const route = await kv.get(`transport:route:${assignment.route_id}`);
          assignment.route_name = route?.route_name;
          assignment.route_code = route?.route_code;
        }

        assignment.student_name = student 
          ? `${student.first_name} ${student.middle_name || ''} ${student.last_name}`.trim()
          : 'Unknown Student';
        assignment.class_name = classData?.display_name || classData?.name || '';

        return assignment;
      })
    );

    return c.json({ success: true, assignments: assignments.filter(Boolean) });
  } catch (error) {
    console.error('Error fetching student assignments:', error);
    return c.json({ success: false, error: 'Failed to fetch assignments' }, 500);
  }
});

// Create student assignment
app.post('/make-server-1ddd013a/transport/students', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const body = await c.req.json();
    const assignmentId = crypto.randomUUID();
    
    const assignmentData = {
      id: assignmentId,
      ...body,
      assigned_date: new Date().toISOString(),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    await kv.set(`transport:student:${assignmentId}`, assignmentData);
    
    // Update assignments list
    const assignmentsList = await kv.get('transport:students:list') || [];
    assignmentsList.push(assignmentId);
    await kv.set('transport:students:list', assignmentsList);

    return c.json({ success: true, assignment: assignmentData });
  } catch (error) {
    console.error('Error creating assignment:', error);
    return c.json({ success: false, error: 'Failed to create assignment' }, 500);
  }
});

// Update student assignment
app.put('/make-server-1ddd013a/transport/students/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const assignmentId = c.req.param('id');
    const body = await c.req.json();
    
    const existingAssignment = await kv.get(`transport:student:${assignmentId}`);
    if (!existingAssignment) {
      return c.json({ success: false, error: 'Assignment not found' }, 404);
    }

    const updatedAssignment = {
      ...existingAssignment,
      ...body,
      id: assignmentId,
      updated_at: new Date().toISOString()
    };

    await kv.set(`transport:student:${assignmentId}`, updatedAssignment);

    return c.json({ success: true, assignment: updatedAssignment });
  } catch (error) {
    console.error('Error updating assignment:', error);
    return c.json({ success: false, error: 'Failed to update assignment' }, 500);
  }
});

// Delete student assignment
app.delete('/make-server-1ddd013a/transport/students/:id', async (c) => {
  try {
    const accessToken = c.req.header('Authorization')?.split(' ')[1];
    const { data: { user }, error: authError } = await supabase.auth.getUser(accessToken);
    
    if (!user?.id) {
      return c.json({ success: false, error: 'Unauthorized' }, 401);
    }

    const assignmentId = c.req.param('id');
    
    await kv.del(`transport:student:${assignmentId}`);
    
    // Update assignments list
    const assignmentsList = await kv.get('transport:students:list') || [];
    const updatedList = assignmentsList.filter(id => id !== assignmentId);
    await kv.set('transport:students:list', updatedList);

    return c.json({ success: true, message: 'Assignment deleted successfully' });
  } catch (error) {
    console.error('Error deleting assignment:', error);
    return c.json({ success: false, error: 'Failed to delete assignment' }, 500);
  }
});
```

---

## 🎯 **WHAT THIS FIXES**

After adding these endpoints:

✅ **Dashboard** - Stats will load  
✅ **Buses Tab** - Can add, edit, delete buses  
✅ **Routes Tab** - Can add, edit, delete routes  
✅ **Drivers Tab** - Already working (you added this!)  
✅ **Students Tab** - Can assign students to routes  
✅ **Dropdowns** - Drivers and routes will populate when adding buses  

---

## 📍 **WHERE TO PASTE**

1. Open `/supabase/functions/server/index.tsx`
2. Scroll to the VERY END of the file
3. Find where you added the driver endpoints
4. Paste this code **RIGHT AFTER the driver endpoints**
5. Make sure it's **BEFORE** any `Deno.serve()` or `export` statement
6. Save and deploy!

---

## ✅ **QUICK TEST**

After deploying:

1. **Refresh your browser**
2. **Login as transport_manager**
3. **Go to Buses tab** → Click "Add Bus"
4. **Check the Driver dropdown** → Should show drivers now!
5. **Fill the form** → Click Save
6. **Should work!** ✅

---

**Copy ALL the code above and add it to your server file!** 🚀
