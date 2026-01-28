import React, { useState } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { AlertCircle, CheckCircle, Clock, XCircle, Search } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface RegistrationStatus {
  status: 'pending' | 'approved' | 'rejected' | 'active';
  submitted_at?: string;
  reviewed_at?: string;
  message: string;
}

export function RegistrationStatusChecker() {
  const [email, setEmail] = useState('');
  const [isChecking, setIsChecking] = useState(false);
  const [status, setStatus] = useState<RegistrationStatus | null>(null);
  const [error, setError] = useState('');

  const handleCheckStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    setIsChecking(true);
    setStatus(null);
    setError('');

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/check-registration-status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify({ email })
      });

      const result = await response.json();

      if (result.success) {
        setStatus({
          status: result.status,
          submitted_at: result.submitted_at,
          reviewed_at: result.reviewed_at,
          message: result.message
        });
      } else {
        setError(result.error || 'Unable to check registration status');
      }
    } catch (error) {
      console.error('Status check error:', error);
      setError('Network error. Please try again.');
    } finally {
      setIsChecking(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-5 w-5 text-yellow-600" />;
      case 'approved':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active':
        return <CheckCircle className="h-5 w-5 text-blue-600" />;
      case 'rejected':
        return <XCircle className="h-5 w-5 text-red-600" />;
      default:
        return <AlertCircle className="h-5 w-5 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'border-yellow-200 bg-yellow-50';
      case 'approved':
        return 'border-green-200 bg-green-50';
      case 'active':
        return 'border-blue-200 bg-blue-50';
      case 'rejected':
        return 'border-red-200 bg-red-50';
      default:
        return 'border-gray-200 bg-gray-50';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'active':
        return 'Active Account';
      case 'rejected':
        return 'Not Approved';
      default:
        return 'Unknown';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          <Search className="h-6 w-6" />
        </div>
        <CardTitle>Check Registration Status</CardTitle>
        <CardDescription>
          Enter your email to check the status of your registration application
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleCheckStatus} className="space-y-4">
          <div>
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email address"
              required
            />
          </div>

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isChecking}
          >
            {isChecking ? 'Checking Status...' : 'Check Status'}
          </Button>
        </form>

        {/* Error Message */}
        {error && (
          <Alert className="mt-4 border-red-200 bg-red-50">
            <AlertCircle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* Status Display */}
        {status && (
          <Alert className={`mt-4 ${getStatusColor(status.status)}`}>
            <div className="flex items-start gap-3">
              {getStatusIcon(status.status)}
              <div className="flex-1">
                <div className="font-medium mb-1">
                  Status: {getStatusText(status.status)}
                </div>
                <div className="text-sm text-muted-foreground mb-3">
                  {status.message}
                </div>
                
                {status.submitted_at && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Submitted:</strong> {formatDate(status.submitted_at)}
                  </div>
                )}
                
                {status.reviewed_at && (
                  <div className="text-xs text-muted-foreground">
                    <strong>Reviewed:</strong> {formatDate(status.reviewed_at)}
                  </div>
                )}

                {status.status === 'active' && (
                  <div className="mt-3 pt-2 border-t">
                    <Button asChild size="sm" className="w-full">
                      <a href="#login">Login to Your Account</a>
                    </Button>
                  </div>
                )}

                {status.status === 'approved' && (
                  <div className="mt-3 pt-2 border-t">
                    <Button asChild size="sm" className="w-full">
                      <a href="#login">Login to Your Account</a>
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </Alert>
        )}

        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>Need help? <a href="#contact" className="text-primary hover:underline">Contact administration</a></p>
        </div>
      </CardContent>
    </Card>
  );
}