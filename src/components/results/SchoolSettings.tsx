import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Save, Upload, School, Image, FileImage, Loader2, X, Clock } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';
import { ImageWithFallback } from '../figma/ImageWithFallback';

interface SchoolInfo {
  school_name: string;
  address: string;
  email: string;
  phone_numbers: string;
  website_url: string;
  principal_name: string;
  director_name: string;
  motto: string;
  logo_url?: string;
  stamp_url?: string;
}

export function SchoolSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState<SchoolInfo>({
    school_name: '',
    address: '',
    email: '',
    phone_numbers: '',
    website_url: '',
    principal_name: '',
    director_name: '',
    motto: ''
  });
  
  // Gate timing settings
  const [schoolStartTime, setSchoolStartTime] = useState('08:00');
  const [schoolEndTime, setSchoolEndTime] = useState('15:00');
  const [savingGateSettings, setSavingGateSettings] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const stampInputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();

  useEffect(() => {
    fetchSchoolSettings();
    fetchGateSettings();
  }, []);

  const fetchSchoolSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/school-settings`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success && result.settings) {
        setSchoolInfo(result.settings);
      }
    } catch (error) {
      console.error('[SchoolSettings] Error:', error);
      toast.error('Failed to load school settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/update-school-settings`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify(schoolInfo)
        }
      );
      const result = await res.json();
      
      if (result.success) {
        toast.success('School settings updated successfully!');
        // Trigger a page reload after a short delay to update the sidebar
        setTimeout(() => window.location.reload(), 1500);
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('[SchoolSettings] Save error:', error);
      toast.error('Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingLogo(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'logo');

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-school-asset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );
      const result = await res.json();
      
      if (result.success && result.url) {
        setSchoolInfo({ ...schoolInfo, logo_url: result.url });
        toast.success('Logo uploaded successfully!');
      } else {
        toast.error(result.error || 'Failed to upload logo');
      }
    } catch (error) {
      console.error('[SchoolSettings] Logo upload error:', error);
      toast.error('Failed to upload logo');
    } finally {
      setUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleStampUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please upload an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be less than 5MB');
      return;
    }

    try {
      setUploadingStamp(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', 'stamp');

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/upload-school-asset`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
          },
          body: formData
        }
      );
      const result = await res.json();
      
      if (result.success && result.url) {
        setSchoolInfo({ ...schoolInfo, stamp_url: result.url });
        toast.success('Stamp uploaded successfully!');
      } else {
        toast.error(result.error || 'Failed to upload stamp');
      }
    } catch (error) {
      console.error('[SchoolSettings] Stamp upload error:', error);
      toast.error('Failed to upload stamp');
    } finally {
      setUploadingStamp(false);
      if (stampInputRef.current) stampInputRef.current.value = '';
    }
  };

  const fetchGateSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/gate-settings`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success && result.settings) {
        setSchoolStartTime(result.settings.start_time);
        setSchoolEndTime(result.settings.end_time);
      }
    } catch (error) {
      console.error('[SchoolSettings] Error:', error);
      toast.error('Failed to load gate settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveGateSettings = async () => {
    try {
      setSavingGateSettings(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/update-gate-settings`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({
            start_time: schoolStartTime,
            end_time: schoolEndTime
          })
        }
      );
      const result = await res.json();
      
      if (result.success) {
        toast.success('Gate settings updated successfully! Changes will take effect immediately.');
      } else {
        toast.error(result.error || 'Failed to update settings');
      }
    } catch (error) {
      console.error('[SchoolSettings] Save error:', error);
      toast.error('Failed to update settings');
    } finally {
      setSavingGateSettings(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-64 gap-3">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading school settings...</p>
      </div>
    );
  }

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <School className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>School Information</CardTitle>
              <CardDescription>Configure your school's basic details and branding</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Basic Info */}
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="school_name" className="text-sm">
                  School Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="school_name"
                  value={schoolInfo.school_name}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, school_name: e.target.value })}
                  placeholder="Enter school name"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="principal_name" className="text-sm">
                  Principal's Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="principal_name"
                  value={schoolInfo.principal_name}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, principal_name: e.target.value })}
                  placeholder="Enter principal's full name"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear on report cards under the principal's comment
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address" className="text-sm">
                School Address <span className="text-red-500">*</span>
              </Label>
              <Textarea
                id="address"
                value={schoolInfo.address}
                onChange={(e) => setSchoolInfo({ ...schoolInfo, address: e.target.value })}
                placeholder="Enter complete address"
                rows={3}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm">
                  Email Address <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="email"
                  type="email"
                  value={schoolInfo.email}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, email: e.target.value })}
                  placeholder="school@example.com"
                  className="h-9"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone_numbers" className="text-sm">
                  Phone Numbers <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="phone_numbers"
                  value={schoolInfo.phone_numbers}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, phone_numbers: e.target.value })}
                  placeholder="+234-XXX-XXX-XXXX"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="director_name" className="text-sm">
                  Director's Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="director_name"
                  value={schoolInfo.director_name}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, director_name: e.target.value })}
                  placeholder="Enter director's full name"
                  className="h-9"
                />
                <p className="text-xs text-muted-foreground">
                  This name will appear in the report card footer
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="website_url" className="text-sm">Website URL</Label>
                <Input
                  id="website_url"
                  value={schoolInfo.website_url}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, website_url: e.target.value })}
                  placeholder="https://www.yourschool.com"
                  className="h-9"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div className="space-y-2">
                <Label htmlFor="motto" className="text-sm">School Motto</Label>
                <Input
                  id="motto"
                  value={schoolInfo.motto}
                  onChange={(e) => setSchoolInfo({ ...schoolInfo, motto: e.target.value })}
                  placeholder="Enter school motto"
                  className="h-9"
                />
              </div>
            </div>
          </div>

          {/* Logo & Stamp */}
          <div className="pt-4 border-t">
            <div className="mb-4">
              <h3 className="font-semibold text-sm flex items-center gap-2">
                <Image className="h-4 w-4 text-primary" />
                School Branding
              </h3>
              <p className="text-xs text-muted-foreground mt-1">
                Upload your school logo and official stamp for use in reports and documents
              </p>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
              {/* Logo Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">School Logo</Label>
                {schoolInfo.logo_url ? (
                  <div className="relative border-2 border-dashed rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ImageWithFallback
                      src={schoolInfo.logo_url}
                      alt="School Logo"
                      className="h-32 w-auto mx-auto object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => setSchoolInfo({ ...schoolInfo, logo_url: undefined })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 bg-muted/20 flex flex-col items-center justify-center text-center">
                    <FileImage className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No logo uploaded</p>
                  </div>
                )}
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="w-full gap-2 h-9" 
                  onClick={() => logoInputRef.current?.click()}
                  disabled={uploadingLogo}
                >
                  {uploadingLogo ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {schoolInfo.logo_url ? 'Change Logo' : 'Upload Logo'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: 500x500px PNG with transparent background. Max 5MB
                </p>
              </div>

              {/* Stamp Upload */}
              <div className="space-y-3">
                <Label className="text-sm font-medium">School Stamp</Label>
                {schoolInfo.stamp_url ? (
                  <div className="relative border-2 border-dashed rounded-lg p-4 bg-muted/30 hover:bg-muted/50 transition-colors">
                    <ImageWithFallback
                      src={schoolInfo.stamp_url}
                      alt="School Stamp"
                      className="h-32 w-auto mx-auto object-contain"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2 right-2 h-7 w-7 rounded-full bg-destructive text-destructive-foreground hover:bg-destructive/90"
                      onClick={() => setSchoolInfo({ ...schoolInfo, stamp_url: undefined })}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="border-2 border-dashed rounded-lg p-8 bg-muted/20 flex flex-col items-center justify-center text-center">
                    <FileImage className="h-12 w-12 text-muted-foreground mb-2" />
                    <p className="text-sm text-muted-foreground">No stamp uploaded</p>
                  </div>
                )}
                <input
                  ref={stampInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleStampUpload}
                  className="hidden"
                />
                <Button 
                  variant="outline" 
                  className="w-full gap-2 h-9" 
                  onClick={() => stampInputRef.current?.click()}
                  disabled={uploadingStamp}
                >
                  {uploadingStamp ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Uploading...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      {schoolInfo.stamp_url ? 'Change Stamp' : 'Upload Stamp'}
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground">
                  Recommended: PNG with transparent background. Max 5MB
                </p>
              </div>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSave} 
              disabled={saving || !schoolInfo.school_name || !schoolInfo.address || !schoolInfo.email || !schoolInfo.phone_numbers} 
              className="gap-2 sm:flex-1"
            >
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save School Information
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground sm:hidden">
              * Required fields must be filled
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Gate Settings */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Gate Timing Settings</CardTitle>
              <CardDescription>Configure school timing for automatic late arrival detection</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4 md:space-y-6">
          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex gap-3">
              <Clock className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-medium text-blue-900 mb-2">How Late Arrival Detection Works:</p>
                <ul className="space-y-1 text-blue-800 text-xs">
                  <li>• Students clocking in <strong>before</strong> the school start time → Marked as <strong>On Time</strong></li>
                  <li>• Students clocking in <strong>after</strong> the school start time → Marked as <strong>Late</strong> with amber badge ⚠️</li>
                  <li>• Late arrivals are automatically tracked in the Gate Monitoring Dashboard</li>
                  <li>• Statistics show late arrival counts and percentages for better monitoring</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="space-y-2">
              <Label htmlFor="schoolStartTime" className="text-sm">
                School Start Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="schoolStartTime"
                type="time"
                value={schoolStartTime}
                onChange={(e) => setSchoolStartTime(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Students arriving after this time will be marked as late
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="schoolEndTime" className="text-sm">
                School End Time <span className="text-red-500">*</span>
              </Label>
              <Input
                id="schoolEndTime"
                type="time"
                value={schoolEndTime}
                onChange={(e) => setSchoolEndTime(e.target.value)}
                className="h-9"
              />
              <p className="text-xs text-muted-foreground">
                Students leaving before this time will be marked as early departure
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="pt-4 border-t flex flex-col sm:flex-row gap-3">
            <Button 
              onClick={handleSaveGateSettings} 
              disabled={savingGateSettings || !schoolStartTime || !schoolEndTime} 
              className="gap-2 sm:flex-1"
            >
              {savingGateSettings ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Save Gate Settings
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground sm:hidden">
              * Required fields must be filled
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}