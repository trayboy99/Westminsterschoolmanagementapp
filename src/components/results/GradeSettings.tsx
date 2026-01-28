import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Plus, Trash2, Save, Award } from 'lucide-react';
import { createClient } from '../../utils/supabase/client';
import { projectId } from '../../utils/supabase/info';
import { toast } from 'sonner@2.0.3';

interface GradeConfig {
  id?: string;
  grade: string;
  min_percentage: number;
  max_percentage: number;
  remark: string;
}

export function GradeSettings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [grades, setGrades] = useState<GradeConfig[]>([
    { grade: 'A', min_percentage: 80, max_percentage: 100, remark: 'Excellent' },
    { grade: 'B', min_percentage: 70, max_percentage: 79, remark: 'Very Good' },
    { grade: 'C', min_percentage: 60, max_percentage: 69, remark: 'Good' },
    { grade: 'D', min_percentage: 50, max_percentage: 59, remark: 'Fair' },
    { grade: 'E', min_percentage: 40, max_percentage: 49, remark: 'Pass' },
    { grade: 'F', min_percentage: 0, max_percentage: 39, remark: 'Fail' },
  ]);

  const supabase = createClient();

  useEffect(() => {
    fetchGradeSettings();
  }, []);

  const fetchGradeSettings = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/grade-settings`,
        { headers }
      );
      const result = await res.json();
      
      if (result.success && result.grades && result.grades.length > 0) {
        setGrades(result.grades);
      }
    } catch (error) {
      console.error('[GradeSettings] Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    // Validate that grades don't overlap
    const sortedGrades = [...grades].sort((a, b) => b.min_percentage - a.min_percentage);
    for (let i = 0; i < sortedGrades.length - 1; i++) {
      if (sortedGrades[i].min_percentage <= sortedGrades[i + 1].max_percentage) {
        toast.error('Grade ranges overlap! Please fix the percentages.');
        return;
      }
    }

    try {
      setSaving(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const headers = {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      };

      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/make-server-1ddd013a/update-grade-settings`,
        {
          method: 'POST',
          headers,
          body: JSON.stringify({ grades })
        }
      );
      const result = await res.json();
      
      if (result.success) {
        toast.success('Grade settings updated successfully!');
        await fetchGradeSettings();
      } else {
        toast.error(result.error || 'Failed to update grade settings');
      }
    } catch (error) {
      console.error('[GradeSettings] Save error:', error);
      toast.error('Failed to update grade settings');
    } finally {
      setSaving(false);
    }
  };

  const addGrade = () => {
    setGrades([...grades, { grade: '', min_percentage: 0, max_percentage: 0, remark: '' }]);
  };

  const removeGrade = (index: number) => {
    setGrades(grades.filter((_, i) => i !== index));
  };

  const updateGrade = (index: number, field: keyof GradeConfig, value: string | number) => {
    const newGrades = [...grades];
    newGrades[index] = { ...newGrades[index], [field]: value };
    setGrades(newGrades);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Award className="h-5 w-5" />
            Grade & Remark System
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-slate-600">
            Define grade ranges and their corresponding remarks. Ensure percentages don't overlap.
          </p>

          {/* Grade List */}
          <div className="space-y-3">
            {grades.map((grade, index) => (
              <div key={index} className="p-4 border rounded-lg bg-slate-50">
                <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                  <div className="space-y-2">
                    <Label className="text-xs">Grade</Label>
                    <Input
                      value={grade.grade}
                      onChange={(e) => updateGrade(index, 'grade', e.target.value)}
                      placeholder="A"
                      className="uppercase"
                      maxLength={2}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Min %</Label>
                    <Input
                      type="number"
                      value={grade.min_percentage}
                      onChange={(e) => updateGrade(index, 'min_percentage', parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs">Max %</Label>
                    <Input
                      type="number"
                      value={grade.max_percentage}
                      onChange={(e) => updateGrade(index, 'max_percentage', parseInt(e.target.value) || 0)}
                      min={0}
                      max={100}
                    />
                  </div>

                  <div className="space-y-2 md:col-span-1">
                    <Label className="text-xs">Remark</Label>
                    <Input
                      value={grade.remark}
                      onChange={(e) => updateGrade(index, 'remark', e.target.value)}
                      placeholder="Excellent"
                    />
                  </div>

                  <div className="flex items-end gap-2">
                    <Badge variant={
                      grade.min_percentage >= 80 ? 'default' :
                      grade.min_percentage >= 70 ? 'secondary' :
                      'outline'
                    }>
                      {grade.min_percentage}-{grade.max_percentage}%
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeGrade(index)}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Add Button */}
          <Button variant="outline" onClick={addGrade} className="w-full gap-2">
            <Plus className="h-4 w-4" />
            Add Grade Range
          </Button>

          {/* Save Button */}
          <div className="pt-4 border-t">
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              <Save className="h-4 w-4" />
              {saving ? 'Saving...' : 'Save Grade System'}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview */}
      <Card>
        <CardHeader>
          <CardTitle>Grade System Preview</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="p-3 text-left">Grade</th>
                  <th className="p-3 text-left">Percentage Range</th>
                  <th className="p-3 text-left">Remark</th>
                </tr>
              </thead>
              <tbody>
                {grades.sort((a, b) => b.min_percentage - a.min_percentage).map((grade, index) => (
                  <tr key={index} className="border-b hover:bg-slate-50">
                    <td className="p-3">
                      <Badge className="text-lg px-3 py-1">{grade.grade}</Badge>
                    </td>
                    <td className="p-3">{grade.min_percentage}% - {grade.max_percentage}%</td>
                    <td className="p-3">{grade.remark}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
