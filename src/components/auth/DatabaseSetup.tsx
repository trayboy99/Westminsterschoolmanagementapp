import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { 
  Database, 
  CheckCircle, 
  AlertTriangle, 
  Copy,
  ExternalLink,
  Loader2
} from 'lucide-react';
import { toast } from 'sonner@2.0.3';

interface DatabaseSetupProps {
  onComplete?: () => void;
}

export function DatabaseSetup({ onComplete }: DatabaseSetupProps) {
  const [copied, setCopied] = useState(false);

  const sqlSchema = `-- School Management System Database Schema
-- Run this in your Supabase SQL Editor

-- Create profiles table (simplified schema)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  first_name TEXT NOT NULL,
  middle_name TEXT,
  last_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('principal', 'super_admin', 'director', 'secretary', 'transport_manager', 'teacher', 'student', 'parent')),
  email TEXT UNIQUE NOT NULL
);

-- Additional tables for the school management system can be added as needed
-- For now, we'll focus on the core profiles table for authentication

-- Enable Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (you can customize these later)
CREATE POLICY "Allow authenticated users to read profiles" ON profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to insert profiles" ON profiles FOR INSERT TO authenticated USING (true);
CREATE POLICY "Allow authenticated users to update profiles" ON profiles FOR UPDATE TO authenticated USING (true);

-- Insert demo users
INSERT INTO profiles (id, first_name, middle_name, last_name, role, email) VALUES 
('11111111-1111-1111-1111-111111111111', 'Dr. Sarah', '', 'Johnson', 'principal', 'principal@school.edu'),
('22222222-2222-2222-2222-222222222222', 'Ahmed', '', 'Hassan', 'teacher', 'teacher@school.edu'),
('33333333-3333-3333-3333-333333333333', 'John', '', 'Smith', 'student', 'student@school.edu')
ON CONFLICT (email) DO NOTHING;

-- The setup is complete!`;

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(sqlSchema);
      setCopied(true);
      toast.success('SQL schema copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      // Fallback to legacy method
      try {
        const textArea = document.createElement('textarea');
        textArea.value = sqlSchema;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        const successful = document.execCommand('copy');
        document.body.removeChild(textArea);
        
        if (successful) {
          setCopied(true);
          toast.success('SQL schema copied to clipboard!');
          setTimeout(() => setCopied(false), 2000);
        } else {
          toast.error('Failed to copy to clipboard. Please copy manually.');
        }
      } catch (fallbackError) {
        console.error('[Clipboard] Error:', error);
        toast.error('Failed to copy to clipboard. Please copy manually.');
      }
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-4">
      <Card className="w-full max-w-4xl shadow-2xl border-0">
        <CardHeader className="text-center pb-6">
          <div className="mx-auto mb-4 p-3 bg-blue-100 rounded-full w-fit">
            <Database className="h-8 w-8 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold text-slate-800">
            Database Setup Required
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Your Supabase database needs to be configured before you can use the School Management System
          </p>
        </CardHeader>

        <CardContent className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <Database className="h-4 w-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              <strong>Required:</strong> You need to create the database tables in your Supabase project before proceeding.
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <h3 className="font-semibold text-slate-800">Setup Instructions:</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Open Supabase SQL Editor</p>
                  <p className="text-slate-600">Go to your Supabase dashboard → SQL Editor</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">2</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Copy and Run SQL Schema</p>
                  <p className="text-slate-600">Copy the SQL below and paste it into the SQL Editor, then click "RUN"</p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 bg-slate-50 rounded-lg">
                <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">3</span>
                </div>
                <div>
                  <p className="font-medium text-slate-800">Return and Refresh</p>
                  <p className="text-slate-600">Come back to this page and refresh to continue</p>
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium text-slate-800">SQL Schema</h4>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={copyToClipboard}
                  className="flex items-center gap-2"
                >
                  {copied ? (
                    <>
                      <CheckCircle className="h-4 w-4 text-green-600" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4" />
                      Copy SQL
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  asChild
                >
                  <a 
                    href="https://supabase.com/dashboard" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="flex items-center gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open Supabase
                  </a>
                </Button>
              </div>
            </div>

            <div className="bg-slate-900 rounded-lg p-4 max-h-96 overflow-y-auto">
              <pre className="text-green-400 text-xs font-mono whitespace-pre-wrap">
                {sqlSchema}
              </pre>
            </div>
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <AlertDescription className="text-amber-800">
              <strong>Important:</strong> Make sure to run the entire SQL script in your Supabase SQL Editor. 
              This creates all necessary tables, relationships, and security policies.
            </AlertDescription>
          </Alert>

          <div className="flex gap-4">
            <Button 
              onClick={() => window.location.reload()} 
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              <Loader2 className="h-4 w-4 mr-2" />
              I've Run the SQL - Refresh Page
            </Button>
            {onComplete && (
              <Button 
                variant="outline" 
                onClick={onComplete}
                className="flex-1"
              >
                Skip for Now
              </Button>
            )}
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-500">
              Need help? Check the Supabase documentation or contact support
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}