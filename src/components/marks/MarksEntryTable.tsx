import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Badge } from "../ui/badge";
import { Alert, AlertDescription } from "../ui/alert";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "../ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../ui/table";
import {
  Save,
  Send,
  Calculator,
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner@2.0.3";

export interface StudentMark {
  studentId: string;
  studentName: string;
  admissionNumber: string;
  midterm: {
    ca1: number | null;
    ca2: number | null;
    exam: number | null;
    total: number | null;
  };
  terminal: {
    ca1: number | null; // Auto-filled: (midterm ca1 + ca2 + exam) / 2
    ca2: number | null; // Manual entry
    exam: number | null; // Manual entry
    total: number | null;
  };
  status:
    | "draft"
    | "submitted"
    | "reviewed"
    | "approved"
    | "rejected";
  lastModified: Date;
  rejectionComment?: string;
}

export interface MarksEntryData {
  id: string;
  subject: string;
  class: string;
  teacher: string;
  academicYear: string;
  term: string;
  students: StudentMark[];
  status:
    | "draft"
    | "submitted"
    | "reviewed"
    | "approved"
    | "rejected";
  submittedAt?: Date;
  reviewedAt?: Date;
  approvedAt?: Date;
}

interface MarksEntryTableProps {
  marksData: MarksEntryData;
  onSaveMidterm: (data: MarksEntryData) => void;
  onSaveTerminal: (data: MarksEntryData) => void;
  onSubmitMidterm: (data: MarksEntryData) => void;
  onSubmitTerminal: (data: MarksEntryData) => void;
  userRole: "teacher" | "principal" | "admin";
  readOnly?: boolean;
  isSubmitting?: boolean;
}

export function MarksEntryTable({
  marksData,
  onSaveMidterm,
  onSaveTerminal,
  onSubmitMidterm,
  onSubmitTerminal,
  userRole,
  readOnly = false,
  isSubmitting = false,
}: MarksEntryTableProps) {
  const [activeTab, setActiveTab] = useState<
    "midterm" | "terminal"
  >("midterm");
  const [students, setStudents] = useState<StudentMark[]>(
    marksData.students,
  );
  const [hasUnsavedChanges, setHasUnsavedChanges] =
    useState(false);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5; // Set to 5 to see pagination with smaller classes (change to 10 for production)

  // Auto-calculate totals whenever marks change
  const calculateTotals = (studentsList: StudentMark[]) => {
    console.log('[calculateTotals] ===== CALCULATING =====');
    
    return studentsList.map((student) => {
      const result = {
        ...student,
        midterm: { ...student.midterm },
        terminal: { ...student.terminal },
      };

      // Calculate midterm total
      const hasMidtermData =
        result.midterm.ca1 !== null &&
        result.midterm.ca2 !== null &&
        result.midterm.exam !== null;

      if (hasMidtermData) {
        result.midterm.total =
          result.midterm.ca1 +
          result.midterm.ca2 +
          result.midterm.exam;

        // ✅ FIXED: ALWAYS auto-calculate Terminal CA1 from current midterm values
        // Formula: (CA1 + CA2 + Exam) ÷ 2
        result.terminal.ca1 = result.midterm.total / 2;
        console.log(`[calculateTotals] ${student.studentName}: Auto-calculated Terminal CA1 = (${result.midterm.ca1} + ${result.midterm.ca2} + ${result.midterm.exam}) ÷ 2 = ${result.terminal.ca1}`);
      } else {
        result.midterm.total = null;
        result.terminal.ca1 = null; // Clear Terminal CA1 if no midterm data
        console.log(`[calculateTotals] ${student.studentName}: No midterm data, Terminal CA1 cleared`);
      }

      // Calculate terminal total
      if (
        result.terminal.ca1 !== null &&
        result.terminal.ca2 !== null &&
        result.terminal.exam !== null
      ) {
        result.terminal.total =
          result.terminal.ca1 +
          result.terminal.ca2 +
          result.terminal.exam;
      } else {
        result.terminal.total = null;
      }

      return result;
    });
  };

  // Recalculate when data changes
  useEffect(() => {
    if (marksData.students && marksData.students.length > 0) {
      console.log('[MarksEntryTable] Loading student data...');
      console.log('[MarksEntryTable] Raw data from DB:', marksData.students);
      
      // ✅ FIXED: Just calculate totals - the calculateTotals function
      // will auto-fill Terminal CA1 ONLY if it's null
      const calculated = calculateTotals(marksData.students);
      console.log('[MarksEntryTable] After calculateTotals:', calculated);
      setStudents(calculated);
    }
  }, [marksData.students]);

  const updateStudentMark = (
    studentId: string,
    term: "midterm" | "terminal",
    field: string,
    value: number | null,
  ) => {
    if (readOnly) return;

    setStudents((prev) => {
      const updated = prev.map((student) => {
        if (student.studentId === studentId) {
          return {
            ...student,
            [term]: {
              ...student[term],
              [field]: value,
            },
            lastModified: new Date(),
          };
        }
        return student;
      });

      // ✅ FIXED: Recalculate totals - Terminal CA1 only auto-fills if null
      return calculateTotals(updated);
    });

    setHasUnsavedChanges(true);
  };

  const validateMarks = (term: "midterm" | "terminal") => {
    const limits =
      term === "midterm"
        ? { ca1: 10, ca2: 10, exam: 20 }
        : { ca1: 20, ca2: 20, exam: 60 };

    return students.every((student) => {
      const marks = student[term];
      
      // For terminal, CA1 is auto-calculated, so we don't validate it manually
      if (term === "terminal") {
        return (
          (marks.ca2 === null || (marks.ca2 >= 0 && marks.ca2 <= limits.ca2)) &&
          (marks.exam === null || (marks.exam >= 0 && marks.exam <= limits.exam))
        );
      }
      
      // For midterm, validate all fields
      return (
        (marks.ca1 === null || (marks.ca1 >= 0 && marks.ca1 <= limits.ca1)) &&
        (marks.ca2 === null || (marks.ca2 >= 0 && marks.ca2 <= limits.ca2)) &&
        (marks.exam === null || (marks.exam >= 0 && marks.exam <= limits.exam))
      );
    });
  };

  const getCompletionStats = (term: "midterm" | "terminal") => {
    let completed = 0;
    
    students.forEach((student) => {
      if (term === "midterm") {
        if (
          student.midterm.ca1 !== null &&
          student.midterm.ca2 !== null &&
          student.midterm.exam !== null
        ) {
          completed++;
        }
      } else {
        // Terminal only requires CA2 and Exam (CA1 is auto)
        if (
          student.terminal.ca2 !== null &&
          student.terminal.exam !== null
        ) {
          completed++;
        }
      }
    });

    return {
      completed,
      total: students.length,
      percentage: Math.round(
        (completed / students.length) * 100,
      ),
    };
  };

  // 🔥 SEPARATE HANDLERS FOR MIDTERM
  const handleSaveMidterm = () => {
    console.log('[handleSaveMidterm] Saving midterm scores...');
    console.log('[handleSaveMidterm] Students:', students);
    
    const updatedData = { ...marksData, students };
    onSaveMidterm(updatedData);
    setHasUnsavedChanges(false);
    toast.success("Midterm scores saved as draft");
  };

  const handleSubmitMidterm = () => {
    if (!validateMarks("midterm")) {
      toast.error("Please correct invalid midterm marks before submitting");
      return;
    }

    const stats = getCompletionStats("midterm");
    if (stats.completed === 0) {
      toast.error("Please enter at least one student's midterm marks");
      return;
    }

    console.log('[handleSubmitMidterm] Submitting midterm scores...');
    console.log('[handleSubmitMidterm] Students:', students);

    const updatedData = {
      ...marksData,
      students,
      status: "submitted" as const,
      submittedAt: new Date(),
    };
    onSubmitMidterm(updatedData);
    setHasUnsavedChanges(false);
    // ✅ Toast moved to MarksModule after backend confirms success
  };

  // 🔥 SEPARATE HANDLERS FOR TERMINAL
  const handleSaveTerminal = () => {
    console.log('[handleSaveTerminal] Saving terminal scores...');
    console.log('[handleSaveTerminal] Students:', students);
    
    const updatedData = { ...marksData, students };
    onSaveTerminal(updatedData);
    setHasUnsavedChanges(false);
    toast.success("Terminal scores saved as draft");
  };

  const handleSubmitTerminal = () => {
    if (!validateMarks("terminal")) {
      toast.error("Please correct invalid terminal marks before submitting");
      return;
    }

    const stats = getCompletionStats("terminal");
    if (stats.completed === 0) {
      toast.error("Please enter at least one student's terminal marks");
      return;
    }

    console.log('[handleSubmitTerminal] Submitting terminal scores...');
    console.log('[handleSubmitTerminal] Students:', students);

    const updatedData = {
      ...marksData,
      students,
      status: "submitted" as const,
      submittedAt: new Date(),
    };
    onSubmitTerminal(updatedData);
    setHasUnsavedChanges(false);
    // ✅ Toast moved to MarksModule after backend confirms success
  };

  const midtermStats = getCompletionStats("midterm");
  const terminalStats = getCompletionStats("terminal");

  // Pagination calculations
  const totalPages = Math.ceil(students.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentStudents = students.slice(startIndex, endIndex);

  // Reset to page 1 when students change
  useEffect(() => {
    setCurrentPage(1);
  }, [students.length]);

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <CardTitle className="text-lg sm:text-xl">Enter Student Marks</CardTitle>
            <p className="text-muted-foreground mt-1 text-sm">
              {marksData.class} - {marksData.subject}
            </p>
          </div>
          <div className="flex gap-2">
            <Badge variant="outline">
              {students.length} Students
            </Badge>
            <Badge
              variant={
                marksData.status === "approved"
                  ? "default"
                  : marksData.status === "submitted" || marksData.status === "pending_approval"
                  ? "destructive"
                  : "outline"
              }
              className={
                marksData.status === "pending_approval"
                  ? "bg-red-600 text-white hover:bg-red-700"
                  : ""
              }
            >
              {marksData.status === "pending_approval" ? "Pending Approval" : marksData.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <Tabs
          value={activeTab}
          onValueChange={(v) =>
            setActiveTab(v as "midterm" | "terminal")
          }
        >
          <TabsList className="grid w-full grid-cols-2 h-auto gap-2">
            <TabsTrigger value="midterm" className="flex flex-col items-center justify-center gap-1 py-3 px-2 h-auto min-h-[60px]">
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Calculator className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium leading-tight text-center">Midterm</span>
              </div>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 mt-1">
                {midtermStats.percentage}%
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="terminal" className="flex flex-col items-center justify-center gap-1 py-3 px-2 h-auto min-h-[60px]">
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <Calculator className="h-4 w-4 flex-shrink-0" />
                <span className="text-xs font-medium leading-tight text-center">Terminal</span>
              </div>
              <Badge variant="secondary" className="text-xs px-2 py-0.5 mt-1">
                {terminalStats.percentage}%
              </Badge>
            </TabsTrigger>
          </TabsList>

          {/* 🔥 MIDTERM TAB */}
          <TabsContent value="midterm" className="space-y-4">
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Midterm Marks:</strong> CA1 (10 marks), CA2 (10 marks), Exam (20 marks).
                <br />
                Terminal CA1 will be auto-calculated as: <strong>(CA1 + CA2 + Exam) ÷ 2</strong>
              </AlertDescription>
            </Alert>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Student</TableHead>
                    <TableHead className="text-center">Admission No</TableHead>
                    <TableHead className="text-center">CA1 (10)</TableHead>
                    <TableHead className="text-center">CA2 (10)</TableHead>
                    <TableHead className="text-center">Exam (20)</TableHead>
                    <TableHead className="text-center">Total (40)</TableHead>
                    <TableHead className="text-center">Terminal CA1 (Preview)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentStudents.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">
                        {student.studentName}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={student.midterm.ca1 ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseFloat(e.target.value)
                              : null;
                            updateStudentMark(
                              student.studentId,
                              "midterm",
                              "ca1",
                              val,
                            );
                          }}
                          disabled={readOnly}
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="10"
                          value={student.midterm.ca2 ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseFloat(e.target.value)
                              : null;
                            updateStudentMark(
                              student.studentId,
                              "midterm",
                              "ca2",
                              val,
                            );
                          }}
                          disabled={readOnly}
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={student.midterm.exam ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseFloat(e.target.value)
                              : null;
                            updateStudentMark(
                              student.studentId,
                              "midterm",
                              "exam",
                              val,
                            );
                          }}
                          disabled={readOnly}
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {student.midterm.total ?? "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="secondary">
                          {student.terminal.ca1 !== null ? student.terminal.ca1 : "-"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls for Midterm */}
            {students.length > itemsPerPage && (
              <div className="flex items-center justify-between px-2">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, students.length)} of {students.length} students
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* 🔥 MIDTERM BUTTONS */}
            {!readOnly && (
              <div className="flex flex-col sm:flex-row justify-end gap-3 px-2">
                <Button
                  variant="outline"
                  onClick={handleSaveMidterm}
                  disabled={!hasUnsavedChanges || isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Midterm Draft
                </Button>
                <Button
                  onClick={handleSubmitMidterm}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Midterm Scores
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm px-2">
              <span className="text-muted-foreground">
                Progress: {midtermStats.completed} / {midtermStats.total} students completed
              </span>
              {hasUnsavedChanges && (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Unsaved changes
                </span>
              )}
            </div>
          </TabsContent>

          {/* 🔥 TERMINAL TAB */}
          <TabsContent value="terminal" className="space-y-4">
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Terminal Marks:</strong> CA1 (auto-filled from midterm), CA2 (20 marks), Exam (60 marks).
                <br />
                <strong>Note:</strong> You must enter Midterm scores first before Terminal CA1 can be calculated.
              </AlertDescription>
            </Alert>

            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Student</TableHead>
                    <TableHead className="text-center">Admission No</TableHead>
                    <TableHead className="text-center">CA1 (20) [Auto]</TableHead>
                    <TableHead className="text-center">CA2 (20)</TableHead>
                    <TableHead className="text-center">Exam (60)</TableHead>
                    <TableHead className="text-center">Total (100)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {currentStudents.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="font-medium">
                        {student.studentName}
                      </TableCell>
                      <TableCell className="text-center">
                        {student.admissionNumber}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="font-semibold">
                          {student.terminal.ca1 !== null ? student.terminal.ca1 : "-"}
                        </Badge>
                        <div className="text-xs text-muted-foreground mt-1">
                          Auto-calculated
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="20"
                          value={student.terminal.ca2 ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseFloat(e.target.value)
                              : null;
                            updateStudentMark(
                              student.studentId,
                              "terminal",
                              "ca2",
                              val,
                            );
                          }}
                          disabled={readOnly || student.terminal.ca1 === null}
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          min="0"
                          max="60"
                          value={student.terminal.exam ?? ""}
                          onChange={(e) => {
                            const val = e.target.value
                              ? parseFloat(e.target.value)
                              : null;
                            updateStudentMark(
                              student.studentId,
                              "terminal",
                              "exam",
                              val,
                            );
                          }}
                          disabled={readOnly || student.terminal.ca1 === null}
                          className="w-20 text-center"
                        />
                      </TableCell>
                      <TableCell className="text-center font-semibold">
                        {student.terminal.total ?? "-"}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Pagination Controls for Terminal */}
            {students.length > itemsPerPage && (
              <div className="flex items-center justify-between px-2">
                <div className="text-sm text-muted-foreground">
                  Showing {startIndex + 1} to {Math.min(endIndex, students.length)} of {students.length} students
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToPreviousPage}
                    disabled={currentPage === 1}
                  >
                    <ChevronLeft className="h-4 w-4 mr-1" />
                    Previous
                  </Button>
                  <div className="text-sm">
                    Page {currentPage} of {totalPages}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={goToNextPage}
                    disabled={currentPage === totalPages}
                  >
                    Next
                    <ChevronRight className="h-4 w-4 ml-1" />
                  </Button>
                </div>
              </div>
            )}

            {/* 🔥 TERMINAL BUTTONS */}
            {!readOnly && (
              <div className="flex flex-col sm:flex-row justify-end gap-3 px-2">
                <Button
                  variant="outline"
                  onClick={handleSaveTerminal}
                  disabled={!hasUnsavedChanges || isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save Terminal Draft
                </Button>
                <Button
                  onClick={handleSubmitTerminal}
                  disabled={isSubmitting}
                  className="w-full sm:w-auto"
                >
                  <Send className="mr-2 h-4 w-4" />
                  Submit Terminal Scores
                </Button>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-sm px-2">
              <span className="text-muted-foreground">
                Progress: {terminalStats.completed} / {terminalStats.total} students completed
              </span>
              {hasUnsavedChanges && (
                <span className="text-amber-600 flex items-center gap-1">
                  <AlertTriangle className="h-4 w-4" />
                  Unsaved changes
                </span>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}