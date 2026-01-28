import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { Loader2, RefreshCw, Database } from 'lucide-react';

export function AuthDebug() {
  const { user, profile, loading, databaseReady } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>(null);
  const [fetching, setFetching] = useState(false);

  const fetchDebugInfo = async () => {
    setFetching(true);
    try {
      // Get all profiles from server
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/debug-profiles`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${publicAnonKey}`,
          'Content-Type': 'application/json'
        }
      });

      const result = await response.json();
      
      // Also try to get current user's profile specifically
      let userProfileResponse = null;
      if (user?.email) {
        try {
          const userProfileRes = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/get-profile`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${publicAnonKey}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email: user.email })
          });
          userProfileResponse = await userProfileRes.json();
        } catch (err) {
          userProfileResponse = { error: err instanceof Error ? err.message : 'Unknown error' };
        }
      }

      setDebugInfo({
        serverResponse: result,
        userProfileResponse,
        authUser: user,
        profile: profile,
        databaseReady,
        loading
      });
    } catch (error) {
      console.error('Debug fetch error:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : 'Unknown error' });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    fetchDebugInfo();
  }, []);

  return (
    <Card className="m-4">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Database className="h-5 w-5" />
          Authentication Debug Info
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Button 
            onClick={fetchDebugInfo} 
            disabled={fetching}
            className="flex items-center gap-2"
          >
            {fetching ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="h-4 w-4" />
            )}
            Refresh Debug Info
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="font-semibold mb-2">Auth State</h3>
              <div className="bg-slate-100 p-3 rounded text-sm">
                <p><strong>User:</strong> {user?.email || 'None'}</p>
                <p><strong>Profile:</strong> {profile?.email || 'None'}</p>
                <p><strong>Database Ready:</strong> {databaseReady ? 'Yes' : 'No'}</p>
                <p><strong>Loading:</strong> {loading ? 'Yes' : 'No'}</p>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Profile Data</h3>
              <div className="bg-slate-100 p-3 rounded text-xs">
                <pre>{JSON.stringify(profile, null, 2)}</pre>
              </div>
            </div>
          </div>

          {debugInfo && (
            <div>
              <h3 className="font-semibold mb-2">Debug Information</h3>
              <div className="bg-slate-100 p-3 rounded text-xs overflow-auto max-h-96">
                <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}