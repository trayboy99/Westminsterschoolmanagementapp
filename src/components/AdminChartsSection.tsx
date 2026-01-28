import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Skeleton } from './ui/skeleton';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Users, School } from 'lucide-react';
import { createClient } from '../utils/supabase/client';
import { projectId } from '../utils/supabase/info';

// Color palette for charts - vibrant and distinguishable colors
const CHART_COLORS = [
  '#8b5cf6', // Purple
  '#3b82f6', // Blue
  '#10b981', // Green
  '#f59e0b', // Amber
  '#ef4444', // Red
  '#ec4899', // Pink
  '#06b6d4', // Cyan
  '#84cc16', // Lime
  '#f97316', // Orange
  '#a855f7', // Violet
  '#14b8a6', // Teal
  '#6366f1', // Indigo
  '#22c55e', // Emerald
  '#eab308', // Yellow
  '#dc2626', // Red variant
  '#d946ef', // Fuchsia
  '#0ea5e9', // Sky blue
  '#65a30d', // Lime variant
  '#ea580c', // Orange variant
  '#c026d3', // Magenta
];

export function AdminChartsSection() {
  const [loading, setLoading] = useState(true);
  const [genderData, setGenderData] = useState<any[]>([]);
  const [classesData, setClassesData] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      // Fetch students with complete profiles from KV store
      const studentsRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/students-with-profiles`,
        { headers }
      );
      const studentsData = await studentsRes.json();

      if (studentsData.success && studentsData.students) {
        const students = studentsData.students;
        
        // Calculate gender breakdown
        const maleCount = students.filter((s: any) => s.gender?.toLowerCase() === 'male').length;
        const femaleCount = students.filter((s: any) => s.gender?.toLowerCase() === 'female').length;
        
        setGenderData([
          { name: 'Male', students: maleCount, fill: '#3b82f6' },
          { name: 'Female', students: femaleCount, fill: '#ec4899' }
        ]);
      }

      // Fetch classes statistics from classes table
      const classesRes = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/classes-stats`,
        { headers }
      );
      const classesData = await classesRes.json();

      if (classesData.success && classesData.classes) {
        const classesChartData = classesData.classes
          .map((cls: any, index: number) => ({
            name: cls.class_name,
            students: cls.student_count,
            fill: CHART_COLORS[index % CHART_COLORS.length] // Assign different color to each class
          }))
          .filter((cls: any) => cls.students > 0) // Only classes with students
          .sort((a: any, b: any) => b.students - a.students)
          .slice(0, 10); // Top 10 classes

        setClassesData(classesChartData);
      }
    } catch (error) {
      // Error handled silently
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">
      {/* Gender Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            Students by Gender
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={genderData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="students" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {genderData.length > 0 && (
            <div className="mt-4 flex justify-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-blue-500"></div>
                <span className="text-slate-600">Male: <span className="font-bold">{genderData[0]?.students || 0}</span></span>
              </div>
              <div className="flex items-center gap-2">
                <div className="h-3 w-3 rounded-full bg-pink-500"></div>
                <span className="text-slate-600">Female: <span className="font-bold">{genderData[1]?.students || 0}</span></span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Students per Class Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <School className="h-5 w-5 text-purple-600" />
            Students by Class
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={classesData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="students" fill="#8b5cf6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
          {classesData.length > 0 && (
            <p className="mt-4 text-xs text-slate-500 text-center">
              Showing top {classesData.length} classes by student count
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
