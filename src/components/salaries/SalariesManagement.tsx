import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { 
  DollarSign, 
  Users, 
  Briefcase, 
  Calendar, 
  Copy, 
  Check, 
  X, 
  Loader2,
  ChevronLeft,
  Plus,
  Trash2,
  Save,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  CreditCard,
  Eye
} from 'lucide-react';

interface Teacher {
  id: string;
  first_name: string;
  middle_name?: string;
  last_name: string;
  email: string;
}

interface SalaryRecord {
  id: string;
  staff_type: 'teaching' | 'non-teaching';
  teacher_id?: string;
  staff_name?: string;
  staff_duty?: string;
  basic_salary: number;
  salary_increase: number;
  allowances: number;
  tax_percentage: number;
  tax_amount: number;
  other_deductions: number;
  net_salary: number;
  month: number;
  year: number;
  session: string;
  status: 'pending' | 'paid';
  payment_date?: string;
  approved_by?: string;
  profiles?: Teacher;
}

interface NonTeachingStaff {
  tempId: string;
  name: string;
  duty: string;
  basic_salary: number;
  salary_increase: number;
  allowances: number;
  tax_percentage: number;
  other_deductions: number;
}

interface SalariesManagementProps {
  onBack?: () => void;
}

const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const ITEMS_PER_PAGE = 10;

export function SalariesManagement({ onBack }: SalariesManagementProps) {
  const [activeTab, setActiveTab] = useState<'teaching' | 'non-teaching'>('teaching');
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [session, setSession] = useState<string>('');
  
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [nonTeachingStaff, setNonTeachingStaff] = useState<NonTeachingStaff[]>([]);
  
  const [teachingSalaries, setTeachingSalaries] = useState<Map<string, Partial<SalaryRecord>>>(new Map());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);

  // Separate counts for teaching and non-teaching staff
  const [teachingStaffCount, setTeachingStaffCount] = useState(0);
  const [nonTeachingStaffCount, setNonTeachingStaffCount] = useState(0);

  // Pagination state
  const [teachingPage, setTeachingPage] = useState(1);
  const [nonTeachingPage, setNonTeachingPage] = useState(1);

  // Account details modal state
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [accountDetails, setAccountDetails] = useState<string>('');
  const [loadingAccountDetails, setLoadingAccountDetails] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    fetchActiveSession();
  }, []);

  useEffect(() => {
    if (session && selectedMonth && selectedYear) {
      fetchData();
    }
  }, [session, selectedMonth, selectedYear, activeTab]);

  const fetchActiveSession = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success && data.sessions) {
        const currentSession = data.sessions.find((s: any) => s.is_current);
        if (currentSession) {
          setSession(currentSession.session_name);
          
          // Parse years from session (e.g., "2025/2026" -> [2025, 2026])
          const years = currentSession.session_name.split('/').map((y: string) => parseInt(y));
          setAvailableYears(years);
        }
      }
    } catch (error) {
      console.error('Error fetching session:', error);
      toast.error('Failed to load academic session');
    }
  };

  const fetchData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        fetchTeachers(),
        fetchSalaries(),
        fetchStaffCounts(), // Fetch counts for both staff types
      ]);
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTeachers = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) return;

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/teachers`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success && data.teachers) {
        setTeachers(data.teachers);
      }
    } catch (error) {
      console.error('Error fetching teachers:', error);
    }
  };

  const fetchSalaries = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) return;

      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        session: session,
        staff_type: activeTab,
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/salaries/monthly?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );
      const data = await res.json();

      if (data.success) {
        setSalaries(data.salaries || []);
        
        // Populate teaching salaries map
        if (activeTab === 'teaching') {
          const salaryMap = new Map();
          data.salaries.forEach((sal: SalaryRecord) => {
            if (sal.teacher_id) {
              salaryMap.set(sal.teacher_id, sal);
            }
          });
          setTeachingSalaries(salaryMap);
          setTeachingPage(1); // Reset to first page
        } else {
          // Populate non-teaching staff
          const nonTeaching = data.salaries.map((sal: SalaryRecord) => ({
            tempId: sal.id,
            name: sal.staff_name || '',
            duty: sal.staff_duty || '',
            basic_salary: sal.basic_salary,
            salary_increase: sal.salary_increase,
            allowances: sal.allowances,
            tax_percentage: sal.tax_percentage,
            other_deductions: sal.other_deductions || 0,
          }));
          setNonTeachingStaff(nonTeaching);
          setNonTeachingPage(1); // Reset to first page
        }
      }
    } catch (error) {
      console.error('Error fetching salaries:', error);
    }
  };

  const fetchStaffCounts = async () => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) return;

      const params = new URLSearchParams({
        month: selectedMonth.toString(),
        year: selectedYear.toString(),
        session: session,
      });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/salaries/count?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );

      if (!res.ok) {
        console.error('Failed to fetch staff counts, status:', res.status);
        return;
      }

      const data = await res.json();

      if (data.success) {
        setTeachingStaffCount(data.teaching_count || 0);
        setNonTeachingStaffCount(data.non_teaching_count || 0);
      } else {
        console.error('Error in staff counts response:', data.error);
      }
    } catch (error) {
      console.error('Error fetching staff counts:', error);
    }
  };

  const getFullName = (teacher: Teacher) => {
    return [teacher.first_name, teacher.middle_name, teacher.last_name]
      .filter(Boolean)
      .join(' ');
  };

  const calculateSalary = (basic: number, increase: number, allowances: number, taxPct: number, otherDed: number) => {
    const gross = basic + increase + allowances;
    const tax = (gross * taxPct) / 100;
    const net = gross - tax - otherDed;
    return { gross, tax, net };
  };

  const handleTeachingSalaryChange = (teacherId: string, field: string, value: string) => {
    const numValue = parseFloat(value) || 0;
    const current = teachingSalaries.get(teacherId) || {};
    
    teachingSalaries.set(teacherId, {
      ...current,
      [field]: numValue,
    });
    setTeachingSalaries(new Map(teachingSalaries));
  };

  const addNonTeachingStaff = () => {
    setNonTeachingStaff([
      ...nonTeachingStaff,
      {
        tempId: `temp_${Date.now()}`,
        name: '',
        duty: '',
        basic_salary: 0,
        salary_increase: 0,
        allowances: 0,
        tax_percentage: 0,
        other_deductions: 0,
      },
    ]);
  };

  const removeNonTeachingStaff = (tempId: string) => {
    setNonTeachingStaff(nonTeachingStaff.filter(s => s.tempId !== tempId));
  };

  const handleNonTeachingChange = (tempId: string, field: string, value: string | number) => {
    setNonTeachingStaff(
      nonTeachingStaff.map(staff =>
        staff.tempId === tempId
          ? { ...staff, [field]: typeof value === 'string' && field !== 'name' && field !== 'duty' ? parseFloat(value) || 0 : value }
          : staff
      )
    );
  };

  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${authSession.access_token}`,
        'Content-Type': 'application/json',
      };

      if (activeTab === 'teaching') {
        // Save teaching staff salaries
        const promises = Array.from(teachingSalaries.entries())
          .filter(([_, sal]) => sal.basic_salary || sal.salary_increase || sal.allowances)
          .map(([teacherId, sal]) => {
            return fetch(
              `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/salaries/monthly`,
              {
                method: 'POST',
                headers,
                body: JSON.stringify({
                  staff_type: 'teaching',
                  teacher_id: teacherId,
                  basic_salary: sal.basic_salary || 0,
                  salary_increase: sal.salary_increase || 0,
                  allowances: sal.allowances || 0,
                  tax_percentage: sal.tax_percentage || 0,
                  other_deductions: sal.other_deductions || 0,
                  month: selectedMonth,
                  year: selectedYear,
                  session: session,
                }),
              }
            );
          });

        await Promise.all(promises);
        const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || '';
        toast.success(`✅ Saved ${promises.length} teaching staff salaries for ${monthName} ${selectedYear}`);
      } else {
        // Save non-teaching staff salaries
        const validStaff = nonTeachingStaff.filter(s => s.name.trim() && s.duty.trim());
        
        if (validStaff.length === 0) {
          toast.error('Please add at least one non-teaching staff with name and duty');
          return;
        }

        const promises = validStaff.map(staff => {
          return fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/salaries/monthly`,
            {
              method: 'POST',
              headers,
              body: JSON.stringify({
                staff_type: 'non-teaching',
                staff_name: staff.name,
                staff_duty: staff.duty,
                basic_salary: staff.basic_salary,
                salary_increase: staff.salary_increase,
                allowances: staff.allowances,
                tax_percentage: staff.tax_percentage,
                other_deductions: staff.other_deductions,
                month: selectedMonth,
                year: selectedYear,
                session: session,
              }),
            }
          );
        });

        await Promise.all(promises);
        const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || '';
        toast.success(`✅ Saved ${promises.length} non-teaching staff salaries for ${monthName} ${selectedYear}`);
      }

      // Refresh data
      await fetchSalaries();
      await fetchStaffCounts(); // Also refresh counts
    } catch (error) {
      console.error('Error saving salaries:', error);
      toast.error('Failed to save salaries');
    } finally {
      setSaving(false);
    }
  };

  const handleCopyToNextMonth = async () => {
    setCopying(true);
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        toast.error('Authentication required');
        return;
      }

      console.log('Copying salaries from:', { month: selectedMonth, year: selectedYear, session, staff_type: activeTab });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/salaries/copy-to-next-month`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            month: selectedMonth,
            year: selectedYear,
            session: session,
            staff_type: activeTab, // Send the current tab (teaching or non-teaching)
          }),
        }
      );

      console.log('Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('Server error response:', errorText);
        let errorData;
        try {
          errorData = JSON.parse(errorText);
        } catch {
          throw new Error(`Server error (${res.status}): ${errorText}`);
        }
        toast.error(errorData.error || `Failed to copy salaries (${res.status})`);
        return;
      }

      const data = await res.json();
      console.log('Copy response:', data);

      if (data.success) {
        // Calculate next month/year
        let nextMonth = selectedMonth + 1;
        let nextYear = selectedYear;
        if (nextMonth > 12) {
          nextMonth = 1;
          nextYear += 1;
        }
        
        const nextMonthName = MONTHS.find(m => m.value === nextMonth)?.label || '';
        toast.success(`✅ Salaries copied to ${nextMonthName} ${nextYear}`);
        
        // Update month/year state - this will trigger useEffect to fetch data
        setSelectedMonth(nextMonth);
        setSelectedYear(nextYear);
        
        // Small delay to ensure state updates, then fetch the copied data
        setTimeout(async () => {
          await fetchSalaries();
          await fetchStaffCounts();
        }, 100);
      } else {
        toast.error(data.error || 'Failed to copy salaries');
      }
    } catch (error) {
      console.error('Error copying salaries:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to copy salaries to next month');
    } finally {
      setCopying(false);
    }
  };

  const handleApproveSalary = async (salaryId: string) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/salaries/${salaryId}/approve`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );

      const data = await res.json();

      if (data.success) {
        toast.success('Salary approved and marked as paid');
        await fetchSalaries();
      } else {
        toast.error(data.error || 'Failed to approve salary');
      }
    } catch (error) {
      console.error('Error approving salary:', error);
      toast.error('Failed to approve salary');
    }
  };

  const handleViewAccountDetails = async (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setShowAccountModal(true);
    setLoadingAccountDetails(true);
    setAccountDetails('');

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession?.access_token) {
        toast.error('Authentication required');
        setLoadingAccountDetails(false);
        return;
      }

      console.log('[Account Details] Fetching for teacher:', teacher.id, teacher.email);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/${teacher.id}`,
        {
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
          },
        }
      );

      console.log('[Account Details] Response status:', res.status);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('[Account Details] Error response:', errorText);
        setAccountDetails(`Failed to load account details (${res.status})`);
        toast.error('Failed to load account details');
        setLoadingAccountDetails(false);
        return;
      }

      const data = await res.json();
      console.log('[Account Details] Response data:', data);

      if (data.success && data.profile?.account_details) {
        console.log('[Account Details] Found account details, length:', data.profile.account_details.length);
        setAccountDetails(data.profile.account_details);
      } else {
        console.log('[Account Details] No account details found in profile');
        setAccountDetails('No account details available for this teacher.');
      }
    } catch (error) {
      console.error('[Account Details] Error:', error);
      setAccountDetails('Failed to load account details.');
      toast.error('Failed to load account details');
    } finally {
      setLoadingAccountDetails(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-3">
          <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto" />
          <p className="text-sm text-slate-600 font-medium">Loading salaries...</p>
        </div>
      </div>
    );
  }

  const monthName = MONTHS.find(m => m.value === selectedMonth)?.label || '';

  // Pagination calculations
  const teachingTotalPages = Math.ceil(teachers.length / ITEMS_PER_PAGE);
  const teachingStartIdx = (teachingPage - 1) * ITEMS_PER_PAGE;
  const teachingEndIdx = teachingStartIdx + ITEMS_PER_PAGE;
  const paginatedTeachers = teachers.slice(teachingStartIdx, teachingEndIdx);

  const nonTeachingTotalPages = Math.ceil(nonTeachingStaff.length / ITEMS_PER_PAGE);
  const nonTeachingStartIdx = (nonTeachingPage - 1) * ITEMS_PER_PAGE;
  const nonTeachingEndIdx = nonTeachingStartIdx + ITEMS_PER_PAGE;
  const paginatedNonTeaching = nonTeachingStaff.slice(nonTeachingStartIdx, nonTeachingEndIdx);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 -mx-4 -mt-4 p-4 md:p-6 pb-24 md:pb-6 overflow-x-hidden">
      {/* Mobile App Header with Gradient */}
      <div className="bg-gradient-to-r from-green-600 via-emerald-700 to-teal-600 text-white rounded-3xl p-6 md:p-8 shadow-xl mb-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-3 mb-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors"
            >
              <ChevronLeft className="h-6 w-6" />
            </button>
          )}
          <div className="p-3 bg-white/20 backdrop-blur-sm rounded-2xl">
            <DollarSign className="h-7 w-7" />
          </div>
          <div className="flex-1">
            <h1 className="text-2xl md:text-3xl font-bold">Salary Management</h1>
            <p className="text-green-100 text-sm mt-1">
              Manage monthly staff salaries
            </p>
          </div>
        </div>

        {/* Month/Year Filters */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3">
            <Label className="text-white text-xs mb-2 block">Month</Label>
            <Select value={selectedMonth.toString()} onValueChange={(v) => setSelectedMonth(parseInt(v))}>
              <SelectTrigger className="bg-white/90 border-0 h-10 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MONTHS.map(month => (
                  <SelectItem key={month.value} value={month.value.toString()}>
                    {month.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3">
            <Label className="text-white text-xs mb-2 block">Year</Label>
            <Select value={selectedYear.toString()} onValueChange={(v) => setSelectedYear(parseInt(v))}>
              <SelectTrigger className="bg-white/90 border-0 h-10 text-slate-900">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {availableYears.map(year => (
                  <SelectItem key={year} value={year.toString()}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <p className="text-xs text-green-100 mb-1">Period</p>
            <p className="text-sm font-bold">{monthName} {selectedYear}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <p className="text-xs text-green-100 mb-1">Teaching Staff</p>
            <p className="text-sm font-bold">{teachingStaffCount}</p>
          </div>
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 text-center">
            <p className="text-xs text-green-100 mb-1">Non-Teaching Staff</p>
            <p className="text-sm font-bold">{nonTeachingStaffCount}</p>
          </div>
        </div>
      </div>

      {/* Staff Type Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'teaching' | 'non-teaching')} className="space-y-4 max-w-6xl mx-auto">
        <TabsList className="grid w-full grid-cols-2 bg-white border-2 border-slate-200 rounded-2xl p-1.5 h-auto shadow-sm">
          <TabsTrigger 
            value="teaching" 
            className="rounded-xl py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-600 data-[state=active]:to-purple-600 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
          >
            <Users className="h-4 w-4 mr-2" />
            Teaching Staff
          </TabsTrigger>
          <TabsTrigger 
            value="non-teaching"
            className="rounded-xl py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-orange-600 data-[state=active]:to-pink-600 data-[state=active]:text-white data-[state=active]:shadow-md font-semibold"
          >
            <Briefcase className="h-4 w-4 mr-2" />
            Non-Teaching Staff
          </TabsTrigger>
        </TabsList>

        {/* Teaching Staff Content */}
        <TabsContent value="teaching" className="space-y-4">
          {teachers.length === 0 ? (
            <Card className="bg-white/70 backdrop-blur-sm border-2 border-dashed border-slate-300 rounded-3xl">
              <CardContent className="p-12 text-center">
                <Users className="h-16 w-16 text-slate-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-slate-700 mb-2">No teachers found</h3>
                <p className="text-sm text-slate-500">Add teachers to the system first</p>
              </CardContent>
            </Card>
          ) : (
            <>
              {paginatedTeachers.map((teacher) => {
                const existingSalary = salaries.find(s => s.teacher_id === teacher.id);
                const currentData = teachingSalaries.get(teacher.id) || existingSalary || {};
                const { gross, tax, net } = calculateSalary(
                  currentData.basic_salary || 0,
                  currentData.salary_increase || 0,
                  currentData.allowances || 0,
                  currentData.tax_percentage || 0,
                  currentData.other_deductions || 0
                );

                return (
                  <Card key={teacher.id} className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-slate-200 pb-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <CardTitle className="text-lg mb-1">{getFullName(teacher)}</CardTitle>
                          <CardDescription className="text-sm">{teacher.email}</CardDescription>
                          <div className="mt-2">
                            <Button
                              onClick={() => handleViewAccountDetails(teacher)}
                              size="sm"
                              variant="outline"
                              className="border-blue-300 hover:bg-blue-50 text-blue-700 h-8"
                            >
                              <CreditCard className="h-3 w-3 mr-1" />
                              Account
                            </Button>
                          </div>
                        </div>
                        {existingSalary && (
                          <Badge className={`${existingSalary.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'} flex-shrink-0 h-fit`}>
                            {existingSalary.status === 'paid' ? (
                              <>
                                <CheckCircle2 className="h-3 w-3 mr-1" />
                                Paid
                              </>
                            ) : (
                              <>
                                <AlertCircle className="h-3 w-3 mr-1" />
                                Pending
                              </>
                            )}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Basic Salary (₦)</Label>
                          <Input
                            type="number"
                            value={currentData.basic_salary || ''}
                            onChange={(e) => handleTeachingSalaryChange(teacher.id, 'basic_salary', e.target.value)}
                            className="h-10 mt-1"
                            disabled={existingSalary?.status === 'paid'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Salary Increase (₦)</Label>
                          <Input
                            type="number"
                            value={currentData.salary_increase || ''}
                            onChange={(e) => handleTeachingSalaryChange(teacher.id, 'salary_increase', e.target.value)}
                            className="h-10 mt-1"
                            disabled={existingSalary?.status === 'paid'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Allowances (₦)</Label>
                          <Input
                            type="number"
                            value={currentData.allowances || ''}
                            onChange={(e) => handleTeachingSalaryChange(teacher.id, 'allowances', e.target.value)}
                            className="h-10 mt-1"
                            disabled={existingSalary?.status === 'paid'}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Tax (%)</Label>
                          <Input
                            type="number"
                            value={currentData.tax_percentage || ''}
                            onChange={(e) => handleTeachingSalaryChange(teacher.id, 'tax_percentage', e.target.value)}
                            className="h-10 mt-1"
                            disabled={existingSalary?.status === 'paid'}
                          />
                        </div>
                        <div className="col-span-2">
                          <Label className="text-xs">Other Deductions (₦)</Label>
                          <Input
                            type="number"
                            value={currentData.other_deductions || ''}
                            onChange={(e) => handleTeachingSalaryChange(teacher.id, 'other_deductions', e.target.value)}
                            className="h-10 mt-1"
                            placeholder="Loans, advances, penalties"
                            disabled={existingSalary?.status === 'paid'}
                          />
                        </div>
                      </div>

                      {/* Salary Summary */}
                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200">
                        <div className="grid grid-cols-4 gap-2 text-center">
                          <div>
                            <p className="text-xs text-slate-500">Gross</p>
                            <p className="text-sm font-bold text-slate-900">₦{gross.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Tax</p>
                            <p className="text-sm font-bold text-red-600">₦{tax.toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Other</p>
                            <p className="text-sm font-bold text-orange-600">₦{(currentData.other_deductions || 0).toLocaleString()}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Net</p>
                            <p className="text-sm font-bold text-green-600">₦{net.toLocaleString()}</p>
                          </div>
                        </div>
                      </div>

                      {existingSalary && existingSalary.status === 'pending' && (
                        <Button
                          onClick={() => handleApproveSalary(existingSalary.id)}
                          className="w-full bg-green-600 hover:bg-green-700 text-white"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-2" />
                          Approve & Mark as Paid
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                );
              })}

              {/* Teaching Staff Pagination */}
              {teachingTotalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-6">
                  <Button
                    onClick={() => setTeachingPage(p => Math.max(1, p - 1))}
                    disabled={teachingPage === 1}
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <div className="flex items-center gap-2">
                    {Array.from({ length: teachingTotalPages }, (_, i) => i + 1).map(page => (
                      <Button
                        key={page}
                        onClick={() => setTeachingPage(page)}
                        variant={page === teachingPage ? 'default' : 'outline'}
                        size="sm"
                        className={page === teachingPage ? 'bg-blue-600 text-white rounded-xl' : 'rounded-xl'}
                      >
                        {page}
                      </Button>
                    ))}
                  </div>
                  <Button
                    onClick={() => setTeachingPage(p => Math.min(teachingTotalPages, p + 1))}
                    disabled={teachingPage === teachingTotalPages}
                    variant="outline"
                    size="sm"
                    className="rounded-xl"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </TabsContent>

        {/* Non-Teaching Staff Content */}
        <TabsContent value="non-teaching" className="space-y-4">
          <Card className="bg-white border-2 border-slate-200 rounded-3xl shadow-sm">
            <CardHeader className="bg-gradient-to-r from-orange-50 to-pink-50 border-b-2 border-slate-200">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Non-Teaching Staff</CardTitle>
                  <CardDescription>Add and manage non-teaching staff salaries</CardDescription>
                </div>
                <Button
                  onClick={addNonTeachingStaff}
                  size="sm"
                  className="bg-gradient-to-r from-orange-600 to-pink-600 text-white hover:from-orange-700 hover:to-pink-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Staff
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              {nonTeachingStaff.length === 0 ? (
                <div className="text-center py-12 text-slate-500">
                  <Briefcase className="h-12 w-12 mx-auto mb-3 text-slate-300" />
                  <p className="text-sm">No non-teaching staff added yet</p>
                  <p className="text-xs text-slate-400 mt-1">Click "Add Staff" to begin</p>
                </div>
              ) : (
                <>
                  {paginatedNonTeaching.map((staff, index) => {
                    const existingSalary = salaries.find(s => s.id === staff.tempId);
                    const { gross, tax, net } = calculateSalary(
                      staff.basic_salary,
                      staff.salary_increase,
                      staff.allowances,
                      staff.tax_percentage,
                      staff.other_deductions
                    );

                    return (
                      <div key={staff.tempId} className="border-2 border-slate-200 rounded-2xl p-4 space-y-3 bg-slate-50/50">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-slate-700">Staff #{nonTeachingStartIdx + index + 1}</h4>
                          <div className="flex items-center gap-2">
                            {existingSalary && (
                              <Badge className={existingSalary.status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}>
                                {existingSalary.status}
                              </Badge>
                            )}
                            <Button
                              onClick={() => removeNonTeachingStaff(staff.tempId)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              disabled={existingSalary?.status === 'paid'}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div className="col-span-2">
                            <Label className="text-xs">Staff Name</Label>
                            <Input
                              value={staff.name}
                              onChange={(e) => handleNonTeachingChange(staff.tempId, 'name', e.target.value)}
                              className="h-10 mt-1"
                              placeholder="Enter full name"
                              disabled={existingSalary?.status === 'paid'}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Duty/Position</Label>
                            <Input
                              value={staff.duty}
                              onChange={(e) => handleNonTeachingChange(staff.tempId, 'duty', e.target.value)}
                              className="h-10 mt-1"
                              placeholder="e.g., Cleaner, Security, Cook"
                              disabled={existingSalary?.status === 'paid'}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Basic Salary (₦)</Label>
                            <Input
                              type="number"
                              value={staff.basic_salary || ''}
                              onChange={(e) => handleNonTeachingChange(staff.tempId, 'basic_salary', e.target.value)}
                              className="h-10 mt-1"
                              disabled={existingSalary?.status === 'paid'}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Increase (₦)</Label>
                            <Input
                              type="number"
                              value={staff.salary_increase || ''}
                              onChange={(e) => handleNonTeachingChange(staff.tempId, 'salary_increase', e.target.value)}
                              className="h-10 mt-1"
                              disabled={existingSalary?.status === 'paid'}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Allowances (₦)</Label>
                            <Input
                              type="number"
                              value={staff.allowances || ''}
                              onChange={(e) => handleNonTeachingChange(staff.tempId, 'allowances', e.target.value)}
                              className="h-10 mt-1"
                              disabled={existingSalary?.status === 'paid'}
                            />
                          </div>
                          <div>
                            <Label className="text-xs">Tax (%)</Label>
                            <Input
                              type="number"
                              value={staff.tax_percentage || ''}
                              onChange={(e) => handleNonTeachingChange(staff.tempId, 'tax_percentage', e.target.value)}
                              className="h-10 mt-1"
                              disabled={existingSalary?.status === 'paid'}
                            />
                          </div>
                          <div className="col-span-2">
                            <Label className="text-xs">Other Deductions (₦)</Label>
                            <Input
                              type="number"
                              value={staff.other_deductions || ''}
                              onChange={(e) => handleNonTeachingChange(staff.tempId, 'other_deductions', e.target.value)}
                              className="h-10 mt-1"
                              placeholder="Loans, advances, penalties"
                              disabled={existingSalary?.status === 'paid'}
                            />
                          </div>
                        </div>

                        {/* Salary Summary */}
                        <div className="bg-white rounded-2xl p-3 border border-slate-200">
                          <div className="grid grid-cols-4 gap-2 text-center">
                            <div>
                              <p className="text-xs text-slate-500">Gross</p>
                              <p className="text-sm font-bold text-slate-900">₦{gross.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Tax</p>
                              <p className="text-sm font-bold text-red-600">₦{tax.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Other</p>
                              <p className="text-sm font-bold text-orange-600">₦{staff.other_deductions.toLocaleString()}</p>
                            </div>
                            <div>
                              <p className="text-xs text-slate-500">Net</p>
                              <p className="text-sm font-bold text-green-600">₦{net.toLocaleString()}</p>
                            </div>
                          </div>
                        </div>

                        {existingSalary && existingSalary.status === 'pending' && (
                          <Button
                            onClick={() => handleApproveSalary(existingSalary.id)}
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            size="sm"
                          >
                            <CheckCircle2 className="h-4 w-4 mr-2" />
                            Approve & Mark as Paid
                          </Button>
                        )}
                      </div>
                    );
                  })}

                  {/* Non-Teaching Staff Pagination */}
                  {nonTeachingTotalPages > 1 && (
                    <div className="flex items-center justify-center gap-2 mt-6">
                      <Button
                        onClick={() => setNonTeachingPage(p => Math.max(1, p - 1))}
                        disabled={nonTeachingPage === 1}
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        <ChevronLeft className="h-4 w-4" />
                      </Button>
                      <div className="flex items-center gap-2">
                        {Array.from({ length: nonTeachingTotalPages }, (_, i) => i + 1).map(page => (
                          <Button
                            key={page}
                            onClick={() => setNonTeachingPage(page)}
                            variant={page === nonTeachingPage ? 'default' : 'outline'}
                            size="sm"
                            className={page === nonTeachingPage ? 'bg-orange-600 text-white rounded-xl' : 'rounded-xl'}
                          >
                            {page}
                          </Button>
                        ))}
                      </div>
                      <Button
                        onClick={() => setNonTeachingPage(p => Math.min(nonTeachingTotalPages, p + 1))}
                        disabled={nonTeachingPage === nonTeachingTotalPages}
                        variant="outline"
                        size="sm"
                        className="rounded-xl"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="fixed bottom-20 md:bottom-6 left-0 right-0 flex flex-col items-center md:items-end md:right-6 md:left-auto space-y-3 md:space-y-2 px-4 md:px-0">
        <Button
          onClick={handleSaveAll}
          disabled={saving}
          className="w-full max-w-md md:w-auto bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white h-14 md:h-12 rounded-2xl shadow-xl font-semibold text-base"
        >
          {saving ? (
            <>
              <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-5 w-5 mr-2" />
              Save All Salaries
            </>
          )}
        </Button>

        {salaries.length > 0 && (
          <Button
            onClick={handleCopyToNextMonth}
            disabled={copying}
            variant="outline"
            className="w-full max-w-md md:w-auto bg-white border-2 border-green-300 hover:bg-green-50 text-green-700 h-12 md:h-10 rounded-2xl shadow-lg font-semibold"
          >
            {copying ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Copying...
              </>
            ) : (
              <>
                <Copy className="h-4 w-4 mr-2" />
                Copy to Next Month
              </>
            )}
          </Button>
        )}
      </div>

      {/* Account Details Modal */}
      <Dialog open={showAccountModal} onOpenChange={setShowAccountModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Account Details</DialogTitle>
            <DialogDescription>
              View account details for {selectedTeacher ? getFullName(selectedTeacher) : 'the selected teacher'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-4">
            {loadingAccountDetails ? (
              <div className="flex items-center justify-center gap-3 py-8">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <p className="text-sm text-slate-600 font-medium">Loading account details...</p>
              </div>
            ) : (
              <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
                <pre className="text-sm text-slate-900 whitespace-pre-wrap font-sans">{accountDetails}</pre>
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              onClick={() => setShowAccountModal(false)}
              variant="outline"
              size="sm"
              className="rounded-xl"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}