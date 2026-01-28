import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { CheckCircle, Copy, ExternalLink, Info } from 'lucide-react';

export function QuickUserCreator() {
  const [copied, setCopied] = useState(false);

  const demoUsers = [
    {
      email: 'principal@school.com',
      password: 'Principal123!',
      firstName: 'John',
      lastName: 'Principal',
      role: 'principal',
      gender: 'male',
      phone: '08012345678',
      dateOfBirth: '1980-01-01'
    },
    {
      email: 'director@school.com',
      password: 'Director123!',
      firstName: 'Jane',
      lastName: 'Director',
      role: 'director',
      gender: 'female',
      phone: '08012345679',
      dateOfBirth: '1975-01-01'
    },
    {
      email: 'teacher@school.com',
      password: 'Teacher123!',
      firstName: 'Mary',
      lastName: 'Teacher',
      role: 'teacher',
      gender: 'female',
      phone: '08012345680',
      dateOfBirth: '1985-01-01'
    },
    {
      email: 'student@school.com',
      password: 'Student123!',
      firstName: 'David',
      lastName: 'Student',
      role: 'student',
      gender: 'male',
      phone: '08012345681',
      dateOfBirth: '2005-01-01'
    },
    {
      email: 'finance@school.com',
      password: 'Finance123!',
      firstName: 'Finance',
      lastName: 'Administrator',
      role: 'finance_admin',
      gender: 'other',
      phone: '08012345682',
      dateOfBirth: '1990-01-01'
    }
  ];

  const sqlScript = `-- ===========================================
-- QUICK DEMO USERS SETUP
-- ===========================================
-- Run this in Supabase SQL Editor after creating users in Auth

-- Principal
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'PRINCIPAL-USER-ID-HERE',  -- ⚠️ REPLACE with actual UUID from Supabase Auth
  'principal@school.com',
  'John',
  'Principal',
  'principal',
  'male',
  '08012345678',
  '1980-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Director
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'DIRECTOR-USER-ID-HERE',  -- ⚠️ REPLACE with actual UUID from Supabase Auth
  'director@school.com',
  'Jane',
  'Director',
  'director',
  'female',
  '08012345679',
  '1975-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Teacher
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'TEACHER-USER-ID-HERE',  -- ⚠️ REPLACE with actual UUID from Supabase Auth
  'teacher@school.com',
  'Mary',
  'Teacher',
  'teacher',
  'female',
  '08012345680',
  '1985-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Student
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'STUDENT-USER-ID-HERE',  -- ⚠️ REPLACE with actual UUID from Supabase Auth
  'student@school.com',
  'David',
  'Student',
  'student',
  'male',
  '08012345681',
  '2005-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Finance Admin (only if finance_admin role exists)
INSERT INTO profiles (
  id, email, first_name, last_name, role, gender, phone, date_of_birth, created_at
) VALUES (
  'FINANCE-USER-ID-HERE',  -- ⚠️ REPLACE with actual UUID from Supabase Auth
  'finance@school.com',
  'Finance',
  'Administrator',
  'finance_admin',
  'other',
  '08012345682',
  '1990-01-01',
  NOW()
) ON CONFLICT (id) DO NOTHING;

-- Verify all users
SELECT id, email, first_name, last_name, role 
FROM profiles 
WHERE email IN (
  'principal@school.com',
  'director@school.com',
  'teacher@school.com',
  'student@school.com',
  'finance@school.com'
)
ORDER BY role;
`;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(sqlScript);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-4xl">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            Create Demo Users - Manual Setup
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Info className="h-4 w-4 text-blue-600" />
            <AlertDescription>
              <strong>Why are you seeing this?</strong>
              <br />
              You're getting "Invalid login credentials" because no users exist in your database yet.
              Follow the steps below to create demo users.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold">Step 1: Create Users in Supabase Auth</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to your <strong>Supabase Dashboard</strong></li>
              <li>Navigate to <strong>Authentication</strong> → <strong>Users</strong></li>
              <li>Click <strong>"Add User"</strong> → <strong>"Create new user"</strong></li>
              <li>For each user below, enter their email and password</li>
              <li><strong>✅ IMPORTANT: Check "Auto Confirm User"</strong></li>
              <li>After creating each user, <strong>copy their User ID</strong> (you'll need it in Step 2)</li>
            </ol>

            <div className="bg-slate-50 p-4 rounded-lg space-y-3">
              <h4 className="font-medium text-sm">Demo User Credentials:</h4>
              {demoUsers.map((user) => (
                <div key={user.email} className="grid grid-cols-3 gap-2 text-sm border-b pb-2">
                  <div className="font-medium">{user.role.replace('_', ' ').toUpperCase()}</div>
                  <div className="text-slate-600">{user.email}</div>
                  <div className="font-mono text-slate-500">{user.password}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Step 2: Create Profiles in Database</h3>
            <ol className="list-decimal list-inside space-y-2 text-sm">
              <li>Go to <strong>Supabase Dashboard</strong> → <strong>SQL Editor</strong></li>
              <li>Click the button below to copy the SQL script</li>
              <li><strong>IMPORTANT:</strong> Replace each <code className="bg-slate-200 px-1 rounded">USER-ID-HERE</code> with the actual UUID you copied from Step 1</li>
              <li>Run the script</li>
              <li>Verify that all users were created successfully</li>
            </ol>

            <div className="flex gap-2">
              <Button
                onClick={copyToClipboard}
                className="flex items-center gap-2"
              >
                {copied ? (
                  <>
                    <CheckCircle className="h-4 w-4" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" />
                    Copy SQL Script
                  </>
                )}
              </Button>
              
              <Button
                variant="outline"
                asChild
              >
                <a 
                  href="https://supabase.com/dashboard" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open Supabase Dashboard
                </a>
              </Button>
            </div>

            <div className="bg-slate-900 text-slate-100 p-4 rounded-lg overflow-auto max-h-96">
              <pre className="text-xs whitespace-pre-wrap">{sqlScript}</pre>
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="font-semibold">Step 3: Test Login</h3>
            <p className="text-sm text-slate-600">
              After completing Steps 1 and 2, refresh this page and try logging in with any of the demo user credentials above.
            </p>
            
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription>
                <strong>Recommended:</strong> Start with the <strong>Principal</strong> account to access all features and set up your school.
              </AlertDescription>
            </Alert>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-medium text-sm mb-2">Alternative: Use Registration Form</h4>
            <p className="text-sm text-slate-600 mb-3">
              You can also create users through the registration form, but you'll need an admin account to approve registrations.
            </p>
            <Button variant="link" className="p-0 h-auto" onClick={() => window.location.hash = 'register'}>
              Go to Registration Form →
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
