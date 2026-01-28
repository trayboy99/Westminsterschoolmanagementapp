import { useState } from 'react';
import { Settings, Calendar, BarChart3 } from 'lucide-react';
import { CBTSettings } from './CBTSettings';
import { CBTScheduler } from './CBTScheduler';
import { CBTMonitoring } from './CBTMonitoring';

export function CBTAdminModule() {
  const [activeTab, setActiveTab] = useState<'settings' | 'scheduler' | 'monitoring'>('settings');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-gray-900">CBT Management</h1>
        <p className="text-gray-600 mt-1">Configure CBT settings and enable exams for students</p>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg border border-gray-200 p-1 flex flex-wrap gap-1">
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors flex-1 sm:flex-initial justify-center min-w-[120px] ${
            activeTab === 'settings'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Settings className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm sm:text-base">CBT Settings</span>
        </button>
        <button
          onClick={() => setActiveTab('scheduler')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors flex-1 sm:flex-initial justify-center min-w-[120px] ${
            activeTab === 'scheduler'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <Calendar className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm sm:text-base">Enable/Schedule Exams</span>
        </button>
        <button
          onClick={() => setActiveTab('monitoring')}
          className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-md transition-colors flex-1 sm:flex-initial justify-center min-w-[120px] ${
            activeTab === 'monitoring'
              ? 'bg-blue-600 text-white'
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 flex-shrink-0" />
          <span className="text-sm sm:text-base">Monitoring</span>
        </button>
      </div>

      {/* Content */}
      <div>
        {activeTab === 'settings' && <CBTSettings />}
        {activeTab === 'scheduler' && <CBTScheduler />}
        {activeTab === 'monitoring' && <CBTMonitoring />}
      </div>
    </div>
  );
}