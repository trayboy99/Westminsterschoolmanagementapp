import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner@2.0.3';
import { 
  DollarSign, 
  Plus, 
  Pencil, 
  Trash2, 
  Save, 
  X, 
  Users, 
  TrendingUp,
  AlertCircle,
  Calculator
} from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface Teacher {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
  phone?: string;
}

interface TeacherSalary {
  id: string;
  teacher_id: string;
  basic_salary: number;
  salary_increase: number;
  allowances: number;
  tax_percentage: number;
  pension_percentage: number;
  other_deductions: number;
  gross_salary: number;
  total_deductions: number;
  net_salary: number;
  session: string;
  effective_date: string;
  notes?: string;
  profiles?: Teacher;
}

interface SalaryFormData {
  teacher_id: string;
  basic_salary: string;
  salary_increase: string;
  allowances: string;
  tax_percentage: string;
  pension_percentage: string;
  other_deductions: string;
  notes: string;
}

export default function DirectorTeacherSalaries() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaries, setSalaries] = useState<TeacherSalary[]>([]);
  const [currentSession, setCurrentSession] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [formData, setFormData] = useState<SalaryFormData>({
    teacher_id: '',
    basic_salary: '',
    salary_increase: '0',
    allowances: '0',
    tax_percentage: '0',
    pension_percentage: '0',
    other_deductions: '0',
    notes: ''
  });

  const [calculatedValues, setCalculatedValues] = useState({
    grossSalary: 0,
    totalDeductions: 0,
    netSalary: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    calculateSalary();
  }, [
    formData.basic_salary,
    formData.salary_increase,
    formData.allowances,
    formData.tax_percentage,
    formData.pension_percentage,
    formData.other_deductions
  ]);

  const calculateSalary = () => {
    const basic = parseFloat(formData.basic_salary) || 0;
    const increase = parseFloat(formData.salary_increase) || 0;
    const allowances = parseFloat(formData.allowances) || 0;
    const taxPct = parseFloat(formData.tax_percentage) || 0;
    const pensionPct = parseFloat(formData.pension_percentage) || 0;
    const otherDeductions = parseFloat(formData.other_deductions) || 0;

    const grossSalary = basic + increase + allowances;
    const taxAmount = (grossSalary * taxPct) / 100;
    const pensionAmount = (grossSalary * pensionPct) / 100;
    const totalDeductions = taxAmount + pensionAmount + otherDeductions;
    const netSalary = grossSalary - totalDeductions;

    setCalculatedValues({
      grossSalary,
      totalDeductions,
      netSalary
    });
  };

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get access token using the same method as other finance components
      let accessToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!accessToken) {
        // Fall back to Supabase client auth
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
      }

      if (!accessToken) {
        console.error('[TeacherSalaries] No auth token found');
        toast.error('Authentication error. Please log in again.');
        setLoading(false);
        return;
      }
      
      // Fetch current session
      const sessionRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/current-academic-calendar`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const sessionData = await sessionRes.json();
      
      if (sessionData.success && sessionData.session) {
        setCurrentSession(sessionData.session.session_name);
      }

      // Fetch all teachers using /users endpoint with role=teacher
      console.log('[TeacherSalaries] Fetching teachers from /users?role=teacher');
      const teachersRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/users?role=teacher`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      console.log('[TeacherSalaries] Response status:', teachersRes.status);
      const teachersData = await teachersRes.json();
      console.log('[TeacherSalaries] Response data:', teachersData);
      
      if (teachersData.success) {
        const teachersList = teachersData.teachers || teachersData.users || [];
        console.log('[TeacherSalaries] Setting teachers:', teachersList.length, 'teachers found');
        setTeachers(teachersList);
      } else {
        console.error('[TeacherSalaries] Failed to fetch teachers:', teachersData.error);
        toast.error(`Failed to load teachers: ${teachersData.error || 'Unknown error'}`);
      }

      // Fetch teacher salaries
      const salariesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-salaries`,
        {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const salariesData = await salariesRes.json();
      
      if (salariesData.success) {
        setSalaries(salariesData.salaries || []);
      }

    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.teacher_id || !formData.basic_salary) {
      toast.error('Please select a teacher and enter basic salary');
      return;
    }

    if (!currentSession) {
      toast.error('No active academic session found');
      return;
    }

    try {
      setSubmitting(true);
      
      // Get access token
      let accessToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!accessToken) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
      }

      if (!accessToken) {
        toast.error('Authentication error. Please log in again.');
        setSubmitting(false);
        return;
      }

      const payload = {
        ...formData,
        session: currentSession
      };

      const url = editingId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-salaries/${editingId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-salaries`;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message || 'Salary saved successfully');
        resetForm();
        fetchData();
      } else {
        toast.error(data.error || 'Failed to save salary');
      }

    } catch (error) {
      console.error('Error saving salary:', error);
      toast.error('Failed to save salary');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (salary: TeacherSalary) => {
    setEditingId(salary.id);
    setFormData({
      teacher_id: salary.teacher_id,
      basic_salary: salary.basic_salary.toString(),
      salary_increase: salary.salary_increase.toString(),
      allowances: salary.allowances.toString(),
      tax_percentage: salary.tax_percentage.toString(),
      pension_percentage: salary.pension_percentage.toString(),
      other_deductions: salary.other_deductions.toString(),
      notes: salary.notes || ''
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this salary record?')) {
      return;
    }

    try {
      // Get access token
      let accessToken = localStorage.getItem('auth_token') || sessionStorage.getItem('auth_token');
      
      if (!accessToken) {
        const { createClient } = await import('../../utils/supabase/client');
        const supabase = createClient();
        const { data: { session } } = await supabase.auth.getSession();
        accessToken = session?.access_token || null;
      }

      if (!accessToken) {
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teacher-salaries/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Salary record deleted successfully');
        fetchData();
      } else {
        toast.error(data.error || 'Failed to delete salary record');
      }

    } catch (error) {
      console.error('Error deleting salary:', error);
      toast.error('Failed to delete salary record');
    }
  };

  const resetForm = () => {
    setFormData({
      teacher_id: '',
      basic_salary: '',
      salary_increase: '0',
      allowances: '0',
      tax_percentage: '0',
      pension_percentage: '0',
      other_deductions: '0',
      notes: ''
    });
    setEditingId(null);
    setCalculatedValues({
      grossSalary: 0,
      totalDeductions: 0,
      netSalary: 0
    });
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const getTeacherName = (teacher?: Teacher) => {
    if (!teacher) return 'Unknown';
    return `${teacher.first_name} ${teacher.middle_name || ''} ${teacher.last_name}`.trim();
  };

  // Calculate statistics
  const totalTeachers = salaries.length;
  const totalPayroll = salaries.reduce((sum, s) => sum + s.net_salary, 0);
  const avgSalary = totalTeachers > 0 ? totalPayroll / totalTeachers : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div>
        <h1 className="flex items-center gap-2">
          <DollarSign className="h-6 w-6" />
          Teacher Salary Structure
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage teacher salaries for {currentSession || 'current session'}
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Teachers</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-600" />
              {totalTeachers}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Total Payroll</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              {formatCurrency(totalPayroll)}
            </CardTitle>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardDescription>Average Salary</CardDescription>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-purple-600" />
              {formatCurrency(avgSalary)}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Salary Entry Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {editingId ? <Pencil className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
            {editingId ? 'Edit Teacher Salary' : 'Add Teacher Salary'}
          </CardTitle>
          <CardDescription>
            Set salary components and deductions for teachers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Teacher Selection */}
            <div className="space-y-2">
              <Label htmlFor="teacher">Select Teacher *</Label>
              <Select
                value={formData.teacher_id}
                onValueChange={(value) => setFormData({ ...formData, teacher_id: value })}
                disabled={editingId !== null}
              >
                <SelectTrigger id="teacher">
                  <SelectValue placeholder="Choose a teacher" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((teacher) => (
                    <SelectItem key={teacher.id} value={teacher.id}>
                      {getTeacherName(teacher)} - {teacher.email}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Salary Components */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="basic_salary">Basic Salary (₦) *</Label>
                <Input
                  id="basic_salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.basic_salary}
                  onChange={(e) => setFormData({ ...formData, basic_salary: e.target.value })}
                  placeholder="150000.00"
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="salary_increase">Salary Increase (₦)</Label>
                <Input
                  id="salary_increase"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.salary_increase}
                  onChange={(e) => setFormData({ ...formData, salary_increase: e.target.value })}
                  placeholder="10000.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowances">Allowances (₦)</Label>
                <Input
                  id="allowances"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.allowances}
                  onChange={(e) => setFormData({ ...formData, allowances: e.target.value })}
                  placeholder="25000.00"
                />
                <p className="text-xs text-muted-foreground">Housing, transport, etc.</p>
              </div>
            </div>

            {/* Deductions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="tax_percentage">Tax (%)</Label>
                <Input
                  id="tax_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.tax_percentage}
                  onChange={(e) => setFormData({ ...formData, tax_percentage: e.target.value })}
                  placeholder="10.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="pension_percentage">Pension (%)</Label>
                <Input
                  id="pension_percentage"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={formData.pension_percentage}
                  onChange={(e) => setFormData({ ...formData, pension_percentage: e.target.value })}
                  placeholder="8.00"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="other_deductions">Other Deductions (₦)</Label>
                <Input
                  id="other_deductions"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.other_deductions}
                  onChange={(e) => setFormData({ ...formData, other_deductions: e.target.value })}
                  placeholder="5000.00"
                />
                <p className="text-xs text-muted-foreground">Loans, advances, etc.</p>
              </div>
            </div>

            {/* Calculated Summary */}
            <Alert className="bg-blue-50 border-blue-200">
              <Calculator className="h-4 w-4 text-blue-600" />
              <AlertDescription>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Gross Salary</p>
                    <p className="text-blue-600">{formatCurrency(calculatedValues.grossSalary)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Total Deductions</p>
                    <p className="text-red-600">- {formatCurrency(calculatedValues.totalDeductions)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Net Salary</p>
                    <p className="text-green-600">{formatCurrency(calculatedValues.netSalary)}</p>
                  </div>
                </div>
              </AlertDescription>
            </Alert>

            {/* Notes */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any notes about this salary structure..."
                rows={3}
              />
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={submitting}>
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Saving...' : editingId ? 'Update Salary' : 'Save Salary'}
              </Button>
              {editingId && (
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Salaries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Teacher Salaries</CardTitle>
          <CardDescription>
            Current salary records for {currentSession || 'this session'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {salaries.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No salary records found. Use the form above to add teacher salaries.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Teacher</TableHead>
                    <TableHead className="text-right">Basic Salary</TableHead>
                    <TableHead className="text-right">Increase</TableHead>
                    <TableHead className="text-right">Allowances</TableHead>
                    <TableHead className="text-right">Gross</TableHead>
                    <TableHead className="text-right">Deductions</TableHead>
                    <TableHead className="text-right">Net Salary</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salaries.map((salary) => (
                    <TableRow key={salary.id}>
                      <TableCell>
                        <div>
                          <p>{getTeacherName(salary.profiles)}</p>
                          <p className="text-xs text-muted-foreground">
                            {salary.profiles?.email}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(salary.basic_salary)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(salary.salary_increase)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(salary.allowances)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="secondary">
                          {formatCurrency(salary.gross_salary)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-red-600">
                        - {formatCurrency(salary.total_deductions)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge variant="default" className="bg-green-600">
                          {formatCurrency(salary.net_salary)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleEdit(salary)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleDelete(salary.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
