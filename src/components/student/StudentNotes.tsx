import { useState, useEffect } from 'react';
import { StudentFileExplorer } from '../uploads/StudentFileExplorer';
import { createClient } from '../../utils/supabase/client';

export function StudentNotes() {
  const [studentId, setStudentId] = useState<string>('');
  const [studentClass, setStudentClass] = useState<string>('');
  const supabase = createClient();

  useEffect(() => {
    fetchStudentInfo();
  }, []);

  const fetchStudentInfo = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('id, class_id')
        .eq('id', user.id)
        .single();

      if (profile) {
        setStudentId(profile.id);
        setStudentClass(profile.class_id || '');
      }
    } catch (error) {
      console.error('[StudentNotes] Error fetching student info:', error);
    }
  };

  return <StudentFileExplorer studentId={studentId} studentClass={studentClass} />;
}
