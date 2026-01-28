import { useState, useEffect } from 'react';
import { Search, Calendar, Clock, FileQuestion, AlertCircle, Play, Pause, Edit2, Trash2, CheckCircle, Eye } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface CBTSession {
  subject: string;
  class: string;
  session: string | null;
  term: string | null;
  question_count: number;
  question_ids: string[];
  schedule: any;
  is_enabled: boolean;
  start_date: string | null;
  end_date: string | null;
  start_time: string | null;
  duration_minutes: number | null;
}

export function CBTScheduler() {
  const [sessions, setSessions] = useState<CBTSession[]>([]);
  const [filteredSessions, setFilteredSessions] = useState<CBTSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [editingSession, setEditingSession] = useState<CBTSession | null>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [viewingQuestions, setViewingQuestions] = useState<CBTSession | null>(null);

  const supabase = createClient();

  useEffect(() => {
    fetchSessions();
  }, []);

  useEffect(() => {
    let filtered = sessions;

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(s =>
        s.subject.toLowerCase().includes(search) ||
        s.class.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(s =>
        filterStatus === 'enabled' ? s.is_enabled : !s.is_enabled
      );
    }

    setFilteredSessions(filtered);
  }, [searchTerm, filterStatus, sessions]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/sessions/available`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSessions(data.sessions || []);
        setFilteredSessions(data.sessions || []);
      } else {
        setError(data.error || 'Failed to fetch sessions');
      }
    } catch (err: any) {
      console.error('Error fetching sessions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickToggle = async (session: CBTSession) => {
    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/sessions/schedule`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: session.subject,
            class: session.class,
            session: session.session,
            term: session.term,
            is_enabled: !session.is_enabled,
            start_date: session.start_date,
            end_date: session.end_date,
            duration_minutes: session.duration_minutes || 60
          }),
        }
      );

      if (response.ok) {
        fetchSessions();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to update schedule');
      }
    } catch (err) {
      console.error('Error toggling schedule:', err);
      alert('Failed to update schedule');
    }
  };

  const handleEdit = (session: CBTSession) => {
    setEditingSession(session);
    setShowScheduleModal(true);
  };

  const handleDelete = async (session: CBTSession) => {
    if (!confirm(`Are you sure you want to delete the ${session.subject} (${session.class}) exam? This will remove all scheduled data for this exam.`)) {
      return;
    }

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/sessions/delete`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: session.subject,
            class: session.class,
            session: session.session,
            term: session.term,
          }),
        }
      );

      if (response.ok) {
        alert('Exam deleted successfully');
        fetchSessions();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete exam');
      }
    } catch (err) {
      console.error('Error deleting exam:', err);
      alert('Failed to delete exam');
    }
  };

  // Check if an exam schedule has expired
  const isExpired = (session: CBTSession): boolean => {
    if (!session.end_date) return false;
    
    console.log('[Expired Check]', {
      subject: session.subject,
      end_date: session.end_date,
      start_time: session.start_time,
      duration: session.duration_minutes,
      now: new Date().toISOString()
    });
    
    // Parse the end_date and compare with current time
    // If start_time is provided, use it to calculate the exact end time (start_time + duration)
    // Otherwise, just compare dates
    const now = new Date();
    const endDate = new Date(session.end_date);
    
    if (session.start_time && session.duration_minutes) {
      // Calculate exact end time: start_time + duration
      const [hours, minutes] = session.start_time.split(':').map(Number);
      const examEndTime = new Date(session.end_date);
      examEndTime.setHours(hours, minutes, 0, 0);
      examEndTime.setMinutes(examEndTime.getMinutes() + session.duration_minutes);
      
      console.log('[Expired Check] Calculated end time:', examEndTime.toISOString(), 'vs now:', now.toISOString(), 'expired:', now > examEndTime);
      
      return now > examEndTime;
    } else {
      // Just compare dates (end of day)
      endDate.setHours(23, 59, 59, 999);
      
      console.log('[Expired Check] End of day:', endDate.toISOString(), 'vs now:', now.toISOString(), 'expired:', now > endDate);
      
      return now > endDate;
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        <p className="text-gray-600 mt-4">Loading CBT sessions...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Info Banner */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-blue-900 text-sm">
            These are CBT sessions automatically detected from published questions in the Question Bank.
          </p>
          <p className="text-blue-700 text-xs mt-1">
            Enable/disable and set exam windows for students to take these tests.
          </p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm">Total Sessions</p>
          <p className="text-gray-900 mt-1">{sessions.length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm">Enabled</p>
          <p className="text-green-600 mt-1">{sessions.filter(s => s.is_enabled).length}</p>
        </div>
        <div className="bg-white p-4 rounded-lg border border-gray-200">
          <p className="text-gray-600 text-sm">Disabled</p>
          <p className="text-gray-600 mt-1">{sessions.filter(s => !s.is_enabled).length}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by subject or class..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="all">All Statuses</option>
            <option value="enabled">Enabled Only</option>
            <option value="disabled">Disabled Only</option>
          </select>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {/* Sessions List */}
      {filteredSessions.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">No CBT Sessions Available</h3>
          <p className="text-gray-600">
            {searchTerm || filterStatus !== 'all'
              ? 'No sessions match your filters'
              : 'Teachers need to create and publish questions first'
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredSessions.map((session, index) => {
            const key = `${session.subject}-${session.class}-${session.session}-${session.term}-${index}`;
            return (
              <div
                key={key}
                className={`bg-white rounded-lg border-2 p-5 transition-all ${
                  session.is_enabled
                    ? 'border-green-300 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="text-gray-900 mb-1">{session.subject}</h3>
                    <p className="text-gray-600 text-sm">{session.class}</p>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    {isExpired(session) && (
                      <span className="px-3 py-1 text-xs rounded-full bg-red-100 text-red-700 font-semibold whitespace-nowrap flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />
                        EXPIRED
                      </span>
                    )}
                    <span
                      className={`px-3 py-1 text-xs rounded-full flex items-center gap-1 whitespace-nowrap ${
                        session.is_enabled
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-700'
                      }`}
                    >
                      {session.is_enabled ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          Enabled
                        </>
                      ) : (
                        <>
                          <Pause className="w-3 h-3" />
                          Disabled
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Session & Term */}
                {(session.session || session.term) && (
                  <div className="flex items-center gap-2 mb-3 text-xs text-gray-500">
                    {session.session && (
                      <span className="px-2 py-1 bg-gray-100 rounded">{session.session}</span>
                    )}
                    {session.term && (
                      <span className="px-2 py-1 bg-gray-100 rounded">{session.term}</span>
                    )}
                  </div>
                )}

                {/* Stats */}
                <div className="space-y-2 mb-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 flex items-center gap-1">
                      <FileQuestion className="w-4 h-4" />
                      Questions:
                    </span>
                    <span className="text-gray-900 font-medium">{session.question_count}</span>
                  </div>

                  {session.duration_minutes && (
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-600 flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        Duration:
                      </span>
                      <span className="text-gray-900 font-medium">{session.duration_minutes} mins</span>
                    </div>
                  )}

                  {(session.start_date || session.end_date) && (
                    <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                      {session.start_date && (
                        <p className="flex items-center justify-between">
                          <span>Start:</span>
                          <span className="font-medium">
                            {new Date(session.start_date).toLocaleDateString()}
                            {session.start_time && ` at ${session.start_time}`}
                          </span>
                        </p>
                      )}
                      {session.end_date && (
                        <p className="flex items-center justify-between">
                          <span>End:</span>
                          <span className="font-medium">
                            {new Date(session.end_date).toLocaleDateString()}
                          </span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleQuickToggle(session)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm ${
                      session.is_enabled
                        ? 'bg-red-50 text-red-600 hover:bg-red-100'
                        : 'bg-green-50 text-green-600 hover:bg-green-100'
                    }`}
                  >
                    {session.is_enabled ? (
                      <>
                        <Pause className="w-4 h-4" />
                        Disable
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4" />
                        Enable
                      </>
                    )}
                  </button>
                  <button
                    onClick={() => handleEdit(session)}
                    className="px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors"
                    title="Schedule"
                  >
                    <Calendar className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setViewingQuestions(session)}
                    className="px-3 py-2 bg-purple-50 text-purple-600 rounded-lg hover:bg-purple-100 transition-colors"
                    title="View Questions"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(session)}
                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors"
                    title="Delete Exam"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Schedule Modal */}
      {showScheduleModal && editingSession && (
        <ScheduleModal
          session={editingSession}
          onClose={() => {
            setShowScheduleModal(false);
            setEditingSession(null);
          }}
          onSuccess={() => {
            setShowScheduleModal(false);
            setEditingSession(null);
            fetchSessions();
          }}
        />
      )}

      {/* View Questions Modal */}
      {viewingQuestions && (
        <ViewQuestionsModal
          session={viewingQuestions}
          onClose={() => setViewingQuestions(null)}
        />
      )}
    </div>
  );
}

// Schedule Modal Component
interface ScheduleModalProps {
  session: CBTSession;
  onClose: () => void;
  onSuccess: () => void;
}

function ScheduleModal({ session, onClose, onSuccess }: ScheduleModalProps) {
  const [isEnabled, setIsEnabled] = useState(session.is_enabled);
  const [startDate, setStartDate] = useState(session.start_date?.split('T')[0] || '');
  const [endDate, setEndDate] = useState(session.end_date?.split('T')[0] || '');
  const [startTime, setStartTime] = useState(session.start_time || '');
  const [durationMinutes, setDurationMinutes] = useState(session.duration_minutes ? session.duration_minutes.toString() : '60');
  const [allowRetake, setAllowRetake] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const supabase = createClient();

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');

      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/sessions/schedule`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            subject: session.subject,
            class: session.class,
            session: session.session,
            term: session.term,
            is_enabled: isEnabled,
            start_date: startDate || null,
            end_date: endDate || null,
            start_time: startTime || null,
            duration_minutes: parseInt(durationMinutes) || 60,
            allow_retake: allowRetake
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        onSuccess();
      } else {
        setError(data.error || 'Failed to save schedule');
      }
    } catch (err: any) {
      console.error('Error saving schedule:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-gray-900">Schedule CBT Exam</h3>
          <p className="text-gray-600 text-sm mt-1">
            {session.subject} - {session.class}
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm">
              {error}
            </div>
          )}

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={isEnabled}
              onChange={(e) => setIsEnabled(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700 text-sm">Enable this CBT exam for students</span>
          </label>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Start Date (Optional)</label>
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">End Date (Optional)</label>
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Start Time (Optional)</label>
            <input
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-2">Duration (minutes)</label>
            <input
              type="number"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              min="1"
            />
            <p className="text-xs text-gray-500 mt-1">
              Total time students have to complete all {session.question_count} questions
            </p>
          </div>

          <label className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={allowRetake}
              onChange={(e) => setAllowRetake(e.target.checked)}
              className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
            />
            <span className="text-gray-700 text-sm">Allow students to retake this exam</span>
          </label>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Schedule'}
          </button>
        </div>
      </div>
    </div>
  );
}

// View Questions Modal Component
interface ViewQuestionsModalProps {
  session: CBTSession;
  onClose: () => void;
}

function ViewQuestionsModal({ session, onClose }: ViewQuestionsModalProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const supabase = createClient();

  useEffect(() => {
    fetchQuestions();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data: { session: authSession } } = await supabase.auth.getSession();
      if (!authSession) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/admin/view-questions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authSession.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            questionIds: session.question_ids,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        setQuestions(data.questions || []);
      } else {
        setError(data.error || 'Failed to fetch questions');
      }
    } catch (err: any) {
      console.error('Error fetching questions:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const getQuestionTypeBadge = (type: string) => {
    const colors = {
      mcq: 'bg-blue-100 text-blue-700',
      multiple: 'bg-purple-100 text-purple-700',
      true_false: 'bg-green-100 text-green-700',
      short_answer: 'bg-orange-100 text-orange-700',
    };
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-700';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
          <div>
            <h2 className="text-gray-900 text-lg">View Questions</h2>
            <p className="text-gray-600 text-sm mt-1">
              {session.subject} - {session.class}
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="text-gray-600 mt-4">Loading questions...</p>
            </div>
          ) : error ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-800">
              {error}
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-12">
              <FileQuestion className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600">No questions found</p>
            </div>
          ) : (
            <div className="space-y-4">
              {questions.map((q, index) => (
                <div key={q.id} className="border border-gray-200 rounded-lg p-4">
                  {/* Question Header */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-medium text-gray-900">Q{index + 1}.</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${getQuestionTypeBadge(q.question_type)}`}>
                          {q.question_type.replace('_', ' ')}
                        </span>
                        <span className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
                          {q.marks} mark{q.marks > 1 ? 's' : ''}
                        </span>
                      </div>
                      <p className="text-gray-900">{q.question_text}</p>
                    </div>
                  </div>

                  {/* Options (for MCQ/Multiple/True-False) */}
                  {q.options && (
                    <div className="bg-gray-50 rounded p-3 space-y-2 mb-3">
                      <p className="text-xs text-gray-600 mb-2">Options:</p>
                      {(Array.isArray(q.options) ? q.options : Object.values(q.options)).map((option: any, index: number) => {
                        // Handle if option is an object with {text, label, isCorrect} structure
                        const optionLabel = typeof option === 'object' && option !== null && 'label' in option 
                          ? option.label 
                          : String.fromCharCode(65 + index); // A, B, C, D...
                        
                        const optionText = typeof option === 'object' && option !== null && 'text' in option 
                          ? option.text 
                          : option;
                        
                        const isCorrect = q.correct_answer === optionLabel || 
                          (Array.isArray(q.correct_answer) && q.correct_answer.includes(optionLabel));
                        
                        return (
                          <div
                            key={index}
                            className={`p-2 rounded text-sm ${
                              isCorrect
                                ? 'bg-green-100 border border-green-300'
                                : 'bg-white'
                            }`}
                          >
                            <span className="font-medium mr-2">{optionLabel}.</span>
                            {optionText}
                            {isCorrect && (
                              <span className="ml-2 text-green-700 text-xs font-medium">✓ Correct Answer</span>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Correct Answer (for short answer) */}
                  {q.question_type === 'short_answer' && (
                    <div className="bg-green-50 rounded p-3">
                      <p className="text-xs text-green-600 mb-1">Correct Answer:</p>
                      <p className="font-medium text-green-900">{q.correct_answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-between items-center">
          <p className="text-sm text-gray-600">
            Total: {questions.length} question{questions.length !== 1 ? 's' : ''}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}