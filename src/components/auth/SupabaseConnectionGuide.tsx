import { Alert, AlertDescription } from '../ui/alert';
import { Info, ExternalLink, AlertTriangle } from 'lucide-react';
import { Card } from '../ui/card';
import { Button } from '../ui/button';

export function SupabaseConnectionGuide() {
  return (
    <Card className="p-6 max-w-2xl mx-auto mt-8 border-orange-200 bg-orange-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-6 w-6 text-orange-600 flex-shrink-0 mt-1" />
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-orange-900 mb-3">
            Connection Issues? Troubleshooting Guide
          </h3>
          
          <div className="space-y-4 text-sm text-orange-900">
            <div>
              <h4 className="font-semibold mb-2">Common Causes:</h4>
              <ul className="list-disc list-inside space-y-1 ml-2">
                <li>
                  <strong>Supabase Project Paused:</strong> Free tier projects pause after 
                  1 week of inactivity
                </li>
                <li>
                  <strong>Network Issues:</strong> Check your internet connection
                </li>
                <li>
                  <strong>Invalid Credentials:</strong> Verify your Supabase URL and API keys
                </li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold mb-2">How to Fix:</h4>
              <ol className="list-decimal list-inside space-y-2 ml-2">
                <li>
                  <strong>Restore Your Supabase Project:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>Go to <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline inline-flex items-center gap-1">supabase.com/dashboard <ExternalLink className="h-3 w-3" /></a></li>
                    <li>Find your project (it may show as "Paused")</li>
                    <li>Click "Restore Project" or "Resume"</li>
                    <li>Wait a few minutes for it to become active</li>
                  </ul>
                </li>
                
                <li>
                  <strong>Verify Your Credentials:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>Check Project Settings {'>'} API in Supabase dashboard</li>
                    <li>Ensure the Project URL and anon/public key match your config</li>
                  </ul>
                </li>
                
                <li>
                  <strong>Check Network:</strong>
                  <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                    <li>Ensure you have a stable internet connection</li>
                    <li>Try refreshing the page</li>
                    <li>Check if other websites are loading properly</li>
                  </ul>
                </li>
              </ol>
            </div>

            <Alert className="border-blue-200 bg-blue-50 mt-4">
              <Info className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                <strong>Tip:</strong> If you're using the free tier, consider upgrading to Pro 
                to avoid automatic pausing, or set a reminder to access your project weekly 
                to keep it active.
              </AlertDescription>
            </Alert>
          </div>
        </div>
      </div>
    </Card>
  );
}
