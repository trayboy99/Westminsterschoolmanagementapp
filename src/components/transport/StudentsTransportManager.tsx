import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Users, Search, MapPin, DollarSign, UserPlus, Edit, Filter, CheckCircle, XCircle, Clock } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface StudentTransportData {
  id: string;
  student_id: string;
  student_name: string;
  class_name: string;
  route_id: string;
  route_name?: string;
  route_code?: string;
  pickup_point?: string;
  fee_amount: number;
  payment_status: 'paid' | 'pending' | 'partial';
  amount_paid: number;
  balance: number;
  session: string;
  term: string;
  assigned_date: string;
  notes?: string;
}

interface Route {
  id: string;
  route_name: string;
  route_code: string;
  fee_amount: number;
  pickup_points: Array<{ name: string; address: string; time: string; order: number }>;
  status: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  class_name?: string;
  student_type?: string;
}

export function StudentsTransportManager() {
  const [assignments, setAssignments] = useState<StudentTransportData[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [routeFilter, setRouteFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [editingAssignment, setEditingAssignment] = useState<StudentTransportData | null>(null);

  const [formData, setFormData] = useState({
    student_id: '',
    route_id: 'none',
    pickup_point: '',
    fee_amount: 0,
    payment_status: 'pending' as 'paid' | 'pending' | 'partial',
    amount_paid: 0,
    notes: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Fetch assignments
      const assignmentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/students`,
        { headers }
      );

      if (assignmentsRes.ok) {
        const data = await assignmentsRes.json();
        if (data.success) {
          setAssignments(data.assignments || []);
        }
      }

      // Fetch routes
      const routesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/routes`,
        { headers }
      );

      if (routesRes.ok) {
        const data = await routesRes.json();
        if (data.success) {
          setRoutes(data.routes || []);
        }
      }

      // Fetch students
      const studentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/students`,
        { headers }
      );

      if (studentsRes.ok) {
        const data = await studentsRes.json();
        if (data.success) {
          setStudents(data.students || []);
        }
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      if (!formData.student_id || formData.route_id === 'none') {
        toast.error('Please select both student and route');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Get selected route and student
      const selectedRoute = routes.find(r => r.id === formData.route_id);
      const selectedStudent = students.find(s => s.id === formData.student_id);

      if (!selectedRoute || !selectedStudent) {
        toast.error('Invalid student or route selection');
        return;
      }

      // Get current session/term (you may want to fetch this from settings)
      const currentSession = '2024/2025';
      const currentTerm = 'First Term';

      const submitData = {
        student_id: formData.student_id,
        route_id: formData.route_id === 'none' ? '' : formData.route_id,
        pickup_point: formData.pickup_point,
        fee_amount: formData.fee_amount || selectedRoute.fee_amount,
        payment_status: formData.payment_status,
        amount_paid: formData.amount_paid,
        balance: (formData.fee_amount || selectedRoute.fee_amount) - formData.amount_paid,
        session: currentSession,
        term: currentTerm,
        notes: formData.notes
      };

      const method = editingAssignment ? 'PUT' : 'POST';
      const url = editingAssignment
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/students/${editingAssignment.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/students`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(editingAssignment ? 'Assignment updated successfully' : 'Student assigned successfully');
          setShowAssignDialog(false);
          setEditingAssignment(null);
          resetForm();
          fetchData();
        } else {
          toast.error(data.error || 'Failed to save assignment');
        }
      } else {
        toast.error('Failed to save assignment');
      }
    } catch (error) {
      console.error('Error saving assignment:', error);
      toast.error('An error occurred');
    }
  };

  const handleEdit = (assignment: StudentTransportData) => {
    setEditingAssignment(assignment);
    setFormData({
      student_id: assignment.student_id,
      route_id: assignment.route_id || 'none',
      pickup_point: assignment.pickup_point || '',
      fee_amount: assignment.fee_amount,
      payment_status: assignment.payment_status,
      amount_paid: assignment.amount_paid,
      notes: assignment.notes || ''
    });
    setShowAssignDialog(true);
  };

  const resetForm = () => {
    setFormData({
      student_id: '',
      route_id: 'none',
      pickup_point: '',
      fee_amount: 0,
      payment_status: 'pending',
      amount_paid: 0,
      notes: ''
    });
  };

  const handleRouteChange = (routeId: string) => {
    setFormData({ ...formData, route_id: routeId });
    
    if (routeId !== 'none') {
      const selectedRoute = routes.find(r => r.id === routeId);
      if (selectedRoute) {
        setFormData(prev => ({
          ...prev,
          route_id: routeId,
          fee_amount: selectedRoute.fee_amount,
          pickup_point: '' // Reset pickup point when route changes
        }));
      }
    }
  };

  const handleAmountPaidChange = (amount: number) => {
    const newAmountPaid = amount;
    const newBalance = formData.fee_amount - newAmountPaid;
    
    let newStatus: 'paid' | 'pending' | 'partial' = 'pending';
    if (newAmountPaid >= formData.fee_amount) {
      newStatus = 'paid';
    } else if (newAmountPaid > 0) {
      newStatus = 'partial';
    }

    setFormData({
      ...formData,
      amount_paid: newAmountPaid,
      payment_status: newStatus
    });
  };

  const filteredAssignments = assignments.filter(assignment => {
    const matchesSearch = 
      assignment.student_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      assignment.route_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRoute = routeFilter === 'all' || assignment.route_id === routeFilter;
    const matchesPayment = paymentFilter === 'all' || assignment.payment_status === paymentFilter;
    
    return matchesSearch && matchesRoute && matchesPayment;
  });

  const getPaymentBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Paid</Badge>;
      case 'partial':
        return <Badge className="bg-orange-500"><Clock className="h-3 w-3 mr-1" />Partial</Badge>;
      default:
        return <Badge variant="secondary"><XCircle className="h-3 w-3 mr-1" />Pending</Badge>;
    }
  };

  const selectedRoute = routes.find(r => r.id === formData.route_id);
  const selectedStudent = students.find(s => s.id === formData.student_id);

  // Get unassigned students
  const assignedStudentIds = assignments.map(a => a.student_id);
  const unassignedStudents = students.filter(s => !assignedStudentIds.includes(s.id));

  // Statistics
  const stats = {
    total: assignments.length,
    paid: assignments.filter(a => a.payment_status === 'paid').length,
    pending: assignments.filter(a => a.payment_status === 'pending').length,
    partial: assignments.filter(a => a.payment_status === 'partial').length,
    totalRevenue: assignments.reduce((sum, a) => sum + a.amount_paid, 0),
    totalExpected: assignments.reduce((sum, a) => sum + a.fee_amount, 0),
    balance: assignments.reduce((sum, a) => sum + a.balance, 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6 max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl">Student Transport Management</h2>
          <p className="text-slate-600 mt-1 text-sm">Assign students to routes and manage transport fees</p>
        </div>
        <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={() => { resetForm(); setEditingAssignment(null); }}>
              <UserPlus className="h-4 w-4 mr-2" />
              Assign Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAssignment ? 'Edit Assignment' : 'Assign Student to Route'}</DialogTitle>
              <DialogDescription>
                {editingAssignment ? 'Update student transport assignment and payment details' : 'Select a student and assign them to a transport route'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="student_id">Select Student *</Label>
                <Select
                  value={formData.student_id}
                  onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                  disabled={!!editingAssignment}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose student" />
                  </SelectTrigger>
                  <SelectContent>
                    {editingAssignment ? (
                      <SelectItem value={formData.student_id}>
                        {editingAssignment.student_name}
                      </SelectItem>
                    ) : (
                      <>
                        {unassignedStudents.length === 0 ? (
                          <SelectItem value="none" disabled>All students assigned</SelectItem>
                        ) : (
                          unassignedStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.first_name} {student.last_name} {student.class_name ? `- ${student.class_name}` : ''}
                            </SelectItem>
                          ))
                        )}
                      </>
                    )}
                  </SelectContent>
                </Select>
                {selectedStudent && (
                  <div className="p-3 bg-blue-50 rounded-lg text-sm">
                    <p><span className="font-medium">Name:</span> {selectedStudent.first_name} {selectedStudent.last_name}</p>
                    {selectedStudent.class_name && <p><span className="font-medium">Class:</span> {selectedStudent.class_name}</p>}
                    {selectedStudent.student_type && <p><span className="font-medium">Type:</span> {selectedStudent.student_type}</p>}
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="route_id">Select Route *</Label>
                <Select
                  value={formData.route_id}
                  onValueChange={handleRouteChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Choose route" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No route</SelectItem>
                    {routes.filter(r => r.status === 'active').map((route) => (
                      <SelectItem key={route.id} value={route.id}>
                        {route.route_name} ({route.route_code}) - ₦{route.fee_amount.toLocaleString()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {selectedRoute && selectedRoute.pickup_points && selectedRoute.pickup_points.length > 0 && (
                <div className="space-y-2">
                  <Label htmlFor="pickup_point">Pickup Point</Label>
                  <Select
                    value={formData.pickup_point}
                    onValueChange={(value) => setFormData({ ...formData, pickup_point: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select pickup point" />
                    </SelectTrigger>
                    <SelectContent>
                      {selectedRoute.pickup_points.map((point, idx) => (
                        <SelectItem key={idx} value={point.name}>
                          {point.name} - {point.time}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fee_amount">Fee Amount (₦)</Label>
                  <Input
                    id="fee_amount"
                    type="number"
                    value={formData.fee_amount}
                    onChange={(e) => setFormData({ ...formData, fee_amount: parseFloat(e.target.value) || 0 })}
                  />
                  {selectedRoute && (
                    <p className="text-xs text-slate-600">Route default: ₦{selectedRoute.fee_amount.toLocaleString()}</p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount_paid">Amount Paid (₦)</Label>
                  <Input
                    id="amount_paid"
                    type="number"
                    value={formData.amount_paid}
                    onChange={(e) => handleAmountPaidChange(parseFloat(e.target.value) || 0)}
                  />
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Fee Amount:</span>
                  <span className="font-medium">₦{formData.fee_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Amount Paid:</span>
                  <span className="font-medium text-green-600">₦{formData.amount_paid.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-slate-600">Balance:</span>
                  <span className="font-medium text-red-600">
                    ₦{(formData.fee_amount - formData.amount_paid).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between items-center text-sm border-t pt-2">
                  <span className="text-slate-600">Payment Status:</span>
                  {getPaymentBadge(formData.payment_status)}
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Additional information"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAssignDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingAssignment ? 'Update Assignment' : 'Assign Student'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Total Students</p>
                <p className="text-2xl font-bold">{stats.total}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <Users className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Paid</p>
                <p className="text-2xl font-bold text-green-600">{stats.paid}</p>
                <p className="text-xs text-slate-500">{stats.pending} pending, {stats.partial} partial</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Revenue Collected</p>
                <p className="text-2xl font-bold text-green-600">₦{stats.totalRevenue.toLocaleString()}</p>
                <p className="text-xs text-slate-500">of ₦{stats.totalExpected.toLocaleString()}</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Outstanding Balance</p>
                <p className="text-2xl font-bold text-red-600">₦{stats.balance.toLocaleString()}</p>
                <p className="text-xs text-slate-500">
                  {((stats.totalRevenue / stats.totalExpected) * 100 || 0).toFixed(1)}% collected
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <XCircle className="h-6 w-6 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by student name, class, or route..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={routeFilter} onValueChange={setRouteFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Routes</SelectItem>
                {routes.map(route => (
                  <SelectItem key={route.id} value={route.id}>{route.route_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
                <SelectItem value="partial">Partial</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Assigned Students ({filteredAssignments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAssignments.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No students assigned to transport</p>
              <p className="text-sm text-slate-500 mt-2">Click "Assign Student" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Student</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Class</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Route</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Pickup Point</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-600">Fee</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-600">Paid</th>
                    <th className="text-right p-3 text-sm font-medium text-slate-600">Balance</th>
                    <th className="text-center p-3 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-center p-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredAssignments.map((assignment) => (
                    <tr key={assignment.id} className="hover:bg-slate-50">
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-sm">{assignment.student_name}</p>
                          <p className="text-xs text-slate-500">{assignment.session} - {assignment.term}</p>
                        </div>
                      </td>
                      <td className="p-3 text-sm">{assignment.class_name || '-'}</td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium text-sm">{assignment.route_name || 'Not assigned'}</p>
                          <p className="text-xs text-slate-500">{assignment.route_code || ''}</p>
                        </div>
                      </td>
                      <td className="p-3 text-sm">
                        {assignment.pickup_point ? (
                          <div className="flex items-center gap-1">
                            <MapPin className="h-3 w-3 text-slate-400" />
                            {assignment.pickup_point}
                          </div>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td className="p-3 text-sm text-right">₦{assignment.fee_amount.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right text-green-600">₦{assignment.amount_paid.toLocaleString()}</td>
                      <td className="p-3 text-sm text-right text-red-600">₦{assignment.balance.toLocaleString()}</td>
                      <td className="p-3 text-center">
                        {getPaymentBadge(assignment.payment_status)}
                      </td>
                      <td className="p-3 text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(assignment)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
