import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Bus, Plus, Edit, Trash2, Search, Calendar, AlertCircle, CheckCircle } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface BusData {
  id: string;
  bus_number: string;
  registration_number: string;
  capacity: number;
  status: 'active' | 'maintenance' | 'inactive';
  last_maintenance_date?: string;
  next_maintenance_date?: string;
  driver_id?: string;
  driver_name?: string;
  route_id?: string;
  route_name?: string;
  model?: string;
  year?: number;
  notes?: string;
}

export function BusesManager() {
  const [buses, setBuses] = useState<BusData[]>([]);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingBus, setEditingBus] = useState<BusData | null>(null);
  
  const [formData, setFormData] = useState({
    bus_number: '',
    registration_number: '',
    capacity: 40,
    status: 'active' as 'active' | 'maintenance' | 'inactive',
    model: '',
    year: new Date().getFullYear(),
    last_maintenance_date: '',
    next_maintenance_date: '',
    driver_id: '',
    route_id: '',
    notes: ''
  });

  const supabase = createClient();

  useEffect(() => {
    fetchBuses();
    fetchDrivers();
    fetchRoutes();
  }, []);

  const fetchBuses = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/buses`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setBuses(data.buses);
        }
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDrivers = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/drivers`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setDrivers(data.drivers);
        }
      }
    } catch (error) {
      console.error('Error fetching drivers:', error);
    }
  };

  const fetchRoutes = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/routes`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setRoutes(data.routes);
        }
      }
    } catch (error) {
      console.error('Error fetching routes:', error);
    }
  };

  const handleSubmit = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      if (!formData.bus_number || !formData.registration_number) {
        toast.error('Please fill in all required fields');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const method = editingBus ? 'PUT' : 'POST';
      const url = editingBus
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/buses/${editingBus.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/buses`;

      // Convert "none" values to empty string for backend
      const submitData = {
        ...formData,
        driver_id: formData.driver_id === 'none' ? '' : formData.driver_id,
        route_id: formData.route_id === 'none' ? '' : formData.route_id
      };

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(submitData)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(editingBus ? 'Bus updated successfully' : 'Bus added successfully');
          setShowAddDialog(false);
          setEditingBus(null);
          resetForm();
          fetchBuses();
        } else {
          toast.error(data.error || 'Failed to save bus');
        }
      } else {
        toast.error('Failed to save bus');
      }
    } catch (error) {
      console.error('Error saving bus:', error);
      toast.error('An error occurred');
    }
  };

  const handleEdit = (bus: BusData) => {
    setEditingBus(bus);
    setFormData({
      bus_number: bus.bus_number,
      registration_number: bus.registration_number,
      capacity: bus.capacity,
      status: bus.status,
      model: bus.model || '',
      year: bus.year || new Date().getFullYear(),
      last_maintenance_date: bus.last_maintenance_date || '',
      next_maintenance_date: bus.next_maintenance_date || '',
      driver_id: bus.driver_id || 'none',
      route_id: bus.route_id || 'none',
      notes: bus.notes || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (busId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/buses/${busId}`,
        { method: 'DELETE', headers }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success('Bus deleted successfully');
          fetchBuses();
        }
      }
    } catch (error) {
      console.error('Error deleting bus:', error);
      toast.error('Failed to delete bus');
    }
  };

  const resetForm = () => {
    setFormData({
      bus_number: '',
      registration_number: '',
      capacity: 40,
      status: 'active',
      model: '',
      year: new Date().getFullYear(),
      last_maintenance_date: '',
      next_maintenance_date: '',
      driver_id: 'none',
      route_id: 'none',
      notes: ''
    });
  };

  const filteredBuses = buses.filter(bus => {
    const matchesSearch = 
      bus.bus_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.registration_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      bus.driver_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || bus.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-orange-500">Maintenance</Badge>;
      case 'inactive':
        return <Badge variant="secondary">Inactive</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
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
          <h2 className="text-xl sm:text-2xl">Bus Management</h2>
          <p className="text-slate-600 mt-1 text-sm">Manage school buses and their assignments</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={() => { resetForm(); setEditingBus(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Bus
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingBus ? 'Edit Bus' : 'Add New Bus'}</DialogTitle>
              <DialogDescription>
                {editingBus ? 'Update bus information and assignments' : 'Add a new bus to the school fleet'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="bus_number">Bus Number *</Label>
                  <Input
                    id="bus_number"
                    placeholder="e.g., BUS-001"
                    value={formData.bus_number}
                    onChange={(e) => setFormData({ ...formData, bus_number: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="registration_number">Registration Number *</Label>
                  <Input
                    id="registration_number"
                    placeholder="e.g., ABC-123-XY"
                    value={formData.registration_number}
                    onChange={(e) => setFormData({ ...formData, registration_number: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="model">Bus Model</Label>
                  <Input
                    id="model"
                    placeholder="e.g., Toyota Coaster"
                    value={formData.model}
                    onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={formData.year}
                    onChange={(e) => setFormData({ ...formData, year: parseInt(e.target.value) })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="capacity">Capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    value={formData.capacity}
                    onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={formData.status}
                    onValueChange={(value: any) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="driver_id">Assign Driver</Label>
                  <Select
                    value={formData.driver_id}
                    onValueChange={(value) => setFormData({ ...formData, driver_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select driver" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No driver</SelectItem>
                      {drivers.map((driver) => (
                        <SelectItem key={driver.id} value={driver.id}>
                          {driver.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route_id">Assign Route</Label>
                  <Select
                    value={formData.route_id}
                    onValueChange={(value) => setFormData({ ...formData, route_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select route" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No route</SelectItem>
                      {routes.map((route) => (
                        <SelectItem key={route.id} value={route.id}>
                          {route.route_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="last_maintenance">Last Maintenance</Label>
                  <Input
                    id="last_maintenance"
                    type="date"
                    value={formData.last_maintenance_date}
                    onChange={(e) => setFormData({ ...formData, last_maintenance_date: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="next_maintenance">Next Maintenance</Label>
                  <Input
                    id="next_maintenance"
                    type="date"
                    value={formData.next_maintenance_date}
                    onChange={(e) => setFormData({ ...formData, next_maintenance_date: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Input
                  id="notes"
                  placeholder="Additional notes about the bus"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingBus ? 'Update Bus' : 'Add Bus'}
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search by bus number, registration, or driver..."
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
                <SelectItem value="maintenance">Maintenance</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Buses List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredBuses.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Bus className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No buses found</p>
            </CardContent>
          </Card>
        ) : (
          filteredBuses.map((bus) => (
            <Card key={bus.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
                      <Bus className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{bus.bus_number}</CardTitle>
                      <p className="text-xs text-slate-600">{bus.registration_number}</p>
                    </div>
                  </div>
                  {getStatusBadge(bus.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="text-slate-600">Capacity:</span>
                    <p className="font-medium">{bus.capacity} seats</p>
                  </div>
                  {bus.model && (
                    <div>
                      <span className="text-slate-600">Model:</span>
                      <p className="font-medium">{bus.model}</p>
                    </div>
                  )}
                </div>

                {bus.driver_name && (
                  <div className="text-sm">
                    <span className="text-slate-600">Driver:</span>
                    <p className="font-medium">{bus.driver_name}</p>
                  </div>
                )}

                {bus.route_name && (
                  <div className="text-sm">
                    <span className="text-slate-600">Route:</span>
                    <p className="font-medium">{bus.route_name}</p>
                  </div>
                )}

                {bus.next_maintenance_date && (
                  <div className="flex items-center gap-2 text-xs">
                    <Calendar className="h-3 w-3 text-orange-600" />
                    <span className="text-slate-600">
                      Next maintenance: {new Date(bus.next_maintenance_date).toLocaleDateString()}
                    </span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(bus)}
                  >
                    <Edit className="h-3 w-3 mr-1" />
                    Edit
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Bus</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {bus.bus_number}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(bus.id)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
