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
import { toast } from 'sonner';
import { Loader2, Save, Settings, Search, Info, CheckCircle, ArrowLeft, Star, DollarSign, User, Percent } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  student_type?: 'Day' | 'Boarding';
  assigned_items?: AssignedFeeItem[];
  total_required?: number;
  discount_percentage?: number;
}

interface FeeItem {
  id: string;
  item_name: string;
  amount: number;
  is_tuition: boolean;
  is_compulsory: boolean;
  student_type: string;
  class_level: string;
}

interface AssignedFeeItem {
  fee_item_id: string;
  item_name: string;
  amount: number;
  is_tuition: boolean;
  is_compulsory: boolean;
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

interface StudentFeeAssignmentProps {
  onBack?: () => void;
}

export default function StudentFeeAssignment({ onBack }: StudentFeeAssignmentProps = {}) {
  const [students, setStudents] = useState<Student[]>([]);
  const [feeItems, setFeeItems] = useState<FeeItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('ALL');
  const [filterStudentType, setFilterStudentType] = useState<string>('ALL');
  
  const [sessions, setSessions] = useState<Session[]>([]);
  const [terms, setTerms] = useState<Term[]>([]);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [currentTerm, setCurrentTerm] = useState<Term | null>(null);

  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showAssignDialog, setShowAssignDialog] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);

  const supabase = createClient();

  useEffect(() => {
    fetchSessionsAndTerms();
  }, []);

  useEffect(() => {
    if (currentSession && currentTerm) {
      fetchFeeItems();
      fetchStudents();
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

        if (activeSess) setCurrentSession(activeSess);
        if (activeTerm) setCurrentTerm(activeTerm);
      }
    } catch (error) {
      console.error('Error fetching sessions/terms:', error);
    }
  };

  const fetchFeeItems = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams();
      if (currentSession) params.append('session_id', currentSession.id);
      if (currentTerm) params.append('term_id', currentTerm.id);
      params.append('_t', Date.now().toString()); // Cache buster

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-items?${params}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cache: 'no-store', // Disable caching
        }
      );

      const data = await response.json();
      console.log('[StudentFeeAssignment] Fetched fee items:', data);
      if (data.success) {
        setFeeItems(data.fee_items || []);
      }
    } catch (error) {
      console.error('Error fetching fee items:', error);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) return;

      const params = new URLSearchParams();
      if (currentSession) params.append('session_id', currentSession.id);
      if (currentTerm) params.append('term_id', currentTerm.id);
      params.append('_t', Date.now().toString()); // Cache buster

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/student-fee-assignments?${params}`,
        {
          headers: { 'Authorization': `Bearer ${session.access_token}` },
          cache: 'no-store', // Disable caching
        }
      );

      const data = await response.json();
      console.log('[StudentFeeAssignment] Fetched data:', data);
      if (data.success) {
        setStudents(data.students || []);
      } else {
        toast.error(data.error || 'Failed to load students');
      }
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAssignDialog = (student: Student) => {
    setSelectedStudent(student);
    // Pre-populate with already assigned items
    const assignedIds = student.assigned_items?.map(item => item.fee_item_id) || [];
    setSelectedItemIds(assignedIds);
    setShowAssignDialog(true);
  };

  const handleToggleItem = (itemId: string, isCompulsory: boolean) => {
    if (isCompulsory) return; // Cannot uncheck compulsory items

    setSelectedItemIds(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const calculateTotal = () => {
    if (!selectedStudent) return 0;

    let total = 0;
    const discount = selectedStudent.discount_percentage || 0;

    // Get all applicable items
    const applicableItems = getApplicableFeeItems();
    
    // Calculate total for selected items AND compulsory items
    applicableItems.forEach(item => {
      const isSelected = selectedItemIds.includes(item.id);
      const isCompulsory = item.is_compulsory;
      
      // Include item if it's selected OR compulsory
      if (isSelected || isCompulsory) {
        let itemAmount = item.amount;
        // Apply discount ONLY to tuition items
        if (item.is_tuition && discount > 0) {
          itemAmount = itemAmount * (1 - discount / 100);
        }
        total += itemAmount;
      }
    });

    return total;
  };

  const getApplicableFeeItems = () => {
    if (!selectedStudent) return [];

    return feeItems.filter(item => {
      // Check student type match
      if (item.student_type !== 'ALL' && item.student_type !== selectedStudent.student_type) {
        return false;
      }

      // Check class level match (simplified - you may need more complex logic)
      if (item.class_level !== 'ALL') {
        // Extract class level from class_name (e.g., "JSS1" from "JSS1 A")
        const studentClass = selectedStudent.class_name?.split(' ')[0];
        if (item.class_level !== studentClass) {
          return false;
        }
      }

      return true;
    });
  };

  const handleSaveAssignments = async () => {
    if (!selectedStudent || !currentSession || !currentTerm) return;

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error('Authentication required');
        return;
      }

      // Get all applicable items
      const applicableItems = getApplicableFeeItems();
      
      // Include both selected items AND compulsory items
      const compulsoryItemIds = applicableItems
        .filter(item => item.is_compulsory)
        .map(item => item.id);
      
      const allItemIds = [...new Set([...selectedItemIds, ...compulsoryItemIds])];

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/student-fee-assignments`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            student_id: selectedStudent.id,
            session_id: currentSession.id,
            term_id: currentTerm.id,
            fee_item_ids: allItemIds,
          }),
        }
      );

      const data = await response.json();
      if (data.success) {
        toast.success('Fee items assigned successfully');
        setShowAssignDialog(false);
        fetchStudents(); // Refresh the list
      } else {
        toast.error(data.error || 'Failed to assign fee items');
      }
    } catch (error) {
      console.error('Error saving assignments:', error);
      toast.error('Failed to save assignments');
    } finally {
      setSaving(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      `${student.first_name} ${student.last_name}`.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesClass = filterClass === 'ALL' || student.class_name?.includes(filterClass);
    const matchesType = filterStudentType === 'ALL' || student.student_type === filterStudentType;
    
    return matchesSearch && matchesClass && matchesType;
  });

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
            <h2 className="text-2xl font-bold">Assign Fee Items to Students</h2>
            <p className="text-muted-foreground mt-1">
              Select which fee items each student should pay
            </p>
          </div>
        </div>
      </div>

      {/* Active Session/Term Info */}
      {(currentSession || currentTerm) && (
        <Alert className="border-green-500 bg-green-50">
          <CheckCircle className="h-4 w-4 text-green-600" />
          <AlertDescription className="text-green-900">
            <strong>Active Now:</strong> {currentSession?.session_name} - {currentTerm?.term_name}
          </AlertDescription>
        </Alert>
      )}

      {/* Info Alert */}
      <Alert className="border-blue-500 bg-blue-50">
        <Info className="h-4 w-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          <strong>How it works:</strong> Select fee items for each student. Compulsory items are automatically assigned. 
          Discounts apply ONLY to Tuition items. The total shown reflects the student's actual required payment.
        </AlertDescription>
      </Alert>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="search">Search Student</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="class">Class</Label>
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger>
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
              <Label htmlFor="student_type">Student Type</Label>
              <Select value={filterStudentType} onValueChange={setFilterStudentType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  <SelectItem value="Day">Day Students</SelectItem>
                  <SelectItem value="Boarding">Boarding Students</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Students</CardTitle>
          <CardDescription>
            {filteredStudents.length} student(s) found
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : filteredStudents.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <User className="h-12 w-12 mx-auto mb-4 opacity-20" />
              <p>No students found</p>
            </div>
          ) : (
            <div className="border rounded-lg overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Class</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Assigned Items</TableHead>
                    <TableHead>Discount</TableHead>
                    <TableHead>Total Required</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredStudents.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell className="font-medium">
                        {student.first_name} {student.last_name}
                      </TableCell>
                      <TableCell>{student.class_name || 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant={student.student_type === 'Day' ? 'default' : 'secondary'}>
                          {student.student_type || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {student.assigned_items?.length || 0} items
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {student.discount_percentage ? (
                          <Badge className="bg-green-500">
                            {student.discount_percentage}%
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground text-sm">None</span>
                        )}
                      </TableCell>
                      <TableCell className="font-semibold">
                        {student.total_required !== undefined 
                          ? formatCurrency(student.total_required)
                          : <span className="text-muted-foreground">Not set</span>
                        }
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenAssignDialog(student)}
                        >
                          <Settings className="h-4 w-4 mr-2" />
                          Assign Items
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Assign Fee Items Dialog */}
      <Dialog open={showAssignDialog} onOpenChange={setShowAssignDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign Fee Items</DialogTitle>
            <DialogDescription>
              {selectedStudent && `${selectedStudent.first_name} ${selectedStudent.last_name}`} - {currentSession?.session_name} - {currentTerm?.term_name}
            </DialogDescription>
          </DialogHeader>

          {selectedStudent && (
            <div className="space-y-4 mt-4">
              {/* Student Info */}
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Class:</span>
                  <span className="text-sm">{selectedStudent.class_name || 'N/A'}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Type:</span>
                  <Badge variant={selectedStudent.student_type === 'Day' ? 'default' : 'secondary'}>
                    {selectedStudent.student_type || 'N/A'}
                  </Badge>
                </div>
                {selectedStudent.discount_percentage && selectedStudent.discount_percentage > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Tuition Discount:</span>
                    <Badge className="bg-green-500">
                      <Percent className="h-3 w-3 mr-1" />
                      {selectedStudent.discount_percentage}%
                    </Badge>
                  </div>
                )}
              </div>

              {/* Fee Items Selection */}
              <div className="space-y-2">
                <Label className="text-base font-semibold">Select Fee Items</Label>
                {getApplicableFeeItems().length === 0 ? (
                  <Alert>
                    <Info className="h-4 w-4" />
                    <AlertDescription>
                      No fee items available for this student type or class.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="border rounded-lg divide-y">
                    {getApplicableFeeItems().map((item) => {
                      const isSelected = selectedItemIds.includes(item.id);
                      const isCompulsory = item.is_compulsory;
                      const hasDiscount = item.is_tuition && selectedStudent.discount_percentage && selectedStudent.discount_percentage > 0;
                      const discountedAmount = hasDiscount 
                        ? item.amount * (1 - (selectedStudent.discount_percentage || 0) / 100)
                        : item.amount;

                      return (
                        <div
                          key={item.id}
                          className={`p-4 hover:bg-muted/50 transition-colors ${
                            isCompulsory ? 'bg-blue-50' : ''
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <Checkbox
                              id={`item-${item.id}`}
                              checked={isSelected || isCompulsory}
                              disabled={isCompulsory}
                              onCheckedChange={() => handleToggleItem(item.id, isCompulsory)}
                              className="mt-1"
                            />
                            <div className="flex-1">
                              <Label
                                htmlFor={`item-${item.id}`}
                                className="flex items-center gap-2 cursor-pointer font-medium"
                              >
                                {item.is_tuition && (
                                  <Star className="h-4 w-4 text-yellow-500" />
                                )}
                                {item.item_name}
                                {isCompulsory && (
                                  <Badge variant="default" className="ml-2 text-xs">
                                    Compulsory
                                  </Badge>
                                )}
                              </Label>
                              <div className="flex items-center gap-2 mt-1">
                                {hasDiscount ? (
                                  <>
                                    <span className="text-sm text-muted-foreground line-through">
                                      {formatCurrency(item.amount)}
                                    </span>
                                    <span className="text-sm font-semibold text-green-600">
                                      {formatCurrency(discountedAmount)}
                                    </span>
                                    <Badge className="bg-green-500 text-xs">
                                      {selectedStudent.discount_percentage}% OFF
                                    </Badge>
                                  </>
                                ) : (
                                  <span className="text-sm font-semibold">
                                    {formatCurrency(item.amount)}
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Total Calculation */}
              <div className="bg-primary/10 p-4 rounded-lg border-2 border-primary/20">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-semibold">Total Required:</span>
                  <span className="text-2xl font-bold text-primary">
                    {formatCurrency(calculateTotal())}
                  </span>
                </div>
                {selectedStudent.discount_percentage && selectedStudent.discount_percentage > 0 && (
                  <p className="text-xs text-muted-foreground mt-2">
                    * {selectedStudent.discount_percentage}% discount applied to Tuition only
                  </p>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 justify-end pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAssignDialog(false)}
                >
                  Cancel
                </Button>
                <Button 
                  onClick={handleSaveAssignments}
                  disabled={saving || calculateTotal() === 0}
                >
                  {saving ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save Assignments
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}