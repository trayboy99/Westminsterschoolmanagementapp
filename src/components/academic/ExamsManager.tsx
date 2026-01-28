import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '../ui/table';
import { 
  ClipboardList,
  Plus, 
  Edit2, 
  Trash2, 
  Calendar,
  AlertCircle,
  BookOpen,
  Users,
  Clock,
  Filter,
  X,
  Search,
  FileText,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { projectId } from '../../utils/supabase/info';

interface Exam {
  id: string;
  name: string;
  term: string;
  session: string;
  start_datetime?: string;
  end_datetime?: string;
  status: 'upcoming' | 'active' | 'completed';
  created_at: string;
}

interface ExamsManagerProps {
  userRole: string;
}

export function ExamsManager({ userRole }: ExamsManagerProps) {
  const [exams, setExams] = useState<Exam[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [terms, setTerms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExam, setEditingExam] = useState<Exam | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    term: '',
    session: '',
    start_datetime: '',
    end_datetime: ''
  });
  const [filterSession, setFilterSession] = useState<string>('');
  const [filterTerm, setFilterTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    fetchExams();
    fetchSessions();
    fetchTerms();
  }, [filterSession, filterTerm, filterStatus]);

  const fetchExams = async () => {
    try {
      const { createClient } = await import('../../utils/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      // Build query params
      const params = new URLSearchParams();
      if (filterSession) params.append('session', filterSession);
      if (filterTerm) params.append('term', filterTerm);
      if (filterStatus) params.append('status', filterStatus);

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams${params.toString() ? '?' + params.toString() : ''}`;
      
      const response = await fetch(url, { headers });
      const data = await response.json();

      if (data.success) {
        setExams(data.exams);
      } else {
        toast.error(data.error || 'Failed to fetch exams');
      }
    } catch (error) {
      console.error('Error fetching exams:', error);
      toast.error('Failed to fetch exams');
    } finally {
      setLoading(false);
    }
  };

  const fetchSessions = async () => {
    try {
      const { createClient } = await import('../../utils/supabase/client');
      const supabase = createClient();
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
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    }
  };

  const fetchTerms = async () => {
    // Terms are now fetched together with sessions
    // This function is kept for compatibility but does nothing
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setSubmitting(true);

    try {
      const { createClient } = await import('../../utils/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please sign in to continue');
        return;
      }

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const url = editingExam 
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams/${editingExam.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams`;

      const response = await fetch(url, {
        method: editingExam ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(formData)
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingExam ? 'Exam updated successfully!' : 'Exam created successfully!');
        setDialogOpen(false);
        resetForm();
        fetchExams();
      } else {
        toast.error(data.error || 'Failed to save exam');
      }
    } catch (error) {
      console.error('Error saving exam:', error);
      toast.error('Failed to save exam. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (exam: Exam) => {
    setEditingExam(exam);
    setFormData({
      name: exam.name,
      term: exam.term,
      session: exam.session,
      start_datetime: exam.start_datetime || '',
      end_datetime: exam.end_datetime || ''
    });
    setDialogOpen(true);
  };

  const handleDelete = async (examId: string) => {
    // Enhanced confirmation dialog
    const exam = exams.find(e => e.id === examId);
    const examName = exam ? `${exam.name} (${exam.session} - ${exam.term})` : 'this exam';
    
    const confirmMessage = `⚠️ WARNING: Delete ${examName}?\n\n` +
      `This action cannot be undone.\n\n` +
      `NOTE: If marks have been entered for this exam, deletion will fail. ` +
      `You must delete all associated marks first.\n\n` +
      `Are you absolutely sure?`;
    
    if (!confirm(confirmMessage)) return;

    setDeletingId(examId);

    try {
      const { createClient } = await import('../../utils/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`
      };

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/exams/${examId}`,
        {
          method: 'DELETE',
          headers
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Exam deleted successfully!');
        fetchExams();
      } else {
        // Show detailed error message from backend
        toast.error(data.error || 'Failed to delete exam', {
          duration: 8000, // Show longer for detailed messages
        });
        console.error('[Delete Exam] Error:', data.error);
      }
    } catch (error) {
      console.error('[Delete Exam] Exception:', error);
      toast.error('Failed to delete exam. Please try again.');
    } finally {
      setDeletingId(null);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      term: '',
      session: '',
      start_datetime: '',
      end_datetime: ''
    });
    setEditingExam(null);
  };

  const clearFilters = () => {
    setFilterSession('');
    setFilterTerm('');
    setFilterStatus('');
    setSearchQuery('');
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { className: string; label: string; icon: any }> = {
      upcoming: { className: 'bg-blue-100 text-blue-700 border-blue-200', label: 'Upcoming', icon: Clock },
      active: { className: 'bg-green-100 text-green-700 border-green-200', label: 'Active', icon: CheckCircle2 },
      completed: { className: 'bg-purple-100 text-purple-700 border-purple-200', label: 'Completed', icon: XCircle }
    };
    
    const config = variants[status] || { className: 'bg-slate-100 text-slate-700', label: status, icon: Clock };
    const Icon = config.icon;
    
    return (
      <Badge variant="outline" className={config.className}>
        <Icon className="h-3 w-3 mr-1" />
        {config.label}
      </Badge>
    );
  };

  const formatDateTime = (datetime?: string) => {
    if (!datetime) return <span className="text-slate-400">Not set</span>;
    return new Date(datetime).toLocaleString('en-GB', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const filteredExams = exams.filter(exam => {
    if (!searchQuery) return true;
    return exam.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const activeFiltersCount = [filterSession, filterTerm, filterStatus].filter(Boolean).length;

  // Get statistics
  const stats = {
    total: exams.length,
    upcoming: exams.filter(e => e.status === 'upcoming').length,
    active: exams.filter(e => e.status === 'active').length,
    completed: exams.filter(e => e.status === 'completed').length
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h2 className="text-2xl md:text-3xl flex items-center gap-3">
            <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-lg">
              <ClipboardList className="h-6 w-6 text-white" />
            </div>
            <span className="break-words">Exams Management</span>
          </h2>
          <p className="text-slate-600 mt-2 text-sm md:text-base">Create and manage general examinations for all classes</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) resetForm();
        }}>
          <DialogTrigger asChild>
            <Button size="lg" className="gap-2 w-full md:w-auto">
              <Plus className="h-5 w-5" />
              Create Exam
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">{editingExam ? 'Edit Exam' : 'Create New Exam'}</DialogTitle>
              <DialogDescription>
                {editingExam ? 'Update exam details below' : 'Fill in the details to create a new exam'}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Information */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 pb-2 border-b">
                  <BookOpen className="h-4 w-4" />
                  Basic Information
                </h3>
                
                <div className="space-y-2">
                  <Label htmlFor="name">Exam Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., First Terminal Examination 2024"
                    required
                  />
                </div>

                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Exam status is automatically calculated based on start and end dates:
                    <ul className="mt-2 ml-4 list-disc text-sm">
                      <li><strong>Upcoming</strong>: Before start date</li>
                      <li><strong>Active</strong>: Between start and end dates</li>
                      <li><strong>Completed</strong>: After end date</li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </div>

              {/* Academic Details */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 pb-2 border-b">
                  <Calendar className="h-4 w-4" />
                  Academic Period
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session">Session *</Label>
                    <Select 
                      value={formData.session} 
                      onValueChange={(value) => setFormData({ ...formData, session: value })}
                    >
                      <SelectTrigger id="session">
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

                  <div className="space-y-2">
                    <Label htmlFor="term">Term *</Label>
                    <Select 
                      value={formData.term} 
                      onValueChange={(value) => setFormData({ ...formData, term: value })}
                    >
                      <SelectTrigger id="term">
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

              {/* Schedule */}
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 pb-2 border-b">
                  <Calendar className="h-4 w-4" />
                  Schedule (Optional)
                </h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="start_datetime">Start Date & Time</Label>
                    <Input
                      id="start_datetime"
                      type="datetime-local"
                      value={formData.start_datetime}
                      onChange={(e) => setFormData({ ...formData, start_datetime: e.target.value })}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="end_datetime">End Date & Time</Label>
                    <Input
                      id="end_datetime"
                      type="datetime-local"
                      value={formData.end_datetime}
                      onChange={(e) => setFormData({ ...formData, end_datetime: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setDialogOpen(false)}
                  disabled={submitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={submitting}>
                  {submitting ? (
                    <>
                      <Clock className="h-4 w-4 mr-2 animate-spin" />
                      {editingExam ? 'Updating...' : 'Creating...'}
                    </>
                  ) : (
                    <>
                      {editingExam ? 'Update Exam' : 'Create Exam'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-slate-50 to-slate-100 border-slate-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 text-slate-800">{stats.total}</div>
              <div className="text-sm text-slate-600">Total Exams</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 text-blue-700">{stats.upcoming}</div>
              <div className="text-sm text-blue-600">Upcoming</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 text-green-700">{stats.active}</div>
              <div className="text-sm text-green-600">Active</div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="pt-6">
            <div className="text-center">
              <div className="text-3xl font-bold mb-1 text-purple-700">{stats.completed}</div>
              <div className="text-sm text-purple-600">Completed</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  placeholder="Search exams by name or type..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button
                variant={showFilters ? "default" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                className="gap-2"
              >
                <Filter className="h-4 w-4" />
                Filters
                {activeFiltersCount > 0 && (
                  <Badge variant="secondary" className="ml-1">{activeFiltersCount}</Badge>
                )}
              </Button>
              {activeFiltersCount > 0 && (
                <Button variant="ghost" onClick={clearFilters} className="gap-2">
                  <X className="h-4 w-4" />
                  Clear
                </Button>
              )}
            </div>

            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-slate-50 rounded-lg border">
                <div className="space-y-2">
                  <Label htmlFor="filter-session">Session</Label>
                  <Select value={filterSession} onValueChange={setFilterSession}>
                    <SelectTrigger id="filter-session">
                      <SelectValue placeholder="All sessions" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All sessions</SelectItem>
                      {sessions.map((sess) => (
                        <SelectItem key={sess.session_name} value={sess.session_name}>
                          {sess.session_name}
                          {sess.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-term">Term</Label>
                  <Select value={filterTerm} onValueChange={setFilterTerm}>
                    <SelectTrigger id="filter-term">
                      <SelectValue placeholder="All terms" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All terms</SelectItem>
                      {terms.map((term) => (
                        <SelectItem key={term.term_name} value={term.term_name}>
                          {term.term_name}
                          {term.is_current && <span className="ml-2 text-xs text-green-600">(Current)</span>}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="filter-status">Status</Label>
                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger id="filter-status">
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      <SelectItem value="upcoming">Upcoming</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="completed">Completed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Exams Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <ClipboardList className="h-5 w-5" />
                Exams List
              </CardTitle>
              <CardDescription className="mt-1">
                {filteredExams.length} exam{filteredExams.length !== 1 ? 's' : ''} {searchQuery && 'matching your search'}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="text-center py-16">
              <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto"></div>
              <p className="text-slate-600 mt-6">Loading exams...</p>
            </div>
          ) : filteredExams.length === 0 ? (
            <div className="text-center py-16">
              <div className="bg-slate-100 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-4">
                <ClipboardList className="h-10 w-10 text-slate-400" />
              </div>
              {searchQuery || activeFiltersCount > 0 ? (
                <>
                  <h3 className="text-lg mb-2">No exams found</h3>
                  <p className="text-slate-600 mb-4">Try adjusting your search or filters</p>
                  <Button variant="outline" onClick={clearFilters}>
                    Clear filters
                  </Button>
                </>
              ) : (
                <>
                  <h3 className="text-lg mb-2">No exams yet</h3>
                  <p className="text-slate-600 mb-4">Create your first exam to get started</p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    Create Exam
                  </Button>
                </>
              )}
            </div>
          ) : (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="bg-slate-50">
                    <TableHead>Exam Name</TableHead>
                    <TableHead>Academic Period</TableHead>
                    <TableHead>Schedule</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExams.map((exam) => {
                    return (
                      <TableRow key={exam.id} className="hover:bg-slate-50">
                        <TableCell>
                          <div className="flex items-start gap-3">
                            <div className="bg-blue-100 p-2 rounded-lg mt-0.5">
                              <ClipboardList className="h-4 w-4 text-blue-600" />
                            </div>
                            <div>
                              <div>{exam.name}</div>
                              <div className="text-xs text-slate-500 mt-1">For all classes</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <Calendar className="h-3 w-3 text-slate-400" />
                              <span className="text-sm">{exam.session}</span>
                            </div>
                            <div className="text-sm text-slate-600">
                              {exam.term}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1 text-sm">
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span className="text-xs">Start:</span>
                              <span>{formatDateTime(exam.start_datetime)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className="h-3 w-3 text-slate-400" />
                              <span className="text-xs">End:</span>
                              <span>{formatDateTime(exam.end_datetime)}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(exam.status)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(exam)}
                              className="hover:bg-blue-50"
                              disabled={deletingId === exam.id}
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(exam.id)}
                              className="hover:bg-red-50 hover:text-red-600"
                              disabled={deletingId === exam.id}
                            >
                              {deletingId === exam.id ? (
                                <Clock className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}