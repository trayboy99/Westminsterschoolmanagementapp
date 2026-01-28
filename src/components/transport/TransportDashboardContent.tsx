import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Bus, Users, Route, DollarSign, AlertCircle, TrendingUp, MapPin, UserCog } from 'lucide-react';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface TransportStats {
  totalBuses: number;
  activeBuses: number;
  totalRoutes: number;
  totalDrivers: number;
  totalStudents: number;
  paidStudents: number;
  pendingPayments: number;
  totalRevenue: number;
  maintenanceDue: number;
}

export function TransportDashboardContent() {
  const [stats, setStats] = useState<TransportStats>({
    totalBuses: 0,
    activeBuses: 0,
    totalRoutes: 0,
    totalDrivers: 0,
    totalStudents: 0,
    paidStudents: 0,
    pendingPayments: 0,
    totalRevenue: 0,
    maintenanceDue: 0
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/transport/stats`,
        { headers }
      );

      if (res.ok) {
        const data = await res.json();
        if (data.success && data.stats) {
          setStats({
            totalBuses: data.stats.totalBuses || 0,
            activeBuses: data.stats.activeBuses || 0,
            totalRoutes: data.stats.totalRoutes || 0,
            totalDrivers: data.stats.totalDrivers || 0,
            totalStudents: data.stats.totalStudents || 0,
            paidStudents: data.stats.paidStudents || 0,
            pendingPayments: data.stats.pendingPayments || 0,
            totalRevenue: data.stats.totalRevenue || 0,
            maintenanceDue: data.stats.maintenanceDue || 0
          });
          setRecentActivity(data.recentActivity || []);
        }
      }
    } catch (error) {
      console.error('Error fetching transport stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const paymentPercentage = stats.totalStudents > 0 
    ? Math.round((stats.paidStudents / stats.totalStudents) * 100) 
    : 0;

  const busUtilization = stats.totalBuses > 0
    ? Math.round((stats.activeBuses / stats.totalBuses) * 100)
    : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 sm:p-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl md:text-3xl">Transport Management Dashboard</h1>
        <p className="text-slate-600 mt-1 text-sm sm:text-base">
          Monitor and manage school transportation
        </p>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Buses */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm">Total Buses</CardTitle>
            <Bus className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalBuses}</div>
            <div className="flex items-center gap-2 mt-2">
              <Badge variant="outline" className="text-xs">
                {stats.activeBuses} Active
              </Badge>
              <span className="text-xs text-slate-600">
                {busUtilization}% utilized
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Routes */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm">Active Routes</CardTitle>
            <Route className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalRoutes}</div>
            <p className="text-xs text-slate-600 mt-2">
              Covering all school zones
            </p>
          </CardContent>
        </Card>

        {/* Students */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm">Students</CardTitle>
            <Users className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">{stats.totalStudents}</div>
            <Progress value={paymentPercentage} className="mt-2 h-2" />
            <p className="text-xs text-slate-600 mt-1">
              {paymentPercentage}% paid transport fees
            </p>
          </CardContent>
        </Card>

        {/* Revenue */}
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm">Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-emerald-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl">₦{(stats.totalRevenue || 0).toLocaleString()}</div>
            <div className="flex items-center gap-1 mt-2 text-xs text-orange-600">
              <AlertCircle className="h-3 w-3" />
              <span>₦{(stats.pendingPayments || 0).toLocaleString()} pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Drivers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Drivers</CardTitle>
              <UserCog className="h-4 w-4 text-slate-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.totalDrivers}</div>
            <p className="text-xs text-slate-600 mt-1">Licensed drivers</p>
          </CardContent>
        </Card>

        {/* Maintenance */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Maintenance Due</CardTitle>
              <AlertCircle className="h-4 w-4 text-orange-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl">{stats.maintenanceDue}</div>
            <p className="text-xs text-orange-600 mt-1">
              {stats.maintenanceDue > 0 ? 'Requires attention' : 'All up to date'}
            </p>
          </CardContent>
        </Card>

        {/* Payment Status */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Payment Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Paid:</span>
                <span className="font-medium text-green-600">{stats.paidStudents}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Pending:</span>
                <span className="font-medium text-orange-600">
                  {stats.totalStudents - stats.paidStudents}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="text-sm text-slate-600 text-center py-8">
              No recent activity to display
            </p>
          ) : (
            <div className="space-y-4">
              {recentActivity.slice(0, 5).map((activity, index) => (
                <div key={index} className="flex items-start gap-3 pb-3 border-b last:border-0">
                  <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <MapPin className="h-4 w-4 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium break-words">{activity.title}</p>
                    <p className="text-xs text-slate-600">{activity.description}</p>
                    <p className="text-xs text-slate-500 mt-1">{activity.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg">
          <p className="text-xs text-blue-700 uppercase tracking-wide">Bus Capacity</p>
          <p className="text-2xl text-blue-900 mt-1">
            {stats.totalBuses * 40}
          </p>
          <p className="text-xs text-blue-600 mt-1">Total seats available</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-green-50 to-green-100 rounded-lg">
          <p className="text-xs text-green-700 uppercase tracking-wide">Route Coverage</p>
          <p className="text-2xl text-green-900 mt-1">{stats.totalRoutes}</p>
          <p className="text-xs text-green-600 mt-1">Active routes</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-purple-50 to-purple-100 rounded-lg">
          <p className="text-xs text-purple-700 uppercase tracking-wide">Students</p>
          <p className="text-2xl text-purple-900 mt-1">{stats.totalStudents}</p>
          <p className="text-xs text-purple-600 mt-1">Using transport</p>
        </div>

        <div className="p-4 bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg">
          <p className="text-xs text-emerald-700 uppercase tracking-wide">Collection Rate</p>
          <p className="text-2xl text-emerald-900 mt-1">{paymentPercentage}%</p>
          <p className="text-xs text-emerald-600 mt-1">Payment received</p>
        </div>
      </div>
    </div>
  );
}
