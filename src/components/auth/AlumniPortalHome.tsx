import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { 
  GraduationCap, 
  FileText,
  ClipboardList,
  ArrowLeft,
  ArrowRight
} from 'lucide-react';

interface AlumniPortalHomeProps {
  onSelectOption: (option: 'results' | 'transcript') => void;
  onBackToLogin?: () => void;
}

export function AlumniPortalHome({ onSelectOption, onBackToLogin }: AlumniPortalHomeProps) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100 p-4">
      <Card className="w-full max-w-2xl shadow-2xl border-0">
        <CardHeader className="text-center pb-8">
          <div className="mx-auto mb-4 p-3 bg-green-100 rounded-full w-fit">
            <GraduationCap className="h-8 w-8 text-green-600" />
          </div>
          <CardTitle className="text-3xl font-bold text-slate-800">
            Alumni Portal
          </CardTitle>
          <p className="text-slate-600 mt-2">
            Welcome back! What would you like to access today?
          </p>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Check Past Results Option */}
          <button
            onClick={() => onSelectOption('results')}
            className="w-full group"
          >
            <Card className="border-2 border-slate-200 hover:border-blue-500 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-blue-100 rounded-lg group-hover:bg-blue-200 transition-colors">
                    <ClipboardList className="h-8 w-8 text-blue-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Check Past Results
                    </h3>
                    <p className="text-slate-600 text-sm mb-3">
                      View your examination results from previous academic sessions. 
                      Access your marks, grades, and performance reports.
                    </p>
                    <div className="flex items-center text-blue-600 group-hover:text-blue-700">
                      <span className="text-sm font-medium">Access Results</span>
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          {/* Get Transcript Option */}
          <button
            onClick={() => onSelectOption('transcript')}
            className="w-full group"
          >
            <Card className="border-2 border-slate-200 hover:border-green-500 hover:shadow-lg transition-all duration-200 cursor-pointer">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-green-100 rounded-lg group-hover:bg-green-200 transition-colors">
                    <FileText className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="flex-1 text-left">
                    <h3 className="text-xl font-semibold text-slate-900 mb-2">
                      Get Transcript
                    </h3>
                    <p className="text-slate-600 text-sm mb-3">
                      Access your official academic transcript using your transcript PIN. 
                      Download and print your complete academic records.
                    </p>
                    <div className="flex items-center text-green-600 group-hover:text-green-700">
                      <span className="text-sm font-medium">Access Transcript</span>
                      <ArrowRight className="h-4 w-4 ml-2 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </button>

          {/* Back to Login */}
          <div className="pt-4 text-center">
            <Button
              variant="link"
              onClick={onBackToLogin}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4 mr-1" />
              Back to Staff/Student Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
