import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from './ui/alert-dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from './ui/tooltip';
import { toast } from 'sonner@2.0.3';
import { Search, RefreshCw, CheckCircle, XCircle, Key, Calendar, User, Shield, TrendingUp, Clock, Activity } from 'lucide-react';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface Pin {
  id: string;
  student_id: string;
  term: string;
  session: string;
  pin_code: string;
  active: boolean;
  expires_at: string;
  created_at: string;
  student_name?: string;
  student_class?: string;
  usage_count?: number;
  last_used_at?: string;
}

export function PinManagement() {
  const [pins, setPins] = useState<Pin[]>([]);
  const [filteredPins, setFilteredPins] = useState<Pin[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive'>('all');
  const [filterSession, setFilterSession] = useState<string>('all');
  const [filterTerm, setFilterTerm] = useState<string>('all');
  const [sessions, setSessions] = useState<string[]>([]);
  const [terms, setTerms] = useState<string[]>([]);
  const [selectedPin, setSelectedPin] = useState<Pin | null>(null);
  const [actionDialog, setActionDialog] = useState<'deactivate' | 'activate' | 'delete' | null>(null);

  useEffect(() => {
    fetchPins();
  }, []);

  useEffect(() => {
    filterPins();
  }, [pins, searchTerm, filterStatus, filterSession, filterTerm]);

  const fetchPins = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/pins/all`,
        {
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch pins');
      }

      const data = await response.json();
      setPins(data.pins || []);
      
      // Extract unique sessions and terms for filters
      const uniqueSessions = [...new Set(data.pins.map((p: Pin) => p.session))];
      const uniqueTerms = [...new Set(data.pins.map((p: Pin) => p.term))];
      setSessions(uniqueSessions);
      setTerms(uniqueTerms);

      toast.success('Pins loaded successfully');
    } catch (error) {
      console.error('Error fetching pins:', error);
      toast.error('Failed to load pins');
    } finally {
      setLoading(false);
    }
  };

  const filterPins = () => {
    let filtered = [...pins];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (pin) =>
          pin.pin_code.toLowerCase().includes(search) ||
          pin.student_name?.toLowerCase().includes(search) ||
          pin.student_class?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter((pin) => 
        filterStatus === 'active' ? pin.active : !pin.active
      );
    }

    // Session filter
    if (filterSession !== 'all') {
      filtered = filtered.filter((pin) => pin.session === filterSession);
    }

    // Term filter
    if (filterTerm !== 'all') {
      filtered = filtered.filter((pin) => pin.term === filterTerm);
    }

    setFilteredPins(filtered);
  };

  const handlePinAction = async (action: 'activate' | 'deactivate' | 'delete') => {
    if (!selectedPin) return;

    try {
      const endpoint = action === 'delete' 
        ? `/pins/${selectedPin.id}/delete`
        : `/pins/${selectedPin.id}/${action}`;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a${endpoint}`,
        {
          method: action === 'delete' ? 'DELETE' : 'PATCH',
          headers: {
            Authorization: `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`Failed to ${action} pin`);
      }

      toast.success(`PIN ${action}d successfully`);
      fetchPins();
    } catch (error) {
      console.error(`Error ${action}ing pin:`, error);
      toast.error(`Failed to ${action} PIN`);
    } finally {
      setActionDialog(null);
      setSelectedPin(null);
    }
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Calculate statistics
  const stats = {
    total: pins.length,
    active: pins.filter(p => p.active && !isExpired(p.expires_at)).length,
    expired: pins.filter(p => isExpired(p.expires_at)).length,
    maxedOut: pins.filter(p => (p.usage_count || 0) >= 3).length,
  };

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg">
          <Shield className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1>PIN Management</h1>
          <p className="text-muted-foreground">
            View and manage student-generated result access PINs
          </p>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total PINs</p>
                <p className="text-2xl md:text-3xl mt-1">{stats.total}</p>
              </div>
              <Key className="h-8 w-8 text-muted-foreground opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active PINs</p>
                <p className="text-2xl md:text-3xl mt-1 text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Expired</p>
                <p className="text-2xl md:text-3xl mt-1 text-red-600">{stats.expired}</p>
              </div>
              <Clock className="h-8 w-8 text-red-500 opacity-50" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Maxed Out</p>
                <p className="text-2xl md:text-3xl mt-1 text-orange-600">{stats.maxedOut}</p>
              </div>
              <Activity className="h-8 w-8 text-orange-500 opacity-50" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <CardTitle>Search & Filter</CardTitle>
              <CardDescription>Find specific PINs using filters below</CardDescription>
            </div>
            <Button onClick={fetchPins} disabled={loading} variant="outline" size="sm">
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search PIN, student, class..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <Select value={filterStatus} onValueChange={(value: any) => setFilterStatus(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">✓ Active Only</SelectItem>
                <SelectItem value="inactive">✗ Inactive Only</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filterSession} onValueChange={setFilterSession}>
              <SelectTrigger>
                <SelectValue placeholder="Session" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Sessions</SelectItem>
                {sessions.map((session) => (
                  <SelectItem key={session} value={session}>
                    {session}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={filterTerm} onValueChange={setFilterTerm}>
              <SelectTrigger>
                <SelectValue placeholder="Term" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Terms</SelectItem>
                {terms.map((term) => (
                  <SelectItem key={term} value={term}>
                    {term}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-center justify-between pt-2 border-t">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Showing <span className="font-medium text-foreground">{filteredPins.length}</span> of <span className="font-medium text-foreground">{pins.length}</span> PINs
              </p>
            </div>
            {(searchTerm || filterStatus !== 'all' || filterSession !== 'all' || filterTerm !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearchTerm('');
                  setFilterStatus('all');
                  setFilterSession('all');
                  setFilterTerm('all');
                }}
                className="text-xs"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pins Table */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Key className="h-5 w-5 text-primary" />
            <div>
              <CardTitle>PIN Records</CardTitle>
              <CardDescription>Complete list of all student-generated PINs</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-12">
              <RefreshCw className="h-10 w-10 animate-spin mx-auto text-primary mb-3" />
              <p className="text-muted-foreground">Loading PIN records...</p>
              <p className="text-xs text-muted-foreground mt-1">Please wait</p>
            </div>
          ) : filteredPins.length === 0 ? (
            <div className="text-center py-12">
              <div className="inline-flex p-4 bg-muted rounded-full mb-4">
                <Key className="h-10 w-10 text-muted-foreground" />
              </div>
              <p className="text-muted-foreground mb-1">
                {searchTerm || filterStatus !== 'all' || filterSession !== 'all' || filterTerm !== 'all' 
                  ? 'No PINs match your filters' 
                  : 'No PINs have been generated yet'}
              </p>
              <p className="text-xs text-muted-foreground">
                {searchTerm || filterStatus !== 'all' || filterSession !== 'all' || filterTerm !== 'all'
                  ? 'Try adjusting your search criteria'
                  : 'Students can generate PINs from their dashboard to access results'}
              </p>
            </div>
          ) : (
            <div className="rounded-md border">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-semibold">PIN Code</TableHead>
                      <TableHead className="font-semibold">Student</TableHead>
                      <TableHead className="font-semibold hidden md:table-cell">Class</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Session</TableHead>
                      <TableHead className="font-semibold hidden lg:table-cell">Term</TableHead>
                      <TableHead className="font-semibold">Usage</TableHead>
                      <TableHead className="font-semibold">Status</TableHead>
                      <TableHead className="font-semibold hidden xl:table-cell">Expires</TableHead>
                      <TableHead className="font-semibold hidden xl:table-cell">Created</TableHead>
                      <TableHead className="font-semibold text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredPins.map((pin) => (
                      <TableRow key={pin.id} className="hover:bg-muted/30 transition-colors">
                        <TableCell>
                          <code className="px-2.5 py-1.5 bg-primary/10 text-primary rounded font-mono text-xs md:text-sm font-medium">
                            {pin.pin_code}
                          </code>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 min-w-[120px]">
                            <div className="p-1.5 bg-muted rounded-full">
                              <User className="h-3.5 w-3.5 text-muted-foreground" />
                            </div>
                            <span className="text-sm truncate">{pin.student_name || 'Unknown'}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="outline" className="font-normal">
                            {pin.student_class || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell text-sm">{pin.session}</TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <Badge variant="secondary" className="font-normal">
                            {pin.term}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <TooltipProvider>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <div className="flex flex-col gap-1">
                                  <Badge 
                                    variant={
                                      (pin.usage_count || 0) >= 3 ? "destructive" : 
                                      (pin.usage_count || 0) >= 2 ? "default" : 
                                      "secondary"
                                    }
                                    className="w-fit font-medium"
                                  >
                                    {pin.usage_count || 0} / 3
                                  </Badge>
                                  {pin.last_used_at && (
                                    <span className="text-[10px] text-muted-foreground leading-tight">
                                      {formatDate(pin.last_used_at)}
                                    </span>
                                  )}
                                </div>
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {pin.last_used_at 
                                    ? `Last used: ${formatDate(pin.last_used_at)}`
                                    : 'Never used'}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                        </TableCell>
                        <TableCell>
                          {isExpired(pin.expires_at) ? (
                            <Badge variant="destructive" className="font-medium">
                              <Clock className="h-3 w-3 mr-1" />
                              Expired
                            </Badge>
                          ) : pin.active ? (
                            <Badge variant="default" className="bg-green-500 hover:bg-green-600 font-medium">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary" className="font-medium">
                              <XCircle className="h-3 w-3 mr-1" />
                              Inactive
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="hidden xl:table-cell">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="h-3.5 w-3.5" />
                            <span className="text-xs">{formatDate(pin.expires_at)}</span>
                          </div>
                        </TableCell>
                        <TableCell className="hidden xl:table-cell text-xs text-muted-foreground">
                          {formatDate(pin.created_at)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center justify-end gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  {pin.active ? (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0 hover:bg-destructive hover:text-destructive-foreground hover:border-destructive"
                                      onClick={() => {
                                        setSelectedPin(pin);
                                        setActionDialog('deactivate');
                                      }}
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </Button>
                                  ) : (
                                    <Button
                                      size="sm"
                                      variant="outline"
                                      className="h-8 w-8 p-0 hover:bg-green-500 hover:text-white hover:border-green-500"
                                      onClick={() => {
                                        setSelectedPin(pin);
                                        setActionDialog('activate');
                                      }}
                                    >
                                      <CheckCircle className="h-4 w-4" />
                                    </Button>
                                  )}
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p className="text-xs">
                                    {pin.active ? 'Deactivate PIN' : 'Activate PIN'}
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Action Confirmation Dialog */}
      <AlertDialog open={actionDialog !== null} onOpenChange={() => setActionDialog(null)}>
        <AlertDialogContent className="max-w-md">
          <AlertDialogHeader>
            <div className="flex items-center gap-3 mb-2">
              {actionDialog === 'activate' && (
                <div className="p-2 bg-green-100 rounded-full">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                </div>
              )}
              {actionDialog === 'deactivate' && (
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              )}
              {actionDialog === 'delete' && (
                <div className="p-2 bg-red-100 rounded-full">
                  <XCircle className="h-5 w-5 text-red-600" />
                </div>
              )}
              <AlertDialogTitle className="text-xl">
                {actionDialog === 'activate' && 'Activate PIN'}
                {actionDialog === 'deactivate' && 'Deactivate PIN'}
                {actionDialog === 'delete' && 'Delete PIN'}
              </AlertDialogTitle>
            </div>
            <AlertDialogDescription className="text-base leading-relaxed">
              {actionDialog === 'activate' && (
                <>
                  Are you sure you want to <span className="font-semibold text-foreground">activate</span> this PIN?
                  <br />
                  <span className="text-green-600 font-medium mt-2 block">
                    The student will be able to use it to access their results.
                  </span>
                </>
              )}
              {actionDialog === 'deactivate' && (
                <>
                  Are you sure you want to <span className="font-semibold text-foreground">deactivate</span> this PIN?
                  <br />
                  <span className="text-red-600 font-medium mt-2 block">
                    The student will NOT be able to use it to access their results.
                  </span>
                </>
              )}
              {actionDialog === 'delete' && (
                <>
                  Are you sure you want to <span className="font-semibold text-foreground">permanently delete</span> this PIN?
                  <br />
                  <span className="text-red-600 font-medium mt-2 block">
                    This action cannot be undone.
                  </span>
                </>
              )}
            </AlertDialogDescription>
            {selectedPin && (
              <div className="mt-4 p-3 bg-muted rounded-lg space-y-1.5 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">PIN:</span>
                  <code className="px-2 py-1 bg-background rounded font-mono font-semibold">
                    {selectedPin.pin_code}
                  </code>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Student:</span>
                  <span className="font-medium">{selectedPin.student_name || 'Unknown'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Class:</span>
                  <span className="font-medium">{selectedPin.student_class || 'N/A'}</span>
                </div>
              </div>
            )}
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:gap-2">
            <AlertDialogCancel onClick={() => setSelectedPin(null)} className="sm:flex-1">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => actionDialog && handlePinAction(actionDialog)}
              className={`sm:flex-1 ${
                actionDialog === 'activate' 
                  ? 'bg-green-600 hover:bg-green-700' 
                  : 'bg-destructive hover:bg-destructive/90'
              }`}
            >
              {actionDialog === 'activate' && 'Activate'}
              {actionDialog === 'deactivate' && 'Deactivate'}
              {actionDialog === 'delete' && 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}