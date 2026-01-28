import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from '../ui/CustomToast';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';
import { Loader2, Save, X, Info, AlertCircle, CheckCircle, DollarSign } from 'lucide-react';
import { Checkbox } from '../ui/checkbox';

interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_name?: string;
  student_type?: 'Day' | 'Boarding';
}

interface ClearanceInfo {
  student_type: 'Day' | 'Boarding';
  required_amount: number;
  total_paid: number;
  outstanding_balance: number;
  is_cleared: boolean;
  next_part_payment_number: number;
  fee_items?: Array<{
    id: string;
    item_name: string;
    amount: number;
  }>;
}

interface PaymentEntryFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
  existingPayment?: any;
}

export default function PaymentEntryForm({ onSuccess, onCancel, existingPayment }: PaymentEntryFormProps) {
  const [loading, setLoading] = useState(false);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [clearanceInfo, setClearanceInfo] = useState<ClearanceInfo | null>(null);
  const [loadingClearance, setLoadingClearance] = useState(false);
  const [activeSession, setActiveSession] = useState('');
  const [activeTerm, setActiveTerm] = useState('');
  const [availableSessions, setAvailableSessions] = useState<string[]>([]);
  
  const [formData, setFormData] = useState({
    student_id: existingPayment?.student_id || '',
    student_type: existingPayment?.student_type || '',
    session: existingPayment?.session || '',
    term: existingPayment?.term || '',
    amount: existingPayment?.amount || '',
    payment_date: existingPayment?.payment_date || new Date().toISOString().split('T')[0],
    payment_method: existingPayment?.payment_method || 'Cash',
    reference_number: existingPayment?.reference_number || '',
    description: existingPayment?.description || '',
    proof_of_payment_url: existingPayment?.proof_of_payment_url || '',
  });

  const [proofFile, setProofFile] = useState<File | null>(null);
  const [uploadingProof, setUploadingProof] = useState(false);

  useEffect(() => {
    fetchActiveSessionAndTerm();
    fetchStudents();
  }, []);

  useEffect(() => {
    console.log('[PaymentForm] Form data changed:', {
      student_id: formData.student_id,
      session: formData.session,
      term: formData.term,
      shouldFetch: !!(formData.student_id && formData.session && formData.term)
    });
    
    if (formData.student_id && formData.session && formData.term) {
      fetchClearanceInfo();
    } else {
      setClearanceInfo(null);
    }
  }, [formData.student_id, formData.session, formData.term]);

  const supabase = createClient();

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
        if (currentSession && !existingPayment) {
          setActiveSession(currentSession.session_name);
          setFormData(prev => ({ ...prev, session: currentSession.session_name }));
        }

        // Get active term
        const currentTerm = result.terms?.find((t: any) => t.is_current);
        if (currentTerm && !existingPayment) {
          setActiveTerm(currentTerm.term_name);
          setFormData(prev => ({ ...prev, term: currentTerm.term_name }));
        }

        // Get all available sessions for dropdown
        if (result.sessions) {
          const sessionNames = result.sessions.map((s: any) => s.session_name);
          setAvailableSessions(sessionNames);
        }

        console.log('[PaymentForm] Active session:', currentSession?.session_name);
        console.log('[PaymentForm] Active term:', currentTerm?.term_name);
      }
    } catch (error) {
      console.error('[PaymentForm] Error fetching active session/term:', error);
      // Set defaults if fetch fails and not editing
      if (!existingPayment) {
        setFormData(prev => ({ 
          ...prev, 
          session: '2024/2025',
          term: 'First Term'
        }));
      }
    }
  };

  const fetchStudents = async () => {
    try {
      setStudentsLoading(true);
      console.log('[PaymentForm] Fetching students...');
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        console.error('[PaymentForm] Session error:', sessionError);
        toast.error('Authentication error. Please log in again.');
        return;
      }
      
      if (!session) {
        console.error('[PaymentForm] No session found');
        toast.error('Session expired. Please log in again.');
        return;
      }

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const url = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students`;
      console.log('[PaymentForm] Fetching from:', url);

      const res = await fetch(url, { headers });
      console.log('[PaymentForm] Response status:', res.status);
      console.log('[PaymentForm] Response ok:', res.ok);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('[PaymentForm] HTTP Error:', res.status, errorText);
        toast.error(`Server error (${res.status}): ${errorText || 'Failed to fetch students'}`);
        throw new Error(`Failed to fetch students: ${res.status}`);
      }
      
      const result = await res.json();
      console.log('[PaymentForm] Response data:', result);
      console.log('[PaymentForm] result.success:', result.success);
      console.log('[PaymentForm] result.students:', result.students);
      console.log('[PaymentForm] Is array?:', Array.isArray(result.students));

      if (result.success === true) {
        const studentsList = result.students || [];
        console.log('[PaymentForm] Students list:', studentsList);
        console.log('[PaymentForm] Loaded students count:', studentsList.length);
        
        setStudents(studentsList);
        
        if (studentsList.length === 0) {
          toast.info('No active students found. Please add students in Users Management.');
        } else {
          toast.success(`Loaded ${studentsList.length} students successfully`);
        }
      } else {
        const errorMsg = result.error || 'Failed to load students - no error message provided';
        console.error('[PaymentForm] Error from server:', errorMsg);
        console.error('[PaymentForm] Full result object:', JSON.stringify(result));
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('[PaymentForm] Error fetching students:', error);
      
      // Provide more specific error messages
      if (error instanceof TypeError && error.message.includes('fetch')) {
        toast.error('Network error: Unable to connect to server. Please check your connection.');
      } else {
        toast.error('Failed to load students. Please try again.');
      }
    } finally {
      setStudentsLoading(false);
    }
  };

  const fetchClearanceInfo = async () => {
    try {
      setLoadingClearance(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        console.log('[PaymentForm] No auth session found:', sessionError);
        return;
      }

      const params = new URLSearchParams({
        student_id: formData.student_id,
        session: formData.session,
        term: formData.term,
        _t: Date.now().toString(), // Cache buster
      });

      console.log('[PaymentForm] Fetching clearance info:', {
        student_id: formData.student_id,
        session: formData.session,
        term: formData.term
      });

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/clearance?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          cache: 'no-store', // Disable caching
        }
      );

      const data = await response.json();
      console.log('[PaymentForm] Clearance response:', data);

      if (data.success && data.clearance) {
        console.log('[PaymentForm] Setting clearance info:', data.clearance);
        console.log('[PaymentForm] Fee Items:', data.clearance.fee_items);
        setClearanceInfo(data.clearance);
      } else {
        console.log('[PaymentForm] No clearance data or error:', data.error);
        setClearanceInfo(null);
      }
    } catch (error) {
      console.error('[PaymentForm] Error fetching clearance info:', error);
      setClearanceInfo(null);
    } finally {
      setLoadingClearance(false);
    }
  };

  const fetchStudentDiscount = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/student-discount/${formData.student_id}?session=${formData.session}&term=${formData.term}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      console.log('[PaymentForm] Student discount response:', data);

      if (data.success) {
        setStudentDiscount(data);
      } else {
        setStudentDiscount(null);
      }
    } catch (error) {
      console.error('[PaymentForm] Error fetching student discount:', error);
      setStudentDiscount(null);
    }
  };

  const fetchFeeItems = async () => {
    try {
      setLoadingFeeItems(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/fee-items/${formData.student_id}?session=${formData.session}&term=${formData.term}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
        }
      );

      const data = await response.json();
      console.log('[PaymentForm] Fee items response:', data);

      if (data.success) {
        setFeeItems(data.fee_items);
        // If existing payment, pre-select fee items
        if (existingPayment) {
          const existingFeeItemIds = existingPayment.fee_items.map((item: any) => item.id);
          setSelectedFeeItems(existingFeeItemIds);
          calculateTotal(existingFeeItemIds);
        }
      } else {
        setFeeItems([]);
        setSelectedFeeItems([]);
        setCalculatedTotal(0);
      }
    } catch (error) {
      console.error('[PaymentForm] Error fetching fee items:', error);
      setFeeItems([]);
      setSelectedFeeItems([]);
      setCalculatedTotal(0);
    } finally {
      setLoadingFeeItems(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-NG', {
      style: 'currency',
      currency: 'NGN',
    }).format(amount);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      // Validate file type
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      if (!validTypes.includes(file.type)) {
        toast.error('Please upload a PNG or JPEG image file');
        e.target.value = '';
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        e.target.value = '';
        return;
      }
      
      setProofFile(file);
      console.log('[PaymentForm] Proof file selected:', file.name, file.type, file.size);
    }
  };

  const uploadProofOfPayment = async (file: File, paymentId: string): Promise<string | null> => {
    try {
      setUploadingProof(true);
      console.log('[PaymentForm] 📤 Starting proof of payment upload...');
      console.log('[PaymentForm] File details:', { name: file.name, type: file.type, size: file.size });
      console.log('[PaymentForm] Payment ID:', paymentId);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        console.error('[PaymentForm] ❌ No authentication session');
        throw new Error('Authentication required');
      }

      // Create unique filename
      const timestamp = Date.now();
      const fileExtension = file.name.split('.').pop();
      const fileName = `payment_proof_${paymentId}_${timestamp}.${fileExtension}`;
      console.log('[PaymentForm] Generated filename:', fileName);
      
      // Upload to Supabase Storage
      console.log('[PaymentForm] Attempting upload to bucket: payment-proofs');
      const { data, error } = await supabase.storage
        .from('payment-proofs')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('[PaymentForm] ❌ Storage upload error:', error);
        console.error('[PaymentForm] Error details:', JSON.stringify(error, null, 2));
        
        // Check if bucket doesn't exist
        if (error.message?.includes('not found') || error.message?.includes('Bucket')) {
          toast.error('Storage bucket not configured. Please contact administrator.');
          console.error('[PaymentForm] 🚨 BUCKET NOT FOUND! Create "payment-proofs" bucket in Supabase Dashboard → Storage');
        } else {
          toast.error(`Upload failed: ${error.message}`);
        }
        throw error;
      }

      console.log('[PaymentForm] ✅ Upload successful:', data);
      console.log('[PaymentForm] File path:', data.path);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('payment-proofs')
        .getPublicUrl(fileName);

      console.log('[PaymentForm] ✅ Public URL generated:', publicUrl);
      return publicUrl;
    } catch (error: any) {
      console.error('[PaymentForm] ❌ Error uploading proof:', error);
      console.error('[PaymentForm] Full error object:', JSON.stringify(error, null, 2));
      
      if (!error.message?.includes('not found')) {
        toast.error('Failed to upload proof of payment. Payment still saved.');
      }
      return null;
    } finally {
      setUploadingProof(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.student_id || !formData.amount || !formData.payment_date) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      setLoading(true);
      
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session?.access_token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const url = existingPayment
        ? `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/${existingPayment.id}`
        : `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments`;

      const method = existingPayment ? 'PUT' : 'POST';

      // Prepare payload with part_payment_number and student_type from clearanceInfo
      // Fee items are automatically determined from student assignment in the backend
      // WHITELIST ONLY VALID PAYMENT TABLE COLUMNS
      
      // 🔍 DEBUG: Check clearanceInfo before creating payload
      console.log('[PaymentForm] 🔍 clearanceInfo before submit:', clearanceInfo);
      console.log('[PaymentForm] 🔍 required_amount value:', clearanceInfo?.required_amount);
      console.log('[PaymentForm] 🔍 formData.amount value:', formData.amount);
      
      const payload = {
        student_id: formData.student_id,
        student_type: clearanceInfo?.student_type || formData.student_type || null,
        session: formData.session, // Backend maps to academic_year
        academic_year: formData.session,
        term: formData.term,
        amount: clearanceInfo?.required_amount || 0, // ✅ REQUIRED AMOUNT from fee calculation
        amount_paid: formData.amount, // ✅ ACTUAL PAYMENT entered by Finance Admin
        payment_date: formData.payment_date,
        payment_method: formData.payment_method,
        reference_number: formData.reference_number,
        receipt_number: formData.reference_number,
        description: formData.description,
        notes: formData.description,
        part_payment_number: clearanceInfo?.next_part_payment_number || 1,
        proof_of_payment_url: formData.proof_of_payment_url || null,
      };

      console.log('[PaymentForm] Submitting payment:', payload);
      console.log('[PaymentForm] 🔥 PAYLOAD.AMOUNT:', payload.amount);
      console.log('[PaymentForm] 🔥 PAYLOAD.AMOUNT_PAID:', payload.amount_paid);

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      console.log('[PaymentForm] Response status:', response.status);
      console.log('[PaymentForm] Response ok:', response.ok);
      
      const data = await response.json();
      console.log('[PaymentForm] Payment response:', JSON.stringify(data, null, 2));
      console.log('[PaymentForm] data.success value:', data.success);
      console.log('[PaymentForm] data.success type:', typeof data.success);

      if (data.success === true || data.success === 'true') {
        console.log('[PaymentForm] ✅ Payment created successfully');
        console.log('[PaymentForm] Payment ID:', data.payment?.id);
        
        // Upload proof of payment if file is selected
        if (proofFile && data.payment?.id) {
          console.log('[PaymentForm] 📎 Proof file attached, starting upload process...');
          const proofUrl = await uploadProofOfPayment(proofFile, data.payment.id);
          
          if (proofUrl) {
            console.log('[PaymentForm] 🔄 Updating payment record with proof URL...');
            // Update payment with proof URL
            try {
              const updateResponse = await fetch(
                `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/finance/payments/${data.payment.id}`,
                {
                  method: 'PUT',
                  headers: {
                    'Authorization': `Bearer ${session.access_token}`,
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify({
                    ...payload,
                    proof_of_payment_url: proofUrl,
                  }),
                }
              );
              
              console.log('[PaymentForm] Update response status:', updateResponse.status);
              const updateData = await updateResponse.json();
              console.log('[PaymentForm] Update response data:', updateData);
              
              if (updateData.success) {
                console.log('[PaymentForm] ✅ Proof URL updated successfully in database');
                toast.success('Payment saved with proof of payment');
              } else {
                console.error('[PaymentForm] ❌ Failed to update proof URL:', updateData.error);
                toast.warning('Payment saved, but proof URL update failed');
              }
            } catch (updateError) {
              console.error('[PaymentForm] ❌ Error updating proof URL:', updateError);
              toast.warning('Payment saved, but proof attachment may have failed');
            }
          } else {
            console.warn('[PaymentForm] ⚠️ Proof upload returned null, skipping database update');
          }
        } else if (proofFile && !data.payment?.id) {
          console.error('[PaymentForm] ❌ No payment ID returned, cannot upload proof');
        }
        
        const message = existingPayment 
          ? 'Payment updated successfully' 
          : (data.message || 'Payment entry created successfully');
        console.log('[PaymentForm] Showing success message:', message);
        
        // Only show generic success if we didn't already show a specific one
        if (!proofFile || !data.payment?.id) {
          toast.success(message);
        }
        
        onSuccess?.();
      } else {
        console.log('[PaymentForm] ❌ Payment creation FAILED');
        const errorMsg = data.error || 'Failed to save payment';
        console.error('[PaymentForm] Error message:', errorMsg);
        toast.error(errorMsg);
      }
    } catch (error) {
      console.error('Error saving payment:', error);
      toast.error('An error occurred while saving payment');
    } finally {
      setLoading(false);
    }
  };

  // Note: Fee items are now fetched and displayed from clearanceInfo.fee_items
  // No manual selection or calculation needed - backend handles it all

  return (
    <Card>
      <CardHeader>
        <CardTitle>{existingPayment ? 'Edit Payment' : 'New Payment Entry'}</CardTitle>
        <CardDescription>
          {existingPayment ? 'Update payment information' : 'Enter payment details manually'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Student Type Selection - FIRST */}
          <div className="space-y-2">
            <Label htmlFor="student_type">Student Type *</Label>
            <Select
              value={formData.student_type}
              onValueChange={(value) => {
                setFormData({ ...formData, student_type: value, student_id: '' }); // Reset student when type changes
                setClearanceInfo(null); // Reset clearance info
              }}
              disabled={!!existingPayment}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select student type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Day">
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="bg-blue-100 text-blue-700 border-blue-300">
                      Day
                    </Badge>
                    <span className="text-slate-600">Day Students</span>
                  </div>
                </SelectItem>
                <SelectItem value="Boarding">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="bg-purple-100 text-purple-700 border-purple-300">
                      Boarding
                    </Badge>
                    <span className="text-slate-600">Boarding Students</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {formData.student_type && (
              <div className="flex items-center gap-2 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                <Info className="h-4 w-4 text-blue-600" />
                <span className="text-sm text-slate-600">
                  Students list will show only {formData.student_type} students
                </span>
              </div>
            )}
          </div>

          {/* Student Selection */}
          <div className="space-y-2">
            <Label htmlFor="student">Student *</Label>
            <Select
              value={formData.student_id}
              onValueChange={(value) => setFormData({ ...formData, student_id: value })}
              disabled={studentsLoading || !!existingPayment || !formData.student_type}
            >
              <SelectTrigger>
                <SelectValue 
                  placeholder={
                    !formData.student_type 
                      ? "Please select student type first" 
                      : studentsLoading 
                        ? "Loading students..." 
                        : "Select student"
                  } 
                />
              </SelectTrigger>
              <SelectContent>
                {students
                  .filter(student => student.student_type === formData.student_type)
                  .map((student) => (
                    <SelectItem key={student.id} value={student.id}>
                      <div className="flex items-center gap-2">
                        <span>{student.first_name} {student.last_name}</span>
                        {student.class_name && (
                          <span className="text-slate-500">- {student.class_name}</span>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                {students.filter(student => student.student_type === formData.student_type).length === 0 && formData.student_type && (
                  <div className="p-2 text-sm text-slate-500 text-center">
                    No {formData.student_type} students found
                  </div>
                )}
              </SelectContent>
            </Select>
            {/* Display selected student info below dropdown */}
            {formData.student_id && (() => {
              const selectedStudent = students.find(s => s.id === formData.student_id);
              if (selectedStudent) {
                return (
                  <div className="flex items-center gap-3 mt-2 p-3 bg-slate-50 rounded-md border border-slate-200">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-slate-700">Student Type:</span>
                      <Badge 
                        variant={selectedStudent.student_type === 'Boarding' ? 'secondary' : 'default'} 
                        className={
                          selectedStudent.student_type === 'Boarding' 
                            ? 'bg-purple-100 text-purple-700 border-purple-300' 
                            : 'bg-blue-100 text-blue-700 border-blue-300'
                        }
                      >
                        {selectedStudent.student_type}
                      </Badge>
                    </div>
                    {selectedStudent.class_name && (
                      <>
                        <span className="text-slate-400">•</span>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-slate-700">Class:</span>
                          <span className="text-sm text-slate-600">{selectedStudent.class_name}</span>
                        </div>
                      </>
                    )}
                  </div>
                );
              }
              return null;
            })()}
          </div>

          {/* Clearance Information Card */}
          {formData.student_id && formData.session && formData.term && (
            <Alert className={clearanceInfo?.is_cleared ? 'border-green-500 bg-green-50' : 'border-blue-500 bg-blue-50'}>
              <Info className="h-4 w-4" />
              <AlertDescription>
                {loadingClearance ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    <span>Loading clearance info...</span>
                  </div>
                ) : clearanceInfo ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">Student Type:</span>
                      <Badge variant={clearanceInfo.student_type === 'Day' ? 'default' : 'secondary'}>
                        {clearanceInfo.student_type}
                      </Badge>
                      <span className="mx-2">•</span>
                      <span className="font-medium">Next Payment:</span>
                      <Badge variant="outline">Part {clearanceInfo.next_part_payment_number}</Badge>
                      {clearanceInfo.discount_percentage && clearanceInfo.discount_percentage > 0 && (
                        <>
                          <span className="mx-2">•</span>
                          <span className="font-medium">Discount:</span>
                          <Badge className="bg-green-500">{clearanceInfo.discount_percentage}%</Badge>
                        </>
                      )}
                    </div>
                    {clearanceInfo.discount_percentage && clearanceInfo.discount_percentage > 0 && (
                      <Alert className="border-green-500 bg-green-50 mt-2">
                        <Info className="h-4 w-4 text-green-600" />
                        <AlertDescription className="text-green-900 text-sm">
                          <strong>Discount Applied:</strong> {clearanceInfo.discount_percentage}% discount - {clearanceInfo.discount_reason || 'No reason provided'}
                        </AlertDescription>
                      </Alert>
                    )}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-sm mt-2">
                      <div>
                        <span className="text-muted-foreground">Required:</span>
                        <p className="font-semibold">{formatCurrency(clearanceInfo.required_amount)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Total Paid:</span>
                        <p className="font-semibold text-green-600">{formatCurrency(clearanceInfo.total_paid)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Outstanding:</span>
                        <p className="font-semibold text-red-600">{formatCurrency(clearanceInfo.outstanding_balance)}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Status:</span>
                        <p>
                          {clearanceInfo.is_cleared ? (
                            <Badge className="bg-green-500">Cleared</Badge>
                          ) : (
                            <Badge variant="destructive">Not Cleared</Badge>
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-amber-700">
                    <AlertCircle className="h-4 w-4" />
                    <span>No fee structure configured for this student type and term. Payment will still be recorded.</span>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}

          {/* Academic Year and Term */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="session">Academic Year *</Label>
              <div className="space-y-2">
                <Select
                  value={formData.session}
                  onValueChange={(value) => setFormData({ ...formData, session: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select year" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableSessions.length > 0 ? (
                      availableSessions.map((session) => (
                        <SelectItem key={session} value={session}>
                          <div className="flex items-center gap-2">
                            <span>{session}</span>
                            {session === activeSession && (
                              <Badge variant="default" className="text-xs">Active</Badge>
                            )}
                          </div>
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
                    Currently active session
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
                      <div className="flex items-center gap-2">
                        <span>First Term</span>
                        {activeTerm === 'First Term' && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="Second Term">
                      <div className="flex items-center gap-2">
                        <span>Second Term</span>
                        {activeTerm === 'Second Term' && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                    </SelectItem>
                    <SelectItem value="Third Term">
                      <div className="flex items-center gap-2">
                        <span>Third Term</span>
                        {activeTerm === 'Third Term' && (
                          <Badge variant="default" className="text-xs">Active</Badge>
                        )}
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
                {activeTerm && formData.term === activeTerm && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <CheckCircle className="h-3 w-3" />
                    Currently active term
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Assigned Fee Items (Read-Only) */}
          {clearanceInfo && clearanceInfo.fee_items && clearanceInfo.fee_items.length > 0 && (
            <div className="space-y-2">
              <Label>Assigned Fee Items</Label>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md space-y-2">
                {clearanceInfo.fee_items.map(item => (
                  <div key={item.id} className="flex justify-between items-center text-sm">
                    <span className="font-medium">{item.item_name}</span>
                    <span className="text-slate-600">{formatCurrency(item.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Amount and Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="amount">Amount Paid (₦) *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                min="0"
                placeholder="0.00"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="payment_date">Payment Date *</Label>
              <Input
                id="payment_date"
                type="date"
                value={formData.payment_date}
                onChange={(e) => setFormData({ ...formData, payment_date: e.target.value })}
                required
              />
            </div>
          </div>



          {/* Payment Method and Receipt */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_method">Payment Method *</Label>
              <Select
                value={formData.payment_method}
                onValueChange={(value) => setFormData({ ...formData, payment_method: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select method" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Cash">Cash</SelectItem>
                  <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                  <SelectItem value="Cheque">Cheque</SelectItem>
                  <SelectItem value="POS">POS/Card</SelectItem>
                  <SelectItem value="Mobile Money">Mobile Money</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="reference_number">Receipt Number</Label>
              <Input
                id="reference_number"
                type="text"
                placeholder="Optional"
                value={formData.reference_number}
                onChange={(e) => setFormData({ ...formData, reference_number: e.target.value })}
              />
            </div>
          </div>

          {/* Proof of Payment Upload */}
          <div className="space-y-2">
            <Label htmlFor="proof_file">Proof of Payment (Optional)</Label>
            <div className="space-y-1">
              <Input
                id="proof_file"
                type="file"
                accept=".png,.jpg,.jpeg"
                onChange={handleFileChange}
                disabled={uploadingProof}
              />
              <p className="text-xs text-muted-foreground">
                Upload PNG or JPEG image (max 5MB) as proof of payment
              </p>
              {proofFile && (
                <p className="text-xs text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" />
                  {proofFile.name} selected
                </p>
              )}
              {formData.proof_of_payment_url && !proofFile && (
                <p className="text-xs text-blue-600">
                  Existing proof attached
                </p>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="description">Notes</Label>
            <Textarea
              id="description"
              placeholder="Additional notes (optional)"
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2 justify-end pt-4">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                <X className="h-4 w-4 mr-2" />
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={loading || uploadingProof}>
              {loading || uploadingProof ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  {uploadingProof ? 'Uploading proof...' : 'Saving...'}
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {existingPayment ? 'Update Payment' : 'Save Payment'}
                </>
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}