import { useState } from 'react';
import { Card, CardContent } from '../ui/card';
import { Button } from '../ui/button';
import { Settings, School, Award, Calendar, Eye, Layers, ClipboardCheck, TrendingUp, FileText } from 'lucide-react';
import { SchoolSettings } from './SchoolSettings';
import { GradeSettings } from './GradeSettings';
import { SessionSettings } from './SessionSettings';
import { ResultPublishingSettings } from './ResultPublishingSettings';
import { SectionsSettings } from './SectionsSettings';
import { AttendanceSettings } from './AttendanceSettings';
import { ClassHierarchySettings } from './ClassHierarchySettings';
import { LessonPlanFieldSettings } from '../director/LessonPlanFieldSettings';
import { useAuth } from '../../contexts/AuthContext';

export function SettingsManagement() {
  const { profile } = useAuth();
  const isPrincipal = profile?.role === 'principal';
  
  const [activeTab, setActiveTab] = useState<'school' | 'grades' | 'sessions' | 'sections' | 'publishing' | 'attendance' | 'hierarchy' | 'lesson-plans'>('school');

  const baseTabs = [
    { id: 'school' as const, label: 'School Information', icon: School },
    { id: 'grades' as const, label: 'Grade & Remark System', icon: Award },
    { id: 'sessions' as const, label: 'Sessions & Terms', icon: Calendar },
    { id: 'sections' as const, label: 'Class Sections', icon: Layers },
    { id: 'hierarchy' as const, label: 'Class Hierarchy', icon: TrendingUp },
    { id: 'publishing' as const, label: 'Result Publishing', icon: Eye },
    { id: 'attendance' as const, label: 'Attendance Settings', icon: ClipboardCheck },
  ];

  // Add E-Lesson Plan Settings tab ONLY for principals
  const tabs = isPrincipal 
    ? [...baseTabs, { id: 'lesson-plans' as const, label: 'E-Lesson Plan Settings', icon: FileText }]
    : baseTabs;

  return (
    <div className="space-y-4 md:space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="p-2 bg-primary/10 rounded-lg hidden sm:flex">
          <Settings className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="flex items-center gap-2">
            <Settings className="h-6 w-6 sm:hidden text-primary" />
            Settings Management
          </h1>
          <p className="text-muted-foreground mt-1">
            Configure school settings, grading system, and academic sessions
          </p>
        </div>
      </div>

      {/* Tabs */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <Button
                  key={tab.id}
                  variant={activeTab === tab.id ? 'default' : 'outline'}
                  onClick={() => setActiveTab(tab.id)}
                  className="gap-2 text-xs sm:text-sm h-auto py-2 px-3 whitespace-normal justify-start"
                  size="sm"
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 shrink-0" />
                  <span className="text-left">{tab.label}</span>
                </Button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Content */}
      {activeTab === 'school' && <SchoolSettings />}
      {activeTab === 'grades' && <GradeSettings />}
      {activeTab === 'sessions' && <SessionSettings />}
      {activeTab === 'sections' && <SectionsSettings />}
      {activeTab === 'hierarchy' && <ClassHierarchySettings />}
      {activeTab === 'publishing' && <ResultPublishingSettings />}
      {activeTab === 'attendance' && <AttendanceSettings />}
      {activeTab === 'lesson-plans' && isPrincipal && <LessonPlanFieldSettings />}
    </div>
  );
}