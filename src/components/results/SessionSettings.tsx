import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Plus, Trash2, Save, Calendar, CheckCircle, Bug } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { SessionSettingsDebug } from './SessionSettingsDebug';

interface SessionConfig {
  id?: string;
  session_name: string;
  start_date: string;
  end_date: string;
  is_current: boolean;
  status?: string;
}

interface TermConfig {
  id?: string;
  term_name: string;
  session_id?: string;
  start_date: string;
  end_date: string;
  next_term_begins?: string;
  number_of_weeks: number;
  is_current: boolean;
  status?: string;
}

export function SessionSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  const [sessions, setSessions] = useState<SessionConfig[]>([]);
  const [terms, setTerms] = useState<TermConfig[]>([
    { term_name: 'First Term', start_date: '', end_date: '', number_of_weeks: 14, is_current: false },
    { term_name: 'Second Term', start_date: '', end_date: '', number_of_weeks: 12, is_current: false },
    { term_name: 'Third Term', start_date: '', end_date: '', number_of_weeks: 12, is_current: false },
  ]);

  const supabase = createClient();

  useEffect(() => {
    fetchSessionSettings();
  }, []);

  const fetchSessionSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success) {
        if (result.sessions && result.sessions.length > 0) {
          setSessions(result.sessions);
        }
        if (result.terms && result.terms.length > 0) {
          setTerms(result.terms);
        }
      }
    } catch (error) {
      console.error('[SessionSettings] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('No active session. Please login again.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      console.log('[SessionSettings] Sending data:', { sessions, terms });

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/update-session-settings`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ sessions, terms })
        }
      );
      
      console.log('[SessionSettings] Response status:', res.status);
      
      // Get response text first, then try to parse as JSON
      const responseText = await res.text();
      console.log('[SessionSettings] Response text:', responseText);
      
      let result;
      try {
        result = JSON.parse(responseText);
      } catch (parseError) {
        console.error('[SessionSettings] Failed to parse response:', parseError);
        toast.error('Server returned invalid response: ' + responseText.substring(0, 200));
        return;
      }
      
      console.log('[SessionSettings] Parsed result:', result);
      
      if (result.success) {
        toast.success('Session settings updated successfully!');
        await fetchSessionSettings();
      } else {
        console.error('[SessionSettings] Error details:', result.details);
        console.error('[SessionSettings] Full error:', result);
        toast.error(result.error || 'Failed to update session settings');
      }
    } catch (error) {
      console.error('[SessionSettings] Save error:', error);
      toast.error('Failed to update session settings: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const addSession = () => {
    setSessions([...sessions, { session_name: '', start_date: '', end_date: '', is_current: false }]);
  };

  const removeSession = (index: number) => {
    setSessions(sessions.filter((_, i) => i !== index));
  };

  const updateSession = (index: number, field: keyof SessionConfig, value: string | boolean) => {
    const newSessions = [...sessions];
    if (field === 'is_current' && value === true) {
      // Only one session can be current
      newSessions.forEach(s => s.is_current = false);
    }
    newSessions[index] = { ...newSessions[index], [field]: value };
    setSessions(newSessions);
  };

  const updateTerm = (index: number, field: keyof TermConfig, value: string | boolean | number) => {
    const newTerms = [...terms];
    if (field === 'is_current' && value === true) {
      // Only one term can be current
      newTerms.forEach(t => t.is_current = false);
    }
    newTerms[index] = { ...newTerms[index], [field]: value };
    setTerms(newTerms);
  };

  const addTerm = () => {
    setTerms([...terms, { 
      term_name: '', 
      start_date: '', 
      end_date: '', 
      next_term_begins: '',
      number_of_weeks: 13, 
      is_current: false 
    }]);
  };

  const removeTerm = (index: number) => {
    setTerms(terms.filter((_, i) => i !== index));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Academic Sessions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Academic Sessions
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Define academic sessions (e.g., 2024/2025). Mark one as current.
          </p>

          <div className="space-y-3">
            {sessions.map((session, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs">Session Name</Label>
                    <Input
                      value={session.session_name}
                      onChange={(e) => updateSession(index, 'session_name', e.target.value)}
                      placeholder="2024/2025"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Start Date</Label>
                    <Input
                      type="date"
                      value={session.start_date}
                      onChange={(e) => updateSession(index, 'start_date', e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">End Date</Label>
                    <Input
                      type="date"
                      value={session.end_date}
                      onChange={(e) => updateSession(index, 'end_date', e.target.value)}
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <Button
                      variant={session.is_current ? 'default' : 'outline'}
                      size="sm"
                      onClick={() => updateSession(index, 'is_current', !session.is_current)}
                      className="gap-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      {session.is_current ? 'Current' : 'Set Current'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeSession(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addSession} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Academic Session
          </Button>
        </CardContent>
      </Card>

      {/* Terms */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Academic Terms
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Configure the three terms for the academic session.
          </p>

          <div className="space-y-3">
            {terms.map((term, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-1 gap-3">
                  {/* Row 1: Term Name and Number of Weeks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Term Name</Label>
                      <Input
                        value={term.term_name}
                        onChange={(e) => updateTerm(index, 'term_name', e.target.value)}
                        placeholder="First Term"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Number of Weeks</Label>
                      <Input
                        type="number"
                        min="1"
                        max="52"
                        value={term.number_of_weeks}
                        onChange={(e) => updateTerm(index, 'number_of_weeks', parseInt(e.target.value) || 12)}
                        placeholder="12"
                      />
                    </div>
                  </div>

                  {/* Row 2: Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs">Start Date</Label>
                      <Input
                        type="date"
                        value={term.start_date}
                        onChange={(e) => updateTerm(index, 'start_date', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">End Date</Label>
                      <Input
                        type="date"
                        value={term.end_date}
                        onChange={(e) => updateTerm(index, 'end_date', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Next Term Begins</Label>
                      <Input
                        type="date"
                        value={term.next_term_begins || ''}
                        onChange={(e) => updateTerm(index, 'next_term_begins', e.target.value)}
                      />
                    </div>
                  </div>

                  {/* Row 3: Set Current Button */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <Button
                        variant={term.is_current ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => updateTerm(index, 'is_current', !term.is_current)}
                        className="gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        {term.is_current ? 'Current Term' : 'Set as Current'}
                      </Button>
                      {term.is_current && (
                        <Badge className="ml-3 bg-green-100 text-green-800">Active</Badge>
                      )}
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTerm(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <Button variant="outline" onClick={addTerm} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Academic Term
          </Button>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={saving} className="gap-2">
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save All Settings'}
        </Button>
      </div>

      {/* Debug Button */}
      <div className="flex justify-end">
        <Button onClick={() => setShowDebug(!showDebug)} disabled={saving} className="gap-2">
          <Bug className="h-4 w-4" />
          Debug
        </Button>
      </div>

      {/* Debug Panel */}
      {showDebug && (
        <div className="mt-4">
          <SessionSettingsDebug />
        </div>
      )}
    </div>
  );
}