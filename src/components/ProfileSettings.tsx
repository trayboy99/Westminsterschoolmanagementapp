import { useState, useEffect, useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { Card, CardContent } from './ui/card';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Badge } from './ui/badge';
import { Alert, AlertDescription } from './ui/alert';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Upload, 
  Loader2, 
  Camera,
  FileText,
  PenTool,
  CheckCircle,
  AlertTriangle,
  CreditCard
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

interface ProfileData {
  first_name: string;
  middle_name: string;
  surname: string;
  email: string;
  phone: string;
  address: string;
  account_details: string;
  photo_url?: string;
  signature_url?: string;
  cv_url?: string;
}

interface ProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate?: () => void;
}

export function ProfileSettings({ open, onOpenChange, onProfileUpdate }: ProfileSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const [uploadingCV, setUploadingCV] = useState(false);
  
  const [profile, setProfile] = useState<ProfileData>({
    first_name: '',
    middle_name: '',
    surname: '',
    email: '',
    phone: '',
    address: '',
    account_details: '',
  });

  const [userRole, setUserRole] = useState('');
  
  const photoInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);
  const cvInputRef = useRef<HTMLInputElement>(null);
  
  const supabase = createClient();

  useEffect(() => {
    if (open) {
      fetchProfile();
    }
  }, [open]);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to view your profile');
        return;
      }

      // Fetch user data from database (auth metadata and profiles table)
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('User not found');
        return;
      }

      // Get role and basic info from metadata or profiles
      const metadata = user.user_metadata;
      const email = user.email || '';
      
      // Fetch from profiles table to get role and name
      const { data: profileData } = await supabase
        .from('profiles')
        .select('role, first_name, last_name, middle_name')
        .eq('id', user.id)
        .single();

      setUserRole(profileData?.role || metadata?.role || '');

      // Fetch extended profile from KV store (includes photo_url and other extended data)
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-profile`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await res.json();
      
      if (data.success && data.profile) {
        // Merge profiles table data with KV store data (profiles table takes precedence for names)
        setProfile({
          ...data.profile,
          first_name: profileData?.first_name || data.profile.first_name || '',
          middle_name: profileData?.middle_name || data.profile.middle_name || '',
          surname: profileData?.last_name || data.profile.surname || '',
          email: email,
        });
      } else {
        // Pre-fill with available data from database
        setProfile({
          first_name: profileData?.first_name || metadata?.first_name || '',
          middle_name: profileData?.middle_name || metadata?.middle_name || '',
          surname: profileData?.last_name || metadata?.last_name || '',
          email: email,
          phone: metadata?.phone || '',
          address: metadata?.address || '',
          account_details: metadata?.account_details || '',
        });
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to save your profile');
        return;
      }

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(profile)
        }
      );

      const data = await res.json();
      
      if (data.success) {
        toast.success('Profile updated successfully');
        // Notify parent component to refresh profile data
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      } else {
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (
    file: File, 
    type: 'photo' | 'signature' | 'cv'
  ) => {
    try {
      const setUploading = type === 'photo' ? setUploadingPhoto : 
                          type === 'signature' ? setUploadingSignature : 
                          setUploadingCV;
      
      setUploading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upload files');
        return;
      }

      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Validate file
      const maxSize = type === 'cv' ? 5 * 1024 * 1024 : 2 * 1024 * 1024; // 5MB for CV, 2MB for others
      if (file.size > maxSize) {
        toast.error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        return;
      }

      const allowedTypes: Record<string, string[]> = {
        photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        signature: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        cv: ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
      };

      if (!allowedTypes[type].includes(file.type)) {
        toast.error(`Invalid file type for ${type}`);
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profile/upload`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`
          },
          body: formData
        }
      );

      const data = await res.json();
      
      if (data.success && data.url) {
        setProfile(prev => ({
          ...prev,
          [`${type}_url`]: data.url
        }));
        toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} uploaded successfully`);
        
        // If photo was uploaded, notify parent to refresh
        if (type === 'photo' && onProfileUpdate) {
          onProfileUpdate();
        }
      } else {
        toast.error(data.error || 'Failed to upload file');
      }
    } catch (error) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
    } finally {
      const setUploading = type === 'photo' ? setUploadingPhoto : 
                          type === 'signature' ? setUploadingSignature : 
                          setUploadingCV;
      setUploading(false);
    }
  };

  const getInitials = () => {
    const first = profile.first_name?.[0] || '';
    const last = profile.surname?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role.toLowerCase()) {
      case 'principal':
      case 'it_admin':
        return 'bg-purple-100 text-purple-800';
      case 'teacher':
        return 'bg-blue-100 text-blue-800';
      case 'student':
        return 'bg-green-100 text-green-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            My Profile
          </DialogTitle>
          <DialogDescription>
            Manage your personal information and uploads
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Profile Photo Section */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex flex-col sm:flex-row items-center gap-4">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={profile.photo_url} alt="Profile" />
                    <AvatarFallback className="text-2xl">{getInitials()}</AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                      <h3 className="text-lg font-semibold">
                        {profile.first_name} {profile.middle_name} {profile.surname}
                      </h3>
                      {userRole && (
                        <Badge className={getRoleBadgeColor(userRole)}>
                          {userRole.replace('_', ' ').toUpperCase()}
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground mb-3">{profile.email}</p>
                    
                    <input
                      ref={photoInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'photo');
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => photoInputRef.current?.click()}
                      disabled={uploadingPhoto}
                    >
                      {uploadingPhoto ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4 mr-2" />
                      )}
                      {profile.photo_url ? 'Change Photo' : 'Upload Photo'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Personal Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <User className="h-4 w-4" />
                Personal Information
              </h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="first_name">
                    First Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="first_name"
                    value={profile.first_name}
                    onChange={(e) => setProfile({ ...profile, first_name: e.target.value })}
                    placeholder="Enter first name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="middle_name">Middle Name</Label>
                  <Input
                    id="middle_name"
                    value={profile.middle_name}
                    onChange={(e) => setProfile({ ...profile, middle_name: e.target.value })}
                    placeholder="Enter middle name (optional)"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="surname">
                    Surname <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="surname"
                    value={profile.surname}
                    onChange={(e) => setProfile({ ...profile, surname: e.target.value })}
                    placeholder="Enter surname"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    Email <span className="text-red-500">*</span>
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="email"
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                      placeholder="email@example.com"
                      className="pl-10"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Updating email will change your login credentials.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="+234-XXX-XXX-XXXX"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="address">Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Enter your full address"
                    className="pl-10 min-h-[80px]"
                  />
                </div>
              </div>

              {/* Account Details - Only for Teachers */}
              {userRole === 'teacher' && (
                <div className="space-y-2">
                  <Label htmlFor="account_details">
                    Bank Account Details
                  </Label>
                  <div className="relative">
                    <CreditCard className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Textarea
                      id="account_details"
                      value={profile.account_details}
                      onChange={(e) => setProfile({ ...profile, account_details: e.target.value })}
                      placeholder="Account Number: 1234567890&#10;Bank Name: Example Bank&#10;Account Name: John Doe"
                      className="pl-10 min-h-[100px]"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Enter your account number, bank name, and account name (one per line)
                  </p>
                </div>
              )}
            </div>

            {/* File Uploads */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Documents
              </h3>

              {/* Signature Upload */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <PenTool className="h-5 w-5 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Signature</h4>
                        <p className="text-sm text-muted-foreground">
                          Upload your signature image (JPG, PNG - Max 2MB)
                        </p>
                        {profile.signature_url && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">Uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <input
                      ref={signatureInputRef}
                      type="file"
                      accept="image/jpeg,image/jpg,image/png,image/webp"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'signature');
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => signatureInputRef.current?.click()}
                      disabled={uploadingSignature}
                    >
                      {uploadingSignature ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {profile.signature_url ? 'Change' : 'Upload'}
                        </>
                      )}
                    </Button>
                  </div>
                  
                  {profile.signature_url && (
                    <div className="mt-3 p-3 bg-slate-50 rounded border">
                      <img 
                        src={profile.signature_url} 
                        alt="Signature" 
                        className="max-h-20 object-contain"
                      />
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* CV Upload */}
              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-purple-50 rounded-lg">
                        <FileText className="h-5 w-5 text-purple-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Curriculum Vitae (CV)</h4>
                        <p className="text-sm text-muted-foreground">
                          Upload your CV document (PDF, DOC - Max 5MB)
                        </p>
                        {profile.cv_url && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">Uploaded</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <input
                      ref={cvInputRef}
                      type="file"
                      accept=".pdf,.doc,.docx"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'cv');
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => cvInputRef.current?.click()}
                      disabled={uploadingCV}
                    >
                      {uploadingCV ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {profile.cv_url ? 'Change' : 'Upload'}
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Info Alert */}
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription className="text-xs">
                Your profile information is stored securely and will be used for official school records and documentation.
              </AlertDescription>
            </Alert>

            {/* Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || !profile.first_name || !profile.surname}
              >
                {saving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Save Profile
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}