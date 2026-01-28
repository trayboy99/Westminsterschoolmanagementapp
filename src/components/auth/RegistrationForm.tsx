import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Textarea } from '../ui/textarea';
import { AlertCircle, CheckCircle, User, GraduationCap, Shield } from 'lucide-react';
import { Alert, AlertDescription } from '../ui/alert';
import { projectId, publicAnonKey } from '../../utils/supabase/info';

interface RegistrationFormProps {
  role: 'student' | 'teacher' | 'admin';
  onSubmit?: (data: any) => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  first_name: string;
  middle_name: string;
  last_name: string;
  role: string;
  additional_info: any;
}

export function RegistrationForm({ role, onSubmit }: RegistrationFormProps) {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    first_name: '',
    middle_name: '',
    last_name: '',
    role: role,
    additional_info: {}
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: 'success' | 'error' | null;
    message: string;
  }>({ type: null, message: '' });
  const [classes, setClasses] = useState<any[]>([]);
  const [loadingClasses, setLoadingClasses] = useState(false);

  // Fetch classes for student registration
  useEffect(() => {
    if (role === 'student') {
      fetchClasses();
    }
  }, [role]);

  const fetchClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes`,
        {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${publicAnonKey}`
          }
        }
      );
      
      const result = await response.json();
      
      if (result.success && result.classes) {
        setClasses(result.classes);
      } else {
        console.error('Failed to fetch classes:', result);
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
    } finally {
      setLoadingClasses(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAdditionalInfoChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additional_info: {
        ...prev.additional_info,
        [field]: value
      }
    }));
  };

  const validateForm = () => {
    if (!formData.email || !formData.password || !formData.first_name || !formData.last_name) {
      return 'Please fill in all required fields';
    }

    if (formData.password !== formData.confirmPassword) {
      return 'Passwords do not match';
    }

    if (formData.password.length < 6) {
      return 'Password must be at least 6 characters long';
    }

    if (!formData.email.includes('@')) {
      return 'Please enter a valid email address';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setSubmitStatus({ type: 'error', message: validationError });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: null, message: '' });

    try {
      const response = await fetch(`https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/submit-registration`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${publicAnonKey}`
        },
        body: JSON.stringify(formData)
      });

      const result = await response.json();

      if (result.success) {
        setSubmitStatus({
          type: 'success',
          message: result.message
        });
        
        // Reset form on success
        setFormData({
          email: '',
          password: '',
          confirmPassword: '',
          first_name: '',
          middle_name: '',
          last_name: '',
          role: role,
          additional_info: {}
        });

        if (onSubmit) {
          onSubmit(result);
        }
      } else {
        setSubmitStatus({
          type: 'error',
          message: result.error || 'Registration failed'
        });
      }
    } catch (error) {
      console.error('Registration error:', error);
      setSubmitStatus({
        type: 'error',
        message: 'Network error. Please try again.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getRoleIcon = () => {
    switch (role) {
      case 'student': return <GraduationCap className="h-6 w-6" />;
      case 'teacher': return <User className="h-6 w-6" />;
      case 'admin': return <Shield className="h-6 w-6" />;
      default: return <User className="h-6 w-6" />;
    }
  };

  const getRoleTitle = () => {
    switch (role) {
      case 'student': return 'Student Registration';
      case 'teacher': return 'Teacher Registration';
      case 'admin': return 'Admin Registration';
      default: return 'Registration';
    }
  };

  const getRoleDescription = () => {
    switch (role) {
      case 'student': return 'Apply to join our school as a student. Your application will be reviewed by school administration.';
      case 'teacher': return 'Apply to join our teaching staff. Your application will be reviewed by school administration.';
      case 'admin': return 'Apply for an administrative position. Your application will be reviewed by senior administration.';
      default: return 'Complete your registration application.';
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <div className="flex justify-center mb-2">
          {getRoleIcon()}
        </div>
        <CardTitle>{getRoleTitle()}</CardTitle>
        <CardDescription>
          {getRoleDescription()}
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Basic Information */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="first_name">First Name *</Label>
              <Input
                id="first_name"
                type="text"
                value={formData.first_name}
                onChange={(e) => handleInputChange('first_name', e.target.value)}
                required
              />
            </div>
            <div>
              <Label htmlFor="last_name">Last Name *</Label>
              <Input
                id="last_name"
                type="text"
                value={formData.last_name}
                onChange={(e) => handleInputChange('last_name', e.target.value)}
                required
              />
            </div>
          </div>

          <div>
            <Label htmlFor="middle_name">Middle Name</Label>
            <Input
              id="middle_name"
              type="text"
              value={formData.middle_name}
              onChange={(e) => handleInputChange('middle_name', e.target.value)}
            />
          </div>

          <div>
            <Label htmlFor="email">Email Address *</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleInputChange('email', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="password">Password *</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => handleInputChange('password', e.target.value)}
              required
            />
          </div>

          <div>
            <Label htmlFor="confirmPassword">Confirm Password *</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
              required
            />
          </div>

          {/* Role-specific fields */}
          {role === 'student' && (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="gender">Gender *</Label>
                  <Select 
                    value={formData.additional_info.gender || ''} 
                    onValueChange={(value) => handleAdditionalInfoChange('gender', value)}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Male">Male</SelectItem>
                      <SelectItem value="Female">Female</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="date_of_birth">Date of Birth *</Label>
                  <Input
                    id="date_of_birth"
                    type="date"
                    value={formData.additional_info.date_of_birth || ''}
                    onChange={(e) => handleAdditionalInfoChange('date_of_birth', e.target.value)}
                    required
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="phone">Student Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.additional_info.phone || ''}
                  onChange={(e) => handleAdditionalInfoChange('phone', e.target.value)}
                  placeholder="Optional"
                />
              </div>

              <div>
                <Label htmlFor="class_id">Class *</Label>
                <Select 
                  value={formData.additional_info.class_id || ''} 
                  onValueChange={(value) => handleAdditionalInfoChange('class_id', value)}
                  disabled={loadingClasses}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={loadingClasses ? "Loading classes..." : "Select your class"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.length === 0 ? (
                      <SelectItem value="none" disabled>No classes available</SelectItem>
                    ) : (
                      classes.map((classItem: any) => (
                        <SelectItem key={classItem.id} value={classItem.id}>
                          {classItem.display_name || classItem.name}
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
                {classes.length === 0 && !loadingClasses && (
                  <p className="text-sm text-slate-500 mt-1">
                    No classes configured yet. Contact school administration.
                  </p>
                )}
              </div>
              <div>
                <Label htmlFor="parent_phone">Parent/Guardian Phone</Label>
                <Input
                  id="parent_phone"
                  type="tel"
                  value={formData.additional_info.parent_phone || ''}
                  onChange={(e) => handleAdditionalInfoChange('parent_phone', e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="previous_school">Previous School</Label>
                <Input
                  id="previous_school"
                  type="text"
                  value={formData.additional_info.previous_school || ''}
                  onChange={(e) => handleAdditionalInfoChange('previous_school', e.target.value)}
                />
              </div>
            </>
          )}

          {role === 'teacher' && (
            <>
              <div>
                <Label htmlFor="phone">Phone Number</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.additional_info.phone || ''}
                  onChange={(e) => handleAdditionalInfoChange('phone', e.target.value)}
                  placeholder="Your contact number"
                />
              </div>

              <div>
                <Label htmlFor="is_part_time">Employment Type *</Label>
                <Select
                  value={formData.additional_info.is_part_time || ''}
                  onValueChange={(value) => handleAdditionalInfoChange('is_part_time', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select employment type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="false">Full-time Teacher</SelectItem>
                    <SelectItem value="true">Part-time Teacher</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="qualifications">Qualifications</Label>
                <Textarea
                  id="qualifications"
                  value={formData.additional_info.qualifications || ''}
                  onChange={(e) => handleAdditionalInfoChange('qualifications', e.target.value)}
                  placeholder="Describe your educational qualifications and certifications"
                />
              </div>
              <div>
                <Label htmlFor="subjects">Subject Specializations</Label>
                <Input
                  id="subjects"
                  type="text"
                  value={formData.additional_info.subjects || ''}
                  onChange={(e) => handleAdditionalInfoChange('subjects', e.target.value)}
                  placeholder="e.g., Mathematics, Science, English"
                />
              </div>
              <div>
                <Label htmlFor="experience">Years of Experience</Label>
                <Select
                  value={formData.additional_info.experience || ''}
                  onValueChange={(value) => handleAdditionalInfoChange('experience', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select experience" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0-1">0-1 years</SelectItem>
                    <SelectItem value="2-5">2-5 years</SelectItem>
                    <SelectItem value="6-10">6-10 years</SelectItem>
                    <SelectItem value="11-15">11-15 years</SelectItem>
                    <SelectItem value="15+">15+ years</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </>
          )}

          {role === 'admin' && (
            <>
              <div>
                <Label htmlFor="admin_role">Desired Admin Role *</Label>
                <Select
                  value={formData.additional_info.admin_role || ''}
                  onValueChange={(value) => handleAdditionalInfoChange('admin_role', value)}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select admin role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="principal">Principal</SelectItem>
                    <SelectItem value="super_admin">Super Admin</SelectItem>
                    <SelectItem value="director">Director</SelectItem>
                    <SelectItem value="secretary">Secretary</SelectItem>
                    <SelectItem value="transport_manager">Transport Manager</SelectItem>
                    <SelectItem value="it_admin">IT Administrator</SelectItem>
                    <SelectItem value="finance_admin">Finance Administrator</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="admin_experience">Administrative Experience</Label>
                <Textarea
                  id="admin_experience"
                  value={formData.additional_info.admin_experience || ''}
                  onChange={(e) => handleAdditionalInfoChange('admin_experience', e.target.value)}
                  placeholder="Describe your administrative experience and qualifications"
                />
              </div>
            </>
          )}

          {/* Status Messages */}
          {submitStatus.type && (
            <Alert className={submitStatus.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
              {submitStatus.type === 'error' ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription className={submitStatus.type === 'error' ? 'text-red-800' : 'text-green-800'}>
                {submitStatus.message}
              </AlertDescription>
            </Alert>
          )}

          <Button 
            type="submit" 
            className="w-full" 
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting Application...' : 'Submit Application'}
          </Button>

          <div className="text-center text-sm text-muted-foreground">
            <p>Already have an account? <a href="#login" className="text-primary hover:underline">Sign in here</a></p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}