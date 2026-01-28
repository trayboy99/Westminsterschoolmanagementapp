import { useState } from 'react';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

export function KVDebugViewer() {
  const [assignments, setAssignments] = useState<any>(null);
  const [discounts, setDiscounts] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const fetchData = async () => {
    setLoading(true);
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        alert('Not logged in');
        return;
      }

      // Fetch assignments
      const assignRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/debug/kv-assignments`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      const assignData = await assignRes.json();
      setAssignments(assignData);

      // Fetch discounts
      const discountRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/debug/kv-discounts`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );
      const discountData = await discountRes.json();
      setDiscounts(discountData);
    } catch (error) {
      console.error('Error fetching debug data:', error);
      alert('Error: ' + error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">KV Store Debug Viewer</h1>
      
      <button
        onClick={fetchData}
        disabled={loading}
        className="bg-blue-600 text-white px-4 py-2 rounded mb-4"
      >
        {loading ? 'Loading...' : 'Fetch KV Data'}
      </button>

      {assignments && (
        <div className="mb-8">
          <h2 className="text-xl font-bold mb-2">Sessions in Database</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs mb-4">
            {JSON.stringify(assignments.sessions, null, 2)}
          </pre>
          
          <h2 className="text-xl font-bold mb-2">Terms in Database</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs mb-4">
            {JSON.stringify(assignments.terms, null, 2)}
          </pre>
          
          <h2 className="text-xl font-bold mb-2">Student Fee Assignments (KV Store)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(assignments.assignments, null, 2)}
          </pre>
        </div>
      )}

      {discounts && (
        <div>
          <h2 className="text-xl font-bold mb-2">Fee Item Discounts (KV Store)</h2>
          <pre className="bg-gray-100 p-4 rounded overflow-auto text-xs">
            {JSON.stringify(discounts, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}