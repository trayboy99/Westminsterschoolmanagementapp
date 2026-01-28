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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import { 
  User, 
  Mail, 
  Phone, 
  MapPin, 
  Upload, 
  Loader2, 
  Camera,
  FileText,
  CheckCircle,
  AlertTriangle,
  Users,
  MapPinned,
  Heart
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { createClient } from '../utils/supabase/client';
import { projectId, publicAnonKey } from '../utils/supabase/info';

// Nigerian States
const NIGERIAN_STATES = [
  'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue',
  'Borno', 'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu',
  'FCT', 'Gombe', 'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi',
  'Kogi', 'Kwara', 'Lagos', 'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun',
  'Oyo', 'Plateau', 'Rivers', 'Sokoto', 'Taraba', 'Yobe', 'Zamfara'
];

interface StudentProfileData {
  first_name: string;
  middle_name: string;
  last_name: string;
  email: string;
  gender: string;
  phone: string;
  address: string;
  parent_name: string;
  parent_phone: string;
  state_of_origin: string;
  lga: string;
  photo_url?: string;
  health_report_url?: string;
}

interface StudentProfileSettingsProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProfileUpdate?: () => void;
  studentId: string;
}

export function StudentProfileSettings({ 
  open, 
  onOpenChange, 
  onProfileUpdate,
  studentId 
}: StudentProfileSettingsProps) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadingHealthReport, setUploadingHealthReport] = useState(false);
  
  const [profile, setProfile] = useState<StudentProfileData>({
    first_name: '',
    middle_name: '',
    last_name: '',
    email: '',
    gender: '',
    phone: '',
    address: '',
    parent_name: '',
    parent_phone: '',
    state_of_origin: '',
    lga: '',
  });

  const photoInputRef = useRef<HTMLInputElement>(null);
  const healthReportInputRef = useRef<HTMLInputElement>(null);
  
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

      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('User not found');
        return;
      }

      console.log('[StudentProfileSettings] ===== PROFILE FETCH DEBUG =====');
      console.log('[StudentProfileSettings] Prop studentId:', studentId);
      console.log('[StudentProfileSettings] Auth user.id:', user.id);
      console.log('[StudentProfileSettings] Auth user.email:', user.email);
      console.log('[StudentProfileSettings] IDs match?:', studentId === user.id);
      
      // Fetch basic profile data from backend (bypasses RLS)
      console.log('[StudentProfileSettings] Fetching basic profile from backend...');
      
      const basicProfileRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-profile/${studentId}/basic`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      const basicProfileData = await basicProfileRes.json();
      
      console.log('[StudentProfileSettings] Basic profile response:', basicProfileData);
      console.log('[StudentProfileSettings] HTTP status:', basicProfileRes.status);
      
      if (!basicProfileRes.ok || !basicProfileData.success) {
        console.error('[StudentProfileSettings] Failed to fetch basic profile:', basicProfileData.error);
        toast.error(`Failed to load profile: ${basicProfileData.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      
      const profileData = basicProfileData.profile;
      
      if (!profileData) {
        console.error('[StudentProfileSettings] No profile data returned from backend');
        toast.error('Profile not found in database. Please contact administrator.');
        setLoading(false);
        return;
      }
      
      console.log('[StudentProfileSettings] Profile data from backend:', profileData);

      // Get basic fields directly from profiles table
      const email = profileData?.email || user.email || '';
      const firstName = profileData?.first_name || '';
      const middleName = profileData?.middle_name || '';
      const lastName = profileData?.last_name || '';
      
      console.log('[StudentProfileSettings] Column names available:', Object.keys(profileData || {}));
      console.log('[StudentProfileSettings] Raw profileData:', profileData);
      console.log('[StudentProfileSettings] Extracted values:', { 
        firstName, 
        middleName, 
        lastName, 
        email,
        hasFirstName: !!firstName,
        hasLastName: !!lastName
      });
      
      // Warn if name fields are empty (data quality issue)
      if (!firstName || !lastName) {
        console.warn('[StudentProfileSettings] Missing name data in profiles table!');
      }

      // Fetch extended profile from KV store
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-profile/${studentId}`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      const data = await res.json();
      
      console.log('[StudentProfileSettings] KV store response:', data);
      console.log('[StudentProfileSettings] HTTP status:', res.status);
      
      // Handle backend authorization errors
      if (!res.ok) {
        console.error('[StudentProfileSettings] Backend error:', data.error);
        toast.error(`Failed to load profile: ${data.error || 'Unknown error'}`);
        setLoading(false);
        return;
      }
      
      // Create base profile with DB fields (name, email) and empty extended fields
      const baseProfile = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        email: email,
        gender: '',
        phone: '',
        address: '',
        parent_name: '',
        parent_phone: '',
        state_of_origin: '',
        lga: '',
        photo_url: '',
        health_report_url: ''
      };
      
      console.log('[StudentProfileSettings] Base profile from DB:', baseProfile);
      
      // Merge with KV store data (extended fields only)
      if (data.success && data.profile) {
        const mergedProfile = {
          // Always use database values for name and email
          first_name: firstName,
          middle_name: middleName,
          last_name: lastName,
          email: email,
          // Use KV store values for extended fields
          gender: data.profile.gender || '',
          phone: data.profile.phone || '',
          address: data.profile.address || '',
          parent_name: data.profile.parent_name || '',
          parent_phone: data.profile.parent_phone || '',
          state_of_origin: data.profile.state_of_origin || '',
          lga: data.profile.lga || '',
          photo_url: data.profile.photo_url || '',
          health_report_url: data.profile.health_report_url || ''
        };
        console.log('[StudentProfileSettings] Merged profile:', mergedProfile);
        setProfile(mergedProfile);
      } else {
        // Use base profile (no KV data exists yet)
        console.log('[StudentProfileSettings] Using base profile (no KV data)');
        setProfile(baseProfile);
      }
    } catch (error) {
      console.error('Error fetching student profile:', error);
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

      // Save all fields including name and email
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-profile`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            student_id: studentId,  // Use the studentId prop (shortened ID)
            // Include name and email fields
            first_name: profile.first_name,
            middle_name: profile.middle_name,
            last_name: profile.last_name,
            email: profile.email,
            // Extended fields
            gender: profile.gender,
            phone: profile.phone,
            address: profile.address,
            parent_name: profile.parent_name,
            parent_phone: profile.parent_phone,
            state_of_origin: profile.state_of_origin,
            lga: profile.lga,
            photo_url: profile.photo_url,
            health_report_url: profile.health_report_url
          })
        }
      );

      const data = await res.json();
      
      console.log('[StudentProfileSettings] Save response:', data);
      console.log('[StudentProfileSettings] Save HTTP status:', res.status);
      
      if (data.success) {
        toast.success('Profile updated successfully');
        if (onProfileUpdate) {
          onProfileUpdate();
        }
      } else {
        console.error('[StudentProfileSettings] Save error:', data.error);
        toast.error(data.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error saving student profile:', error);
      toast.error('Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (
    file: File, 
    type: 'photo' | 'health_report'
  ) => {
    try {
      const setUploading = type === 'photo' ? setUploadingPhoto : setUploadingHealthReport;
      
      setUploading(true);
      
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to upload files');
        return;
      }

      // Validate file
      const maxSize = type === 'health_report' ? 5 * 1024 * 1024 : 2 * 1024 * 1024;
      if (file.size > maxSize) {
        toast.error(`File too large. Maximum size is ${maxSize / 1024 / 1024}MB`);
        return;
      }

      const allowedTypes: Record<string, string[]> = {
        photo: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
        health_report: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
      };

      if (!allowedTypes[type].includes(file.type)) {
        toast.error(`Invalid file type for ${type}`);
        return;
      }

      // Create FormData
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', type);
      formData.append('student_id', studentId);

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/student-profile/upload`,
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
        toast.success(`${type === 'photo' ? 'Photo' : 'Health report'} uploaded successfully`);
        
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
      const setUploading = type === 'photo' ? setUploadingPhoto : setUploadingHealthReport;
      setUploading(false);
    }
  };

  const getInitials = () => {
    const first = profile.first_name?.[0] || '';
    const last = profile.last_name?.[0] || '';
    return (first + last).toUpperCase() || 'S';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Student Profile
          </DialogTitle>
          <DialogDescription>
            Complete your profile information for school records
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
                    <AvatarFallback className="text-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                      {getInitials()}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="flex-1 text-center sm:text-left">
                    <div className="flex items-center gap-2 justify-center sm:justify-start mb-2">
                      <h3 className="text-lg font-semibold">
                        {profile.first_name} {profile.middle_name} {profile.last_name}
                      </h3>
                      <Badge className="bg-green-100 text-green-800">
                        Student
                      </Badge>
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
                  <Label htmlFor="last_name">
                    Last Name <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="last_name"
                    value={profile.last_name}
                    onChange={(e) => setProfile({ ...profile, last_name: e.target.value })}
                    placeholder="Enter last name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select
                    value={profile.gender}
                    onValueChange={(value) => setProfile({ ...profile, gender: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                    </SelectContent>
                  </Select>
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
                <Label htmlFor="address">Residential Address</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Textarea
                    id="address"
                    value={profile.address}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Enter your full residential address"
                    className="pl-10 min-h-[80px]"
                  />
                </div>
              </div>
            </div>

            {/* Parent/Guardian Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Parent/Guardian Information
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="parent_name">Parent/Guardian Name</Label>
                  <Input
                    id="parent_name"
                    value={profile.parent_name}
                    onChange={(e) => setProfile({ ...profile, parent_name: e.target.value })}
                    placeholder="Enter parent/guardian name"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="parent_phone">Parent/Guardian Phone</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="parent_phone"
                      type="tel"
                      value={profile.parent_phone}
                      onChange={(e) => setProfile({ ...profile, parent_phone: e.target.value })}
                      placeholder="+234-XXX-XXX-XXXX"
                      className="pl-10"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Origin Information */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <MapPinned className="h-4 w-4" />
                State of Origin
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="state_of_origin">State</Label>
                  <Select
                    value={profile.state_of_origin}
                    onValueChange={(value) => setProfile({ ...profile, state_of_origin: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[200px]">
                      {NIGERIAN_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="lga">Local Government Area</Label>
                  <Input
                    id="lga"
                    value={profile.lga}
                    onChange={(e) => setProfile({ ...profile, lga: e.target.value })}
                    placeholder="Enter your LGA"
                  />
                </div>
              </div>
            </div>

            {/* Health Report Upload */}
            <div className="space-y-4">
              <h3 className="font-semibold flex items-center gap-2">
                <Heart className="h-4 w-4" />
                Medical Information
              </h3>

              <Card>
                <CardContent className="pt-6">
                  <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className="p-2 bg-red-50 rounded-lg">
                        <FileText className="h-5 w-5 text-red-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium">Health Report</h4>
                        <p className="text-sm text-muted-foreground">
                          Upload your medical/health report (PDF, JPG, PNG - Max 5MB)
                        </p>
                        {profile.health_report_url && (
                          <div className="flex items-center gap-1 mt-1">
                            <CheckCircle className="h-3 w-3 text-green-600" />
                            <span className="text-xs text-green-600">Uploaded</span>
                            <a 
                              href={profile.health_report_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline ml-2"
                            >
                              View
                            </a>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <input
                      ref={healthReportInputRef}
                      type="file"
                      accept=".pdf,image/jpeg,image/jpg,image/png"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFileUpload(file, 'health_report');
                      }}
                    />
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => healthReportInputRef.current?.click()}
                      disabled={uploadingHealthReport}
                    >
                      {uploadingHealthReport ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <>
                          <Upload className="h-4 w-4 mr-2" />
                          {profile.health_report_url ? 'Change' : 'Upload'}
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
                Your profile information is stored securely and will be used for official school records. 
                Please ensure all information is accurate.
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
                disabled={saving}
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