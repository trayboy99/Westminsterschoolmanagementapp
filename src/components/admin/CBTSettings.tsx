import { useState, useEffect } from 'react';
import { Save, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { projectId } from '../../utils/supabase/info';
import { createClient } from '../../utils/supabase/client';

interface CBTSettingsData {
  allow_calculator: boolean;
  disable_copy_paste: boolean;
  disable_right_click: boolean;
  randomize_questions: boolean;
  randomize_options: boolean;
  show_results_after: boolean;
  time_limit_per_question: number;
  allow_test_review: boolean;
  notify_teacher_on_completion: boolean;
  show_correct_answers: boolean;
  // Violation tracking settings
  enable_violation_tracking: boolean;
  tab_switch_penalty_seconds: number;
  fullscreen_exit_penalty_seconds: number;
  max_violations_before_auto_submit: number;
  exam_rules_text: string;
}

export function CBTSettings() {
  const [settings, setSettings] = useState<CBTSettingsData>({
    allow_calculator: false,
    disable_copy_paste: true,
    disable_right_click: true,
    randomize_questions: true,
    randomize_options: true,
    show_results_after: true,
    time_limit_per_question: 0,
    allow_test_review: true,
    notify_teacher_on_completion: true,
    show_correct_answers: false,
    // Violation tracking settings
    enable_violation_tracking: true,
    tab_switch_penalty_seconds: 10,
    fullscreen_exit_penalty_seconds: 10,
    max_violations_before_auto_submit: 3,
    exam_rules_text: "Please adhere to the exam rules and do not switch tabs or exit fullscreen mode."
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const supabase = createClient();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      setLoading(true);
      setError('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/settings`,
        {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSettings(data.settings);
      } else {
        setError(data.error || 'Failed to fetch settings');
      }
    } catch (err: any) {
      console.error('Error fetching settings:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError('');
      setSuccess('');

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Not authenticated');
        return;
      }

      const response = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/cbt/settings`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(settings),
        }
      );

      const data = await response.json();
      if (response.ok) {
        setSuccess('Settings saved successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Failed to save settings');
      }
    } catch (err: any) {
      console.error('Error saving settings:', err);
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = (key: keyof CBTSettingsData, value: boolean | number | string) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-300 border-t-blue-600"></div>
        <p className="text-gray-600 mt-4">Loading settings...</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border-b border-red-200 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <p className="text-red-800 text-sm">{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-green-50 border-b border-green-200 flex items-start gap-3">
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
          <p className="text-green-800 text-sm">{success}</p>
        </div>
      )}

      <div className="p-6 space-y-6">
        {/* Info Box */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-start gap-3">
          <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-blue-900 text-sm">
              These settings apply to <strong>ALL</strong> CBT exams across the school.
            </p>
            <p className="text-blue-700 text-xs mt-1">
              Configure anti-cheat measures, randomization, and display options below.
            </p>
          </div>
        </div>

        {/* Security Settings */}
        <div>
          <h3 className="text-gray-900 mb-4">🔒 Security & Anti-Cheat</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.disable_copy_paste}
                onChange={(e) => updateSetting('disable_copy_paste', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Disable Copy/Paste</p>
                <p className="text-gray-600 text-xs mt-1">
                  Prevents students from copying questions or pasting answers
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.disable_right_click}
                onChange={(e) => updateSetting('disable_right_click', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Disable Right Click</p>
                <p className="text-gray-600 text-xs mt-1">
                  Prevents context menu access during exam
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Randomization Settings */}
        <div>
          <h3 className="text-gray-900 mb-4">🔀 Randomization</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.randomize_questions}
                onChange={(e) => updateSetting('randomize_questions', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Randomize Question Order</p>
                <p className="text-gray-600 text-xs mt-1">
                  Each student sees questions in different order
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.randomize_options}
                onChange={(e) => updateSetting('randomize_options', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Randomize Answer Options</p>
                <p className="text-gray-600 text-xs mt-1">
                  Shuffle A, B, C, D options for MCQ questions
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Display Settings */}
        <div>
          <h3 className="text-gray-900 mb-4">👁️ Display & Results</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_results_after}
                onChange={(e) => updateSetting('show_results_after', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Show Results After Submission</p>
                <p className="text-gray-600 text-xs mt-1">
                  Students see their score immediately after submitting
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.show_correct_answers}
                onChange={(e) => updateSetting('show_correct_answers', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Show Correct Answers After Exam</p>
                <p className="text-gray-600 text-xs mt-1">
                  Display correct answers when student reviews their submission
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_test_review}
                onChange={(e) => updateSetting('allow_test_review', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Allow Test Review</p>
                <p className="text-gray-600 text-xs mt-1">
                  Students can review their answers after submission
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Tools & Features */}
        <div>
          <h3 className="text-gray-900 mb-4">🛠️ Tools & Features</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.allow_calculator}
                onChange={(e) => updateSetting('allow_calculator', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Allow On-Screen Calculator</p>
                <p className="text-gray-600 text-xs mt-1">
                  Provide a calculator tool during the exam
                </p>
              </div>
            </label>

            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-gray-900 text-sm mb-2">
                Time Limit Per Question (seconds)
              </label>
              <p className="text-gray-600 text-xs mb-3">
                Set to 0 for no per-question time limit
              </p>
              <input
                type="number"
                value={settings.time_limit_per_question}
                onChange={(e) => updateSetting('time_limit_per_question', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0 = No limit"
              />
            </div>
          </div>
        </div>

        {/* Notifications */}
        <div>
          <h3 className="text-gray-900 mb-4">🔔 Notifications</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.notify_teacher_on_completion}
                onChange={(e) => updateSetting('notify_teacher_on_completion', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Notify Teacher on Completion</p>
                <p className="text-gray-600 text-xs mt-1">
                  Send notification to subject teacher when student submits
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Violation Tracking */}
        <div>
          <h3 className="text-gray-900 mb-4">🚫 Violation Tracking</h3>
          <div className="space-y-4">
            <label className="flex items-start gap-3 p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.enable_violation_tracking}
                onChange={(e) => updateSetting('enable_violation_tracking', e.target.checked)}
                className="mt-1 w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex-1">
                <p className="text-gray-900 text-sm">Enable Violation Tracking</p>
                <p className="text-gray-600 text-xs mt-1">
                  Track and penalize violations during the exam
                </p>
              </div>
            </label>

            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-gray-900 text-sm mb-2">
                Tab Switch Penalty (seconds)
              </label>
              <p className="text-gray-600 text-xs mb-3">
                Penalty time for switching tabs
              </p>
              <input
                type="number"
                value={settings.tab_switch_penalty_seconds}
                onChange={(e) => updateSetting('tab_switch_penalty_seconds', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0 = No penalty"
              />
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-gray-900 text-sm mb-2">
                Fullscreen Exit Penalty (seconds)
              </label>
              <p className="text-gray-600 text-xs mb-3">
                Penalty time for exiting fullscreen mode
              </p>
              <input
                type="number"
                value={settings.fullscreen_exit_penalty_seconds}
                onChange={(e) => updateSetting('fullscreen_exit_penalty_seconds', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0 = No penalty"
              />
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-gray-900 text-sm mb-2">
                Max Violations Before Auto-Submit
              </label>
              <p className="text-gray-600 text-xs mb-3">
                Number of violations before the exam is automatically submitted
              </p>
              <input
                type="number"
                value={settings.max_violations_before_auto_submit}
                onChange={(e) => updateSetting('max_violations_before_auto_submit', parseInt(e.target.value) || 0)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                min="0"
                placeholder="0 = No limit"
              />
            </div>

            <div className="p-4 border border-gray-200 rounded-lg">
              <label className="block text-gray-900 text-sm mb-2">
                Exam Rules Text
              </label>
              <p className="text-gray-600 text-xs mb-3">
                Text to display as exam rules
              </p>
              <textarea
                value={settings.exam_rules_text}
                onChange={(e) => updateSetting('exam_rules_text', e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter exam rules text here"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Save className="w-5 h-5" />
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>
    </div>
  );
}