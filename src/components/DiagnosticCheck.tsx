import { useState } from 'react';
import { projectId } from '../utils/supabase/info';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  `https://${projectId}.supabase.co`,
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5qd2F4ZnZ0aGhidnN4ZG1rcHZsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMxNDI3NTIsImV4cCI6MjA0ODcxODc1Mn0.LIqqAoDo0TbroPOXN1v4f7kxYlLjHmLFx1N1e67_J04'
);

export default function DiagnosticCheck() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const checkColumns = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/check-profiles-columns`,
        {
          headers: {
            Authorization: `Bearer ${session?.access_token}`
          }
        }
      );
      const data = await response.json();
      console.log('Profiles table structure:', data);
      setResult(data);
    } catch (error) {
      console.error('Error:', error);
      setResult({ error: String(error) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded bg-white">
      <h3 className="font-bold mb-2">Database Diagnostic</h3>
      <button
        onClick={checkColumns}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        {loading ? 'Checking...' : 'Check Profiles Table Columns'}
      </button>
      
      {result && (
        <div className="mt-4">
          <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
