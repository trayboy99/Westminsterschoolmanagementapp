import { useState } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { AlertCircle, CheckCircle, RefreshCw } from 'lucide-react';

export function AuthDebugPanel() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const supabase = createClient();

  const checkAuth = async () => {
    setLoading(true);
    try {
      // Get session
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      console.log('[AuthDebug] Session:', session);
      console.log('[AuthDebug] Session error:', sessionError);

      if (!session) {
        setResult({
          success: false,
          error: 'No session found',
          sessionError: sessionError?.message,
        });
        return;
      }

      // Call diagnostic endpoint
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/auth-check`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      console.log('[AuthDebug] Server response:', data);

      setResult({
        success: data.success,
        sessionExists: true,
        sessionExpiry: session.expires_at ? new Date(session.expires_at * 1000).toISOString() : 'unknown',
        sessionUser: session.user?.email,
        serverResponse: data,
      });
    } catch (error) {
      console.error('[AuthDebug] Error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  const refreshSession = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.auth.refreshSession();
      console.log('[AuthDebug] Refresh result:', data, error);
      
      setResult({
        success: !error,
        refreshed: true,
        error: error?.message,
        newSession: data.session ? {
          user: data.session.user.email,
          expiresAt: new Date(data.session.expires_at! * 1000).toISOString(),
        } : null,
      });
    } catch (error) {
      console.error('[AuthDebug] Refresh error:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          {result?.success ? (
            <CheckCircle className="w-5 h-5 text-green-600" />
          ) : result && !result.success ? (
            <AlertCircle className="w-5 h-5 text-red-600" />
          ) : null}
          Auth Diagnostic Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-2">
          <Button onClick={checkAuth} disabled={loading}>
            {loading ? 'Checking...' : 'Check Auth Status'}
          </Button>
          <Button onClick={refreshSession} disabled={loading} variant="outline">
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Session
          </Button>
        </div>

        {result && (
          <div className="p-4 bg-gray-50 rounded-lg">
            <pre className="text-sm overflow-auto whitespace-pre-wrap">
              {JSON.stringify(result, null, 2)}
            </pre>
          </div>
        )}

        <div className="text-sm text-gray-600 space-y-1">
          <p><strong>What this checks:</strong></p>
          <ul className="list-disc list-inside space-y-1">
            <li>Whether you have an active session in the browser</li>
            <li>Whether the server can validate your access token</li>
            <li>Session expiry time</li>
            <li>Any auth errors</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
