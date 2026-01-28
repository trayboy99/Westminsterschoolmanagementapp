import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { AlertCircle, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

export function SessionSettingsDebug() {
  const [checking, setChecking] = useState(false);
  const [results, setResults] = useState<any>(null);
  const supabase = createClient();

  const runDiagnostics = async () => {
    setChecking(true);
    const diagnostics: any = {
      userAuth: { status: 'checking', message: '' },
      userRole: { status: 'checking', message: '' },
      tablesExist: { status: 'checking', message: '' },
      serverReachable: { status: 'checking', message: '' },
    };

    try {
      // Check 1: User Authentication
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        diagnostics.userAuth = {
          status: 'success',
          message: 'User is authenticated',
          userId: session.user.id,
        };

        // Check 2: User Role
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', session.user.id)
          .single();

        if (profile) {
          const isAdmin = ['principal', 'director', 'it_admin'].includes(profile.role);
          diagnostics.userRole = {
            status: isAdmin ? 'success' : 'error',
            message: `User role: ${profile.role} ${isAdmin ? '(Admin ✓)' : '(Not Admin ✗)'}`,
            role: profile.role,
          };
        } else {
          diagnostics.userRole = {
            status: 'error',
            message: `Failed to fetch user role: ${profileError?.message}`,
          };
        }

        // Check 3: Tables Exist
        try {
          const { data: sessionsData, error: sessionsError } = await supabase
            .from('academic_sessions')
            .select('id')
            .limit(1);

          const { data: termsData, error: termsError } = await supabase
            .from('academic_terms')
            .select('id')
            .limit(1);

          if (sessionsError?.code === '42P01' || termsError?.code === '42P01') {
            diagnostics.tablesExist = {
              status: 'error',
              message: 'Database tables do not exist. Run RESTRUCTURE_ACADEMIC_CALENDAR.sql',
              errorCode: '42P01',
            };
          } else if (!sessionsError && !termsError) {
            diagnostics.tablesExist = {
              status: 'success',
              message: 'Database tables exist',
            };
          } else {
            diagnostics.tablesExist = {
              status: 'warning',
              message: `Partial error: ${sessionsError?.message || termsError?.message}`,
            };
          }
        } catch (err) {
          diagnostics.tablesExist = {
            status: 'error',
            message: `Error checking tables: ${err instanceof Error ? err.message : 'Unknown'}`,
          };
        }

        // Check 4: Server Reachable
        try {
          const headers = {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          };

          const res = await fetch(
            `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
            { headers }
          );

          if (res.ok) {
            diagnostics.serverReachable = {
              status: 'success',
              message: 'Server endpoint is reachable',
              statusCode: res.status,
            };
          } else {
            diagnostics.serverReachable = {
              status: 'error',
              message: `Server returned status ${res.status}`,
              statusCode: res.status,
            };
          }
        } catch (err) {
          diagnostics.serverReachable = {
            status: 'error',
            message: `Cannot reach server: ${err instanceof Error ? err.message : 'Unknown'}`,
          };
        }
      } else {
        diagnostics.userAuth = {
          status: 'error',
          message: 'No active session. Please login.',
        };
      }
    } catch (error) {
      console.error('Diagnostics error:', error);
    }

    setResults(diagnostics);
    setChecking(false);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-600" />;
      case 'warning':
        return <AlertCircle className="h-5 w-5 text-yellow-600" />;
      default:
        return <Loader2 className="h-5 w-5 animate-spin text-blue-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'bg-green-50 border-green-200';
      case 'error':
        return 'bg-red-50 border-red-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      default:
        return 'bg-blue-50 border-blue-200';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Session Settings Diagnostics</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Run diagnostics to check if your system is properly configured for session settings.
          </AlertDescription>
        </Alert>

        <Button onClick={runDiagnostics} disabled={checking} className="w-full">
          {checking ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Running Diagnostics...
            </>
          ) : (
            'Run Diagnostics'
          )}
        </Button>

        {results && (
          <div className="space-y-3 mt-4">
            {Object.entries(results).map(([key, value]: [string, any]) => (
              <div
                key={key}
                className={`p-4 border rounded-lg ${getStatusColor(value.status)}`}
              >
                <div className="flex items-start gap-3">
                  {getStatusIcon(value.status)}
                  <div className="flex-1">
                    <div className="font-medium capitalize">
                      {key.replace(/([A-Z])/g, ' $1').trim()}
                    </div>
                    <div className="text-sm mt-1">{value.message}</div>
                    {value.errorCode && (
                      <div className="text-xs mt-1 font-mono bg-white/50 px-2 py-1 rounded">
                        Error Code: {value.errorCode}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {/* Recommendations */}
            <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium mb-2">Recommendations:</h4>
              <ul className="text-sm space-y-1 list-disc list-inside">
                {results.tablesExist?.status === 'error' && (
                  <li>Run the SQL script: RESTRUCTURE_ACADEMIC_CALENDAR.sql in Supabase SQL Editor</li>
                )}
                {results.userRole?.status === 'error' && (
                  <li>
                    Update your role to admin: 
                    <code className="ml-1 bg-white px-2 py-0.5 rounded text-xs">
                      UPDATE profiles SET role = 'it_admin' WHERE id = {'<your-id>'}
                    </code>
                  </li>
                )}
                {results.userAuth?.status === 'error' && (
                  <li>Please login to continue</li>
                )}
                {results.serverReachable?.status === 'error' && (
                  <li>Check Supabase Edge Functions logs and verify server deployment</li>
                )}
                {Object.values(results).every((r: any) => r.status === 'success') && (
                  <li className="text-green-700">✓ All systems operational! You can save session settings.</li>
                )}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
