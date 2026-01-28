import { useState, useEffect } from 'react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

interface WeekInfo {
  weekNumber: number;
  weekStartDate: string;
  weekEndDate: string;
  session: string;
  term: string;
  term_start_date: string;
  term_end_date: string;
}

export function useCurrentWeek() {
  const [weekInfo, setWeekInfo] = useState<WeekInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    fetchCurrentWeek();
  }, []);

  const fetchCurrentWeek = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        console.log('[useCurrentWeek] No active session');
        setLoading(false);
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/current-week`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (!res.ok) {
        console.error('[useCurrentWeek] HTTP error:', res.status, res.statusText);
        setLoading(false);
        return;
      }

      const result = await res.json();
      
      console.log('[useCurrentWeek] Response:', result);
      
      if (result.success && result.week_info) {
        setWeekInfo(result.week_info);
      } else {
        console.warn('[useCurrentWeek] No week info in response or failed:', result.error);
      }
    } catch (error) {
      console.error('[useCurrentWeek] Error fetching current week:', error);
    } finally {
      setLoading(false);
    }
  };

  return { weekInfo, loading, refetch: fetchCurrentWeek };
}