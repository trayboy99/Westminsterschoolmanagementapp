import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { RefreshCw, CheckCircle, XCircle } from 'lucide-react';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function DeadlineDebug() {
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchSettings = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('[DeadlineDebug] Fetching settings...');
      console.log('[DeadlineDebug] Using anon key for auth');
      
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-settings`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      console.log('[DeadlineDebug] Response status:', response.status);
      const data = await response.json();
      console.log('[DeadlineDebug] Response data:', data);
      
      setSettings(data);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error('[DeadlineDebug] Error:', err);
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>🐛 Deadline Debug Panel</CardTitle>
          <Button onClick={fetchSettings} disabled={loading} size="sm">
            <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant="destructive">
            <XCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>Error:</strong> {error}
            </AlertDescription>
          </Alert>
        )}

        {settings && (
          <>
            <Alert className={settings.success ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}>
              {settings.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <XCircle className="h-4 w-4 text-red-600" />
              )}
              <AlertDescription>
                <strong>API Response:</strong> {settings.success ? 'Success' : 'Failed'}
              </AlertDescription>
            </Alert>

            <div className="bg-slate-50 rounded-lg p-4 space-y-2">
              <h3 className="font-semibold">Raw Data:</h3>
              <pre className="text-xs overflow-auto bg-white p-3 rounded border">
                {JSON.stringify(settings, null, 2)}
              </pre>
            </div>

            {settings.settings?.deadlines && (
              <div className="space-y-2">
                <h3 className="font-semibold">Deadlines Found: {settings.settings.deadlines.length}</h3>
                {settings.settings.deadlines.length === 0 ? (
                  <Alert>
                    <AlertDescription>
                      No deadlines configured yet. Go to Upload Settings to add some.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-2">
                    {settings.settings.deadlines.map((deadline: any, index: number) => (
                      <Card key={index} className={deadline.enabled ? 'border-green-500' : 'border-gray-300'}>
                        <CardContent className="p-3">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <strong>Term:</strong> {deadline.term}
                            </div>
                            <div>
                              <strong>Session:</strong> {deadline.session}
                            </div>
                            <div>
                              <strong>Type:</strong> {deadline.uploadType}
                            </div>
                            <div>
                              <strong>Enabled:</strong> {deadline.enabled ? '✅ Yes' : '❌ No'}
                            </div>
                            <div className="col-span-2">
                              <strong>Deadline:</strong> {new Date(deadline.deadline).toLocaleString()}
                            </div>
                            {deadline.description && (
                              <div className="col-span-2">
                                <strong>Description:</strong> {deadline.description}
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {loading && (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-sm text-slate-600 mt-2">Loading settings...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
