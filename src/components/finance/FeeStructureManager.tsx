import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, Edit2, X, DollarSign, Info, CheckCircle, ArrowLeft } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface FeeStructure {
  id?: string;
  student_type: 'Day' | 'Boarding';
  session: string;
  term: string;
  amount: number;
  created_at?: string;
  updated_at?: string;
}

interface FeeStructureManagerProps {
  onBack?: () => void;
}

export default function FeeStructureManager({ onBack }: FeeStructureManagerProps = {}) {
  const [structures, setStructures] = useState<FeeStructure[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeSession, setActiveSession] = useState<string>('');
  const [activeTerm, setActiveTerm] = useState<string>('');
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);

  const [formData, setFormData] = useState<FeeStructure>({
    student_type: 'Day',
    session: '',
    term: '',
    amount: 0,
  });

  const supabase = createClient();

  useEffect(() => {
    fetchActiveSessionAndTerm();
    fetchFeeStructures();
  }, []);

  const fetchActiveSessionAndTerm = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return;
      }

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
        // Get active session
        const currentSession = result.sessions?.find((s: any) => s.is_current);
        if (currentSession) {
          setActiveSession(currentSession.session_name);
          setFormData(prev => ({ ...prev, session: currentSession.session_name }));
        }

        // Get active term
        const currentTerm = result.terms?.find((t: any) => t.is_current);
        if (currentTerm) {
          setActiveTerm(currentTerm.term_name);
          setFormData(prev => ({ ...prev, term: currentTerm.term_name }));
        }

        // Get all available sessions for dropdown
        if (result.sessions) {
          const sessionNames = result.sessions.map((s: any) => s.session_name);
          setAvailableSessions(sessionNames);
        }

        console.log('[Fee Structures] Active session:', currentSession?.session_name);
        console.log('[Fee Structures] Active term:', currentTerm?.term_name);
      }
    } catch (error) {
      console.error('[Fee Structures] Error fetching active session/term:', error);
    }
  };

  const fetchFeeStructures = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-structures`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        setStructures(data.structures || []);
      } else {
        toast.error(data.error || 'Failed to load fee structures');
      }
    } catch (error) {
      console.error('Error fetching fee structures:', error);
      toast.error('Failed to load fee structures');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const url = editingId
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-structures/${editingId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-structures`;

      const method = editingId ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (data.success) {
        toast.success(editingId ? 'Fee structure updated successfully' : 'Fee structure created successfully');
        resetForm();
        fetchFeeStructures();
      } else {
        toast.error(data.error || 'Failed to save fee structure');
      }
    } catch (error) {
      console.error('Error saving fee structure:', error);
      toast.error('An error occurred while saving');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (structure: FeeStructure) => {
    setFormData({
      student_type: structure.student_type,
      session: structure.session,
      term: structure.term,
      amount: structure.amount,
    });
    setEditingId(structure.id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee structure?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-structures/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();

      if (data.success) {
        toast.success('Fee structure deleted successfully');
        fetchFeeStructures();
      } else {
        toast.error(data.error || 'Failed to delete fee structure');
      }
    } catch (error) {
      console.error('Error deleting fee structure:', error);
      toast.error('An error occurred while deleting');
    }
  };

  const resetForm = () => {
    setFormData({
      student_type: 'Day',
      session: activeSession || '',
      term: activeTerm || '',
      amount: 0,
    });
    setEditingId(null);
    setShowForm(false);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <Button variant="ghost" size="icon" onClick={onBack}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
          )}
          <div>
            <h2 className="text-2xl font-bold">Fee Structure Configuration</h2>
            <p className="text-muted-foreground mt-1">
              Configure required school fees for Day and Boarding students
            </p>
          </div>
        </div>
        {!showForm && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Fee Structure
          </Button>
        )}
      </div>

      {/* Active Session/Term Info */}
      {(activeSession || activeTerm) && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Active Now:</strong> {activeSession} - {activeTerm}
            <br />
            <span className="text-sm">Fee structures are automatically set to the active session and term when creating new entries.</span>
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert className="border-blue-500 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          Configure the required fee amounts for each student type (Day/Boarding) per academic session and term.
          These amounts will be used to calculate student clearance status when payments are recorded.
        </AlertDescription>
      </Alert>

      {/* Form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>{editingId ? 'Edit Fee Structure' : 'New Fee Structure'}</CardTitle>
            <CardDescription>
              Set the required fee amount for a specific student type, session, and term
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="student_type">Student Type *</Label>
                  <Select
                    value={formData.student_type}
                    onValueChange={(value: 'Day' | 'Boarding') =>
                      setFormData({ ...formData, student_type: value })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Day">Day Student</SelectItem>
                      <SelectItem value="Boarding">Boarding Student</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="session">Academic Session *</Label>
                  <div className="space-y-2">
                    <Select
                      value={formData.session}
                      onValueChange={(value) => setFormData({ ...formData, session: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSessions.length > 0 ? (
                          availableSessions.map((session) => (
                            <SelectItem key={session} value={session}>
                              {session}
                              {session === activeSession && (
                                <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                              )}
                            </SelectItem>
                          ))
                        ) : (
                          <>
                            <SelectItem value="2023/2024">2023/2024</SelectItem>
                            <SelectItem value="2024/2025">2024/2025</SelectItem>
                            <SelectItem value="2025/2026">2025/2026</SelectItem>
                            <SelectItem value="2026/2027">2026/2027</SelectItem>
                          </>
                        )}
                      </SelectContent>
                    </Select>
                    {activeSession && formData.session === activeSession && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        This is the currently active session
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="term">Term *</Label>
                  <div className="space-y-2">
                    <Select
                      value={formData.term}
                      onValueChange={(value) => setFormData({ ...formData, term: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="First Term">
                          First Term
                          {activeTerm === 'First Term' && (
                            <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                          )}
                        </SelectItem>
                        <SelectItem value="Second Term">
                          Second Term
                          {activeTerm === 'Second Term' && (
                            <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                          )}
                        </SelectItem>
                        <SelectItem value="Third Term">
                          Third Term
                          {activeTerm === 'Third Term' && (
                            <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                          )}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    {activeTerm && formData.term === activeTerm && (
                      <p className="text-xs text-green-600 flex items-center gap-1">
                        <CheckCircle className="h-3 w-3" />
                        This is the currently active term
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount">Required Amount (₦) *</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={formData.amount || ''}
                    onChange={(e) =>
                      setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                    }
                    required
                  />
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button type="button" variant="outline" onClick={resetForm}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button type="submit" disabled={saving}>
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      {editingId ? 'Update' : 'Save'}
                    </>
                  )}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Table */}
      <Card>
        <CardHeader>
          <CardTitle>Fee Structures</CardTitle>
          <CardDescription>All configured fee structures</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : structures.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No fee structures configured yet</p>
              <p className="text-sm mt-2">Click "Add Fee Structure" to create one</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Type</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Term</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {structures.map((structure) => (
                    <TableRow key={structure.id}>
                      <TableCell>
                        <Badge
                          variant={structure.student_type === 'Day' ? 'default' : 'secondary'}
                        >
                          {structure.student_type}
                        </Badge>
                      </TableCell>
                      <TableCell>{structure.session}</TableCell>
                      <TableCell>{structure.term}</TableCell>
                      <TableCell className="font-semibold">
                        {formatCurrency(structure.amount)}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(structure)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(structure.id!)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}