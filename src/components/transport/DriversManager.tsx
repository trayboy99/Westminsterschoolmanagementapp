import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { 
  UserCircle, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Phone, 
  IdCard, 
  Calendar, 
  Bus, 
  AlertTriangle,
  CheckCircle,
  Clock,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface Driver {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email?: string;
  license_number: string;
  license_type: string;
  license_issue_date: string;
  license_expiry_date: string;
  address?: string;
  city?: string;
  state?: string;
  status: 'active' | 'inactive' | 'suspended';
  assigned_bus_id?: string;
  assigned_bus_name?: string;
  assigned_bus_number?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  hire_date: string;
  notes?: string;
  created_at: string;
  updated_at: string;
}

interface Bus {
  id: string;
  bus_name: string;
  bus_number: string;
  status: string;
}

export function DriversManager() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showDialog, setShowDialog] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    phone: '',
    email: '',
    license_number: '',
    license_type: 'Class D',
    license_issue_date: '',
    license_expiry_date: '',
    address: '',
    city: '',
    state: '',
    status: 'active' as 'active' | 'inactive' | 'suspended',
    assigned_bus_id: 'none',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    hire_date: new Date().toISOString().split('T')[0],
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

      // Fetch drivers
      const driversRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/drivers`,
        { headers }
      );

      if (driversRes.ok) {
        const data = await driversRes.json();
        if (data.success) {
          setDrivers(data.drivers || []);
        }
      }

      // Fetch buses
      const busesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/buses`,
        { headers }
      );

      if (busesRes.ok) {
        const data = await busesRes.json();
        if (data.success) {
          setBuses(data.buses || []);
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

      // Validation
      if (!formData.first_name || !formData.last_name || !formData.phone || !formData.license_number) {
        toast.error('Please fill in all required fields');
        return;
      }

      if (!formData.license_expiry_date) {
        toast.error('License expiry date is required');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const submitData = {
        ...formData,
        assigned_bus_id: formData.assigned_bus_id === 'none' ? null : formData.assigned_bus_id
      };

      const method = editingDriver ? 'PUT' : 'POST';
      const url = editingDriver
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/drivers/${editingDriver.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/drivers`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(editingDriver ? 'Driver updated successfully' : 'Driver added successfully');
          setShowDialog(false);
          setEditingDriver(null);
          resetForm();
          fetchData();
        } else {
          toast.error(data.error || 'Failed to save driver');
        }
      } else {
        toast.error('Failed to save driver');
      }
    } catch (error) {
      console.error('Error saving driver:', error);
      toast.error('An error occurred');
    }
  };

  const handleEdit = (driver: Driver) => {
    setEditingDriver(driver);
    setFormData({
      first_name: driver.first_name,
      last_name: driver.last_name,
      phone: driver.phone,
      email: driver.email || '',
      license_number: driver.license_number,
      license_type: driver.license_type,
      license_issue_date: driver.license_issue_date,
      license_expiry_date: driver.license_expiry_date,
      address: driver.address || '',
      city: driver.city || '',
      state: driver.state || '',
      status: driver.status,
      assigned_bus_id: driver.assigned_bus_id || 'none',
      emergency_contact_name: driver.emergency_contact_name || '',
      emergency_contact_phone: driver.emergency_contact_phone || '',
      hire_date: driver.hire_date,
      notes: driver.notes || ''
    });
    setShowDialog(true);
  };

  const handleDelete = async (driverId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/drivers/${driverId}`,
        { method: 'DELETE', headers }
      );

      if (res.ok) {
        toast.success('Driver deleted successfully');
        setDeleteConfirm(null);
        fetchData();
      } else {
        toast.error('Failed to delete driver');
      }
    } catch (error) {
      console.error('Error deleting driver:', error);
      toast.error('An error occurred');
    }
  };

  const resetForm = () => {
    setFormData({
      first_name: '',
      last_name: '',
      phone: '',
      email: '',
      license_number: '',
      license_type: 'Class D',
      license_issue_date: '',
      license_expiry_date: '',
      address: '',
      city: '',
      state: '',
      status: 'active',
      assigned_bus_id: 'none',
      emergency_contact_name: '',
      emergency_contact_phone: '',
      hire_date: new Date().toISOString().split('T')[0],
      notes: ''
    });
  };

  const getLicenseStatus = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysUntilExpiry < 0) {
      return { status: 'expired', color: 'bg-red-500', text: 'Expired' };
    } else if (daysUntilExpiry <= 30) {
      return { status: 'expiring', color: 'bg-orange-500', text: `Expires in ${daysUntilExpiry} days` };
    } else {
      return { status: 'valid', color: 'bg-green-500', text: 'Valid' };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500"><CheckCircle className="h-3 w-3 mr-1" />Active</Badge>;
      case 'inactive':
        return <Badge variant="secondary"><Clock className="h-3 w-3 mr-1" />Inactive</Badge>;
      case 'suspended':
        return <Badge className="bg-red-500"><AlertTriangle className="h-3 w-3 mr-1" />Suspended</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  const filteredDrivers = drivers.filter(driver => {
    const matchesSearch = 
      driver.first_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.last_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      driver.phone?.includes(searchTerm) ||
      driver.license_number?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || driver.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  // Calculate statistics
  const stats = {
    total: drivers.length,
    active: drivers.filter(d => d.status === 'active').length,
    inactive: drivers.filter(d => d.status === 'inactive').length,
    suspended: drivers.filter(d => d.status === 'suspended').length,
    assigned: drivers.filter(d => d.assigned_bus_id).length,
    unassigned: drivers.filter(d => !d.assigned_bus_id).length,
    expiringLicenses: drivers.filter(d => {
      const expiry = new Date(d.license_expiry_date);
      const today = new Date();
      const daysUntilExpiry = Math.floor((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysUntilExpiry >= 0 && daysUntilExpiry <= 30;
    }).length,
    expiredLicenses: drivers.filter(d => {
      const expiry = new Date(d.license_expiry_date);
      return expiry < new Date();
    }).length
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
          <h2 className="text-xl sm:text-2xl">Drivers Management</h2>
          <p className="text-slate-600 mt-1 text-sm">Manage drivers, licenses, and bus assignments</p>
        </div>
        <Dialog open={showDialog} onOpenChange={setShowDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={() => { resetForm(); setEditingDriver(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Driver
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingDriver ? 'Edit Driver' : 'Add New Driver'}</DialogTitle>
              <DialogDescription>
                {editingDriver ? 'Update driver information and bus assignment' : 'Enter driver details, license information, and assign to a bus'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              {/* Personal Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-slate-700">Personal Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="first_name">First Name *</Label>
                    <Input
                      id="first_name"
                      value={formData.first_name}
                      onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                      placeholder="John"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="last_name">Last Name *</Label>
                    <Input
                      id="last_name"
                      value={formData.last_name}
                      onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                      placeholder="Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="+234 xxx xxx xxxx"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      placeholder="driver@example.com"
                    />
                  </div>
                </div>
              </div>

              {/* License Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-slate-700">License Information</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="license_number">License Number *</Label>
                    <Input
                      id="license_number"
                      value={formData.license_number}
                      onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
                      placeholder="ABC123456"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_type">License Type</Label>
                    <Select
                      value={formData.license_type}
                      onValueChange={(value) => setFormData({ ...formData, license_type: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class A">Class A - Commercial</SelectItem>
                        <SelectItem value="Class B">Class B - Bus</SelectItem>
                        <SelectItem value="Class C">Class C - Truck</SelectItem>
                        <SelectItem value="Class D">Class D - Standard</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_issue_date">Issue Date</Label>
                    <Input
                      id="license_issue_date"
                      type="date"
                      value={formData.license_issue_date}
                      onChange={(e) => setFormData({ ...formData, license_issue_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="license_expiry_date">Expiry Date *</Label>
                    <Input
                      id="license_expiry_date"
                      type="date"
                      value={formData.license_expiry_date}
                      onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-slate-700">Address</h3>
                <div className="space-y-2">
                  <Label htmlFor="address">Street Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    placeholder="123 Main Street"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="Lagos"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="Lagos State"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-slate-700">Employment Details</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="hire_date">Hire Date</Label>
                    <Input
                      id="hire_date"
                      type="date"
                      value={formData.hire_date}
                      onChange={(e) => setFormData({ ...formData, hire_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="status">Status</Label>
                    <Select
                      value={formData.status}
                      onValueChange={(value: 'active' | 'inactive' | 'suspended') => 
                        setFormData({ ...formData, status: value })
                      }
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <Label htmlFor="assigned_bus_id">Assigned Bus</Label>
                    <Select
                      value={formData.assigned_bus_id}
                      onValueChange={(value) => setFormData({ ...formData, assigned_bus_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select bus" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No bus assigned</SelectItem>
                        {buses.filter(b => b.status === 'active').map((bus) => (
                          <SelectItem key={bus.id} value={bus.id}>
                            {bus.bus_name} - {bus.bus_number}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="space-y-4">
                <h3 className="font-medium text-sm text-slate-700">Emergency Contact</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_name">Contact Name</Label>
                    <Input
                      id="emergency_contact_name"
                      value={formData.emergency_contact_name}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                      placeholder="Emergency contact name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="emergency_contact_phone">Contact Phone</Label>
                    <Input
                      id="emergency_contact_phone"
                      type="tel"
                      value={formData.emergency_contact_phone}
                      onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                      placeholder="+234 xxx xxx xxxx"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Additional information about the driver"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingDriver ? 'Update Driver' : 'Add Driver'}
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
                <p className="text-sm text-slate-600">Total Drivers</p>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-xs text-slate-500 mt-1">{stats.active} active</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-blue-100 flex items-center justify-center">
                <UserCircle className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Assigned to Bus</p>
                <p className="text-2xl font-bold text-green-600">{stats.assigned}</p>
                <p className="text-xs text-slate-500 mt-1">{stats.unassigned} unassigned</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center">
                <Bus className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Expiring Soon</p>
                <p className="text-2xl font-bold text-orange-600">{stats.expiringLicenses}</p>
                <p className="text-xs text-slate-500 mt-1">Within 30 days</p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-orange-100 flex items-center justify-center">
                <Clock className="h-6 w-6 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-slate-600">Expired Licenses</p>
                <p className="text-2xl font-bold text-red-600">{stats.expiredLicenses}</p>
                <p className="text-xs text-slate-500 mt-1">
                  {stats.suspended} suspended
                </p>
              </div>
              <div className="h-12 w-12 rounded-lg bg-red-100 flex items-center justify-center">
                <AlertTriangle className="h-6 w-6 text-red-600" />
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
                  placeholder="Search by name, phone, or license number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Drivers Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Drivers List ({filteredDrivers.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDrivers.length === 0 ? (
            <div className="text-center py-12">
              <UserCircle className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No drivers found</p>
              <p className="text-sm text-slate-500 mt-2">Click "Add Driver" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Driver</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Contact</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">License</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Expiry</th>
                    <th className="text-left p-3 text-sm font-medium text-slate-600">Assigned Bus</th>
                    <th className="text-center p-3 text-sm font-medium text-slate-600">Status</th>
                    <th className="text-center p-3 text-sm font-medium text-slate-600">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {filteredDrivers.map((driver) => {
                    const licenseStatus = getLicenseStatus(driver.license_expiry_date);
                    return (
                      <tr key={driver.id} className="hover:bg-slate-50">
                        <td className="p-3">
                          <div>
                            <p className="font-medium text-sm">
                              {driver.first_name} {driver.last_name}
                            </p>
                            <p className="text-xs text-slate-500">
                              Since {new Date(driver.hire_date).toLocaleDateString()}
                            </p>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-1 text-sm">
                              <Phone className="h-3 w-3 text-slate-400" />
                              {driver.phone}
                            </div>
                            {driver.email && (
                              <p className="text-xs text-slate-500">{driver.email}</p>
                            )}
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1 text-sm">
                            <IdCard className="h-3 w-3 text-slate-400" />
                            <div>
                              <p className="font-medium">{driver.license_number}</p>
                              <p className="text-xs text-slate-500">{driver.license_type}</p>
                            </div>
                          </div>
                        </td>
                        <td className="p-3">
                          <Badge className={licenseStatus.color}>
                            <Calendar className="h-3 w-3 mr-1" />
                            {licenseStatus.text}
                          </Badge>
                        </td>
                        <td className="p-3">
                          {driver.assigned_bus_name ? (
                            <div className="flex items-center gap-1 text-sm">
                              <Bus className="h-3 w-3 text-slate-400" />
                              <div>
                                <p className="font-medium">{driver.assigned_bus_name}</p>
                                <p className="text-xs text-slate-500">{driver.assigned_bus_number}</p>
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-slate-400">Not assigned</span>
                          )}
                        </td>
                        <td className="p-3 text-center">
                          {getStatusBadge(driver.status)}
                        </td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(driver)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {deleteConfirm === driver.id ? (
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-red-600"
                                  onClick={() => handleDelete(driver.id)}
                                >
                                  Confirm
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteConfirm(null)}
                                >
                                  Cancel
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setDeleteConfirm(driver.id)}
                              >
                                <Trash2 className="h-4 w-4 text-red-600" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
