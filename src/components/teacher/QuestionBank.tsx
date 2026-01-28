import { useState, useEffect } from 'react';
import { Plus, Search, BookOpen, AlertCircle, Eye, FolderOpen, FileQuestion, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { CreateQuestionModal } from './CreateQuestionModal';
import { ViewQuestionsModal } from './ViewQuestionsModal';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface QuestionBank {
  subject: string;
  class: string;
  session: string;
  term: string;
  totalQuestions: number;
  totalMarks: number;
  publishedQuestions: number;
  draftQuestions: number;
}

interface QuestionStats {
  total: number;
  draft: number;
  published: number;
  archived: number;
  bySubject: Record<string, number>;
  byClass: Record<string, number>;
  byType: Record<string, number>;
}

export function QuestionBank() {
  const [questionBanks, setQuestionBanks] = useState<QuestionBank[]>([]);
  const [stats, setStats] = useState<QuestionStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [viewingBank, setViewingBank] = useState<QuestionBank | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<any | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState('');
  
  // Expanded states for folders
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set());
  const [expandedTerms, setExpandedTerms] = useState<Set<string>>(new Set());
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());

  const supabase = createClient();

  // Fetch grouped question banks
  const fetchQuestionBanks = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions-grouped`;

      const response = await fetch(url, {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch question banks');
      }

      const data = await response.json();
      setQuestionBanks(data.questionBanks || []);
    } catch (err: any) {
      console.error('Error fetching question banks:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Fetch statistics
  const fetchStats = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions/stats/summary`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        setStats(data.stats);
      }
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  useEffect(() => {
    fetchQuestionBanks();
    fetchStats();
  }, []);

  // Fetch question for editing
  const handleEditQuestion = async (questionId: string) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions/${questionId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error('Failed to fetch question');
      }

      const data = await response.json();
      setEditingQuestion(data.question);
      setViewingBank(null);
    } catch (err: any) {
      console.error('Error fetching question:', err);
      alert('Failed to load question for editing: ' + err.message);
    }
  };

  // Delete question bank
  const handleDeleteQuestionBank = async (bank: QuestionBank) => {
    const confirmMessage = `Are you sure you want to delete ALL ${bank.totalQuestions} questions for:\n\n${bank.subject} - ${bank.class}\n${bank.session} • ${bank.term}\n\nThis action cannot be undone!`;
    
    if (!confirm(confirmMessage)) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        alert('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/questions/bank/${encodeURIComponent(bank.subject)}/${encodeURIComponent(bank.class)}/${encodeURIComponent(bank.session)}/${encodeURIComponent(bank.term)}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      
      if (response.ok && data.success) {
        alert(`Successfully deleted ${data.deletedCount} question(s)`);
        fetchQuestionBanks();
        fetchStats();
      } else {
        throw new Error(data.error || 'Failed to delete question bank');
      }
    } catch (err: any) {
      console.error('Error deleting question bank:', err);
      alert('Failed to delete question bank: ' + err.message);
    }
  };

  // Build hierarchical structure
  const buildHierarchy = () => {
    const sessionsMap: Record<string, any> = {};

    questionBanks.forEach(bank => {
      // Filter by search
      if (searchTerm) {
        const search = searchTerm.toLowerCase();
        const matches = 
          bank.subject.toLowerCase().includes(search) ||
          bank.class.toLowerCase().includes(search) ||
          bank.session.toLowerCase().includes(search) ||
          bank.term.toLowerCase().includes(search);
        
        if (!matches) return;
      }

      // Initialize session if needed
      if (!sessionsMap[bank.session]) {
        sessionsMap[bank.session] = {
          sessionName: bank.session,
          terms: {}
        };
      }

      // Initialize term if needed
      const session = sessionsMap[bank.session];
      if (!session.terms[bank.term]) {
        session.terms[bank.term] = {
          termName: bank.term,
          classes: {}
        };
      }

      // Initialize class if needed
      const term = session.terms[bank.term];
      if (!term.classes[bank.class]) {
        term.classes[bank.class] = {
          className: bank.class,
          subjects: []
        };
      }

      // Add subject
      const classData = term.classes[bank.class];
      classData.subjects.push({
        subject: bank.subject,
        session: bank.session,
        term: bank.term,
        class: bank.class,
        totalQuestions: bank.totalQuestions,
        totalMarks: bank.totalMarks,
        publishedQuestions: bank.publishedQuestions,
        draftQuestions: bank.draftQuestions,
      });
    });

    // Convert to arrays
    return Object.values(sessionsMap).map(session => ({
      ...session,
      terms: Object.values(session.terms).map((term: any) => ({
        ...term,
        classes: Object.values(term.classes)
      }))
    }));
  };

  const hierarchicalData = buildHierarchy();

  // Toggle functions
  const toggleSession = (sessionName: string) => {
    const newExpanded = new Set(expandedSessions);
    if (newExpanded.has(sessionName)) {
      newExpanded.delete(sessionName);
    } else {
      newExpanded.add(sessionName);
    }
    setExpandedSessions(newExpanded);
  };

  const toggleTerm = (sessionName: string, termName: string) => {
    const key = `${sessionName}::${termName}`;
    const newExpanded = new Set(expandedTerms);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedTerms(newExpanded);
  };

  const toggleClass = (sessionName: string, termName: string, className: string) => {
    const key = `${sessionName}::${termName}::${className}`;
    const newExpanded = new Set(expandedClasses);
    if (newExpanded.has(key)) {
      newExpanded.delete(key);
    } else {
      newExpanded.add(key);
    }
    setExpandedClasses(newExpanded);
  };

  return (
    <div className="p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-gray-900">CBT Question Bank</h1>
          <p className="text-gray-600 mt-1">Create and manage your exam questions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Create Question
        </button>
      </div>

      {/* Statistics Cards */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm sm:text-base">Total Questions</p>
                <p className="text-gray-900 mt-1">{stats.total}</p>
              </div>
              <BookOpen className="w-6 h-6 sm:w-8 sm:h-8 text-blue-500" />
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm sm:text-base">Published</p>
                <p className="text-gray-900 mt-1">{stats.published}</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-green-100 rounded-full flex items-center justify-center text-green-600 text-sm sm:text-base">
                ✓
              </div>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm sm:text-base">Drafts</p>
                <p className="text-gray-900 mt-1">{stats.draft}</p>
              </div>
              <div className="w-6 h-6 sm:w-8 sm:h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm sm:text-base">
                ✎
              </div>
            </div>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm sm:text-base">Question Banks</p>
                <p className="text-gray-900 mt-1">{questionBanks.length}</p>
              </div>
              <FolderOpen className="w-6 h-6 sm:w-8 sm:h-8 text-purple-500" />
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="bg-white p-4 rounded-lg border border-gray-200">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search by subject, class, session, or term..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800">Error loading question banks</p>
            <p className="text-red-600 text-sm mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Hierarchical Question Banks */}
      {loading ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
          <p className="text-gray-600 mt-4">Loading question banks...</p>
        </div>
      ) : hierarchicalData.length === 0 ? (
        <div className="bg-white p-12 rounded-lg border border-gray-200 text-center">
          <FolderOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-gray-900 mb-2">No Question Banks Found</h3>
          <p className="text-gray-600 mb-4">
            {searchTerm
              ? 'Try adjusting your search'
              : 'Get started by creating your first question'
            }
          </p>
          {!searchTerm && (
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-5 h-5" />
              Create Your First Question
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {hierarchicalData.map((session) => (
            <div key={session.sessionName} className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              {/* Session Header */}
              <button
                onClick={() => toggleSession(session.sessionName)}
                className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  {expandedSessions.has(session.sessionName) ? (
                    <ChevronDown className="w-5 h-5 text-gray-500" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-500" />
                  )}
                  <FolderOpen className="w-5 h-5 text-blue-600" />
                  <span className="text-gray-900">{session.sessionName}</span>
                </div>
                <span className="text-gray-600 text-sm">{session.terms.length} term{session.terms.length !== 1 ? 's' : ''}</span>
              </button>

              {/* Terms */}
              {expandedSessions.has(session.sessionName) && (
                <div className="border-t border-gray-200">
                  {session.terms.map((term: any) => (
                    <div key={term.termName} className="border-b border-gray-100 last:border-b-0">
                      {/* Term Header */}
                      <button
                        onClick={() => toggleTerm(session.sessionName, term.termName)}
                        className="w-full flex items-center justify-between p-4 pl-12 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          {expandedTerms.has(`${session.sessionName}::${term.termName}`) ? (
                            <ChevronDown className="w-5 h-5 text-gray-500" />
                          ) : (
                            <ChevronRight className="w-5 h-5 text-gray-500" />
                          )}
                          <FolderOpen className="w-5 h-5 text-purple-600" />
                          <span className="text-gray-900">{term.termName}</span>
                        </div>
                        <span className="text-gray-600 text-sm">{term.classes.length} class{term.classes.length !== 1 ? 'es' : ''}</span>
                      </button>

                      {/* Classes */}
                      {expandedTerms.has(`${session.sessionName}::${term.termName}`) && (
                        <div className="bg-gray-50">
                          {term.classes.map((cls: any) => (
                            <div key={cls.className} className="border-b border-gray-100 last:border-b-0">
                              {/* Class Header */}
                              <button
                                onClick={() => toggleClass(session.sessionName, term.termName, cls.className)}
                                className="w-full flex items-center justify-between p-4 pl-20 hover:bg-gray-100 transition-colors"
                              >
                                <div className="flex items-center gap-3">
                                  {expandedClasses.has(`${session.sessionName}::${term.termName}::${cls.className}`) ? (
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  ) : (
                                    <ChevronRight className="w-5 h-5 text-gray-500" />
                                  )}
                                  <FolderOpen className="w-5 h-5 text-green-600" />
                                  <span className="text-gray-900">{cls.className}</span>
                                </div>
                                <span className="text-gray-600 text-sm">{cls.subjects.length} subject{cls.subjects.length !== 1 ? 's' : ''}</span>
                              </button>

                              {/* Subjects */}
                              {expandedClasses.has(`${session.sessionName}::${term.termName}::${cls.className}`) && (
                                <div className="p-4 pl-8 md:pl-16 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                  {cls.subjects.map((subject: any, idx: number) => (
                                    <div
                                      key={idx}
                                      className="bg-white rounded-lg border border-gray-200 p-4 hover:shadow-lg hover:border-blue-300 transition-all duration-200"
                                    >
                                      {/* Icon & Count */}
                                      <div className="flex items-center justify-between mb-3">
                                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                          <FileQuestion className="w-5 h-5 text-blue-600" />
                                        </div>
                                        <span className="text-xl text-gray-900">{subject.totalQuestions}</span>
                                      </div>

                                      {/* Subject Name */}
                                      <h4 className="text-gray-900 mb-3 truncate" title={subject.subject}>
                                        {subject.subject}
                                      </h4>

                                      {/* Stats */}
                                      <div className="space-y-2 mb-4">
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-600">Total Marks:</span>
                                          <span className="text-gray-900 font-medium">{subject.totalMarks}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-600">Published:</span>
                                          <span className="text-green-700 font-medium">{subject.publishedQuestions}</span>
                                        </div>
                                        <div className="flex items-center justify-between text-sm">
                                          <span className="text-gray-600">Drafts:</span>
                                          <span className="text-yellow-700 font-medium">{subject.draftQuestions}</span>
                                        </div>
                                      </div>

                                      {/* Action Buttons */}
                                      <div className="flex items-center gap-2">
                                        <button
                                          onClick={() => {
                                            const bank = questionBanks.find(b => 
                                              b.subject === subject.subject && 
                                              b.class === subject.class && 
                                              b.session === subject.session && 
                                              b.term === subject.term
                                            );
                                            if (bank) setViewingBank(bank);
                                          }}
                                          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                                        >
                                          <Eye className="w-4 h-4" />
                                          View
                                        </button>
                                        <button
                                          onClick={() => {
                                            const bank = questionBanks.find(b => 
                                              b.subject === subject.subject && 
                                              b.class === subject.class && 
                                              b.session === subject.session && 
                                              b.term === subject.term
                                            );
                                            if (bank) handleDeleteQuestionBank(bank);
                                          }}
                                          className="p-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                                          title="Delete all questions"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </button>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Create Question Modal */}
      {showCreateModal && (
        <CreateQuestionModal
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchQuestionBanks();
            fetchStats();
          }}
        />
      )}

      {/* Edit Question Modal */}
      {editingQuestion && (
        <CreateQuestionModal
          question={editingQuestion}
          onClose={() => setEditingQuestion(null)}
          onSuccess={() => {
            setEditingQuestion(null);
            fetchQuestionBanks();
            fetchStats();
          }}
        />
      )}

      {/* View Questions Modal */}
      {viewingBank && (
        <ViewQuestionsModal
          questionBank={viewingBank}
          onClose={() => setViewingBank(null)}
          onEdit={(questionId) => handleEditQuestion(questionId)}
          onDelete={(questionId) => {
            fetchQuestionBanks();
            fetchStats();
          }}
          onRefresh={() => {
            fetchQuestionBanks();
            fetchStats();
          }}
        />
      )}
    </div>
  );
}