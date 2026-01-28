import { useState } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { supabase } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function ConnectionTest() {
  const [testing, setTesting] = useState(false);
  const [results, setResults] = useState<{
    supabaseConfig: boolean | null;
    authConnection: boolean | null;
    databaseConnection: boolean | null;
    error?: string;
  }>({
    supabaseConfig: null,
    authConnection: null,
    databaseConnection: null
  });

  const testConnection = async () => {
    setTesting(true);
    const testResults: typeof results = {
      supabaseConfig: null,
      authConnection: null,
      databaseConnection: null
    };

    try {
      // Test 1: Check if Supabase config is valid
      console.log('Testing Supabase configuration...');
      if (projectId && publicAnonKey) {
        testResults.supabaseConfig = true;
        console.log('✅ Supabase config looks valid');
      } else {
        testResults.supabaseConfig = false;
        testResults.error = 'Missing Supabase configuration';
      }

      // Test 2: Try to connect to auth
      console.log('Testing auth connection...');
      try {
        const { data, error } = await supabase.auth.getSession();
        if (error) {
          console.warn('Auth connection error:', error);
          testResults.authConnection = false;
          testResults.error = error.message;
        } else {
          console.log('✅ Auth connection successful');
          testResults.authConnection = true;
        }
      } catch (err) {
        console.error('Auth connection failed:', err);
        testResults.authConnection = false;
        testResults.error = err instanceof Error ? err.message : 'Auth connection failed';
      }

      // Test 3: Try to query database
      console.log('Testing database connection...');
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
        
        if (error) {
          console.warn('Database query error:', error);
          testResults.databaseConnection = false;
          if (!testResults.error) {
            testResults.error = error.message;
          }
        } else {
          console.log('✅ Database connection successful');
          testResults.databaseConnection = true;
        }
      } catch (err) {
        console.error('Database query failed:', err);
        testResults.databaseConnection = false;
        if (!testResults.error) {
          testResults.error = err instanceof Error ? err.message : 'Database query failed';
        }
      }

    } catch (err) {
      console.error('Connection test failed:', err);
      testResults.error = err instanceof Error ? err.message : 'Unknown error';
    } finally {
      setResults(testResults);
      setTesting(false);
    }
  };

  return (
    <Card className="p-6 max-w-md mx-auto mt-8">
      <h3 className="text-lg font-semibold mb-4">Connection Diagnostics</h3>
      
      <div className="space-y-3 mb-4">
        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
          <span className="text-sm">Supabase Configuration</span>
          {results.supabaseConfig === null ? (
            <span className="text-slate-400 text-sm">Not tested</span>
          ) : results.supabaseConfig ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
          <span className="text-sm">Auth Connection</span>
          {results.authConnection === null ? (
            <span className="text-slate-400 text-sm">Not tested</span>
          ) : results.authConnection ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </div>

        <div className="flex items-center justify-between p-2 bg-slate-50 rounded">
          <span className="text-sm">Database Connection</span>
          {results.databaseConnection === null ? (
            <span className="text-slate-400 text-sm">Not tested</span>
          ) : results.databaseConnection ? (
            <CheckCircle className="h-5 w-5 text-green-600" />
          ) : (
            <XCircle className="h-5 w-5 text-red-600" />
          )}
        </div>
      </div>

      {results.error && (
        <Alert className="mb-4 border-red-200 bg-red-50">
          <AlertDescription className="text-red-800 text-sm">
            {results.error}
          </AlertDescription>
        </Alert>
      )}

      <Button 
        onClick={testConnection}
        disabled={testing}
        className="w-full"
      >
        {testing ? (
          <>
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Testing...
          </>
        ) : (
          'Test Connection'
        )}
      </Button>

      <div className="mt-4 p-3 bg-blue-50 rounded text-xs text-blue-800">
        <p className="font-medium mb-1">Debug Info:</p>
        <p>Project ID: {projectId}</p>
        <p>Key: {publicAnonKey ? '••••' + publicAnonKey.slice(-8) : 'Missing'}</p>
      </div>
    </Card>
  );
}
