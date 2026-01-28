import React, { useState, useEffect } from "react";
import { Card } from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { Checkbox } from "../ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import { Alert, AlertDescription } from "../ui/alert";
import {
  BookOpen,
  Users,
  CheckCircle2,
  XCircle,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  UserCheck,
  AlertCircle,
  Search,
} from "lucide-react";
import { toast } from "sonner@2.0.3";
import { projectId, publicAnonKey } from "../../utils/supabase/info";
import { supabase } from "../../utils/supabase/client";

interface Class {
  id: string;
  name: string;
  level: "junior" | "senior";
  display_name?: string;
  section_name?: string;
}

interface Subject {
  id: string;
  name: string;
  code: string;
  level: "junior" | "senior";
}

interface ClassSubject {
  id: string;
  class_id: string;
  subject_id: string;
  is_compulsory: boolean;
  subject: Subject;
  student_count?: number;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  admission_number: string;
  class_id: string;
}

interface StudentSubject {
  id: string;
  student_id: string;
  subject_id: string;
  subject: Subject;
  status: "active" | "dropped" | "completed";
}

export default function SubjectOfferingsManager() {
  const [activeTab, setActiveTab] = useState("class-subjects");
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [selectedStudentClassId, setSelectedStudentClassId] = useState("");
  const [classSubjects, setClassSubjects] = useState<ClassSubject[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentSubjects, setStudentSubjects] = useState<StudentSubject[]>([]);
  const [currentSession, setCurrentSession] = useState("");
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [assignDialogOpen, setAssignDialogOpen] = useState(false);

  // Fetch current session
  useEffect(() => {
    fetchCurrentSession();
  }, []);

  // Fetch classes and subjects on mount
  useEffect(() => {
    fetchClasses();
    fetchSubjects();
  }, []);

  // Fetch class subjects when class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchClassSubjects(selectedClassId);
    }
  }, [selectedClassId]);

  // Fetch students and class subjects when class is selected in Student Subjects tab
  useEffect(() => {
    if (selectedStudentClassId) {
      fetchStudents(selectedStudentClassId);
      fetchClassSubjects(selectedStudentClassId);
    }
  }, [selectedStudentClassId]);

  // Fetch student subjects when student is selected
  useEffect(() => {
    if (selectedStudent && currentSession) {
      fetchStudentSubjects(selectedStudent.id, currentSession);
    }
  }, [selectedStudent, currentSession]);

  const fetchCurrentSession = async () => {
    try {
      console.log("[SubjectOfferings] Fetching current session...");
      
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.warn("[SubjectOfferings] No access token found");
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      console.log("[SubjectOfferings] Session settings response:", data);
      
      if (data.success) {
        // New format: sessions array from academic calendar
        if (data.sessions && Array.isArray(data.sessions)) {
          const currentSession = data.sessions.find((s: any) => s.is_current);
          if (currentSession) {
            const session = currentSession.session_name || "";
            console.log("Current session set to:", session);
            setCurrentSession(session);
            
            if (!session) {
              console.warn("Warning: Session name is empty.");
            }
          } else {
            console.warn("Warning: No current session found in sessions array.");
            setCurrentSession("");
            toast.warning("No active session configured. Please set the current session in Academic Calendar.");
          }
        }
        // Old format: settings object (fallback for backward compatibility)
        else if (data.settings && data.settings.session) {
          const session = data.settings.session || "";
          console.log("Current session set to (old format):", session);
          setCurrentSession(session);
          
          if (!session) {
            console.warn("Warning: Session is empty. Please configure session in Settings.");
          }
        }
        // No session data at all
        else {
          console.warn("Warning: No session data in response.");
          setCurrentSession("");
          toast.warning("No session configured. Please set up the academic calendar.");
        }
      } else {
        console.error("Failed to fetch session settings:", data);
        setCurrentSession("");
      }
    } catch (error) {
      console.error("Error fetching session:", error);
      toast.error("Failed to fetch current session. Please refresh the page.");
    }
  };

  const fetchClasses = async () => {
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      console.log("[SubjectOfferings] Classes fetch response:", data);
      if (data.success) {
        setClasses(data.classes || []);
      } else {
        console.error("[SubjectOfferings] Failed to fetch classes:", data.error);
        toast.error(`Failed to fetch classes: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("[SubjectOfferings] Error fetching classes:", error);
      toast.error("Failed to fetch classes");
    }
  };

  const fetchSubjects = async () => {
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/subjects`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      console.log("[SubjectOfferings] Subjects fetch response:", data);
      if (data.success) {
        setSubjects(data.subjects || []);
      } else {
        console.error("[SubjectOfferings] Failed to fetch subjects:", data.error);
        toast.error(`Failed to fetch subjects: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      console.error("[SubjectOfferings] Error fetching subjects:", error);
      toast.error("Failed to fetch subjects");
    }
  };

  const fetchClassSubjects = async (classId: string) => {
    setLoading(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-subjects?class_id=${classId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setClassSubjects(data.classSubjects || []);
        if (data.warning) {
          toast.warning(data.warning);
        }
      } else {
        toast.error(data.error || "Failed to fetch class subjects");
      }
    } catch (error) {
      console.error("Error fetching class subjects:", error);
      toast.error("Failed to fetch class subjects. Server may be offline.");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async (classId: string) => {
    setLoading(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students?class_id=${classId}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setStudents(data.students || []);
      }
    } catch (error) {
      console.error("Error fetching students:", error);
      toast.error("Failed to fetch students");
    } finally {
      setLoading(false);
    }
  };

  const fetchStudentSubjects = async (studentId: string, sessionStr: string) => {
    setLoading(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-subjects?student_id=${studentId}&session=${sessionStr}`,
        {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );
      const data = await response.json();
      if (data.success) {
        setStudentSubjects(data.studentSubjects || []);
        if (data.warning) {
          toast.warning(data.warning);
        }
      } else {
        toast.error(data.error || "Failed to fetch student subjects");
      }
    } catch (error) {
      console.error("Error fetching student subjects:", error);
      toast.error("Failed to fetch student subjects. Server may be offline.");
    } finally {
      setLoading(false);
    }
  };

  const addSubjectToClass = async (subjectId: string, isCompulsory: boolean) => {
    if (!selectedClassId) {
      toast.error("Please select a class first");
      return;
    }

    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-subjects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            class_id: selectedClassId,
            subject_id: subjectId,
            is_compulsory: isCompulsory,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Subject added to class");
        fetchClassSubjects(selectedClassId);
      } else {
        toast.error(data.error || "Failed to add subject");
      }
    } catch (error) {
      console.error("Error adding subject:", error);
      toast.error("Failed to add subject to class");
    }
  };

  const removeSubjectFromClass = async (classSubjectId: string) => {
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-subjects/${classSubjectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Subject removed from class");
        fetchClassSubjects(selectedClassId);
      } else {
        toast.error(data.error || "Failed to remove subject");
      }
    } catch (error) {
      console.error("Error removing subject:", error);
      toast.error("Failed to remove subject");
    }
  };

  const toggleCompulsory = async (classSubjectId: string, isCompulsory: boolean) => {
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/class-subjects/${classSubjectId}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            is_compulsory: !isCompulsory,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(
          !isCompulsory
            ? "Subject marked as compulsory"
            : "Subject marked as optional"
        );
        fetchClassSubjects(selectedClassId);
      } else {
        toast.error(data.error || "Failed to update subject");
      }
    } catch (error) {
      console.error("Error updating subject:", error);
      toast.error("Failed to update subject");
    }
  };

  const autoAssignCompulsorySubjects = async () => {
    if (!selectedClassId || !currentSession) {
      toast.error("Please select a class and ensure session is set");
      return;
    }

    setLoading(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/auto-assign-compulsory`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            class_id: selectedClassId,
            session: currentSession,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Assigned ${data.count} compulsory subjects to students`);
      } else {
        toast.error(data.error || "Failed to auto-assign subjects");
      }
    } catch (error) {
      console.error("Error auto-assigning:", error);
      toast.error("Failed to auto-assign compulsory subjects");
    } finally {
      setLoading(false);
    }
  };

  const assignSubjectToStudent = async (subjectId: string) => {
    // Better error checking with specific messages
    if (!selectedStudent) {
      console.error("Assignment failed: No student selected");
      toast.error("No student selected. Please select a student first.");
      return;
    }
    
    if (!currentSession) {
      console.error("Assignment failed: No session configured");
      toast.error("No active session configured. Please set the current session in Settings.");
      return;
    }

    console.log("Assigning subject:", {
      subjectId,
      studentId: selectedStudent.id,
      studentName: `${selectedStudent.first_name} ${selectedStudent.last_name}`,
      classId: selectedStudent.class_id,
      session: currentSession
    });

    setLoading(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const subjectName = classSubjects.find(cs => cs.subject_id === subjectId)?.subject.name || "Subject";

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-subjects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            student_id: selectedStudent.id,
            subject_id: subjectId,
            class_id: selectedStudent.class_id,
            session: currentSession,
          }),
        }
      );

      const data = await response.json();
      console.log("Assignment response:", data);
      
      if (data.success) {
        toast.success(`${subjectName} successfully assigned to ${selectedStudent.first_name} ${selectedStudent.last_name}`);
        await fetchStudentSubjects(selectedStudent.id, currentSession);
        setAssignDialogOpen(false);
      } else {
        console.error("Assignment failed:", data.error);
        toast.error(data.error || "Failed to assign subject");
      }
    } catch (error) {
      console.error("Error assigning subject:", error);
      toast.error("Failed to assign subject. Please check console for details.");
    } finally {
      setLoading(false);
    }
  };

  const removeSubjectFromStudent = async (studentSubjectId: string) => {
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-subjects/${studentSubjectId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success("Subject removed from student");
        if (selectedStudent && currentSession) {
          fetchStudentSubjects(selectedStudent.id, currentSession);
        }
      } else {
        toast.error(data.error || "Failed to remove subject");
      }
    } catch (error) {
      console.error("Error removing subject:", error);
      toast.error("Failed to remove subject");
    }
  };

  const bulkAssignSubjects = async (studentIds: string[], subjectIds: string[]) => {
    if (!currentSession) {
      toast.error("Session not set");
      return;
    }

    setLoading(true);
    try {
      // Get access token
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required. Please log in again.");
        setLoading(false);
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/bulk-assign-subjects`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${session.access_token}`,
          },
          body: JSON.stringify({
            student_ids: studentIds,
            subject_ids: subjectIds,
            class_id: selectedStudentClassId,
            session: currentSession,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success(`Assigned ${data.count} subject assignments`);
        fetchStudents(selectedStudentClassId);
      } else {
        toast.error(data.error || "Failed to bulk assign");
      }
    } catch (error) {
      console.error("Error bulk assigning:", error);
      toast.error("Failed to bulk assign subjects");
    } finally {
      setLoading(false);
    }
  };

  // Get available subjects for selected class (filter by level)
  const getAvailableSubjectsForClass = () => {
    if (!selectedClassId) return [];
    
    const selectedClass = classes.find((c) => c.id === selectedClassId);
    if (!selectedClass) return [];

    console.log('[SubjectOfferings] Selected Class:', selectedClass);
    console.log('[SubjectOfferings] All Subjects:', subjects);

    // Filter subjects by level and exclude already assigned
    const assignedSubjectIds = new Set(classSubjects.map((cs) => cs.subject_id));
    
    console.log('[SubjectOfferings] Assigned Subject IDs:', Array.from(assignedSubjectIds));
    console.log('[SubjectOfferings] Class Level:', selectedClass.level);

    const availableSubjects = subjects.filter(
      (s) =>
        s.level?.toLowerCase() === selectedClass.level?.toLowerCase() && !assignedSubjectIds.has(s.id)
    );

    console.log('[SubjectOfferings] Available Subjects:', availableSubjects);
    
    return availableSubjects;
  };

  // Get available subjects for student (from class subjects)
  const getAvailableSubjectsForStudent = () => {
    if (!selectedStudent) return [];
    
    const assignedSubjectIds = new Set(studentSubjects.map((ss) => ss.subject_id));
    
    // Get class subjects for this student's class
    return classSubjects
      .filter((cs) => !assignedSubjectIds.has(cs.subject_id))
      .map((cs) => cs.subject);
  };

  // Filter students by search query
  const filteredStudents = students.filter((student) => {
    const fullName = `${student.first_name || ''} ${student.last_name || ''}`.toLowerCase();
    const admissionNumber = student.admission_number || '';
    const query = searchQuery.toLowerCase();
    return (
      fullName.includes(query) ||
      admissionNumber.toLowerCase().includes(query)
    );
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl">Subject Offerings Management</h2>
          <p className="text-sm text-muted-foreground">
            Configure which subjects are available for classes and assign subjects to
            students
          </p>
        </div>
        {currentSession && (
          <Badge variant="outline" className="text-sm w-fit">
            Current Session: {currentSession}
          </Badge>
        )}
      </div>

      {/* Session Warning Alert */}
      {!currentSession && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>No active session configured!</strong> Subject assignments require an active session. 
            Please go to Session Settings and set the current session before assigning subjects to students.
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="class-subjects" className="text-xs sm:text-sm">
            <BookOpen className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Class Subjects</span>
            <span className="xs:hidden">Classes</span>
          </TabsTrigger>
          <TabsTrigger value="student-subjects" className="text-xs sm:text-sm">
            <Users className="mr-1 sm:mr-2 h-4 w-4" />
            <span className="hidden xs:inline">Student Subjects</span>
            <span className="xs:hidden">Students</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Class Subjects Configuration */}
        <TabsContent value="class-subjects" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="space-y-4">
              <div>
                <Label className="text-sm">Select Class</Label>
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Choose a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.display_name || cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedClassId && (
                <>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      Configure which subjects are available for this class
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={autoAssignCompulsorySubjects}
                      disabled={loading}
                      className="w-full sm:w-auto text-xs"
                    >
                      <UserCheck className="mr-2 h-4 w-4" />
                      <span className="hidden sm:inline">Auto-Assign Compulsory to All Students</span>
                      <span className="sm:hidden">Auto-Assign</span>
                    </Button>
                  </div>

                  {/* Add Subject Dialog */}
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Subject to Class
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Add Subject to Class</DialogTitle>
                        <DialogDescription>
                          Select a subject to add to this class's subject pool
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        {getAvailableSubjectsForClass().length === 0 ? (
                          <Alert>
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription>
                              All available subjects have been added to this class
                            </AlertDescription>
                          </Alert>
                        ) : (
                          getAvailableSubjectsForClass().map((subject) => (
                            <div
                              key={subject.id}
                              className="flex items-center justify-between p-3 border rounded-lg"
                            >
                              <div>
                                <p>{subject.name}</p>
                                <p className="text-sm text-muted-foreground">
                                  {subject.code}
                                </p>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => addSubjectToClass(subject.id, false)}
                                >
                                  Add as Optional
                                </Button>
                                <Button
                                  size="sm"
                                  onClick={() => addSubjectToClass(subject.id, true)}
                                >
                                  Add as Compulsory
                                </Button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </DialogContent>
                  </Dialog>

                  {/* Class Subjects Table */}
                  <Card>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="min-w-[150px]">Subject</TableHead>
                            <TableHead className="min-w-[80px]">Code</TableHead>
                            <TableHead className="min-w-[100px]">Type</TableHead>
                            <TableHead className="min-w-[80px]">Students</TableHead>
                            <TableHead className="min-w-[80px]">Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {loading ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center">
                                <RefreshCw className="h-4 w-4 animate-spin mx-auto" />
                              </TableCell>
                            </TableRow>
                          ) : classSubjects.length === 0 ? (
                            <TableRow>
                              <TableCell colSpan={5} className="text-center text-sm">
                                No subjects configured for this class
                              </TableCell>
                            </TableRow>
                          ) : (
                            classSubjects.map((cs) => (
                              <TableRow key={cs.id}>
                                <TableCell className="font-medium text-sm">{cs.subject.name}</TableCell>
                                <TableCell className="text-sm">{cs.subject.code}</TableCell>
                                <TableCell>
                                  <Badge
                                    variant={cs.is_compulsory ? "default" : "outline"}
                                    className="cursor-pointer text-xs"
                                    onClick={() =>
                                      toggleCompulsory(cs.id, cs.is_compulsory)
                                    }
                                  >
                                    {cs.is_compulsory ? "Compulsory" : "Optional"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-1">
                                    <Users className="h-3 w-3 text-muted-foreground" />
                                    <span className="text-xs">
                                      {cs.student_count !== undefined ? cs.student_count : '—'}
                                    </span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => removeSubjectFromClass(cs.id)}
                                  >
                                    <Trash2 className="h-4 w-4 text-destructive" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </Card>
                </>
              )}
            </div>
          </Card>
        </TabsContent>

        {/* Tab 2: Student Subject Assignment */}
        <TabsContent value="student-subjects" className="space-y-4">
          <Card className="p-4 sm:p-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm">Select Class</Label>
                  <Select
                    value={selectedStudentClassId}
                    onValueChange={setSelectedStudentClassId}
                  >
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Choose a class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.display_name || cls.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-sm">Search Students</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by name or admission number"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              {selectedStudentClassId && (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  {/* Students List */}
                  <Card className="p-3 sm:p-4">
                    <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold">Students</h3>
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {loading ? (
                        <div className="text-center py-8">
                          <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                        </div>
                      ) : filteredStudents.length === 0 ? (
                        <p className="text-xs sm:text-sm text-muted-foreground text-center py-8">
                          No students found
                        </p>
                      ) : (
                        filteredStudents.map((student) => (
                          <button
                            key={student.id}
                            onClick={() => setSelectedStudent(student)}
                            className={`w-full text-left p-2 sm:p-3 rounded-lg border transition-colors ${
                              selectedStudent?.id === student.id
                                ? "bg-primary text-primary-foreground"
                                : "hover:bg-muted"
                            }`}
                          >
                            <p className="text-sm sm:text-base font-medium">
                              {student.first_name} {student.last_name}
                            </p>
                            <p className="text-xs sm:text-sm opacity-80">
                              {student.admission_number}
                            </p>
                          </button>
                        ))
                      )}
                    </div>
                  </Card>

                  {/* Student Subjects */}
                  <Card className="p-3 sm:p-4">
                    <h3 className="mb-3 sm:mb-4 text-sm sm:text-base font-semibold">
                      {selectedStudent
                        ? `Subjects for ${selectedStudent.first_name} ${selectedStudent.last_name}`
                        : "Select a student"}
                    </h3>

                    {selectedStudent && (
                      <>
                        {/* Add Subject Dialog */}
                        <Dialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen}>
                          <DialogTrigger asChild>
                            <Button className="mb-4 w-full">
                              <Plus className="mr-2 h-4 w-4" />
                              Assign Subject
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>
                                Assign Subjects to {selectedStudent.first_name} {selectedStudent.last_name}
                              </DialogTitle>
                              <DialogDescription>
                                Select from available subjects for this class. Click on a subject to assign it.
                              </DialogDescription>
                            </DialogHeader>
                            
                            {/* Session Warning */}
                            {!currentSession && (
                              <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                  No active session configured. Please set the current session in Session Settings before assigning subjects.
                                </AlertDescription>
                              </Alert>
                            )}

                            <div className="space-y-2">
                              {loading ? (
                                <div className="text-center py-8">
                                  <RefreshCw className="h-6 w-6 animate-spin mx-auto" />
                                  <p className="text-sm text-muted-foreground mt-2">Loading subjects...</p>
                                </div>
                              ) : getAvailableSubjectsForStudent().length === 0 ? (
                                <Alert>
                                  <AlertCircle className="h-4 w-4" />
                                  <AlertDescription>
                                    {classSubjects.length === 0
                                      ? "No subjects configured for this class. Please configure class subjects first in the Class Subjects tab."
                                      : "All class subjects have been assigned to this student."}
                                  </AlertDescription>
                                </Alert>
                              ) : (
                                getAvailableSubjectsForStudent().map((subject) => (
                                  <button
                                    key={subject.id}
                                    onClick={() => assignSubjectToStudent(subject.id)}
                                    disabled={loading}
                                    className="w-full text-left p-3 rounded-lg border hover:bg-primary/10 hover:border-primary transition-all cursor-pointer group disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="group-hover:text-primary transition-colors">{subject.name}</p>
                                        <p className="text-sm text-muted-foreground">
                                          {subject.code}
                                        </p>
                                      </div>
                                      {loading ? (
                                        <RefreshCw className="h-5 w-5 text-muted-foreground animate-spin" />
                                      ) : (
                                        <Plus className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
                                      )}
                                    </div>
                                  </button>
                                ))
                              )}
                            </div>
                          </DialogContent>
                        </Dialog>

                        {/* Student Subjects List */}
                        <div className="space-y-2">
                          {studentSubjects.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-8">
                              No subjects assigned
                            </p>
                          ) : (
                            studentSubjects.map((ss) => (
                              <div
                                key={ss.id}
                                className="flex items-center justify-between p-3 border rounded-lg"
                              >
                                <div className="flex-1">
                                  <p>{ss.subject.name}</p>
                                  <p className="text-sm text-muted-foreground">
                                    {ss.subject.code}
                                  </p>
                                </div>
                                <Badge
                                  variant={
                                    ss.status === "active"
                                      ? "default"
                                      : ss.status === "completed"
                                      ? "secondary"
                                      : "destructive"
                                  }
                                >
                                  {ss.status}
                                </Badge>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeSubjectFromStudent(ss.id)}
                                  className="ml-2"
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </Card>
                </div>
              )}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}