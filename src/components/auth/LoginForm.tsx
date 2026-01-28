import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Alert, AlertDescription } from '../ui/alert';
import { useAuth } from '../../contexts/AuthContext';
import { projectId, publicAnonKey } from '../../utils/supabase/info';
import { 
  Mail, 
  Lock, 
  LogIn, 
  GraduationCap,
  School,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  UserPlus,
  CheckCircle,
  Info
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';
import { ConnectionTest } from './ConnectionTest';
import { ImageWithFallback } from '../figma/ImageWithFallback';
import schoolLogo from 'figma:asset/7b7d21859f7daef9ce400f075791c70448379797.png';

interface LoginFormProps {
  onSuccess?: () => void;
}

export function LoginForm({ onSuccess }: LoginFormProps) {
  const { signIn, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [schoolInfo, setSchoolInfo] = useState({
    school_name: '',
    logo_url: ''
  });

  // Fetch school info on mount
  useEffect(() => {
    fetchSchoolInfo();
  }, []);

  const fetchSchoolInfo = async () => {
    try {
      console.log('[LoginForm] Fetching school settings...');
      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/school-settings`,
        {
          headers: {
            'Authorization': `Bearer ${publicAnonKey}`,
            'Content-Type': 'application/json'
          }
        }
      );

      console.log('[LoginForm] Response status:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('[LoginForm] School settings data:', data);
        
        if (data.success && data.settings) {
          console.log('[LoginForm] Setting school info:', {
            school_name: data.settings.school_name,
            logo_url: data.settings.logo_url
          });
          setSchoolInfo({
            school_name: data.settings.school_name || '',
            logo_url: data.settings.logo_url || ''
          });
        }
      }
    } catch (err) {
      console.error('[LoginForm] Error fetching school info:', err);
      // Silent fail - use default values
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      // Step 1: Sign in
      await signIn(formData.email, formData.password);
      
      // Step 2: Immediately check if student is graduated BEFORE any redirect
      const { createClient } = await import('../../utils/supabase/client');
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      
      if (session?.user) {
        // Fetch user profile to check graduation status
        const profileResponse = await fetch(
          `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/profiles/${session.user.id}`,
          {
            headers: {
              'Authorization': `Bearer ${session.access_token}`,
              'Content-Type': 'application/json'
            }
          }
        );

        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          
          // 🔥 CRITICAL: If student is graduated, BLOCK everything and show error
          if (profileData.role === 'student' && profileData.is_graduated === true) {
            // Log them out immediately
            await supabase.auth.signOut();
            
            // Stay on login page with error message - NO REDIRECT, NO SUCCESS
            const errorMsg = 'You are no longer a student of this school. Your account has been graduated. Please use the Alumni Portal to access your past results and transcripts.';
            setError(errorMsg);
            toast.error('You are no longer a student of this school', { 
              duration: 6000,
              style: {
                background: '#ef4444',
                color: 'white',
                border: '1px solid #dc2626'
              }
            });
            setIsSubmitting(false);
            return; // 🛑 STOP HERE - Don't call onSuccess
          }
        }
      }
      
      // Step 3: Only show success and proceed if NOT graduated
      toast.success('Successfully signed in!');
      setIsSubmitting(false);
      onSuccess?.(); // Only called if student is NOT graduated
      
    } catch (err) {
      console.error('Login error:', err);
      let errorMessage = 'Failed to sign in';
      
      if (err instanceof Error) {
        if (err.message.includes('Invalid login credentials')) {
          errorMessage = 'Invalid email or password. Please check your credentials or create demo users if this is your first time.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      toast.error(errorMessage);
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (field: keyof typeof formData) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: e.target.value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const isFormValid = formData.email.trim() && formData.password.trim();

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#7B9FCC] p-3 sm:p-4">
      <Card className="w-full max-w-[420px] shadow-2xl border-0">
        <CardHeader className="text-center pb-2 pt-4">
          {/* School Logo - Bigger and more prominent */}
          <div className="mx-auto mb-1">
            <img
              src={schoolLogo}
              alt="Westminster College Logo"
              className="w-32 h-32 sm:w-36 sm:h-36 object-contain"
            />
          </div>
          
          {/* School Name - Larger and bolder */}
          <CardTitle className="text-2xl sm:text-3xl font-bold text-slate-800 mb-0.5">
            {schoolInfo.school_name || 'Westminster College Lagos'}
          </CardTitle>
          <p className="text-sm text-slate-600">
            Sign in to access your dashboard
          </p>
        </CardHeader>

        <CardContent className="px-5 sm:px-6 pb-4 pt-2">
          {error && (
            <Alert className="mb-3 border-red-200 bg-red-50">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <AlertDescription className="text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-2.5">
            <div className="space-y-0.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={formData.email}
                  onChange={handleInputChange('email')}
                  className="pl-10"
                  required
                  disabled={isSubmitting || loading}
                />
              </div>
            </div>

            <div className="space-y-0.5">
              <Label htmlFor="password" className="text-sm font-medium text-slate-700">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-slate-400" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange('password')}
                  className="pl-10 pr-10"
                  required
                  disabled={isSubmitting || loading}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8 p-0"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting || loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-slate-400" />
                  ) : (
                    <Eye className="h-4 w-4 text-slate-400" />
                  )}
                </Button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white mt-3"
              disabled={!isFormValid || isSubmitting || loading}
            >
              {isSubmitting || loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <LogIn className="h-4 w-4 mr-2" />
                  Sign In
                </>
              )}
            </Button>
          </form>

          <div className="mt-4 text-center space-y-1.5">
            <div className="text-sm text-slate-600">
              <p className="mb-1.5">Don't have an account?</p>
              <div className="flex flex-col gap-1">
                <Button asChild variant="link" size="sm" className="p-0 h-auto font-semibold">
                  <a href="#register">Apply for New Account</a>
                </Button>
                <Button asChild variant="link" size="sm" className="p-0 h-auto font-semibold">
                  <a href="#registration-status">Check Application Status</a>
                </Button>
              </div>
            </div>
            <div className="border-t pt-2 space-y-1">
              <p className="text-sm text-slate-600">
                Are you an alumni of this school?{' '}
                <Button asChild variant="link" size="sm" className="p-0 h-auto text-green-600 hover:text-green-700 font-semibold">
                  <a href="#alumni">Click here</a>
                </Button>
              </p>
              <p className="text-xs text-slate-500">
                Need help? Contact your school administrator
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}