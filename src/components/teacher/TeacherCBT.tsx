import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { QuestionBank } from './QuestionBank';
import { CBTResults } from './CBTResults';
import { BookOpen, BarChart3 } from 'lucide-react';

export function TeacherCBT() {
  const [activeTab, setActiveTab] = useState('questions');

  return (
    <div className="space-y-4 md:space-y-6">
      {/* Mobile Header with Gradient - App Style */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white -mx-4 -mt-4 p-6 rounded-b-3xl md:rounded-2xl md:mx-0 md:mt-0 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-white/20 backdrop-blur-sm rounded-xl">
            <BookOpen className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold">CBT Management</h1>
            <p className="text-indigo-100 text-sm md:text-base mt-1">
              Manage your question bank and view student results
            </p>
          </div>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full px-4 md:px-0">
        <TabsList className="grid w-full max-w-md grid-cols-2 h-12 bg-white rounded-2xl shadow-sm border border-gray-100">
          <TabsTrigger 
            value="questions" 
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600"
          >
            <BookOpen className="h-4 w-4" />
            <span className="hidden sm:inline">Question Bank</span>
            <span className="sm:hidden">Questions</span>
          </TabsTrigger>
          <TabsTrigger 
            value="results" 
            className="flex items-center gap-2 rounded-xl data-[state=active]:bg-indigo-50 data-[state=active]:text-indigo-600"
          >
            <BarChart3 className="h-4 w-4" />
            Results
          </TabsTrigger>
        </TabsList>

        <TabsContent value="questions" className="mt-6">
          <QuestionBank />
        </TabsContent>

        <TabsContent value="results" className="mt-6">
          <CBTResults />
        </TabsContent>
      </Tabs>
    </div>
  );
}