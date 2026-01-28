import { MarksDebugPanel } from '../components/debug/MarksDebugPanel';
import { SimpleMarksViewer } from '../components/debug/SimpleMarksViewer';

export default function DebugMarksPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-slate-800 mb-2">
            🔍 Marks Database Debugger
          </h1>
          <p className="text-slate-600">
            Check what's actually in your marks database
          </p>
        </div>
        
        <SimpleMarksViewer />
        
        <MarksDebugPanel />
        
        <div className="bg-white rounded-lg p-6 shadow-sm">
          <h2 className="font-semibold text-lg mb-3">📝 How to Use</h2>
          <ol className="list-decimal list-inside space-y-2 text-sm text-slate-700">
            <li>Select the session, term, and type (midterm/terminal)</li>
            <li>Click "Run Debug" to see what marks exist in the database</li>
            <li>Check the counts - they should match what you expect</li>
            <li>
              <strong>If you see more marks than expected:</strong>
              <ul className="list-disc list-inside ml-6 mt-1 space-y-1">
                <li>Check the "All Marks Sample" - are there old marks still there?</li>
                <li>Check "Student-Subject Enrollments" - are students enrolled multiple times?</li>
                <li>Look at the filtered marks - do they match what you entered?</li>
              </ul>
            </li>
          </ol>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-amber-900 mb-2">⚠️ Expected Results</h3>
          <p className="text-sm text-amber-800">
            If you entered <strong>ONE mark for ONE student in Data Processing for SS 1 Diamond</strong>, you should see:
          </p>
          <ul className="list-disc list-inside text-sm text-amber-800 mt-2 ml-4">
            <li><strong>Total Marks:</strong> 1 (or however many exams you have for that type)</li>
            <li><strong>Filtered Marks:</strong> Should show only marks for the selected session/term/type</li>
            <li><strong>Student-Subject Enrollments:</strong> Should show students enrolled in each subject</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
