import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Button } from '../ui/button';
import { Plus, BookOpen, Users, GraduationCap, Settings, Database, Loader2, ClipboardList } from 'lucide-react';
import { ClassesManager } from './ClassesManager';
import { SubjectsManager } from './SubjectsManager';
import { ExamsManager } from './ExamsManager';
import SubjectOfferingsManager from './SubjectOfferingsManager';

import { Alert, AlertDescription } from '../ui/alert';
import { toast } from 'sonner@2.0.3';

interface SubjectsClassesModuleProps {
  userProfile: {
    id: string;
    email: string;
    first_name: string;
    last_name: string;
    role: string;
  };
}

export function SubjectsClassesModule({ userProfile }: SubjectsClassesModuleProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [stats, setStats] = useState({
    totalClasses: 0,
    totalSubjects: 0,
    assignedTeachers: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [creatingData, setCreatingData] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get authentication token
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setError('Authentication required. Please log in again.');
        return;
      }

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      // Fetch classes, subjects, and teachers concurrently
      const [classesResponse, subjectsResponse, teachersResponse] = await Promise.all([
        fetch(`${baseUrl}/classes`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseUrl}/subjects`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${baseUrl}/teachers`, {
          headers: {
            'Authorization': `Bearer ${session.access_token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);

      const [classesData, subjectsData, teachersData] = await Promise.all([
        classesResponse.json(),
        subjectsResponse.json(),
        teachersResponse.json()
      ]);

      if (classesData.success && subjectsData.success && teachersData.success) {
        setStats({
          totalClasses: classesData.classes?.length || 0,
          totalSubjects: subjectsData.subjects?.length || 0,
          assignedTeachers: teachersData.teachers?.length || 0
        });
      } else {
        const errors = [];
        if (!classesData.success) errors.push(`Classes: ${classesData.error}`);
        if (!subjectsData.success) errors.push(`Subjects: ${subjectsData.error}`);
        if (!teachersData.success) errors.push(`Teachers: ${teachersData.error}`);
        throw new Error(`Failed to fetch stats: ${errors.join(', ')}`);
      }

    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const hasManagementAccess = ['principal', 'it_admin', 'director', 'secretary'].includes(userProfile.role);

  const createSampleData = async () => {
    try {
      setCreatingData(true);

      // Get authentication token
      const { supabase } = await import('../../utils/supabase/client');
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        toast.error('Authentication required. Please log in again.');
        return;
      }

      const { projectId } = await import('../../utils/supabase/info');
      const baseUrl = `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a`;

      const response = await fetch(`${baseUrl}/create-sample-data`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (data.success) {
        toast.success(data.message);
        await fetchStats(); // Refresh stats
      } else {
        throw new Error(data.error);
      }

    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create sample data');
    } finally {
      setCreatingData(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Subjects & Classes</h1>
          <p className="text-muted-foreground">
            Manage academic subjects and class organization
          </p>
        </div>
      </div>

      {!hasManagementAccess && (
        <Alert>
          <Settings className="h-4 w-4" />
          <AlertDescription>
            You have read-only access to subjects and classes. Contact administration for editing permissions.
          </AlertDescription>
        </Alert>
      )}

      {/* Overview Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 border-blue-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Classes</CardTitle>
            <Users className="h-4 w-4 text-blue-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? '-' : stats.totalClasses}</div>
            <p className="text-xs text-blue-100">
              Active class groups
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 border-purple-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Total Subjects</CardTitle>
            <BookOpen className="h-4 w-4 text-purple-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? '-' : stats.totalSubjects}</div>
            <p className="text-xs text-purple-100">
              Available subjects
            </p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 border-green-600">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Teachers</CardTitle>
            <GraduationCap className="h-4 w-4 text-green-100" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{loading ? '-' : stats.assignedTeachers}</div>
            <p className="text-xs text-green-100">
              Available teachers
            </p>
          </CardContent>
        </Card>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="overflow-x-auto">
          <TabsList className="w-full justify-start min-w-max sm:min-w-0">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="classes">Classes</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
            <TabsTrigger value="offerings">Subject Offerings</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Academic Management</CardTitle>
              <CardDescription>
                Organize your school's academic structure with classes and subjects
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-2">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Classes Management
                    </CardTitle>
                    <CardDescription>
                      Create and manage class groups, assign class teachers, and organize students by grade levels.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => setActiveTab('classes')} 
                      className="w-full"
                      disabled={!hasManagementAccess}
                    >
                      Manage Classes
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <BookOpen className="h-5 w-5" />
                      Subjects Management
                    </CardTitle>
                    <CardDescription>
                      Add subjects, assign subject codes, and designate main teachers for each subject.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      onClick={() => setActiveTab('subjects')} 
                      className="w-full"
                      disabled={!hasManagementAccess}
                    >
                      Manage Subjects
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div className="mt-6 p-4 border rounded-lg bg-muted/50">
                <h4 className="font-medium mb-2">Quick Actions</h4>
                <div className="grid gap-2 md:grid-cols-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveTab('classes')}
                    disabled={!hasManagementAccess}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Class
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setActiveTab('subjects')}
                    disabled={!hasManagementAccess}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Subject
                  </Button>
                  {stats.totalClasses === 0 && stats.totalSubjects === 0 && hasManagementAccess && !loading && (
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={createSampleData}
                      disabled={creatingData}
                    >
                      {creatingData ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Database className="h-4 w-4 mr-2" />
                      )}
                      Create Sample Data
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="classes">
          <ClassesManager userProfile={userProfile} onStatsUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="subjects">
          <SubjectsManager userProfile={userProfile} onStatsUpdate={fetchStats} />
        </TabsContent>

        <TabsContent value="offerings">
          <SubjectOfferingsManager />
        </TabsContent>

        <TabsContent value="exams">
          <ExamsManager userRole={userProfile.role} />
        </TabsContent>
      </Tabs>


    </div>
  );
}