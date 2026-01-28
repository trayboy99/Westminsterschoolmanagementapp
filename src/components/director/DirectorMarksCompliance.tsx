import { useState, useEffect } from 'react';
import { MarksEntryOverview } from '../marks/MarksEntryOverview';
import { Button } from '../ui/button';
import { Card, CardContent } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { ArrowLeft, Filter } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';

interface DirectorMarksComplianceProps {
  onBack?: () => void;
}

export function DirectorMarksCompliance({ onBack }: DirectorMarksComplianceProps) {
  const supabase = createClient();
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string>('');
  const [selectedTerm, setSelectedTerm] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');
  const [selectedTermId, setSelectedTermId] = useState<string>('');

  useEffect(() => {
    fetchSessionsAndTerms();
  }, []);

  const fetchSessionsAndTerms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const data = await response.json();

      if (data.success) {
        setSessions(data.sessions || []);
        setTerms(data.terms || []);
        
        // Auto-select current session
        const currentSession = data.sessions?.find((s: any) => s.is_current);
        if (currentSession) {
          setSelectedSession(currentSession.session_name);
          setSelectedSessionId(currentSession.id);
        }
        
        // Auto-select current term
        const currentTerm = data.terms?.find((t: any) => t.is_current);
        if (currentTerm) {
          setSelectedTerm(currentTerm.term_name);
          setSelectedTermId(currentTerm.id);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions and terms:', error);
    }
  };

  return (
    <div className="space-y-4">
      {onBack && (
        <Button
          variant="ghost"
          onClick={onBack}
          className="mb-2"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Compliance Record
        </Button>
      )}

      {/* Session and Term Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-slate-600" />
              <span className="font-medium text-slate-700">Filter by:</span>
            </div>
            <div className="flex flex-1 gap-4">
              <div className="flex-1 max-w-xs">
                <Select 
                  value={selectedSession} 
                  onValueChange={(sessionName) => {
                    setSelectedSession(sessionName);
                    const session = sessions.find(s => s.session_name === sessionName);
                    if (session) setSelectedSessionId(session.id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select session" />
                  </SelectTrigger>
                  <SelectContent>
                    {sessions.map((sess) => (
                      <SelectItem key={sess.session_name} value={sess.session_name}>
                        {sess.session_name}
                        {sess.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-1 max-w-xs">
                <Select 
                  value={selectedTerm} 
                  onValueChange={(termName) => {
                    setSelectedTerm(termName);
                    const term = terms.find(t => t.term_name === termName);
                    if (term) setSelectedTermId(term.id);
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select term" />
                  </SelectTrigger>
                  <SelectContent>
                    {terms.map((term) => (
                      <SelectItem key={term.term_name} value={term.term_name}>
                        {term.term_name}
                        {term.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <MarksEntryOverview 
        sessionId={selectedSessionId}
        termId={selectedTermId}
        session={selectedSession}
        term={selectedTerm}
      />
    </div>
  );
}
