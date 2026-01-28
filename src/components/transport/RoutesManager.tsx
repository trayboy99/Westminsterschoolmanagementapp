import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '../ui/alert-dialog';
import { Route, Plus, Edit, Trash2, Search, MapPin, Clock, Users, DollarSign } from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface PickupPoint {
  name: string;
  address: string;
  time: string;
  order: number;
}

interface RouteData {
  id: string;
  route_name: string;
  route_code: string;
  pickup_points: PickupPoint[];
  distance_km: number;
  estimated_duration_minutes: number;
  fee_amount: number;
  status: 'active' | 'inactive';
  notes?: string;
  student_count?: number;
}

export function RoutesManager() {
  const [routes, setRoutes] = useState<RouteData[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editingRoute, setEditingRoute] = useState<RouteData | null>(null);
  
  const [formData, setFormData] = useState({
    route_name: '',
    route_code: '',
    pickup_points: [] as PickupPoint[],
    distance_km: 0,
    estimated_duration_minutes: 0,
    fee_amount: 0,
    status: 'active' as 'active' | 'inactive',
    notes: ''
  });

  const [newPickupPoint, setNewPickupPoint] = useState<PickupPoint>({
    name: '',
    address: '',
    time: '',
    order: 1
  });

  const supabase = createClient();

  useEffect(() => {
    fetchRoutes();
  }, []);

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

      if (!formData.route_name || !formData.route_code) {
        toast.error('Please fill in all required fields');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const method = editingRoute ? 'PUT' : 'POST';
      const url = editingRoute
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/routes/${editingRoute.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/routes`;

      const res = await fetch(url, {
        method,
        headers,
        body: JSON.stringify(formData)
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success(editingRoute ? 'Route updated successfully' : 'Route added successfully');
          setShowAddDialog(false);
          setEditingRoute(null);
          resetForm();
          fetchRoutes();
        } else {
          toast.error(data.error || 'Failed to save route');
        }
      } else {
        toast.error('Failed to save route');
      }
    } catch (error) {
      console.error('Error saving route:', error);
      toast.error('An error occurred');
    }
  };

  const handleEdit = (route: RouteData) => {
    setEditingRoute(route);
    setFormData({
      route_name: route.route_name,
      route_code: route.route_code,
      pickup_points: route.pickup_points || [],
      distance_km: route.distance_km,
      estimated_duration_minutes: route.estimated_duration_minutes,
      fee_amount: route.fee_amount,
      status: route.status,
      notes: route.notes || ''
    });
    setShowAddDialog(true);
  };

  const handleDelete = async (routeId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/routes/${routeId}`,
        { method: 'DELETE', headers }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          toast.success('Route deleted successfully');
          fetchRoutes();
        }
      }
    } catch (error) {
      console.error('Error deleting route:', error);
      toast.error('Failed to delete route');
    }
  };

  const addPickupPoint = () => {
    if (!newPickupPoint.name || !newPickupPoint.address || !newPickupPoint.time) {
      toast.error('Please fill in all pickup point fields');
      return;
    }

    setFormData(prev => ({
      ...prev,
      pickup_points: [...prev.pickup_points, { ...newPickupPoint, order: prev.pickup_points.length + 1 }]
    }));

    setNewPickupPoint({ name: '', address: '', time: '', order: 1 });
  };

  const removePickupPoint = (index: number) => {
    setFormData(prev => ({
      ...prev,
      pickup_points: prev.pickup_points.filter((_, i) => i !== index)
        .map((point, idx) => ({ ...point, order: idx + 1 }))
    }));
  };

  const resetForm = () => {
    setFormData({
      route_name: '',
      route_code: '',
      pickup_points: [],
      distance_km: 0,
      estimated_duration_minutes: 0,
      fee_amount: 0,
      status: 'active',
      notes: ''
    });
    setNewPickupPoint({ name: '', address: '', time: '', order: 1 });
  };

  const filteredRoutes = routes.filter(route => {
    const matchesSearch = 
      route.route_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      route.route_code.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || route.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    return status === 'active' 
      ? <Badge className="bg-green-500">Active</Badge>
      : <Badge variant="secondary">Inactive</Badge>;
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
          <h2 className="text-xl sm:text-2xl">Route Management</h2>
          <p className="text-slate-600 mt-1 text-sm">Manage transport routes and pickup points</p>
        </div>
        <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
          <DialogTrigger asChild>
            <Button className="w-full sm:w-auto" onClick={() => { resetForm(); setEditingRoute(null); }}>
              <Plus className="h-4 w-4 mr-2" />
              Add Route
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingRoute ? 'Edit Route' : 'Add New Route'}</DialogTitle>
              <DialogDescription>
                {editingRoute ? 'Update route details and pickup points' : 'Create a new transport route with pickup locations'}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="route_name">Route Name *</Label>
                  <Input
                    id="route_name"
                    placeholder="e.g., Downtown Route"
                    value={formData.route_name}
                    onChange={(e) => setFormData({ ...formData, route_name: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="route_code">Route Code *</Label>
                  <Input
                    id="route_code"
                    placeholder="e.g., RT-01"
                    value={formData.route_code}
                    onChange={(e) => setFormData({ ...formData, route_code: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="distance">Distance (km)</Label>
                  <Input
                    id="distance"
                    type="number"
                    value={formData.distance_km}
                    onChange={(e) => setFormData({ ...formData, distance_km: parseFloat(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="duration">Duration (min)</Label>
                  <Input
                    id="duration"
                    type="number"
                    value={formData.estimated_duration_minutes}
                    onChange={(e) => setFormData({ ...formData, estimated_duration_minutes: parseInt(e.target.value) })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="fee">Fee Amount (₦)</Label>
                  <Input
                    id="fee"
                    type="number"
                    value={formData.fee_amount}
                    onChange={(e) => setFormData({ ...formData, fee_amount: parseFloat(e.target.value) })}
                  />
                </div>
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
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Pickup Points */}
              <div className="space-y-3 border-t pt-4">
                <h3 className="font-medium">Pickup Points</h3>
                
                {/* Existing Pickup Points */}
                {formData.pickup_points.length > 0 && (
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {formData.pickup_points.map((point, index) => (
                      <div key={index} className="flex items-start gap-2 p-3 bg-slate-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-slate-600">#{point.order}</span>
                            <p className="font-medium text-sm truncate">{point.name}</p>
                            <Badge variant="outline" className="text-xs">{point.time}</Badge>
                          </div>
                          <p className="text-xs text-slate-600 truncate mt-1">{point.address}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removePickupPoint(index)}
                          className="text-red-600 hover:text-red-700 flex-shrink-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Add New Pickup Point */}
                <div className="space-y-3 p-3 border rounded-lg bg-slate-50">
                  <p className="text-sm font-medium">Add Pickup Point</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      placeholder="Location name"
                      value={newPickupPoint.name}
                      onChange={(e) => setNewPickupPoint({ ...newPickupPoint, name: e.target.value })}
                    />
                    <Input
                      placeholder="Time (e.g., 07:00 AM)"
                      value={newPickupPoint.time}
                      onChange={(e) => setNewPickupPoint({ ...newPickupPoint, time: e.target.value })}
                    />
                  </div>
                  <Input
                    placeholder="Full address"
                    value={newPickupPoint.address}
                    onChange={(e) => setNewPickupPoint({ ...newPickupPoint, address: e.target.value })}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addPickupPoint}
                    className="w-full"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Point
                  </Button>
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
                <Button variant="outline" onClick={() => setShowAddDialog(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSubmit}>
                  {editingRoute ? 'Update Route' : 'Add Route'}
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
                  placeholder="Search by route name or code..."
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
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Routes List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredRoutes.length === 0 ? (
          <Card className="col-span-full">
            <CardContent className="p-8 text-center">
              <Route className="h-12 w-12 text-slate-400 mx-auto mb-4" />
              <p className="text-slate-600">No routes found</p>
            </CardContent>
          </Card>
        ) : (
          filteredRoutes.map((route) => (
            <Card key={route.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-lg bg-green-100 flex items-center justify-center">
                      <Route className="h-5 w-5 text-green-600" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{route.route_name}</CardTitle>
                      <p className="text-xs text-slate-600">{route.route_code}</p>
                    </div>
                  </div>
                  {getStatusBadge(route.status)}
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <MapPin className="h-3 w-3" />
                      <span className="text-xs">Distance</span>
                    </div>
                    <p className="font-medium">{route.distance_km} km</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <Clock className="h-3 w-3" />
                      <span className="text-xs">Duration</span>
                    </div>
                    <p className="font-medium">{route.estimated_duration_minutes} min</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1 text-slate-600">
                      <DollarSign className="h-3 w-3" />
                      <span className="text-xs">Fee</span>
                    </div>
                    <p className="font-medium">₦{route.fee_amount.toLocaleString()}</p>
                  </div>
                </div>

                {route.pickup_points && route.pickup_points.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                      <MapPin className="h-3 w-3 text-slate-600" />
                      <span className="text-xs font-medium text-slate-600">
                        {route.pickup_points.length} Pickup Points
                      </span>
                    </div>
                    <div className="space-y-1 max-h-32 overflow-y-auto">
                      {route.pickup_points.map((point, idx) => (
                        <div key={idx} className="flex items-center gap-2 text-xs">
                          <span className="text-slate-500">#{point.order}</span>
                          <span className="font-medium truncate flex-1">{point.name}</span>
                          <Badge variant="outline" className="text-xs">{point.time}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {route.student_count !== undefined && (
                  <div className="flex items-center gap-2 text-sm pt-2 border-t">
                    <Users className="h-4 w-4 text-blue-600" />
                    <span className="text-slate-600">{route.student_count} students assigned</span>
                  </div>
                )}

                <div className="flex gap-2 pt-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
                    onClick={() => handleEdit(route)}
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
                        <AlertDialogTitle>Delete Route</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {route.route_name}? This action cannot be undone.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={() => handleDelete(route.id)}
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
