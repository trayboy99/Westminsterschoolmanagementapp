import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { AlertCircle, CheckCircle, XCircle, User, Mail, Calendar, RefreshCw } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../ui/dialog';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { useAuth } from '../../contexts/AuthContext';

interface PendingRegistration {
  email: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  role: string;
  status: string;
  submitted_at: string;
  additional_info: any;
}

export function PendingRegistrationsManager() {
  const [registrations, setRegistrations] = useState<PendingRegistration[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { profile } = useAuth();

  const client = supabase;

  // Check if user has permission to view pending registrations (IT Admin only now)
  const canViewRegistrations = profile?.role === 'it_admin';

  const fetchPendingRegistrations = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('You must be logged in to view pending registrations');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/get-pending-registrations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        }
      });

      const result = await response.json();

      if (result.success) {
        setRegistrations(result.registrations || []);
      } else {
        setError(result.error || 'Failed to fetch pending registrations');
      }
    } catch (error) {
      console.error('Error fetching pending registrations:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegistrationAction = async (email: string, action: 'approve' | 'reject') => {
    try {
      setProcessingId(email);
      setError('');

      // Get current session
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setError('You must be logged in to process registrations');
        return;
      }

      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/approve-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`
        },
        body: JSON.stringify({ email, action })
      });

      const result = await response.json();

      if (result.success) {
        // Remove the processed registration from the list
        setRegistrations(prev => prev.filter(reg => reg.email !== email));
        
        // Show success message
        alert(`Registration ${action}d successfully`);
      } else {
        setError(result.error || `Failed to ${action} registration`);
      }
    } catch (error) {
      console.error(`Error ${action}ing registration:`, error);
      setError('Network error. Please try again.');
    } finally {
      setProcessingId(null);
    }
  };

  useEffect(() => {
    if (canViewRegistrations) {
      fetchPendingRegistrations();
    } else {
      setIsLoading(false);
      setError('Access denied - only IT Administrators can view pending registrations');
    }
  }, [canViewRegistrations]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'student': return 'default';
      case 'teacher': return 'secondary';
      case 'admin': return 'destructive';
      default: return 'outline';
    }
  };

  const RegistrationDetails = ({ registration }: { registration: PendingRegistration }) => (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <p className="text-sm font-medium">Name</p>
          <p className="text-sm text-muted-foreground">
            {registration.first_name} {registration.middle_name} {registration.last_name}
          </p>
        </div>
        <div>
          <p className="text-sm font-medium">Email</p>
          <p className="text-sm text-muted-foreground">{registration.email}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Role</p>
          <Badge variant={getRoleBadgeVariant(registration.role)}>
            {registration.role}
          </Badge>
        </div>
        <div>
          <p className="text-sm font-medium">Submitted</p>
          <p className="text-sm text-muted-foreground">
            {formatDate(registration.submitted_at)}
          </p>
        </div>
      </div>

      {/* Role-specific additional information */}
      {registration.additional_info && Object.keys(registration.additional_info).length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">Additional Information</p>
          <div className="bg-muted p-3 rounded-md space-y-2">
            {Object.entries(registration.additional_info).map(([key, value]) => (
              value && (
                <div key={key} className="flex justify-between">
                  <span className="text-sm font-medium capitalize">
                    {key.replace(/_/g, ' ')}:
                  </span>
                  <span className="text-sm text-muted-foreground">
                    {String(value)}
                  </span>
                </div>
              )
            ))}
          </div>
        </div>
      )}
    </div>
  );

  // Don't show anything if user doesn't have permission
  if (!canViewRegistrations) {
    return null;
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <RefreshCw className="h-5 w-5 animate-spin" />
            Loading Pending Registrations...
          </CardTitle>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Pending Registrations
            </CardTitle>
            <CardDescription>
              Review and approve new user registration applications
            </CardDescription>
          </div>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={fetchPendingRegistrations}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <Alert className="mb-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {registrations.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Pending Registrations</h3>
            <p className="text-muted-foreground">
              All registration applications have been processed
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {registrations.map((registration) => (
              <Card key={registration.email} className="border-l-4 border-l-yellow-400">
                <CardContent className="pt-4 sm:pt-6 px-3 sm:px-6">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4 gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start flex-wrap gap-2 mb-2">
                        <h4 className="font-medium text-sm sm:text-base break-words">
                          {registration.first_name} {registration.last_name}
                        </h4>
                        <Badge variant={getRoleBadgeVariant(registration.role)} className="text-xs">
                          {registration.role}
                        </Badge>
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-xs sm:text-sm text-muted-foreground">
                        <div className="flex items-center gap-1 min-w-0">
                          <Mail className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="truncate">{registration.email}</span>
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          <Calendar className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                          <span className="text-xs sm:text-sm">{formatDate(registration.submitted_at)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button variant="outline" size="sm" className="w-full sm:w-auto text-xs sm:text-sm">
                          View Details
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-[95vw] sm:max-w-md">
                        <DialogHeader>
                          <DialogTitle className="text-base sm:text-lg">Registration Details</DialogTitle>
                          <DialogDescription className="text-xs sm:text-sm">
                            Review the complete application information
                          </DialogDescription>
                        </DialogHeader>
                        <RegistrationDetails registration={registration} />
                      </DialogContent>
                    </Dialog>

                    <div className="flex gap-2 w-full sm:w-auto">
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleRegistrationAction(registration.email, 'reject')}
                        disabled={processingId === registration.email}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <XCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        onClick={() => handleRegistrationAction(registration.email, 'approve')}
                        disabled={processingId === registration.email}
                        className="flex-1 sm:flex-none text-xs sm:text-sm"
                      >
                        <CheckCircle className="h-3 w-3 sm:h-4 sm:w-4 mr-1" />
                        {processingId === registration.email ? 'Processing...' : 'Approve'}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}