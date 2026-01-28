'use client';

import { useState, useEffect } from 'react';
import { createClient } from '../../utils/supabase/client';
import { Card } from '../ui/card';

export function DebugPairings() {
  const [data, setData] = useState<any[]>([]);
  const [subjects, setSubjects] = useState<any[]>([]);

  useEffect(() => {
    const loadData = async () => {
      const supabase = createClient();
      
      // Load pairings
      const { data: pairings } = await supabase
        .from('subject_pairings')
        .select('*')
        .order('pair_group_id');
      
      // Load subjects
      const { data: subjs } = await supabase
        .from('subject_configs')
        .select('*');
      
      setData(pairings || []);
      setSubjects(subjs || []);
    };
    
    loadData();
  }, []);

  const getSubjectName = (subjectId: string) => {
    const subj = subjects.find(s => s.id === subjectId);
    return subj ? subj.subject_name : subjectId;
  };

  return (
    <Card className="p-4 mt-4">
      <h3 className="font-bold mb-4">🔍 Database Debug: subject_pairings table</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm font-semibold mb-2">All Subjects:</p>
          <div className="text-xs space-y-1">
            {subjects.map(s => (
              <div key={s.id} className="font-mono">
                {s.subject_name}: {s.id}
              </div>
            ))}
          </div>
        </div>

        <div>
          <p className="text-sm font-semibold mb-2">Pairings in Database ({data.length} rows):</p>
          {data.length === 0 ? (
            <p className="text-red-600">⚠️ NO PAIRINGS FOUND!</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs border">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="border p-2">Pair Group ID</th>
                    <th className="border p-2">Pair Group Name</th>
                    <th className="border p-2">Subject ID</th>
                    <th className="border p-2">Subject Name</th>
                    <th className="border p-2">Level</th>
                  </tr>
                </thead>
                <tbody>
                  {data.map((row, idx) => (
                    <tr key={idx}>
                      <td className="border p-2 font-mono text-[10px]">{row.pair_group_id}</td>
                      <td className="border p-2">{row.pair_group_name}</td>
                      <td className="border p-2 font-mono text-[10px]">{row.subject_id}</td>
                      <td className="border p-2 font-bold">{getSubjectName(row.subject_id)}</td>
                      <td className="border p-2">{row.level}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="text-xs text-gray-600 space-y-1">
          <p><strong>Expected:</strong> For Igbo/Yoruba pairing, you should see TWO rows:</p>
          <ul className="ml-4 list-disc">
            <li>Row 1: pair_group_id = &quot;some-id&quot;, subject_id = [igbo-id]</li>
            <li>Row 2: pair_group_id = &quot;some-id&quot;, subject_id = [yoruba-id]</li>
          </ul>
          <p className="text-red-600 font-bold mt-2">
            If you only see ONE row, that&apos;s the problem! Go back to Subject Pairs Manager and re-save the pairing.
          </p>
        </div>
      </div>
    </Card>
  );
}