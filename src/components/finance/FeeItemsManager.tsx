import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '../ui/dialog';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { Loader2, Save, Plus, Trash2, Edit2, X, DollarSign, Info, CheckCircle, ArrowLeft, Star, Percent, User, AlertTriangle } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface FeeItem {
  id?: string;
  item_name: string;
  amount: number;
  is_tuition: boolean;
  is_compulsory: boolean;
  session_id: string;
  term_id: string;
  class_level: string;
  student_type: string;
  created_at?: string;
  updated_at?: string;
}

interface Session {
  id: string;
  session_name: string;
  is_current: boolean;
}

interface Term {
  id: string;
  term_name: string;
  is_current: boolean;
}

interface StudentDiscount {
  student_id: string;
  student_name?: string;
  student_class?: string;
  student_type?: 'Day' | 'Boarding';
  discount_percentage: number;
  reason: string;
  added_by?: string;
  added_at?: string;
}

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  student_type?: 'Day' | 'Boarding';
}

interface FeeItemsManagerProps {
  onBack?: () => void;
}

export default function FeeItemsManager({ onBack }: FeeItemsManagerProps = {}) {
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);

  // Student Discount State
  const [students, setStudents] = useState<Student[]>([]);
  const [discounts, setDiscounts] = useState<StudentDiscount[]>([]);
  const [loadingDiscounts, setLoadingDiscounts] = useState(false);
  const [showDiscountDialog, setShowDiscountDialog] = useState(false);
  const [discountFormData, setDiscountFormData] = useState({
    student_id: '',
    discount_percentage: '',
    reason: '',
  });

  const [formData, setFormData] = useState<FeeItem>({
    item_name: '',
    amount: 0,
    is_tuition: false,
    is_compulsory: true,
    session_id: '',
    term_id: '',
    class_level: 'ALL',
    student_type: 'ALL',
  });

  const supabase = createClient();

  useEffect(() => {
    fetchSessionsAndTerms();
    fetchStudents();
  }, []);

  useEffect(() => {
    if (currentSession && currentTerm) {
      fetchFeeItems();
      fetchStudentDiscounts();
    }
  }, [currentSession, currentTerm]);

  const fetchSessionsAndTerms = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/session-settings`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      const result = await response.json();
      if (result.success) {
        setSessions(result.sessions || []);
        setTerms(result.terms || []);

        const activeSess = result.sessions?.find((s: Session) => s.is_current);
        const activeTerm = result.terms?.find((t: Term) => t.is_current);

        if (activeSess) {
          setCurrentSession(activeSess);
          setFormData(prev => ({ ...prev, session_id: activeSess.id }));
        }
        if (activeTerm) {
          setCurrentTerm(activeTerm);
          setFormData(prev => ({ ...prev, term_id: activeTerm.id }));
        }
      }
    } catch (error) {
      console.error('Error fetching sessions/terms:', error);
    }
  };

  const fetchFeeItems = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams();
      if (currentSession) params.append('session_id', currentSession.id);
      if (currentTerm) params.append('term_id', currentTerm.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-items?${params}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setFeeItems(data.fee_items || []);
      } else {
        toast.error(data.error || 'Failed to load fee items');
      }
    } catch (error) {
      console.error('Error fetching fee items:', error);
      toast.error('Failed to load fee items');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    console.log('[FeeItems] Submit triggered with formData:', formData);

    if (!formData.item_name.trim()) {
      toast.error('Please enter a fee item name');
      return;
    }

    if (!formData.amount || formData.amount <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    if (!formData.session_id || !formData.term_id) {
      console.error('[FeeItems] Missing session_id or term_id:', {
        session_id: formData.session_id,
        term_id: formData.term_id,
        currentSession,
        currentTerm
      });
      toast.error('Please select session and term');
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
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-items/${editingId}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-items`;

      const method = editingId ? 'PUT' : 'POST';

      console.log('[FeeItems] Sending request:', {
        url,
        method,
        body: formData
      });

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      console.log('[FeeItems] Response status:', response.status);
      const data = await response.json();
      console.log('[FeeItems] Response data:', data);

      if (data.success) {
        toast.success(editingId ? 'Fee item updated successfully' : 'Fee item created successfully');
        resetForm();
        fetchFeeItems();
      } else {
        console.error('[FeeItems] Server error:', data.error);
        toast.error(data.error || 'Failed to save fee item');
      }
    } catch (error) {
      console.error('[FeeItems] Error saving fee item:', error);
      toast.error('An error occurred while saving: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (item: FeeItem) => {
    setFormData({
      item_name: item.item_name,
      amount: item.amount,
      is_tuition: item.is_tuition,
      is_compulsory: item.is_compulsory,
      session_id: item.session_id,
      term_id: item.term_id,
      class_level: item.class_level,
      student_type: item.student_type,
    });
    setEditingId(item.id || null);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this fee item? This cannot be undone.')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-items/${id}`,
        {
          method: 'DELETE',
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Fee item deleted successfully');
        fetchFeeItems();
      } else {
        toast.error(data.error || 'Failed to delete fee item');
      }
    } catch (error) {
      console.error('Error deleting fee item:', error);
      toast.error('An error occurred while deleting');
    }
  };

  const resetForm = () => {
    setFormData({
      item_name: '',
      amount: 0,
      is_tuition: false,
      is_compulsory: true,
      session_id: currentSession?.id || '',
      term_id: currentTerm?.id || '',
      class_level: 'ALL',
      student_type: 'ALL',
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

  const fetchStudents = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setStudents(data.students || []);
      } else {
        toast.error(data.error || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    }
  };

  const fetchStudentDiscounts = async () => {
    try {
      setLoadingDiscounts(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams();
      if (currentSession) params.append('session_id', currentSession.id);
      if (currentTerm) params.append('term_id', currentTerm.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/student-discounts?${params}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
        }
      );

      const data = await response.json();
      if (data.success) {
        setDiscounts(data.discounts || []);
      } else {
        toast.error(data.error || 'Failed to load student discounts');
      }
    } catch (error) {
      console.error('Error fetching student discounts:', error);
      toast.error('Failed to load student discounts');
    } finally {
      setLoadingDiscounts(false);
    }
  };

  const handleAddDiscount = async () => {
    if (!discountFormData.student_id) {
      toast.error('Please select a student');
      return;
    }
    if (!discountFormData.discount_percentage || parseFloat(discountFormData.discount_percentage) <= 0) {
      toast.error('Please enter a valid discount percentage');
      return;
    }
    if (parseFloat(discountFormData.discount_percentage) > 100) {
      toast.error('Discount cannot exceed 100%');
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/student-discounts`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: discountFormData.student_id,
            discount_percentage: parseFloat(discountFormData.discount_percentage),
            reason: discountFormData.reason || 'No reason provided',
            session_id: currentSession?.id,
            term_id: currentTerm?.id,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Student discount added successfully');
        setShowDiscountDialog(false);
        setDiscountFormData({ student_id: '', discount_percentage: '', reason: '' });
        fetchStudentDiscounts();
      } else {
        toast.error(data.error || 'Failed to add discount');
      }
    } catch (error) {
      console.error('Error adding discount:', error);
      toast.error('Failed to add discount');
    }
  };

  const handleDeleteDiscount = async (studentId: string) => {
    if (!confirm('Are you sure you want to remove this student discount?')) {
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      const params = new URLSearchParams();
      if (currentSession) params.append('session_id', currentSession.id);
      if (currentTerm) params.append('term_id', currentTerm.id);

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/student-discounts/${studentId}?${params}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Discount removed successfully');
        fetchStudentDiscounts();
      } else {
        toast.error(data.error || 'Failed to remove discount');
      }
    } catch (error) {
      console.error('Error removing discount:', error);
      toast.error('Failed to remove discount');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-purple-50/20 -mx-4 -mt-4 p-4 md:p-6 pb-24 md:pb-6">
      {/* Mobile App Header with Gradient */}
      <div className="bg-gradient-to-r from-blue-600 via-blue-700 to-purple-600 text-white rounded-3xl p-5 md:p-6 shadow-xl mb-5">
        <div className="flex items-center gap-3 mb-3">
          {onBack && (
            <button 
              onClick={onBack}
              className="p-2 hover:bg-white/20 rounded-xl transition-colors active:scale-95"
            >
              <ArrowLeft className="h-5 w-5" />
            </button>
          )}
          <div className="flex-1">
            <h1 className="text-xl md:text-2xl font-bold">Fee Items Management</h1>
            <p className="text-blue-100 text-xs md:text-sm mt-1">
              Itemized fee structure (Tuition, Boarding, etc.)
            </p>
          </div>
          {!showForm && (
            <Button 
              onClick={() => setShowForm(true)}
              className="bg-white text-blue-600 hover:bg-blue-50 shadow-lg font-semibold rounded-xl h-10 px-4"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Add Item</span>
              <span className="sm:hidden">Add</span>
            </Button>
          )}
        </div>

        {/* Active Session/Term Badge */}
        {(currentSession || currentTerm) && (
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-3 flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-300 flex-shrink-0" />
            <p className="text-xs md:text-sm font-medium">
              <span className="text-blue-100">Active:</span> {currentSession?.session_name} - {currentTerm?.term_name}
            </p>
          </div>
        )}
      </div>

      {/* Info Alert */}
      <Alert className="mb-5 border-2 border-blue-300 bg-blue-50 rounded-2xl">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900 text-xs md:text-sm">
          <strong className="font-semibold">New Itemized System:</strong> Create fee items (Tuition, Boarding, Sports). Finance Admin assigns them to students. Discounts apply to Tuition only.
        </AlertDescription>
      </Alert>

      {/* Form Card */}
      {showForm && (
        <Card className="mb-5 border-2 border-slate-200 rounded-3xl shadow-lg overflow-hidden">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-slate-200">
            <CardTitle className="text-lg md:text-xl">{editingId ? 'Edit Fee Item' : 'New Fee Item'}</CardTitle>
            <CardDescription className="text-xs md:text-sm">
              Create a fee item for Finance Admin to assign
            </CardDescription>
          </CardHeader>
          <CardContent className="p-4 md:p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="item_name" className="text-sm font-semibold">Fee Item Name *</Label>
                  <Input
                    id="item_name"
                    placeholder="e.g., Tuition, Boarding, Sports"
                    value={formData.item_name}
                    onChange={(e) => setFormData({ ...formData, item_name: e.target.value })}
                    className="h-12 rounded-xl border-2 focus:border-blue-400"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="amount" className="text-sm font-semibold">Amount (₦) *</Label>
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
                    className="h-12 rounded-xl border-2 focus:border-blue-400"
                    required
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="session" className="text-sm font-semibold">Session *</Label>
                    <Select
                      value={formData.session_id}
                      onValueChange={(value) => setFormData({ ...formData, session_id: value })}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2">
                        <SelectValue placeholder="Select session" />
                      </SelectTrigger>
                      <SelectContent>
                        {sessions.map((sess) => (
                          <SelectItem key={sess.id} value={sess.id}>
                            {sess.session_name}
                            {sess.is_current && (
                              <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="term" className="text-sm font-semibold">Term *</Label>
                    <Select
                      value={formData.term_id}
                      onValueChange={(value) => setFormData({ ...formData, term_id: value })}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2">
                        <SelectValue placeholder="Select term" />
                      </SelectTrigger>
                      <SelectContent>
                        {terms.map((t) => (
                          <SelectItem key={t.id} value={t.id}>
                            {t.term_name}
                            {t.is_current && (
                              <Badge variant="default" className="ml-2 text-xs">Active</Badge>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="class_level" className="text-sm font-semibold">Class Level</Label>
                    <Select
                      value={formData.class_level}
                      onValueChange={(value) => setFormData({ ...formData, class_level: value })}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All Classes</SelectItem>
                        <SelectItem value="JSS1">JSS1</SelectItem>
                        <SelectItem value="JSS2">JSS2</SelectItem>
                        <SelectItem value="JSS3">JSS3</SelectItem>
                        <SelectItem value="SSS1">SSS1</SelectItem>
                        <SelectItem value="SSS2">SSS2</SelectItem>
                        <SelectItem value="SSS3">SSS3</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="student_type" className="text-sm font-semibold">Student Type *</Label>
                    <Select
                      value={formData.student_type}
                      onValueChange={(value) => setFormData({ ...formData, student_type: value })}
                    >
                      <SelectTrigger className="h-12 rounded-xl border-2">
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ALL">All (Day + Boarding)</SelectItem>
                        <SelectItem value="Day">Day Only</SelectItem>
                        <SelectItem value="Boarding">Boarding Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>

              <div className="space-y-3 border-t-2 pt-4">
                <div className="flex items-start space-x-3 bg-yellow-50 border-2 border-yellow-200 rounded-2xl p-3">
                  <Checkbox
                    id="is_tuition"
                    checked={formData.is_tuition}
                    onCheckedChange={(checked) => 
                      setFormData({ ...formData, is_tuition: checked as boolean })
                    }
                    className="mt-0.5"
                  />
                  <Label htmlFor="is_tuition" className="flex items-start gap-2 cursor-pointer text-sm">
                    <Star className="h-4 w-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <span className="flex-1">This is the <strong>Tuition</strong> item (discounts apply here)</span>
                  </Label>
                </div>

                <div className="flex items-start space-x-3 bg-blue-50 border-2 border-blue-200 rounded-2xl p-3">
                  <Checkbox
                    id="is_compulsory"
                    checked={formData.is_compulsory}
                    onCheckedChange={(checked) =>
                      setFormData({ ...formData, is_compulsory: checked as boolean })
                    }
                    className="mt-0.5"
                  />
                  <Label htmlFor="is_compulsory" className="cursor-pointer text-sm flex-1">
                    <strong>Compulsory</strong> (all students must pay this)
                  </Label>
                </div>
              </div>

              <div className="flex gap-2 justify-end pt-4">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={resetForm}
                  className="h-12 rounded-xl border-2 px-6"
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
                <Button 
                  type="submit" 
                  disabled={saving}
                  className="h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-xl shadow-lg px-6"
                >
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

      {/* Fee Items List */}
      <Card className="mb-5 border-2 border-slate-200 rounded-3xl shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b-2 border-slate-200">
          <CardTitle className="text-lg md:text-xl flex items-center gap-2">
            <DollarSign className="h-5 w-5 text-blue-600" />
            Fee Items
          </CardTitle>
          <CardDescription className="text-xs md:text-sm">
            {currentSession?.session_name} - {currentTerm?.term_name}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-blue-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Loading fee items...</p>
              </div>
            </div>
          ) : feeItems.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
              <DollarSign className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-700 mb-2">No fee items created yet</h3>
              <p className="text-sm text-slate-500">Click "Add Item" to create your first fee item</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {feeItems.map((item) => (
                  <div 
                    key={item.id}
                    className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {item.is_tuition && (
                            <Star className="h-4 w-4 text-yellow-500 flex-shrink-0" />
                          )}
                          <h3 className="font-bold text-slate-900">{item.item_name}</h3>
                        </div>
                        <p className="text-xl font-bold text-blue-600">{formatCurrency(item.amount)}</p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEdit(item)}
                          className="h-9 w-9 p-0 rounded-xl hover:bg-blue-50"
                        >
                          <Edit2 className="h-4 w-4 text-blue-600" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(item.id!)}
                          className="h-9 w-9 p-0 rounded-xl hover:bg-red-50"
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2">
                      <Badge variant="secondary" className="rounded-lg">
                        {item.student_type}
                      </Badge>
                      <Badge variant="outline" className="rounded-lg">
                        {item.class_level}
                      </Badge>
                      <Badge 
                        variant={item.is_compulsory ? 'default' : 'secondary'}
                        className="rounded-lg"
                      >
                        {item.is_compulsory ? 'Compulsory' : 'Optional'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border-2 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold">Item Name</TableHead>
                      <TableHead className="font-bold">Amount</TableHead>
                      <TableHead className="font-bold">Student Type</TableHead>
                      <TableHead className="font-bold">Class</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {feeItems.map((item) => (
                      <TableRow key={item.id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {item.is_tuition && (
                              <Star className="h-4 w-4 text-yellow-500" />
                            )}
                            {item.item_name}
                          </div>
                        </TableCell>
                        <TableCell className="font-bold text-blue-600">
                          {formatCurrency(item.amount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary" className="rounded-lg">{item.student_type}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="rounded-lg">{item.class_level}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={item.is_compulsory ? 'default' : 'secondary'}
                            className="rounded-lg"
                          >
                            {item.is_compulsory ? 'Compulsory' : 'Optional'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(item)}
                              className="rounded-xl hover:bg-blue-50"
                            >
                              <Edit2 className="h-4 w-4 text-blue-600" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(item.id!)}
                              className="rounded-xl hover:bg-red-50"
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student-Specific Discounts Section */}
      <Card className="border-2 border-slate-200 rounded-3xl shadow-lg overflow-hidden">
        <CardHeader className="bg-gradient-to-r from-purple-50 to-blue-50 border-b-2 border-slate-200">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex-1">
              <CardTitle className="flex items-center gap-2 text-lg md:text-xl">
                <Percent className="h-5 w-5 text-purple-600" />
                Tuition Discounts
              </CardTitle>
              <CardDescription className="text-xs md:text-sm mt-1">
                Individual discounts for students (applies to Tuition only)
              </CardDescription>
            </div>
            <Button 
              onClick={() => setShowDiscountDialog(true)}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-lg font-semibold rounded-xl h-10 px-4 w-full sm:w-auto"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              Add Discount
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6">
          {/* Important Warning */}
          <Alert className="mb-4 border-2 border-yellow-400 bg-yellow-50 rounded-2xl">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <AlertDescription className="text-yellow-900 text-xs md:text-sm">
              <strong className="font-semibold">⚠️ Important:</strong> Discounts apply ONLY to "Tuition" items. Other fees (Boarding, Sports, etc.) remain at full price.
              <br />
              <span className="text-xs mt-1 block opacity-90">
                Example: Tuition = ₦100,000 with 20% discount = ₦80,000. Boarding (₦50,000) stays at full price.
              </span>
            </AlertDescription>
          </Alert>

          {loadingDiscounts ? (
            <div className="flex justify-center py-12">
              <div className="text-center">
                <Loader2 className="h-10 w-10 animate-spin text-purple-600 mx-auto mb-3" />
                <p className="text-sm text-slate-600">Loading discounts...</p>
              </div>
            </div>
          ) : discounts.length === 0 ? (
            <div className="text-center py-12 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-300">
              <User className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <h3 className="font-semibold text-slate-700 mb-2">No discounts configured</h3>
              <p className="text-sm text-slate-500">Click "Add Discount" to create one</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Mobile Card View */}
              <div className="block md:hidden space-y-3">
                {discounts.map((discount) => (
                  <div 
                    key={discount.student_id}
                    className="bg-white border-2 border-slate-200 rounded-2xl p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <h3 className="font-bold text-slate-900 mb-1">
                          {discount.student_name || 'Unknown Student'}
                        </h3>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className="bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                            {discount.discount_percentage}% OFF
                          </Badge>
                          <Badge variant={discount.student_type === 'Day' ? 'default' : 'secondary'} className="rounded-lg">
                            {discount.student_type || 'N/A'}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 mb-1">
                          <span className="font-semibold">Class:</span> {discount.student_class || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-600">
                          <span className="font-semibold">Reason:</span> {discount.reason}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteDiscount(discount.student_id)}
                        className="h-9 w-9 p-0 rounded-xl hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border-2 rounded-2xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-slate-50">
                      <TableHead className="font-bold">Student Name</TableHead>
                      <TableHead className="font-bold">Class</TableHead>
                      <TableHead className="font-bold">Type</TableHead>
                      <TableHead className="font-bold">Discount</TableHead>
                      <TableHead className="font-bold">Reason</TableHead>
                      <TableHead className="text-right font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {discounts.map((discount) => (
                      <TableRow key={discount.student_id} className="hover:bg-slate-50">
                        <TableCell className="font-medium">
                          {discount.student_name || 'Unknown Student'}
                        </TableCell>
                        <TableCell>{discount.student_class || 'N/A'}</TableCell>
                        <TableCell>
                          <Badge 
                            variant={discount.student_type === 'Day' ? 'default' : 'secondary'}
                            className="rounded-lg"
                          >
                            {discount.student_type || 'N/A'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-green-500 hover:bg-green-600 text-white rounded-lg font-bold">
                            {discount.discount_percentage}% OFF
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-slate-600 max-w-xs truncate">
                          {discount.reason}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteDiscount(discount.student_id)}
                            className="rounded-xl hover:bg-red-50"
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Student Discount Dialog */}
      <Dialog open={showDiscountDialog} onOpenChange={setShowDiscountDialog}>
        <DialogContent className="max-w-md rounded-3xl">
          <DialogHeader>
            <DialogTitle className="text-lg">Add Student Discount</DialogTitle>
            <DialogDescription className="text-sm">
              Set discount for {currentSession?.session_name} - {currentTerm?.term_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="space-y-2">
              <Label htmlFor="discount_student" className="text-sm font-semibold">Select Student *</Label>
              <Select
                value={discountFormData.student_id}
                onValueChange={(value) => setDiscountFormData({ ...discountFormData, student_id: value })}
              >
                <SelectTrigger className="h-12 rounded-xl border-2">
                  <SelectValue placeholder="Choose a student" />
                </SelectTrigger>
                <SelectContent>
                  {students.map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      {student.first_name} {student.last_name}
                      {student.class_name && ` (${student.class_name})`}
                      {student.student_type && ` - ${student.student_type}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_percentage" className="text-sm font-semibold">Discount (%) *</Label>
              <Input
                id="discount_percentage"
                type="number"
                step="0.01"
                min="0"
                max="100"
                placeholder="e.g., 20 for 20%"
                value={discountFormData.discount_percentage}
                onChange={(e) => setDiscountFormData({ ...discountFormData, discount_percentage: e.target.value })}
                className="h-12 rounded-xl border-2 focus:border-purple-400"
              />
              <p className="text-xs text-slate-500">
                Enter 0-100 (applies to Tuition only)
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="discount_reason" className="text-sm font-semibold">Reason (Optional)</Label>
              <Textarea
                id="discount_reason"
                placeholder="e.g., Staff child, Scholarship, Sibling discount"
                value={discountFormData.reason}
                onChange={(e) => setDiscountFormData({ ...discountFormData, reason: e.target.value })}
                rows={3}
                className="rounded-xl border-2 focus:border-purple-400"
              />
            </div>

            <div className="flex gap-2 justify-end pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowDiscountDialog(false);
                  setDiscountFormData({ student_id: '', discount_percentage: '', reason: '' });
                }}
                className="h-12 rounded-xl border-2 px-6"
              >
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
              <Button 
                onClick={handleAddDiscount}
                className="h-12 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-xl shadow-lg px-6"
              >
                <Save className="h-4 w-4 mr-2" />
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
