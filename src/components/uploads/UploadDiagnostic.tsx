import { useState } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

export function UploadDiagnostic() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const supabase = createClient();

  const runDiagnostic = async () => {
    try {
      setLoading(true);
      setResult(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setResult({ error: 'Not authenticated' });
        return;
      }

      console.log('🔍 Running upload diagnostic...');

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/uploads/diagnostic`,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session.access_token}`
          }
        }
      );

      const data = await res.json();
      console.log('📊 Diagnostic result:', data);
      setResult(data);
    } catch (error) {
      console.error('❌ Diagnostic error:', error);
      setResult({ error: 'Diagnostic failed: ' + (error as Error).message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Upload System Diagnostic</CardTitle>
        <CardDescription>
          Check what uploads exist in the database for your account
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Button onClick={runDiagnostic} disabled={loading}>
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Run Diagnostic
        </Button>

        {result && (
          <div className="space-y-4">
            {result.error ? (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{result.error}</AlertDescription>
              </Alert>
            ) : (
              <>
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    Diagnostic completed successfully
                  </AlertDescription>
                </Alert>

                <div className="space-y-3">
                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium mb-2">Your Profile</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Name:</strong> {result.profile?.name}</p>
                      <p><strong>Role:</strong> {result.profile?.role}</p>
                      <p><strong>Class ID:</strong> {result.profile?.class_id || 'Not assigned'}</p>
                    </div>
                  </div>

                  {result.classInfo && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium mb-2">Your Class</h4>
                      <div className="text-sm space-y-1">
                        <p><strong>Name:</strong> {result.classInfo.name}</p>
                        <p><strong>Level:</strong> {result.classInfo.level}</p>
                        <p><strong>Section:</strong> {result.classInfo.section || 'N/A'}</p>
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 rounded-lg">
                    <h4 className="font-medium mb-2">Upload Statistics</h4>
                    <div className="text-sm space-y-1">
                      <p><strong>Total Uploads for Your Class:</strong> {result.totalUploads}</p>
                      <p><strong>Unique Sessions:</strong> {Array.isArray(result.uniqueSessions) ? result.uniqueSessions.join(', ') : JSON.stringify(result.uniqueSessions)}</p>
                      <p><strong>Unique Terms:</strong> {Array.isArray(result.uniqueTerms) ? result.uniqueTerms.join(', ') : JSON.stringify(result.uniqueTerms)}</p>
                      <p><strong>Unique Types:</strong> {Array.isArray(result.uniqueTypes) ? result.uniqueTypes.join(', ') : JSON.stringify(result.uniqueTypes)}</p>
                    </div>
                  </div>

                  {result.totalUploads === 0 && (
                    <Alert variant="destructive">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        <strong>No uploads found for your class!</strong>
                        <br />
                        This means either:
                        <ul className="list-disc ml-4 mt-2">
                          <li>Your teacher hasn't uploaded any materials yet</li>
                          <li>Your class_id is not set correctly</li>
                          <li>The uploads weren't assigned to your class</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  )}

                  {result.uploads && result.uploads.length > 0 && (
                    <div className="p-4 bg-slate-50 rounded-lg">
                      <h4 className="font-medium mb-2">Recent Uploads (First 5)</h4>
                      <div className="space-y-2">
                        {result.uploads.slice(0, 5).map((upload: any, idx: number) => (
                          <div key={idx} className="text-sm p-2 bg-white rounded border border-slate-200">
                            <p><strong>{upload.title}</strong></p>
                            <p className="text-slate-600">
                              {upload.session} / {upload.term} / {upload.type}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
